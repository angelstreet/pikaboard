import { Hono } from 'hono';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { db } from '../db/index.js';

export const usageRouter = new Hono();

// Pricing per 1M tokens
const PRICING: Record<string, { input: number; output: number; name: string; modelId: string; provider: string }> = {
  'opus-4-6': {
    input: 15.0,
    output: 75.0,
    name: 'Opus 4.6',
    modelId: 'claude-opus-4-6',
    provider: 'anthropic',
  },
  opus: {
    input: 15.0,
    output: 75.0,
    name: 'Opus 4.5',
    modelId: 'claude-opus-4-5',
    provider: 'anthropic',
  },
  kimi: {
    input: 0.45,
    output: 2.50,
    name: 'Kimi K2.5',
    modelId: 'moonshotai/kimi-k2.5',
    provider: 'openrouter',
  },
};

// Load runs.json mapping to get agent names for sessions
function loadRunsMapping(): Map<string, string> {
  const runsPath = join(homedir(), '.openclaw', 'subagents', 'runs.json');
  const map = new Map<string, string>();
  try {
    const data = JSON.parse(readFileSync(runsPath, 'utf-8'));
    for (const run of Object.values(data.runs || {})) {
      // childSessionKey contains session ID, label has agent prefix
      const sessionId = (run as any).childSessionKey?.split(':').pop();
      const label = (run as any).label || '';
      const agentPrefix = label.split('-')[0]; // bulbi-142-toasts → bulbi
      if (sessionId && agentPrefix) {
        map.set(sessionId, agentPrefix);
      }
    }
  } catch {
    // Ignore errors - runs.json might not exist
  }
  return map;
}

// Extract agent name from session file content
// Looks for patterns like "[cron:... agent-name] You are AgentName" or "You are AgentName"
function extractAgentFromContent(filePath: string): string | null {
  try {
    // Read first few lines of the file
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').slice(0, 50); // Check first 50 lines

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        // Look for user messages with agent identity
        if (entry.type === 'message' && entry.message?.role === 'user' && entry.message?.content) {
          let text = '';
          if (typeof entry.message.content === 'string') {
            text = entry.message.content;
          } else if (Array.isArray(entry.message.content)) {
            for (const item of entry.message.content) {
              if (typeof item === 'object' && item !== null && 'text' in item && typeof item.text === 'string') {
                text = item.text;
                break;
              }
            }
          }

          // Pattern 1: [cron:... agent-name] You are AgentName
          const cronMatch = text.match(/\[cron:[^\]]+\s+([a-z]+)-heartbeat\]/i);
          if (cronMatch) {
            return cronMatch[1].charAt(0).toUpperCase() + cronMatch[1].slice(1).toLowerCase();
          }

          // Pattern 2: You are AgentName, ...
          const youAreMatch = text.match(/You are ([A-Z][a-z]+)(?:,| specialist| agent)/);
          if (youAreMatch) {
            return youAreMatch[1];
          }
        }
      } catch {
        continue;
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

interface TokenUsage {
  date: string;
  model: string;
  modelFull: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  agent?: string;
  boardId?: number | null;
}

interface SessionEntry {
  type: string;
  timestamp: string;
  message?: {
    role?: string;
    content?: unknown;
    usage?: {
      input?: number;
      output?: number;
      totalTokens?: number;
      cost?: {
        total?: number;
      };
    };
    model?: string;
    provider?: string;
  };
  modelId?: string;
  provider?: string;
  label?: string;
  customType?: string;
  data?: unknown;
}

// Extract board_id from session content (looking for patterns like "board_id: 1" or "board_id:1")
function extractBoardId(content: string): number | null {
  // Look for board_id pattern in the content
  const patterns = [
    /board_id[:\s]+(\d+)/i,
    /board_id[=:]\s*(\d+)/i,
    /"board_id"[:\s]+(\d+)/i,
    /board\s*[=:]\s*(\d+)/i,
    /\(board_id:\s*(\d+)\)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const id = parseInt(match[1], 10);
      if (!isNaN(id) && id > 0) {
        return id;
      }
    }
  }

  return null;
}

// Determine model type from entry
function getModelType(entry: SessionEntry): string {
  const model = entry.message?.model || entry.modelId || '';
  const provider = entry.message?.provider || entry.provider || '';

  if (model.includes('opus-4-6') || model.includes('opus-4.6')) {
    return 'opus-4-6';
  }
  if (model.includes('claude-opus') || model.includes('opus')) {
    return 'opus';
  }
  if (model.includes('kimi') || model.includes('moonshotai')) {
    return 'kimi';
  }
  if (provider === 'anthropic') {
    return 'opus-4-6'; // Default anthropic model is now 4.6
  }
  if (provider === 'openrouter') {
    if (entry.modelId?.includes('kimi') || entry.modelId?.includes('moonshotai')) {
      return 'kimi';
    }
  }

  return 'unknown';
}

// Calculate cost from tokens
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model] || PRICING.kimi; // fallback to cheapest
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

// Parse a single session file
function parseSessionFile(filePath: string, runsMapping: Map<string, string>): TokenUsage[] {
  const usages: TokenUsage[] = [];
  let sessionBoardId: number | null = null;

  // Extract session ID from filename for agent lookup
  const sessionId = filePath.split('/').pop()?.replace('.jsonl', '') || '';
  let agentName = runsMapping.get(sessionId);
  
  // If not found in runs.json, try to extract from session content
  if (!agentName) {
    const contentAgent = extractAgentFromContent(filePath);
    agentName = contentAgent || 'Pika';
  } else {
    // Capitalize the agent name from runs.json
    agentName = agentName.charAt(0).toUpperCase() + agentName.slice(1).toLowerCase();
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    for (const line of lines) {
      try {
        const entry: SessionEntry = JSON.parse(line);

        // Try to extract board_id from user messages or labels
        if (entry.type === 'message' && entry.message?.role === 'user' && entry.message.content) {
          if (typeof entry.message.content === 'string') {
            const extracted = extractBoardId(entry.message.content);
            if (extracted) sessionBoardId = extracted;
          } else if (Array.isArray(entry.message.content)) {
            for (const item of entry.message.content) {
              if (typeof item === 'object' && item !== null && 'text' in item && typeof item.text === 'string') {
                const extracted = extractBoardId(item.text);
                if (extracted) sessionBoardId = extracted;
              }
            }
          }
        }

        // Also check labels/custom data for board info
        if (entry.label) {
          const extracted = extractBoardId(entry.label);
          if (extracted) sessionBoardId = extracted;
        }

        // Only process assistant messages with usage data
        if (
          entry.type === 'message' &&
          entry.message?.role === 'assistant' &&
          entry.message?.usage &&
          (entry.message.usage.input || entry.message.usage.output)
        ) {
          const modelType = getModelType(entry);
          if (modelType === 'unknown') continue;

          const inputTokens = entry.message.usage.input || 0;
          const outputTokens = entry.message.usage.output || 0;
          const totalTokens = entry.message.usage.totalTokens || inputTokens + outputTokens;

          // Use cost from session if available, otherwise calculate
          let cost = entry.message.usage.cost?.total || 0;
          if (cost === 0) {
            cost = calculateCost(modelType, inputTokens, outputTokens);
          }

          const date = entry.timestamp.split('T')[0];

          usages.push({
            date,
            model: modelType,
            modelFull: entry.message.model || PRICING[modelType].modelId,
            inputTokens,
            outputTokens,
            totalTokens,
            cost,
            agent: agentName,
            boardId: sessionBoardId,
          });
        }
      } catch {
        // Skip malformed lines
        continue;
      }
    }
  } catch {
    // Skip unreadable files
  }

  return usages;
}

// Get all session files from all agents
function getAllSessionFiles(): string[] {
  const files: string[] = [];
  const agentsDir = join(homedir(), '.openclaw', 'agents');

  try {
    const agents = readdirSync(agentsDir);

    for (const agent of agents) {
      const sessionsDir = join(agentsDir, agent, 'sessions');
      try {
        const sessions = readdirSync(sessionsDir);
        for (const session of sessions) {
          if (session.endsWith('.jsonl')) {
            files.push(join(sessionsDir, session));
          }
        }
      } catch {
        // Skip agents without sessions
      }
    }
  } catch {
    // Return empty if agents dir doesn't exist
  }

  return files;
}

// Get date range based on period
function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = now;
  let start = new Date();

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
    default:
      start = new Date(0); // all time
  }

  return { start, end };
}

// Aggregate usage data
function aggregateUsage(usages: TokenUsage[], period: string): {
  summary: { total: number; byModel: Record<string, number>; tokens: number };
  daily: { date: string; cost: number; tokens: number; byModel: Record<string, number> }[];
  byModel: Record<string, { cost: number; tokens: number; inputTokens: number; outputTokens: number; name: string }>;
  byAgent: Record<string, { cost: number; tokens: number }>;
  byBoard: Record<string, { cost: number; tokens: number; boardId: number | null }>;
  total: { cost: number; tokens: number; sessions: number };
  savings: { amount: number; percentage: number };
} {
  const now = new Date();

  // Initialize result
  const result = {
    summary: { total: 0, byModel: {} as Record<string, number>, tokens: 0 },
    daily: [] as { date: string; cost: number; tokens: number; byModel: Record<string, number> }[],
    byModel: {} as Record<string, { cost: number; tokens: number; inputTokens: number; outputTokens: number; name: string }>,
    byAgent: {} as Record<string, { cost: number; tokens: number }>,
    byBoard: {} as Record<string, { cost: number; tokens: number; boardId: number | null }>,
    total: { cost: 0, tokens: 0, sessions: usages.length },
    savings: { amount: 0, percentage: 0 },
  };

  // Group by date for daily aggregation
  const dailyMap: Record<string, { cost: number; tokens: number; byModel: Record<string, number> }> = {};

  for (const usage of usages) {
    // Total
    result.total.cost += usage.cost;
    result.total.tokens += usage.totalTokens;

    // Summary (same as total for filtered view)
    result.summary.total += usage.cost;
    result.summary.tokens += usage.totalTokens;
    result.summary.byModel[usage.model] = (result.summary.byModel[usage.model] || 0) + usage.cost;

    // By model
    if (!result.byModel[usage.model]) {
      result.byModel[usage.model] = {
        cost: 0,
        tokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        name: (usage.model === 'opus' || usage.model === 'kimi') ? PRICING[usage.model].name : usage.model,
      };
    }
    result.byModel[usage.model].cost += usage.cost;
    result.byModel[usage.model].tokens += usage.totalTokens;
    result.byModel[usage.model].inputTokens += usage.inputTokens;
    result.byModel[usage.model].outputTokens += usage.outputTokens;

    // By agent
    const agentName = usage.agent || 'unknown';
    if (!result.byAgent[agentName]) {
      result.byAgent[agentName] = { cost: 0, tokens: 0 };
    }
    result.byAgent[agentName].cost += usage.cost;
    result.byAgent[agentName].tokens += usage.totalTokens;

    // By board
    const boardKey = usage.boardId ? String(usage.boardId) : 'unassigned';
    if (!result.byBoard[boardKey]) {
      result.byBoard[boardKey] = { cost: 0, tokens: 0, boardId: usage.boardId || null };
    }
    result.byBoard[boardKey].cost += usage.cost;
    result.byBoard[boardKey].tokens += usage.totalTokens;

    // Daily aggregation
    if (!dailyMap[usage.date]) {
      dailyMap[usage.date] = { cost: 0, tokens: 0, byModel: {} };
    }
    dailyMap[usage.date].cost += usage.cost;
    dailyMap[usage.date].tokens += usage.totalTokens;
    dailyMap[usage.date].byModel[usage.model] = (dailyMap[usage.date].byModel[usage.model] || 0) + usage.cost;
  }

  // Convert daily map to sorted array
  result.daily = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      cost: data.cost,
      tokens: data.tokens,
      byModel: data.byModel,
    }));

  // Calculate savings (vs if everything was Opus)
  const kimiTokens = result.byModel.kimi?.tokens || 0;
  const kimiCost = result.byModel.kimi?.cost || 0;
  if (kimiTokens > 0) {
    // What would Kimi tokens cost if they were Opus
    const kimiInputTokens = result.byModel.kimi?.inputTokens || 0;
    const kimiOutputTokens = result.byModel.kimi?.outputTokens || 0;
    const hypotheticalOpusCost = calculateCost('opus', kimiInputTokens, kimiOutputTokens);
    result.savings.amount = hypotheticalOpusCost - kimiCost;
    result.savings.percentage = (result.savings.amount / hypotheticalOpusCost) * 100;
  }

  return result;
}

// GET /api/usage - Get usage data
usageRouter.get('/', (c) => {
  const period = c.req.query('period') || 'all';
  const { start, end } = getDateRange(period);

  const runsMapping = loadRunsMapping();
  const sessionFiles = getAllSessionFiles();
  const allUsages: TokenUsage[] = [];

  for (const filePath of sessionFiles) {
    const usages = parseSessionFile(filePath, runsMapping);
    allUsages.push(...usages);
  }

  // Filter usages by date range
  const filteredUsages = allUsages.filter(usage => {
    const usageDate = new Date(usage.date);
    return usageDate >= start && usageDate <= end;
  });

  const aggregated = aggregateUsage(filteredUsages, period);

  // Fetch board names for the byBoard breakdown
  const boards = db.prepare('SELECT id, name FROM boards').all() as { id: number; name: string }[];
  const boardNameMap = new Map(boards.map(b => [String(b.id), b.name]));

  // Add board names to byBoard response
  const byBoardWithNames: Record<string, { cost: number; tokens: number; boardId: number | null; name: string }> = {};
  for (const [key, value] of Object.entries(aggregated.byBoard)) {
    byBoardWithNames[key] = {
      ...value,
      // 'Main' for unassigned (null) and board 1 (Pika's board)
      name: (key === 'unassigned' || key === '1') ? 'Main' : (boardNameMap.get(key) || `Board ${key}`),
    };
  }

  return c.json({
    ...aggregated,
    byBoard: byBoardWithNames,
    pricing: PRICING,
    period,
  });
});

// GET /api/usage/summary - Get lightweight usage summary for header
usageRouter.get('/summary', (c) => {
  const runsMapping = loadRunsMapping();
  const sessionFiles = getAllSessionFiles();
  const allUsages: TokenUsage[] = [];

  for (const filePath of sessionFiles) {
    const usages = parseSessionFile(filePath, runsMapping);
    allUsages.push(...usages);
  }

  // Get date ranges for day and month
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Calculate daily and monthly totals
  let dailyAnthropic = 0;
  let dailyKimi = 0;
  let monthlyAnthropic = 0;
  let monthlyKimi = 0;

  for (const usage of allUsages) {
    const usageDate = new Date(usage.date);
    
    // Anthropic = opus model
    if (usage.model === 'opus') {
      if (usage.date === today) {
        dailyAnthropic += usage.cost;
      }
      if (usageDate >= monthStart) {
        monthlyAnthropic += usage.cost;
      }
    }
    
    // Kimi = kimi model
    if (usage.model === 'kimi') {
      if (usage.date === today) {
        dailyKimi += usage.cost;
      }
      if (usageDate >= monthStart) {
        monthlyKimi += usage.cost;
      }
    }
  }

  return c.json({
    daily: {
      anthropic: dailyAnthropic,
      kimi: dailyKimi,
      total: dailyAnthropic + dailyKimi,
    },
    monthly: {
      anthropic: monthlyAnthropic,
      kimi: monthlyKimi,
      total: monthlyAnthropic + monthlyKimi,
    },
    updatedAt: new Date().toISOString(),
  });
});

export default usageRouter;
