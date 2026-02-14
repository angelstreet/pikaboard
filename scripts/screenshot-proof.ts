import puppeteer from 'puppeteer';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';

const program = new Command();
program
  .name('screenshot-proof')
  .description('Screenshot proofs for PikaBoard UI changes')
  .version('1.0.0')
  .option('-u, --url <url>', 'Base URL', 'http://localhost:5173/pikaboard-dev/')
  .option('-t, --task <id>', 'Task ID to open modal for proof')
  .option('-v, --viewport <viewports>', 'comma-separated: desktop,mobile,both', 'both')
  .option('-o, --output <dir>', 'Output directory', './proofs/')
  .option('-s, --slack <channel>', 'Slack DM/channel ID to upload screenshots')
  .action(async () => {
    const opts = program.opts();
    const outputDir = path.resolve(opts.output);
    fs.mkdirSync(outputDir, { recursive: true });

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.goto(`${opts.url}/board/6`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000);

    const viewports = (opts.viewport || 'both').toLowerCase().split(',').map(v => v.trim()).filter(Boolean);
    const vpConfigs = {
      desktop: { width: 1280, height: 800 },
      mobile: { width: 375, height: 812 }
    };

    const screenshots: string[] = [];

    for (const vpName of ['desktop', 'mobile']) {
      if (viewports.includes('both') || viewports.includes(vpName)) {
        await page.setViewport(vpConfigs[vpName as keyof typeof vpConfigs]);

        let suffix = vpName;
        if (opts.task) {
          try {
            // Find and click task card containing #taskId
            const taskCards = await page.$$('.cursor-pointer'); // Task cards have cursor-pointer
            for (const card of taskCards) {
              const text = await card.evaluate(el => el.textContent || '');
              if (text.includes(`#${opts.task}`)) {
                await card.click();
                await page.waitForSelector('.fixed.inset-0, [role="dialog"], .modal', { timeout: 5000 });
                await page.waitForTimeout(2000);
                suffix = `${vpName}-modal`;
                break;
              }
            }
          } catch (e) {
            console.log(`Could not open task ${opts.task}: ${e}`);
          }
        }

        const fileName = `task-${opts.task || 'board'}-${suffix}.png`;
        const filePath = path.join(outputDir, fileName);
        await page.screenshot({ path: filePath, fullPage: true });
        screenshots.push(filePath);
        console.log(`Saved: ${filePath}`);
      }
    }

    await browser.close();
    console.log('Screenshots created:', screenshots.join(', '));

    if (opts.slack) {
      console.log(`Slack upload to ${opts.slack} skipped - set SLACK_TOKEN env var and implement upload.`);
    }
  });

program.parse();
