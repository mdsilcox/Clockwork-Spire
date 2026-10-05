import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { noSidewaysScroll, press, showTip, skipFirstLaunch, watchErrors } from './helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */
const call = <T = unknown>(page: Page, expr: string): Promise<T> =>
  page.evaluate((e) => new Function('g', `return (async () => (${e}))()`)((window as any).__game), expr) as Promise<T>;

test.beforeEach(async ({ page }) => {
  await skipFirstLaunch(page);
  await page.goto('/');
  await call(page, 'g.newSlot(1, "Ada")');
  await call(page, 'g.setSpeed("skip")');
});

test('the defeat screen counts floors from one source', async ({ page }) => {
  await call(page, 'g.climb("tinker")');
  await call(page, 'g.cheat.finishRun("loss", 20)');
  await expect(page.getByTestId('defeat')).toBeVisible();
  const tile = (await page.getByTestId('end-stats').locator('div', { hasText: 'Floors climbed' }).first().locator('dd').innerText()).trim();
  const row = await page.getByTestId('brass-floors').innerText();
  expect(row).toContain(`(${tile})`);
  await noSidewaysScroll(page);
});

test('a new best pins a note in the Workshop and Sprocket is glad', async ({ page }) => {
  await call(page, 'g.climb("tinker")');
  await call(page, 'g.cheat.finishRun("loss", 12)');
  await press(page, page.getByTestId('end-continue'));
  await expect(page.getByTestId('moment-note')).toHaveCount(0); // the first run has no best to beat
  await call(page, 'g.climb("tinker")');
  await call(page, 'g.cheat.finishRun("loss", 30)');
  await press(page, page.getByTestId('end-continue'));
  await expect(page.getByTestId('bellfoot')).toBeVisible();
  await expect(page.getByTestId('moment-note')).toContainText('New best');
  expect(['happy', 'celebrate']).toContain(await call(page, 'g.sprocket()'));
  await noSidewaysScroll(page);
  await press(page, page.getByTestId('moment-note'));
  await expect(page.getByTestId('moment-note')).toHaveCount(0);
});

test('a first win is marked, and entering an act shows its title card', async ({ page }) => {
  await call(page, 'g.climb("tinker")');
  await expect(page.getByTestId('act-card')).toContainText('Act 1');
  await call(page, 'g.cheat.finishRun("win")');
  const skip = page.getByTestId('ending-skip');
  if (await skip.count()) await skip.click();
  await page.getByTestId('ending-done').click({ timeout: 10_000 });
  await press(page, page.getByTestId('end-continue'));
  await expect(page.getByTestId('moment-note')).toContainText('First victory');
});

test('part tooltips name the family and what it works well with', async ({ page }) => {
  const errors = watchErrors(page);
  await call(page, 'g.practice({ enemies: ["rust-mite"], bin: "tinker", seed: 3 })');
  await expect(page.getByTestId('combat')).toBeVisible();
  await showTip(page, page.getByTestId('hand-card').first());
  await expect(page.getByTestId('tooltip')).toContainText('Works well with');
  expect(errors).toEqual([]);
});

test('after a won fight the salvage tray lists the broken parts and fits a phone', async ({ page }) => {
  await call(page, 'g.cheat.runFight(["cog-rat"])');
  await call(page, 'g.cheat.breakPart(0, "rat-jaw")');
  await call(page, 'g.cheat.winFight()');
  await expect(page.getByTestId('salvage-tray')).toBeVisible();
  await expect(page.getByTestId('salvage-item-0')).toBeVisible();
  await expect(page.getByTestId('salvage-keep-0')).toBeVisible();
  await noSidewaysScroll(page);
});

test('how to play: five numbered legend lines in reading order, and the parts are labeled', async ({ page }) => {
  await page.reload();
  await press(page, page.getByTestId('open-howto'));
  const items = page.getByTestId('howto-legend').locator('li');
  await expect(items).toHaveCount(5);
  await expect(items.nth(0)).toContainText('Mainspring');
  await expect(items.nth(1)).toContainText('Spur Gear');
  await expect(items.nth(3)).toContainText('Coil Spring');
  await noSidewaysScroll(page);
});

test('Sprocket event art is centered in its frame', async ({ page }) => {
  await call(page, 'g.climb("tinker")');
  await call(page, 'g.cheat.event("sprocket-nap")');
  await expect(page.getByTestId('sprocket-event-art')).toBeVisible();
  const art = (await page.getByTestId('sprocket-event-art').boundingBox())!;
  const frame = (await page.locator('.nodeart').boundingBox())!;
  const above = art.y - frame.y;
  const below = frame.y + frame.height - (art.y + art.height);
  expect(Math.abs(above - below)).toBeLessThan(Math.max(8, frame.height * 0.08));
});
