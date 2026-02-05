import { Hono } from 'hono';
import { db, logActivity } from '../db/index.js';

export const boardsRouter = new Hono();

// Types
interface Board {
  id: number;
  name: string;
  icon: string;
  color: string;
  position: number;
  show_testing: number;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: number;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  tags: string | null;
  board_id: number | null;
  position: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface CreateBoardBody {
  name: string;
  icon?: string;
  color?: string;
  position?: number;
}

interface UpdateBoardBody {
  name?: string;
  icon?: string;
  color?: string;
  position?: number;
  show_testing?: boolean;
}

// GET /api/boards - List all boards
boardsRouter.get('/', (c) => {
  const stmt = db.prepare('SELECT * FROM boards ORDER BY position ASC, id ASC');
  const boards = stmt.all() as Board[];
  return c.json({ boards });
});

// POST /api/boards - Create board
boardsRouter.post('/', async (c) => {
  const body = await c.req.json<CreateBoardBody>();

  if (!body.name || body.name.trim() === '') {
    return c.json({ error: 'Name is required' }, 400);
  }

  // Get max position for new board
  const maxPos = db.prepare('SELECT MAX(position) as max FROM boards').get() as { max: number | null };
  const position = body.position !== undefined ? body.position : (maxPos.max ?? -1) + 1;

  const stmt = db.prepare(`
    INSERT INTO boards (name, icon, color, position)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(
    body.name.trim(),
    body.icon || '📋',
    body.color || 'blue',
    position
  );

  const newBoard = db.prepare('SELECT * FROM boards WHERE id = ?').get(result.lastInsertRowid) as Board;

  logActivity('board_created', `Created board: ${newBoard.name}`, { boardId: newBoard.id });

  return c.json(newBoard, 201);
});

// GET /api/boards/:id - Get single board
boardsRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const stmt = db.prepare('SELECT * FROM boards WHERE id = ?');
  const board = stmt.get(id) as Board | undefined;

  if (!board) {
    return c.json({ error: 'Board not found' }, 404);
  }

  return c.json(board);
});

// PATCH /api/boards/:id - Update board
boardsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<UpdateBoardBody>();

  const existing = db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as Board | undefined;
  if (!existing) {
    return c.json({ error: 'Board not found' }, 404);
  }

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (body.name !== undefined) {
    if (body.name.trim() === '') {
      return c.json({ error: 'Name cannot be empty' }, 400);
    }
    updates.push('name = ?');
    params.push(body.name.trim());
  }
  if (body.icon !== undefined) {
    updates.push('icon = ?');
    params.push(body.icon);
  }
  if (body.color !== undefined) {
    updates.push('color = ?');
    params.push(body.color);
  }
  if (body.position !== undefined) {
    updates.push('position = ?');
    params.push(body.position);
  }
  if (body.show_testing !== undefined) {
    updates.push('show_testing = ?');
    params.push(body.show_testing ? 1 : 0);
  }

  if (updates.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(parseInt(id));

  const query = `UPDATE boards SET ${updates.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...params);

  const updated = db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as Board;

  logActivity('board_updated', `Updated board: ${updated.name}`, { boardId: updated.id, changes: Object.keys(body) });

  return c.json(updated);
});

// DELETE /api/boards/:id - Delete board
boardsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  const deleteTasks = c.req.query('deleteTasks') === 'true';

  const existing = db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as Board | undefined;
  if (!existing) {
    return c.json({ error: 'Board not found' }, 404);
  }

  // Check if this is the last board
  const boardCount = db.prepare('SELECT COUNT(*) as count FROM boards').get() as { count: number };
  if (boardCount.count <= 1) {
    return c.json({ error: 'Cannot delete the last board' }, 400);
  }

  if (deleteTasks) {
    // Delete all tasks in this board
    db.prepare('DELETE FROM tasks WHERE board_id = ?').run(id);
  } else {
    // Move tasks to first available board
    const otherBoard = db.prepare('SELECT id FROM boards WHERE id != ? ORDER BY position, id LIMIT 1').get(id) as { id: number };
    db.prepare('UPDATE tasks SET board_id = ? WHERE board_id = ?').run(otherBoard.id, id);
  }

  db.prepare('DELETE FROM boards WHERE id = ?').run(id);

  logActivity('board_deleted', `Deleted board: ${existing.name}`, { boardId: existing.id, deletedTasks: deleteTasks });

  return c.json({ success: true });
});

// GET /api/boards/:id/tasks - Get tasks for a specific board
boardsRouter.get('/:id/tasks', (c) => {
  const id = c.req.param('id');
  const status = c.req.query('status');

  // Verify board exists
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as Board | undefined;
  if (!board) {
    return c.json({ error: 'Board not found' }, 404);
  }

  let query = 'SELECT * FROM tasks WHERE board_id = ?';
  const params: (string | number)[] = [parseInt(id)];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY position ASC, created_at DESC';

  const stmt = db.prepare(query);
  const tasks = stmt.all(...params) as Task[];

  // Parse tags JSON
  const parsed = tasks.map((t) => ({
    ...t,
    tags: t.tags ? JSON.parse(t.tags) : [],
  }));

  return c.json({ tasks: parsed, board });
});
