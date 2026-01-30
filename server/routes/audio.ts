import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { logger } from '../logger.js';
import { config } from '../config.js';
import type { AudioSession, AudioSegment } from '../../shared/types.js';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.resolve('./uploads/audio');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for audio files
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'video/mp4',
    'video/quicktime',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP3, WAV, M4A, MP4, and MOV files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

// Validation schemas
const createSessionSchema = z.object({
  sourceLanguage: z.enum(['en', 'bg', 'de', 'fr', 'es']),
  targetLanguage: z.enum(['en', 'bg', 'de', 'fr', 'es']),
  projectId: z.string().uuid().optional(),
});

// Helper to map DB row to AudioSession
function mapRowToSession(row: Record<string, unknown>): AudioSession {
  return {
    id: row.id as string,
    projectId: row.project_id as string | null,
    sourceLanguage: row.source_language as AudioSession['sourceLanguage'],
    targetLanguage: row.target_language as AudioSession['targetLanguage'],
    audioType: row.audio_type as 'recording' | 'file',
    duration: row.duration as number,
    transcription: row.transcription as string | null,
    translation: row.translation as string | null,
    segments: row.segments_data ? JSON.parse(row.segments_data as string) : [],
    status: row.status as AudioSession['status'],
    createdAt: row.created_at as string,
  };
}

// GET /api/audio/sessions - List audio sessions
router.get('/sessions', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM audio_sessions
      ORDER BY created_at DESC
      LIMIT 50
    `).all() as Record<string, unknown>[];

    res.json(rows.map(mapRowToSession));
  } catch (error) {
    logger.error('Failed to list audio sessions:', error);
    res.status(500).json({ error: 'Failed to list audio sessions' });
  }
});

// GET /api/audio/sessions/:id - Get audio session
router.get('/sessions/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM audio_sessions WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;

    if (!row) {
      res.status(404).json({ error: 'Audio session not found' });
      return;
    }

    res.json(mapRowToSession(row));
  } catch (error) {
    logger.error('Failed to get audio session:', error);
    res.status(500).json({ error: 'Failed to get audio session' });
  }
});

// POST /api/audio/transcribe - Transcribe audio file
router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file uploaded' });
      return;
    }

    const validation = createSessionSchema.safeParse(req.body);
    if (!validation.success) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const { sourceLanguage, targetLanguage, projectId } = validation.data;
    const sessionId = uuidv4();
    const db = getDb();

    // Create session record
    db.prepare(`
      INSERT INTO audio_sessions (id, project_id, source_language, target_language, audio_type, status)
      VALUES (?, ?, ?, ?, 'file', 'processing')
    `).run(sessionId, projectId || null, sourceLanguage, targetLanguage);

    // Check if OpenAI API key is available for Whisper
    if (!config.OPENAI_API_KEY) {
      // Fallback: return placeholder
      db.prepare(`
        UPDATE audio_sessions
        SET status = 'error',
            error_message = 'OpenAI API key not configured for transcription'
        WHERE id = ?
      `).run(sessionId);

      fs.unlinkSync(req.file.path);
      res.status(503).json({
        error: 'Transcription service not available. Please configure OPENAI_API_KEY.',
        sessionId,
      });
      return;
    }

    // TODO: Implement actual Whisper API call
    // For now, return a mock response
    const mockTranscription = 'This is a placeholder transcription. Whisper integration coming soon.';
    const mockSegments: AudioSegment[] = [
      {
        id: uuidv4(),
        startTime: 0,
        endTime: 5,
        text: mockTranscription,
        confidence: 0.95,
      },
    ];

    db.prepare(`
      UPDATE audio_sessions
      SET transcription = ?,
          segments_data = ?,
          duration = ?,
          status = 'transcribed'
      WHERE id = ?
    `).run(mockTranscription, JSON.stringify(mockSegments), 5, sessionId);

    // Clean up audio file
    fs.unlinkSync(req.file.path);

    const session = db.prepare('SELECT * FROM audio_sessions WHERE id = ?').get(sessionId) as Record<string, unknown>;
    res.json(mapRowToSession(session));
  } catch (error) {
    logger.error('Transcription error:', error);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch { /* ignore */ }
    }
    res.status(500).json({ error: 'Transcription failed' });
  }
});

// POST /api/audio/sessions/:id/translate - Translate transcription
router.post('/sessions/:id/translate', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const session = db.prepare('SELECT * FROM audio_sessions WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;

    if (!session) {
      res.status(404).json({ error: 'Audio session not found' });
      return;
    }

    if (!session.transcription) {
      res.status(400).json({ error: 'No transcription available to translate' });
      return;
    }

    // Import translator
    const { translateText } = await import('../services/translator.js');

    const result = await translateText(
      session.transcription as string,
      session.source_language as string,
      session.target_language as string,
      'claude-sonnet-4-20250514',
      'standard'
    );

    // Update segments with translations
    const segments: AudioSegment[] = session.segments_data
      ? JSON.parse(session.segments_data as string)
      : [];

    if (segments.length === 1) {
      segments[0].translation = result.translation;
    }

    db.prepare(`
      UPDATE audio_sessions
      SET translation = ?,
          segments_data = ?,
          status = 'translated'
      WHERE id = ?
    `).run(result.translation, JSON.stringify(segments), req.params.id);

    const updated = db.prepare('SELECT * FROM audio_sessions WHERE id = ?').get(req.params.id) as Record<string, unknown>;
    res.json(mapRowToSession(updated));
  } catch (error) {
    logger.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// DELETE /api/audio/sessions/:id - Delete audio session
router.delete('/sessions/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM audio_sessions WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Audio session not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete audio session:', error);
    res.status(500).json({ error: 'Failed to delete audio session' });
  }
});

export default router;
