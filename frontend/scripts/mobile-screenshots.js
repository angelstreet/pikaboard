/**
 * Mobile screenshot capture script
 * Captures mobile viewport screenshots of the PikaBoard header
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureMobileScreenshots() {
  // Ensure screenshots directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // iPhone SE dimensions (small mobile) - 375px
    await page.setViewport({
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      isMobile: true,
    });

    // Navigate to the app's Settings page where ServiceHealth is visible
    console.log('Navigating to PikaBoard Settings...');
    await page.goto('http://localhost:5001/settings', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for the app to load
    await delay(3000);

    // Capture mobile header specifically (crop to header area)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'mobile-header-375px.png'),
      clip: { x: 0, y: 0, width: 375, height: 60 },
    });
    console.log('✓ Captured mobile header (375px)');

    // Capture full viewport
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'mobile-full-375px.png'),
      fullPage: false,
    });
    console.log('✓ Captured mobile full view (375px)');

    // Capture small mobile 320px (iPhone SE 1st gen)
    await page.setViewport({
      width: 320,
      height: 568,
      deviceScaleFactor: 2,
      isMobile: true,
    });
    await delay(1000);

    // Capture header for small screen
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'mobile-header-320px.png'),
      clip: { x: 0, y: 0, width: 320, height: 60 },
    });
    console.log('✓ Captured mobile header (320px - small)');

    // Capture iPhone 14 Pro dimensions
    await page.setViewport({
      width: 393,
      height: 852,
      deviceScaleFactor: 3,
      isMobile: true,
    });
    await delay(1000);

    // Capture header
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'mobile-header-393px.png'),
      clip: { x: 0, y: 0, width: 393, height: 60 },
    });
    console.log('✓ Captured mobile header (393px)');

    // Capture full viewport
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'mobile-full-393px.png'),
      fullPage: false,
    });
    console.log('✓ Captured mobile full view (393px)');

    console.log('\n✅ All screenshots saved to:', SCREENSHOTS_DIR);
    console.log('Files:');
    fs.readdirSync(SCREENSHOTS_DIR).forEach(f => console.log('  📸', f));

  } catch (error) {
    console.error('❌ Screenshot capture failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

captureMobileScreenshots();
