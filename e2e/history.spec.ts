import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { noSidewaysScroll, press, skipFirstLaunch, watchErrors } from './helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */
const call = <T = unknown>(page: Page, expr: string): Promise<T> =>
  page.evaluate((e) => new Function('g', `return (async () => (${e}))()`)((window as any).__game), expr) as Promise<T>;

test.beforeEach(async ({ page }) => {
  await skipFirstLaunch(page);
  await page.goto('/');
  await call(page, 'g.newSlot(1, "Ada")');
  await call(page, 'g.setSpeed("skip")');
});

test('Q4: after two finished runs the history lists them and the totals add up', async ({ page }) => {
  const errors = watchErrors(page);
  // a loss in act 2, with the Brass explained on the result screen
  await call(page, 'g.climb("tinker")');
  await call(page, 'g.cheat.finishRun("loss", 20)');
  await expect(page.getByTestId('defeat')).toBeVisible();
  const total = await page.getByTestId('brass-total').innerText();
  await expect(page.getByTestId('brass-breakdown')).toContainText('Floors climbed');
  await expect(page.getByTestId('brass-breakdown')).toContainText('Bosses beaten');
  const rows = await page.getByTestId('brass-breakdown').locator('li:not(.total) b').allInnerTexts();
  const sum = rows.map((r) => Number(r.replace(/,/g, ''))).reduce((a, b) => a + b, 0);
  expect(total.replace(/,/g, '')).toContain(String(sum));
  await noSidewaysScroll(page);
  await press(page, page.getByTestId('end-continue'));
  await expect(page.getByTestId('workshop')).toBeVisible();

  // and a win
  await call(page, 'g.climb("tinker")');
  await call(page, 'g.cheat.finishRun("win")');
  await expect(page.getByTestId('victory')).toBeVisible();
  const skip = page.getByTestId('ending-skip');
  if (await skip.count()) await skip.click();
  await page.getByTestId('ending-done').click({ timeout: 10_000 });
  await expect(page.getByTestId('brass-breakdown')).toContainText('Victory bonus');
  await press(page, page.getByTestId('end-continue'));
  await expect(page.getByTestId('workshop')).toBeVisible();

  await press(page, page.getByTestId('tab-history'));
  await expect(page.getByTestId('history')).toBeVisible();
  await noSidewaysScroll(page);
  const list = page.getByTestId('run-row');
  await expect(list).toHaveCount(2);
  await expect(list.first()).toContainText('Victory'); // newest first
  await expect(list.first()).toContainText('#2');
  await expect(list.first()).toContainText('Tinker');
  await expect(list.first()).toContainText('today');
  await expect(list.nth(1)).toContainText('Defeat');
  await expect(list.nth(1)).toContainText('Act 2');
  await expect(list.nth(1)).toContainText('Killed by Rust Mite');
  await expect(page.getByTestId('stat-runs')).toHaveText('2');
  await expect(page.getByTestId('stat-wins')).toContainText('1 (50%)');
  await expect(page.getByTestId('stat-killer')).toHaveText('Rust Mite');
  await expect(page.getByTestId('stat-best')).not.toHaveText('0');
  await expect(page.getByTestId('stat-favorite')).not.toHaveText('none yet');
  // per slot: a fresh slot starts empty
  await call(page, 'g.newSlot(2, "Bo")');
  await press(page, page.getByTestId('tab-history'));
  await expect(page.getByTestId('history-empty')).toBeVisible();
  expect(errors).toEqual([]);
});
