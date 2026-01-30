// SQLite Schema for TranslatePro v4.0

export const schema = `
-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt')),
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  translation_style TEXT NOT NULL DEFAULT 'standard',
  ai_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  custom_context TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  progress REAL NOT NULL DEFAULT 0,
  total_segments INTEGER NOT NULL DEFAULT 0,
  translated_segments INTEGER NOT NULL DEFAULT 0,
  approved_segments INTEGER NOT NULL DEFAULT 0,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  error_message TEXT,
  due_date TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  tags TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Segments table (translation units)
CREATE TABLE IF NOT EXISTS segments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  page_number INTEGER NOT NULL DEFAULT 1,
  source_text TEXT NOT NULL,
  target_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'translating', 'translated', 'approved', 'error')),
  position_data TEXT, -- JSON: { x, y, width, height }
  style_data TEXT, -- JSON: { fontFamily, fontSize, fontWeight, fontStyle, color, textAlign, lineHeight }
  is_approved INTEGER NOT NULL DEFAULT 0,
  match_percentage REAL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Revisions table (change history)
CREATE TABLE IF NOT EXISTS revisions (
  id TEXT PRIMARY KEY,
  segment_id TEXT NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
  previous_text TEXT NOT NULL,
  new_text TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('ai', 'user', 'tm')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Images table (for PDF images)
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  position_data TEXT NOT NULL, -- JSON: { x, y, width, height }
  image_data TEXT NOT NULL, -- Base64 encoded
  format TEXT NOT NULL CHECK (format IN ('jpeg', 'png')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Audio sessions table
CREATE TABLE IF NOT EXISTS audio_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  audio_type TEXT NOT NULL CHECK (audio_type IN ('recording', 'file')),
  duration REAL NOT NULL DEFAULT 0,
  transcription TEXT,
  translation TEXT,
  segments_data TEXT, -- JSON array of audio segments
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'transcribed', 'translated', 'error')),
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Glossaries table
CREATE TABLE IF NOT EXISTS glossaries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  terms_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Glossary terms table
CREATE TABLE IF NOT EXISTS glossary_terms (
  id TEXT PRIMARY KEY,
  glossary_id TEXT NOT NULL REFERENCES glossaries(id) ON DELETE CASCADE,
  source_term TEXT NOT NULL,
  target_term TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_segments_project_id ON segments(project_id);
CREATE INDEX IF NOT EXISTS idx_segments_status ON segments(status);
CREATE INDEX IF NOT EXISTS idx_revisions_segment_id ON revisions(segment_id);
CREATE INDEX IF NOT EXISTS idx_images_project_id ON images(project_id);
CREATE INDEX IF NOT EXISTS idx_audio_sessions_project_id ON audio_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_glossary_terms_glossary_id ON glossary_terms(glossary_id);
CREATE INDEX IF NOT EXISTS idx_glossary_terms_source ON glossary_terms(source_term);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_due_date ON projects(due_date);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
`;

// Migration for existing databases
export const migrations = `
-- Add due_date column if not exists
ALTER TABLE projects ADD COLUMN due_date TEXT;
-- Add priority column if not exists
ALTER TABLE projects ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';
-- Add tags column if not exists
ALTER TABLE projects ADD COLUMN tags TEXT;
`;

export default schema;
