// Run with `npm run test:offline` (production build under `vite preview`; see playwright.offline.config.ts).
import { expect, test } from '@playwright/test';
import { practice, setSpeed, watchErrors } from './helpers';

test('the manifest is linked and parses, and the icons respond', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const res = await request.get(href!);
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m.name).toBe('Clockwork Spire');
  expect(m.short_name).toBe('Spire');
  expect(m.display).toBe('standalone');
  expect(m.orientation).toBe('landscape');
  const sizes = m.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toContain('192x192');
  expect(sizes).toContain('512x512');
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  for (const icon of m.icons) {
    const r = await request.get(icon.src);
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toContain('image/png');
  }
  for (const path of ['/apple-touch-icon.png', '/favicon-32.png']) expect((await request.get(path)).status()).toBe(200);
});

test('the game starts and plays with the network off', async ({ page, context }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30_000 });

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#app')).not.toBeEmpty();

  await practice(page, { enemies: ['dummy'], bin: 'tinker', seed: 2 });
  await expect(page.getByTestId('run')).toBeVisible();
  await setSpeed(page, 'skip');
  await page.getByTestId('run').click();
  await expect(page.getByTestId('turn-summary')).toBeVisible();
  expect(errors.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
});
