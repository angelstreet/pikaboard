import { Hono } from 'hono';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const openclawRoutes = new Hono();

export interface SessionInfo {
  key: string;
  kind: string;
  updatedAt: number;
  sessionId: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  model?: string;
  contextTokens?: number;
}

export interface SessionsResponse {
  path: string;
  count: number;
  sessions: SessionInfo[];
}

// Get all sessions with token info
openclawRoutes.get('/sessions', async (c) => {
  try {
    const { stdout } = await execAsync('openclaw sessions --json');
    const data: SessionsResponse = JSON.parse(stdout);
    
    // Find the main session (agent:main:main or the slack channel)
    const mainSession = data.sessions.find(s => s.key === 'agent:main:main');
    const slackSession = data.sessions.find(s => s.key.includes('slack:channel'));
    
    // Get the active session (prefer slack channel if recent, else main)
    const activeSession = slackSession && mainSession 
      ? (slackSession.updatedAt > mainSession.updatedAt ? slackSession : mainSession)
      : (mainSession || slackSession);
    
    return c.json({
      sessions: data.sessions,
      active: activeSession ? {
        key: activeSession.key,
        totalTokens: activeSession.totalTokens || 0,
        contextTokens: activeSession.contextTokens || 200000,
        model: activeSession.model,
        updatedAt: activeSession.updatedAt,
      } : null,
    });
  } catch (error) {
    console.error('Failed to get sessions:', error);
    return c.json({ error: 'Failed to get sessions' }, 500);
  }
});

// Get context for a specific session (or main by default)
openclawRoutes.get('/context', async (c) => {
  try {
    const { stdout } = await execAsync('openclaw sessions --json');
    const data: SessionsResponse = JSON.parse(stdout);
    
    // Find main session
    const mainSession = data.sessions.find(s => s.key === 'agent:main:main');
    const slackSession = data.sessions.find(s => s.key.includes('slack:channel:d0acnlfgm9b'));
    
    // Use whichever is more recent
    const session = slackSession && mainSession
      ? (slackSession.updatedAt > mainSession.updatedAt ? slackSession : mainSession)
      : (mainSession || slackSession || data.sessions[0]);
    
    if (!session) {
      return c.json({ current: 0, total: 200000 });
    }
    
    return c.json({
      current: session.totalTokens || 0,
      total: session.contextTokens || 200000,
      model: session.model,
      sessionKey: session.key,
    });
  } catch (error) {
    console.error('Failed to get context:', error);
    return c.json({ current: 0, total: 200000 });
  }
});

// Reset main agent sessions by removing from session store
openclawRoutes.post('/sessions/reset', async (c) => {
  try {
    const fs = await import('fs/promises');
    const sessionsPath = '/home/jndoye/.openclaw/agents/main/sessions/sessions.json';
    
    const raw = await fs.readFile(sessionsPath, 'utf-8');
    const sessions = JSON.parse(raw);
    
    const cleared: string[] = [];
    for (const key of Object.keys(sessions)) {
      if (key.startsWith('agent:main:')) {
        cleared.push(key);
        delete sessions[key];
      }
    }
    
    await fs.writeFile(sessionsPath, JSON.stringify(sessions, null, 2));
    
    return c.json({ 
      success: true, 
      message: `Cleared ${cleared.length} main sessions`,
      cleared
    });
  } catch (error: any) {
    console.error('Failed to reset sessions:', error?.message);
    return c.json({ error: 'Failed to reset sessions: ' + error?.message }, 500);
  }
});

export default openclawRoutes;
