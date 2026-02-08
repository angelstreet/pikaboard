import { Hono } from 'hono';
import { db, logActivity } from '../db/index.js';

export const activityRouter = new Hono();

interface Activity {
  id: number;
  type: string;
  message: string;
  metadata: string | null;
  created_at: string;
}

interface CreateActivityBody {
  type: string;
  message: string;
  metadata?: object;
}

// GET /api/activity - List recent activity
activityRouter.get('/', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const type = c.req.query('type');

  let query = 'SELECT * FROM activity WHERE 1=1';
  const params: (string | number)[] = [];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await db.execute({ sql: query, args: params });
  const activities = result.rows as unknown as Activity[];

  // Parse metadata JSON
  const parsed = activities.map((a) => ({
    ...a,
    metadata: a.metadata ? JSON.parse(a.metadata) : null,
  }));

  return c.json({ activity: parsed });
});

// POST /api/activity - Log activity (internal use)
activityRouter.post('/', async (c) => {
  const body = await c.req.json<CreateActivityBody>();

  if (!body.type || !body.message) {
    return c.json({ error: 'Type and message are required' }, 400);
  }

  await logActivity(body.type, body.message, body.metadata);

  return c.json({ success: true }, 201);
});
