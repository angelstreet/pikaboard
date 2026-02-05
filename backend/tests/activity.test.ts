import { describe, it, expect } from 'vitest';
import { app } from '../src/index.js';

const authHeader = { Authorization: 'Bearer test-token' };

describe('Activity API', () => {
  describe('GET /api/activity', () => {
    it('returns empty list initially', async () => {
      const res = await app.request('/api/activity', {
        headers: authHeader,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.activity).toEqual([]);
    });
  });

  describe('POST /api/activity', () => {
    it('logs an activity', async () => {
      const res = await app.request('/api/activity', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test_event',
          message: 'Something happened',
          metadata: { key: 'value' },
        }),
      });

      expect(res.status).toBe(201);

      // Verify it's in the list
      const listRes = await app.request('/api/activity', {
        headers: authHeader,
      });
      const body = await listRes.json();
      expect(body.activity.length).toBe(1);
      expect(body.activity[0].type).toBe('test_event');
      expect(body.activity[0].message).toBe('Something happened');
      expect(body.activity[0].metadata).toEqual({ key: 'value' });
    });

    it('returns 400 for missing type', async () => {
      const res = await app.request('/api/activity', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'No type' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing message', async () => {
      const res = await app.request('/api/activity', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test' }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Activity from task mutations', () => {
    it('logs activity when task is created', async () => {
      await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New task' }),
      });

      const res = await app.request('/api/activity?type=task_created', {
        headers: authHeader,
      });
      const body = await res.json();
      expect(body.activity.length).toBe(1);
      expect(body.activity[0].type).toBe('task_created');
    });

    it('logs activity when task is completed', async () => {
      const createRes = await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Complete me' }),
      });
      const created = await createRes.json();

      await app.request(`/api/tasks/${created.id}`, {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      });

      const res = await app.request('/api/activity?type=task_completed', {
        headers: authHeader,
      });
      const body = await res.json();
      expect(body.activity.length).toBe(1);
      expect(body.activity[0].type).toBe('task_completed');
    });

    it('logs activity when task is deleted', async () => {
      const createRes = await app.request('/api/tasks', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Delete me' }),
      });
      const created = await createRes.json();

      await app.request(`/api/tasks/${created.id}`, {
        method: 'DELETE',
        headers: authHeader,
      });

      const res = await app.request('/api/activity?type=task_deleted', {
        headers: authHeader,
      });
      const body = await res.json();
      expect(body.activity.length).toBe(1);
      expect(body.activity[0].type).toBe('task_deleted');
    });
  });
});
