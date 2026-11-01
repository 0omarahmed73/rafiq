import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 375, height: 700 } });

test('a new page opens at its top, and going back returns to where the reader was', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'أفهم، لنبدأ' }).click();
  await expect(page.getByRole('heading', { name: 'كيف حالك اليوم؟' })).toBeVisible();
  await page.locator('#splash').waitFor({ state: 'detached' });

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const homeScroll = await page.evaluate(() => window.scrollY);
  expect(homeScroll).toBeGreaterThan(100);

  await page.getByRole('link', { name: /الإعدادات والنسخ الاحتياطي/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'الإعدادات' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await page.getByRole('link', { name: /الرجوع/ }).click();
  await expect(page.getByRole('heading', { name: 'كيف حالك اليوم؟' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
});
