import { Hono } from 'hono';
import { db, logActivity } from '../db/index.js';

export const boardsRouter = new Hono();

// GET /api/boards - List all boards
boardsRouter.get('/', async (c) => {
  const result = await db.execute('SELECT * FROM boards ORDER BY position ASC, id ASC');
  return c.json({ boards: result.rows });
});

// POST /api/boards - Create board
boardsRouter.post('/', async (c) => {
  const body = await c.req.json<{ name: string; icon?: string; color?: string; position?: number }>();

  if (!body.name || body.name.trim() === '') {
    return c.json({ error: 'Name is required' }, 400);
  }

  const maxPos = await db.execute('SELECT MAX(position) as max FROM boards');
  const position = body.position !== undefined ? body.position : ((maxPos.rows[0] as any).max ?? -1) + 1;

  const result = await db.execute({
    sql: 'INSERT INTO boards (name, icon, color, position) VALUES (?, ?, ?, ?)',
    args: [body.name.trim(), body.icon || '📋', body.color || 'blue', position]
  });

  const newBoard = await db.execute({ sql: 'SELECT * FROM boards WHERE id = ?', args: [Number(result.lastInsertRowid)] });
  const board = newBoard.rows[0] as any;

  await logActivity('board_created', `Created board: ${board.name}`, { boardId: board.id });

  return c.json(board, 201);
});

// GET /api/boards/:id - Get single board
boardsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await db.execute({ sql: 'SELECT * FROM boards WHERE id = ?', args: [id] });

  if (result.rows.length === 0) {
    return c.json({ error: 'Board not found' }, 404);
  }

  return c.json(result.rows[0]);
});

// PATCH /api/boards/:id - Update board
boardsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ name?: string; icon?: string; color?: string; position?: number; show_testing?: boolean }>();

  const existing = await db.execute({ sql: 'SELECT * FROM boards WHERE id = ?', args: [id] });
  if (existing.rows.length === 0) {
    return c.json({ error: 'Board not found' }, 404);
  }

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (body.name !== undefined) {
    if (body.name.trim() === '') return c.json({ error: 'Name cannot be empty' }, 400);
    updates.push('name = ?'); params.push(body.name.trim());
  }
  if (body.icon !== undefined) { updates.push('icon = ?'); params.push(body.icon); }
  if (body.color !== undefined) { updates.push('color = ?'); params.push(body.color); }
  if (body.position !== undefined) { updates.push('position = ?'); params.push(body.position); }
  if (body.show_testing !== undefined) { updates.push('show_testing = ?'); params.push(body.show_testing ? 1 : 0); }

  if (updates.length === 0) return c.json({ error: 'No fields to update' }, 400);

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(parseInt(id));

  await db.execute({ sql: `UPDATE boards SET ${updates.join(', ')} WHERE id = ?`, args: params });

  const updated = await db.execute({ sql: 'SELECT * FROM boards WHERE id = ?', args: [id] });
  const board = updated.rows[0] as any;

  await logActivity('board_updated', `Updated board: ${board.name}`, { boardId: board.id, changes: Object.keys(body) });

  return c.json(board);
});

// DELETE /api/boards/:id - Delete board
boardsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const deleteTasks = c.req.query('deleteTasks') === 'true';

  const existing = await db.execute({ sql: 'SELECT * FROM boards WHERE id = ?', args: [id] });
  if (existing.rows.length === 0) return c.json({ error: 'Board not found' }, 404);

  const boardCount = await db.execute('SELECT COUNT(*) as count FROM boards');
  if ((boardCount.rows[0] as any).count <= 1) return c.json({ error: 'Cannot delete the last board' }, 400);

  if (deleteTasks) {
    await db.execute({ sql: 'DELETE FROM tasks WHERE board_id = ?', args: [id] });
  } else {
    const otherBoard = await db.execute({ sql: 'SELECT id FROM boards WHERE id != ? ORDER BY position, id LIMIT 1', args: [id] });
    await db.execute({ sql: 'UPDATE tasks SET board_id = ? WHERE board_id = ?', args: [(otherBoard.rows[0] as any).id, id] });
  }

  await db.execute({ sql: 'DELETE FROM boards WHERE id = ?', args: [id] });

  const board = existing.rows[0] as any;
  await logActivity('board_deleted', `Deleted board: ${board.name}`, { boardId: board.id, deletedTasks: deleteTasks });

  return c.json({ success: true });
});

// GET /api/boards/:id/tasks - Get tasks for a specific board
// Special case: board_id=1 (Main) returns all tasks across all boards
boardsRouter.get('/:id/tasks', async (c) => {
  const id = c.req.param('id');
  const status = c.req.query('status');
  const boardId = parseInt(id);

  const boardResult = await db.execute({ sql: 'SELECT * FROM boards WHERE id = ?', args: [id] });
  if (boardResult.rows.length === 0) return c.json({ error: 'Board not found' }, 404);
  const board = boardResult.rows[0];

  // Main board (id=1) is a read-only aggregated view of all tasks
  const isMainBoard = boardId === 1;
  let query: string;
  const params: (string | number)[] = [];

  if (isMainBoard) {
    // Main board: show all tasks across all boards (excluding archived)
    query = 'SELECT t.*, b.name as board_name, b.icon as board_icon, b.color as board_color FROM tasks t LEFT JOIN boards b ON t.board_id = b.id WHERE (t.archived = 0 OR t.archived IS NULL)';
  } else {
    query = 'SELECT t.*, b.name as board_name, b.icon as board_icon, b.color as board_color FROM tasks t LEFT JOIN boards b ON t.board_id = b.id WHERE t.board_id = ?';
    params.push(boardId);
  }

  if (status) {
    query += isMainBoard ? ' AND t.status = ?' : ' AND t.status = ?';
    params.push(status);
  }
  query += ' ORDER BY ' + (isMainBoard ? 't.board_id ASC, ' : '') + 't.position ASC, t.created_at DESC';

  const result = await db.execute({ sql: query, args: params });

  const parsed = (result.rows as any[]).map((t) => ({
    ...t,
    tags: t.tags ? JSON.parse(t.tags) : [],
  }));

  return c.json({ tasks: parsed, board: { ...board, is_main: isMainBoard } });
});
