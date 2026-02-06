// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Authentication helpers for E2E tests
 */

const PIKABOARD_TOKEN = process.env.PIKABOARD_TOKEN || '41e4b640e51f9f5efa2529c5f609b141ff20515e864bd6e404efefd50840692d';

/**
 * Authenticate by setting token in localStorage
 * @param {import('@playwright/test').Page} page
 */
async function authenticate(page) {
  await page.addInitScript((token) => {
    localStorage.setItem('pikaboard_token', token);
  }, PIKABOARD_TOKEN);
}

/**
 * Login helper - navigates and verifies authentication
 * @param {import('@playwright/test').Page} page
 */
async function login(page) {
  await authenticate(page);
  await page.goto('/pikaboard/');
  // Wait for the app to load (check for a known element)
  await expect(page.locator('body')).toContainText('PikaBoard');
}

module.exports = {
  authenticate,
  login,
  PIKABOARD_TOKEN,
};
