#!/usr/bin/env node
/**
 * PikaBoard Browser E2E Tests — using Puppeteer
 * Tests that the frontend loads and renders correctly
 */
const puppeteer = require('puppeteer');

const BASE_URL = process.env.E2E_BASE_URL || 'https://localhost/pikaboard-dev/';
const TOKEN = '41e4b640e51f9f5efa2529c5f609b141ff20515e864bd6e404efefd50840692d';

let pass = 0, fail = 0;
const errors = [];

function ok(msg) { pass++; console.log(`  ✅ ${msg}`); }
function nok(msg) { fail++; errors.push(msg); console.log(`  ❌ ${msg}`); }

async function run() {
  console.log('🌐 PikaBoard Browser E2E Tests');
  console.log('==============================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Test 1: Main page loads
    console.log('📋 Test 1: Page Load');
    
    // Navigate first, then set token, then reload
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.evaluate((token) => {
      localStorage.setItem('pikaboard_token', token);
    }, TOKEN);
    await page.reload({ waitUntil: 'networkidle2', timeout: 15000 });
    // Wait for React to render
    await new Promise(r => setTimeout(r, 3000));
    
    const title = await page.title();
    title ? ok(`Page loaded (title: ${title})`) : nok('Page failed to load');

    await page.screenshot({ path: '/tmp/e2e-debug.png' });
    const bodyText = await page.evaluate(() => document.body.innerText);
    const bodyHtml = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
    console.log('    Body text:', bodyText.substring(0, 200));
    console.log('    Body HTML:', bodyHtml.substring(0, 200));
    bodyText.includes('PikaBoard') ? ok('PikaBoard text found') : nok('PikaBoard text not found');

    // Test 2: Navigation exists
    console.log('\n📋 Test 2: Navigation');
    const navLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a, nav a, [role="navigation"] a'))
        .map(a => a.textContent?.trim())
        .filter(Boolean);
    });
    navLinks.length > 0 ? ok(`Found ${navLinks.length} nav links`) : nok('No nav links found');

    // Test 3: Board view
    console.log('\n📋 Test 3: Board View');
    // Check for kanban columns or task cards
    const hasColumns = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return ['inbox', 'up next', 'in progress', 'done'].some(col => text.includes(col));
    });
    hasColumns ? ok('Kanban columns visible') : nok('No kanban columns found');

    // Test 4: Inbox page
    console.log('\n📋 Test 4: Inbox Page');
    await page.goto(BASE_URL.replace(/\/$/, '') + '/inbox', { waitUntil: 'networkidle2', timeout: 10000 });
    const inboxText = await page.evaluate(() => document.body.innerText);
    inboxText.toLowerCase().includes('inbox') ? ok('Inbox page loaded') : nok('Inbox page failed');

    // Check for new section headers
    const hasApprovals = inboxText.includes('Pending Approvals');
    const hasQuestions = inboxText.includes('Questions');
    const hasBlockers = inboxText.includes('Blockers');
    hasApprovals ? ok('Approvals section visible') : nok('Approvals section missing');
    hasQuestions ? ok('Questions section visible') : nok('Questions section missing');
    hasBlockers ? ok('Blockers section visible') : nok('Blockers section missing');

    // Test 5: Goals page
    console.log('\n📋 Test 5: Goals Page');
    await page.goto(BASE_URL.replace(/\/$/, '') + '/goals', { waitUntil: 'networkidle2', timeout: 10000 });
    const goalsText = await page.evaluate(() => document.body.innerText);
    goalsText.toLowerCase().includes('goal') ? ok('Goals page loaded') : nok('Goals page failed');

    // Test 6: Insights page
    console.log('\n📋 Test 6: Insights Page');
    await page.goto(BASE_URL.replace(/\/$/, '') + '/insights', { waitUntil: 'networkidle2', timeout: 10000 });
    const insightsText = await page.evaluate(() => document.body.innerText);
    insightsText.toLowerCase().includes('insight') ? ok('Insights page loaded') : nok('Insights page failed');

    // Test 7: Settings page
    console.log('\n📋 Test 7: Settings Page');
    await page.goto(BASE_URL.replace(/\/$/, '') + '/settings', { waitUntil: 'networkidle2', timeout: 10000 });
    const settingsText = await page.evaluate(() => document.body.innerText);
    settingsText.toLowerCase().includes('setting') ? ok('Settings page loaded') : nok('Settings page failed');

    // Test 8: Dark mode toggle
    console.log('\n📋 Test 8: Theme Toggle');
    const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    ok(`Current theme: ${hasDarkClass ? 'dark' : 'light'}`);

  } catch (err) {
    nok(`Test error: ${err.message}`);
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n==============================');
  console.log(`Results: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log('\nFailures:');
    errors.forEach(e => console.log(`  ❌ ${e}`));
    process.exit(1);
  } else {
    console.log('🎉 All browser E2E tests passed!');
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
