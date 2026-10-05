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
  // a boss gives its reward: the Clockmaker offers a trinket and no part, a framed elite the salvage tray
  if (await page.getByTestId('salvage-tray').count()) {
    if (await page.getByTestId('reward-trinket').count()) await press(page, page.getByTestId('reward-trinket').first());
    await press(page, page.getByTestId('salvage-done'));
  } else {
    if (await page.getByTestId('reward-part').count()) await press(page, page.getByTestId('reward-part').first()); // the Clockmaker gives no part (B9a: Brass 4 per broken part)
    if (await page.getByTestId('reward-trinket').count()) await press(page, page.getByTestId('reward-trinket').first());
    await press(page, page.getByTestId('continue-node'));
  }
  await expect(page.getByTestId('victory')).toBeVisible();
  await expect(page.getByTestId('ending')).toBeVisible();
  await noSidewaysScroll(page);
  // the ending (and credits) lead on, to the Workshop with a slot or the title without one
  await noSidewaysScroll(page);
  const skip = page.getByTestId('ending-skip');
  if (await skip.count()) await skip.click(); // straight to the credits
  await expect(page.getByTestId('credits')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('ending-stats')).toBeVisible();
  await noSidewaysScroll(page);
  await page.getByTestId('ending-done').click();
  // then where the Brass came from, and on to the Workshop
  await expect(page.getByTestId('brass-breakdown')).toContainText('Victory bonus');
  await noSidewaysScroll(page);
  await press(page, page.getByTestId('end-continue'));
  await expect(page.getByTestId('title').or(page.getByTestId('workshop'))).toBeVisible();
  expect(errors).toEqual([]);
});
