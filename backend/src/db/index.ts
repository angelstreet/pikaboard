import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const dbPath = process.env.DATABASE_PATH || './data/pikaboard.db';

// Ensure data directory exists
const dir = dirname(dbPath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

export const db = new Database(dbPath);

export function initDatabase() {
  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');

  // Create tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'inbox' CHECK(status IN ('inbox', 'up_next', 'in_progress', 'in_review', 'done')),
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      tags TEXT,
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

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_activity_type ON activity(type);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC);
  `);

  console.log('✅ Database initialized');
}

export function logActivity(type: string, message: string, metadata?: object) {
  const stmt = db.prepare(`
    INSERT INTO activity (type, message, metadata)
    VALUES (?, ?, ?)
  `);
  stmt.run(type, message, metadata ? JSON.stringify(metadata) : null);
}
