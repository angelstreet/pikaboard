import { Hono } from 'hono';
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, resolve, basename, dirname, relative } from 'path';
import { homedir } from 'os';

export const filesRouter = new Hono();

// Whitelist of allowed directories (with ~ expanded)
const ALLOWED_PATHS = [
  join(homedir(), '.openclaw/workspace/research'),
  join(homedir(), '.openclaw/workspace/docs'),
  join(homedir(), '.openclaw/workspace/memory'),
  join(homedir(), '.openclaw/agents'),
];

// Check if a path is within allowed directories
function isPathAllowed(targetPath: string): boolean {
  const resolved = resolve(targetPath);
  
  for (const allowed of ALLOWED_PATHS) {
    if (resolved.startsWith(allowed)) {
      // Special case for agents: allow memory/ subdirs and SOUL.md
      if (allowed.endsWith('.openclaw/agents')) {
        const relPath = relative(allowed, resolved);
        const parts = relPath.split('/');
        // Allow: agentName/memory/... or agentName/memory
        if (parts.length >= 2 && parts[1] === 'memory') {
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
function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return join(homedir(), path.slice(1));
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
      
      // For agents dir, only show dirs with memory subdir or SOUL.md
      if (expanded.endsWith('.openclaw/agents') && entry.isDirectory()) {
        const memoryPath = join(fullPath, 'memory');
        const soulPath = join(fullPath, 'SOUL.md');
        if (!existsSync(memoryPath) && !existsSync(soulPath)) continue;
      }
      
      // Check if this specific entry is allowed
      if (!isPathAllowed(fullPath)) continue;
      
      try {
        const entryStat = statSync(fullPath);
        files.push({
          name: entry.name,
          path: displayPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() ? entryStat.size : undefined,
          modified: entryStat.mtime.toISOString(),
        });
      } catch {
        // Skip entries we can't stat
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
  const roots = [
    { path: '~/.openclaw/workspace/research', label: '📁 Research', exists: existsSync(join(homedir(), '.openclaw/workspace/research')) },
    { path: '~/.openclaw/workspace/docs', label: '📄 Docs', exists: existsSync(join(homedir(), '.openclaw/workspace/docs')) },
    { path: '~/.openclaw/workspace/memory', label: '🧠 Pika Memory', exists: existsSync(join(homedir(), '.openclaw/workspace/memory')) },
    { path: '~/.openclaw/agents', label: '🤖 Agents', exists: existsSync(join(homedir(), '.openclaw/agents')) },
  ];
  
  return c.json({ roots: roots.filter(r => r.exists) });
});
