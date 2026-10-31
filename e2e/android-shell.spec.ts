import { expect, test } from '@playwright/test';

test('android bundle opens with no service-worker registration and local fonts only', async ({ page }) => {
  const serviceWorkerScriptRequests: string[] = [];
  const fontRequests: string[] = [];

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (/\/(?:registerSW\.js|sw\.js)$/.test(url.pathname)) {
      serviceWorkerScriptRequests.push(url.pathname);
    }
    if (request.resourceType() === 'font') fontRequests.push(request.url());
  });

  // networkidle includes the PWA's load-time registration script and local fonts.
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('16px "IBM Plex Sans Arabic"')))
    .toBe(true);
  expect(fontRequests.some((url) => new URL(url).pathname === '/fonts/ibm-plex-sans-arabic-400.woff2')).toBe(true);
  expect(fontRequests.every((url) => {
    const font = new URL(url);
    return font.origin === new URL(page.url()).origin && font.pathname.startsWith('/fonts/');
  })).toBe(true);

  await expect
    .poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length))
    .toBe(0);
  expect(serviceWorkerScriptRequests).toEqual([]);
});
