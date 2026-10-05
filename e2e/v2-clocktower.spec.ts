// B10b acceptance (browser), owner: modes-overwind. Desktop (1280x800) and phone (667x375 touch).
// docs/acceptance.md AD5 (E) and the brief's "The clock tower door" and "Gate checklist" (docs/briefs/B10b-curve.md "Round 2"),
// docs/rules.md 5.7. Written by the orchestrator's test-porter in the B10b.0 contract step. Lanes never weaken an assertion.
// CONTRACT test ids and hooks the modes-overwind lane implements (the door is the existing `clocktower` place of Bellfoot,
// src/ui/Bellfoot.tsx `ClockTower`; its panel keeps `clocktower-panel` and, while Overwind is fully locked, the sentence
// "Overwind opens after a Journeyman win" that e2e/v2-bellfoot.spec.ts reads):
//   mode-{id}                 one button per mode (apprentice, journeyman, master, clockwork) in the panel, 40 px tap target,
//                             aria-pressed on the chosen one, data-locked="true|false", disabled while locked; a tap on an open one
//                             saves it as `profile.lastMode` at once
//   mode-lock-{id}            the reason a locked mode is locked, shown on it ("Win a run on Journeyman", "Win a run on Master")
//   overwind-level-{n}        n = 0..10 (0 = off): one button per level, same attributes and rules as the modes; a tap saves
//                             `profile.lastOverwind`. Open levels are 0 and 1 to `profile.rewards.overwind` (3 after the first win
//                             on Journeyman or harder, 5 with h-master, 7 with h-clockwork, 9 with h-ow5, 10 with h-ow8)
//   overwind-lock-{n}         the reason level n is locked: 1 to 3 "Win a run on Journeyman or harder" (an Apprentice win does not),
//                             4 and 5 "Win a run on Master", 6 and 7 "Win a run on Clockwork", 8 and 9 "Win a run at Overwind 5",
//                             10 "Win a run at Overwind 8" (the tests match /journeyman/, /master/, /clockwork/, /overwind 5/, /overwind 8/)
//   overwind-twist-{n}        one line per twist the chosen level applies, n = 1..level, naming the twist (OVERWIND_TWISTS); none at level 0
//   gate-mode                 on the Spire gate panel: the chosen mode and level; data-mode="{id}" data-overwind="{n}"; the text names
//                             the mode and, above level 0, "Overwind {n}"
//   run-mode                  in the run's HUD (the RunBar on the act screen): same attributes and text, so a run shows what it was
//                             started on; it reads the RUN's mode and level (`run.config`), not the profile's current choice
//   __game.clocktower()       { mode, overwind, overwindOpen, modes: [{ id, locked, reason }], levels: [{ level, locked, reason }] }
//                             (levels 0..10; `reason` null when open; `overwindOpen` = profile.rewards.overwind)
//   __game.cheat.setMode(id), cheat.setOverwind(n)   set the active profile's lastMode / lastOverwind and save, WITHOUT checking the
//                             locks (so the owner can try the hard modes); the next run reads them (the gate checklist documents them)
//   __game.cheat.runFight(enemies)   now builds its combat with the profile's lastMode and lastOverwind (and the memory plan it already
//                             passes), as `startCombat` does for a real run, so a warden fight shows Overwind 9's extra part
//   enemy-part-e0-mem-drill   existing test id scheme: Overwind 9's extra Foreman part is on screen at the fallback position (the
//                             `memory` anchor comes with B11), inside the viewport
//   The existing run hooks `__game.profile()` and `__game.runState()` carry lastMode/lastOverwind and config.mode/config.overwind.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { noSidewaysScroll, openPlace, press, skipFirstLaunch, watchErrors } from './helpers';

type G = {
  __game: {
    newSlot(n: 1 | 2 | 3, name: string): Promise<boolean>;
    useSlot(n: 1 | 2 | 3): Promise<boolean>;
    climb(chassis: string): boolean;
    setSpeed(s: string): void;
    profile(): { lastMode: string; lastOverwind: number; modesUnlocked: string[]; rewards: { overwind: number } } | null;
    runState(): { hours?: number; hour?: number; config: { mode?: string; overwind?: number } } | null;
    clocktower(): {
      mode: string;
      overwind: number;
      overwindOpen: number;
      modes: { id: string; locked: boolean; reason: string | null }[];
      levels: { level: number; locked: boolean; reason: string | null }[];
    };
    cheat: {
      finishRun(r: 'win' | 'loss', floor?: number): void;
      setMode(id: string): void;
      setOverwind(n: number): void;
      setPlanHistory(p: string[]): void;
      runFight(e: string[]): void;
    };
  };
};
const g = <T,>(page: Page, expr: string): Promise<T> => page.evaluate((e) => new Function('g', `return (async () => (${e}))()`)((window as unknown as G).__game), expr) as Promise<T>;

async function town(page: Page): Promise<void> {
  await skipFirstLaunch(page);
  await page.goto('/');
  await page.evaluate(() => (window as unknown as G).__game.newSlot(1, 'Ada'));
  await expect(page.getByTestId('bellfoot')).toBeVisible();
}
async function leaveResult(page: Page): Promise<void> {
  if (await page.getByTestId('victory').count()) {
    const skip = page.getByTestId('ending-skip');
    if (await skip.count()) await skip.click();
    await page.getByTestId('ending-done').click({ timeout: 10_000 });
  }
  await press(page, page.getByTestId('end-continue'));
  await expect(page.getByTestId('bellfoot')).toBeVisible();
}
/** A Journeyman win, as the cheat finishes it, then back in town. */
async function winOnJourneyman(page: Page): Promise<void> {
  await g(page, 'g.setSpeed("skip")');
  await g(page, 'g.climb("tinker")');
  await g(page, 'g.cheat.finishRun("win")');
  await leaveResult(page);
}

const LOCK_WORDS: Record<number, RegExp> = {
  1: /journeyman/i,
  2: /journeyman/i,
  3: /journeyman/i,
  4: /master/i,
  5: /master/i,
  6: /clockwork/i,
  7: /clockwork/i,
  8: /overwind 5/i,
  9: /overwind 5/i,
  10: /overwind 8/i,
};

test('AD5 (E): a new profile: Master and Clockwork locked with what opens them, Overwind locked at every level', async ({ page }) => {
  const errors = watchErrors(page);
  await town(page);
  await openPlace(page, 'clocktower');
  await expect(page.getByTestId('clocktower-panel')).toBeVisible();
  await expect(page.getByTestId('clocktower-panel')).toContainText(/overwind opens after a journeyman win/i);
  // modes
  await expect(page.getByTestId('mode-journeyman')).toHaveAttribute('aria-pressed', 'true');
  for (const id of ['apprentice', 'journeyman']) await expect(page.getByTestId(`mode-${id}`)).toHaveAttribute('data-locked', 'false');
  for (const id of ['master', 'clockwork']) {
    await expect(page.getByTestId(`mode-${id}`)).toHaveAttribute('data-locked', 'true');
    await expect(page.getByTestId(`mode-${id}`)).toBeDisabled();
  }
  await expect(page.getByTestId('mode-lock-master')).toContainText(/journeyman/i);
  await expect(page.getByTestId('mode-lock-clockwork')).toContainText(/master/i);
  await expect(page.getByTestId('mode-lock-apprentice')).toHaveCount(0);
  // Overwind: off, and every level locked with its reason
  await expect(page.getByTestId('overwind-level-0')).toHaveAttribute('aria-pressed', 'true');
  for (let n = 1; n <= 10; n++) {
    await expect(page.getByTestId(`overwind-level-${n}`), `level ${n}`).toHaveAttribute('data-locked', 'true');
    await expect(page.getByTestId(`overwind-level-${n}`)).toBeDisabled();
    await expect(page.getByTestId(`overwind-lock-${n}`), `reason for ${n}`).toContainText(LOCK_WORDS[n]);
    await expect(page.getByTestId(`overwind-twist-${n}`)).toHaveCount(0);
  }
  // the hook says the same
  const door = await g<Awaited<ReturnType<G['__game']['clocktower']>>>(page, 'g.clocktower()');
  expect([door.mode, door.overwind, door.overwindOpen]).toEqual(['journeyman', 0, 0]);
  expect(door.modes.map((m) => [m.id, m.locked])).toEqual([['apprentice', false], ['journeyman', false], ['master', true], ['clockwork', true]]);
  expect(door.modes.filter((m) => m.locked).every((m) => !!m.reason)).toBe(true);
  expect(door.levels.length).toBe(11);
  expect(door.levels.filter((l) => l.level > 0).every((l) => l.locked && !!l.reason)).toBe(true);
  // layout: 40 px taps, no sideways scroll
  for (const id of ['mode-apprentice', 'mode-journeyman', 'overwind-level-0']) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box && box.width >= 39.5 && box.height >= 39.5, `${id} is a 40 px target`).toBe(true);
  }
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('AD5 (E): picking Apprentice saves it to the profile; locked entries cannot be picked; Apprentice and a loss leave Overwind locked', async ({ page }) => {
  const errors = watchErrors(page);
  await town(page);
  await openPlace(page, 'clocktower');
  await press(page, page.getByTestId('mode-apprentice'));
  await expect(page.getByTestId('mode-apprentice')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('mode-journeyman')).toHaveAttribute('aria-pressed', 'false');
  expect((await g<{ lastMode: string }>(page, 'g.profile()')).lastMode).toBe('apprentice');
  expect((await g<{ mode: string }>(page, 'g.clocktower()')).mode).toBe('apprentice');
  // an Apprentice win does not open Overwind (AD5), nor Master
  await press(page, page.getByTestId('place-close'));
  await g(page, 'g.setSpeed("skip")');
  await g(page, 'g.climb("tinker")');
  await g(page, 'g.cheat.finishRun("win")');
  await leaveResult(page);
  const p = await g<{ modesUnlocked: string[]; rewards: { overwind: number } }>(page, 'g.profile()');
  expect(p.rewards.overwind).toBe(0);
  expect(p.modesUnlocked).not.toContain('master');
  await openPlace(page, 'clocktower');
  await expect(page.getByTestId('overwind-level-1')).toHaveAttribute('data-locked', 'true');
  await expect(page.getByTestId('mode-master')).toHaveAttribute('data-locked', 'true');
  expect(errors).toEqual([]);
});

test('AD5 (E): after a Journeyman win Master and Overwind 1 to 3 open; the choice is saved, applied (twists 1 to 3), shown on the gate and the HUD, and survives a reload', async ({ page }) => {
  const errors = watchErrors(page);
  await town(page);
  await winOnJourneyman(page);
  const prof = await g<{ modesUnlocked: string[]; rewards: { overwind: number } }>(page, 'g.profile()');
  expect(prof.modesUnlocked).toContain('master');
  expect(prof.modesUnlocked).not.toContain('clockwork');
  expect(prof.rewards.overwind).toBe(3);

  await openPlace(page, 'clocktower');
  await expect(page.getByTestId('mode-master')).toHaveAttribute('data-locked', 'false');
  await expect(page.getByTestId('mode-clockwork')).toHaveAttribute('data-locked', 'true');
  await expect(page.getByTestId('mode-lock-clockwork')).toContainText(/master/i);
  for (let n = 1; n <= 3; n++) await expect(page.getByTestId(`overwind-level-${n}`), `level ${n} open`).toHaveAttribute('data-locked', 'false');
  for (let n = 4; n <= 10; n++) {
    await expect(page.getByTestId(`overwind-level-${n}`), `level ${n} locked`).toHaveAttribute('data-locked', 'true');
    await expect(page.getByTestId(`overwind-lock-${n}`)).toContainText(LOCK_WORDS[n]);
  }
  expect((await g<{ overwindOpen: number }>(page, 'g.clocktower()')).overwindOpen).toBe(3);

  // pick Master and Overwind 3: level 3 applies twists 1 to 3
  await press(page, page.getByTestId('mode-master'));
  await press(page, page.getByTestId('overwind-level-3'));
  await expect(page.getByTestId('mode-master')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('overwind-level-3')).toHaveAttribute('aria-pressed', 'true');
  for (const [n, name] of [[1, 'Loose Bolts'], [2, 'Short Days'], [3, 'Thick Plates']] as [number, string][]) await expect(page.getByTestId(`overwind-twist-${n}`)).toContainText(name);
  await expect(page.getByTestId('overwind-twist-4')).toHaveCount(0);
  const saved = await g<{ lastMode: string; lastOverwind: number }>(page, 'g.profile()');
  expect([saved.lastMode, saved.lastOverwind]).toEqual(['master', 3]);
  await noSidewaysScroll(page);

  // the gate shows it
  await press(page, page.getByTestId('place-close'));
  await openPlace(page, 'gate');
  await expect(page.getByTestId('gate-mode')).toHaveAttribute('data-mode', 'master');
  await expect(page.getByTestId('gate-mode')).toHaveAttribute('data-overwind', '3');
  await expect(page.getByTestId('gate-mode')).toContainText(/master/i);
  await expect(page.getByTestId('gate-mode')).toContainText(/overwind 3/i);

  // the run starts on it: Master has 11 hours, Overwind 2 takes one; the HUD says so
  await press(page, page.getByTestId('climb'));
  await expect(page.getByTestId('act-section')).toBeVisible();
  const run = await g<{ hours: number; config: { mode: string; overwind: number } }>(page, 'g.runState()');
  expect([run.config.mode, run.config.overwind, run.hours]).toEqual(['master', 3, 10]);
  await expect(page.getByTestId('run-mode')).toHaveAttribute('data-mode', 'master');
  await expect(page.getByTestId('run-mode')).toHaveAttribute('data-overwind', '3');
  await expect(page.getByTestId('run-mode')).toContainText(/master/i);
  await expect(page.getByTestId('run-mode')).toContainText(/overwind 3/i);
  await noSidewaysScroll(page);

  // a reload keeps the choice and the run's mode
  await page.reload();
  expect(await page.evaluate(() => (window as unknown as G).__game.useSlot(1))).toBe(true);
  await expect(page.getByTestId('bellfoot')).toBeVisible();
  const after = await g<{ lastMode: string; lastOverwind: number }>(page, 'g.profile()');
  expect([after.lastMode, after.lastOverwind]).toEqual(['master', 3]);
  const run2 = await g<{ config: { mode: string; overwind: number } } | null>(page, 'g.runState()');
  expect([run2?.config.mode, run2?.config.overwind]).toEqual(['master', 3]);
  await openPlace(page, 'clocktower');
  await expect(page.getByTestId('mode-master')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('overwind-level-3')).toHaveAttribute('aria-pressed', 'true');
  await press(page, page.getByTestId('place-close'));
  await openPlace(page, 'gate');
  await press(page, page.getByTestId('continue-climb'));
  await expect(page.getByTestId('run-mode')).toHaveAttribute('data-mode', 'master');
  await expect(page.getByTestId('run-mode')).toHaveAttribute('data-overwind', '3');
  expect(errors).toEqual([]);
});

test('the owner\'s cheats set the mode and level without the locks; the next run and its HUD read them', async ({ page }) => {
  const errors = watchErrors(page);
  await town(page);
  await g(page, 'g.cheat.setMode("clockwork")');
  await g(page, 'g.cheat.setOverwind(10)');
  const p = await g<{ lastMode: string; lastOverwind: number }>(page, 'g.profile()');
  expect([p.lastMode, p.lastOverwind]).toEqual(['clockwork', 10]);
  const door = await g<{ mode: string; overwind: number; modes: { id: string; locked: boolean }[] }>(page, 'g.clocktower()');
  expect([door.mode, door.overwind]).toEqual(['clockwork', 10]);
  expect(door.modes.find((m) => m.id === 'clockwork')?.locked, 'the door still says what is earned').toBe(true);
  await g(page, 'g.setSpeed("skip")');
  await g(page, 'g.climb("tinker")');
  const run = await g<{ hours: number; config: { mode: string; overwind: number } }>(page, 'g.runState()');
  expect([run.config.mode, run.config.overwind, run.hours]).toEqual(['clockwork', 10, 9]);
  await expect(page.getByTestId('run-mode')).toHaveAttribute('data-mode', 'clockwork');
  await expect(page.getByTestId('run-mode')).toHaveAttribute('data-overwind', '10');
  expect(errors).toEqual([]);
});

test("Overwind 9: the Foreman's extra part, taken from the plan the Spire remembers, is on screen at the fallback position", async ({ page }) => {
  const errors = watchErrors(page);
  await town(page);
  await g(page, 'g.cheat.setPlanHistory(["plating", "plating", "plating"])');
  await g(page, 'g.cheat.setOverwind(9)');
  await g(page, 'g.cheat.runFight(["foreman"])');
  const marker = page.getByTestId('enemy-part-e0-mem-drill');
  await expect(marker).toBeVisible();
  const box = await marker.boundingBox();
  const vp = page.viewportSize() ?? { width: 1280, height: 800 };
  expect(box, 'the marker has a position').toBeTruthy();
  expect(box && box.width > 0 && box.height > 0, 'and a size').toBe(true);
  expect(box && box.x >= -1 && box.y >= -1 && box.x + box.width <= vp.width + 1 && box.y + box.height <= vp.height + 1, 'inside the viewport').toBe(true);
  await expect(page.getByTestId('enemy-part-e0-foreman-wrench')).toBeVisible(); // his own parts are still there
  await noSidewaysScroll(page);
  // below Overwind 9 he has no such part
  await g(page, 'g.cheat.setOverwind(8)');
  await g(page, 'g.cheat.runFight(["foreman"])');
  await expect(page.getByTestId('enemy-part-e0-foreman-wrench')).toBeVisible();
  await expect(page.getByTestId('enemy-part-e0-mem-drill')).toHaveCount(0);
  expect(errors).toEqual([]);
});
