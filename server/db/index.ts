import Database from 'better-sqlite3';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { schema } from './schema.js';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDb() first.');
  }
  return db;
}

export function initializeDb(): Database.Database {
  if (db) {
    return db;
  }

  // Ensure the data directory exists
  const dbPath = config.DATABASE_PATH;
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info(`Created database directory: ${dbDir}`);
  }

  // Create/open database
  db = new Database(dbPath, {
    verbose: config.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : undefined,
  });

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run schema migrations
  db.exec(schema);

  logger.info(`Database initialized at: ${dbPath}`);

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

export default { getDb, initializeDb, closeDb };
