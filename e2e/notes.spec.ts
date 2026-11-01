import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

test('weekly notes: write, renew into the archive, and print them in the therapist summary', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'أفهم، لنبدأ' }).click();
  await expect(page.getByRole('heading', { name: 'كيف حالك اليوم؟' })).toBeVisible();

  await page.goto('/therapist/notes');
  await page.getByLabel('ملاحظة جديدة').fill('نمتُ جيدًا بعد المشي');
  await page.getByRole('button', { name: 'إضافة ملاحظة' }).click();
  await expect(page.getByRole('list', { name: 'ملاحظات هذا الأسبوع' })).toContainText('نمتُ جيدًا بعد المشي');

  await page.getByRole('button', { name: 'تجديد' }).click();
  await page.getByRole('button', { name: 'نعم، أجدّد' }).click();
  await expect(page.getByRole('status')).toContainText('نقلتُ ملاحظة واحدة إلى الأرشيف.');
  await expect(page.getByText('لا توجد ملاحظات هذا الأسبوع بعد.')).toBeVisible();
  const archive = page.getByRole('button', { name: /أُرشفت في/ });
  await expect(archive).toHaveAttribute('aria-expanded', 'false');
  await archive.click();
  await expect(page.getByRole('region', { name: /أُرشفت في/ })).toContainText('نمتُ جيدًا بعد المشي');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  await page.goto('/therapist/summary');
  await expect(page.getByRole('checkbox', { name: 'ملاحظاتي' })).toBeChecked();
  await expect(page.locator('article')).toContainText('نمتُ جيدًا بعد المشي');
  await page.locator('#splash').waitFor({ state: 'detached' });
  await page.getByRole('group', { name: 'ما الذي يتضمّنه الملخّص؟' }).getByText('ملاحظاتي').click();
  await expect(page.getByRole('checkbox', { name: 'ملاحظاتي' })).not.toBeChecked();
  await expect(page.locator('article')).not.toContainText('نمتُ جيدًا بعد المشي');
});
