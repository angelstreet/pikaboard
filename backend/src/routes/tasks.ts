import { Hono } from 'hono';
import { db, logActivity } from '../db/index.js';

export const tasksRouter = new Hono();

// Fire-and-forget: trigger Lanturn's cron directly (no Pika middleman)
import { exec } from 'child_process';
function notifyLanturn(id: number | string, event: string, boardId: number | string) {
  exec('openclaw cron run b2ca724f-d375-44a0-8889-3ca0f6208eb8', (err) => {
    if (err) console.error('[webhook] Failed to trigger Lanturn cron:', err.message);
    else console.log(`[webhook] Triggered Lanturn for task #${id} ${event}`);
  });
}

// Safe JSON parse for tags
function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'string') return parsed.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  } catch {
    return raw.split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
  }
}

function normalizeTags(tags: unknown): string | null {
  if (tags === null || tags === undefined) return null;
  if (Array.isArray(tags)) return JSON.stringify(tags);
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch {}
    return JSON.stringify(tags.split(',').map(s => s.trim()).filter(Boolean));
  }
  return null;
}

// GET /api/tasks - List all tasks with optional filtering
tasksRouter.get('/', async (c) => {
  const status = c.req.query('status');
  const priority = c.req.query('priority');
  const boardId = c.req.query('board_id');
  const search = c.req.query('search');
  const tag = c.req.query('tag');
  const includeArchived = c.req.query('includeArchived') === 'true';

  let query = 'SELECT t.*, b.name as board_name, b.icon as board_icon FROM tasks t LEFT JOIN boards b ON t.board_id = b.id WHERE 1=1';
  const params: (string | number)[] = [];

  if (!includeArchived) { query += ' AND (t.archived = 0 OR t.archived IS NULL)'; }
  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (boardId) { query += ' AND t.board_id = ?'; params.push(parseInt(boardId)); }
  if (search) { query += ' AND (t.name LIKE ? OR t.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (tag) { query += ' AND t.tags LIKE ?'; params.push(`%"${tag}"%`); }
  const assignee = c.req.query('assignee');
  if (assignee) { query += ' AND t.assignee = ?'; params.push(assignee); }

  query += ' ORDER BY t.position ASC, t.created_at DESC';

  const result = await db.execute({ sql: query, args: params });

  const parsed = (result.rows as any[]).map((t) => ({
    ...t,
    tags: parseTags(t.tags),
  }));

  return c.json({ tasks: parsed });
});

// GET /api/tasks/archived
tasksRouter.get('/archived', async (c) => {
  const boardId = c.req.query('board_id');
  let query = 'SELECT t.*, b.name as board_name FROM tasks t LEFT JOIN boards b ON t.board_id = b.id WHERE t.archived = 1';
  const params: (string | number)[] = [];
  if (boardId) { query += ' AND t.board_id = ?'; params.push(parseInt(boardId)); }
  query += ' ORDER BY t.archived_at DESC';

  const result = await db.execute({ sql: query, args: params });
  return c.json({
    tasks: (result.rows as any[]).map((t) => ({ ...t, tags: parseTags(t.tags) })),
  });
});

// GET /api/tasks/:id
tasksRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [id] });
  if (result.rows.length === 0) return c.json({ error: 'Task not found' }, 404);
  const task = result.rows[0] as any;
  return c.json({ ...task, tags: parseTags(task.tags) });
});

// POST /api/tasks
tasksRouter.post('/', async (c) => {
  const body = await c.req.json<any>();
  if (!body.name) return c.json({ error: 'Name is required' }, 400);

  const validStatuses = ['inbox', 'up_next', 'in_progress', 'testing', 'in_review', 'done', 'rejected'];
  const validPriorities = ['low', 'medium', 'high', 'urgent'];

  if (body.status && !validStatuses.includes(body.status)) return c.json({ error: `Invalid status` }, 400);
  if (body.priority && !validPriorities.includes(body.priority)) return c.json({ error: `Invalid priority` }, 400);

  let boardId: number | undefined = body.board_id;
  if (boardId) {
    const board = await db.execute({ sql: 'SELECT id FROM boards WHERE id = ?', args: [boardId] });
    if (board.rows.length === 0) return c.json({ error: 'Board not found' }, 400);
  } else {
    const defaultBoard = await db.execute('SELECT id FROM boards ORDER BY position, id LIMIT 1');
    boardId = defaultBoard.rows.length > 0 ? (defaultBoard.rows[0] as any).id : undefined;
  }

  const maxPos = await db.execute({ sql: 'SELECT MAX(position) as max FROM tasks WHERE board_id = ? AND status = ?', args: [boardId!, body.status || 'inbox'] });
  const position = body.position !== undefined ? body.position : ((maxPos.rows[0] as any).max ?? -1) + 1;

  const result = await db.execute({
    sql: 'INSERT INTO tasks (name, description, status, priority, tags, board_id, position, deadline, assignee) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: [body.name, body.description || null, body.status || 'inbox', body.priority || 'medium', normalizeTags(body.tags), boardId!, position, body.deadline || null, body.assignee || null]
  });

  const newTask = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [Number(result.lastInsertRowid)] });
  const task = newTask.rows[0] as any;

  await logActivity('task_created', `Created task: ${body.name}`, { taskId: task.id, boardId: task.board_id });
  if (task.status === 'up_next') notifyLanturn(task.id, 'created', task.board_id);

  return c.json({ ...task, tags: parseTags(task.tags) }, 201);
});

// PATCH /api/tasks/:id
tasksRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<any>();

  const existingResult = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [id] });
  if (existingResult.rows.length === 0) return c.json({ error: 'Task not found' }, 404);
  const existing = existingResult.rows[0] as any;

  const validStatuses = ['inbox', 'up_next', 'in_progress', 'testing', 'in_review', 'done', 'rejected'];
  const validPriorities = ['low', 'medium', 'high', 'urgent'];

  if (body.status && !validStatuses.includes(body.status)) return c.json({ error: `Invalid status` }, 400);
  if (body.priority && !validPriorities.includes(body.priority)) return c.json({ error: `Invalid priority` }, 400);

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name); }
  if (body.description !== undefined) { updates.push('description = ?'); params.push(body.description); }
  if (body.status !== undefined) {
    updates.push('status = ?'); params.push(body.status);
    if (body.status === 'done' && existing.status !== 'done') updates.push('completed_at = CURRENT_TIMESTAMP');
    else if (body.status !== 'done' && existing.status === 'done') updates.push('completed_at = NULL');
  }
  if (body.priority !== undefined) { updates.push('priority = ?'); params.push(body.priority); }
  if (body.tags !== undefined) { updates.push('tags = ?'); params.push(normalizeTags(body.tags)); }
  if (body.board_id !== undefined) {
    const board = await db.execute({ sql: 'SELECT id FROM boards WHERE id = ?', args: [body.board_id] });
    if (board.rows.length === 0) return c.json({ error: 'Board not found' }, 400);
    updates.push('board_id = ?'); params.push(body.board_id);
  }
  if (body.position !== undefined) { updates.push('position = ?'); params.push(body.position); }
  if (body.deadline !== undefined) { updates.push('deadline = ?'); params.push(body.deadline); }
  if (body.rating !== undefined) {
    if (body.rating !== null && (body.rating < 1 || body.rating > 5 || !Number.isInteger(body.rating)))
      return c.json({ error: 'Rating must be an integer between 1 and 5' }, 400);
    updates.push('rating = ?'); params.push(body.rating);
    updates.push('rated_at = ?'); params.push(body.rating !== null ? new Date().toISOString() : null);
  }
  if (body.rejection_reason !== undefined) { updates.push('rejection_reason = ?'); params.push(body.rejection_reason); }
  if (body.assignee !== undefined) { updates.push('assignee = ?'); params.push(body.assignee); }

  if (updates.length === 0) return c.json({ error: 'No fields to update' }, 400);

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(parseInt(id));

  await db.execute({ sql: `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, args: params });

  // Recalculate goal progress if status changed
  if (body.status !== undefined) {
    const linkedGoals = await db.execute({ sql: 'SELECT goal_id FROM goal_tasks WHERE task_id = ?', args: [parseInt(id)] });
    for (const row of linkedGoals.rows as any[]) {
      const stats = await db.execute({
        sql: `SELECT COUNT(*) as total, SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done FROM goal_tasks gt JOIN tasks t ON gt.task_id = t.id WHERE gt.goal_id = ?`,
        args: [row.goal_id]
      });
      const s = stats.rows[0] as any;
      const progress = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
      await db.execute({ sql: 'UPDATE goals SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [progress, row.goal_id] });
    }
  }

  const updated = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [id] });
  const task = updated.rows[0] as any;

  if (body.status === 'done' && existing.status !== 'done') {
    await logActivity('task_completed', `Completed task: ${task.name}`, { taskId: task.id });
  } else if (body.rating !== undefined && body.rating !== null) {
    await logActivity('task_rated', `Rated task: ${task.name} (${body.rating}/5)`, { taskId: task.id, rating: body.rating });
  } else {
    await logActivity('task_updated', `Updated task: ${task.name}`, { taskId: task.id, changes: Object.keys(body) });
  }

  if (body.status === 'up_next') notifyLanturn(task.id, 'status_to_up_next', task.board_id);

  return c.json({ ...task, tags: parseTags(task.tags) });
});

// DELETE /api/tasks/:id
tasksRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [id] });
  if (existing.rows.length === 0) return c.json({ error: 'Task not found' }, 404);
  const task = existing.rows[0] as any;

  await db.execute({ sql: 'DELETE FROM tasks WHERE id = ?', args: [id] });
  await logActivity('task_deleted', `Deleted task: ${task.name}`, { taskId: task.id });
  // No webhook on delete

  return c.json({ success: true });
});

// POST /api/tasks/:id/archive
tasksRouter.post('/:id/archive', async (c) => {
  const id = c.req.param('id');
  const existing = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [id] });
  if (existing.rows.length === 0) return c.json({ error: 'Task not found' }, 404);

  await db.execute({ sql: 'UPDATE tasks SET archived = 1, archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [id] });
  await logActivity('task_archived', `Archived task: ${(existing.rows[0] as any).name}`, { taskId: (existing.rows[0] as any).id });
  // No webhook on archive

  return c.json({ success: true, message: 'Task archived' });
});

// POST /api/tasks/:id/restore
tasksRouter.post('/:id/restore', async (c) => {
  const id = c.req.param('id');
  const existing = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [id] });
  if (existing.rows.length === 0) return c.json({ error: 'Task not found' }, 404);

  await db.execute({ sql: 'UPDATE tasks SET archived = 0, archived_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [id] });
  await logActivity('task_restored', `Restored task: ${(existing.rows[0] as any).name}`, { taskId: (existing.rows[0] as any).id });
  // No webhook on restore

  return c.json({ success: true, message: 'Task restored' });
});
