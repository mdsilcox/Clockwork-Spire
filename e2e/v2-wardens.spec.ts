// B9a acceptance (browser): the phase change on screen (docs/acceptance.md WP2 (E), WP7). Desktop (1280x800) and phone (667x375).
// B9a CONTRACT test ids and hooks (the warden-rigs and wardens-core lanes implement them):
//   phase-beat                      the beat line shown over the warden for 2.5 s (skippable), role status; text = the phase's beat
//   part-intent-e{i}-core           the core's intent chip, showing the phase action ("Summon") while the beat plays
//   enemy-part-e{i}-{partId}        existing; a broken part has class `broken` and keeps it across the phase mood
//   __game.cheat.runFight(['foreman'|'boilermaker'|'clockmaker'])   existing
//   __game.cheat.breakPart(enemy, partId)                           existing (marks a part broken, no phase rules)
//   __game.cheat.breakPhase(enemy): Promise<void>   NEW. Breaks every standing keystone of that enemy's current phase as the
//        engine does when a Run breaks them (phaseLocked set), then plays the turn like the Run button and resolves when the
//        replay is done. Not awaited in the tests that watch the beat line, so it is visible while it plays.
//   __game.rig.moods(enemy): string[]   NEW. Every mood the rig of enemy `i` was set to since the fight began, in order.
//   __game.rig.mood(enemy): string      NEW. Its current mood.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { noSidewaysScroll, skipFirstLaunch, watchErrors } from './helpers';

type G = {
  __game: {
    cheat: { runFight(e: string[]): void; breakPart(e: number, p: string): void; breakPhase(e: number): Promise<void> };
    rig: { moods(e: number): string[]; mood(e: number): string };
  };
};

async function start(page: Page, enemy: string): Promise<void> {
  await skipFirstLaunch(page);
  await page.goto('/');
  await page.evaluate((id) => (window as unknown as G).__game.cheat.runFight([id]), enemy);
}

test('WP2: the Foreman loses his last keystone: the beat shows over him, the rig plays phase, the Apron retracts', async ({ page }) => {
  const errors = watchErrors(page);
  await start(page, 'foreman');
  await expect(page.getByTestId('enemy-part-e0-foreman-wrench')).toBeVisible();
  await expect(page.getByTestId('enemy-part-e0-foreman-apron')).toBeVisible();
  await page.evaluate(() => void (window as unknown as G).__game.cheat.breakPhase(0)); // not awaited: watch the beat play
  const beat = page.getByTestId('phase-beat');
  await expect(beat).toBeVisible();
  await expect(beat).toContainText('Overtime');
  await expect(page.getByTestId('part-intent-e0-core')).toContainText(/summon/i); // the phase action was shown first
  await noSidewaysScroll(page);
  await expect(beat).toBeHidden({ timeout: 8000 }); // about 2.5 s
  expect(await page.evaluate(() => (window as unknown as G).__game.rig.moods(0))).toContain('phase');
  await expect(page.getByTestId('enemy-part-e0-foreman-apron')).toHaveCount(0); // lastPhase: it retracted
  await expect(page.getByTestId('enemy-part-e0-foreman-bulwark')).toBeVisible();
  await expect(page.getByTestId('enemy-part-e0-foreman-wrench')).toHaveClass(/broken/);
  expect(errors).toEqual([]);
});

test("WP7: the Queen's phase change plays her phase mood and the broken Gauge stays broken", async ({ page }) => {
  const errors = watchErrors(page);
  await start(page, 'boilermaker');
  await expect(page.getByTestId('enemy-part-e0-queen-gauge')).toBeVisible();
  await page.evaluate(() => (window as unknown as G).__game.cheat.breakPart(0, 'queen-gauge'));
  await expect(page.getByTestId('enemy-part-e0-queen-gauge')).toHaveClass(/broken/);
  await page.evaluate(() => void (window as unknown as G).__game.cheat.breakPhase(0));
  const beat = page.getByTestId('phase-beat');
  await expect(beat).toBeVisible();
  await expect(beat).toContainText('so warm in here');
  await expect(page.getByTestId('enemy-part-e0-queen-gauge')).toHaveClass(/broken/); // while the mood plays
  await expect(beat).toBeHidden({ timeout: 8000 });
  expect(await page.evaluate(() => (window as unknown as G).__game.rig.moods(0))).toContain('phase');
  await expect(page.getByTestId('enemy-part-e0-queen-gauge')).toHaveClass(/broken/); // after it
  await expect(page.getByTestId('enemy-part-e0-queen-furnace')).toBeVisible(); // phase 2 unfolded
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});
