// API Types
export interface Board {
  id: number;
  name: string;
  icon: string;
  color: string;
  position: number;
  show_testing: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  name: string;
  description: string | null;
  status: 'inbox' | 'up_next' | 'in_progress' | 'testing' | 'in_review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[] | string;
  board_id: number | null;
  position: number;
  deadline: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface DashboardStats {
  weekly: {
    completed: number;
    active: number;
    inbox: number;
  };
  current: {
    inbox: number;
    active: number;
    done: number;
    total: number;
    overdue: number;
  };
  focus: Task[];
}

export interface Activity {
  id: number;
  type: string;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Cron {
  name?: string;
  schedule: string;
  lastRun?: string;
  nextRun?: string;
}

export interface Skill {
  name: string;
  path: string;
  hasReadme: boolean;
  hasSkillMd: boolean;
  description?: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'idle' | 'offline' | 'busy' | 'blocked';
  currentTask: string | null;
  currentTaskId: number | null;
  activeSubAgents: number;
  pendingApproval: boolean;
  purpose: string | null;
  personality: string | null;
  domain: string | null;
  boardId: number | null;
  kpis: {
    tasksCompleted: number;
    tasksActive: number;
    uptime: string | null;
  };
  skills: string[];
  plugins: string[];
  recentActivity: string[];
  lastSeen: string | null;
  configPath: string;
}

export interface AgentStats {
  agentId: string;
  createdAt: string;
  lastActiveAt: string | null;
  tokens: {
    total: number;
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  sessions: {
    count: number;
    totalDurationMs: number;
    totalDurationFormatted: string;
  };
}

export interface AgentLogEntry {
  timestamp: string;
  time: string;
  summary: string;
  fullContent?: string;
  type: 'message' | 'tool' | 'system' | 'error';
}

export interface AgentLogs {
  agentId: string;
  logs: AgentLogEntry[];
  count: number;
}

export interface ProposalItem {
  name: string;
  description?: string;
}

export interface AgentProposals {
  agentId: string;
  items: ProposalItem[];
}

export interface ProposalsResponse {
  proposals: AgentProposals[];
  updatedAt: string;
}

// Token for API requests (auth handled at nginx level for UI)
const getToken = (): string => {
  return 'REDACTED_TOKEN';
};

// API Client
class ApiClient {
  private baseUrl = '/api';

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // Boards
  async getBoards(): Promise<Board[]> {
    const res = await this.fetch<{ boards: Board[] }>('/boards');
    return res.boards;
  }

  async getBoard(id: number): Promise<Board> {
    return this.fetch<Board>(`/boards/${id}`);
  }

  async createBoard(board: Partial<Board>): Promise<Board> {
    return this.fetch<Board>('/boards', {
      method: 'POST',
      body: JSON.stringify(board),
    });
  }

  async updateBoard(id: number, updates: Partial<Board>): Promise<Board> {
    return this.fetch<Board>(`/boards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteBoard(id: number, deleteTasks = false): Promise<void> {
    await this.fetch(`/boards/${id}${deleteTasks ? '?deleteTasks=true' : ''}`, { method: 'DELETE' });
  }

  async getBoardTasks(boardId: number, status?: string): Promise<{ tasks: Task[]; board: Board }> {
    const query = status ? `?status=${status}` : '';
    return this.fetch<{ tasks: Task[]; board: Board }>(`/boards/${boardId}/tasks${query}`);
  }

  // Tasks
  async getTasks(params?: { status?: string; priority?: string; board_id?: number }): Promise<Task[]> {
    const search = new URLSearchParams();
    if (params?.status) search.set('status', params.status);
    if (params?.priority) search.set('priority', params.priority);
    if (params?.board_id) search.set('board_id', String(params.board_id));
    const query = search.toString();
    const res = await this.fetch<{ tasks: Task[] }>(`/tasks${query ? `?${query}` : ''}`);
    return res.tasks;
  }

  async getTask(id: number): Promise<Task> {
    return this.fetch<Task>(`/tasks/${id}`);
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    return this.fetch<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    return this.fetch<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteTask(id: number): Promise<void> {
    await this.fetch(`/tasks/${id}`, { method: 'DELETE' });
  }

  // Activity
  async getActivity(params?: { limit?: number; type?: string }): Promise<Activity[]> {
    const search = new URLSearchParams();
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.type) search.set('type', params.type);
    const query = search.toString();
    const res = await this.fetch<{ activity: Activity[] }>(`/activity${query ? `?${query}` : ''}`);
    return res.activity;
  }

  // Stats
  async getStats(): Promise<DashboardStats> {
    return this.fetch<DashboardStats>('/stats');
  }

  // Crons
  async getCrons(): Promise<Cron[]> {
    const res = await this.fetch<{ crons: Cron[] }>('/crons');
    return res.crons;
  }

  // Skills
  async getSkills(): Promise<Skill[]> {
    const res = await this.fetch<{ skills: Skill[] }>('/skills');
    return res.skills;
  }

  async getSkill(name: string): Promise<Skill & { skillMd?: string; readme?: string; files?: string[] }> {
    return this.fetch(`/skills/${name}`);
  }

  // Agents
  async getAgents(): Promise<Agent[]> {
    const res = await this.fetch<{ agents: Agent[] }>('/agents');
    return res.agents;
  }

  async getAgent(id: string): Promise<{ agent: Agent; soulMd?: string }> {
    return this.fetch(`/agents/${id}`);
  }

  async getAgentStats(id: string): Promise<AgentStats> {
    return this.fetch(`/agents/${id}/stats`);
  }

  async getAgentLogs(id: string, lines = 100): Promise<AgentLogs> {
    return this.fetch(`/agents/${id}/logs?lines=${lines}`);
  }

  // System
  async getSystemStats(): Promise<SystemStats> {
    return this.fetch<SystemStats>('/system');
  }

  // Insights
  async getInsights(): Promise<InsightsData> {
    return this.fetch<InsightsData>('/insights');
  }

  // Usage
  async getUsage(): Promise<UsageData> {
    return this.fetch<UsageData>('/usage');
  }

  // Proposals
  async getProposals(): Promise<ProposalsResponse> {
    return this.fetch<ProposalsResponse>('/proposals');
  }

  async approveProposal(agentId: string, index: number, options?: { boardId?: number; comment?: string }): Promise<{ success: boolean; task: Task; message: string }> {
    return this.fetch(`/proposals/${agentId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ index, boardId: options?.boardId, comment: options?.comment }),
    });
  }

  async rejectProposal(agentId: string, index: number, comment?: string): Promise<{ success: boolean; message: string; comment?: string }> {
    return this.fetch(`/proposals/${agentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ index, comment }),
    });
  }

  async rejectAllProposals(agentId: string, comment?: string): Promise<{ success: boolean; message: string }> {
    return this.fetch(`/proposals/${agentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ all: true, comment }),
    });
  }
}

// Usage
export interface UsageData {
  today: {
    total: number;
    byModel: Record<string, number>;
    tokens: number;
  };
  thisWeek: {
    total: number;
    byModel: Record<string, number>;
    tokens: number;
  };
  thisMonth: {
    total: number;
    byModel: Record<string, number>;
    tokens: number;
  };
  daily: {
    date: string;
    cost: number;
    tokens: number;
    byModel: Record<string, number>;
  }[];
  byModel: Record<string, {
    cost: number;
    tokens: number;
    inputTokens: number;
    outputTokens: number;
    name: string;
  }>;
  total: {
    cost: number;
    tokens: number;
    sessions: number;
  };
  savings: {
    amount: number;
    percentage: number;
  };
  pricing: {
    opus: { input: number; output: number; name: string; modelId: string; provider: string };
    kimi: { input: number; output: number; name: string; modelId: string; provider: string };
  };
}

// Insights
export interface InsightsData {
  summary: {
    completedToday: number;
    completedThisWeek: number;
    completedThisMonth: number;
    totalTasks: number;
    totalCompleted: number;
    avgCompletionHours: number;
    currentStreak: number;
  };
  completions: {
    daily: { date: string; count: number }[];
    weekly: { week: string; count: number }[];
    monthly: { month: string; count: number }[];
  };
  distributions: {
    priority: Record<string, number>;
    status: Record<string, number>;
  };
  agents: Record<string, { actions: number; lastActive: string | null; avgRating: number | null; ratedTasks: number }>;
  activityByType: Record<string, number>;
  activityTrend: { date: string; count: number }[];
}

// System Stats
export interface SystemStats {
  cpu: {
    model: string;
    cores: number;
    usagePercent: number;
    loadAvg: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: Array<{
    filesystem: string;
    size: string;
    used: string;
    available: string;
    usePercent: number;
    mountpoint: string;
  }>;
  gateway: {
    status: 'online' | 'offline' | 'unknown';
    url?: string;
    error?: string;
  };
  uptime: number;
  hostname: string;
  platform: string;
  timestamp: string;
}

export const api = new ApiClient();
