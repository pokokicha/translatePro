import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { logger } from '../logger.js';
import type { Glossary, GlossaryTerm } from '../../shared/types.js';

const router = Router();

// Validation schemas
const createGlossarySchema = z.object({
  name: z.string().min(1).max(255),
  sourceLanguage: z.enum(['en', 'bg', 'de', 'fr', 'es']),
  targetLanguage: z.enum(['en', 'bg', 'de', 'fr', 'es']),
});

const createTermSchema = z.object({
  sourceTerm: z.string().min(1),
  targetTerm: z.string().min(1),
  notes: z.string().optional(),
});

// Helper to map DB row to Glossary
function mapRowToGlossary(row: Record<string, unknown>): Glossary {
  return {
    id: row.id as string,
    name: row.name as string,
    sourceLanguage: row.source_language as Glossary['sourceLanguage'],
    targetLanguage: row.target_language as Glossary['targetLanguage'],
    termsCount: row.terms_count as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// Helper to map DB row to GlossaryTerm
function mapRowToTerm(row: Record<string, unknown>): GlossaryTerm {
  return {
    id: row.id as string,
    glossaryId: row.glossary_id as string,
    sourceTerm: row.source_term as string,
    targetTerm: row.target_term as string,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
  };
}

// GET /api/glossaries - List all glossaries
router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM glossaries
      ORDER BY updated_at DESC
    `).all() as Record<string, unknown>[];

    res.json(rows.map(mapRowToGlossary));
  } catch (error) {
    logger.error('Failed to list glossaries:', error);
    res.status(500).json({ error: 'Failed to list glossaries' });
  }
});

// GET /api/glossaries/:id - Get glossary by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM glossaries WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;

    if (!row) {
      res.status(404).json({ error: 'Glossary not found' });
      return;
    }

    res.json(mapRowToGlossary(row));
  } catch (error) {
    logger.error('Failed to get glossary:', error);
    res.status(500).json({ error: 'Failed to get glossary' });
  }
});

// POST /api/glossaries - Create new glossary
router.post('/', (req: Request, res: Response) => {
  try {
    const validation = createGlossarySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const { name, sourceLanguage, targetLanguage } = validation.data;
    const id = uuidv4();
    const db = getDb();

    db.prepare(`
      INSERT INTO glossaries (id, name, source_language, target_language)
      VALUES (?, ?, ?, ?)
    `).run(id, name, sourceLanguage, targetLanguage);

    const glossary = db.prepare('SELECT * FROM glossaries WHERE id = ?').get(id) as Record<string, unknown>;
    res.status(201).json(mapRowToGlossary(glossary));
  } catch (error) {
    logger.error('Failed to create glossary:', error);
    res.status(500).json({ error: 'Failed to create glossary' });
  }
});

// PUT /api/glossaries/:id - Update glossary
router.put('/:id', (req: Request, res: Response) => {
  try {
    const validation = createGlossarySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const { name, sourceLanguage, targetLanguage } = validation.data;
    const db = getDb();

    const existing = db.prepare('SELECT id FROM glossaries WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Glossary not found' });
      return;
    }

    db.prepare(`
      UPDATE glossaries
      SET name = ?, source_language = ?, target_language = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, sourceLanguage, targetLanguage, req.params.id);

    const glossary = db.prepare('SELECT * FROM glossaries WHERE id = ?').get(req.params.id) as Record<string, unknown>;
    res.json(mapRowToGlossary(glossary));
  } catch (error) {
    logger.error('Failed to update glossary:', error);
    res.status(500).json({ error: 'Failed to update glossary' });
  }
});

// DELETE /api/glossaries/:id - Delete glossary
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM glossaries WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Glossary not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete glossary:', error);
    res.status(500).json({ error: 'Failed to delete glossary' });
  }
});

// GET /api/glossaries/:id/terms - Get glossary terms
router.get('/:id/terms', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM glossary_terms
      WHERE glossary_id = ?
      ORDER BY source_term ASC
    `).all(req.params.id) as Record<string, unknown>[];

    res.json(rows.map(mapRowToTerm));
  } catch (error) {
    logger.error('Failed to get glossary terms:', error);
    res.status(500).json({ error: 'Failed to get glossary terms' });
  }
});

// POST /api/glossaries/:id/terms - Add term to glossary
router.post('/:id/terms', (req: Request, res: Response) => {
  try {
    const validation = createTermSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const { sourceTerm, targetTerm, notes } = validation.data;
    const db = getDb();

    // Check glossary exists
    const glossary = db.prepare('SELECT id FROM glossaries WHERE id = ?').get(req.params.id);
    if (!glossary) {
      res.status(404).json({ error: 'Glossary not found' });
      return;
    }

    const termId = uuidv4();
    db.prepare(`
      INSERT INTO glossary_terms (id, glossary_id, source_term, target_term, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(termId, req.params.id, sourceTerm, targetTerm, notes || null);

    // Update terms count
    db.prepare(`
      UPDATE glossaries
      SET terms_count = terms_count + 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(req.params.id);

    const term = db.prepare('SELECT * FROM glossary_terms WHERE id = ?').get(termId) as Record<string, unknown>;
    res.status(201).json(mapRowToTerm(term));
  } catch (error) {
    logger.error('Failed to add term:', error);
    res.status(500).json({ error: 'Failed to add term' });
  }
});

// DELETE /api/glossaries/:glossaryId/terms/:termId - Delete term
router.delete('/:glossaryId/terms/:termId', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const result = db.prepare(`
      DELETE FROM glossary_terms
      WHERE id = ? AND glossary_id = ?
    `).run(req.params.termId, req.params.glossaryId);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Term not found' });
      return;
    }

    // Update terms count
    db.prepare(`
      UPDATE glossaries
      SET terms_count = terms_count - 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(req.params.glossaryId);

    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete term:', error);
    res.status(500).json({ error: 'Failed to delete term' });
  }
});

// POST /api/glossaries/:id/import - Import terms from TMX
router.post('/:id/import', (req: Request, res: Response) => {
  // TODO: Implement TMX import
  res.status(501).json({ error: 'TMX import not yet implemented' });
});

// GET /api/glossaries/:id/export - Export terms as TMX
router.get('/:id/export', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const glossary = db.prepare('SELECT * FROM glossaries WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;

    if (!glossary) {
      res.status(404).json({ error: 'Glossary not found' });
      return;
    }

    const terms = db.prepare(`
      SELECT * FROM glossary_terms WHERE glossary_id = ?
    `).all(req.params.id) as Record<string, unknown>[];

    // Generate simple TMX format
    const tmx = `<?xml version="1.0" encoding="UTF-8"?>
<tmx version="1.4">
  <header creationtool="TranslatePro" creationtoolversion="4.0" srclang="${glossary.source_language}"/>
  <body>
${terms.map((t) => `    <tu>
      <tuv xml:lang="${glossary.source_language}">
        <seg>${escapeXml(t.source_term as string)}</seg>
      </tuv>
      <tuv xml:lang="${glossary.target_language}">
        <seg>${escapeXml(t.target_term as string)}</seg>
      </tuv>
    </tu>`).join('\n')}
  </body>
</tmx>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${glossary.name}.tmx"`);
    res.send(tmx);
  } catch (error) {
    logger.error('Failed to export glossary:', error);
    res.status(500).json({ error: 'Failed to export glossary' });
  }
});

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default router;
