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


test('theme selection overrides the device, survives reload, and can follow the device again', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await acceptDisclaimer(page);
  await page.goto('/settings');
  await page.locator('#splash').waitFor({ state: 'detached' });
  await expect(page.getByRole('radio', { name: 'تلقائي' })).toBeChecked();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await page.getByRole('radio', { name: 'فاتح' }).click();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
  const lightBackground = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
  await page.reload();
  await expect(page.getByRole('radio', { name: 'فاتح' })).toBeChecked();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', lightBackground);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.locator('#splash').waitFor({ state: 'detached' });
  await page.getByRole('radio', { name: 'داكن' }).click();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await page.locator('#splash').waitFor({ state: 'detached' });
  await page.getByRole('radio', { name: 'تلقائي' }).click();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
});


test('safe areas keep content below system bars and tabs above navigation gestures', async ({ page }) => {
  await acceptDisclaimer(page);
  await page.locator('#splash').waitFor({ state: 'detached' });
  const heading = page.getByRole('heading', { name: 'كيف حالك اليوم؟' });
  const before = await heading.boundingBox();
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--safe-area-inset-top', '32px');
    document.documentElement.style.setProperty('--safe-area-inset-bottom', '24px');
  });
  await expect.poll(async () => (await heading.boundingBox())!.y - before!.y).toBe(32);
  const tab = page.getByRole('navigation', { name: 'التنقّل' }).getByRole('link', { name: 'الرئيسية' });
  const box = (await tab.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height - 24);
  await expect(tab).toHaveCSS('min-height', '64px');
  await page.goto('/settings');
  await page.locator('#splash').waitFor({ state: 'detached' });
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--safe-area-inset-top', '32px');
    document.documentElement.style.setProperty('--safe-area-inset-bottom', '24px');
  });
  await page.getByRole('textbox', { name: 'اسمي', exact: true }).focus();
  await expect(page.locator('#root')).toHaveCSS('padding-top', '32px');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#root')).toHaveCSS('padding-top', '0px');
  await expect(page.locator('#root')).toHaveCSS('padding-bottom', '0px');
});


test('keeps multiple trigger entries in the discoverable journal', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await acceptDisclaimer(page);
  await page.getByRole('link', { name: 'محفزاتي', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'محفزاتي' })).toBeVisible();
  for (const title of ['موقف أول أريد فهمه', 'موقف آخر مستقل']) {
    await page.getByRole('link', { name: 'أضيف محفزًا', exact: true }).click();
    for (let prompt = 0; prompt < 7; prompt++) {
      await page.getByRole('textbox').fill(prompt === 0 ? title : 'ما ألاحظه عن نفسي');
      await next(page);
    }
    await expect(page.getByRole('switch', { name: 'مشاركة مع معالجي' })).not.toBeChecked();
    await expect(page.getByRole('switch', { name: 'للنقاش في الجلسة القادمة' })).not.toBeChecked();
    await page.getByRole('button', { name: 'إنهاء التمرين' }).click();
    await expect(page).toHaveURL(/\/triggers$/);
    await expect(page.getByText('حفظتُ سجلي، ويمكنني العودة إليه هنا.')).toBeVisible();
  }
  const list = page.getByRole('list', { name: 'سجلاتي المحفوظة' });
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await page.reload();
  await page.locator('#splash').waitFor({ state: 'detached' });
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await expect(list).toContainText('موقف أول أريد فهمه');
  await expect(list).toContainText('موقف آخر مستقل');
  await page.screenshot({ path: testInfo.outputPath('journal-light.png'), fullPage: true, animations: 'disabled' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: testInfo.outputPath('journal-dark.png'), fullPage: true, animations: 'disabled' });
  await page.goto('/step/4');
  await page.locator('#splash').waitFor({ state: 'detached' });
  await expect(page.getByRole('heading', { name: 'قصة الخزي' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'أفهم مشكلة صعبة', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('step4-owner-guide.png'), fullPage: true, animations: 'disabled' });
});

test('finishing a step acknowledges it once and offers the next step', async ({ page }, testInfo) => {
  await acceptDisclaimer(page);
  await page.goto('/step/1');
  await page.getByRole('button', { name: 'أنهيتُ هذه الخطوة' }).click();
  await expect(page.getByText('أقدّر ما أنجزتُه في هذه الخطوة.')).toBeVisible();
  await expect(page.locator('.step-completion')).toHaveCSS('animation-name', 'step-complete-enter');
  await expect(page.getByRole('link', { name: 'أنتقل إلى الخطوة التالية' })).toHaveAttribute('href', '/step/2');
  await page.screenshot({ path: testInfo.outputPath('step-completed.png'), fullPage: true, animations: 'disabled' });
  await page.reload();
  await expect(page.locator('.step-completion')).toHaveCSS('animation-name', 'none');
  await page.getByRole('link', { name: 'أنتقل إلى الخطوة التالية' }).click();
  await expect(page.getByRole('heading', { name: 'تقبّل الذات', exact: true })).toBeVisible();
  await expect(page.locator('input[type=radio]:checked')).toHaveCount(0);
});

test('reduced motion keeps completion feedback immediate and static', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await acceptDisclaimer(page);
  await page.goto('/step/3');
  await page.getByRole('button', { name: 'أنهيتُ هذه الخطوة' }).click();
  await expect(page.locator('.step-completion')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.completion-check')).toHaveCSS('animation-name', 'none');
  await expect(page.getByRole('link', { name: 'أنتقل إلى الخطوة التالية' })).toHaveAttribute('href', '/step/4');
});
