import { Hono } from 'hono';
import { db } from '../db/index.js';

export const statsRouter = new Hono();

interface TaskRow {
  id: number;
  status: string;
  priority: string;
  deadline: string | null;
  completed_at: string | null;
}

// GET /api/stats - Get dashboard stats
statsRouter.get('/', (c) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString();

  // Get all tasks for calculations
  const tasks = db.prepare('SELECT id, status, priority, deadline, completed_at FROM tasks').all() as TaskRow[];

  // Weekly stats
  const completedThisWeek = tasks.filter(
    (t) => t.status === 'done' && t.completed_at && t.completed_at >= weekAgoStr
  ).length;

  // Current counts
  const inbox = tasks.filter((t) => t.status === 'inbox').length;
  const active = tasks.filter((t) => ['up_next', 'in_progress', 'in_review'].includes(t.status)).length;
  const done = tasks.filter((t) => t.status === 'done').length;

  // Overdue tasks (has deadline in the past, not done)
  const nowStr = now.toISOString();
  const overdue = tasks.filter(
    (t) => t.deadline && t.deadline < nowStr && t.status !== 'done'
  ).length;

  // Focus list - top 5 priority tasks (urgent first, then high, excluding done)
  const focusTasks = db.prepare(`
    SELECT * FROM tasks 
    WHERE status != 'done' 
    ORDER BY 
      CASE priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      CASE 
        WHEN deadline IS NOT NULL THEN 0 
        ELSE 1 
      END,
      deadline ASC,
      created_at DESC
    LIMIT 5
  `).all() as Array<TaskRow & { name: string; description: string | null; tags: string | null; board_id: number | null; position: number; created_at: string; updated_at: string }>;

  // Parse tags for focus tasks
  const parsedFocusTasks = focusTasks.map((t) => ({
    ...t,
    tags: t.tags ? JSON.parse(t.tags as string) : [],
  }));

  return c.json({
    weekly: {
      completed: completedThisWeek,
      active,
      inbox,
    },
    current: {
      inbox,
      active,
      done,
      total: tasks.length,
      overdue,
    },
    focus: parsedFocusTasks,
  });
});
