import { Hono } from 'hono';
import { db, logActivity } from '../db/index.js';

export const tasksRouter = new Hono();

// Types
interface Task {
  id: number;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  tags: string | null;
  board_id: number | null;
  position: number;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  rating: number | null;
  rated_at: string | null;
  rejection_reason: string | null;
}

interface CreateTaskBody {
  name: string;
  description?: string;
  status?: string;
  priority?: string;
  tags?: string[];
  board_id?: number;
  position?: number;
  deadline?: string | null;
}

interface UpdateTaskBody {
  name?: string;
  description?: string;
  status?: string;
  priority?: string;
  tags?: string[];
  board_id?: number;
  position?: number;
  deadline?: string | null;
  rating?: number | null;
  rejection_reason?: string | null;
}

// GET /api/tasks - List all tasks with optional filtering
tasksRouter.get('/', (c) => {
  const status = c.req.query('status');
  const priority = c.req.query('priority');
  const boardId = c.req.query('board_id');
  const search = c.req.query('search');
  const tag = c.req.query('tag');
  const includeArchived = c.req.query('includeArchived') === 'true';

  let query = 'SELECT t.*, b.name as board_name, b.icon as board_icon FROM tasks t LEFT JOIN boards b ON t.board_id = b.id WHERE 1=1';
  const params: (string | number)[] = [];

  // By default, exclude archived tasks
  if (!includeArchived) {
    query += ' AND (t.archived = 0 OR t.archived IS NULL)';
  }

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }

  if (priority) {
    query += ' AND t.priority = ?';
    params.push(priority);
  }

  if (boardId) {
    query += ' AND t.board_id = ?';
    params.push(parseInt(boardId));
  }

  if (search) {
    query += ' AND (t.name LIKE ? OR t.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (tag) {
    query += ' AND t.tags LIKE ?';
    params.push(`%"${tag}"%`);
  }

  query += ' ORDER BY t.position ASC, t.created_at DESC';

  const stmt = db.prepare(query);
  const tasks = stmt.all(...params) as (Task & { board_name: string })[];

  // Parse tags JSON
  const parsed = tasks.map((t) => ({
    ...t,
    tags: t.tags ? JSON.parse(t.tags) : [],
  }));

  return c.json({ tasks: parsed });
});

// GET /api/tasks/archived - List archived tasks (MUST be before /:id)
tasksRouter.get('/archived', (c) => {
  const boardId = c.req.query('board_id');
  
  let query = 'SELECT t.*, b.name as board_name FROM tasks t LEFT JOIN boards b ON t.board_id = b.id WHERE t.archived = 1';
  const params: (string | number)[] = [];

  if (boardId) {
    query += ' AND t.board_id = ?';
    params.push(parseInt(boardId));
  }

  query += ' ORDER BY t.archived_at DESC';

  const tasks = db.prepare(query).all(...params) as (Task & { board_name: string })[];

  return c.json({
    tasks: tasks.map((t) => ({
      ...t,
      tags: t.tags ? JSON.parse(t.tags) : [],
    })),
  });
});

// GET /api/tasks/:id - Get single task
tasksRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const task = stmt.get(id) as Task | undefined;

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  return c.json({
    ...task,
    tags: task.tags ? JSON.parse(task.tags) : [],
  });
});

// POST /api/tasks - Create task
tasksRouter.post('/', async (c) => {
  const body = await c.req.json<CreateTaskBody>();

  if (!body.name) {
    return c.json({ error: 'Name is required' }, 400);
  }

  const validStatuses = ['inbox', 'up_next', 'in_progress', 'testing', 'in_review', 'done', 'rejected'];
  const validPriorities = ['low', 'medium', 'high', 'urgent'];

  if (body.status && !validStatuses.includes(body.status)) {
    return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
  }

  if (body.priority && !validPriorities.includes(body.priority)) {
    return c.json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` }, 400);
  }

  // Validate board_id if provided
  let boardId: number | undefined = body.board_id;
  if (boardId) {
    const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(boardId);
    if (!board) {
      return c.json({ error: 'Board not found' }, 400);
    }
  } else {
    // Default to first board if not specified
    const defaultBoard = db.prepare('SELECT id FROM boards ORDER BY position, id LIMIT 1').get() as { id: number } | undefined;
    boardId = defaultBoard?.id;
  }

  // Get max position for new task in this status
  const maxPos = db.prepare('SELECT MAX(position) as max FROM tasks WHERE board_id = ? AND status = ?').get(
    boardId,
    body.status || 'inbox'
  ) as { max: number | null };
  const position = body.position !== undefined ? body.position : (maxPos.max ?? -1) + 1;

  const stmt = db.prepare(`
    INSERT INTO tasks (name, description, status, priority, tags, board_id, position, deadline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    body.name,
    body.description || null,
    body.status || 'inbox',
    body.priority || 'medium',
    body.tags ? JSON.stringify(body.tags) : null,
    boardId,
    position,
    body.deadline || null
  );

  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid) as Task;

  // Log activity
  logActivity('task_created', `Created task: ${body.name}`, { taskId: newTask.id, boardId: newTask.board_id });

  return c.json(
    {
      ...newTask,
      tags: newTask.tags ? JSON.parse(newTask.tags) : [],
    },
    201
  );
});

// PATCH /api/tasks/:id - Update task
tasksRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<UpdateTaskBody>();

  // Check task exists
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const validStatuses = ['inbox', 'up_next', 'in_progress', 'testing', 'in_review', 'done', 'rejected'];
  const validPriorities = ['low', 'medium', 'high', 'urgent'];

  if (body.status && !validStatuses.includes(body.status)) {
    return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
  }

  if (body.priority && !validPriorities.includes(body.priority)) {
    return c.json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` }, 400);
  }

  // Build update query dynamically
  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    params.push(body.name);
  }
  if (body.description !== undefined) {
    updates.push('description = ?');
    params.push(body.description);
  }
  if (body.status !== undefined) {
    updates.push('status = ?');
    params.push(body.status);
    // Set completed_at when status changes to done
    if (body.status === 'done' && existing.status !== 'done') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
    } else if (body.status !== 'done' && existing.status === 'done') {
      updates.push('completed_at = NULL');
    }
  }
  if (body.priority !== undefined) {
    updates.push('priority = ?');
    params.push(body.priority);
  }
  if (body.tags !== undefined) {
    updates.push('tags = ?');
    params.push(JSON.stringify(body.tags));
  }
  if (body.board_id !== undefined) {
    // Validate board exists
    const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(body.board_id);
    if (!board) {
      return c.json({ error: 'Board not found' }, 400);
    }
    updates.push('board_id = ?');
    params.push(body.board_id);
  }
  if (body.position !== undefined) {
    updates.push('position = ?');
    params.push(body.position);
  }
  if (body.deadline !== undefined) {
    updates.push('deadline = ?');
    params.push(body.deadline);
  }
  if (body.rating !== undefined) {
    // Validate rating is 1-5 or null
    if (body.rating !== null && (body.rating < 1 || body.rating > 5 || !Number.isInteger(body.rating))) {
      return c.json({ error: 'Rating must be an integer between 1 and 5' }, 400);
    }
    updates.push('rating = ?');
    params.push(body.rating);
    updates.push('rated_at = ?');
    params.push(body.rating !== null ? new Date().toISOString() : null);
  }

  if (body.rejection_reason !== undefined) {
    updates.push('rejection_reason = ?');
    params.push(body.rejection_reason);
  }

  if (updates.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(parseInt(id));

  const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...params);

  // Recalculate progress for any goals linked to this task (if status changed)
  if (body.status !== undefined) {
    const linkedGoals = db.prepare('SELECT goal_id FROM goal_tasks WHERE task_id = ?').all(parseInt(id)) as { goal_id: number }[];
    for (const { goal_id } of linkedGoals) {
      const stats = db.prepare(`
        SELECT COUNT(*) as total, SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done
        FROM goal_tasks gt JOIN tasks t ON gt.task_id = t.id WHERE gt.goal_id = ?
      `).get(goal_id) as { total: number; done: number };
      const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
      db.prepare('UPDATE goals SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(progress, goal_id);
    }
  }

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;

  // Log activity
  if (body.status === 'done' && existing.status !== 'done') {
    logActivity('task_completed', `Completed task: ${updated.name}`, { taskId: updated.id });
  } else if (body.rating !== undefined && body.rating !== null) {
    logActivity('task_rated', `Rated task: ${updated.name} (${body.rating}/5)`, { taskId: updated.id, rating: body.rating });
  } else {
    logActivity('task_updated', `Updated task: ${updated.name}`, { taskId: updated.id, changes: Object.keys(body) });
  }

  return c.json({
    ...updated,
    tags: updated.tags ? JSON.parse(updated.tags) : [],
  });
});

// DELETE /api/tasks/:id - Permanently delete task
tasksRouter.delete('/:id', (c) => {
  const id = c.req.param('id');

  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

  // Log activity
  logActivity('task_deleted', `Deleted task: ${existing.name}`, { taskId: existing.id });

  return c.json({ success: true });
});

// POST /api/tasks/:id/archive - Archive task (soft delete)
tasksRouter.post('/:id/archive', (c) => {
  const id = c.req.param('id');

  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  db.prepare('UPDATE tasks SET archived = 1, archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

  // Log activity
  logActivity('task_archived', `Archived task: ${existing.name}`, { taskId: existing.id });

  return c.json({ success: true, message: 'Task archived' });
});

// POST /api/tasks/:id/restore - Restore archived task
tasksRouter.post('/:id/restore', (c) => {
  const id = c.req.param('id');

  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  db.prepare('UPDATE tasks SET archived = 0, archived_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

  // Log activity
  logActivity('task_restored', `Restored task: ${existing.name}`, { taskId: existing.id });

  return c.json({ success: true, message: 'Task restored' });
});
