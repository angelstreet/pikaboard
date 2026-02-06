// Demo mode API client - uses mock data from /public/mock/
// All changes are stored in localStorage and reset on page refresh

import type { Board, Task, Activity, DashboardStats, Agent, Skill, ProposalsResponse, AgentStats, AgentLogs, InsightsData, UsageData, SystemStats } from './client';

const STORAGE_KEY = 'pikaboard_demo_data';

interface DemoData {
  boards: Board[];
  tasks: Task[];
  activity: Activity[];
  agents: Agent[];
  nextTaskId: number;
  nextBoardId: number;
  nextActivityId: number;
}

// Load initial mock data
async function loadMockData(): Promise<DemoData> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }

  // Load from mock files
  const [boardsRes, tasksRes, activityRes, agentsRes] = await Promise.all([
    fetch('/pikaboard-sandbox/mock/boards.json'),
    fetch('/pikaboard-sandbox/mock/tasks.json'),
    fetch('/pikaboard-sandbox/mock/activity.json'),
    fetch('/pikaboard-sandbox/mock/agents.json'),
  ]);

  const boards = await boardsRes.json();
  const tasks = await tasksRes.json();
  const activity = await activityRes.json();
  const agentsRaw = await agentsRes.json();

  // Transform agents to full Agent type
  const agents: Agent[] = agentsRaw.map((a: Record<string, unknown>) => ({
    id: a.id,
    name: a.name,
    role: a.role || 'Agent',
    status: a.status || 'idle',
    currentTask: a.currentTask || null,
    currentTaskId: null,
    activeSubAgents: 0,
    pendingApproval: false,
    purpose: a.purpose || null,
    personality: null,
    domain: null,
    boardId: null,
    kpis: { tasksCompleted: Math.floor(Math.random() * 20), tasksActive: Math.floor(Math.random() * 5), uptime: null },
    skills: a.skills || [],
    plugins: a.plugins || [],
    recentActivity: [],
    lastSeen: new Date().toISOString(),
    configPath: '',
  }));

  const data: DemoData = {
    boards,
    tasks,
    activity,
    agents,
    nextTaskId: Math.max(...tasks.map((t: Task) => t.id)) + 1,
    nextBoardId: Math.max(...boards.map((b: Board) => b.id)) + 1,
    nextActivityId: Math.max(...activity.map((a: Activity) => a.id)) + 1,
  };

  saveData(data);
  return data;
}

function saveData(data: DemoData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let dataPromise: Promise<DemoData> | null = null;
function getData(): Promise<DemoData> {
  if (!dataPromise) {
    dataPromise = loadMockData();
  }
  return dataPromise;
}

function addActivity(data: DemoData, type: string, message: string, metadata: Record<string, unknown> = {}) {
  data.activity.unshift({
    id: data.nextActivityId++,
    type,
    message,
    metadata,
    created_at: new Date().toISOString(),
  });
  // Keep only last 100
  data.activity = data.activity.slice(0, 100);
}

// Helper to generate dates for the past week
function getPastWeekDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// Helper to check if a date is a weekend
function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

// Demo API Client
export const demoApi = {
  // Boards
  async getBoards(): Promise<Board[]> {
    const data = await getData();
    return data.boards;
  },

  async getBoard(id: number): Promise<Board> {
    const data = await getData();
    const board = data.boards.find(b => b.id === id);
    if (!board) throw new Error('Board not found');
    return board;
  },

  async createBoard(board: Partial<Board>): Promise<Board> {
    const data = await getData();
    const newBoard: Board = {
      id: data.nextBoardId++,
      name: board.name || 'New Board',
      icon: board.icon || '📋',
      color: board.color || '#3b82f6',
      position: data.boards.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    data.boards.push(newBoard);
    addActivity(data, 'board_created', `Board '${newBoard.name}' created`);
    saveData(data);
    return newBoard;
  },

  async updateBoard(id: number, updates: Partial<Board>): Promise<Board> {
    const data = await getData();
    const idx = data.boards.findIndex(b => b.id === id);
    if (idx === -1) throw new Error('Board not found');
    data.boards[idx] = { ...data.boards[idx], ...updates, updated_at: new Date().toISOString() };
    saveData(data);
    return data.boards[idx];
  },

  async deleteBoard(id: number): Promise<void> {
    const data = await getData();
    const board = data.boards.find(b => b.id === id);
    data.boards = data.boards.filter(b => b.id !== id);
    // Move tasks to first board
    const firstBoardId = data.boards[0]?.id;
    data.tasks = data.tasks.map(t => t.board_id === id ? { ...t, board_id: firstBoardId } : t);
    if (board) addActivity(data, 'board_deleted', `Board '${board.name}' deleted`);
    saveData(data);
  },

  // Tasks
  async getTasks(params?: { status?: string; priority?: string; board_id?: number }): Promise<Task[]> {
    const data = await getData();
    let tasks = data.tasks;
    if (params?.status) tasks = tasks.filter(t => t.status === params.status);
    if (params?.priority) tasks = tasks.filter(t => t.priority === params.priority);
    if (params?.board_id) tasks = tasks.filter(t => t.board_id === params.board_id);
    return tasks;
  },

  async getTask(id: number): Promise<Task> {
    const data = await getData();
    const task = data.tasks.find(t => t.id === id);
    if (!task) throw new Error('Task not found');
    return task;
  },

  async createTask(task: Partial<Task>): Promise<Task> {
    const data = await getData();
    const newTask: Task = {
      id: data.nextTaskId++,
      name: task.name || 'New Task',
      description: task.description || null,
      status: task.status || 'inbox',
      priority: task.priority || 'medium',
      tags: task.tags || [],
      board_id: task.board_id || data.boards[0]?.id || 1,
      position: 0,
      deadline: task.deadline || null,
      rating: null,
      rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };
    data.tasks.unshift(newTask);
    addActivity(data, 'task_created', `Task '${newTask.name}' created`, { taskId: newTask.id, boardId: newTask.board_id });
    saveData(data);
    return newTask;
  },

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    const data = await getData();
    const idx = data.tasks.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Task not found');
    const oldTask = data.tasks[idx];
    const newTask = { ...oldTask, ...updates, updated_at: new Date().toISOString() };

    // Track completion
    if (updates.status === 'done' && oldTask.status !== 'done') {
      newTask.completed_at = new Date().toISOString();
      addActivity(data, 'task_completed', `Task '${newTask.name}' completed`, { taskId: id });
    } else if (updates.status && updates.status !== oldTask.status) {
      addActivity(data, 'task_updated', `Task '${newTask.name}' moved to ${updates.status}`, { taskId: id, changes: ['status'] });
    }

    data.tasks[idx] = newTask;
    saveData(data);
    return newTask;
  },

  async deleteTask(id: number): Promise<void> {
    const data = await getData();
    const task = data.tasks.find(t => t.id === id);
    data.tasks = data.tasks.filter(t => t.id !== id);
    if (task) addActivity(data, 'task_deleted', `Task '${task.name}' deleted`, { taskId: id });
    saveData(data);
  },

  // Activity
  async getActivity(params?: { limit?: number }): Promise<Activity[]> {
    const data = await getData();
    const limit = params?.limit || 50;
    return data.activity.slice(0, limit);
  },

  // Stats
  async getStats(): Promise<DashboardStats> {
    const data = await getData();
    const tasks = data.tasks;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const completedThisWeek = tasks.filter(t => t.completed_at && new Date(t.completed_at) >= weekAgo).length;
    const inbox = tasks.filter(t => t.status === 'inbox').length;
    const active = tasks.filter(t => ['in_progress', 'in_review', 'up_next'].includes(t.status)).length;
    const done = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== 'done').length;

    // Focus: urgent + high priority not done
    const focus = tasks
      .filter(t => t.status !== 'done' && (t.priority === 'urgent' || t.priority === 'high'))
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 5);

    return {
      weekly: { completed: completedThisWeek, active, inbox },
      current: { inbox, active, done, total: tasks.length, overdue },
      focus,
    };
  },

  // Insights - Mock analytics data matching the InsightsData interface
  async getInsights(): Promise<InsightsData> {
    const data = await getData();
    const tasks = data.tasks;
    const dates = getPastWeekDates();
    const now = new Date();

    // Calculate summary stats
    const totalTasks = tasks.length;
    const totalCompleted = tasks.filter(t => t.status === 'done').length;

    // Today's completions
    const todayStr = now.toISOString().split('T')[0];
    const completedToday = tasks.filter(t => {
      if (!t.completed_at) return false;
      return t.completed_at.startsWith(todayStr);
    }).length;

    // This week's completions
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const completedThisWeek = tasks.filter(t => t.completed_at && new Date(t.completed_at) >= weekAgo).length;

    // This month's completions
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const completedThisMonth = tasks.filter(t => t.completed_at && new Date(t.completed_at) >= monthAgo).length;

    // Daily completions (past 7 days)
    const dailyCompletions = dates.map(date => {
      const count = tasks.filter(t => {
        if (!t.completed_at) return false;
        return t.completed_at.startsWith(date);
      }).length;
      return { date, count: count || Math.floor(Math.random() * 4) + 1 }; // Add some fake data if empty
    });

    // Weekly completions (past 4 weeks)
    const weeklyCompletions = [
      { week: 'Week 1', count: 12 },
      { week: 'Week 2', count: 15 },
      { week: 'Week 3', count: 10 },
      { week: 'Week 4', count: completedThisWeek || 18 },
    ];

    // Monthly completions
    const monthlyCompletions = [
      { month: 'Nov', count: 45 },
      { month: 'Dec', count: 52 },
      { month: 'Jan', count: 38 },
      { count: completedThisMonth || 41, month: 'Feb' },
    ];

    // Priority distribution
    const priorityDistribution = {
      urgent: tasks.filter(t => t.priority === 'urgent').length,
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length,
    };

    // Status distribution
    const statusDistribution = {
      inbox: tasks.filter(t => t.status === 'inbox').length,
      up_next: tasks.filter(t => t.status === 'up_next').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      in_review: tasks.filter(t => t.status === 'in_review').length,
      done: tasks.filter(t => t.status === 'done').length,
    };

    // Agent stats - mock data for demo
    const agents: InsightsData['agents'] = {
      pika: { actions: 47, lastActive: new Date().toISOString(), avgRating: 4.5, ratedTasks: 12 },
      bulbi: { actions: 38, lastActive: new Date(Date.now() - 3600000).toISOString(), avgRating: 4.2, ratedTasks: 8 },
      mew: { actions: 25, lastActive: new Date(Date.now() - 7200000).toISOString(), avgRating: 4.8, ratedTasks: 6 },
    };

    // Activity by type
    const activityByType = {
      task_created: 24,
      task_completed: 18,
      task_updated: 32,
      task_moved: 15,
      comment_added: 8,
    };

    // Activity trend (mock)
    const activityTrend = dates.map(date => ({
      date,
      count: Math.floor(Math.random() * 10) + 5,
    }));

    return {
      summary: {
        completedToday,
        completedThisWeek,
        completedThisMonth,
        totalTasks,
        totalCompleted,
        avgCompletionHours: 28.5,
        currentStreak: 5,
      },
      completions: {
        daily: dailyCompletions,
        weekly: weeklyCompletions,
        monthly: monthlyCompletions,
      },
      distributions: {
        priority: priorityDistribution,
        status: statusDistribution,
      },
      agents,
      activityByType,
      activityTrend,
    };
  },

  // Agents
  async getAgents(): Promise<Agent[]> {
    const data = await getData();
    return data.agents;
  },

  async getAgent(id: string): Promise<Agent> {
    const data = await getData();
    const agent = data.agents.find(a => a.id === id);
    if (!agent) throw new Error('Agent not found');
    return agent;
  },

  async getAgentStats(_id: string): Promise<AgentStats> {
    return {
      agentId: _id,
      createdAt: '2026-01-15T10:00:00Z',
      lastActiveAt: new Date().toISOString(),
      tokens: { total: 125000, input: 45000, output: 80000, cacheRead: 0, cacheWrite: 0 },
      sessions: { count: 47, totalDurationMs: 3600000, totalDurationFormatted: '1h 0m' },
    };
  },

  async getAgentLogs(id: string): Promise<AgentLogs> {
    return {
      agentId: id,
      logs: [
        { timestamp: new Date().toISOString(), time: '14:30', summary: 'Completed task review', type: 'message' },
        { timestamp: new Date().toISOString(), time: '14:25', summary: 'Running build process', type: 'tool' },
        { timestamp: new Date().toISOString(), time: '14:20', summary: 'Started work session', type: 'system' },
      ],
      count: 3,
    };
  },

  // Skills
  async getSkills(): Promise<{ skills: Skill[] }> {
    return {
      skills: [
        { name: 'github', path: '/skills/github', hasReadme: true, hasSkillMd: true, description: 'GitHub integration' },
        { name: 'coding-agent', path: '/skills/coding-agent', hasReadme: true, hasSkillMd: true, description: 'Code with AI assistance' },
        { name: 'weather', path: '/skills/weather', hasReadme: true, hasSkillMd: true, description: 'Weather forecasts' },
      ],
    };
  },

  // Proposals
  async getProposals(): Promise<ProposalsResponse> {
    return {
      proposals: [
        { agentId: 'bulbi', items: [{ name: 'Add unit tests for API', description: 'Improve test coverage to 80%' }] },
        { agentId: 'mew', items: [{ name: 'Research competitor features', description: 'Analyze top 5 alternatives' }] },
      ],
      updatedAt: new Date().toISOString(),
    };
  },

  async approveProposal(_agentId: string, _index: number, options?: { boardId?: number; comment?: string }): Promise<{ success: boolean; task: Task; message: string }> {
    const task = await this.createTask({ name: 'Approved proposal task', status: 'inbox', board_id: options?.boardId });
    return { success: true, task, message: 'Proposal approved and task created' };
  },

  async rejectProposal(_agentId: string, _index: number, _comment?: string): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Proposal rejected' };
  },

  async rejectAllProposals(_agentId: string, _comment?: string): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'All proposals rejected' };
  },

  // Files
  async getFiles(path?: string): Promise<{ path: string; parent: string; entries: Array<{ name: string; path: string; type: 'file' | 'directory'; size?: number; modified?: string }> }> {
    return {
      path: path || '/',
      parent: path ? path.split('/').slice(0, -1).join('/') || '/' : '/',
      entries: [
        { name: 'projects', path: '/projects', type: 'directory' },
        { name: 'skills', path: '/skills', type: 'directory' },
        { name: 'README.md', path: '/README.md', type: 'file', size: 1024, modified: new Date().toISOString() },
      ],
    };
  },

  async getFileContent(path: string): Promise<{ path: string; name: string; content: string }> {
    return {
      path,
      name: path.split('/').pop() || 'file',
      content: '# Mock Content\n\nThis is demo mode - file content is not available.',
    };
  },

  async getFileRoots(): Promise<{ roots: Array<{ path: string; label: string; exists: boolean }> }> {
    return {
      roots: [
        { path: '/workspace', label: 'Workspace', exists: true },
        { path: '/skills', label: 'Skills', exists: true },
      ],
    };
  },

  // System Stats
  async getSystemStats(): Promise<SystemStats> {
    return {
      cpu: {
        model: 'AMD EPYC 7352',
        cores: 4,
        usagePercent: 25.5,
        loadAvg: [0.5, 0.6, 0.4],
      },
      memory: {
        total: 8589934592,
        used: 4294967296,
        free: 4294967296,
        usagePercent: 50.0,
      },
      disk: [
        {
          filesystem: '/dev/sda1',
          size: '100G',
          used: '45G',
          available: '55G',
          usePercent: 45,
          mountpoint: '/',
        },
      ],
      gateway: {
        status: 'online',
        url: 'http://localhost:18789',
      },
      uptime: 86400,
      hostname: 'demo-sandbox',
      platform: 'linux',
      timestamp: new Date().toISOString(),
    };
  },

  // Usage - ENHANCED: Realistic mock data matching UsageData interface
  async getUsage(_period?: string): Promise<UsageData> {
    const dates = getPastWeekDates();

    // Generate daily data with weekday vs weekend pattern
    // Weekdays: higher usage ($8-15), Weekends: lower usage ($4-7)
    const dailyData = dates.map(date => {
      const isWknd = isWeekend(date);
      // Higher usage on weekdays
      const baseCost = isWknd ? 5.0 : 9.0;
      const variance = isWknd ? 3.0 : 6.0;
      const cost = parseFloat((baseCost + Math.random() * variance).toFixed(2));

      // Token count correlates with cost (~15k tokens per $1)
      const tokens = Math.round(cost * 15000 + Math.random() * 50000);

      return { date, cost, tokens };
    });

    // Calculate totals (~$50/week)
    const totalCost = parseFloat(dailyData.reduce((sum, d) => sum + d.cost, 0).toFixed(2));
    const totalTokens = dailyData.reduce((sum, d) => sum + d.tokens, 0);

    // Model split: 70% Opus, 30% Kimi
    const opusCost = parseFloat((totalCost * 0.70).toFixed(2));
    const kimiCost = parseFloat((totalCost * 0.30).toFixed(2));
    const opusTokens = Math.round(totalTokens * 0.65); // Opus has higher cost per token
    const kimiTokens = Math.round(totalTokens * 0.35);

    // Agent breakdown: Pika 40%, Bulbi 35%, Mew 25%
    const pikaCost = parseFloat((totalCost * 0.40).toFixed(2));
    const bulbiCost = parseFloat((totalCost * 0.35).toFixed(2));
    const mewCost = parseFloat((totalCost * 0.25).toFixed(2));

    return {
      period: _period || 'week',
      summary: {
        total: totalCost,
        byModel: {
          'claude-opus-4-5': opusCost,
          'kimi-k2.5': kimiCost,
        },
        tokens: totalTokens,
      },
      daily: dailyData.map(d => ({
        date: d.date,
        cost: d.cost,
        tokens: d.tokens,
        byModel: {
          'claude-opus-4-5': parseFloat((d.cost * 0.70).toFixed(2)),
          'kimi-k2.5': parseFloat((d.cost * 0.30).toFixed(2)),
        },
      })),
      byModel: {
        'claude-opus-4-5': {
          cost: opusCost,
          tokens: opusTokens,
          inputTokens: Math.round(opusTokens * 0.4),
          outputTokens: Math.round(opusTokens * 0.6),
          name: 'Claude Opus 4.5',
        },
        'kimi-k2.5': {
          cost: kimiCost,
          tokens: kimiTokens,
          inputTokens: Math.round(kimiTokens * 0.45),
          outputTokens: Math.round(kimiTokens * 0.55),
          name: 'Kimi K2.5',
        },
      },
      byAgent: {
        pika: { cost: pikaCost, tokens: Math.round(totalTokens * 0.42) },
        bulbi: { cost: bulbiCost, tokens: Math.round(totalTokens * 0.33) },
        mew: { cost: mewCost, tokens: Math.round(totalTokens * 0.25) },
      },
      byBoard: {
        '1': { cost: pikaCost * 0.6, tokens: Math.round(totalTokens * 0.25), boardId: 1, name: 'Main Board' },
        '2': { cost: bulbiCost * 0.8, tokens: Math.round(totalTokens * 0.20), boardId: 2, name: 'Development' },
        '3': { cost: mewCost, tokens: Math.round(totalTokens * 0.15), boardId: 3, name: 'Research' },
        'null': { cost: totalCost * 0.15, tokens: Math.round(totalTokens * 0.15), boardId: null, name: 'Unassigned' },
      },
      total: {
        cost: totalCost,
        tokens: totalTokens,
        sessions: 47,
      },
      savings: {
        amount: 12.50,
        percentage: 20,
      },
      pricing: {
        opus: { input: 15.0, output: 75.0, name: 'Claude Opus 4.5', modelId: 'claude-opus-4-5', provider: 'anthropic' },
        kimi: { input: 1.0, output: 3.0, name: 'Kimi K2.5', modelId: 'kimi-k2.5', provider: 'moonshot' },
      },
    };
  },

  // Health
  async getHealth(): Promise<{ status: string }> {
    return { status: 'ok' };
  },

  // Plugins
  async getPlugins(): Promise<{ plugins: Array<{ name: string; status: string }> }> {
    return {
      plugins: [
        { name: 'slack', status: 'connected' },
        { name: 'whatsapp', status: 'connected' },
        { name: 'telegram', status: 'disconnected' },
      ],
    };
  },

  // Crons
  async getCrons(): Promise<{ crons: Array<{ name: string; schedule: string; lastRun?: string; nextRun?: string }> }> {
    return {
      crons: [
        { name: 'cleanup', schedule: '0 0 * * *', lastRun: new Date(Date.now() - 86400000).toISOString(), nextRun: new Date(Date.now() + 86400000).toISOString() },
        { name: 'sync', schedule: '*/15 * * * *', lastRun: new Date(Date.now() - 900000).toISOString(), nextRun: new Date(Date.now() + 900000).toISOString() },
      ],
    };
  },

  // Reset demo data
  resetData(): void {
    localStorage.removeItem(STORAGE_KEY);
    dataPromise = null;
  },
};
