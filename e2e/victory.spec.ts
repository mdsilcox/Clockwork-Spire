import { expect, test } from '@playwright/test';
import { noSidewaysScroll, press, skipFirstLaunch, watchErrors } from './helpers';

type G = {
  newRun(seed?: number): void;
  nodes(): string[];
  setSpeed(s: string): void;
  cheat: { winFight(): Promise<void>; gotoFloor(a: number, f: number, type?: string): void };
};

test('cheat to the Clockmaker, win, and see the victory screen', async ({ page }) => {
  const errors = watchErrors(page);
  await skipFirstLaunch(page);
  await page.goto('/');
  const ok = await page.evaluate(() => {
    try {
      (window as unknown as { __game: G }).__game.newRun(5);
      return true;
    } catch {
      return false;
    }
  });
  test.skip(!ok, 'run API not implemented yet');
  await page.evaluate(() => {
    const g = (window as unknown as { __game: G }).__game;
    g.setSpeed('skip');
    g.cheat.gotoFloor(3, 13, 'boss');
  });
  const id = (await page.evaluate(() => (window as unknown as { __game: G }).__game.nodes()))[0];
  await page.getByTestId(`node-${id}`).scrollIntoViewIfNeeded();
  await press(page, page.getByTestId(`node-${id}`));
  // the boss intro card comes first
  await expect(page.getByTestId('boss-intro')).toBeVisible();
  await expect(page.getByTestId('boss-intro')).toContainText('Clockmaker');
  await noSidewaysScroll(page);
  await press(page, page.getByTestId('boss-intro-go'));
  await expect(page.getByTestId('boss-intro')).toHaveCount(0);
  await page.evaluate(() => (window as unknown as { __game: G }).__game.cheat.winFight());
  await expect(page.getByTestId('screen-reward')).toBeVisible({ timeout: 10_000 });
  // a boss gives a part and a trinket
  await press(page, page.getByTestId('reward-part').first());
  if (await page.getByTestId('reward-trinket').count()) await press(page, page.getByTestId('reward-trinket').first());
  await press(page, page.getByTestId('continue-node'));
  await expect(page.getByTestId('victory')).toBeVisible();
  await expect(page.getByText('The Clockmaker stops.')).toBeVisible();
  await noSidewaysScroll(page);
  // the ending (and credits) lead on, to the Workshop with a slot or the title without one
  for (let i = 0; i < 8 && (await page.getByTestId('title').or(page.getByTestId('workshop')).count()) === 0; i++) {
    await page.getByTestId('victory').getByRole('button').last().click();
    await page.waitForTimeout(150);
  }
  await expect(page.getByTestId('title').or(page.getByTestId('workshop'))).toBeVisible();
  expect(errors).toEqual([]);
});
