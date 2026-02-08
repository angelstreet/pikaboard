import { Hono } from 'hono';
import { db, logActivity } from '../db/index.js';

export const goalsRouter = new Hono();

// Helper: Calculate progress from linked tasks
async function calculateProgress(goalId: number): Promise<number> {
  const stats = await db.execute({
    sql: `SELECT COUNT(*) as total, SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done
          FROM goal_tasks gt JOIN tasks t ON gt.task_id = t.id WHERE gt.goal_id = ?`,
    args: [goalId]
  });
  const s = stats.rows[0] as any;
  if (s.total === 0) return 0;
  return Math.round((s.done / s.total) * 100);
}

// Helper: Get goal with tasks
async function getGoalWithTasks(goalId: number): Promise<any | null> {
  const goalResult = await db.execute({ sql: 'SELECT * FROM goals WHERE id = ?', args: [goalId] });
  if (goalResult.rows.length === 0) return null;
  const goal = goalResult.rows[0] as any;

  const tasksResult = await db.execute({
    sql: `SELECT t.id, t.name, t.status FROM goal_tasks gt JOIN tasks t ON gt.task_id = t.id WHERE gt.goal_id = ? ORDER BY t.position ASC, t.created_at DESC`,
    args: [goalId]
  });
  const tasks = tasksResult.rows as any[];
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return { ...goal, tasks, task_count: tasks.length, done_count: doneCount };
}

// GET /api/goals
goalsRouter.get('/', async (c) => {
  const type = c.req.query('type');
  const agent_id = c.req.query('agent_id');
  const board_id = c.req.query('board_id');
  const status = c.req.query('status');

  let query = 'SELECT * FROM goals WHERE 1=1';
  const params: (string | number)[] = [];
  if (type) { query += ' AND type = ?'; params.push(type); }
  if (agent_id) { query += ' AND agent_id = ?'; params.push(agent_id); }
  if (board_id) { query += ' AND board_id = ?'; params.push(parseInt(board_id)); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY created_at DESC';

  const goalsResult = await db.execute({ sql: query, args: params });
  const goals = goalsResult.rows as any[];

  const enriched = [];
  for (const goal of goals) {
    const stats = await db.execute({
      sql: `SELECT COUNT(*) as total, SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done
            FROM goal_tasks gt JOIN tasks t ON gt.task_id = t.id WHERE gt.goal_id = ?`,
      args: [goal.id]
    });
    const s = stats.rows[0] as any;
    enriched.push({ ...goal, task_count: s.total, done_count: s.done });
  }

  return c.json({ goals: enriched });
});

// POST /api/goals
goalsRouter.post('/', async (c) => {
  const body = await c.req.json<any>();
  if (!body.title || body.title.trim() === '') return c.json({ error: 'Title is required' }, 400);

  const result = await db.execute({
    sql: 'INSERT INTO goals (title, description, type, agent_id, status, deadline, board_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [body.title.trim(), body.description || null, body.type || 'global', body.agent_id || null, body.status || 'active', body.deadline || null, body.board_id || null]
  });

  const newGoal = await getGoalWithTasks(Number(result.lastInsertRowid));
  await logActivity('goal_created', `Created goal: ${body.title}`, { goalId: newGoal?.id });

  return c.json(newGoal, 201);
});

// GET /api/goals/agent/:agentId
goalsRouter.get('/agent/:agentId', async (c) => {
  const agentId = c.req.param('agentId');

  const goalsResult = await db.execute({
    sql: `SELECT * FROM goals WHERE status = 'active' AND (agent_id = ? OR type = 'global') ORDER BY type ASC, created_at DESC`,
    args: [agentId]
  });

  const enriched = [];
  for (const goal of goalsResult.rows as any[]) {
    const tasksResult = await db.execute({
      sql: `SELECT t.id, t.name, t.status, t.priority FROM goal_tasks gt JOIN tasks t ON gt.task_id = t.id WHERE gt.goal_id = ? ORDER BY t.position ASC`,
      args: [goal.id]
    });
    const tasks = tasksResult.rows as any[];
    const doneCount = tasks.filter(t => t.status === 'done').length;
    const pendingTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'rejected');

    enriched.push({
      ...goal, tasks, task_count: tasks.length, done_count: doneCount,
      pending_tasks: pendingTasks, needs_tasks: pendingTasks.length === 0 && goal.progress < 100,
    });
  }

  return c.json({
    goals: enriched, agent_id: agentId,
    summary: {
      total: enriched.length,
      needs_tasks: enriched.filter(g => g.needs_tasks).length,
      global: enriched.filter(g => g.type === 'global').length,
      agent_specific: enriched.filter(g => g.type === 'agent').length,
    }
  });
});

// GET /api/goals/:id
goalsRouter.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const goal = await getGoalWithTasks(id);
  if (!goal) return c.json({ error: 'Goal not found' }, 404);
  return c.json(goal);
});

// PATCH /api/goals/:id
goalsRouter.patch('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<any>();

  const existing = await db.execute({ sql: 'SELECT * FROM goals WHERE id = ?', args: [id] });
  if (existing.rows.length === 0) return c.json({ error: 'Goal not found' }, 404);

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (body.title !== undefined) {
    if (body.title.trim() === '') return c.json({ error: 'Title cannot be empty' }, 400);
    updates.push('title = ?'); params.push(body.title.trim());
  }
  if (body.description !== undefined) { updates.push('description = ?'); params.push(body.description); }
  if (body.type !== undefined) { updates.push('type = ?'); params.push(body.type); }
  if (body.agent_id !== undefined) { updates.push('agent_id = ?'); params.push(body.agent_id); }
  if (body.status !== undefined) { updates.push('status = ?'); params.push(body.status); }
  if (body.progress !== undefined) { updates.push('progress = ?'); params.push(body.progress); }
  if (body.deadline !== undefined) { updates.push('deadline = ?'); params.push(body.deadline || null); }
  if (body.board_id !== undefined) { updates.push('board_id = ?'); params.push(body.board_id); }

  if (updates.length === 0) return c.json({ error: 'No fields to update' }, 400);

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  await db.execute({ sql: `UPDATE goals SET ${updates.join(', ')} WHERE id = ?`, args: params });

  const updated = await getGoalWithTasks(id);
  await logActivity('goal_updated', `Updated goal: ${updated?.title}`, { goalId: id, changes: Object.keys(body) });

  return c.json(updated);
});

// DELETE /api/goals/:id
goalsRouter.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const existing = await db.execute({ sql: 'SELECT * FROM goals WHERE id = ?', args: [id] });
  if (existing.rows.length === 0) return c.json({ error: 'Goal not found' }, 404);

  await db.execute({ sql: 'DELETE FROM goals WHERE id = ?', args: [id] });
  await logActivity('goal_deleted', `Deleted goal: ${(existing.rows[0] as any).title}`, { goalId: id });

  return c.json({ success: true });
});

// POST /api/goals/:id/tasks/:taskId - Link task
goalsRouter.post('/:id/tasks/:taskId', async (c) => {
  const goalId = parseInt(c.req.param('id'));
  const taskId = parseInt(c.req.param('taskId'));

  const goal = await db.execute({ sql: 'SELECT * FROM goals WHERE id = ?', args: [goalId] });
  if (goal.rows.length === 0) return c.json({ error: 'Goal not found' }, 404);

  const task = await db.execute({ sql: 'SELECT id, name FROM tasks WHERE id = ?', args: [taskId] });
  if (task.rows.length === 0) return c.json({ error: 'Task not found' }, 404);

  const existing = await db.execute({ sql: 'SELECT 1 FROM goal_tasks WHERE goal_id = ? AND task_id = ?', args: [goalId, taskId] });
  if (existing.rows.length > 0) return c.json({ error: 'Task already linked to this goal' }, 400);

  await db.execute({ sql: 'INSERT INTO goal_tasks (goal_id, task_id) VALUES (?, ?)', args: [goalId, taskId] });

  const progress = await calculateProgress(goalId);
  await db.execute({ sql: 'UPDATE goals SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [progress, goalId] });

  await logActivity('goal_task_linked', `Linked task "${(task.rows[0] as any).name}" to goal "${(goal.rows[0] as any).title}"`, { goalId, taskId });

  const updated = await getGoalWithTasks(goalId);
  return c.json(updated, 201);
});

// DELETE /api/goals/:id/tasks/:taskId - Unlink task
goalsRouter.delete('/:id/tasks/:taskId', async (c) => {
  const goalId = parseInt(c.req.param('id'));
  const taskId = parseInt(c.req.param('taskId'));

  const goal = await db.execute({ sql: 'SELECT * FROM goals WHERE id = ?', args: [goalId] });
  if (goal.rows.length === 0) return c.json({ error: 'Goal not found' }, 404);

  const existing = await db.execute({ sql: 'SELECT 1 FROM goal_tasks WHERE goal_id = ? AND task_id = ?', args: [goalId, taskId] });
  if (existing.rows.length === 0) return c.json({ error: 'Task not linked to this goal' }, 404);

  await db.execute({ sql: 'DELETE FROM goal_tasks WHERE goal_id = ? AND task_id = ?', args: [goalId, taskId] });

  const progress = await calculateProgress(goalId);
  await db.execute({ sql: 'UPDATE goals SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [progress, goalId] });

  await logActivity('goal_task_unlinked', `Unlinked task from goal "${(goal.rows[0] as any).title}"`, { goalId, taskId });

  const updated = await getGoalWithTasks(goalId);
  return c.json(updated);
});

// GET /api/goals/:id/tasks
goalsRouter.get('/:id/tasks', async (c) => {
  const goalId = parseInt(c.req.param('id'));
  const goal = await db.execute({ sql: 'SELECT * FROM goals WHERE id = ?', args: [goalId] });
  if (goal.rows.length === 0) return c.json({ error: 'Goal not found' }, 404);

  const tasks = await db.execute({
    sql: `SELECT t.* FROM goal_tasks gt JOIN tasks t ON gt.task_id = t.id WHERE gt.goal_id = ? ORDER BY t.position ASC, t.created_at DESC`,
    args: [goalId]
  });

  return c.json({ tasks: tasks.rows, goal: goal.rows[0] });
});
