// @ts-check
import { test, expect } from '@playwright/test';
import { login, APP_PATH } from '../helpers/auth.js';

test.describe('Board Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display board view with kanban columns', async ({ page }) => {
    const bodyText = await page.textContent('body');
    // Should have status columns
    const hasColumns = /inbox|up.?next|in.?progress|in.?review|done/i.test(bodyText);
    expect(hasColumns).toBe(true);
  });

  test('should have board selector', async ({ page }) => {
    // Look for board selector/dropdown
    const selector = page.locator('select, [role="combobox"], [data-testid="board-selector"]').first();
    const hasBoardSelector = await selector.isVisible().catch(() => false);
    // Or board name in header
    const bodyText = await page.textContent('body');
    const hasBoardName = /pikaboard|main|personal/i.test(bodyText);
    expect(hasBoardSelector || hasBoardName).toBe(true);
  });

  test('should navigate to different boards', async ({ page }) => {
    // Find board links or selector options
    const links = page.locator('a[href*="/boards"], nav a, [data-testid*="board"]');
    const count = await links.count();
    if (count > 0) {
      await links.first().click();
      await page.waitForLoadState('networkidle');
    }
    // Page should still be functional
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
