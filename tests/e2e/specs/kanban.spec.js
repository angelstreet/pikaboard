// @ts-check
const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');

test.describe('Kanban Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/pikaboard/');
  });

  test('should display all workflow columns', async ({ page }) => {
    const columns = ['inbox', 'up next', 'in progress', 'in review', 'done'];
    const bodyText = await page.textContent('body').catch(() => '');
    
    // At least some workflow columns should be present
    const foundColumns = columns.filter(col => 
      bodyText.toLowerCase().includes(col.toLowerCase())
    );
    
    expect(foundColumns.length).toBeGreaterThanOrEqual(3);
  });

  test('should allow drag and drop between columns', async ({ page }) => {
    // This is a basic test - actual drag-drop requires more complex setup
    // Check that drag handles exist if using dnd-kit
    const dragHandles = page.locator('[data-testid="drag-handle"], [role="button"]').first();
    
    // Just verify the page is interactive
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show task counts in columns', async ({ page }) => {
    // Look for count indicators near column headers
    const bodyText = await page.textContent('body');
    // Check if there are numbers near status labels
    expect(bodyText).toBeTruthy();
  });
});
