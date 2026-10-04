import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { noSidewaysScroll, press, skipFirstLaunch, watchErrors } from './helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */
const call = <T = unknown>(page: Page, expr: string): Promise<T> =>
  page.evaluate((e) => new Function('g', `return (async () => (${e}))()`)((window as any).__game), expr) as Promise<T>;

test.beforeEach(async ({ page }) => {
  await skipFirstLaunch(page);
});

async function openSettings(page: Page): Promise<void> {
  await press(page, page.getByTestId('open-settings'));
  await expect(page.getByTestId('settings')).toBeVisible();
}

test('Q1: music, effects and mute change, apply at once and persist across a reload', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('title')).toBeVisible();
  await openSettings(page);
  await noSidewaysScroll(page);
  await page.getByTestId('set-music').fill('30');
  await page.getByTestId('set-effects').fill('40');
  await page.getByTestId('set-master').fill('60');
  await page.getByTestId('set-mute').check();
  await expect(page.getByTestId('set-music-value')).toHaveText('30%');
  const live = await call<any>(page, 'g.audio');
  expect(live.muted).toBe(true);
  expect(live.volumes.music).toBeCloseTo(0.3, 2);
  expect(live.volumes.effects).toBeCloseTo(0.4, 2);
  await page.waitForTimeout(300); // the record is written as it changes

  await page.reload();
  await expect(page.getByTestId('title')).toBeVisible();
  await openSettings(page);
  await expect(page.getByTestId('set-music')).toHaveValue('30');
  await expect(page.getByTestId('set-effects')).toHaveValue('40');
  await expect(page.getByTestId('set-master')).toHaveValue('60');
  await expect(page.getByTestId('set-mute')).toBeChecked();
  const after = await call<any>(page, 'g.audio');
  expect(after.muted).toBe(true);
  expect(after.volumes.music).toBeCloseTo(0.3, 2);
  expect(errors).toEqual([]);
});

test('Q2: with the speed set to skip a turn shows its result without animation delay, and it persists', async ({ page }) => {
  await page.goto('/');
  await openSettings(page);
  await press(page, page.getByTestId('set-speed-skip'));
  await expect(page.getByTestId('set-speed-skip')).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('settings')).toHaveCount(0);
  await press(page, page.getByTestId('practice'));
  await expect(page.getByTestId('combat')).toBeVisible();
  await expect(page.getByTestId('speed')).toHaveText('Skip');
  const ms = await page.evaluate(async () => {
    const g = (window as any).__game;
    g.place(0, 'B2');
    const t = performance.now();
    await g.run();
    return performance.now() - t;
  });
  expect(ms).toBeLessThan(400);
  await page.waitForTimeout(300);
  await page.reload();
  expect((await call<any>(page, 'g.settings()')).speed).toBe('skip');
});

test('Q3: color-blind labels switch from the settings screen and persist', async ({ page }) => {
  await page.goto('/');
  await openSettings(page);
  await page.getByTestId('set-colorblind').check();
  await page.getByTestId('settings-close').click();
  await press(page, page.getByTestId('practice'));
  await expect(page.locator('.ilabel').first()).toBeVisible();
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator('.ilabel').first()).toBeVisible(); // the fight resumed, labels still on
  await press(page, page.getByTestId('menu'));
  await press(page, page.getByTestId('menu-settings'));
  await expect(page.getByTestId('set-colorblind')).toBeChecked();
  await page.getByTestId('set-colorblind').uncheck();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ilabel')).toHaveCount(0);
});

test('reduced effects is stored, and the old localStorage color-blind choice is carried over once', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('cs.colorBlind', '1'));
  await page.goto('/');
  await expect.poll(async () => (await call<any>(page, 'g.settings()')).colorBlindIcons).toBe(true);
  await openSettings(page);
  await page.getByTestId('set-reduced').check();
  await page.waitForTimeout(300);
  await page.reload();
  const st = await call<any>(page, 'g.settings()');
  expect(st.reducedEffects).toBe(true);
  expect(st.colorBlindIcons).toBe(true);
});

test('settings work from the keyboard alone and Escape closes them', async ({ page }) => {
  await page.goto('/');
  await openSettings(page);
  // focus starts inside the dialog, and arrow keys move a slider
  await expect(page.getByTestId('settings-close')).toBeFocused();
  await page.getByTestId('set-music').focus();
  const before = Number(await page.getByTestId('set-music').inputValue());
  await page.keyboard.press('ArrowLeft');
  expect(Number(await page.getByTestId('set-music').inputValue())).toBeLessThan(before);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('settings')).toHaveCount(0);
});

test('settings open from the Workshop and the combat menu', async ({ page }) => {
  await page.goto('/');
  await call(page, 'g.newSlot(1, "Ada")');
  await expect(page.getByTestId('workshop')).toBeVisible();
  await press(page, page.getByTestId('ws-menu'));
  await press(page, page.getByTestId('ws-settings'));
  await expect(page.getByTestId('settings')).toBeVisible();
  await page.keyboard.press('Escape');
  await call(page, 'g.practice({ enemies: ["rust-mite"], bin: "tinker" })');
  await press(page, page.getByTestId('menu'));
  await press(page, page.getByTestId('menu-settings'));
  await expect(page.getByTestId('settings')).toBeVisible();
});
