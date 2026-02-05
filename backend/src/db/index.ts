import Database, { Database as DatabaseType } from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const dbPath = process.env.DATABASE_PATH || './data/pikaboard.db';

// Ensure data directory exists
const dir = dirname(dbPath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

export const db: DatabaseType = new Database(dbPath);

export function initDatabase() {
  // Enable WAL mode for better concurrent access (not for :memory:)
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }

  // Create boards table
  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📋',
      color TEXT DEFAULT 'blue',
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create tasks table with board_id
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'inbox' CHECK(status IN ('inbox', 'up_next', 'in_progress', 'in_review', 'done')),
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      tags TEXT,
      board_id INTEGER REFERENCES boards(id),
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )
  `);

  // Create activity table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Run migrations for existing databases
  runMigrations();

  // Create indexes (after migrations to ensure columns exist)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_board ON tasks(board_id);
    CREATE INDEX IF NOT EXISTS idx_activity_type ON activity(type);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC);
  `);

  console.log('✅ Database initialized');
}

function runMigrations() {
  // Check if board_id column exists in tasks table
  const tableInfo = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
  const hasboardId = tableInfo.some((col) => col.name === 'board_id');
  const hasPosition = tableInfo.some((col) => col.name === 'position');
  const hasDeadline = tableInfo.some((col) => col.name === 'deadline');

  if (!hasboardId) {
    console.log('🔄 Migration: Adding board_id to tasks...');
    db.exec('ALTER TABLE tasks ADD COLUMN board_id INTEGER REFERENCES boards(id)');
  }

  if (!hasPosition) {
    console.log('🔄 Migration: Adding position to tasks...');
    db.exec('ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0');
  }

  if (!hasDeadline) {
    console.log('🔄 Migration: Adding deadline to tasks...');
    db.exec('ALTER TABLE tasks ADD COLUMN deadline DATETIME');
  }

  // Ensure default board exists
  const boardCount = db.prepare('SELECT COUNT(*) as count FROM boards').get() as { count: number };
  if (boardCount.count === 0) {
    console.log('🔄 Migration: Creating default board...');
    db.prepare("INSERT INTO boards (name, icon, color) VALUES ('Main', '⚡', 'blue')").run();
  }

  // Assign existing tasks without board_id to default board
  const defaultBoard = db.prepare('SELECT id FROM boards ORDER BY id LIMIT 1').get() as { id: number } | undefined;
  if (defaultBoard) {
    db.prepare('UPDATE tasks SET board_id = ? WHERE board_id IS NULL').run(defaultBoard.id);
  }
}

export function logActivity(type: string, message: string, metadata?: object) {
  const stmt = db.prepare(`
    INSERT INTO activity (type, message, metadata)
    VALUES (?, ?, ?)
  `);
  stmt.run(type, message, metadata ? JSON.stringify(metadata) : null);
}
