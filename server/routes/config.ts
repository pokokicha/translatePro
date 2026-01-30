import { Router, Request, Response } from 'express';
import { LANGUAGES, AI_MODELS, TRANSLATION_STYLES } from '../../shared/types.js';
import { getDb } from '../db/index.js';
import { logger } from '../logger.js';

const router = Router();

// GET /api/config/languages - Get supported languages
router.get('/languages', (_req: Request, res: Response) => {
  res.json(LANGUAGES);
});

// GET /api/config/models - Get available AI models
router.get('/models', (_req: Request, res: Response) => {
  res.json(AI_MODELS);
});

// GET /api/config/styles - Get translation styles
router.get('/styles', (_req: Request, res: Response) => {
  res.json(TRANSLATION_STYLES);
});

// GET /api/config/stats - Get overall statistics
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const db = getDb();

    const projectStats = db.prepare(`
      SELECT
        COUNT(*) as total_projects,
        SUM(total_segments) as total_segments,
        SUM(tokens_input) as total_tokens_input,
        SUM(tokens_output) as total_tokens_output,
        SUM(total_cost) as total_cost,
        AVG(progress) as avg_progress
      FROM projects
    `).get() as Record<string, number | null>;

    const completedProjects = db.prepare(`
      SELECT COUNT(*) as count FROM projects WHERE status = 'completed'
    `).get() as { count: number };

    const totalWords = db.prepare(`
      SELECT SUM(LENGTH(source_text) - LENGTH(REPLACE(source_text, ' ', '')) + 1) as words
      FROM segments
    `).get() as { words: number | null };

    res.json({
      totalProjects: projectStats.total_projects || 0,
      totalSegments: projectStats.total_segments || 0,
      totalWords: totalWords.words || 0,
      totalTokensInput: projectStats.total_tokens_input || 0,
      totalTokensOutput: projectStats.total_tokens_output || 0,
      totalCost: projectStats.total_cost || 0,
      completionRate: projectStats.total_projects
        ? (completedProjects.count / (projectStats.total_projects as number)) * 100
        : 0,
      averageProjectSize: projectStats.total_projects
        ? (projectStats.total_segments as number) / (projectStats.total_projects as number)
        : 0,
    });
  } catch (error) {
    logger.error('Failed to get stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// GET /api/config/usage - Get token usage over time
router.get('/usage', (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const db = getDb();

    const usage = db.prepare(`
      SELECT
        DATE(created_at) as date,
        SUM(tokens_input) as tokens_input,
        SUM(tokens_output) as tokens_output,
        SUM(total_cost) as cost,
        COUNT(*) as projects
      FROM projects
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(days) as Array<{
      date: string;
      tokens_input: number;
      tokens_output: number;
      cost: number;
      projects: number;
    }>;

    res.json(usage);
  } catch (error) {
    logger.error('Failed to get usage:', error);
    res.status(500).json({ error: 'Failed to get usage data' });
  }
});

export default router;
