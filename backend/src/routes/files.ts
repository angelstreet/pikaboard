import { Hono } from 'hono';
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, resolve, basename, dirname, relative } from 'path';
import { homedir } from 'os';

export const filesRouter = new Hono();

// Agent emoji mapping
const AGENT_EMOJIS: Record<string, string> = {
  pika: '⚡', bulbi: '🌱', tortoise: '🐢', sala: '🦎', evoli: '🦊',
  psykokwak: '🦆', mew: '✨', porygon: '🔷', lanturn: '🔦', mewtwo: '🧬', 'pika-ops': '🧬',
};

// Discover agent workspaces dynamically
function discoverAgentWorkspaces(): { name: string; path: string }[] {
  const openclawDir = join(homedir(), '.openclaw');
  try {
    const entries = readdirSync(openclawDir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && e.name.startsWith('workspace-'))
      .map(e => ({
        name: e.name.replace('workspace-', ''),
        path: join(openclawDir, e.name),
      }))
      .filter(w => w.name !== 'main') // Skip workspace-main (that's the main workspace)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

// Build allowed paths dynamically
function buildAllowedPaths(): string[] {
  const paths = [
    join(homedir(), '.openclaw/workspace'),  // Main workspace (docs, memory, shared)
    join(homedir(), '.openclaw/agents'),      // Agent configs (SOUL.md, memory/)
  ];
  for (const ws of discoverAgentWorkspaces()) {
    paths.push(ws.path);
  }
  return paths;
}

// Whitelist of allowed directories (with ~ expanded) - rebuilt on each check to pick up new workspaces
let ALLOWED_PATHS = buildAllowedPaths();
// Check if a path is within allowed directories
function isPathAllowed(targetPath: string): boolean {
  const resolved = resolve(targetPath);
  
  for (const allowed of ALLOWED_PATHS) {
    if (resolved.startsWith(allowed)) {
      // Special case for agents: allow memory/ subdirs and SOUL.md
      if (allowed.endsWith('/.openclaw/agents')) {
        const relPath = relative(allowed, resolved);
        const parts = relPath.split('/');
        // Allow: agentName/memory/... or agentName/memory
        if (parts.length >= 2 && parts[1] === 'memory') {
          return true;
        }
        // Allow: agentName/logs/...
        if (parts.length >= 2 && parts[1] === 'logs') {
          return true;
        }
        // Allow: agentName/SOUL.md
        if (parts.length === 2 && parts[1] === 'SOUL.md') {
          return true;
        }
        // Also allow listing agent dirs
        if (parts.length === 1 || (parts.length === 2 && parts[1] === '')) {
          return true;
        }
        return false;
      }
      return true;
    }
  }
  return false;
}

// Expand ~ to homedir
// Expand ~ to homedir and handle relative paths
function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return join(homedir(), path.slice(1));
  }
  // Relative paths resolve to workspace
  if (!path.startsWith('/')) {
    return join(homedir(), '.openclaw/workspace', path);
  }
  return path;
}

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
}

// GET /api/files - List directory contents
filesRouter.get('/', (c) => {
  const queryPath = c.req.query('path') || '~/.openclaw/workspace/research';
  const expanded = expandPath(queryPath);
  
  if (!isPathAllowed(expanded)) {
    return c.json({ error: 'Access denied: path not in whitelist' }, 403);
  }
  
  if (!existsSync(expanded)) {
    return c.json({ error: 'Path not found' }, 404);
  }
  
  try {
    const stat = statSync(expanded);
    if (!stat.isDirectory()) {
      return c.json({ error: 'Path is not a directory' }, 400);
    }
    
    const entries = readdirSync(expanded, { withFileTypes: true });
    const files: FileEntry[] = [];
    
    for (const entry of entries) {
      // Skip hidden files
      if (entry.name.startsWith('.')) continue;
      
      const fullPath = join(expanded, entry.name);
      const displayPath = fullPath.replace(homedir(), '~');
      
      // For agents dir, only show dirs with memory subdir or SOUL.md (or is main agent)
      if (expanded.endsWith('/.openclaw/agents') && entry.isDirectory()) {
        // Always show 'main' (Pika - the captain)
        if (entry.name === 'main') {
          // main's memory is in workspace/memory, so include it anyway
        } else {
          const memoryPath = join(fullPath, 'memory');
          const soulPath = join(fullPath, 'SOUL.md');
          if (!existsSync(memoryPath) && !existsSync(soulPath)) continue;
        }
      }
      
      // Rename 'main' to 'pika' for display in agents list
      const displayName = (expanded.endsWith('/.openclaw/agents') && entry.name === 'main') 
        ? '⚡ pika (captain)' 
        : entry.name;
      
      // Check if this specific entry is allowed
      if (!isPathAllowed(fullPath)) continue;
      
      try {
        const entryStat = statSync(fullPath);
        files.push({
          name: displayName,
          path: displayPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() ? entryStat.size : undefined,
          modified: entryStat.mtime.toISOString(),
        });
      } catch {
        // Skip entries we can't stat
      }
    }
    
    // For individual agent dirs, also check canonical agents logs path
    const agentsBase = join(homedir(), '.openclaw/agents');
    if (expanded.startsWith(agentsBase) && expanded !== agentsBase) {
      const agentName = relative(agentsBase, expanded).split('/')[0];
      if (agentName && !agentName.includes('/')) {
        const agentLogsPath = join(homedir(), '.openclaw/agents', agentName, 'logs');
        if (existsSync(agentLogsPath) && !files.some(f => f.name === 'logs')) {
          try {
            const logsStat = statSync(agentLogsPath);
            files.push({
              name: 'logs',
              path: agentLogsPath.replace(homedir(), '~'),
              type: 'directory',
              modified: logsStat.mtime.toISOString(),
            });
          } catch {}
        }
      }
    }
    
    // Sort: directories first, then alphabetically
    files.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    return c.json({
      path: expanded.replace(homedir(), '~'),
      parent: dirname(expanded).replace(homedir(), '~'),
      entries: files,
    });
  } catch (error) {
    console.error('Error listing directory:', error);
    return c.json({ error: 'Failed to list directory' }, 500);
  }
});

// GET /api/files/content - Read file content
filesRouter.get('/content', (c) => {
  const queryPath = c.req.query('path');
  
  if (!queryPath) {
    return c.json({ error: 'Path parameter required' }, 400);
  }
  
  const expanded = expandPath(queryPath);
  
  if (!isPathAllowed(expanded)) {
    return c.json({ error: 'Access denied: path not in whitelist' }, 403);
  }
  
  if (!existsSync(expanded)) {
    return c.json({ error: 'File not found' }, 404);
  }
  
  try {
    const stat = statSync(expanded);
    if (!stat.isFile()) {
      return c.json({ error: 'Path is not a file' }, 400);
    }
    
    // Limit file size (1MB max)
    if (stat.size > 1024 * 1024) {
      return c.json({ error: 'File too large (max 1MB)' }, 400);
    }
    
    const content = readFileSync(expanded, 'utf-8');
    
    return c.json({
      path: expanded.replace(homedir(), '~'),
      name: basename(expanded),
      size: stat.size,
      modified: stat.mtime.toISOString(),
      content,
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return c.json({ error: 'Failed to read file' }, 500);
  }
});

// GET /api/files/roots - List available root directories
filesRouter.get('/roots', (c) => {
  // Refresh allowed paths to pick up newly created workspaces
  ALLOWED_PATHS = buildAllowedPaths();

  const roots = [
    { path: '~/.openclaw/agents', label: '🤖 Agents', exists: existsSync(join(homedir(), '.openclaw/agents')) },
    { path: '~/.openclaw/workspace/memory', label: '📝 Memory', exists: existsSync(join(homedir(), '.openclaw/workspace/memory')) },
    { path: '~/.openclaw/workspace/docs', label: '📚 Docs', exists: existsSync(join(homedir(), '.openclaw/workspace/docs')) },
    { path: '~/.openclaw/workspace/shared', label: '📁 Shared', exists: existsSync(join(homedir(), '.openclaw/workspace/shared')) },
  ];

  // Add discovered agent workspaces
  for (const ws of discoverAgentWorkspaces()) {
    const emoji = AGENT_EMOJIS[ws.name] || '🔹';
    const label = `${emoji} ${ws.name.charAt(0).toUpperCase() + ws.name.slice(1)}`;
    roots.push({
      path: ws.path.replace(homedir(), '~'),
      label,
      exists: true, // already filtered by discoverAgentWorkspaces
    });
  }

  return c.json({ roots: roots.filter(r => r.exists) });
});
