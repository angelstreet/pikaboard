// @ts-check
import { test, expect } from '@playwright/test';
import { authenticate, login, APP_PATH } from '../helpers/auth.js';

test.describe('Authentication', () => {
  test('should load app when authenticated', async ({ page }) => {
    await login(page);
    await expect(page.locator('body')).not.toBeEmpty();
    // Should see some PikaBoard UI element
    const text = await page.textContent('body');
    expect(text.length).toBeGreaterThan(100);
  });

  test('should persist authentication after reload', async ({ page }) => {
    await login(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    const text = await page.textContent('body');
    expect(text.length).toBeGreaterThan(100);
  });
});
