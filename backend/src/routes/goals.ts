import { Hono } from 'hono';
import { db, logActivity } from '../db/index.js';

export const goalsRouter = new Hono();

// Types
interface Goal {
  id: number;
  title: string;
  description: string | null;
  type: 'global' | 'agent';
  agent_id: string | null;
  status: 'active' | 'paused' | 'achieved';
  progress: number;
  deadline: string | null;
  board_id: number | null;
  created_at: string;
  updated_at: string;
}

interface GoalWithTasks extends Goal {
  tasks: { id: number; name: string; status: string }[];
  task_count: number;
  done_count: number;
}

interface CreateGoalBody {
  title: string;
  description?: string;
  type?: 'global' | 'agent';
  agent_id?: string;
  status?: 'active' | 'paused' | 'achieved';
  deadline?: string;
  board_id?: number;
}

interface UpdateGoalBody {
  title?: string;
  description?: string;
  type?: 'global' | 'agent';
  agent_id?: string;
  status?: 'active' | 'paused' | 'achieved';
  progress?: number;
  deadline?: string;
  board_id?: number;
}

// Helper: Calculate progress from linked tasks
function calculateProgress(goalId: number): number {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done
    FROM goal_tasks gt
    JOIN tasks t ON gt.task_id = t.id
    WHERE gt.goal_id = ?
  `).get(goalId) as { total: number; done: number };

  if (stats.total === 0) return 0;
  return Math.round((stats.done / stats.total) * 100);
}

// Helper: Get goal with tasks
function getGoalWithTasks(goalId: number): GoalWithTasks | null {
  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId) as Goal | undefined;
  if (!goal) return null;

  const tasks = db.prepare(`
    SELECT t.id, t.name, t.status
    FROM goal_tasks gt
    JOIN tasks t ON gt.task_id = t.id
    WHERE gt.goal_id = ?
    ORDER BY t.position ASC, t.created_at DESC
  `).all(goalId) as { id: number; name: string; status: string }[];

  const doneCount = tasks.filter(t => t.status === 'done').length;

  return {
    ...goal,
    tasks,
    task_count: tasks.length,
    done_count: doneCount,
  };
}

// GET /api/goals - List all goals
goalsRouter.get('/', (c) => {
  const type = c.req.query('type');
  const agent_id = c.req.query('agent_id');
  const board_id = c.req.query('board_id');
  const status = c.req.query('status');

  let query = 'SELECT * FROM goals WHERE 1=1';
  const params: (string | number)[] = [];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  if (agent_id) {
    query += ' AND agent_id = ?';
    params.push(agent_id);
  }
  if (board_id) {
    query += ' AND board_id = ?';
    params.push(parseInt(board_id));
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const goals = db.prepare(query).all(...params) as Goal[];

  // Enrich with task counts
  const enriched = goals.map(goal => {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done
      FROM goal_tasks gt
      JOIN tasks t ON gt.task_id = t.id
      WHERE gt.goal_id = ?
    `).get(goal.id) as { total: number; done: number };

    return {
      ...goal,
      task_count: stats.total,
      done_count: stats.done,
    };
  });

  return c.json({ goals: enriched });
});

// POST /api/goals - Create goal
goalsRouter.post('/', async (c) => {
  const body = await c.req.json<CreateGoalBody>();

  if (!body.title || body.title.trim() === '') {
    return c.json({ error: 'Title is required' }, 400);
  }

  const stmt = db.prepare(`
    INSERT INTO goals (title, description, type, agent_id, status, deadline, board_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    body.title.trim(),
    body.description || null,
    body.type || 'global',
    body.agent_id || null,
    body.status || 'active',
    body.deadline || null,
    body.board_id || null
  );

  const newGoal = getGoalWithTasks(result.lastInsertRowid as number);

  logActivity('goal_created', `Created goal: ${body.title}`, { goalId: newGoal?.id });

  return c.json(newGoal, 201);
});

// GET /api/goals/agent/:agentId - Get goals for a specific agent (for heartbeat integration)
// Returns both agent-specific goals AND global goals, with linked tasks
goalsRouter.get('/agent/:agentId', (c) => {
  const agentId = c.req.param('agentId');
  
  // Get agent-specific goals + global goals (both active)
  const goals = db.prepare(`
    SELECT * FROM goals 
    WHERE status = 'active' 
    AND (agent_id = ? OR type = 'global')
    ORDER BY type ASC, created_at DESC
  `).all(agentId) as Goal[];

  const enriched = goals.map(goal => {
    const tasks = db.prepare(`
      SELECT t.id, t.name, t.status, t.priority
      FROM goal_tasks gt
      JOIN tasks t ON gt.task_id = t.id
      WHERE gt.goal_id = ?
      ORDER BY t.position ASC
    `).all(goal.id) as { id: number; name: string; status: string; priority: string }[];

    const doneCount = tasks.filter(t => t.status === 'done').length;
    const pendingTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'rejected');

    return {
      ...goal,
      tasks,
      task_count: tasks.length,
      done_count: doneCount,
      pending_tasks: pendingTasks,
      needs_tasks: pendingTasks.length === 0 && goal.progress < 100,
    };
  });

  return c.json({ 
    goals: enriched,
    agent_id: agentId,
    summary: {
      total: enriched.length,
      needs_tasks: enriched.filter(g => g.needs_tasks).length,
      global: enriched.filter(g => g.type === 'global').length,
      agent_specific: enriched.filter(g => g.type === 'agent').length,
    }
  });
});

// GET /api/goals/:id - Get single goal with tasks
goalsRouter.get('/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  const goal = getGoalWithTasks(id);

  if (!goal) {
    return c.json({ error: 'Goal not found' }, 404);
  }

  return c.json(goal);
});

// PATCH /api/goals/:id - Update goal
goalsRouter.patch('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<UpdateGoalBody>();

  const existing = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal | undefined;
  if (!existing) {
    return c.json({ error: 'Goal not found' }, 404);
  }

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (body.title !== undefined) {
    if (body.title.trim() === '') {
      return c.json({ error: 'Title cannot be empty' }, 400);
    }
    updates.push('title = ?');
    params.push(body.title.trim());
  }
  if (body.description !== undefined) {
    updates.push('description = ?');
    params.push(body.description);
  }
  if (body.type !== undefined) {
    updates.push('type = ?');
    params.push(body.type);
  }
  if (body.agent_id !== undefined) {
    updates.push('agent_id = ?');
    params.push(body.agent_id);
  }
  if (body.status !== undefined) {
    updates.push('status = ?');
    params.push(body.status);
  }
  if (body.progress !== undefined) {
    updates.push('progress = ?');
    params.push(body.progress);
  }
  if (body.deadline !== undefined) {
    updates.push('deadline = ?');
    params.push(body.deadline || null);
  }
  if (body.board_id !== undefined) {
    updates.push('board_id = ?');
    params.push(body.board_id);
  }

  if (updates.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  const query = `UPDATE goals SET ${updates.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...params);

  const updated = getGoalWithTasks(id);

  logActivity('goal_updated', `Updated goal: ${updated?.title}`, { goalId: id, changes: Object.keys(body) });

  return c.json(updated);
});

// DELETE /api/goals/:id - Delete goal
goalsRouter.delete('/:id', (c) => {
  const id = parseInt(c.req.param('id'));

  const existing = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal | undefined;
  if (!existing) {
    return c.json({ error: 'Goal not found' }, 404);
  }

  // goal_tasks will cascade delete
  db.prepare('DELETE FROM goals WHERE id = ?').run(id);

  logActivity('goal_deleted', `Deleted goal: ${existing.title}`, { goalId: id });

  return c.json({ success: true });
});

// POST /api/goals/:id/tasks/:taskId - Link task to goal
goalsRouter.post('/:id/tasks/:taskId', (c) => {
  const goalId = parseInt(c.req.param('id'));
  const taskId = parseInt(c.req.param('taskId'));

  // Verify goal exists
  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId) as Goal | undefined;
  if (!goal) {
    return c.json({ error: 'Goal not found' }, 404);
  }

  // Verify task exists
  const task = db.prepare('SELECT id, name FROM tasks WHERE id = ?').get(taskId) as { id: number; name: string } | undefined;
  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  // Check if already linked
  const existing = db.prepare('SELECT 1 FROM goal_tasks WHERE goal_id = ? AND task_id = ?').get(goalId, taskId);
  if (existing) {
    return c.json({ error: 'Task already linked to this goal' }, 400);
  }

  // Link them
  db.prepare('INSERT INTO goal_tasks (goal_id, task_id) VALUES (?, ?)').run(goalId, taskId);

  // Update goal progress
  const progress = calculateProgress(goalId);
  db.prepare('UPDATE goals SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(progress, goalId);

  logActivity('goal_task_linked', `Linked task "${task.name}" to goal "${goal.title}"`, { goalId, taskId });

  const updated = getGoalWithTasks(goalId);
  return c.json(updated, 201);
});

// DELETE /api/goals/:id/tasks/:taskId - Unlink task from goal
goalsRouter.delete('/:id/tasks/:taskId', (c) => {
  const goalId = parseInt(c.req.param('id'));
  const taskId = parseInt(c.req.param('taskId'));

  // Verify goal exists
  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId) as Goal | undefined;
  if (!goal) {
    return c.json({ error: 'Goal not found' }, 404);
  }

  // Check if linked
  const existing = db.prepare('SELECT 1 FROM goal_tasks WHERE goal_id = ? AND task_id = ?').get(goalId, taskId);
  if (!existing) {
    return c.json({ error: 'Task not linked to this goal' }, 404);
  }

  // Unlink
  db.prepare('DELETE FROM goal_tasks WHERE goal_id = ? AND task_id = ?').run(goalId, taskId);

  // Update goal progress
  const progress = calculateProgress(goalId);
  db.prepare('UPDATE goals SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(progress, goalId);

  logActivity('goal_task_unlinked', `Unlinked task from goal "${goal.title}"`, { goalId, taskId });

  const updated = getGoalWithTasks(goalId);
  return c.json(updated);
});

// GET /api/goals/:id/tasks - Get all tasks linked to a goal
goalsRouter.get('/:id/tasks', (c) => {
  const goalId = parseInt(c.req.param('id'));

  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId) as Goal | undefined;
  if (!goal) {
    return c.json({ error: 'Goal not found' }, 404);
  }

  const tasks = db.prepare(`
    SELECT t.*
    FROM goal_tasks gt
    JOIN tasks t ON gt.task_id = t.id
    WHERE gt.goal_id = ?
    ORDER BY t.position ASC, t.created_at DESC
  `).all(goalId);

  return c.json({ tasks, goal });
});
