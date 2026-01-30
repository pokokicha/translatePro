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

function runMigrations(database: Database.Database): void {
  // Check if columns exist before adding them
  const tableInfo = database.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;
  const columnNames = tableInfo.map((col) => col.name);

  if (!columnNames.includes('due_date')) {
    try {
      database.exec("ALTER TABLE projects ADD COLUMN due_date TEXT");
      logger.info('Migration: Added due_date column to projects');
    } catch (error) {
      // Column might already exist
    }
  }

  if (!columnNames.includes('priority')) {
    try {
      database.exec("ALTER TABLE projects ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'");
      logger.info('Migration: Added priority column to projects');
    } catch (error) {
      // Column might already exist
    }
  }

  if (!columnNames.includes('tags')) {
    try {
      database.exec("ALTER TABLE projects ADD COLUMN tags TEXT");
      logger.info('Migration: Added tags column to projects');
    } catch (error) {
      // Column might already exist
    }
  }

  if (!columnNames.includes('custom_context')) {
    try {
      database.exec("ALTER TABLE projects ADD COLUMN custom_context TEXT");
      logger.info('Migration: Added custom_context column to projects');
    } catch (error) {
      // Column might already exist
    }
  }
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

  // Run additional migrations for existing databases
  runMigrations(db);

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
