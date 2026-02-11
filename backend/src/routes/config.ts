import { Hono } from 'hono';
import os from 'os';
import path from 'path';
import fs from 'fs';

export const configRouter = new Hono();

interface WorkspaceConfig {
  workspace: {
    path: string;
    exists: boolean;
  };
  api: {
    baseUrl: string;
    tokenMasked: string;
  };
  gateway: {
    url: string;
  };
  environment: {
    nodeEnv: string;
    platform: string;
    hostname: string;
    user: string;
  };
  pikaboard: {
    version: string;
    port: number;
  };
}

// Mask a token showing first 4 and last 4 chars
function maskToken(token: string): string {
  if (!token || token.length < 12) return '****';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

// GET /api/config - Get workspace configuration (read-only)
configRouter.get('/', (c) => {
  const homeDir = os.homedir();
  const workspacePath = process.env.OPENCLAW_WORKSPACE || path.join(homeDir, '.openclaw', 'workspace');
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
  const apiToken = process.env.PIKABOARD_API_TOKEN || process.env.PIKABOARD_TOKEN || '';
  const port = parseInt(process.env.PORT || '3001', 10);

  // Try to read version from package.json
  let version = '0.1.0';
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      version = pkg.version || version;
    }
  } catch {
    // Ignore
  }

  const config: WorkspaceConfig = {
    workspace: {
      path: workspacePath,
      exists: fs.existsSync(workspacePath),
    },
    api: {
      baseUrl: `/api`,
      tokenMasked: maskToken(apiToken),
    },
    gateway: {
      url: gatewayUrl,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      platform: `${os.type()} ${os.release()}`,
      hostname: os.hostname(),
      user: os.userInfo().username,
    },
    pikaboard: {
      version,
      port,
    },
  };

  return c.json(config);
});
