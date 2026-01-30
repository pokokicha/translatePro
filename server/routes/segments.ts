import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { logger } from '../logger.js';
import type { Segment, Revision } from '../../shared/types.js';

const router = Router();

// Validation schema
const updateSegmentSchema = z.object({
  targetText: z.string(),
  isApproved: z.boolean().optional(),
});

// Helper to map DB row to Segment type
function mapRowToSegment(row: Record<string, unknown>): Segment {
  return {
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
  };
}

// GET /api/segments/:id - Get segment by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM segments WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;

    if (!row) {
      res.status(404).json({ error: 'Segment not found' });
      return;
    }

    res.json(mapRowToSegment(row));
  } catch (error) {
    logger.error('Failed to get segment:', error);
    res.status(500).json({ error: 'Failed to get segment' });
  }
});

// PATCH /api/segments/:id - Update segment translation
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const validation = updateSegmentSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const { targetText, isApproved } = validation.data;
    const db = getDb();

    // Get current segment
    const current = db.prepare('SELECT * FROM segments WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;

    if (!current) {
      res.status(404).json({ error: 'Segment not found' });
      return;
    }

    // Create revision if text changed
    if (current.target_text && current.target_text !== targetText) {
      db.prepare(`
        INSERT INTO revisions (id, segment_id, previous_text, new_text, source)
        VALUES (?, ?, ?, ?, 'user')
      `).run(uuidv4(), req.params.id, current.target_text, targetText);
    }

    // Determine new status
    let newStatus = 'translated';
    if (isApproved) {
      newStatus = 'approved';
    }

    // Update segment
    db.prepare(`
      UPDATE segments
      SET target_text = ?,
          status = ?,
          is_approved = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(targetText, newStatus, isApproved ? 1 : 0, req.params.id);

    // Update project progress
    const projectId = current.project_id as string;
    updateProjectProgress(projectId);

    // Fetch and return updated segment
    const updated = db.prepare('SELECT * FROM segments WHERE id = ?').get(req.params.id) as Record<string, unknown>;
    res.json(mapRowToSegment(updated));
  } catch (error) {
    logger.error('Failed to update segment:', error);
    res.status(500).json({ error: 'Failed to update segment' });
  }
});

// POST /api/segments/:id/approve - Approve segment
router.post('/:id/approve', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const segment = db.prepare('SELECT * FROM segments WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;

    if (!segment) {
      res.status(404).json({ error: 'Segment not found' });
      return;
    }

    if (!segment.target_text) {
      res.status(400).json({ error: 'Cannot approve segment without translation' });
      return;
    }

    db.prepare(`
      UPDATE segments
      SET status = 'approved',
          is_approved = 1,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(req.params.id);

    updateProjectProgress(segment.project_id as string);

    const updated = db.prepare('SELECT * FROM segments WHERE id = ?').get(req.params.id) as Record<string, unknown>;
    res.json(mapRowToSegment(updated));
  } catch (error) {
    logger.error('Failed to approve segment:', error);
    res.status(500).json({ error: 'Failed to approve segment' });
  }
});

// POST /api/segments/:id/unapprove - Remove approval from segment
router.post('/:id/unapprove', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const segment = db.prepare('SELECT * FROM segments WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;

    if (!segment) {
      res.status(404).json({ error: 'Segment not found' });
      return;
    }

    db.prepare(`
      UPDATE segments
      SET status = 'translated',
          is_approved = 0,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(req.params.id);

    updateProjectProgress(segment.project_id as string);

    const updated = db.prepare('SELECT * FROM segments WHERE id = ?').get(req.params.id) as Record<string, unknown>;
    res.json(mapRowToSegment(updated));
  } catch (error) {
    logger.error('Failed to unapprove segment:', error);
    res.status(500).json({ error: 'Failed to unapprove segment' });
  }
});

// GET /api/segments/:id/revisions - Get segment revision history
router.get('/:id/revisions', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM revisions
      WHERE segment_id = ?
      ORDER BY created_at DESC
    `).all(req.params.id) as Record<string, unknown>[];

    const revisions: Revision[] = rows.map((row) => ({
      id: row.id as string,
      segmentId: row.segment_id as string,
      previousText: row.previous_text as string,
      newText: row.new_text as string,
      source: row.source as 'ai' | 'user' | 'tm',
      createdAt: row.created_at as string,
    }));

    res.json(revisions);
  } catch (error) {
    logger.error('Failed to get revisions:', error);
    res.status(500).json({ error: 'Failed to get revisions' });
  }
});

// Helper function to update project progress
function updateProjectProgress(projectId: string) {
  const db = getDb();

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN target_text IS NOT NULL THEN 1 ELSE 0 END) as translated,
      SUM(CASE WHEN is_approved = 1 THEN 1 ELSE 0 END) as approved
    FROM segments
    WHERE project_id = ?
  `).get(projectId) as { total: number; translated: number; approved: number };

  const progress = stats.total > 0 ? (stats.translated / stats.total) * 100 : 0;

  let status = 'pending';
  if (stats.translated === stats.total && stats.total > 0) {
    status = 'completed';
  } else if (stats.translated > 0) {
    status = 'processing';
  }

  db.prepare(`
    UPDATE projects
    SET progress = ?,
        translated_segments = ?,
        approved_segments = ?,
        status = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(progress, stats.translated, stats.approved, status, projectId);
}

export default router;
