import { createClient, Client } from '@libsql/client';

const dbPath = process.env.DATABASE_PATH || './data/pikaboard.db';

export const db: Client = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${dbPath}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function initDatabase() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📋',
      color TEXT DEFAULT 'blue',
      position INTEGER DEFAULT 0,
      show_testing INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'inbox' CHECK(status IN ('inbox', 'up_next', 'in_progress', 'testing', 'in_review', 'done', 'rejected')),
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      tags TEXT,
      board_id INTEGER REFERENCES boards(id),
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      deadline DATETIME,
      rating INTEGER CHECK(rating IS NULL OR (rating >= 1 AND rating <= 5)),
      rated_at DATETIME,
      rejection_reason TEXT,
      archived INTEGER DEFAULT 0,
      archived_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'global' CHECK(type IN ('global', 'agent')),
      agent_id TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'achieved')),
      progress INTEGER DEFAULT 0,
      deadline DATETIME,
      board_id INTEGER REFERENCES boards(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goal_tasks (
      goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (goal_id, task_id)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_board ON tasks(board_id);
    CREATE INDEX IF NOT EXISTS idx_activity_type ON activity(type);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
    CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(type);
    CREATE INDEX IF NOT EXISTS idx_goals_board ON goals(board_id);
    CREATE INDEX IF NOT EXISTS idx_goal_tasks_goal ON goal_tasks(goal_id);
    CREATE INDEX IF NOT EXISTS idx_goal_tasks_task ON goal_tasks(task_id);
  `);

  // Ensure default board exists
  const boardCount = await db.execute('SELECT COUNT(*) as count FROM boards');
  if ((boardCount.rows[0] as any).count === 0) {
    await db.execute({ sql: "INSERT INTO boards (name, icon, color) VALUES ('Main', '⚡', 'blue')", args: [] });
  }

  // Migration: add assignee column
  try { await db.execute('ALTER TABLE tasks ADD COLUMN assignee TEXT'); } catch {}

  // Assign orphan tasks to default board
  const defaultBoard = await db.execute('SELECT id FROM boards ORDER BY id LIMIT 1');
  if (defaultBoard.rows.length > 0) {
    await db.execute({ sql: 'UPDATE tasks SET board_id = ? WHERE board_id IS NULL', args: [defaultBoard.rows[0].id as number] });
  }

  console.log('✅ Database initialized');
}

export async function logActivity(type: string, message: string, metadata?: object) {
  await db.execute({
    sql: 'INSERT INTO activity (type, message, metadata) VALUES (?, ?, ?)',
    args: [type, message, metadata ? JSON.stringify(metadata) : null]
  });
}
