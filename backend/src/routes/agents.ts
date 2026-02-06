import { Hono } from 'hono';
import { readdir, readFile, stat } from 'fs/promises';
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
    const dirs = entries.filter((e) => e.isDirectory() && e.name !== 'main');

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
