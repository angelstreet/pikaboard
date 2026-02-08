import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { config } from 'dotenv';

import { authMiddleware } from './middleware/auth.js';
import { tasksRouter } from './routes/tasks.js';
import { boardsRouter } from './routes/boards.js';
import { activityRouter } from './routes/activity.js';
import { cronsRouter } from './routes/crons.js';
import { skillsRouter } from './routes/skills.js';
import { statsRouter } from './routes/stats.js';
import { libraryRouter } from './routes/library.js';
import { goalsRouter } from './routes/goals.js';
import { filesRouter } from './routes/files.js';
import { agentsRouter } from './routes/agents.js';
import { systemRouter } from './routes/system.js';
import { configRouter } from './routes/config.js';
import { insightsRouter } from './routes/insights.js';
import { usageRouter } from './routes/usage.js';
import openclawRoutes from './routes/openclaw.js';
import remindersRoutes from './routes/reminders.js';
import { servicesRouter } from './routes/services.js';
import { initDatabase } from './db/index.js';

config();

const app = new Hono();

// Middleware (skip logger in tests)
if (process.env.NODE_ENV !== 'test') {
  app.use('*', logger());
}
app.use('*', cors());

// Static files (no auth) - serves /public directory
app.use('/widgets/*', serveStatic({ root: './public' }));

// Health check (no auth)
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Protected routes
app.use('/api/*', authMiddleware);

// Mount routers
app.route('/api/tasks', tasksRouter);
app.route('/api/boards', boardsRouter);
app.route('/api/activity', activityRouter);
app.route('/api/crons', cronsRouter);
app.route('/api/skills', skillsRouter);
app.route('/api/stats', statsRouter);
app.route('/api/library', libraryRouter);
app.route('/api/goals', goalsRouter);
app.route('/api/files', filesRouter);
app.route('/api/system', systemRouter);
app.route('/api/agents', agentsRouter);
app.route('/api/config', configRouter);
app.route('/api/insights', insightsRouter);
app.route('/api/usage', usageRouter);
app.route('/api/openclaw', openclawRoutes);
app.route('/api/reminders', remindersRoutes);
app.route('/api/services', servicesRouter);

// Initialize database and start server only when not testing
if (process.env.NODE_ENV !== 'test') {
  initDatabase();

  const port = parseInt(process.env.PORT || '3001', 10);
  console.log(`🚀 PikaBoard API running on http://localhost:${port}`);

  serve({
    fetch: app.fetch,
    port,
  });
}

export { app };
