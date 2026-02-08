import { Hono } from 'hono';

export const servicesRouter = new Hono();

interface ServiceDef {
  name: string;
  url: string;
  type: 'internal' | 'external';
}

const SERVICES: ServiceDef[] = [
  { name: 'PikaBoard API', url: 'http://127.0.0.1:3001/health', type: 'internal' },
  { name: 'OpenClaw Gateway', url: 'http://127.0.0.1:18789/openclaw/health', type: 'internal' },
  { name: 'Grafana', url: 'http://127.0.0.1:3000/api/health', type: 'internal' },
  { name: 'Kozy (Backend)', url: 'http://127.0.0.1:3002/', type: 'internal' },
  { name: 'Kompta (Backend)', url: 'http://127.0.0.1:3003/', type: 'internal' },
];

async function checkService(service: ServiceDef): Promise<{ name: string; status: 'up' | 'down'; latencyMs: number; type: string }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(service.url, { signal: controller.signal });
    clearTimeout(timeout);
    const latencyMs = Date.now() - start;
    // Any HTTP response means the service is reachable (even 404)
    return { name: service.name, status: res.status < 500 ? 'up' : 'down', latencyMs, type: service.type };
  } catch {
    return { name: service.name, status: 'down', latencyMs: Date.now() - start, type: service.type };
  }
}

servicesRouter.get('/health', async (c) => {
  const results = await Promise.all(SERVICES.map(checkService));
  return c.json({ services: results, checkedAt: new Date().toISOString() });
});
