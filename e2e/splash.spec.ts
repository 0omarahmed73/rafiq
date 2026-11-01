import { expect, test } from '@playwright/test';

test('the web splash animates the mark and introduces its text', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#splash .logo')).toHaveCSS('animation-name', 'rafiq-mark-in');
  await expect(page.locator('#splash .name')).toHaveCSS('animation-name', 'rafiq-copy-in');
});
