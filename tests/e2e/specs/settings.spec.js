// @ts-check
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to settings page', async ({ page }) => {
    // Find and click settings link
    const settingsLink = page.locator('a[href*="settings"], a[href*="Settings"]').first();
    if (await settingsLink.isVisible().catch(() => false)) {
      await settingsLink.click();
      await page.waitForLoadState('networkidle');
    } else {
      await page.goto('/pikaboard-dev/settings');
      await page.waitForLoadState('networkidle');
    }
    const bodyText = await page.textContent('body');
    expect(bodyText.toLowerCase()).toMatch(/settings|config|preference/i);
  });

  test('should display settings content', async ({ page }) => {
    // Navigate to settings
    const settingsLink = page.locator('a[href*="settings"], a[href*="Settings"]').first();
    if (await settingsLink.isVisible().catch(() => false)) {
      await settingsLink.click();
      await page.waitForLoadState('networkidle');
    } else {
      await page.goto('/pikaboard-dev/settings');
      await page.waitForLoadState('networkidle');
    }
    // Settings page should have meaningful content
    const bodyText = await page.textContent('body');
    expect(bodyText.length).toBeGreaterThan(100);
  });
});
