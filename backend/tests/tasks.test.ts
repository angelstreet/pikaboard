import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../src/index.js';

const authHeader = { Authorization: 'Bearer test-token' };

describe('Tasks API', () => {
  describe('GET /api/tasks', () => {
    it('returns empty list initially', async () => {
      const res = await app.request('/api/tasks', {
        headers: authHeader,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.tasks).toEqual([]);
    });

    it('returns 401 without auth', async () => {
      const res = await app.request('/api/tasks');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/tasks', () => {
    it('creates a task with minimal fields', async () => {
      const res = await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test task' }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe('Test task');
      expect(body.status).toBe('inbox');
      expect(body.priority).toBe('medium');
      expect(body.id).toBeDefined();
    });

    it('creates a task with all fields', async () => {
      const res = await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Full task',
          description: 'A detailed description',
          status: 'up_next',
          priority: 'high',
          tags: ['work', 'urgent'],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe('Full task');
      expect(body.description).toBe('A detailed description');
      expect(body.status).toBe('up_next');
      expect(body.priority).toBe('high');
      expect(body.tags).toEqual(['work', 'urgent']);
    });

    it('returns 400 for missing name', async () => {
      const res = await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid status', async () => {
      const res = await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', status: 'invalid' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid priority', async () => {
      const res = await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', priority: 'super-urgent' }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('returns a specific task', async () => {
      // Create task first
      const createRes = await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Find me' }),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/tasks/${created.id}`, {
        headers: authHeader,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('Find me');
    });

    it('returns 404 for non-existent task', async () => {
      const res = await app.request('/api/tasks/99999', {
        headers: authHeader,
      });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('updates task name', async () => {
      const createRes = await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Original' }),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/tasks/${created.id}`, {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('Updated');
    });

    it('updates task status and sets completed_at when done', async () => {
      const createRes = await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Complete me' }),
      });
      const created = await createRes.json();
      expect(created.completed_at).toBeNull();

      const res = await app.request(`/api/tasks/${created.id}`, {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('done');
      expect(body.completed_at).not.toBeNull();
    });

    it('returns 404 for non-existent task', async () => {
      const res = await app.request('/api/tasks/99999', {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });
      expect(res.status).toBe(404);
    });

    it('returns 400 for empty update', async () => {
      const createRes = await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/tasks/${created.id}`, {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('deletes a task', async () => {
      const createRes = await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Delete me' }),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/tasks/${created.id}`, {
        method: 'DELETE',
        headers: authHeader,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Verify it's gone
      const getRes = await app.request(`/api/tasks/${created.id}`, {
        headers: authHeader,
      });
      expect(getRes.status).toBe(404);
    });

    it('returns 404 for non-existent task', async () => {
      const res = await app.request('/api/tasks/99999', {
        method: 'DELETE',
        headers: authHeader,
      });
      expect(res.status).toBe(404);
    });
  });

  describe('Task filtering', () => {
    beforeEach(async () => {
      // Create tasks with different statuses
      await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Task 1', status: 'inbox' }),
      });
      await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Task 2', status: 'up_next' }),
      });
      await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Task 3', status: 'inbox', priority: 'high' }),
      });
    });

    it('filters by status', async () => {
      const res = await app.request('/api/tasks?status=inbox', {
        headers: authHeader,
      });
      const body = await res.json();
      expect(body.tasks.length).toBe(2);
      expect(body.tasks.every((t: { status: string }) => t.status === 'inbox')).toBe(true);
    });

    it('filters by priority', async () => {
      const res = await app.request('/api/tasks?priority=high', {
        headers: authHeader,
      });
      const body = await res.json();
      expect(body.tasks.length).toBe(1);
      expect(body.tasks[0].priority).toBe('high');
    });
  });
});
