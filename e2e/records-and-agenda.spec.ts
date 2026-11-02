import { expect, test, type Page } from '@playwright/test';
import { acceptDisclaimer } from './helpers';

const next = (page: Page) => page.getByRole('button', { name: 'التالي' }).click();

/** Starts the care practice and moves from its first screen to the list of things to do. */
async function openCareList(page: Page) {
  await page.goto('/practice/care');
  await expect(page.getByRole('heading', { name: 'أي جانب يحتاج انتباهًا الآن؟' })).toBeVisible();
  await next(page);
  await expect(page.getByRole('heading', { name: 'قائمتي المهدّئة' })).toBeVisible();
}

async function addToList(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'إضافة' }).fill(text);
  await page.getByRole('button', { name: 'إضافة', exact: true }).click();
}

/** From the list screen to the end of the practice, then finish it. */
async function finishCare(page: Page) {
  for (let i = 0; i < 4; i++) await next(page);
  await page.getByRole('button', { name: 'إنهاء التمرين' }).click();
  await expect(page).toHaveURL(/\/step\/9$/);
}

/** How many session notes are stored in the browser's database, read directly. */
async function sessionCount(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('rafiq');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const count = db.transaction('sessions').objectStore('sessions').count();
          count.onsuccess = () => {
            db.close();
            resolve(count.result);
          };
          count.onerror = () => reject(count.error);
        };
      }),
  );
}

test('a finished care practice is listed on its step page, with its answers, after a reload', async ({ page }) => {
  await acceptDisclaimer(page);
  await openCareList(page);
  await addToList(page, 'شرب كوب ماء');
  await finishCare(page);

  const records = page.getByRole('list', { name: 'ما كتبتُه في هذه الخطوة' });
  await expect(records).toContainText('عادة صغيرة');
  await records.getByText('أقرأ ما كتبتُه').click();
  await expect(page.getByText('شرب كوب ماء', { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: /ما كتبتُه في هذه الخطوة/ })).toBeVisible();
});

test('an item removed from the care list does not come back in the next practice', async ({ page }) => {
  await acceptDisclaimer(page);

  await openCareList(page);
  await addToList(page, 'شرب كوب ماء');
  await addToList(page, 'مشي قصير');
  await finishCare(page);

  await openCareList(page);
  await expect(page.getByText('شرب كوب ماء', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'حذف: شرب كوب ماء' }).click();
  await expect(page.getByText('شرب كوب ماء', { exact: true })).toHaveCount(0);
  await finishCare(page);

  await openCareList(page);
  await expect(page.getByText('مشي قصير', { exact: true })).toBeVisible();
  await expect(page.getByText('شرب كوب ماء', { exact: true })).toHaveCount(0);
});

test('an agenda point stays on the list after a session is saved, and can still be edited', async ({ page }) => {
  await acceptDisclaimer(page);

  await page.goto('/therapist');
  await page.getByRole('button', { name: '+ إضافة نقطة' }).click();
  await page.getByRole('textbox', { name: 'نقطة جديدة' }).fill('أريد أن أتحدث عن الغضب');
  await page.getByRole('button', { name: 'إضافة', exact: true }).click();
  const agenda = page.getByRole('list', { name: 'ما أريد مناقشته' });
  await expect(agenda).toContainText('أريد أن أتحدث عن الغضب');

  await page.goto('/therapist/note');
  await page.getByRole('button', { name: 'حفظ الملاحظات' }).click();
  await expect.poll(() => sessionCount(page)).toBe(1);

  await page.goto('/therapist');
  await expect(agenda).toContainText('أريد أن أتحدث عن الغضب');

  await page.getByRole('button', { name: 'تعديل: أريد أن أتحدث عن الغضب' }).click();
  await page.getByRole('textbox', { name: 'تعديل النقطة' }).fill('أريد أن أتحدث عن الغضب والخجل');
  await page.getByRole('button', { name: 'حفظ', exact: true }).click();
  await expect(agenda).toContainText('أريد أن أتحدث عن الغضب والخجل');
});
