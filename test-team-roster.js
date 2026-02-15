import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Set viewport to desktop size
  await page.setViewport({ width: 1920, height: 1080 });

  // Set authentication token in localStorage
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('pikaboard_token', '41e4b640e51f9f5efa2529c5f609b141ff20515e864bd6e404efefd50840692d');
  });

  // Navigate to Agents page
  console.log('Navigating to Agents page...');
  await page.goto('http://localhost:5001/pikaboard-dev/agents', { waitUntil: 'networkidle2' });

  // Wait for team roster to load
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Take screenshot
  console.log('Taking screenshot...');
  await page.screenshot({ path: '/tmp/agents-page-screenshot.png', fullPage: true });

  console.log('Screenshot saved to: /tmp/agents-page-screenshot.png');
  console.log('Open it to verify agents show with correct emojis from openclaw.json!');

  await browser.close();
})();
