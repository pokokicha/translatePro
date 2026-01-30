import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Server as SocketIOServer } from 'socket.io';
import { getDb } from '../db/index.js';
import { logger } from '../logger.js';
import { translateText, translateBatch } from '../services/translator.js';
import { AI_MODELS, TRANSLATION_STYLES } from '../../shared/types.js';
import type { TranslationProgress } from '../../shared/types.js';

const router = Router();

// Validation schemas
const translateAllSchema = z.object({
  glossaryId: z.string().uuid().optional(),
  skipApproved: z.boolean().default(true),
});

const translateSegmentSchema = z.object({
  aiModel: z.enum([
    'claude-sonnet-4-20250514',
    'claude-opus-4-20250514',
  ]).optional(),
  style: z.enum([
    'standard', 'formal', 'informal', 'technical', 'legal',
    'marketing', 'literary', 'medical', 'academic', 'conversational',
  ]).optional(),
});

// POST /api/translation/projects/:id/translate-all - Translate all segments
router.post('/projects/:id/translate-all', async (req: Request, res: Response) => {
  const projectId = req.params.id;
  const io: SocketIOServer = req.app.get('io');

  try {
    const validation = translateAllSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const { glossaryId, skipApproved } = validation.data;
    const db = getDb();

    // Get project
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Record<string, unknown> | undefined;

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Get segments to translate
    let segmentQuery = `
      SELECT * FROM segments
      WHERE project_id = ?
    `;
    if (skipApproved) {
      segmentQuery += ' AND is_approved = 0';
    }
    segmentQuery += ' AND (target_text IS NULL OR status = \'pending\')';
    segmentQuery += ' ORDER BY segment_index ASC';

    const segments = db.prepare(segmentQuery).all(projectId) as Record<string, unknown>[];

    if (segments.length === 0) {
      res.json({ message: 'No segments to translate' });
      return;
    }

    // Load glossary terms if provided
    let glossaryTerms: Map<string, string> = new Map();
    if (glossaryId) {
      const terms = db.prepare(`
        SELECT source_term, target_term FROM glossary_terms
        WHERE glossary_id = ?
      `).all(glossaryId) as { source_term: string; target_term: string }[];
      terms.forEach((t) => glossaryTerms.set(t.source_term.toLowerCase(), t.target_term));
    }

    // Update project status
    db.prepare(`
      UPDATE projects SET status = 'processing', updated_at = datetime('now')
      WHERE id = ?
    `).run(projectId);

    // Set up SSE response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial progress
    const sendProgress = (progress: TranslationProgress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
      io.to(`project:${projectId}`).emit('translation:progress', progress);
    };

    let totalTokensInput = 0;
    let totalTokensOutput = 0;
    let translatedCount = 0;

    // Get model cost info
    const modelInfo = AI_MODELS.find((m) => m.id === project.ai_model) || AI_MODELS[0];

    // Process segments in batches
    const batchSize = 5;
    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, i + batchSize);

      try {
        const results = await translateBatch(
          batch.map((s) => ({
            id: s.id as string,
            text: s.source_text as string,
          })),
          project.source_language as string,
          project.target_language as string,
          project.ai_model as string,
          project.translation_style as string,
          glossaryTerms,
          project.custom_context as string | null
        );

        // Update segments in database
        const updateSegment = db.prepare(`
          UPDATE segments
          SET target_text = ?,
              status = 'translated',
              tokens_input = ?,
              tokens_output = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `);

        const createRevision = db.prepare(`
          INSERT INTO revisions (id, segment_id, previous_text, new_text, source)
          VALUES (?, ?, '', ?, 'ai')
        `);

        db.transaction(() => {
          results.forEach((result) => {
            updateSegment.run(
              result.translation,
              result.tokensInput,
              result.tokensOutput,
              result.id
            );
            createRevision.run(uuidv4(), result.id, result.translation);
            totalTokensInput += result.tokensInput;
            totalTokensOutput += result.tokensOutput;
            translatedCount++;
          });
        })();

        // Emit progress via WebSocket
        io.to(`project:${projectId}`).emit('translation:segment', {
          segmentIds: results.map((r) => r.id),
        });

        // Calculate cost
        const estimatedCost =
          (totalTokensInput * modelInfo.inputCostPer1M) / 1_000_000 +
          (totalTokensOutput * modelInfo.outputCostPer1M) / 1_000_000;

        sendProgress({
          projectId,
          status: 'processing',
          progress: (translatedCount / segments.length) * 100,
          currentSegment: translatedCount,
          totalSegments: segments.length,
          tokensUsed: totalTokensInput + totalTokensOutput,
          estimatedCost,
        });
      } catch (error) {
        logger.error(`Translation batch error:`, error);
        // Continue with next batch
      }
    }

    // Update project with final stats
    const estimatedCost =
      (totalTokensInput * modelInfo.inputCostPer1M) / 1_000_000 +
      (totalTokensOutput * modelInfo.outputCostPer1M) / 1_000_000;

    db.prepare(`
      UPDATE projects
      SET status = 'completed',
          progress = 100,
          translated_segments = translated_segments + ?,
          tokens_input = tokens_input + ?,
          tokens_output = tokens_output + ?,
          total_cost = total_cost + ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(translatedCount, totalTokensInput, totalTokensOutput, estimatedCost, projectId);

    // Send completion event
    sendProgress({
      projectId,
      status: 'completed',
      progress: 100,
      currentSegment: segments.length,
      totalSegments: segments.length,
      tokensUsed: totalTokensInput + totalTokensOutput,
      estimatedCost,
    });

    io.to(`project:${projectId}`).emit('translation:complete', { projectId });

    res.write('event: done\ndata: {}\n\n');
    res.end();
  } catch (error) {
    logger.error('Translation error:', error);
    const db = getDb();
    db.prepare(`
      UPDATE projects SET status = 'error', error_message = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run((error as Error).message, projectId);

    io.to(`project:${projectId}`).emit('translation:error', {
      projectId,
      error: (error as Error).message,
    });

    if (!res.headersSent) {
      res.status(500).json({ error: 'Translation failed' });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
      res.end();
    }
  }
});

// POST /api/translation/segments/:id - Translate single segment
router.post('/segments/:id', async (req: Request, res: Response) => {
  try {
    const validation = translateSegmentSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const db = getDb();
    const segment = db.prepare(`
      SELECT s.*, p.source_language, p.target_language, p.ai_model, p.translation_style, p.custom_context
      FROM segments s
      JOIN projects p ON s.project_id = p.id
      WHERE s.id = ?
    `).get(req.params.id) as Record<string, unknown> | undefined;

    if (!segment) {
      res.status(404).json({ error: 'Segment not found' });
      return;
    }

    const aiModel = validation.data.aiModel || segment.ai_model as string;
    const style = validation.data.style || segment.translation_style as string;

    // Update segment status
    db.prepare(`
      UPDATE segments SET status = 'translating', updated_at = datetime('now')
      WHERE id = ?
    `).run(req.params.id);

    const result = await translateText(
      segment.source_text as string,
      segment.source_language as string,
      segment.target_language as string,
      aiModel,
      style,
      undefined,
      segment.custom_context as string | null
    );

    // Save previous text if exists
    if (segment.target_text) {
      db.prepare(`
        INSERT INTO revisions (id, segment_id, previous_text, new_text, source)
        VALUES (?, ?, ?, ?, 'ai')
      `).run(uuidv4(), req.params.id, segment.target_text, result.translation);
    }

    // Update segment with translation
    db.prepare(`
      UPDATE segments
      SET target_text = ?,
          status = 'translated',
          tokens_input = ?,
          tokens_output = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(result.translation, result.tokensInput, result.tokensOutput, req.params.id);

    // Fetch updated segment
    const updated = db.prepare('SELECT * FROM segments WHERE id = ?').get(req.params.id) as Record<string, unknown>;

    res.json({
      id: updated.id,
      targetText: updated.target_text,
      status: updated.status,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
    });
  } catch (error) {
    logger.error('Single translation error:', error);
    const db = getDb();
    db.prepare(`
      UPDATE segments SET status = 'error', updated_at = datetime('now')
      WHERE id = ?
    `).run(req.params.id);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// GET /api/translation/suggestions/:id - Get alternative translations
router.get('/suggestions/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const segment = db.prepare(`
      SELECT s.*, p.source_language, p.target_language, p.translation_style, p.custom_context
      FROM segments s
      JOIN projects p ON s.project_id = p.id
      WHERE s.id = ?
    `).get(req.params.id) as Record<string, unknown> | undefined;

    if (!segment) {
      res.status(404).json({ error: 'Segment not found' });
      return;
    }

    // Get suggestions with different styles
    const styles = ['formal', 'informal', 'technical'];
    const suggestions = await Promise.all(
      styles.map(async (style) => {
        try {
          const result = await translateText(
            segment.source_text as string,
            segment.source_language as string,
            segment.target_language as string,
            'claude-sonnet-4-20250514', // Use Sonnet for suggestions
            style,
            undefined,
            segment.custom_context as string | null
          );
          return {
            style,
            translation: result.translation,
          };
        } catch {
          return null;
        }
      })
    );

    res.json(suggestions.filter(Boolean));
  } catch (error) {
    logger.error('Failed to get suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

export default router;
