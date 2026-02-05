import { describe, it, expect } from 'vitest';
import { app } from '../src/index.js';

describe('Auth Middleware', () => {
  it('allows requests with valid token', async () => {
    const res = await app.request('/api/tasks', {
      headers: { Authorization: 'Bearer test-token' },
    });
    expect(res.status).toBe(200);
  });

  it('rejects requests without auth header', async () => {
    const res = await app.request('/api/tasks');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Missing Authorization header');
  });

  it('rejects requests with invalid token', async () => {
    const res = await app.request('/api/tasks', {
      headers: { Authorization: 'Bearer wrong-token' },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Invalid token');
  });

  it('rejects requests with wrong scheme', async () => {
    const res = await app.request('/api/tasks', {
      headers: { Authorization: 'Basic test-token' },
    });
    expect(res.status).toBe(401);
  });

  it('allows health check without auth', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
