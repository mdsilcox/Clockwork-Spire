// B10a acceptance (browser), owner: bellfoot-ui. Desktop (1280x800) and phone (667x375 touch).
// docs/acceptance.md BF1, BF2 (E), BF6 (the town half), AR6 for Bellfoot (code ambience and a sound bed);
// docs/briefs/B10a-bellfoot.md "Semantics" and "Round 2 decisions". Written by the orchestrator's test-porter in B10a.0.
// CONTRACT test ids and hooks the bellfoot-ui lane implements (src/ui/town.ts gives the place ids and order):
//   bellfoot                  the town screen root (replaces `workshop` as the screen after a run, on Continue, and on first entry)
//   town-street               the street's own frame: it scrolls sideways inside itself (overflow-x auto or scroll), never the page
//   place-{id}                one button per place on the street, id from `townPlaces` (gate, workshop, sprocket, trophies, archivist,
//                             stall-{residentId}, clocktower), 40 px tap target; the stall ones only for residents living there
//   town-tinker               the tinker marker: data-at="{placeId}" (where he stands or is heading), data-walking="true" while he
//                             walks to a tapped place and "false" on arrival; tapping the same place again while he walks opens it at once
//   town-menu                 the menu button; town-menu-panel its panel; town-menu-{id} one item per place (opens it, no walking)
//   place-panel               the opened place's panel over the street, data-place="{placeId}"; place-close closes it
//   keyboard: with the street focused, ArrowRight and ArrowLeft move the tinker to the next or previous place (he walks), Enter opens
//             the place he stands at (the same panel as a tap)
//   sprocket                  existing id; data-mood idle | happy | celebrate | comfort | sleepy | pet | walk (walk while he follows the
//                             tinker); data-collar="{collarId}" or "" for none; `__game.sprocket()` returns the same mood
//   Sprocket's corner panel   collar-{id} buttons (red, bell, dusk) for the EARNED collars only, aria-pressed on the worn one;
//                             collar-none takes it off; the choice is `profile.collar` and is drawn on his rig as a band
//   The archivist panel       archivist-tab-journal | -bestiary | -note | -map, each showing archivist-panel-{tab};
//                             journal: journal-page (one per page found); bestiary: bestiary-entry-{enemyId} with data-met="true|false"
//                             for every enemy; note: archivist-line (the B9a line, moved here from the start-run panel; absent without
//                             history); map: map-landmark-{id} for every landmark the profile has, with its text
//   The gate panel           holds the existing `climb` button (and Continue climb / abandon as the Workshop had them)
//   The Workshop panel       the existing tabs (tab-bench, tab-chassis, tab-notes, tab-parts, tab-history) and their contents unchanged
//   oil-flask                the Oil Flask chip on the climb screen (a button, text contains the count), absent at 0 flasks; a tap heals
//                            15 HP without spending an hour
//   __game.town()            { place: current/last place id, places: [{ id, label, x }] } (the contract's stub)
//   __game.cheat.addResident(id), cheat.addLandmark(id)  add to the active profile as finishRun would, save, re-render (stubs today)
//   audio: under ?sound=1 the town plays the `bellfoot` track (`audioDebug().track`, src/audio/music.ts)
// Specs that open the Workshop today (workshop.spec.ts, v2-memory.spec.ts, v2-trophies.spec.ts, career.spec.ts, helpers.ts,
// src/app/autoplay.ts) break BY DESIGN when the screen id becomes `bellfoot`; bellfoot-ui updates them, never weakening an assertion.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { noSidewaysScroll, press, skipFirstLaunch, watchErrors } from './helpers';
import { ALL_PLACES, townPlaces } from '../src/ui/town';

type G = {
  __game: {
    newSlot(n: 1 | 2 | 3, name: string): Promise<boolean>;
    useSlot(n: 1 | 2 | 3): Promise<boolean>;
    climb(chassis: string): boolean;
    setSpeed(s: string): void;
    sprocket(): string;
    profile(): { collar: string | null; residents: string[]; landmarks: string[]; collars: string[] } | null;
    runState(): { hp: number; hour?: number; oilFlasks: number } | null;
    town(): { place: string; places: { id: string; label: string; x: number }[] };
    rig: { stats(): { ready: boolean; painted: string[] } };
    cheat: {
      addResident(id: string): void;
      addLandmark(id: string): void;
      unlock(id: string): void;
      finishRun(r: 'win' | 'loss', floor?: number): void;
      setHp(n: number): void;
      idle(ms: number): void;
      setPlanHistory(p: string[]): void;
    };
  };
};
const g = <T,>(page: Page, expr: string): Promise<T> => page.evaluate((e) => new Function('g', `return (async () => (${e}))()`)((window as unknown as G).__game), expr) as Promise<T>;

async function town(page: Page, url = '/'): Promise<void> {
  await skipFirstLaunch(page);
  await page.goto(url);
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
const everyone = async (page: Page): Promise<void> => {
  for (const r of ['oil-merchant', 'apprentice', 'lamplighter', 'hour-ghost', 'traders-cousin']) await g(page, `g.cheat.addResident('${r}')`);
};

test('BF1: after a run Bellfoot shows, and Sprocket reacts as in v1 (celebrate, wiggle, nudge)', async ({ page }) => {
  const errors = watchErrors(page);
  await town(page);
  await g(page, 'g.setSpeed("skip")');
  await g(page, 'g.climb("tinker")');
  await g(page, 'g.cheat.finishRun("win")');
  await leaveResult(page);
  expect(await g(page, 'g.sprocket()')).toBe('celebrate');
  await expect(page.getByTestId('sprocket')).toHaveAttribute('data-mood', 'celebrate');
  await g(page, 'g.climb("tinker")');
  await g(page, 'g.cheat.finishRun("loss", 20)');
  await leaveResult(page);
  expect(await g(page, 'g.sprocket()')).toBe('happy');
  await g(page, 'g.climb("tinker")');
  await g(page, 'g.cheat.finishRun("loss", 3)');
  await leaveResult(page);
  expect(await g(page, 'g.sprocket()')).toBe('comfort');
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('BF1: every place is reachable by walking (tap, tap again to skip) and by the town menu', async ({ page }) => {
  const errors = watchErrors(page);
  await town(page);
  await everyone(page);
  const want: string[] = ALL_PLACES.map((p) => p.id);
  const places = (await g<{ places: { id: string }[] }>(page, 'g.town()')).places.map((p) => p.id);
  expect(places).toEqual(want);
  expect(places[0]).toBe('gate');
  expect(places[places.length - 1]).toBe('clocktower');
  for (const id of want) {
    await press(page, page.getByTestId(`place-${id}`));
    await expect(page.getByTestId('town-tinker')).toHaveAttribute('data-at', id);
    await press(page, page.getByTestId(`place-${id}`)); // a second tap opens it at once, even while he is still walking
    await expect(page.getByTestId('place-panel')).toHaveAttribute('data-place', id);
    await noSidewaysScroll(page);
    await press(page, page.getByTestId('place-close'));
    await expect(page.getByTestId('place-panel')).toHaveCount(0);
  }
  for (const id of want) {
    await press(page, page.getByTestId('town-menu'));
    await expect(page.getByTestId('town-menu-panel')).toBeVisible();
    await press(page, page.getByTestId(`town-menu-${id}`));
    await expect(page.getByTestId('place-panel')).toHaveAttribute('data-place', id);
    await press(page, page.getByTestId('place-close'));
  }
  expect(errors).toEqual([]);
});

test('BF1: the street is keyboard walkable: Left and Right walk to the next place, Enter opens it', async ({ page }) => {
  await town(page);
  await everyone(page);
  const want: string[] = ALL_PLACES.map((p) => p.id);
  await page.getByTestId('town-street').focus();
  const at = () => page.getByTestId('town-tinker').getAttribute('data-at');
  const first = await at();
  for (let i = 1; i < want.length; i++) {
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('town-tinker')).toHaveAttribute('data-at', want[Math.max(0, want.indexOf(first as string)) + i] ?? want[want.length - 1]);
  }
  await expect(page.getByTestId('town-tinker')).toHaveAttribute('data-at', 'clocktower');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('place-panel')).toHaveAttribute('data-place', 'clocktower');
  await expect(page.getByTestId('place-panel')).toContainText(/journeyman/i);
  await expect(page.getByTestId('place-panel')).toContainText(/overwind opens after a journeyman win/i);
  await press(page, page.getByTestId('place-close'));
  await page.getByTestId('town-street').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('town-tinker')).not.toHaveAttribute('data-at', 'clocktower');
});

test('BF1: the street scrolls inside its frame and never the page', async ({ page }) => {
  await town(page);
  await everyone(page);
  await noSidewaysScroll(page);
  const frame = page.getByTestId('town-street');
  const overflow = await frame.evaluate((el) => getComputedStyle(el).overflowX);
  expect(['auto', 'scroll']).toContain(overflow);
  const phone = (page.viewportSize()?.width ?? 1280) < 700;
  if (phone) expect(await frame.evaluate((el) => el.scrollWidth > el.clientWidth + 50)).toBe(true); // wider than the screen
  await press(page, page.getByTestId('place-clocktower'));
  await expect(page.getByTestId('town-tinker')).toHaveAttribute('data-at', 'clocktower');
  await noSidewaysScroll(page);
  const box = await page.getByTestId('place-clocktower').boundingBox();
  const vw = page.viewportSize()?.width ?? 1280;
  expect(box && box.x >= 0 && box.x + box.width <= vw + 1, 'the last place scrolled into view').toBe(true);
  if (phone) expect(await frame.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  expect(box && box.width >= 39.5 && box.height >= 39.5, '40 px tap target').toBe(true);
});

test('BF2 (E): a resident and a landmark from earlier runs: the stall shows, and the next run shows the lift and every room', async ({ page }) => {
  const errors = watchErrors(page);
  await town(page);
  await expect(page.getByTestId('place-stall-lamplighter')).toHaveCount(0);
  await g(page, "g.cheat.addLandmark('lift')");
  await g(page, "g.cheat.addResident('lamplighter')");
  await expect(page.getByTestId('place-stall-lamplighter')).toBeVisible();
  await press(page, page.getByTestId('place-stall-lamplighter'));
  await press(page, page.getByTestId('place-stall-lamplighter'));
  await expect(page.getByTestId('place-panel')).toContainText(/every room is named/i);
  await press(page, page.getByTestId('place-close'));
  await press(page, page.getByTestId('place-gate'));
  await press(page, page.getByTestId('place-gate'));
  await press(page, page.getByTestId('climb'));
  await expect(page.getByTestId('act-section')).toBeVisible();
  await expect(page.locator('[data-testid^="passage-"][data-kind="lift"][data-locked="false"]').first()).toBeVisible();
  await expect(page.locator('[data-testid^="room-"][data-kind="unknown"]')).toHaveCount(0); // the Lamplighter named every room
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('BF6 (town half): Sprocket and the tinker are painted rigs in the town; Sprocket walks, sleeps and is happy', async ({ page }) => {
  await town(page);
  await expect.poll(async () => (await g<{ painted: string[] }>(page, 'g.rig.stats()')).painted, { timeout: 15_000 }).toEqual(expect.arrayContaining(['sprocket', 'tinker']));
  await expect(page.getByTestId('sprocket')).toHaveAttribute('data-mood', 'idle');
  await press(page, page.getByTestId('place-clocktower'));
  await expect(page.getByTestId('sprocket')).toHaveAttribute('data-mood', 'walk'); // he follows the tinker
  await expect(page.getByTestId('town-tinker')).toHaveAttribute('data-at', 'clocktower');
  await expect(page.getByTestId('town-tinker')).toHaveAttribute('data-walking', 'false', { timeout: 15_000 });
  await expect(page.getByTestId('sprocket')).not.toHaveAttribute('data-mood', 'walk');
  await g(page, 'g.cheat.idle(20000)');
  await expect.poll(() => g(page, 'g.sprocket()')).toBe('sleepy');
});

test('the archivist has four tabs: Journal, Bestiary, the Clockmaker\'s note and the Map', async ({ page }) => {
  const errors = watchErrors(page);
  await town(page);
  await g(page, "g.cheat.unlock('e-first-win')");
  await g(page, "g.cheat.addLandmark('beacon')");
  await press(page, page.getByTestId('town-menu'));
  await press(page, page.getByTestId('town-menu-archivist'));
  await expect(page.getByTestId('place-panel')).toHaveAttribute('data-place', 'archivist');
  for (const tab of ['journal', 'bestiary', 'note', 'map']) {
    await press(page, page.getByTestId(`archivist-tab-${tab}`));
    await expect(page.getByTestId(`archivist-panel-${tab}`)).toBeVisible();
    await noSidewaysScroll(page);
  }
  await press(page, page.getByTestId('archivist-tab-journal'));
  expect(await page.getByTestId('journal-page').count()).toBeGreaterThan(0); // the e-first-win page
  await press(page, page.getByTestId('archivist-tab-bestiary'));
  expect(await page.locator('[data-testid^="bestiary-entry-"]').count()).toBeGreaterThan(10);
  await expect(page.getByTestId('bestiary-entry-cog-rat')).toHaveAttribute('data-met', 'false');
  await press(page, page.getByTestId('archivist-tab-map'));
  await expect(page.getByTestId('map-landmark-beacon')).toContainText(/lit beacon/i);
  await expect(page.getByTestId('map-landmark-lift')).toHaveCount(0);
  await press(page, page.getByTestId('archivist-tab-note'));
  await expect(page.getByTestId('archivist-line')).toHaveCount(0); // no history yet
  await g(page, "g.cheat.setPlanHistory(['plating','plating','burst'])");
  await expect(page.getByTestId('archivist-line')).toContainText(/remembers your Plating/i);
  await expect(page.getByTestId('archivist-line')).toContainText(/drill/i);
  expect(errors).toEqual([]);
});

test("Sprocket's corner offers the earned collars, and the chosen one is drawn on him and kept", async ({ page }) => {
  await town(page);
  await g(page, "g.cheat.unlock('e-pet')"); // the red collar
  await press(page, page.getByTestId('town-menu'));
  await press(page, page.getByTestId('town-menu-sprocket'));
  await expect(page.getByTestId('collar-red')).toBeVisible();
  await expect(page.getByTestId('collar-bell')).toHaveCount(0); // not earned
  await expect(page.getByTestId('sprocket')).toHaveAttribute('data-collar', '');
  await press(page, page.getByTestId('collar-red'));
  await expect(page.getByTestId('collar-red')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('sprocket')).toHaveAttribute('data-collar', 'red');
  expect((await g<{ collar: string | null }>(page, 'g.profile()')).collar).toBe('red');
  await page.waitForTimeout(400);
  await page.reload();
  await expect(page.getByTestId('title')).toBeVisible(); // a reload starts at the title; Continue leads back to the town
  await press(page, page.getByTestId('open-slots'));
  await press(page, page.getByTestId('slot-continue-1'));
  await expect(page.getByTestId('bellfoot')).toBeVisible();
  await expect(page.getByTestId('sprocket')).toHaveAttribute('data-collar', 'red');
  await press(page, page.getByTestId('town-menu'));
  await press(page, page.getByTestId('town-menu-sprocket'));
  await press(page, page.getByTestId('collar-none'));
  await expect(page.getByTestId('sprocket')).toHaveAttribute('data-collar', '');
  expect((await g<{ collar: string | null }>(page, 'g.profile()')).collar).toBeNull();
});

test('the Oil Flask chip on the climb screen: two from the Oil Merchant, a tap heals 15 and costs no hour', async ({ page }) => {
  const errors = watchErrors(page);
  await town(page);
  await g(page, 'g.climb("tinker")');
  await expect(page.getByTestId('act-section')).toBeVisible();
  await expect(page.getByTestId('oil-flask')).toHaveCount(0); // no resident, no flasks
  await g(page, "g.cheat.finishRun('loss', 3)");
  await leaveResult(page);
  await g(page, "g.cheat.addResident('oil-merchant')");
  await g(page, 'g.climb("tinker")');
  await expect(page.getByTestId('oil-flask')).toBeVisible();
  await expect(page.getByTestId('oil-flask')).toContainText('2');
  await g(page, 'g.cheat.setHp(30)');
  const hour = (await g<{ hour?: number }>(page, 'g.runState()')).hour;
  await press(page, page.getByTestId('oil-flask'));
  await expect(page.getByTestId('oil-flask')).toContainText('1');
  const after = await g<{ hp: number; hour?: number }>(page, 'g.runState()');
  expect(after.hp).toBe(45);
  expect(after.hour).toBe(hour);
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('the town has its own ambient sound bed: the bellfoot track plays under ?sound=1', async ({ page }) => {
  await town(page, '/?sound=1');
  const MUSIC = ['', 'src', 'audio', 'music.ts'].join('/');
  await expect
    .poll(
      () =>
        page.evaluate(async (path) => {
          const m = (await import(/* @vite-ignore */ path)) as typeof import('../src/audio/music');
          return m.audioDebug().track;
        }, MUSIC),
      { timeout: 10_000 },
    )
    .toBe('bellfoot');
});

test('Continue from the title lands in Bellfoot', async ({ page }) => {
  await town(page);
  await page.waitForTimeout(400); // the save
  await page.reload();
  await expect(page.getByTestId('title')).toBeVisible();
  await press(page, page.getByTestId('open-slots'));
  await press(page, page.getByTestId('slot-continue-1'));
  await expect(page.getByTestId('bellfoot')).toBeVisible();
  const t = await g<{ places: { id: string }[] }>(page, 'g.town()');
  expect(t.places.map((p) => p.id)).toEqual(townPlaces([]).map((p) => p.id));
  await noSidewaysScroll(page);
});
