import { Hono } from 'hono';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { db } from '../db/index.js';

export const usageRouter = new Hono();

// Pricing per 1M tokens
const PRICING = {
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

interface TokenUsage {
  date: string;
  model: 'opus' | 'kimi' | 'unknown';
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
function getModelType(entry: SessionEntry): 'opus' | 'kimi' | 'unknown' {
  const model = entry.message?.model || entry.modelId || '';
  const provider = entry.message?.provider || entry.provider || '';

  if (model.includes('claude-opus') || model.includes('opus')) {
    return 'opus';
  }
  if (model.includes('kimi') || model.includes('moonshotai')) {
    return 'kimi';
  }
  if (provider === 'anthropic') {
    return 'opus';
  }
  if (provider === 'openrouter') {
    // Check modelId from entry
    if (entry.modelId?.includes('kimi') || entry.modelId?.includes('moonshotai')) {
      return 'kimi';
    }
  }

  return 'unknown';
}

// Calculate cost from tokens
function calculateCost(model: 'opus' | 'kimi' | 'unknown', inputTokens: number, outputTokens: number): number {
  if (model === 'unknown' || model === 'kimi') {
    // Default to Kimi pricing if unknown
    const pricing = PRICING.kimi;
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }
  const pricing = PRICING[model];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

// Parse a single session file
function parseSessionFile(filePath: string, agentName: string): TokenUsage[] {
  const usages: TokenUsage[] = [];
  let sessionBoardId: number | null = null;

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
function getAllSessionFiles(): { path: string; agent: string }[] {
  const files: { path: string; agent: string }[] = [];
  const agentsDir = join(homedir(), '.openclaw', 'agents');

  try {
    const agents = readdirSync(agentsDir);

    for (const agent of agents) {
      const sessionsDir = join(agentsDir, agent, 'sessions');
      try {
        const sessions = readdirSync(sessionsDir);
        for (const session of sessions) {
          if (session.endsWith('.jsonl')) {
            files.push({
              path: join(sessionsDir, session),
              agent,
            });
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

// Aggregate usage data
function aggregateUsage(usages: TokenUsage[]): {
  today: { total: number; byModel: Record<string, number>; tokens: number };
  thisWeek: { total: number; byModel: Record<string, number>; tokens: number };
  thisMonth: { total: number; byModel: Record<string, number>; tokens: number };
  daily: { date: string; cost: number; tokens: number; byModel: Record<string, number> }[];
  byModel: Record<string, { cost: number; tokens: number; inputTokens: number; outputTokens: number; name: string }>;
  byAgent: Record<string, { cost: number; tokens: number }>;
  byBoard: Record<string, { cost: number; tokens: number; boardId: number | null }>;
  total: { cost: number; tokens: number; sessions: number };
  savings: { amount: number; percentage: number };
} {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now);
  monthStart.setMonth(monthStart.getMonth() - 1);

  // Initialize result
  const result = {
    today: { total: 0, byModel: {} as Record<string, number>, tokens: 0 },
    thisWeek: { total: 0, byModel: {} as Record<string, number>, tokens: 0 },
    thisMonth: { total: 0, byModel: {} as Record<string, number>, tokens: 0 },
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
    const usageDate = new Date(usage.date);

    // Total
    result.total.cost += usage.cost;
    result.total.tokens += usage.totalTokens;

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

    // Today
    if (usage.date === today) {
      result.today.total += usage.cost;
      result.today.tokens += usage.totalTokens;
      result.today.byModel[usage.model] = (result.today.byModel[usage.model] || 0) + usage.cost;
    }

    // This week
    if (usageDate >= weekStart) {
      result.thisWeek.total += usage.cost;
      result.thisWeek.tokens += usage.totalTokens;
      result.thisWeek.byModel[usage.model] = (result.thisWeek.byModel[usage.model] || 0) + usage.cost;
    }

    // This month
    if (usageDate >= monthStart) {
      result.thisMonth.total += usage.cost;
      result.thisMonth.tokens += usage.totalTokens;
      result.thisMonth.byModel[usage.model] = (result.thisMonth.byModel[usage.model] || 0) + usage.cost;
    }

    // Daily aggregation (last 30 days)
    if (!dailyMap[usage.date]) {
      dailyMap[usage.date] = { cost: 0, tokens: 0, byModel: {} };
    }
    dailyMap[usage.date].cost += usage.cost;
    dailyMap[usage.date].tokens += usage.totalTokens;
    dailyMap[usage.date].byModel[usage.model] = (dailyMap[usage.date].byModel[usage.model] || 0) + usage.cost;
  }

  // Convert daily map to sorted array (last 30 days)
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  result.daily = Object.entries(dailyMap)
    .filter(([date]) => new Date(date) >= thirtyDaysAgo)
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
  const sessionFiles = getAllSessionFiles();
  const allUsages: TokenUsage[] = [];

  for (const { path, agent } of sessionFiles) {
    const usages = parseSessionFile(path, agent);
    allUsages.push(...usages);
  }

  const aggregated = aggregateUsage(allUsages);

  // Fetch board names for the byBoard breakdown
  const boards = db.prepare('SELECT id, name FROM boards').all() as { id: number; name: string }[];
  const boardNameMap = new Map(boards.map(b => [String(b.id), b.name]));

  // Add board names to byBoard response
  const byBoardWithNames: Record<string, { cost: number; tokens: number; boardId: number | null; name: string }> = {};
  for (const [key, value] of Object.entries(aggregated.byBoard)) {
    byBoardWithNames[key] = {
      ...value,
      name: key === 'unassigned' ? 'Unassigned' : (boardNameMap.get(key) || `Board ${key}`),
    };
  }

  return c.json({
    ...aggregated,
    byBoard: byBoardWithNames,
    pricing: PRICING,
  });
});

export default usageRouter;
