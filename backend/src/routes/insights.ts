import { Hono } from 'hono';
import { db } from '../db/index.js';

export const insightsRouter = new Hono();

interface TaskRow {
  id: number;
  status: string;
  priority: string;
  deadline: string | null;
  completed_at: string | null;
  created_at: string;
  board_id: number | null;
  rating: number | null;
}

interface ActivityRow {
  id: number;
  type: string;
  message: string;
  metadata: string | null;
  created_at: string;
}

// Helper to get date range
function getDateRange(period: 'day' | 'week' | 'month' | 'year'): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  
  switch (period) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }
  
  return { start, end };
}

// GET /api/insights - Get analytics data
insightsRouter.get('/', (c) => {
  const now = new Date();
  
  // Get all tasks
  const tasks = db.prepare(`
    SELECT id, status, priority, deadline, completed_at, created_at, board_id 
    FROM tasks
  `).all() as TaskRow[];
  
  // Get all activity
  const activity = db.prepare(`
    SELECT id, type, message, metadata, created_at 
    FROM activity 
    ORDER BY created_at DESC
  `).all() as ActivityRow[];
  
  // --- Completion Stats by Period ---
  const completedTasks = tasks.filter(t => t.status === 'done' && t.completed_at);
  
  // Daily completions (last 30 days)
  const dailyCompletions: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyCompletions[dateStr] = 0;
  }
  
  completedTasks.forEach(t => {
    if (t.completed_at) {
      const dateStr = t.completed_at.split('T')[0];
      if (Object.prototype.hasOwnProperty.call(dailyCompletions, dateStr)) {
        dailyCompletions[dateStr]++;
      }
    }
  });
  
  // Weekly completions (last 12 weeks)
  const weeklyCompletions: { week: string; count: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i * 7) - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const count = completedTasks.filter(t => {
      if (!t.completed_at) return false;
      const completed = new Date(t.completed_at);
      return completed >= weekStart && completed <= weekEnd;
    }).length;
    
    weeklyCompletions.unshift({ 
      week: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, 
      count 
    });
  }
  
  // Monthly completions (last 12 months)
  const monthlyCompletions: { month: string; count: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    
    const count = completedTasks.filter(t => {
      if (!t.completed_at) return false;
      const completed = new Date(t.completed_at);
      return completed.getMonth() === monthDate.getMonth() && 
             completed.getFullYear() === monthDate.getFullYear();
    }).length;
    
    monthlyCompletions.unshift({
      month: monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      count
    });
  }
  
  // --- Productivity Stats ---
  const dayRange = getDateRange('day');
  const weekRange = getDateRange('week');
  const monthRange = getDateRange('month');
  
  const completedToday = completedTasks.filter(t => 
    t.completed_at && new Date(t.completed_at) >= dayRange.start
  ).length;
  
  const completedThisWeek = completedTasks.filter(t => 
    t.completed_at && new Date(t.completed_at) >= weekRange.start
  ).length;
  
  const completedThisMonth = completedTasks.filter(t => 
    t.completed_at && new Date(t.completed_at) >= monthRange.start
  ).length;
  
  // Average completion time (tasks with both created_at and completed_at)
  const tasksWithTime = completedTasks.filter(t => t.created_at && t.completed_at);
  let avgCompletionHours = 0;
  if (tasksWithTime.length > 0) {
    const totalHours = tasksWithTime.reduce((sum, t) => {
      const created = new Date(t.created_at);
      const completed = new Date(t.completed_at!);
      return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
    }, 0);
    avgCompletionHours = Math.round(totalHours / tasksWithTime.length);
  }
  
  // --- Priority Distribution ---
  const priorityDist = {
    urgent: tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length,
    high: tasks.filter(t => t.priority === 'high' && t.status !== 'done').length,
    medium: tasks.filter(t => t.priority === 'medium' && t.status !== 'done').length,
    low: tasks.filter(t => t.priority === 'low' && t.status !== 'done').length,
  };
  
  // --- Status Distribution ---
  const statusDist = {
    inbox: tasks.filter(t => t.status === 'inbox').length,
    up_next: tasks.filter(t => t.status === 'up_next').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    testing: tasks.filter(t => t.status === 'testing').length,
    in_review: tasks.filter(t => t.status === 'in_review').length,
    done: tasks.filter(t => t.status === 'done').length,
  };
  
  // --- Agent Activity (from activity log) ---
  // Build a map of taskId -> agent who completed it
  const taskCompletedBy: Record<number, string> = {};
  const agentActivity: Record<string, { actions: number; lastActive: string | null; ratings: number[]; ratedTasks: number }> = {};
  
  activity.forEach(a => {
    if (a.metadata) {
      try {
        const meta = JSON.parse(a.metadata);
        if (meta.agent) {
          if (!agentActivity[meta.agent]) {
            agentActivity[meta.agent] = { actions: 0, lastActive: null, ratings: [], ratedTasks: 0 };
          }
          agentActivity[meta.agent].actions++;
          if (!agentActivity[meta.agent].lastActive) {
            agentActivity[meta.agent].lastActive = a.created_at;
          }
        }
        // Track which agent completed each task
        if (a.type === 'task_completed' && meta.agent && meta.taskId) {
          taskCompletedBy[meta.taskId] = meta.agent;
        }
      } catch {
        // Ignore parse errors
      }
    }
  });
  
  // Associate task ratings with the agent who completed them
  tasks.forEach(t => {
    if (t.rating !== null && t.status === 'done' && taskCompletedBy[t.id]) {
      const agent = taskCompletedBy[t.id];
      if (!agentActivity[agent]) {
        agentActivity[agent] = { actions: 0, lastActive: null, ratings: [], ratedTasks: 0 };
      }
      agentActivity[agent].ratings.push(t.rating);
      agentActivity[agent].ratedTasks++;
    }
  });
  
  // Calculate average ratings and format output
  const agentStats: Record<string, { actions: number; lastActive: string | null; avgRating: number | null; ratedTasks: number }> = {};
  Object.entries(agentActivity).forEach(([agent, data]) => {
    const avgRating = data.ratings.length > 0 
      ? Math.round((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) * 10) / 10
      : null;
    agentStats[agent] = {
      actions: data.actions,
      lastActive: data.lastActive,
      avgRating,
      ratedTasks: data.ratedTasks
    };
  });
  
  // --- Activity by Type ---
  const activityByType: Record<string, number> = {};
  activity.forEach(a => {
    activityByType[a.type] = (activityByType[a.type] || 0) + 1;
  });
  
  // --- Activity Trend (last 14 days) ---
  const activityTrend: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const count = activity.filter(a => 
      a.created_at.startsWith(dateStr)
    ).length;
    
    activityTrend.push({
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      count
    });
  }
  
  // --- Streak (consecutive days with completions) ---
  let currentStreak = 0;
  const checkDate = new Date(now);
  checkDate.setHours(0, 0, 0, 0);
  
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const hasCompletion = completedTasks.some(t => 
      t.completed_at && t.completed_at.startsWith(dateStr)
    );
    
    if (hasCompletion) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (currentStreak === 0 && checkDate.toDateString() === now.toDateString()) {
      // Today has no completions yet, check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
    
    // Limit check to prevent infinite loop
    if (currentStreak > 365) break;
  }
  
  return c.json({
    summary: {
      completedToday,
      completedThisWeek,
      completedThisMonth,
      totalTasks: tasks.length,
      totalCompleted: completedTasks.length,
      avgCompletionHours,
      currentStreak,
    },
    completions: {
      daily: Object.entries(dailyCompletions)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      weekly: weeklyCompletions,
      monthly: monthlyCompletions,
    },
    distributions: {
      priority: priorityDist,
      status: statusDist,
    },
    agents: agentStats,
    activityByType,
    activityTrend,
  });
});
