import { Hono } from 'hono';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { db } from '../db';

export const proposalsRouter = new Hono();

const PROPOSALS_PATH = join(homedir(), '.openclaw', 'workspace', 'data', 'pending-proposals.json');

interface ProposalItem {
  name: string;
  description?: string;
}

interface AgentProposals {
  pending: boolean;
  items: (string | ProposalItem)[];
}

interface ProposalsData {
  proposals: Record<string, AgentProposals>;
  updatedAt: string;
}

async function readProposals(): Promise<ProposalsData> {
  if (!existsSync(PROPOSALS_PATH)) {
    return { proposals: {}, updatedAt: new Date().toISOString() };
  }
  const content = await readFile(PROPOSALS_PATH, 'utf-8');
  return JSON.parse(content);
}

async function writeProposals(data: ProposalsData): Promise<void> {
  data.updatedAt = new Date().toISOString();
  await writeFile(PROPOSALS_PATH, JSON.stringify(data, null, 2));
}

// GET /api/proposals - List all pending proposals
proposalsRouter.get('/', async (c) => {
  const data = await readProposals();
  
  // Filter to only agents with pending proposals
  const pending = Object.entries(data.proposals)
    .filter(([_, v]) => v.pending && v.items.length > 0)
    .map(([agentId, v]) => ({
      agentId,
      items: v.items.map((item) => 
        typeof item === 'string' ? { name: item } : item
      ),
    }));

  return c.json({ proposals: pending, updatedAt: data.updatedAt });
});

// POST /api/proposals/:agentId/approve - Approve a proposal (create task)
proposalsRouter.post('/:agentId/approve', async (c) => {
  const agentId = c.req.param('agentId');
  const body = await c.req.json();
  const { index, boardId, comment } = body as { index: number; boardId?: number; comment?: string };

  const data = await readProposals();
  const agentProposals = data.proposals[agentId];

  if (!agentProposals || !agentProposals.pending) {
    return c.json({ error: 'No pending proposals for this agent' }, 404);
  }

  if (index < 0 || index >= agentProposals.items.length) {
    return c.json({ error: 'Invalid proposal index' }, 400);
  }

  const proposal = agentProposals.items[index];
  const proposalName = typeof proposal === 'string' ? proposal : proposal.name;
  let proposalDesc = typeof proposal === 'string' ? '' : proposal.description || '';
  
  // Append comment to description if provided
  if (comment && comment.trim()) {
    proposalDesc = proposalDesc 
      ? `${proposalDesc}\n\n---\n**Note from reviewer:** ${comment.trim()}`
      : `**Note from reviewer:** ${comment.trim()}`;
  }

  // Look up agent's board_id from their SOUL.md or config
  let targetBoardId = boardId;
  if (!targetBoardId) {
    // Try to find agent's board from database or default to 1
    const agentConfigPath = join(homedir(), '.openclaw', 'agents', agentId, 'config.json');
    try {
      const config = JSON.parse(await readFile(agentConfigPath, 'utf-8'));
      targetBoardId = config.board_id;
    } catch {
      // Try SOUL.md
      const soulPath = join(homedir(), '.openclaw', 'agents', agentId, 'SOUL.md');
      try {
        const soulContent = await readFile(soulPath, 'utf-8');
        const match = soulContent.match(/board_id:\s*(\d+)/);
        if (match) targetBoardId = parseInt(match[1], 10);
      } catch {
        // Default to board 1
      }
    }
    targetBoardId = targetBoardId || 1;
  }

  // Create task in inbox
  const stmt = db.prepare(`
    INSERT INTO tasks (name, description, status, priority, board_id, position)
    VALUES (?, ?, 'up_next', 'medium', ?, 0)
  `);
  const result = stmt.run(proposalName, proposalDesc, targetBoardId);
  const taskId = result.lastInsertRowid;

  // Remove the approved item and check if any remain
  agentProposals.items.splice(index, 1);
  if (agentProposals.items.length === 0) {
    agentProposals.pending = false;
  }

  await writeProposals(data);

  // Fetch the created task
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

  return c.json({ 
    success: true, 
    task,
    message: `Task "${proposalName}" created for ${agentId}`,
  });
});

// POST /api/proposals/:agentId/reject - Reject a proposal
proposalsRouter.post('/:agentId/reject', async (c) => {
  const agentId = c.req.param('agentId');
  const body = await c.req.json();
  const { index, all, comment } = body as { index?: number; all?: boolean; comment?: string };

  const data = await readProposals();
  const agentProposals = data.proposals[agentId];

  if (!agentProposals || !agentProposals.pending) {
    return c.json({ error: 'No pending proposals for this agent' }, 404);
  }

  if (all) {
    // Reject all proposals
    agentProposals.items = [];
    agentProposals.pending = false;
    await writeProposals(data);
    const msg = comment ? `All proposals rejected for ${agentId}: ${comment}` : `All proposals rejected for ${agentId}`;
    return c.json({ success: true, message: msg, comment: comment || null });
  }

  if (index === undefined || index < 0 || index >= agentProposals.items.length) {
    return c.json({ error: 'Invalid proposal index' }, 400);
  }

  const rejected = agentProposals.items[index];
  const rejectedName = typeof rejected === 'string' ? rejected : rejected.name;
  agentProposals.items.splice(index, 1);

  if (agentProposals.items.length === 0) {
    agentProposals.pending = false;
  }

  await writeProposals(data);

  const msg = comment 
    ? `Proposal "${rejectedName}" rejected for ${agentId}: ${comment}`
    : `Proposal "${rejectedName}" rejected for ${agentId}`;

  return c.json({ 
    success: true, 
    message: msg,
    comment: comment || null,
  });
});

// POST /api/proposals/:agentId - Submit new proposals (for agents)
proposalsRouter.post('/:agentId', async (c) => {
  const agentId = c.req.param('agentId');
  const body = await c.req.json();
  const { items } = body as { items: (string | ProposalItem)[] };

  if (!items || !Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'Items array required' }, 400);
  }

  const data = await readProposals();
  
  data.proposals[agentId] = {
    pending: true,
    items: items.slice(0, 5), // Max 5 proposals
  };

  await writeProposals(data);

  return c.json({ 
    success: true, 
    message: `${items.length} proposals submitted for ${agentId}`,
  });
});
