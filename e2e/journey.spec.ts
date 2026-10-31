import { expect, test, type Page } from '@playwright/test';

async function acceptDisclaimer(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'أفهم، لنبدأ' }).click();
  await expect(page.getByRole('heading', { name: 'كيف حالك اليوم؟' })).toBeVisible();
}

const next = (page: Page) => page.getByRole('button', { name: 'التالي' }).click();

test('a day with Rafiq: check in, practise, flag, summarise, back up and restore', async ({ page, baseURL }) => {
  const origins = new Set<string>();
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http')) origins.add(url.origin);
  });

  // 1. Accept the notice, then make a quick check-in.
  await acceptDisclaimer(page);
  await page.getByRole('button', { name: 'حزن' }).click();
  await page.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByText('تم الحفظ')).toBeVisible();

  // 2. It shows in the tracker.
  await page.getByRole('link', { name: 'التتبّع' }).click();
  await expect(page.getByText(/سجّلت يومًا واحدًا هذا الشهر/)).toBeVisible();

  // 3. Complete the five parts of step 1, flagging the practice for the next session.
  await page.goto('/practice/validate');
  await page.getByRole('button', { name: 'حزن' }).click();
  await next(page);
  await page.getByLabel('الموقف').fill('مررتُ بموقف صعب');
  await page.getByLabel('كيف أثّر فيّ؟').fill('شعرتُ بالوحدة');
  await next(page);
  await page.getByRole('button', { name: 'أن أُهمَل' }).click();
  await next(page);
  await page.getByRole('textbox', { name: 'من الطبيعي أن أشعر بهذا' }).fill('من الطبيعي أن أحزن حين أُهمَل');
  await next(page);
  await page.getByRole('textbox', { name: 'إضافة' }).fill('مشاهدة مسلسلي');
  await page.getByRole('button', { name: 'إضافة' }).click();
  await next(page);
  await page.getByRole('switch', { name: 'للنقاش في الجلسة القادمة' }).click();
  await page.getByRole('button', { name: 'إنهاء التمرين' }).click();
  await expect(page).toHaveURL(/\/step\/1$/);

  // 4. It is on the agenda for the therapist session.
  await page.goto('/therapist');
  await expect(page.getByRole('list', { name: 'ما أريد مناقشته' })).toContainText('تصديق المشاعر');

  // 5. And in the summary preview.
  await page.goto('/therapist/summary');
  await expect(page.getByRole('heading', { name: 'للنقاش في الجلسة' })).toBeVisible();
  await expect(page.getByRole('article')).toContainText('من الطبيعي أن أحزن حين أُهمَل');
  await expect(page.getByRole('article')).toContainText('حزن');

  // 6. Back up, wipe the browser's database, restore.
  await page.goto('/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'تصدير نسخة احتياطية' }).click(),
  ]);
  const backupPath = await download.path();

  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase('rafiq');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
  );
  await page.reload();
  await page.getByRole('button', { name: 'أفهم، لنبدأ' }).click();
  // The reload kept the address, so after accepting we are back on the settings page.
  await expect(page.getByRole('heading', { name: 'الإعدادات' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles(backupPath);
  await page.getByRole('radio', { name: 'استبدال بياناتي الحالية' }).check();
  await page.getByRole('button', { name: 'استيراد' }).click();
  await page.getByRole('button', { name: 'نعم، أستورد' }).click();
  await expect(page.getByText('تم استيراد النسخة الاحتياطية.')).toBeVisible();

  await page.goto('/tracker');
  await expect(page.getByText(/سجّلت يومًا واحدًا هذا الشهر/)).toBeVisible();

  // 7. Nothing was requested from any other site.
  expect([...origins]).toEqual([new URL(baseURL!).origin]);
});

test('keeps working offline after the first visit', async ({ page, context }) => {
  await acceptDisclaimer(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'كيف حالك اليوم؟' })).toBeVisible();

  await page.getByRole('button', { name: 'ممتنّ' }).click();
  await page.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByText('تم الحفظ')).toBeVisible();
});
