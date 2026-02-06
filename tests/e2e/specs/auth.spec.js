// @ts-check
const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');

test.describe('Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/pikaboard/');
    // Should show login or unauthorized
    const body = await page.textContent('body');
    expect(body).toMatch(/login|unauthorized|auth|token/i);
  });

  test('should load app when authenticated', async ({ page }) => {
    await login(page);
    // Verify main elements are present
    await expect(page.locator('body')).toContainText('PikaBoard');
  });

  test('should persist authentication after reload', async ({ page }) => {
    await login(page);
    await page.reload();
    await expect(page.locator('body')).toContainText('PikaBoard');
  });
});
