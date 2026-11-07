import { expect, test, type Page } from '@playwright/test';
import { acceptDisclaimer } from './helpers';

const PIN = '2468';

function lockCard(page: Page) {
  return page.getByRole('region', { name: 'القفل' });
}

function lockScreen(page: Page) {
  return page.getByRole('button', { name: 'فتح' });
}

/** Types a PIN on the lock screen's number pad; each key is named by its plain digit. */
async function tapPin(page: Page, pin: string) {
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
}

async function expectLocked(page: Page) {
  await expect(page.getByRole('heading', { level: 1, name: 'رفيق' })).toBeVisible();
  await expect(lockScreen(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'نسيت الرمز؟' })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
}

test('turns the lock on, locks after a reload, refuses a wrong PIN, opens with the right one and turns off', async ({
  page,
}) => {
  await acceptDisclaimer(page);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1, name: 'الإعدادات' })).toBeVisible();

  // Set up: choose the PIN, confirm it, then the recovery code with the required tick.
  const card = lockCard(page);
  await card.getByRole('button', { name: 'تفعيل القفل' }).click();
  await card.getByLabel('الرمز الجديد').fill(PIN);
  await card.getByRole('button', { name: 'التالي' }).click();
  await card.getByLabel('أعيد كتابة الرمز').fill(PIN);
  await card.getByRole('button', { name: 'احفظ الرمز' }).click();
  await expect(card.getByTestId('recovery-code')).toHaveText(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  const done = card.getByRole('button', { name: 'تم' });
  await expect(done).toBeDisabled();
  await card.getByRole('checkbox', { name: 'حفظت رمز الاسترداد' }).check();
  await done.click();
  await expect(card.getByText('القفل مفعّل. أحتاج رمزي لفتح التطبيق.')).toBeVisible();

  // A reload is a cold start: the lock screen replaces the app.
  await page.reload();
  await expectLocked(page);
  await expect(page.getByRole('heading', { name: 'الإعدادات' })).toHaveCount(0);

  await tapPin(page, '1357');
  await lockScreen(page).click();
  await expect(page.getByRole('alert')).toHaveText('الرمز غير صحيح');
  await expectLocked(page);

  await tapPin(page, PIN);
  await lockScreen(page).click();
  // The reload kept the address, so the app opens on the settings page.
  await expect(page.getByRole('heading', { level: 1, name: 'الإعدادات' })).toBeVisible();
  await expect(page.getByRole('navigation')).toBeVisible();

  // Turning off needs the current PIN.
  await card.getByRole('button', { name: 'أوقف القفل' }).click();
  await card.getByLabel('الرمز الحالي').fill(PIN);
  await card.getByRole('button', { name: 'متابعة' }).click();
  await expect(card.getByRole('status')).toHaveText('أوقفت القفل.');
  await expect(card.getByRole('button', { name: 'تفعيل القفل' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'الإعدادات' })).toBeVisible();
  await expect(lockScreen(page)).toHaveCount(0);
  await expect(page.getByRole('navigation')).toBeVisible();
});
