import { Hono } from 'hono';
import { db } from '../db/index.js';

// Type for question row from database
interface QuestionRow {
  id: number;
  agent: string;
  question: string;
  context: string | null;
  status: string;
  answer: string | null;
  type: string;
  task_id: number | null;
  created_at: string;
  answered_at: string | null;
}

export const questionsRouter = new Hono();

// Initialize questions table if not exists
function ensureQuestionsTable() {
  // Create base table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent TEXT NOT NULL,
      question TEXT NOT NULL,
      context TEXT,
      status TEXT DEFAULT 'pending',
      answer TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      answered_at DATETIME
    )
  `);
  
  // Migration: Add type column if not exists
  try {
    db.prepare('SELECT type FROM questions LIMIT 1').get();
  } catch {
    db.exec(`ALTER TABLE questions ADD COLUMN type TEXT DEFAULT 'question'`);
  }
  
  // Migration: Add task_id column if not exists
  try {
    db.prepare('SELECT task_id FROM questions LIMIT 1').get();
  } catch {
    db.exec(`ALTER TABLE questions ADD COLUMN task_id INTEGER REFERENCES tasks(id)`);
  }
  
  // Update status check constraint - SQLite doesn't support ALTER TABLE for CHECK, 
  // so we just ensure the column allows new status values by recreating
  // For simplicity, we'll handle this at the application level
  
  db.exec(`CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_questions_agent ON questions(agent)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type)`);
}

// Run on module load
ensureQuestionsTable();

// GET /api/questions - List questions (optionally filter by status and type)
questionsRouter.get('/', (c) => {
  const status = c.req.query('status');
  const type = c.req.query('type');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  
  let query = 'SELECT * FROM questions';
  const params: (string | number)[] = [];
  const conditions: string[] = [];
  
  if (status && ['pending', 'answered', 'approved', 'rejected'].includes(status)) {
    conditions.push('status = ?');
    params.push(status);
  }
  
  if (type && ['question', 'approval'].includes(type)) {
    conditions.push('type = ?');
    params.push(type);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
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

// POST /api/questions - Agent submits a question or approval
questionsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const { agent, type, question, context, task_id } = body as { 
    agent: string; 
    type?: 'question' | 'approval';
    question: string; 
    context?: string;
    task_id?: number;
  };
  
  if (!agent || !question) {
    return c.json({ error: 'Agent and question are required' }, 400);
  }
  
  const questionType = type === 'approval' ? 'approval' : 'question';
  
  const stmt = db.prepare(`
    INSERT INTO questions (agent, type, question, context, task_id, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `);
  
  const result = stmt.run(agent, questionType, question, context || null, task_id || null);
  const id = result.lastInsertRowid;
  
  // Auto-create inbox task for visibility on the board
  const prefix = questionType === 'approval' ? '[APPROVAL]' : '[QUESTION]';
  const taskName = `${prefix} ${question.length > 80 ? question.slice(0, 80) + '...' : question}`;
  const taskDescription = `**From:** ${agent}\n**Type:** ${questionType}\n**Question:** ${question}${context ? `\n**Context:** ${context}` : ''}${task_id ? `\n**Linked task:** #${task_id}` : ''}\n\n*Auto-created from question #${id}*`;
  
  // Get default board (first board)
  const defaultBoard = db.prepare('SELECT id FROM boards ORDER BY position, id LIMIT 1').get() as { id: number } | undefined;
  
  const taskStmt = db.prepare(`
    INSERT INTO tasks (name, description, status, priority, board_id, created_at, updated_at)
    VALUES (?, ?, 'inbox', 'medium', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  const taskResult = taskStmt.run(taskName, taskDescription, defaultBoard?.id || null);
  
  // Link question to the auto-created task if it wasn't already linked
  if (!task_id) {
    db.prepare('UPDATE questions SET task_id = ? WHERE id = ?').run(taskResult.lastInsertRowid, id);
  }
  
  const created = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  
  const itemType = questionType === 'approval' ? 'Approval' : 'Question';
  return c.json({ 
    success: true, 
    question: created,
    inbox_task_id: Number(taskResult.lastInsertRowid),
    message: `${itemType} from ${agent} submitted (inbox task #${taskResult.lastInsertRowid} created)`,
  }, 201);
});

// PATCH /api/questions/:id - Answer a question or update type
questionsRouter.patch('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json();
  const { answer, type, question } = body as { answer?: string; type?: 'question' | 'approval'; question?: string };
  
  if (!answer && !type && !question) {
    return c.json({ error: 'Answer, type, or question text is required' }, 400);
  }
  
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as QuestionRow | undefined;
  
  if (!existing) {
    return c.json({ error: 'Question not found' }, 404);
  }
  
  // Build update dynamically
  const updates: string[] = [];
  const params: (string | number)[] = [];
  
  if (answer) {
    updates.push("answer = ?", "status = 'answered'", "answered_at = CURRENT_TIMESTAMP");
    params.push(answer);
  }
  if (type && ['question', 'approval'].includes(type)) {
    updates.push("type = ?");
    params.push(type);
  }
  if (question) {
    updates.push("question = ?");
    params.push(question);
  }
  
  params.push(id);
  const stmt = db.prepare(`UPDATE questions SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  
  const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  
  return c.json({ 
    success: true, 
    question: updated,
    message: 'Question answered',
  });
});

// POST /api/questions/:id/approve - Approve an approval request
questionsRouter.post('/:id/approve', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json();
  const { comment } = body as { comment?: string };
  
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as QuestionRow | undefined;
  
  if (!existing) {
    return c.json({ error: 'Approval request not found' }, 404);
  }
  
  if (existing.type !== 'approval') {
    return c.json({ error: 'This item is not an approval request' }, 400);
  }
  
  const answerText = comment ? `Approved: ${comment}` : 'Approved';
  
  const stmt = db.prepare(`
    UPDATE questions 
    SET answer = ?, status = 'approved', answered_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  stmt.run(answerText, id);
  
  const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  
  return c.json({ 
    success: true, 
    question: updated,
    message: 'Approval request approved',
  });
});

// POST /api/questions/:id/reject - Reject an approval request
questionsRouter.post('/:id/reject', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json();
  const { comment } = body as { comment?: string };
  
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as QuestionRow | undefined;
  
  if (!existing) {
    return c.json({ error: 'Approval request not found' }, 404);
  }
  
  if (existing.type !== 'approval') {
    return c.json({ error: 'This item is not an approval request' }, 400);
  }
  
  const answerText = comment ? `Rejected: ${comment}` : 'Rejected';
  
  const stmt = db.prepare(`
    UPDATE questions 
    SET answer = ?, status = 'rejected', answered_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  stmt.run(answerText, id);
  
  const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  
  return c.json({ 
    success: true, 
    question: updated,
    message: 'Approval request rejected',
  });
});

// DELETE /api/questions/:id - Delete a question
questionsRouter.delete('/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as QuestionRow | undefined;
  
  if (!existing) {
    return c.json({ error: 'Question not found' }, 404);
  }
  
  db.prepare('DELETE FROM questions WHERE id = ?').run(id);
  
  return c.json({ success: true, message: 'Question deleted' });
});

// POST /api/questions/cleanup - Auto-close questions linked to done/rejected tasks
questionsRouter.post('/cleanup', (c) => {
  // Find pending questions/approvals with task_id where task is done or rejected
  const staleQuestions = db.prepare(`
    SELECT q.id, q.question, q.task_id, t.status as task_status, t.name as task_name
    FROM questions q
    JOIN tasks t ON q.task_id = t.id
    WHERE q.status = 'pending'
    AND t.status IN ('done', 'archived')
  `).all() as Array<{ id: number; question: string; task_id: number; task_status: string; task_name: string }>;
  
  let closed = 0;
  for (const q of staleQuestions) {
    db.prepare(`
      UPDATE questions 
      SET status = 'auto_closed', 
          answer = ?,
          answered_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(`Auto-closed: linked task #${q.task_id} is ${q.task_status}`, q.id);
    closed++;
  }
  
  return c.json({ 
    success: true, 
    closed,
    details: staleQuestions.map(q => ({
      id: q.id,
      question: q.question,
      task_id: q.task_id,
      task_status: q.task_status
    }))
  });
});
