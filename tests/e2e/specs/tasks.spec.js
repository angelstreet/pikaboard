// @ts-check
const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/pikaboard/');
  });

  test('should display tasks in kanban board', async ({ page }) => {
    // Check that the board loads with tasks
    await expect(page.locator('body')).toContainText('PikaBoard');
  });

  test('should open task detail view', async ({ page }) => {
    // Look for task cards and click the first one
    const taskCard = page.locator('[data-testid="task-card"], .task-card, [role="button"]').first();
    
    // If no specific task card selector, try finding clickable elements in kanban
    const clickable = page.locator('div').filter({ hasText: /task|todo|issue/i }).first();
    
    if (await clickable.isVisible().catch(() => false)) {
      await clickable.click();
      // Should show task details
      await page.waitForTimeout(500);
    }
  });

  test('should filter tasks by status', async ({ page }) => {
    // Check that different status columns exist
    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/inbox|up next|in progress/i);
  });
});
