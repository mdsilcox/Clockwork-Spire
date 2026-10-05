// B8 acceptance (browser): the act screen, visibility, saving mid-act, the workbench and traders, painted-enemy frame
// time (docs/acceptance.md CL7, CL8 E without the Lamplighter, CL11, SV3 to SV5 E, AR4). Runs on the desktop (1280x800)
// and phone (667x375 touch) projects, except AR4 (phone only). Written by the orchestrator's test-porter in the B8.0
// contract step; the climb-ui and rig-hub lanes build the screens and hooks below. Lanes may adapt a test to the code
// but never weaken it.
//
// B8 CONTRACT test ids (the climb-ui lane implements them):
//   The act screen replaces the map (`act-section` is the screen):
//     act-section                  the section cut-away; every room and passage inside it, whole at both sizes
//     room-<id>                    a button per room ('r0'...). Attributes: data-kind = the room's kind when it is
//                                  revealed ('entry','fight','workbench','oil','trader','event','vault','door'), else
//                                  'unknown' (a silhouette); data-here="true" on the player's room. 40 px+ tap target.
//                                  Tapping a connected room walks there (hour +1) and resolves it; tapping a room
//                                  that is not connected does nothing; tapping the far room of a locked passage
//                                  opens the `door` screen (no hour).
//     passage-<i>                  one element per entry of section.passages (i = its index), data-locked="true|false"
//     clock                        text like "Hour 3 of 12"; hours-left: text containing the number of hours left
//     elite-<i>                    marker of roaming elite i (index into run.elites), data-room = its room id now
//     elite-next-<i>               marker of the room it steps to next, data-room = that room id
//     bell                         only while the player stands in the warden's door room: a button whose label shows
//                                  the payout ("... 36 Scrap, 12 Brass ..."); absent (count 0) anywhere else
//     walker-tinker, walker-sprocket   always shown on the act screen at the player's room; data-room = where they
//                                  are or are heading; data-walking="true" while the walk animation runs (speed '1x'),
//                                  "false" otherwise (speed 'skip' never shows "true")
//   Screens, opened by arriving in the room (the phase of the same name):
//     workbench   wb-part-<uid> (select a part from the bin), wb-upgrade, wb-remove, wb-fuse (select two parts first),
//                 fuse-candidate-<n> (the two results, n = 0 or 1; tapping one picks it), wb-leave, scrap-count
//     trader      trade-item-<i> (select stock item i), trade-offer-<uid> (select one of your parts to hand over,
//                 toggles), trade-cost (the Scrap you would pay now, as plain number text), trade-buy, trade-leave
//     door        (a locked passage) door-key (disabled without a key), door-pick (25 Scrap and 1 hour), door-cancel
//     oil         oil-rest, oil-polish, oil-leave
//   Combat, salvage and the rest keep their ids (`combat`, `salvage-tray`, `salvage-done`...).
// B8 CONTRACT hooks on window.__game (existing: setSpeed, runState() -> RunState, practice, cheat.winFight):
//   cheat.startClimb(seed)       a new run with a generated act 1 section (startAct), on the act screen
//   cheat.fixtureSection(o?)     a new run on testkit's sectionFixture() (see tests/v2/b8-climb.test.ts for the map);
//                                o = { at?: roomId (default 'r0'), hour?: number, clear?: roomIds marked cleared };
//                                the player stands in `at`, revealed with its neighbors
//   move(roomId): boolean        the same as tapping the room
//   cheat.gotoRoom(roomId)       arrive in a room as if walked there, at no hour: opens its screen or fight
//   cheat.setScrap(n), cheat.setHour(n), cheat.setKeys(n)
//   cheat.giveParts(ids): number[]   add parts to the bin, returns their uids
//   cheat.openTrader(stock)      open the trader screen with exactly this stock (TradeItem[])
//   rig.stats()                  { ready: boolean, painted: string[] (def ids the RigHub drew last frame),
//                                  samples: number[] (rig work per frame in ms since reset), draws: number (frames drawn, cumulative) }
//   rig.reset()                  clear `samples`
//   rig.loseContext(), rig.restoreContext()   simulate WebGL context loss and restore (WEBGL_lose_context)
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { noSidewaysScroll, press, skipFirstLaunch, watchErrors } from './helpers';

interface RoomS {
  id: string;
  kind: string;
  floor: number;
  slot: number;
  visited: boolean;
  revealed: boolean;
  cleared: boolean;
}
interface RS {
  phase: string;
  roomId: string;
  hour: number;
  hours: number;
  scrap: number;
  keys: number;
  prepared?: number;
  bin: { uid: number; defId: string; plus: boolean }[];
  elites: { defId: string; patrol: string[]; at: number; defeated: boolean }[];
  section: { rooms: RoomS[]; passages: { a: string; b: string; locked?: boolean }[]; entry: string; door: string };
  stats: { removals?: number };
}
interface Stock {
  kind: 'part' | 'trinket' | 'oil';
  id?: string;
  value: number;
  sold: boolean;
}
type G = {
  __game: {
    setSpeed(s: string): void;
    runState(): RS | null;
    move(roomId: string): boolean;
    practice(o: { enemies?: string[]; bin?: string | string[]; seed?: number }): void;
    cheat: {
      startClimb(seed: number): void;
      fixtureSection(o?: { at?: string; hour?: number; clear?: string[] }): void;
      gotoRoom(id: string): void;
      setScrap(n: number): void;
      setHour(n: number): void;
      setKeys(n: number): void;
      giveParts(ids: string[]): number[];
      openTrader(stock: Stock[]): void;
      winFight(): Promise<void>;
    };
    rig: {
      stats(): { ready: boolean; painted: string[]; samples: number[]; draws: number };
      reset(): void;
      loseContext(): void;
      restoreContext(): void;
    };
  };
};

const rs = async (page: Page): Promise<RS> => {
  const s = await page.evaluate(() => (window as unknown as G).__game.runState());
  if (!s) throw new Error('no run');
  return s;
};
const fixture = (page: Page, o: { at?: string; hour?: number; clear?: string[] } = {}): Promise<void> =>
  page.evaluate((v) => {
    const g = (window as unknown as G).__game;
    g.setSpeed('skip');
    g.cheat.fixtureSection(v);
  }, o);
const climb = (page: Page, seed: number): Promise<void> =>
  page.evaluate((s) => {
    const g = (window as unknown as G).__game;
    g.setSpeed('skip');
    g.cheat.startClimb(s);
  }, seed);

test.beforeEach(async ({ page }) => {
  await skipFirstLaunch(page);
  await page.goto('/');
});

/** Every room button sits whole inside the viewport and is a 40 px tap target. */
async function expectWholeSection(page: Page): Promise<void> {
  const s = (await rs(page)).section;
  const vp = page.viewportSize()!;
  for (const r of s.rooms) {
    const loc = page.getByTestId(`room-${r.id}`);
    await expect(loc, r.id).toBeVisible();
    const b = (await loc.boundingBox())!;
    expect(b.x, `${r.id} left`).toBeGreaterThanOrEqual(-0.5);
    expect(b.y, `${r.id} top`).toBeGreaterThanOrEqual(-0.5);
    expect(b.x + b.width, `${r.id} right`).toBeLessThanOrEqual(vp.width + 0.5);
    expect(b.y + b.height, `${r.id} bottom`).toBeLessThanOrEqual(vp.height + 0.5);
    expect(b.width, `${r.id} width`).toBeGreaterThanOrEqual(39.5);
    expect(b.height, `${r.id} height`).toBeGreaterThanOrEqual(39.5);
  }
  await expect(page.locator('[data-testid^="passage-"]')).toHaveCount(s.passages.length);
  for (let i = 0; i < s.passages.length; i++) {
    await expect(page.getByTestId(`passage-${i}`)).toHaveAttribute('data-locked', s.passages[i].locked ? 'true' : 'false');
  }
}

test('CL7: the act screen shows the whole fixture section, the clock, hours left and the elite\'s next room, with no sideways scroll', async ({ page }) => {
  const errors = watchErrors(page);
  await fixture(page, { hour: 3 });
  await expect(page.getByTestId('act-section')).toBeVisible();
  await expectWholeSection(page);
  await expect(page.getByTestId('clock')).toContainText('3');
  await expect(page.getByTestId('clock')).toContainText('12');
  await expect(page.getByTestId('hours-left')).toContainText('9');
  await expect(page.getByTestId('elite-0')).toHaveAttribute('data-room', 'r3');
  await expect(page.getByTestId('elite-next-0')).toHaveAttribute('data-room', 'r4');
  await expect(page.getByTestId('room-r0')).toHaveAttribute('data-here', 'true');
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('CL7: a generated section is whole on screen too, every elite has its marker and next room', async ({ page }) => {
  const errors = watchErrors(page);
  for (const seed of [3, 8]) {
    await climb(page, seed);
    await expect(page.getByTestId('act-section')).toBeVisible();
    await expectWholeSection(page);
    const s = await rs(page);
    await expect(page.getByTestId('hours-left')).toContainText(String(s.hours));
    for (let i = 0; i < s.elites.length; i++) {
      const e = s.elites[i];
      await expect(page.getByTestId(`elite-${i}`)).toHaveAttribute('data-room', e.patrol[e.at]);
      await expect(page.getByTestId(`elite-next-${i}`)).toHaveAttribute('data-room', e.patrol[(e.at + 1) % e.patrol.length]);
    }
    await noSidewaysScroll(page);
  }
  expect(errors).toEqual([]);
});

test('CL7: tapping a connected room walks there (an hour passes, elites step); a room that is not connected does nothing', async ({ page }) => {
  const errors = watchErrors(page);
  await fixture(page, { clear: ['r1'] });
  await press(page, page.getByTestId('room-r4')); // not connected from r0
  expect((await rs(page)).roomId).toBe('r0');
  expect((await rs(page)).hour).toBe(0);
  await press(page, page.getByTestId('room-r1'));
  await expect(page.getByTestId('room-r1')).toHaveAttribute('data-here', 'true');
  const s = await rs(page);
  expect(s.roomId).toBe('r1');
  expect(s.hour).toBe(1);
  expect(s.elites[0].at).toBe(1);
  await expect(page.getByTestId('hours-left')).toContainText('11');
  await expect(page.getByTestId('elite-0')).toHaveAttribute('data-room', 'r4');
  await expect(page.getByTestId('elite-next-0')).toHaveAttribute('data-room', 'r6');
  await expect(page.getByTestId('walker-tinker')).toHaveAttribute('data-room', 'r1');
  await expect(page.getByTestId('walker-tinker')).toHaveAttribute('data-walking', 'false'); // skip speed: no animation
  expect(errors).toEqual([]);
});

test('CL7: at normal speed the tinker and Sprocket walk to the room, then stand there', async ({ page }) => {
  const errors = watchErrors(page);
  await fixture(page, { clear: ['r1'] });
  await page.evaluate(() => (window as unknown as G).__game.setSpeed('1x'));
  await press(page, page.getByTestId('room-r1'));
  await expect(page.getByTestId('walker-tinker')).toHaveAttribute('data-walking', 'true', { timeout: 1500 });
  await expect(page.getByTestId('walker-sprocket')).toHaveAttribute('data-walking', 'true', { timeout: 1500 });
  await expect(page.getByTestId('walker-tinker')).toHaveAttribute('data-walking', 'false', { timeout: 15_000 });
  await expect(page.getByTestId('walker-sprocket')).toHaveAttribute('data-room', 'r1');
  expect((await rs(page)).roomId).toBe('r1');
  expect(errors).toEqual([]);
});

test('CL7: the bell shows only at the warden\'s door, with its payout; ringing it starts the warden fight Prepared', async ({ page }) => {
  const errors = watchErrors(page);
  await fixture(page, { at: 'r0' });
  await expect(page.getByTestId('bell')).toHaveCount(0);
  await fixture(page, { at: 'r8', hour: 6 });
  await page.evaluate(() => (window as unknown as G).__game.cheat.setScrap(10));
  const bell = page.getByTestId('bell');
  await expect(bell).toBeVisible();
  await expect(bell).toContainText('36');
  await expect(bell).toContainText('12');
  await press(page, bell);
  await expect(page.getByTestId('combat')).toBeVisible();
  const s = await rs(page);
  expect(s.scrap).toBe(46);
  expect(s.prepared).toBe(2);
  expect(errors).toEqual([]);
});

test('CL8 (E, without the Lamplighter): a room and its neighbors show their kind, the others are silhouettes', async ({ page }) => {
  const errors = watchErrors(page);
  await fixture(page, { clear: ['r1'] });
  const kind = (id: string) => page.getByTestId(`room-${id}`).getAttribute('data-kind');
  expect(await kind('r0')).toBe('entry');
  expect(await kind('r1')).toBe('fight');
  for (const id of ['r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8']) expect(await kind(id), id).toBe('unknown');
  await press(page, page.getByTestId('room-r1'));
  await expect(page.getByTestId('room-r1')).toHaveAttribute('data-here', 'true');
  expect(await kind('r2')).toBe('oil');
  expect(await kind('r3')).toBe('workbench');
  for (const id of ['r4', 'r5', 'r6', 'r7', 'r8']) expect(await kind(id), id).toBe('unknown');
  expect(errors).toEqual([]);
});

test('CL11: reloading mid-act restores the same room, hour, elite positions, layout and revealed rooms', async ({ page }) => {
  const errors = watchErrors(page);
  await fixture(page, { clear: ['r1'] });
  for (const id of ['r1', 'r0', 'r1']) {
    await press(page, page.getByTestId(`room-${id}`));
    await expect(page.getByTestId(`room-${id}`)).toHaveAttribute('data-here', 'true');
  }
  const before = await rs(page);
  expect(before.hour).toBe(3);
  await page.waitForTimeout(400); // let the autosave land
  await page.reload();
  await expect(page.getByTestId('act-section')).toBeVisible();
  const after = await rs(page);
  expect(after.roomId).toBe(before.roomId);
  expect(after.hour).toBe(before.hour);
  expect(after.elites).toEqual(before.elites);
  expect(after.section).toEqual(before.section); // layout, locks, visited, cleared and revealed flags
  await expect(page.getByTestId('room-r2')).toHaveAttribute('data-kind', 'oil');
  await expect(page.getByTestId('room-r5')).toHaveAttribute('data-kind', 'unknown');
  await expect(page.getByTestId('elite-0')).toHaveAttribute('data-room', before.elites[0].patrol[before.elites[0].at]);
  expect(errors).toEqual([]);
});

test('CL11: a generated section survives a reload too', async ({ page }) => {
  const errors = watchErrors(page);
  await climb(page, 4);
  await page.evaluate(() => (window as unknown as G).__game.cheat.setHour(2));
  const before = await rs(page);
  await page.waitForTimeout(400);
  await page.reload();
  await expect(page.getByTestId('act-section')).toBeVisible();
  const after = await rs(page);
  expect(after.section).toEqual(before.section);
  expect(after.elites).toEqual(before.elites);
  expect(after.hour).toBe(2);
  expect(after.roomId).toBe(before.roomId);
  expect(errors).toEqual([]);
});

// ---------- the workbench and traders ----------

async function atWorkbench(page: Page, scrap: number): Promise<void> {
  await fixture(page, { at: 'r1', clear: ['r1'] });
  await page.evaluate((n) => {
    const g = (window as unknown as G).__game;
    g.cheat.setScrap(n);
    g.cheat.gotoRoom('r3');
  }, scrap);
  await expect(page.getByTestId('workbench')).toBeVisible();
}
const give = (page: Page, ids: string[]): Promise<number[]> => page.evaluate((v) => (window as unknown as G).__game.cheat.giveParts(v), ids);
async function select(page: Page, loc: Locator): Promise<void> {
  await loc.scrollIntoViewIfNeeded();
  await press(page, loc);
}

test('SV3 (E): two Common Gears fuse into one of two Uncommon Gear candidates', async ({ page }) => {
  const errors = watchErrors(page);
  await fixture(page, { at: 'r1', clear: ['r1'] });
  const [a, b] = await give(page, ['spur', 'spur']);
  await page.evaluate(() => (window as unknown as G).__game.cheat.gotoRoom('r3'));
  await expect(page.getByTestId('workbench')).toBeVisible();
  const before = await rs(page);
  await select(page, page.getByTestId(`wb-part-${a}`));
  await select(page, page.getByTestId(`wb-part-${b}`));
  await select(page, page.getByTestId('wb-fuse'));
  const c0 = page.getByTestId('fuse-candidate-0');
  const c1 = page.getByTestId('fuse-candidate-1');
  await expect(c0).toBeVisible();
  await expect(c1).toBeVisible();
  await expect(page.getByTestId('fuse-candidate-2')).toHaveCount(0);
  const names = /Bevel|Crown|Auger/i; // the unlocked Uncommon Gears (content.md)
  await expect(c0).toContainText(names);
  await expect(c1).toContainText(names);
  await noSidewaysScroll(page);
  await select(page, c1);
  const after = await rs(page);
  expect(after.bin.some((p) => p.uid === a || p.uid === b)).toBe(false);
  expect(after.bin.length).toBe(before.bin.length - 1);
  expect(['bevel', 'crown', 'auger']).toContain(after.bin[after.bin.length - 1].defId);
  expect(after.scrap).toBe(before.scrap); // fuse is free
  expect(errors).toEqual([]);
});

test('SV4 (E): barter a Common and 40 Scrap for a Rare (value 60); buying with Scrap alone costs 75', async ({ page }) => {
  const errors = watchErrors(page);
  await fixture(page, { at: 'r2', clear: ['r1'] });
  const [common] = await give(page, ['spur']);
  await page.evaluate(() => {
    const g = (window as unknown as G).__game;
    g.cheat.setScrap(100);
    g.cheat.openTrader([
      { kind: 'part', id: 'volute', value: 60, sold: false },
      { kind: 'part', id: 'cam', value: 20, sold: false },
    ]);
  });
  await expect(page.getByTestId('trader')).toBeVisible();
  const before = await rs(page);
  await select(page, page.getByTestId('trade-item-0'));
  await expect(page.getByTestId('trade-cost')).toHaveText('75');
  await select(page, page.getByTestId(`trade-offer-${common}`));
  await expect(page.getByTestId('trade-cost')).toHaveText('40');
  await noSidewaysScroll(page);
  await select(page, page.getByTestId('trade-buy'));
  await expect.poll(async () => (await rs(page)).scrap).toBe(60);
  const after = await rs(page);
  expect(after.bin.some((p) => p.uid === common)).toBe(false);
  expect(after.bin.some((p) => p.defId === 'volute')).toBe(true);
  expect(after.bin.length).toBe(before.bin.length);
  // Scrap alone: the Common (value 20) costs 25
  await select(page, page.getByTestId('trade-item-1'));
  await expect(page.getByTestId('trade-cost')).toHaveText('25');
  await select(page, page.getByTestId('trade-buy'));
  await expect.poll(async () => (await rs(page)).scrap).toBe(35);
  expect(errors).toEqual([]);
});

test('SV5 (E): the workbench upgrades a Rare for 40 Scrap and removes parts for 25, then 40', async ({ page }) => {
  const errors = watchErrors(page);
  await atWorkbench(page, 200);
  const [rare, spare1, spare2] = await give(page, ['volute', 'spur', 'spur']);
  await select(page, page.getByTestId(`wb-part-${rare}`));
  await select(page, page.getByTestId('wb-upgrade'));
  await expect.poll(async () => (await rs(page)).scrap).toBe(160);
  expect((await rs(page)).bin.find((p) => p.uid === rare)?.plus).toBe(true);
  await select(page, page.getByTestId(`wb-part-${spare1}`));
  await select(page, page.getByTestId('wb-remove'));
  await expect.poll(async () => (await rs(page)).scrap).toBe(135);
  expect((await rs(page)).bin.some((p) => p.uid === spare1)).toBe(false);
  await select(page, page.getByTestId('wb-leave'));
  await expect(page.getByTestId('act-section')).toBeVisible();
  // a second visit: the next removal costs 40
  await page.evaluate(() => (window as unknown as G).__game.cheat.gotoRoom('r3'));
  await expect(page.getByTestId('workbench')).toBeVisible();
  await select(page, page.getByTestId(`wb-part-${spare2}`));
  await select(page, page.getByTestId('wb-remove'));
  await expect.poll(async () => (await rs(page)).scrap).toBe(95);
  expect((await rs(page)).stats.removals).toBe(2);
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

// ---------- AR4: frame time with three painted enemies ----------

test('AR4: three painted act 1 enemies at 667x375 under 4x CPU throttling: rig work median at most 16 ms, p95 at most 22 ms; they draw again after a context loss', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'AR4 is measured at 667x375 (the phone project)');
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await page.evaluate(() => {
    const g = (window as unknown as G).__game;
    g.setSpeed('1x');
    g.practice({ enemies: ['cog-rat', 'brass-beetle', 'spring-imp'], bin: ['spur', 'spur', 'spur', 'escapement', 'escapement'], seed: 1 });
  });
  await expect(page.getByTestId('combat')).toBeVisible();
  const stats = () => page.evaluate(() => (window as unknown as G).__game.rig.stats());
  // painted rigs, not the code fallback: WebGL is live and all three are drawn by the hub
  await expect.poll(async () => (await stats()).ready, { timeout: 15_000 }).toBe(true);
  await expect.poll(async () => (await stats()).painted.slice().sort(), { timeout: 15_000 }).toEqual(['brass-beetle', 'cog-rat', 'spring-imp']);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  try {
    await page.evaluate(() => (window as unknown as G).__game.rig.reset());
    await page.waitForTimeout(10_000);
    const { samples } = await stats();
    expect(samples.length, 'frames sampled in 10 s').toBeGreaterThan(100);
    const sorted = samples.slice().sort((x, y) => x - y);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    expect(median, `median ${median.toFixed(1)} ms`).toBeLessThanOrEqual(16);
    expect(p95, `p95 ${p95.toFixed(1)} ms`).toBeLessThanOrEqual(22);

    // a lost WebGL context comes back: the enemies draw again
    await page.evaluate(() => (window as unknown as G).__game.rig.loseContext());
    await expect.poll(async () => (await stats()).ready, { timeout: 5_000 }).toBe(false);
    const drawsLost = (await stats()).draws;
    await page.evaluate(() => (window as unknown as G).__game.rig.restoreContext());
    await expect.poll(async () => (await stats()).ready, { timeout: 15_000 }).toBe(true);
    await expect.poll(async () => (await stats()).draws, { timeout: 15_000 }).toBeGreaterThan(drawsLost + 5);
    await expect.poll(async () => (await stats()).painted.slice().sort(), { timeout: 15_000 }).toEqual(['brass-beetle', 'cog-rat', 'spring-imp']);
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  expect(errors).toEqual([]);
});
