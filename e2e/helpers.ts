import { expect, type Page } from '@playwright/test';

/**
 * A new browser profile starts on the language screen, with English preselected. The Arabic specs choose Arabic
 * there. Once a language is saved, the screen does not appear again, so the Home heading or the disclaimer is waited for instead.
 */
export async function chooseArabicIfAsked(page: Page) {
  const arabic = page.getByRole('radio', { name: 'العربية' });
  const firstScreen = arabic
    .or(page.getByRole('button', { name: 'أفهم، لنبدأ' }))
    .or(page.getByRole('heading', { name: 'كيف حالك اليوم؟' }));
  await expect(firstScreen.first()).toBeVisible();
  if (await arabic.isVisible()) {
    await arabic.check();
    await page.getByRole('button', { name: /متابعة/ }).click();
  }
}

/** Opens the app in Arabic and accepts the disclaimer, leaving Home showing. */
export async function acceptDisclaimer(page: Page) {
  await page.goto('/');
  await chooseArabicIfAsked(page);
  await page.getByRole('button', { name: 'أفهم، لنبدأ' }).click();
  await expect(page.getByRole('heading', { name: 'كيف حالك اليوم؟' })).toBeVisible();
  await page.locator('#splash').waitFor({ state: 'detached' });
}
