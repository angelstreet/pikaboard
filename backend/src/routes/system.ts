import { Hono } from 'hono';
import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';

export const systemRouter = new Hono();

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

// GET /api/system - Get system stats
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
