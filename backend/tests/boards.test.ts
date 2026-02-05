import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../src/index.js';
import { db } from '../src/db/index.js';

const authHeader = { Authorization: 'Bearer test-token' };

describe('Boards API', () => {
  describe('GET /api/boards', () => {
    it('returns default board initially', async () => {
      const res = await app.request('/api/boards', {
        headers: authHeader,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.boards.length).toBe(1);
      expect(body.boards[0].name).toBe('Main');
      expect(body.boards[0].icon).toBe('⚡');
    });

    it('returns 401 without auth', async () => {
      const res = await app.request('/api/boards');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/boards', () => {
    it('creates a board with minimal fields', async () => {
      const res = await app.request('/api/boards', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Work' }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe('Work');
      expect(body.icon).toBe('📋'); // default
      expect(body.color).toBe('blue'); // default
      expect(body.id).toBeDefined();
    });

    it('creates a board with all fields', async () => {
      const res = await app.request('/api/boards', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Personal',
          icon: '🏠',
          color: 'green',
          position: 5,
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe('Personal');
      expect(body.icon).toBe('🏠');
      expect(body.color).toBe('green');
      expect(body.position).toBe(5);
    });

    it('returns 400 for missing name', async () => {
      const res = await app.request('/api/boards', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for empty name', async () => {
      const res = await app.request('/api/boards', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '  ' }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/boards/:id', () => {
    it('returns a specific board', async () => {
      // Create board first
      const createRes = await app.request('/api/boards', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Find me', icon: '🔍' }),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/boards/${created.id}`, {
        headers: authHeader,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('Find me');
      expect(body.icon).toBe('🔍');
    });

    it('returns 404 for non-existent board', async () => {
      const res = await app.request('/api/boards/99999', {
        headers: authHeader,
      });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/boards/:id', () => {
    it('updates board name', async () => {
      const createRes = await app.request('/api/boards', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Original' }),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/boards/${created.id}`, {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('Updated');
    });

    it('updates board icon and color', async () => {
      const createRes = await app.request('/api/boards', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Board' }),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/boards/${created.id}`, {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon: '🚀', color: 'purple' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.icon).toBe('🚀');
      expect(body.color).toBe('purple');
    });

    it('returns 404 for non-existent board', async () => {
      const res = await app.request('/api/boards/99999', {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });
      expect(res.status).toBe(404);
    });

    it('returns 400 for empty update', async () => {
      const createRes = await app.request('/api/boards', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/boards/${created.id}`, {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for empty name', async () => {
      const createRes = await app.request('/api/boards', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/boards/${created.id}`, {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/boards/:id', () => {
    it('deletes a board and moves tasks to another board', async () => {
      // Create second board
      const createRes = await app.request('/api/boards', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Delete me' }),
      });
      const toDelete = await createRes.json();

      // Create a task in that board
      await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test task', board_id: toDelete.id }),
      });

      // Delete board
      const res = await app.request(`/api/boards/${toDelete.id}`, {
        method: 'DELETE',
        headers: authHeader,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Verify board is gone
      const getRes = await app.request(`/api/boards/${toDelete.id}`, {
        headers: authHeader,
      });
      expect(getRes.status).toBe(404);

      // Verify task was moved to default board
      const tasksRes = await app.request('/api/tasks', {
        headers: authHeader,
      });
      const tasks = await tasksRes.json();
      expect(tasks.tasks[0].board_id).toBe(1); // default board
    });

    it('deletes a board and its tasks when deleteTasks=true', async () => {
      // Create second board
      const createRes = await app.request('/api/boards', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Delete me' }),
      });
      const toDelete = await createRes.json();

      // Create a task in that board
      await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Delete me too', board_id: toDelete.id }),
      });

      // Delete board with tasks
      const res = await app.request(`/api/boards/${toDelete.id}?deleteTasks=true`, {
        method: 'DELETE',
        headers: authHeader,
      });

      expect(res.status).toBe(200);

      // Verify task was deleted
      const tasksRes = await app.request('/api/tasks', {
        headers: authHeader,
      });
      const tasks = await tasksRes.json();
      expect(tasks.tasks.length).toBe(0);
    });

    it('returns 404 for non-existent board', async () => {
      const res = await app.request('/api/boards/99999', {
        method: 'DELETE',
        headers: authHeader,
      });
      expect(res.status).toBe(404);
    });

    it('returns 400 when trying to delete last board', async () => {
      // Get default board
      const boardsRes = await app.request('/api/boards', {
        headers: authHeader,
      });
      const boards = await boardsRes.json();
      const defaultBoard = boards.boards[0];

      const res = await app.request(`/api/boards/${defaultBoard.id}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('last board');
    });
  });

  describe('GET /api/boards/:id/tasks', () => {
    it('returns tasks for a specific board', async () => {
      // Get default board
      const boardsRes = await app.request('/api/boards', {
        headers: authHeader,
      });
      const boards = await boardsRes.json();
      const boardId = boards.boards[0].id;

      // Create tasks
      await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Task 1', board_id: boardId }),
      });
      await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Task 2', board_id: boardId }),
      });

      const res = await app.request(`/api/boards/${boardId}/tasks`, {
        headers: authHeader,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.tasks.length).toBe(2);
      expect(body.board.id).toBe(boardId);
    });

    it('filters tasks by status', async () => {
      const boardsRes = await app.request('/api/boards', {
        headers: authHeader,
      });
      const boards = await boardsRes.json();
      const boardId = boards.boards[0].id;

      await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Inbox task', status: 'inbox', board_id: boardId }),
      });
      await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Done task', status: 'done', board_id: boardId }),
      });

      const res = await app.request(`/api/boards/${boardId}/tasks?status=inbox`, {
        headers: authHeader,
      });
      const body = await res.json();
      expect(body.tasks.length).toBe(1);
      expect(body.tasks[0].status).toBe('inbox');
    });

    it('returns 404 for non-existent board', async () => {
      const res = await app.request('/api/boards/99999/tasks', {
        headers: authHeader,
      });
      expect(res.status).toBe(404);
    });
  });
});

describe('Tasks with Boards', () => {
  it('creates task in default board when board_id not specified', async () => {
    const res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test task' }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.board_id).toBe(1); // default board
  });

  it('creates task in specified board', async () => {
    // Create new board
    const boardRes = await app.request('/api/boards', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Work' }),
    });
    const board = await boardRes.json();

    const res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Work task', board_id: board.id }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.board_id).toBe(board.id);
  });

  it('returns 400 for invalid board_id', async () => {
    const res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test task', board_id: 99999 }),
    });
    expect(res.status).toBe(400);
  });

  it('can move task to different board', async () => {
    // Create second board
    const boardRes = await app.request('/api/boards', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Other Board' }),
    });
    const otherBoard = await boardRes.json();

    // Create task in default board
    const taskRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Move me' }),
    });
    const task = await taskRes.json();
    expect(task.board_id).toBe(1);

    // Move to other board
    const updateRes = await app.request(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_id: otherBoard.id }),
    });
    const updated = await updateRes.json();
    expect(updated.board_id).toBe(otherBoard.id);
  });

  it('filters tasks by board_id', async () => {
    // Create second board
    const boardRes = await app.request('/api/boards', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Other' }),
    });
    const otherBoard = await boardRes.json();

    // Create tasks in different boards
    await app.request('/api/tasks', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Task in main' }),
    });
    await app.request('/api/tasks', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Task in other', board_id: otherBoard.id }),
    });

    // Filter by board
    const res = await app.request(`/api/tasks?board_id=${otherBoard.id}`, {
      headers: authHeader,
    });
    const body = await res.json();
    expect(body.tasks.length).toBe(1);
    expect(body.tasks[0].name).toBe('Task in other');
  });
});
