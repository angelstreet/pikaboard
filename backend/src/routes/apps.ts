import { Hono } from 'hono';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const appsRouter = new Hono();

const APPS_JSON_PATH = resolve(process.cwd(), '..', '..', 'apps.json');

appsRouter.get('/', (c) => {
  try {
    const data = readFileSync(APPS_JSON_PATH, 'utf-8');
    return c.json(JSON.parse(data));
  } catch (e) {
    // Fallback: return empty array if file not found
    return c.json([]);
  }
});
