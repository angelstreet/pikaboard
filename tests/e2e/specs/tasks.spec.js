// @ts-check
import { test, expect } from '@playwright/test';
import { login, PIKABOARD_TOKEN } from '../helpers/auth.js';

const API_BASE = 'http://127.0.0.1:3001/api';
const headers = { 'Authorization': `Bearer ${PIKABOARD_TOKEN}`, 'Content-Type': 'application/json' };

test.describe('Task CRUD Operations', () => {
  let testTaskId;

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display tasks on the board', async ({ page }) => {
    const bodyText = await page.textContent('body');
    // Board should show some task content
    expect(bodyText.length).toBeGreaterThan(200);
  });

  test('should create and retrieve a task via API', async ({ request }) => {
    // Create task via API
    const res = await request.post(`${API_BASE}/tasks`, {
      headers,
      data: { name: 'E2E Test Task - Delete Me', status: 'inbox', priority: 'low', board_id: 6 },
    });
    expect(res.ok()).toBeTruthy();
    const task = await res.json();
    testTaskId = task.id;
    expect(task.name).toBe('E2E Test Task - Delete Me');

    // Verify task exists via API GET
    const getRes = await request.get(`${API_BASE}/tasks?board_id=6&status=inbox`, { headers });
    expect(getRes.ok()).toBeTruthy();
    const data = await getRes.json();
    const found = data.tasks.some(t => t.id === testTaskId);
    expect(found).toBe(true);
  });

  test('should update task status via API', async ({ request }) => {
    if (!testTaskId) test.skip();
    const res = await request.patch(`${API_BASE}/tasks/${testTaskId}`, {
      headers,
      data: { status: 'up_next' },
    });
    expect(res.ok()).toBeTruthy();
    const task = await res.json();
    expect(task.status).toBe('up_next');
  });

  test('should delete test task via API', async ({ request }) => {
    if (!testTaskId) test.skip();
    const res = await request.delete(`${API_BASE}/tasks/${testTaskId}`, { headers });
    expect(res.ok()).toBeTruthy();
  });
});
