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
}

// GET /api/tasks - List all tasks with optional filtering
tasksRouter.get('/', (c) => {
  const status = c.req.query('status');
  const priority = c.req.query('priority');
  const boardId = c.req.query('board_id');

  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params: (string | number)[] = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (priority) {
    query += ' AND priority = ?';
    params.push(priority);
  }

  if (boardId) {
    query += ' AND board_id = ?';
    params.push(parseInt(boardId));
  }

  query += ' ORDER BY position ASC, created_at DESC';

  const stmt = db.prepare(query);
  const tasks = stmt.all(...params) as Task[];

  // Parse tags JSON
  const parsed = tasks.map((t) => ({
    ...t,
    tags: t.tags ? JSON.parse(t.tags) : [],
  }));

  return c.json({ tasks: parsed });
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

  const validStatuses = ['inbox', 'up_next', 'in_progress', 'testing', 'in_review', 'done'];
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

  const validStatuses = ['inbox', 'up_next', 'in_progress', 'testing', 'in_review', 'done'];
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
  } else {
    logActivity('task_updated', `Updated task: ${updated.name}`, { taskId: updated.id, changes: Object.keys(body) });
  }

  return c.json({
    ...updated,
    tags: updated.tags ? JSON.parse(updated.tags) : [],
  });
});

// DELETE /api/tasks/:id - Delete task
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
