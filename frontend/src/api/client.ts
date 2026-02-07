// API Types
export interface Board {
  id: number;
  name: string;
  icon: string;
  color: string;
  position: number;
  show_testing?: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  name: string;
  description: string | null;
  status: 'inbox' | 'up_next' | 'in_progress' | 'testing' | 'in_review' | 'done' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  board_id: number | null;
  position: number;
  deadline: string | null;
  rating: number | null;
  rejection_reason: string | null;
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

export interface LibraryAgent {
  id: string;
  name: string;
  emoji: string;
  skills: string[];
  plugins: string[];
}

export interface LibrarySkill {
  name: string;
  description?: string;
  version?: string;
  hasSkillMd: boolean;
  usedBy: { id: string; name: string; emoji: string }[];
}

export interface LibraryPlugin {
  name: string;
  enabled: boolean;
  connected?: boolean;
  config?: Record<string, string>;
  usedBy: { id: string; name: string; emoji: string }[];
}

export interface Goal {
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
  task_count?: number;
  done_count?: number;
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
  inProgressTasks: number;
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

export interface Question {
  id: number;
  agent: string;
  type: 'question' | 'approval';
  question: string;
  context: string | null;
  status: 'pending' | 'answered' | 'approved' | 'rejected';
  answer: string | null;
  created_at: string;
  answered_at: string | null;
}

export interface QuestionsResponse {
  questions: Question[];
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
  return localStorage.getItem('pikaboard_token') || '';
};

// Cache with TTL (3 minutes default)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private ttl = 3 * 60 * 1000; // 3 minutes in ms

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
    } else {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    }
  }
}

const apiCache = new ApiCache();

function normalizeBaseUrl(url: string): string {
  // Avoid accidental double slashes when concatenating.
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || '/api');

// API Client
class ApiClient {
  private baseUrl = API_BASE_URL;

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

  // Cached fetch for GET requests (3-min TTL)
  private async cachedFetch<T>(path: string): Promise<T> {
    const cached = apiCache.get<T>(path);
    if (cached) return cached;
    
    const data = await this.fetch<T>(path);
    apiCache.set(path, data);
    return data;
  }

  // Synchronous cache read for initializing component state without loading flash
  getCached<T>(path: string): T | null {
    return apiCache.get<T>(path);
  }

  // Invalidate cache after mutations
  private invalidateCache(pattern?: string): void {
    apiCache.invalidate(pattern);
  }

  // Boards
  async getBoards(): Promise<Board[]> {
    const res = await this.cachedFetch<{ boards: Board[] }>('/boards');
    return res.boards;
  }

  async getBoard(id: number): Promise<Board> {
    return this.fetch<Board>(`/boards/${id}`);
  }

  async createBoard(board: Partial<Board>): Promise<Board> {
    const result = await this.fetch<Board>('/boards', {
      method: 'POST',
      body: JSON.stringify(board),
    });
    this.invalidateCache('boards');
    return result;
  }

  async updateBoard(id: number, updates: Partial<Board>): Promise<Board> {
    const result = await this.fetch<Board>(`/boards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    this.invalidateCache('boards');
    return result;
  }

  async deleteBoard(id: number, deleteTasks = false): Promise<void> {
    await this.fetch(`/boards/${id}${deleteTasks ? '?deleteTasks=true' : ''}`, { method: 'DELETE' });
    this.invalidateCache('boards');
    this.invalidateCache('tasks');
  }

  async getBoardTasks(boardId: number, status?: string): Promise<{ tasks: Task[]; board: Board }> {
    const query = status ? `?status=${status}` : '';
    return this.fetch<{ tasks: Task[]; board: Board }>(`/boards/${boardId}/tasks${query}`);
  }

  // Tasks
  async getTasks(params?: { status?: string; priority?: string; board_id?: number; search?: string; tag?: string }): Promise<(Task & { board_name?: string })[]> {
    const search = new URLSearchParams();
    if (params?.status) search.set('status', params.status);
    if (params?.priority) search.set('priority', params.priority);
    if (params?.board_id) search.set('board_id', String(params.board_id));
    if (params?.search) search.set('search', params.search);
    if (params?.tag) search.set('tag', params.tag);
    const query = search.toString();
    const res = await this.cachedFetch<{ tasks: (Task & { board_name?: string })[] }>(`/tasks${query ? `?${query}` : ''}`);
    return res.tasks;
  }

  async getTask(id: number): Promise<Task> {
    return this.fetch<Task>(`/tasks/${id}`);
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    const result = await this.fetch<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
    this.invalidateCache('tasks');
    this.invalidateCache('stats');
    return result;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    const result = await this.fetch<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    this.invalidateCache('tasks');
    this.invalidateCache('stats');
    return result;
  }

  async deleteTask(id: number): Promise<void> {
    await this.fetch(`/tasks/${id}`, { method: 'DELETE' });
    this.invalidateCache('tasks');
    this.invalidateCache('stats');
  }

  // Activity
  async getActivity(params?: { limit?: number; type?: string }): Promise<Activity[]> {
    const search = new URLSearchParams();
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.type) search.set('type', params.type);
    const query = search.toString();
    const res = await this.cachedFetch<{ activity: Activity[] }>(`/activity${query ? `?${query}` : ''}`);
    return res.activity;
  }

  // Stats
  async getStats(): Promise<DashboardStats> {
    return this.cachedFetch<DashboardStats>('/stats');
  }

  // Crons
  async getCrons(): Promise<Cron[]> {
    const res = await this.cachedFetch<{ crons: Cron[] }>('/crons');
    return res.crons;
  }

  // Skills
  async getSkills(): Promise<Skill[]> {
    const res = await this.cachedFetch<{ skills: Skill[] }>('/skills');
    return res.skills;
  }

  async getSkill(name: string): Promise<Skill & { skillMd?: string; readme?: string; files?: string[] }> {
    return this.fetch(`/skills/${name}`);
  }

  // Library
  async getLibrarySkills(): Promise<{ skills: LibrarySkill[]; agents: LibraryAgent[] }> {
    return this.cachedFetch('/library/skills');
  }

  async getLibraryPlugins(): Promise<{ plugins: LibraryPlugin[]; agents: LibraryAgent[] }> {
    return this.cachedFetch('/library/plugins');
  }

  // Agents
  async getAgents(): Promise<Agent[]> {
    const res = await this.cachedFetch<{ agents: Agent[] }>('/agents');
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
    return this.cachedFetch<SystemStats>('/system');
  }

  async getSystemHealth(): Promise<SystemHealth> {
    return this.cachedFetch<SystemHealth>('/system/health');
  }

  async getSessionContext(): Promise<SessionContextInfo> {
    return this.cachedFetch<SessionContextInfo>('/system/session-context');
  }

  // Config
  async getConfig(): Promise<WorkspaceConfig> {
    return this.cachedFetch<WorkspaceConfig>('/config');
  }

  // Insights
  async getInsights(): Promise<InsightsData> {
    return this.cachedFetch<InsightsData>('/insights');
  }

  // Usage
  async getUsage(period?: string): Promise<UsageData> {
    const query = period ? `?period=${period}` : '';
    return this.cachedFetch<UsageData>(`/usage${query}`);
  }

  async getUsageSummary(): Promise<UsageSummary> {
    return this.cachedFetch<UsageSummary>('/usage/summary');
  }

  // Proposals
  async getProposals(): Promise<ProposalsResponse> {
    return this.cachedFetch<ProposalsResponse>('/proposals');
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

  // Questions
  async getQuestions(status?: 'pending' | 'answered' | 'approved' | 'rejected', type?: 'question' | 'approval'): Promise<Question[]> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    const query = params.toString();
    const res = await this.cachedFetch<QuestionsResponse>(`/questions${query ? `?${query}` : ''}`);
    return res.questions;
  }

  async answerQuestion(id: number, answer: string): Promise<{ success: boolean; question: Question; message: string }> {
    return this.fetch(`/questions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ answer }),
    });
  }

  async approveQuestion(id: number, comment?: string): Promise<{ success: boolean; question: Question; message: string }> {
    return this.fetch(`/questions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  }

  async rejectQuestion(id: number, comment?: string): Promise<{ success: boolean; question: Question; message: string }> {
    return this.fetch(`/questions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  }

  async submitQuestion(agent: string, question: string, context?: string, type?: 'question' | 'approval'): Promise<{ success: boolean; question: Question; message: string }> {
    return this.fetch('/questions', {
      method: 'POST',
      body: JSON.stringify({ agent, question, context, type }),
    });
  }

  // Files
  async getFileRoots(): Promise<{ roots: FileRoot[] }> {
    return this.cachedFetch('/files/roots');
  }

  async getFileList(path: string): Promise<{ path: string; parent: string; entries: FileEntry[] }> {
    return this.cachedFetch(`/files?path=${encodeURIComponent(path)}`);
  }

  async getFileContent(path: string): Promise<{ path: string; name: string; content: string }> {
    return this.cachedFetch(`/files/content?path=${encodeURIComponent(path)}`);
  }

  // Goals
  async getGoals(): Promise<{ goals: Goal[] }> {
    return this.cachedFetch<{ goals: Goal[] }>('/goals');
  }

  async getGoal(id: number): Promise<Goal> {
    return this.fetch<Goal>(`/goals/${id}`);
  }

  async createGoal(goal: Partial<Goal>): Promise<Goal> {
    return this.fetch<Goal>('/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
  }

  async updateGoal(id: number, updates: Partial<Goal>): Promise<Goal> {
    return this.fetch<Goal>(`/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteGoal(id: number): Promise<void> {
    await this.fetch(`/goals/${id}`, { method: 'DELETE' });
  }
}

// Usage
export interface UsageData {
  summary: {
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
  byAgent: Record<string, {
    cost: number;
    tokens: number;
  }>;
  byBoard: Record<string, {
    cost: number;
    tokens: number;
    boardId: number | null;
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
  period: string;
}

// Usage Summary (for header)
export interface UsageSummary {
  daily: {
    anthropic: number;
    kimi: number;
    total: number;
  };
  monthly: {
    anthropic: number;
    kimi: number;
    total: number;
  };
  updatedAt: string;
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

// File Browser
export interface FileRoot {
  path: string;
  label: string;
  exists: boolean;
}

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
}

// Workspace Config
export interface WorkspaceConfig {
  workspace: { path: string; exists: boolean };
  api: { baseUrl: string; tokenMasked: string };
  gateway: { url: string };
  environment: { nodeEnv: string; platform: string; hostname: string; user: string };
  pikaboard: { version: string; port: number };
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

// Session Context Info
export interface SessionContextInfo {
  currentTokens: number;
  contextTokens: number;
  percentUsed: number;
  model: string | null;
  updatedAt: number | null;
  error?: string;
}

// System Health (from /proc/stat and /proc/meminfo)
export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  alerts?: string[];
  cpu: {
    model: string;
    cores: number;
    usagePercent: number;
    loadAvg: number[];
    procStat?: {
      user: number;
      nice: number;
      system: number;
      idle: number;
      iowait: number;
      irq: number;
      softirq: number;
      steal: number;
      total: number;
    };
  };
  memory: {
    total: number;
    used: number;
    free: number;
    available: number;
    buffers: number;
    cached: number;
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
  uptime: number;
  hostname: string;
  platform: string;
  timestamp: string;
}

export const api = new ApiClient();
