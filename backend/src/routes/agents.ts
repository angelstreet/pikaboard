import { Hono } from 'hono';
import { readdir, readFile, stat } from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';
import { homedir } from 'os';
import { db } from '../db';

export const agentsRouter = new Hono();

interface AgentConfig {
  name?: string;
  role?: string;
  status?: 'active' | 'idle' | 'offline' | 'busy';
  model?: string;
  skills?: string[];
  plugins?: string[];
  board_id?: number;
  kpis?: {
    tasksCompleted?: number;
    tasksActive?: number;
    uptime?: string;
  };
}

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'idle' | 'offline' | 'busy';
  currentTask: string | null;
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

// Parse SOUL.md to extract structured info
function parseSoulMd(content: string): {
  purpose: string | null;
  personality: string | null;
  domain: string | null;
  boardId: number | null;
  skills: string[];
} {
  const result = {
    purpose: null as string | null,
    personality: null as string | null,
    domain: null as string | null,
    boardId: null as number | null,
    skills: [] as string[],
  };

  // Extract Purpose section
  const purposeMatch = content.match(/## Purpose\s*\n([\s\S]*?)(?=\n##|$)/);
  if (purposeMatch) {
    result.purpose = purposeMatch[1].trim().split('\n')[0].trim();
  }

  // Extract Domain from Identity section
  const domainMatch = content.match(/\*\*Domain:\*\*\s*(.+)/);
  if (domainMatch) {
    result.domain = domainMatch[1].trim();
  }

  // Extract Board ID
  const boardMatch = content.match(/board_id:\s*(\d+)/);
  if (boardMatch) {
    result.boardId = parseInt(boardMatch[1], 10);
  }

  // Extract Personality
  const personalityMatch = content.match(/## Personality\s*\n([\s\S]*?)(?=\n##|$)/);
  if (personalityMatch) {
    result.personality = personalityMatch[1].trim().split('\n')[0].trim();
  }

  // Extract Skills
  const skillsMatch = content.match(/## Skills\s*\n([\s\S]*?)(?=\n##|$)/);
  if (skillsMatch) {
    const skillLines = skillsMatch[1].trim().split('\n');
    result.skills = skillLines
      .filter((line) => line.startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim());
  }

  return result;
}

// Get agent status from database tasks and memory files
async function getAgentStatus(agentDir: string, boardId: number | null): Promise<{
  status: 'active' | 'idle' | 'offline' | 'busy';
  lastSeen: string | null;
  currentTask: string | null;
}> {
  const result = {
    status: 'offline' as 'active' | 'idle' | 'offline' | 'busy',
    lastSeen: null as string | null,
    currentTask: null as string | null,
  };

  try {
    // First, check database for in_progress tasks on this agent's board
    if (boardId) {
      const inProgressTask = db.prepare(`
        SELECT id, name FROM tasks 
        WHERE board_id = ? AND status = 'in_progress' 
        ORDER BY updated_at DESC 
        LIMIT 1
      `).get(boardId) as { id: number; name: string } | undefined;

      if (inProgressTask) {
        result.status = 'busy';
        result.currentTask = `#${inProgressTask.id}: ${inProgressTask.name}`;
        result.lastSeen = new Date().toISOString();
        return result; // If busy, we're done
      }
    }

    // Check for recent memory files as activity indicator
    const memoryDir = join(agentDir, 'memory');
    const memoryStat = await stat(memoryDir).catch(() => null);
    
    if (memoryStat) {
      const files = await readdir(memoryDir);
      const today = new Date().toISOString().split('T')[0];
      const hasRecentActivity = files.some((f) => f.includes(today));
      
      if (hasRecentActivity) {
        result.status = 'active';
        result.lastSeen = new Date().toISOString();
      } else if (files.length > 0) {
        // Find most recent dated file
        const datedFiles = files.filter((f) => f.match(/\d{4}-\d{2}-\d{2}/));
        if (datedFiles.length > 0) {
          const sorted = datedFiles.sort().reverse();
          result.lastSeen = sorted[0].replace('.md', '');
          result.status = 'idle';
        }
      }
    }
  } catch {
    // Ignore errors, keep defaults
  }

  return result;
}

// GET /api/agents - List all agents
agentsRouter.get('/', async (c) => {
  const agentsDir = join(homedir(), '.openclaw', 'agents');
  const agents: Agent[] = [];

  try {
    const entries = await readdir(agentsDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());

    for (const dir of dirs) {
      const agentPath = join(agentsDir, dir.name);
      const configPath = join(agentPath, 'config.json');
      const soulPath = join(agentPath, 'SOUL.md');

      // Read config.json if exists
      let config: AgentConfig = {};
      try {
        const configContent = await readFile(configPath, 'utf-8');
        config = JSON.parse(configContent);
      } catch {
        // No config file, use defaults
      }

      // Read SOUL.md
      let soulData = {
        purpose: null as string | null,
        personality: null as string | null,
        domain: null as string | null,
        boardId: null as number | null,
        skills: [] as string[],
      };
      try {
        const soulContent = await readFile(soulPath, 'utf-8');
        soulData = parseSoulMd(soulContent);
      } catch {
        // No SOUL.md
      }

      // Determine boardId first (needed for status check)
      const boardId = config.board_id || soulData.boardId;

      // Get runtime status (checks DB for in_progress tasks)
      const statusInfo = await getAgentStatus(agentPath, boardId);

      // Merge all data
      const agent: Agent = {
        id: dir.name,
        name: config.name || dir.name.charAt(0).toUpperCase() + dir.name.slice(1),
        role: config.role || soulData.domain || 'Agent',
        status: config.status || statusInfo.status,
        currentTask: statusInfo.currentTask,
        purpose: soulData.purpose,
        personality: soulData.personality,
        domain: soulData.domain,
        boardId: config.board_id || soulData.boardId,
        kpis: {
          tasksCompleted: config.kpis?.tasksCompleted || 0,
          tasksActive: config.kpis?.tasksActive || 0,
          uptime: config.kpis?.uptime || null,
        },
        skills: config.skills || soulData.skills,
        plugins: config.plugins || [],
        recentActivity: [],
        lastSeen: statusInfo.lastSeen,
        configPath: agentPath,
      };

      agents.push(agent);
    }

    // Sort by status (active first, then idle, then offline)
    const statusOrder = { busy: 0, active: 1, idle: 2, offline: 3 };
    agents.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return c.json({ agents });
  } catch (err) {
    // If agents directory doesn't exist
    return c.json({ agents: [], error: 'Agents directory not found' });
  }
});

// Helper: Parse gateway logs for session stats
async function parseGatewayLogsForAgent(agentId: string): Promise<{
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalDurationMs: number;
  sessionCount: number;
  lastActiveAt: string | null;
}> {
  const result = {
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalDurationMs: 0,
    sessionCount: 0,
    lastActiveAt: null as string | null,
  };

  const logDir = '/tmp/openclaw';
  if (!existsSync(logDir)) return result;

  try {
    const files = await readdir(logDir);
    const logFiles = files
      .filter((f) => f.startsWith('openclaw-') && f.endsWith('.log'))
      .sort()
      .reverse()
      .slice(0, 7);

    for (const file of logFiles) {
      const filePath = join(logDir, file);
      const rl = createInterface({
        input: createReadStream(filePath),
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        try {
          if (!line.includes('\\"usage\\"') || !line.includes('\\"sessionId\\"')) continue;

          const parsed = JSON.parse(line);
          const logData = parsed['0'];
          if (!logData || typeof logData !== 'string') continue;

          const innerData = JSON.parse(logData);
          const meta = innerData?.result?.meta;
          if (!meta?.agentMeta) continue;

          const { sessionId, usage } = meta.agentMeta;
          if (!sessionId) continue;

          const sessionAgentId = sessionId.split('-')[0].toLowerCase();
          if (sessionAgentId !== agentId.toLowerCase()) continue;

          result.sessionCount++;
          if (usage) {
            result.inputTokens += usage.input || 0;
            result.outputTokens += usage.output || 0;
            result.cacheReadTokens += usage.cacheRead || 0;
            result.cacheWriteTokens += usage.cacheWrite || 0;
            result.totalTokens += usage.total || 0;
          }
          if (meta.durationMs) {
            result.totalDurationMs += meta.durationMs;
          }
          if (parsed.time && (!result.lastActiveAt || parsed.time > result.lastActiveAt)) {
            result.lastActiveAt = parsed.time;
          }
        } catch {
          // Skip malformed lines
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return result;
}

// Helper: Format duration in human-readable format
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

// GET /api/agents/:id/stats - Get agent statistics (must be before /:id)
agentsRouter.get('/:id/stats', async (c) => {
  const id = c.req.param('id');
  const agentPath = join(homedir(), '.openclaw', 'agents', id);

  try {
    const dirStat = await stat(agentPath);
    if (!dirStat.isDirectory()) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    const createdAt = dirStat.birthtime || dirStat.ctime;
    const logStats = await parseGatewayLogsForAgent(id);

    const runsPath = join(homedir(), '.openclaw', 'subagents', 'runs.json');
    let runsStats = { sessionCount: 0, totalDurationMs: 0, lastActiveAt: null as string | null };

    try {
      const runsContent = await readFile(runsPath, 'utf-8');
      const runsData = JSON.parse(runsContent);
      const runs = Object.values(runsData.runs || {}) as Array<{
        label?: string; startedAt?: number; endedAt?: number; createdAt?: number;
      }>;

      for (const run of runs) {
        if (run.label?.toLowerCase().startsWith(id.toLowerCase() + '-')) {
          runsStats.sessionCount++;
          if (run.startedAt && run.endedAt) {
            runsStats.totalDurationMs += run.endedAt - run.startedAt;
          }
          const runTime = run.endedAt || run.startedAt || run.createdAt;
          if (runTime) {
            const isoTime = new Date(runTime).toISOString();
            if (!runsStats.lastActiveAt || isoTime > runsStats.lastActiveAt) {
              runsStats.lastActiveAt = isoTime;
            }
          }
        }
      }
    } catch { /* ignore */ }

    let lastMemoryDate: string | null = null;
    try {
      const memoryDir = join(agentPath, 'memory');
      const memoryFiles = await readdir(memoryDir);
      const datedFiles = memoryFiles.filter((f) => f.match(/\d{4}-\d{2}-\d{2}\.md$/)).sort().reverse();
      if (datedFiles.length > 0) lastMemoryDate = datedFiles[0].replace('.md', '');
    } catch { /* ignore */ }

    const lastActiveAt = [logStats.lastActiveAt, runsStats.lastActiveAt, lastMemoryDate]
      .filter(Boolean).sort().reverse()[0] || null;

    return c.json({
      agentId: id,
      createdAt: createdAt.toISOString(),
      lastActiveAt,
      tokens: {
        total: logStats.totalTokens,
        input: logStats.inputTokens,
        output: logStats.outputTokens,
        cacheRead: logStats.cacheReadTokens,
        cacheWrite: logStats.cacheWriteTokens,
      },
      sessions: {
        count: Math.max(logStats.sessionCount, runsStats.sessionCount),
        totalDurationMs: Math.max(logStats.totalDurationMs, runsStats.totalDurationMs),
        totalDurationFormatted: formatDuration(Math.max(logStats.totalDurationMs, runsStats.totalDurationMs)),
      },
    });
  } catch {
    return c.json({ error: 'Agent not found' }, 404);
  }
});

// GET /api/agents/:id - Get single agent details
agentsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const agentPath = join(homedir(), '.openclaw', 'agents', id);

  try {
    const dirStat = await stat(agentPath);
    if (!dirStat.isDirectory()) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    const configPath = join(agentPath, 'config.json');
    const soulPath = join(agentPath, 'SOUL.md');

    // Read config.json
    let config: AgentConfig = {};
    try {
      const configContent = await readFile(configPath, 'utf-8');
      config = JSON.parse(configContent);
    } catch {
      // No config
    }

    // Read SOUL.md
    let soulContent = '';
    let soulData = {
      purpose: null as string | null,
      personality: null as string | null,
      domain: null as string | null,
      boardId: null as number | null,
      skills: [] as string[],
    };
    try {
      soulContent = await readFile(soulPath, 'utf-8');
      soulData = parseSoulMd(soulContent);
    } catch {
      // No SOUL.md
    }

    // Determine boardId first (needed for status check)
    const boardId = config.board_id || soulData.boardId;

    // Get status (checks DB for in_progress tasks)
    const statusInfo = await getAgentStatus(agentPath, boardId);

    // Get recent memory entries for activity
    const recentActivity: string[] = [];
    try {
      const memoryDir = join(agentPath, 'memory');
      const files = await readdir(memoryDir);
      const datedFiles = files
        .filter((f) => f.match(/\d{4}-\d{2}-\d{2}\.md$/))
        .sort()
        .reverse()
        .slice(0, 3);

      for (const file of datedFiles) {
        const content = await readFile(join(memoryDir, file), 'utf-8');
        const firstLine = content.split('\n').find((l) => l.startsWith('-') || l.startsWith('#'));
        if (firstLine) {
          recentActivity.push(`${file.replace('.md', '')}: ${firstLine.substring(0, 80)}`);
        }
      }
    } catch {
      // No memory dir
    }

    const agent: Agent = {
      id,
      name: config.name || id.charAt(0).toUpperCase() + id.slice(1),
      role: config.role || soulData.domain || 'Agent',
      status: config.status || statusInfo.status,
      currentTask: statusInfo.currentTask,
      purpose: soulData.purpose,
      personality: soulData.personality,
      domain: soulData.domain,
      boardId: config.board_id || soulData.boardId,
      kpis: {
        tasksCompleted: config.kpis?.tasksCompleted || 0,
        tasksActive: config.kpis?.tasksActive || 0,
        uptime: config.kpis?.uptime || null,
      },
      skills: config.skills || soulData.skills,
      plugins: config.plugins || [],
      recentActivity,
      lastSeen: statusInfo.lastSeen,
      configPath: agentPath,
    };

    return c.json({ agent, soulMd: soulContent });
  } catch {
    return c.json({ error: 'Agent not found' }, 404);
  }
});
