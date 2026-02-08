import { Hono } from 'hono';
import { db } from '../db/index.js';

export const statsRouter = new Hono();

// GET /api/stats - Get dashboard stats
statsRouter.get('/', async (c) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString();

  const tasksResult = await db.execute('SELECT id, status, priority, deadline, completed_at FROM tasks');
  const tasks = tasksResult.rows as any[];

  const completedThisWeek = tasks.filter(
    (t) => t.status === 'done' && t.completed_at && t.completed_at >= weekAgoStr
  ).length;

  const inbox = tasks.filter((t) => t.status === 'inbox').length;
  const active = tasks.filter((t) => ['up_next', 'in_progress', 'in_review'].includes(t.status)).length;
  const done = tasks.filter((t) => t.status === 'done').length;

  const nowStr = now.toISOString();
  const overdue = tasks.filter(
    (t) => t.deadline && t.deadline < nowStr && t.status !== 'done'
  ).length;

  const focusResult = await db.execute(`
    SELECT * FROM tasks 
    WHERE status != 'done' 
    ORDER BY 
      CASE priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      CASE WHEN deadline IS NOT NULL THEN 0 ELSE 1 END,
      deadline ASC,
      created_at DESC
    LIMIT 5
  `);

  const parsedFocusTasks = (focusResult.rows as any[]).map((t) => ({
    ...t,
    tags: t.tags ? JSON.parse(t.tags) : [],
  }));

  return c.json({
    weekly: { completed: completedThisWeek, active, inbox },
    current: { inbox, active, done, total: tasks.length, overdue },
    focus: parsedFocusTasks,
  });
});
