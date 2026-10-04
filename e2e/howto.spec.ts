import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { noSidewaysScroll, press, skipFirstLaunch, watchErrors } from './helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */
const call = <T = unknown>(page: Page, expr: string): Promise<T> =>
  page.evaluate((e) => new Function('g', `return (async () => (${e}))()`)((window as any).__game), expr) as Promise<T>;

test.beforeEach(async ({ page }) => {
  await skipFirstLaunch(page);
});

test('O3: how to play explains a turn with a diagram, in five sections linked to the glossary', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await press(page, page.getByTestId('open-howto'));
  await expect(page.getByTestId('howto')).toBeVisible();
  await expect(page.getByTestId('howto-diagram')).toBeVisible();
  await expect(page.getByTestId('howto-legend')).toContainText('Mainspring');
  await expect(page.getByTestId('howto-legend')).toContainText('holds the motion');
  for (const id of ['machine', 'turn', 'enemies', 'run', 'workshop']) {
    await page.getByTestId(`howto-${id}`).scrollIntoViewIfNeeded();
    await expect(page.getByTestId(`howto-${id}`)).toBeVisible();
  }
  await noSidewaysScroll(page);
  // a glossary word in the text opens its entry on top, and Escape closes the glossary, then the page
  await page.getByTestId('howto-machine').locator('.gl').first().click();
  await expect(page.getByTestId('glossary')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('glossary')).toHaveCount(0);
  await expect(page.getByTestId('howto')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('howto')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('how to play is reachable from the combat menu and the Workshop menu', async ({ page }) => {
  await page.goto('/');
  await call(page, 'g.practice({ enemies: ["rust-mite"], bin: "tinker" })');
  await press(page, page.getByTestId('menu'));
  await press(page, page.getByTestId('menu-howto'));
  await expect(page.getByTestId('howto')).toBeVisible();
  await page.keyboard.press('Escape');
  await call(page, 'g.newSlot(1, "Ada")');
  await press(page, page.getByTestId('ws-menu'));
  await press(page, page.getByTestId('ws-howto'));
  await expect(page.getByTestId('howto')).toBeVisible();
});

test('a phone held upright shows the turn-sideways card instead of the game', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('title')).toBeVisible();
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.getByTestId('portrait-card')).toBeVisible();
  await expect(page.getByTestId('portrait-card')).toContainText('Turn your phone sideways');
  await noSidewaysScroll(page);
  // the game underneath cannot be reached
  expect(await page.getByTestId('title').evaluate((el) => !!el.closest('[inert]'))).toBe(true);
  await page.setViewportSize({ width: 667, height: 375 });
  await expect(page.getByTestId('portrait-card')).toHaveCount(0);
  await expect(page.getByTestId('title')).toBeVisible();
  // a wide window held "portrait" (a tall desktop window) is not a phone
  await page.setViewportSize({ width: 800, height: 1000 });
  await expect(page.getByTestId('portrait-card')).toHaveCount(0);
  expect(errors).toEqual([]);
});
