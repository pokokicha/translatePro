import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { logger } from '../logger.js';
import { config } from '../config.js';
import { extractPdfContent } from '../services/pdf-processor.js';
import type { Project, Segment } from '../../shared/types.js';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.resolve('./uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.MAX_FILE_SIZE },
});

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  sourceLanguage: z.enum(['en', 'bg', 'de', 'fr', 'es']),
  targetLanguage: z.enum(['en', 'bg', 'de', 'fr', 'es']),
  translationStyle: z.enum([
    'standard', 'formal', 'informal', 'technical', 'legal',
    'marketing', 'literary', 'medical', 'academic', 'conversational',
  ]).default('standard'),
  aiModel: z.enum([
    'claude-sonnet-4-20250514',
    'claude-opus-4-20250514',
    'claude-3-5-haiku-20241022',
  ]).default('claude-sonnet-4-20250514'),
});

// Helper to map DB row to Project type
function mapRowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    fileName: row.file_name as string,
    fileType: row.file_type as 'pdf' | 'docx' | 'txt',
    fileSize: row.file_size as number,
    sourceLanguage: row.source_language as Project['sourceLanguage'],
    targetLanguage: row.target_language as Project['targetLanguage'],
    translationStyle: row.translation_style as Project['translationStyle'],
    aiModel: row.ai_model as Project['aiModel'],
    status: row.status as Project['status'],
    progress: row.progress as number,
    totalSegments: row.total_segments as number,
    translatedSegments: row.translated_segments as number,
    approvedSegments: row.approved_segments as number,
    tokensInput: row.tokens_input as number,
    tokensOutput: row.tokens_output as number,
    totalCost: row.total_cost as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// GET /api/projects - List all projects
router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM projects
      ORDER BY created_at DESC
    `).all() as Record<string, unknown>[];

    const projects = rows.map(mapRowToProject);
    res.json(projects);
  } catch (error) {
    logger.error('Failed to list projects:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// GET /api/projects/:id - Get project by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;

    if (!row) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json(mapRowToProject(row));
  } catch (error) {
    logger.error('Failed to get project:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

// POST /api/projects - Create new project with file upload
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Validate request body
    const validation = createProjectSchema.safeParse(req.body);
    if (!validation.success) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const { name, sourceLanguage, targetLanguage, translationStyle, aiModel } = validation.data;

    // Determine file type
    const ext = path.extname(req.file.originalname).toLowerCase();
    let fileType: 'pdf' | 'docx' | 'txt';
    if (ext === '.pdf') fileType = 'pdf';
    else if (ext === '.docx') fileType = 'docx';
    else fileType = 'txt';

    const projectId = uuidv4();
    const db = getDb();

    // Create project record
    db.prepare(`
      INSERT INTO projects (
        id, name, file_name, file_type, file_size, file_path,
        source_language, target_language, translation_style, ai_model
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      projectId,
      name,
      req.file.originalname,
      fileType,
      req.file.size,
      req.file.path,
      sourceLanguage,
      targetLanguage,
      translationStyle,
      aiModel
    );

    // Extract content and create segments
    let segments: { text: string; pageNumber: number; positionData?: string; styleData?: string }[] = [];

    if (fileType === 'pdf') {
      segments = await extractPdfContent(req.file.path);
    } else if (fileType === 'txt') {
      const content = fs.readFileSync(req.file.path, 'utf-8');
      segments = content
        .split(/\n\n+/)
        .filter((text) => text.trim())
        .map((text) => ({ text: text.trim(), pageNumber: 1 }));
    }
    // TODO: Add DOCX support

    // Insert segments
    const insertSegment = db.prepare(`
      INSERT INTO segments (id, project_id, segment_index, page_number, source_text, position_data, style_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((segs: typeof segments) => {
      segs.forEach((seg, index) => {
        insertSegment.run(
          uuidv4(),
          projectId,
          index,
          seg.pageNumber,
          seg.text,
          seg.positionData || null,
          seg.styleData || null
        );
      });
    });

    insertMany(segments);

    // Update project with segment count
    db.prepare(`
      UPDATE projects SET total_segments = ? WHERE id = ?
    `).run(segments.length, projectId);

    // Fetch and return the created project
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Record<string, unknown>;

    logger.info(`Created project ${projectId} with ${segments.length} segments`);
    res.status(201).json(mapRowToProject(project));
  } catch (error) {
    logger.error('Failed to create project:', error);
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch { /* ignore */ }
    }
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const project = db.prepare('SELECT file_path FROM projects WHERE id = ?').get(req.params.id) as { file_path: string } | undefined;

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Delete project (cascades to segments, revisions, images)
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);

    // Delete uploaded file
    try {
      if (fs.existsSync(project.file_path)) {
        fs.unlinkSync(project.file_path);
      }
    } catch (error) {
      logger.warn('Failed to delete project file:', error);
    }

    logger.info(`Deleted project ${req.params.id}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// GET /api/projects/:id/segments - Get project segments
router.get('/:id/segments', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM segments
      WHERE project_id = ?
      ORDER BY segment_index ASC
    `).all(req.params.id) as Record<string, unknown>[];

    const segments: Segment[] = rows.map((row) => ({
      id: row.id as string,
      projectId: row.project_id as string,
      index: row.segment_index as number,
      pageNumber: row.page_number as number,
      sourceText: row.source_text as string,
      targetText: row.target_text as string | null,
      status: row.status as Segment['status'],
      positionData: row.position_data ? JSON.parse(row.position_data as string) : null,
      styleData: row.style_data ? JSON.parse(row.style_data as string) : null,
      isApproved: Boolean(row.is_approved),
      matchPercentage: row.match_percentage as number | null,
      tokensInput: row.tokens_input as number,
      tokensOutput: row.tokens_output as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }));

    res.json(segments);
  } catch (error) {
    logger.error('Failed to get segments:', error);
    res.status(500).json({ error: 'Failed to get segments' });
  }
});

// GET /api/projects/:id/export - Export translated document
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // TODO: Implement PDF export with layout preservation
    // For now, export as text
    const segments = db.prepare(`
      SELECT source_text, target_text FROM segments
      WHERE project_id = ?
      ORDER BY segment_index ASC
    `).all(req.params.id) as { source_text: string; target_text: string | null }[];

    const content = segments
      .map((s) => s.target_text || s.source_text)
      .join('\n\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name}-translated.txt"`);
    res.send(content);
  } catch (error) {
    logger.error('Failed to export project:', error);
    res.status(500).json({ error: 'Failed to export project' });
  }
});

export default router;
