import { Hono } from 'hono';
import { execSync } from 'child_process';

export const cronsRouter = new Hono();

// GET /api/crons - List OpenClaw cron jobs
cronsRouter.get('/', (c) => {
  try {
    // Try to get cron list from OpenClaw CLI
    const output = execSync('openclaw cron list --json 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 5000,
    });

    const crons = JSON.parse(output);
    return c.json({ crons });
  } catch (error) {
    // If openclaw CLI not available or fails, return empty list
    console.warn('Could not fetch OpenClaw crons:', error);
    return c.json({
      crons: [],
      warning: 'Could not fetch cron list from OpenClaw',
    });
  }
});
