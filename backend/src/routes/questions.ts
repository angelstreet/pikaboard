import { Hono } from 'hono';
import { db } from '../db/index.js';

export const questionsRouter = new Hono();

// Initialize questions table if not exists
function ensureQuestionsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent TEXT NOT NULL,
      question TEXT NOT NULL,
      context TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'answered')),
      answer TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      answered_at DATETIME
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_questions_agent ON questions(agent)`);
}

// Run on module load
ensureQuestionsTable();

// GET /api/questions - List questions (optionally filter by status)
questionsRouter.get('/', (c) => {
  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  
  let query = 'SELECT * FROM questions';
  const params: (string | number)[] = [];
  
  if (status && (status === 'pending' || status === 'answered')) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  
  const questions = db.prepare(query).all(...params);
  
  return c.json({ questions });
});

// GET /api/questions/:id - Get a single question
questionsRouter.get('/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  
  if (!question) {
    return c.json({ error: 'Question not found' }, 404);
  }
  
  return c.json(question);
});

// POST /api/questions - Agent submits a question
questionsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const { agent, question, context } = body as { 
    agent: string; 
    question: string; 
    context?: string;
  };
  
  if (!agent || !question) {
    return c.json({ error: 'Agent and question are required' }, 400);
  }
  
  const stmt = db.prepare(`
    INSERT INTO questions (agent, question, context, status)
    VALUES (?, ?, ?, 'pending')
  `);
  
  const result = stmt.run(agent, question, context || null);
  const id = result.lastInsertRowid;
  
  const created = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  
  return c.json({ 
    success: true, 
    question: created,
    message: `Question from ${agent} submitted`,
  }, 201);
});

// PATCH /api/questions/:id - Answer a question
questionsRouter.patch('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json();
  const { answer } = body as { answer: string };
  
  if (!answer) {
    return c.json({ error: 'Answer is required' }, 400);
  }
  
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  
  if (!existing) {
    return c.json({ error: 'Question not found' }, 404);
  }
  
  const stmt = db.prepare(`
    UPDATE questions 
    SET answer = ?, status = 'answered', answered_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  stmt.run(answer, id);
  
  const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  
  return c.json({ 
    success: true, 
    question: updated,
    message: 'Question answered',
  });
});

// DELETE /api/questions/:id - Delete a question
questionsRouter.delete('/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  
  if (!existing) {
    return c.json({ error: 'Question not found' }, 404);
  }
  
  db.prepare('DELETE FROM questions WHERE id = ?').run(id);
  
  return c.json({ success: true, message: 'Question deleted' });
});
