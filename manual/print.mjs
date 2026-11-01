// Prints manual/guide.html to manual/Rafiq-User-Guide-ar.pdf with Chrome. Run: node manual/print.mjs
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(dir, 'guide.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
await page.pdf({ path: path.join(dir, 'Rafiq-User-Guide-ar.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
