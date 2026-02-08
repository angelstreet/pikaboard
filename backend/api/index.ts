import { handle } from '@hono/node-server/vercel';
import { app } from '../src/index.js';
import { initDatabase } from '../src/db/index.js';

// Initialize database on cold start
await initDatabase();

export default handle(app);
