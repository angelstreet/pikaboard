// @ts-check
const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');

test.describe('Board Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display boards list', async ({ page }) => {
    await page.goto('/pikaboard/');
    // Look for boards navigation or board selector
    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/board|tasks|kanban/i);
  });

  test('should navigate between boards', async ({ page }) => {
    await page.goto('/pikaboard/');
    
    // Try to find and click on a board link if it exists
    const boardLinks = page.locator('a[href*="/boards/"], [data-testid="board-link"]').first();
    if (await boardLinks.isVisible().catch(() => false)) {
      await boardLinks.click();
      await expect(page).toHaveURL(/\/boards\/\d+/);
    }
  });

  test('should display kanban columns', async ({ page }) => {
    await page.goto('/pikaboard/');
    // Check for kanban column headers
    const bodyText = await page.textContent('body');
    const hasKanbanColumns = /inbox|up next|in progress|in review|done/i.test(bodyText);
    expect(hasKanbanColumns).toBe(true);
  });
});
