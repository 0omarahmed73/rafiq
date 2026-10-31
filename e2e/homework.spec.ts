import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

const LONG = 'ا'.repeat(300);

async function acceptDisclaimer(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'أفهم، لنبدأ' }).click();
  await expect(page.getByRole('heading', { name: 'كيف حالك اليوم؟' })).toBeVisible();
}

async function expectNoSidewaysScroll(page: Page, where: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${where} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0);
}

/** A real, decodable JPEG of the given size, drawn by the browser itself. */
async function makeJpeg(page: Page, width: number, height: number): Promise<Buffer> {
  const base64 = await page.evaluate(
    ([w, h]) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#336699';
      ctx.fillRect(0, 0, w, h);
      return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
    },
    [width, height],
  );
  return Buffer.from(base64, 'base64');
}

/** Adds an EXIF APP1 segment (with fake GPS text) right after the JPEG start marker. */
function withExif(jpeg: Buffer): Buffer {
  const payload = Buffer.from('Exif\0\0MM\0*GPSLatitude=31.2001;GPSLongitude=29.9187');
  const length = Buffer.alloc(2);
  length.writeUInt16BE(payload.length + 2);
  return Buffer.concat([jpeg.subarray(0, 2), Buffer.from([0xff, 0xe1]), length, payload, jpeg.subarray(2)]);
}

async function newHomework(page: Page, title: string) {
  await page.goto('/therapist/note');
  await page.getByLabel('أهم ما قاله المعالج').fill('ملاحظة الجلسة');
  await page.getByRole('button', { name: 'أضيف واجبًا' }).click();
  await expect(page.getByRole('heading', { name: 'واجب جديد' })).toBeVisible();
  await page.getByLabel('ما الواجب؟').fill(title);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`the session note, homework and واجباتي pages do not scroll sideways with long text (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await acceptDisclaimer(page);

    await page.goto('/therapist/note');
    await page.getByLabel('أهم ما قاله المعالج').fill(LONG);
    await page.getByLabel('ما الذي سآخذه معي؟').fill(LONG);
    await expectNoSidewaysScroll(page, 'new session note');

    await page.getByRole('button', { name: 'أضيف واجبًا' }).click();
    await expect(page.getByRole('heading', { name: 'واجب جديد' })).toBeVisible();
    await page.getByLabel('ما الواجب؟').fill(LONG);
    await page.getByLabel('ملاحظات').fill(LONG);
    await page.getByLabel('إجابتي').fill(LONG);
    await expectNoSidewaysScroll(page, 'homework page');
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    await expect(page.getByText('حفظتُ الواجب.')).toBeVisible();
    await expectNoSidewaysScroll(page, 'saved homework page');

    await page.goto('/therapist/homework');
    await expect(page.getByRole('list', { name: 'الواجبات' })).toBeVisible();
    await expectNoSidewaysScroll(page, 'واجباتي');

    await page.getByRole('list', { name: 'الواجبات' }).getByRole('link').first().click();
    await page.getByRole('link', { name: '‹ ملاحظات الجلسة' }).click();
    await expect(page.getByRole('list', { name: 'الواجب' })).toBeVisible();
    await expectNoSidewaysScroll(page, 'session note with a long homework card');
  });
}

test('a homework with a photo and an answer survives a reload and is in the exported backup', async ({ page }) => {
  await acceptDisclaimer(page);
  await newHomework(page, 'أكتب يوميات الأسبوع');
  await page.getByLabel('إجابتي').fill('بدأتُ اليوم بصفحة واحدة');
  await page.getByLabel('اختيار صور الواجب').setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(page, 600, 400) });
  await expect(page.getByRole('img', { name: 'صورة الواجب ١' })).toBeVisible();
  await page.getByRole('button', { name: 'حفظ', exact: true }).click();
  await expect(page.getByText('حفظتُ الواجب.')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('إجابتي')).toHaveValue('بدأتُ اليوم بصفحة واحدة');
  await expect(page.getByRole('img', { name: 'صورة الواجب ١' })).toBeVisible();

  await page.goto('/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'تصدير نسخة احتياطية' }).click(),
  ]);
  const text = await (await import('node:fs/promises')).readFile((await download.path())!, 'utf-8');
  const backup = JSON.parse(text);
  expect(backup.data.homework.map((h: { text: string }) => h.text)).toEqual(['أكتب يوميات الأسبوع']);
  expect(backup.data.homeworkImages).toHaveLength(1);
  expect(backup.data.homeworkImages[0].dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
});

test('a photo is shrunk to 1280px and re-encoded, which removes EXIF and GPS', async ({ page }) => {
  await acceptDisclaimer(page);
  await newHomework(page, 'واجب بصورة كبيرة');
  const original = withExif(await makeJpeg(page, 3000, 2000));
  expect(original.includes('GPSLatitude')).toBe(true);

  await page.getByLabel('اختيار صور الواجب').setInputFiles({ name: 'big.jpg', mimeType: 'image/jpeg', buffer: original });
  const thumb = page.getByRole('img', { name: 'صورة الواجب ١' });
  await expect(thumb).toBeVisible();

  const stored = await thumb.getAttribute('src');
  expect(stored!.startsWith('data:image/jpeg;base64,')).toBe(true);
  const bytes = Buffer.from(stored!.split(',')[1], 'base64');
  expect(bytes.subarray(0, 2).toString('hex')).toBe('ffd8');
  expect(bytes.includes('Exif')).toBe(false);
  expect(bytes.includes('GPSLatitude')).toBe(false);
  const size = await thumb.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]);
  expect(Math.max(...size)).toBeLessThanOrEqual(1280);
  expect(size[0] / size[1]).toBeCloseTo(1.5, 1);
});
