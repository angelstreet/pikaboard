import { Hono } from 'hono';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const appsRouter = new Hono();

const APPS_MD_PATH = resolve(process.cwd(), '..', '..', 'docs', 'apps.md');

function parseAppsMd(content: string) {
  const apps: any[] = [];
  const sections = content.split(/^## /m).slice(1); // skip header before first ##

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const name = lines[0].trim();
    const app: any = { name };

    for (const line of lines.slice(1)) {
      const match = line.match(/^- \*\*(\w+):\*\* (.+)$/);
      if (!match) continue;
      const [, key, value] = match;
      if (value === 'null') {
        app[key] = null;
      } else if (value === 'true') {
        app[key] = true;
      } else if (value === 'false') {
        app[key] = false;
      } else if (key === 'ports') {
        const ports: any = {};
        value.split(', ').forEach(p => {
          const [k, v] = p.split('=');
          ports[k] = parseInt(v);
        });
        app[key] = ports;
      } else {
        app[key] = value;
      }
    }

    apps.push(app);
  }

  return apps;
}

appsRouter.get('/', (c) => {
  try {
    const content = readFileSync(APPS_MD_PATH, 'utf-8');
    return c.json(parseAppsMd(content));
  } catch (e) {
    return c.json([]);
  }
});
