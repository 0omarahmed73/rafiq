import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

async function noSidewaysScroll(page: Page, where: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${where} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0);
}

test('library: open the tab, read a symptom with its sources, reach help, and never scroll sideways', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'أفهم، لنبدأ' }).click();
  await expect(page.getByRole('heading', { name: 'كيف حالك اليوم؟' })).toBeVisible();

  await page.getByRole('navigation').getByRole('link', { name: 'مكتبتي' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'مكتبتي' })).toBeVisible();
  await noSidewaysScroll(page, 'library');

  await page.getByRole('link', { name: /الأعراض بكلمات رحيمة/ }).click();
  await expect(page.getByRole('list', { name: 'الأعراض' }).getByRole('link')).toHaveCount(9);
  await noSidewaysScroll(page, 'symptoms');

  await page.getByRole('link', { name: /غضب أكبر من الموقف/ }).click();
  await expect(page.getByText('مسودة للمراجعة')).toBeVisible();
  await page.getByRole('button', { name: /المصادر/ }).click();
  await expect(page.getByRole('region', { name: /المصادر/ })).toContainText('nimh.nih.gov');
  await noSidewaysScroll(page, 'a symptom with sources open');

  await page.getByRole('link', { name: /أحتاج تهدئة/ }).click();
  await expect(page).toHaveURL(/\/calm$/);
});

test('library: the harm symptom shows help before anything else, in light and dark', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'أفهم، لنبدأ' }).click();
  await expect(page.getByRole('heading', { name: 'كيف حالك اليوم؟' })).toBeVisible();
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/library/symptoms/self-harm');
    const banner = page.getByRole('region', { name: 'مساعدة فورية' });
    await expect(banner).toBeVisible();
    const top = await banner.evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeLessThan(200);
    await noSidewaysScroll(page, `self-harm page (${scheme})`);
  }
});
