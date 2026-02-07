// @ts-check
import { expect } from '@playwright/test';

export const PIKABOARD_TOKEN = process.env.PIKABOARD_TOKEN || '41e4b640e51f9f5efa2529c5f609b141ff20515e864bd6e404efefd50840692d';
const APP_PATH = '/pikaboard-dev/';

/**
 * Set auth token in localStorage before page load
 * @param {import('@playwright/test').Page} page
 */
export async function authenticate(page) {
  await page.addInitScript((token) => {
    localStorage.setItem('pikaboard_token', token);
  }, PIKABOARD_TOKEN);
}

/**
 * Login and wait for app to load
 * @param {import('@playwright/test').Page} page
 */
export async function login(page) {
  await authenticate(page);
  await page.goto(APP_PATH);
  await page.waitForLoadState('networkidle');
}

export { APP_PATH };
