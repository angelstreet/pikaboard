import { Hono } from 'hono';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const remindersRoutes = new Hono();

export interface Reminder {
  id: string;
  name: string;
  text: string;
  schedule: {
    kind: 'at' | 'every' | 'cron';
    atMs?: number;
    everyMs?: number;
    expr?: string;
    tz?: string;
  };
  channel?: string;
  enabled: boolean;
  nextRun?: number;
  lastRun?: number;
  createdAt: number;
}

// Get all reminders (cron jobs with systemEvent payload)
remindersRoutes.get('/', async (c) => {
  try {
    const { stdout } = await execAsync('openclaw cron list --json');
    const data = JSON.parse(stdout);
    
    // Filter to only reminder-type jobs (systemEvent payloads)
    const reminders = (data.jobs || [])
      .filter((job: any) => job.payload?.kind === 'systemEvent')
      .map((job: any) => ({
        id: job.id,
        name: job.name || 'Reminder',
        text: job.payload?.text || '',
        schedule: job.schedule,
        channel: job.payload?.channel,
        enabled: job.enabled !== false,
        nextRun: job.nextRunMs,
        lastRun: job.lastRunMs,
        createdAt: job.createdAt,
      }));
    
    return c.json({ reminders });
  } catch (error) {
    console.error('Failed to get reminders:', error);
    return c.json({ reminders: [], error: 'Failed to fetch reminders' });
  }
});

// Create a new reminder
remindersRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { text, name, scheduleType, scheduleValue, channel, timezone } = body;
    
    if (!text) {
      return c.json({ error: 'Reminder text is required' }, 400);
    }
    
    // Build schedule object
    let schedule: any = {};
    
    if (scheduleType === 'at') {
      // One-time reminder at specific time
      const atMs = new Date(scheduleValue).getTime();
      if (isNaN(atMs) || atMs < Date.now()) {
        return c.json({ error: 'Invalid or past date' }, 400);
      }
      schedule = { kind: 'at', atMs };
    } else if (scheduleType === 'every') {
      // Recurring interval (value in minutes)
      const minutes = parseInt(scheduleValue, 10);
      if (isNaN(minutes) || minutes < 1) {
        return c.json({ error: 'Invalid interval' }, 400);
      }
      schedule = { kind: 'every', everyMs: minutes * 60 * 1000 };
    } else if (scheduleType === 'cron') {
      // Cron expression
      schedule = { kind: 'cron', expr: scheduleValue, tz: timezone || 'Europe/Zurich' };
    } else {
      return c.json({ error: 'Invalid schedule type' }, 400);
    }
    
    // Build the job config
    const jobConfig = {
      name: name || `Reminder: ${text.substring(0, 30)}...`,
      schedule,
      payload: {
        kind: 'systemEvent',
        text: `🔔 Reminder: ${text}`,
        channel,
      },
      sessionTarget: 'main',
      enabled: true,
    };
    
    // Use openclaw cron add via CLI
    const configJson = JSON.stringify(jobConfig);
    const { stdout } = await execAsync(`openclaw cron add --json '${configJson.replace(/'/g, "'\\''")}'`);
    const result = JSON.parse(stdout);
    
    return c.json({ success: true, id: result.id, reminder: result });
  } catch (error: any) {
    console.error('Failed to create reminder:', error);
    return c.json({ error: error.message || 'Failed to create reminder' }, 500);
  }
});

// Delete a reminder
remindersRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await execAsync(`openclaw cron remove ${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to delete reminder:', error);
    return c.json({ error: 'Failed to delete reminder' }, 500);
  }
});

// Toggle reminder enabled/disabled
remindersRoutes.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { enabled } = body;
    
    await execAsync(`openclaw cron update ${id} --enabled=${enabled}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to update reminder:', error);
    return c.json({ error: 'Failed to update reminder' }, 500);
  }
});

// Trigger reminder immediately
remindersRoutes.post('/:id/trigger', async (c) => {
  try {
    const id = c.req.param('id');
    await execAsync(`openclaw cron run ${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to trigger reminder:', error);
    return c.json({ error: 'Failed to trigger reminder' }, 500);
  }
});

export default remindersRoutes;
