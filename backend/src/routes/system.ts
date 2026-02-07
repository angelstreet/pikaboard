import { Hono } from 'hono';
import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';

export const systemRouter = new Hono();

// Store previous CPU stats for calculating usage
let previousCpuStats: { user: number; nice: number; system: number; idle: number; iowait: number; irq: number; softirq: number; steal: number; total: number } | null = null;

// Read CPU stats from /proc/stat
function readProcStat(): { user: number; nice: number; system: number; idle: number; iowait: number; irq: number; softirq: number; steal: number; total: number } | null {
  try {
    const stat = fs.readFileSync('/proc/stat', 'utf-8');
    const cpuLine = stat.split('\n')[0]; // First line is aggregate CPU
    const parts = cpuLine.split(/\s+/);
    // cpu user nice system idle iowait irq softirq steal guest guest_nice
    const user = parseInt(parts[1], 10) || 0;
    const nice = parseInt(parts[2], 10) || 0;
    const system = parseInt(parts[3], 10) || 0;
    const idle = parseInt(parts[4], 10) || 0;
    const iowait = parseInt(parts[5], 10) || 0;
    const irq = parseInt(parts[6], 10) || 0;
    const softirq = parseInt(parts[7], 10) || 0;
    const steal = parseInt(parts[8], 10) || 0;

    const total = user + nice + system + idle + iowait + irq + softirq + steal;
    return { user, nice, system, idle, iowait, irq, softirq, steal, total };
  } catch {
    return null;
  }
}

// Calculate CPU usage percentage from /proc/stat
function getCpuUsageFromProcStat(): number {
  const current = readProcStat();
  if (!current) return 0;

  if (!previousCpuStats) {
    previousCpuStats = current;
    return 0;
  }

  const prevTotal = previousCpuStats.total;
  const currTotal = current.total;
  const prevIdle = previousCpuStats.idle + previousCpuStats.iowait;
  const currIdle = current.idle + current.iowait;

  const totalDiff = currTotal - prevTotal;
  const idleDiff = currIdle - prevIdle;

  previousCpuStats = current;

  if (totalDiff === 0) return 0;

  const usagePercent = 100 * (1 - idleDiff / totalDiff);
  return Math.round(Math.max(0, Math.min(100, usagePercent)));
}

// Read memory info from /proc/meminfo
interface MemInfo {
  total: number;
  free: number;
  available: number;
  buffers: number;
  cached: number;
  used: number;
  usagePercent: number;
}

function readProcMemInfo(): MemInfo | null {
  try {
    const meminfo = fs.readFileSync('/proc/meminfo', 'utf-8');
    const lines = meminfo.split('\n');
    
    let total = 0;
    let free = 0;
    let available = 0;
    let buffers = 0;
    let cached = 0;

    for (const line of lines) {
      if (line.startsWith('MemTotal:')) {
        total = parseInt(line.split(/\s+/)[1], 10) * 1024; // Convert KB to bytes
      } else if (line.startsWith('MemFree:')) {
        free = parseInt(line.split(/\s+/)[1], 10) * 1024;
      } else if (line.startsWith('MemAvailable:')) {
        available = parseInt(line.split(/\s+/)[1], 10) * 1024;
      } else if (line.startsWith('Buffers:')) {
        buffers = parseInt(line.split(/\s+/)[1], 10) * 1024;
      } else if (line.startsWith('Cached:')) {
        cached = parseInt(line.split(/\s+/)[1], 10) * 1024;
      }
    }

    // Calculate used memory (total - available is most accurate for user perspective)
    const used = total - available;
    const usagePercent = total > 0 ? Math.round((used / total) * 100) : 0;

    return { total, free, available, buffers, cached, used, usagePercent };
  } catch {
    return null;
  }
}

interface DiskInfo {
  filesystem: string;
  size: string;
  used: string;
  available: string;
  usePercent: number;
  mountpoint: string;
}

interface SystemStats {
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
  disk: DiskInfo[];
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

// Calculate CPU usage by sampling /proc/stat
function getCpuUsage(): number {
  try {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      const times = cpu.times;
      totalTick += times.user + times.nice + times.sys + times.idle + times.irq;
      totalIdle += times.idle;
    }

    // Return estimated usage (inverse of idle percentage)
    const idlePercent = (totalIdle / totalTick) * 100;
    return Math.round(100 - idlePercent);
  } catch {
    return 0;
  }
}

// Get disk usage using df command
function getDiskInfo(): DiskInfo[] {
  try {
    const output = execSync('df -h --output=source,size,used,avail,pcent,target 2>/dev/null | tail -n +2', {
      encoding: 'utf-8',
      timeout: 5000,
    });

    const lines = output.trim().split('\n');
    const disks: DiskInfo[] = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 6) {
        const [filesystem, size, used, available, pcent, mountpoint] = parts;
        // Filter to real filesystems (skip tmpfs, devtmpfs, etc.)
        if (
          filesystem.startsWith('/dev/') &&
          !mountpoint.startsWith('/boot') &&
          !mountpoint.includes('/snap/')
        ) {
          disks.push({
            filesystem,
            size,
            used,
            available,
            usePercent: parseInt(pcent.replace('%', ''), 10) || 0,
            mountpoint,
          });
        }
      }
    }

    return disks;
  } catch {
    return [];
  }
}

// Check OpenClaw gateway status
async function getGatewayStatus(): Promise<SystemStats['gateway']> {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${gatewayUrl}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      return { status: 'online', url: gatewayUrl };
    }
    return { status: 'offline', url: gatewayUrl, error: `HTTP ${res.status}` };
  } catch (err) {
    return {
      status: 'offline',
      url: gatewayUrl,
      error: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}

// GET /api/system/health - Get health status with proc-based monitoring
systemRouter.get('/health', async (c) => {
  const cpus = os.cpus();
  
  // Read from /proc/stat and /proc/meminfo
  const cpuUsage = getCpuUsageFromProcStat();
  const memInfo = readProcMemInfo();
  const diskInfo = getDiskInfo();

  // Determine health status and alerts
  const alerts: string[] = [];
  
  if (cpuUsage > 90) {
    alerts.push('CPU usage is critically high (>90%)');
  } else if (cpuUsage > 80) {
    alerts.push('CPU usage is high (>80%)');
  }

  const memUsagePercent = memInfo?.usagePercent ?? Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
  if (memUsagePercent > 90) {
    alerts.push('Memory usage is critically high (>90%)');
  } else if (memUsagePercent > 80) {
    alerts.push('Memory usage is high (>80%)');
  }

  // Check disk usage
  for (const disk of diskInfo) {
    if (disk.usePercent > 90) {
      alerts.push(`Disk ${disk.mountpoint} is critically full (${disk.usePercent}%)`);
    } else if (disk.usePercent > 80) {
      alerts.push(`Disk ${disk.mountpoint} is nearly full (${disk.usePercent}%)`);
    }
  }

  const status = alerts.length === 0 ? 'healthy' : alerts.some(a => a.includes('critically')) ? 'critical' : 'warning';

  const health = {
    status,
    alerts: alerts.length > 0 ? alerts : undefined,
    cpu: {
      model: cpus[0]?.model || 'Unknown',
      cores: cpus.length,
      usagePercent: cpuUsage,
      loadAvg: os.loadavg(),
      // Raw /proc/stat data for advanced users
      procStat: readProcStat(),
    },
    memory: memInfo || {
      total: os.totalmem(),
      used: os.totalmem() - os.freemem(),
      free: os.freemem(),
      available: os.freemem(),
      buffers: 0,
      cached: 0,
      usagePercent: memUsagePercent,
    },
    disk: diskInfo,
    uptime: os.uptime(),
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    timestamp: new Date().toISOString(),
  };

  return c.json(health);
});

// GET /api/system - Get system stats (legacy endpoint)
systemRouter.get('/', async (c) => {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const [gatewayStatus, diskInfo] = await Promise.all([
    getGatewayStatus(),
    Promise.resolve(getDiskInfo()),
  ]);

  const stats: SystemStats = {
    cpu: {
      model: cpus[0]?.model || 'Unknown',
      cores: cpus.length,
      usagePercent: getCpuUsage(),
      loadAvg: os.loadavg(),
    },
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      usagePercent: Math.round((usedMem / totalMem) * 100),
    },
    disk: diskInfo,
    gateway: gatewayStatus,
    uptime: os.uptime(),
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    timestamp: new Date().toISOString(),
  };

  return c.json(stats);
});

// Session context info from OpenClaw gateway
export interface SessionContextInfo {
  currentTokens: number;
  contextTokens: number;
  percentUsed: number;
  model: string | null;
  updatedAt: number | null;
}

// GET /api/system/session-context - Get main session context tokens
systemRouter.get('/session-context', async (c) => {
  try {
    // Try to get from OpenClaw gateway
    const gatewayPort = process.env.OPENCLAW_GATEWAY_PORT || '18790';
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || '';
    
    // Call the gateway's status endpoint via RPC
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`http://127.0.0.1:${gatewayPort}/api/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(gatewayToken ? { 'Authorization': `Bearer ${gatewayToken}` } : {}),
      },
      body: JSON.stringify({
        method: 'sessions.status',
        params: {},
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      
      // Find the main session (most recent active session)
      const sessions = data?.result?.sessions?.recent || [];
      const mainSession = sessions.find((s: { kind?: string; agentId?: string }) => 
        s.kind === 'main' || s.agentId === 'main'
      ) || sessions[0];

      if (mainSession) {
        const contextInfo: SessionContextInfo = {
          currentTokens: mainSession.totalTokens || 0,
          contextTokens: mainSession.contextTokens || 200000,
          percentUsed: mainSession.percentUsed || 0,
          model: mainSession.model || null,
          updatedAt: mainSession.updatedAt || null,
        };
        return c.json(contextInfo);
      }
    }

    // Fallback: try reading from session store directly
    const sessionData = await getSessionContextFromStore();
    if (sessionData) {
      return c.json(sessionData);
    }

    // Return default/empty values
    return c.json({
      currentTokens: 0,
      contextTokens: 200000,
      percentUsed: 0,
      model: null,
      updatedAt: null,
    });
  } catch (err) {
    console.error('Failed to get session context:', err);
    return c.json({
      currentTokens: 0,
      contextTokens: 200000,
      percentUsed: 0,
      model: null,
      updatedAt: null,
      error: 'Failed to fetch session data',
    }, 500);
  }
});

// Fallback: Read session context from OpenClaw session store
async function getSessionContextFromStore(): Promise<SessionContextInfo | null> {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const os = await import('node:os');
    
    const homeDir = os.homedir();
    const sessionStorePath = path.join(homeDir, '.openclaw-bulbi', 'sessions', 'store.json');
    
    const data = await fs.readFile(sessionStorePath, 'utf-8');
    const store = JSON.parse(data);
    
    // Find the most recent session
    const sessions = Object.entries(store)
      .filter(([key]) => key !== 'global' && key !== 'unknown')
      .map(([key, entry]: [string, unknown]) => {
        const e = entry as { 
          updatedAt?: number; 
          totalTokens?: number; 
          inputTokens?: number; 
          outputTokens?: number;
          contextTokens?: number;
          model?: string;
        };
        const total = e.totalTokens ?? ((e.inputTokens || 0) + (e.outputTokens || 0));
        const ctx = e.contextTokens || 200000;
        return {
          key,
          updatedAt: e.updatedAt || 0,
          totalTokens: total,
          contextTokens: ctx,
          percentUsed: ctx > 0 ? Math.min(999, Math.round((total / ctx) * 100)) : 0,
          model: e.model || null,
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);

    const mainSession = sessions[0];
    if (mainSession) {
      return {
        currentTokens: mainSession.totalTokens,
        contextTokens: mainSession.contextTokens,
        percentUsed: mainSession.percentUsed,
        model: mainSession.model,
        updatedAt: mainSession.updatedAt,
      };
    }
    return null;
  } catch {
    return null;
  }
}
