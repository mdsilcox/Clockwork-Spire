// B10d acceptance (browser), owner: tutorial lane. Desktop (1280x800) and phone (667x375 touch). REWRITES v1's tutorial spec to v2
// (docs/briefs/B10d-front-door.md "Round 2" and "Round 2 additions"; docs/acceptance.md AR3's tutorial half). Written by the
// orchestrator's test-porter in the B10d.0 contract step. Lanes never weaken an assertion. The prompts, hands, cells and the closing
// line come from `TUTORIAL_SCRIPT` (src/app/tutorial.ts); the rig is `tutorial-rig` (parts rig-strut, rig-plate).
// CONTRACT test ids and hooks the tutorial lane implements:
//   First launch: a fresh profile (no cs.tutorialDone) boots to `title` (title lane); the title's `climb` starts the tutorial. When the
//     tutorial was started by `climb` and ends (finished or skipped), the flow continues into what `climb` does without a save: the
//     existing `slots` screen, `slot-begin-1` -> `name-dialog` ("Who is climbing?", `name-input`, `name-begin`) -> `bellfoot`.
//     Started from the title's `tutorial` button it returns to `title` instead (a replay).
//   coach                 the coach banner, present only while the tutorial runs; data-step="{step id}" (place-1, place-2, target, run,
//                         break, salvage) and data-index="1".."6"
//   coach-text            the step's prompt, exactly TUTORIAL_SCRIPT.steps[i].prompt
//   coach-next            the acknowledge button on the 'continue' step ("break") only
//   coach-skip            on every step, including the salvage tray; ends the tutorial like finishing it (see below)
//   __game.tutorial()     the current step number 1..6, 0 when the tutorial is not running (v1 gave 1..8)
//   The fight is the ordinary combat screen: hand-card, cell-B2, cell-C2, run, hp, preview, `enemy-part-e0-rig-strut` and
//     `enemy-part-e0-rig-plate` (class `broken` once broken), `part-intent-e0-rig-strut` (data-cancelled="true" in the preview once the
//     order names the Strut and two Spur Gears are placed; gone after the Strut breaks); hand and board are forced as the script says
//   salvage-tray, salvage-item-0, salvage-keep-0 (aria-pressed), salvage-done   the SAME ids as the real tray, but the tray is built in
//                         the tutorial's own UI state from the rig's broken part (one item: Spur Gear); it is not a run, so `screen-reward`
//                         never shows and nothing is written to the saves, the profile or the stashed practice fight
//   tutorial-closing      after the tray's `salvage-done`: Sprocket's closing line (TUTORIAL_CLOSING) with button `tutorial-finish`
//   Ending (finish or skip): sets cs.tutorialDone and cs.tutorialV2Seen ('1'); starting the tutorial already sets cs.tutorialV2Seen
//   Starting from the title stashes an in-progress practice fight and restores it at the end (`continue` brings back the same fight)
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { TUTORIAL_SCRIPT } from '../src/app/tutorial';
import { noSidewaysScroll, press, skipFirstLaunch, state, tutorialStep, watchErrors } from './helpers';

const S = TUTORIAL_SCRIPT;
const card = (page: Page, name: string) => page.getByTestId('hand-card').filter({ hasText: name }).first();
const ls = (page: Page, key: string): Promise<string | null> => page.evaluate((k) => window.localStorage.getItem(k), key);
type G = { __game: { profile(): { name: string } | null } };

/** Every row of every store of the game's IndexedDB, as one string (saves, runs, the practice fight). */
async function dumpDb(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const req = indexedDB.open('clockwork-spire');
        req.onerror = () => resolve('no db');
        req.onsuccess = () => {
          const db = req.result;
          const names = Array.from(db.objectStoreNames);
          if (names.length === 0) return resolve('empty');
          const tx = db.transaction(names, 'readonly');
          const out: Record<string, unknown> = {};
          let left = names.length;
          for (const n of names) {
            const all = tx.objectStore(n).getAll();
            all.onsuccess = () => {
              out[n] = all.result;
              if (--left === 0) {
                db.close();
                resolve(JSON.stringify(out));
              }
            };
          }
        };
      }),
  );
}

async function waitStep(page: Page, step: number): Promise<void> {
  await expect.poll(() => tutorialStep(page), { timeout: 15_000 }).toBe(step);
  await expect(page.getByTestId('coach')).toHaveAttribute('data-step', S.steps[step - 1].id);
  await expect(page.getByTestId('coach-text')).toHaveText(S.steps[step - 1].prompt);
}

/** Do what steps 1 .. k-1 ask, leaving the tutorial at step k (1..6). */
async function advanceTo(page: Page, k: number): Promise<void> {
  await waitStep(page, 1);
  if (k === 1) return;
  await press(page, card(page, 'Spur Gear'));
  await press(page, page.getByTestId('cell-B2'));
  await waitStep(page, 2);
  if (k === 2) return;
  await press(page, card(page, 'Spur Gear'));
  await press(page, page.getByTestId('cell-C2'));
  await waitStep(page, 3);
  if (k === 3) return;
  await press(page, page.getByTestId('enemy-part-e0-rig-strut'));
  await waitStep(page, 4);
  if (k === 4) return;
  await press(page, page.getByTestId('run'));
  await waitStep(page, 5);
  if (k === 5) return;
  await press(page, page.getByTestId('coach-next'));
  await waitStep(page, 6);
}

/** Start the tutorial from a brand-new profile through the title, as the first launch does. */
async function firstLaunch(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByTestId('title')).toBeVisible();
  await press(page, page.getByTestId('climb'));
  await expect(page.getByTestId('coach')).toBeVisible();
  await page.evaluate(() => (window as unknown as { __game: { setSpeed(s: string): void } }).__game.setSpeed('skip'));
}

test('first launch: the title shows first, Climb the Spire starts the v2 tutorial against the training rig with the forced hand', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('title')).toBeVisible();
  await expect(page.getByTestId('coach')).toHaveCount(0);
  expect(await tutorialStep(page)).toBe(0);
  await press(page, page.getByTestId('climb'));
  await expect(page.getByTestId('coach')).toBeVisible();
  await expect(page.getByTestId('slots')).toHaveCount(0);
  await waitStep(page, 1);
  expect(await ls(page, 'cs.tutorialV2Seen')).toBe('1');
  expect(await ls(page, 'cs.tutorialDone')).toBeNull();
  const s = await state(page);
  expect(s.hand.map((uid) => s.parts[uid].defId)).toEqual(S.steps[0].hand);
  expect(s.playerHp).toBe(S.hp);
  expect(s.enemies.length).toBe(1);
  await expect(page.getByTestId('enemy-part-e0-rig-strut')).toBeVisible();
  await expect(page.getByTestId('enemy-part-e0-rig-plate')).toBeVisible();
  await expect(page.getByTestId('coach-skip')).toBeVisible();
  for (const id of ['coach-skip']) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box && box.width >= 39.5 && box.height >= 39.5, `${id} is a 40 px target`).toBe(true);
  }
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('the guided fight, every step in order: place, place, target, Run, the Strut breaks and its intent goes, the tray (keep), the closing line, then the name prompt and Bellfoot', async ({ page }) => {
  const errors = watchErrors(page);
  await firstLaunch(page);

  // 1 and 2: two Spur Gears, each beside the motion so far
  await waitStep(page, 1);
  await press(page, card(page, 'Spur Gear'));
  await press(page, page.getByTestId('cell-B2'));
  await waitStep(page, 2);
  const mid = await state(page);
  expect(mid.hand.map((uid) => mid.parts[uid].defId)).toEqual(['spur', 'escapement']);
  await press(page, card(page, 'Spur Gear'));
  await press(page, page.getByTestId('cell-C2'));

  // 3: the target order: tap the Strut
  await waitStep(page, 3);
  await press(page, page.getByTestId('enemy-part-e0-rig-strut'));
  // 4: Run: the preview already says the Strut's intent is cancelled
  await waitStep(page, 4);
  await expect(page.getByTestId('part-intent-e0-rig-strut')).toHaveAttribute('data-cancelled', 'true');
  await noSidewaysScroll(page);
  await press(page, page.getByTestId('run'));

  // 5: the Strut broke on the first Run, its intent went with it, and the player took nothing
  await waitStep(page, 5);
  await expect(page.getByTestId('enemy-part-e0-rig-strut')).toHaveClass(/broken/);
  await expect(page.getByTestId('part-intent-e0-rig-strut')).toHaveCount(0);
  await expect(page.getByTestId('enemy-part-e0-rig-plate')).not.toHaveClass(/broken/);
  const after = await state(page);
  expect(after.playerHp).toBe(S.hp);
  expect(after.outcome).toBe('ongoing');
  const next = await page.getByTestId('coach-next').boundingBox();
  expect(next && next.width >= 39.5 && next.height >= 39.5, 'coach-next is a 40 px target').toBe(true);
  await press(page, page.getByTestId('coach-next'));

  // 6: the fabricated salvage tray: the Strut's Spur Gear, keep it
  await waitStep(page, 6);
  await expect(page.getByTestId('salvage-tray')).toBeVisible();
  await expect(page.getByTestId('screen-reward')).toHaveCount(0);
  await expect(page.getByTestId('salvage-item-0')).toContainText('Spur Gear');
  await press(page, page.getByTestId('salvage-keep-0'));
  await expect(page.getByTestId('salvage-keep-0')).toHaveAttribute('aria-pressed', 'true');
  await noSidewaysScroll(page);
  await press(page, page.getByTestId('salvage-done'));

  // the closing line, then the name prompt, then Bellfoot
  await expect(page.getByTestId('tutorial-closing')).toContainText(S.closing);
  expect(await ls(page, 'cs.tutorialDone')).toBeNull(); // not until the player leaves it
  await press(page, page.getByTestId('tutorial-finish'));
  await expect(page.getByTestId('coach')).toHaveCount(0);
  await expect(page.getByTestId('slots')).toBeVisible();
  await press(page, page.getByTestId('slot-begin-1'));
  await expect(page.getByTestId('name-dialog')).toContainText('Who is climbing?');
  await page.getByTestId('name-input').fill('Ada');
  await press(page, page.getByTestId('name-begin'));
  await expect(page.getByTestId('bellfoot')).toBeVisible();
  await expect(page.getByTestId('sprocket')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as G).__game.profile()?.name)).toBe('Ada');
  expect(await ls(page, 'cs.tutorialDone')).toBe('1');
  expect(await ls(page, 'cs.tutorialV2Seen')).toBe('1');
  expect(await tutorialStep(page)).toBe(0);
  await noSidewaysScroll(page);

  // finished: a reload shows the title, not the tutorial
  await page.reload();
  await expect(page.getByTestId('title')).toBeVisible();
  await expect(page.getByTestId('coach')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the tray can scrap instead of keep: Done without keeping reaches the same closing line', async ({ page }) => {
  await firstLaunch(page);
  await advanceTo(page, 6);
  await expect(page.getByTestId('salvage-keep-0')).toHaveAttribute('aria-pressed', 'false');
  await press(page, page.getByTestId('salvage-done'));
  await expect(page.getByTestId('tutorial-closing')).toContainText(S.closing);
  await press(page, page.getByTestId('tutorial-finish'));
  await expect(page.getByTestId('slots')).toBeVisible();
});

for (let k = 1; k <= 6; k++) {
  test(`skip at step ${k} (${S.steps[k - 1].id}) ends the tutorial the same way: both keys set, on to the slot screen, never again`, async ({ page }) => {
    const errors = watchErrors(page);
    await firstLaunch(page);
    await advanceTo(page, k);
    await press(page, page.getByTestId('coach-skip'));
    await expect(page.getByTestId('coach')).toHaveCount(0);
    expect(await tutorialStep(page)).toBe(0);
    expect(await ls(page, 'cs.tutorialDone')).toBe('1');
    expect(await ls(page, 'cs.tutorialV2Seen')).toBe('1');
    await expect(page.getByTestId('slots')).toBeVisible(); // started by climb: it carries on into the climb flow
    await page.reload();
    await expect(page.getByTestId('title')).toBeVisible();
    await press(page, page.getByTestId('climb'));
    await expect(page.getByTestId('slots')).toBeVisible(); // a second climb does not start it again
    await expect(page.getByTestId('coach')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("a replay from the title's tutorial button runs the same script and returns to the title (not the slot screen)", async ({ page }) => {
  const errors = watchErrors(page);
  await skipFirstLaunch(page);
  await page.goto('/');
  await expect(page.getByTestId('title')).toBeVisible();
  expect(await tutorialStep(page)).toBe(0); // the 21 specs' path: no tutorial on boot
  await press(page, page.getByTestId('tutorial'));
  await page.evaluate(() => (window as unknown as { __game: { setSpeed(s: string): void } }).__game.setSpeed('skip'));
  await advanceTo(page, 6);
  await press(page, page.getByTestId('salvage-keep-0'));
  await press(page, page.getByTestId('salvage-done'));
  await expect(page.getByTestId('tutorial-closing')).toContainText(S.closing);
  await press(page, page.getByTestId('tutorial-finish'));
  await expect(page.getByTestId('title')).toBeVisible();
  await expect(page.getByTestId('slots')).toHaveCount(0);
  expect(await ls(page, 'cs.tutorialV2Seen')).toBe('1');
  // and skipping a replay returns to the title too
  await press(page, page.getByTestId('tutorial'));
  await waitStep(page, 1);
  await press(page, page.getByTestId('coach-skip'));
  await expect(page.getByTestId('title')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the tutorial writes nothing: not to the saves, and a practice fight in progress is stashed and comes back as it was', async ({ page }) => {
  const errors = watchErrors(page);
  await skipFirstLaunch(page);
  await page.goto('/');
  // a save with a climb in progress, and a practice fight in progress
  await page.evaluate(async () => {
    const g = (window as unknown as { __game: { newSlot(n: 1, name: string): Promise<boolean>; climb(c: string): boolean } }).__game;
    await g.newSlot(1, 'Ada');
    g.climb('tinker');
  });
  await page.reload();
  // a reload resumes a climb in progress (long-standing behavior); go to the title from the map
  await press(page, page.getByTestId('run-menu'));
  await press(page, page.getByTestId('run-to-title'));
  await expect(page.getByTestId('title')).toBeVisible();
  await press(page, page.getByTestId('practice'));
  await expect(page.getByTestId('combat')).toBeVisible();
  const fightBefore = await state(page);
  await press(page, page.getByTestId('menu'));
  await press(page, page.getByTestId('menu-title'));
  await expect(page.getByTestId('continue')).toBeVisible();
  // the test's own speed preference is a saved setting: write it before the snapshot, so only the tutorial's writes can differ
  await page.evaluate(() => (window as unknown as { __game: { setSpeed(s: string): void } }).__game.setSpeed('skip'));
  await page.waitForTimeout(400);
  const dbBefore = await dumpDb(page);

  await press(page, page.getByTestId('tutorial'));
  await advanceTo(page, 6);
  await press(page, page.getByTestId('salvage-keep-0'));
  await page.waitForTimeout(600); // any autosave would have fired by now
  expect(await dumpDb(page), 'nothing written while the tutorial runs').toBe(dbBefore);
  await press(page, page.getByTestId('salvage-done'));
  await press(page, page.getByTestId('tutorial-finish'));
  await expect(page.getByTestId('title')).toBeVisible();
  await page.waitForTimeout(600);
  expect(await dumpDb(page), 'nor when it ends').toBe(dbBefore);

  await press(page, page.getByTestId('continue')); // the practice fight is back, exactly
  await expect(page.getByTestId('combat')).toBeVisible();
  const fightAfter = await state(page);
  expect(fightAfter.turn).toBe(fightBefore.turn);
  expect(fightAfter.hand.map((u) => fightAfter.parts[u].defId)).toEqual(fightBefore.hand.map((u) => fightBefore.parts[u].defId));
  expect(fightAfter.enemies.length).toBe(fightBefore.enemies.length);
  expect(fightAfter.playerHp).toBe(fightBefore.playerHp);
  await expect(page.getByTestId('coach')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the name dialog is focused when it opens, Enter confirms, and the typed name is the one saved (after the tutorial: a hint on the slot screen)', async ({ page }) => {
  await firstLaunch(page);
  await press(page, page.getByTestId('coach-skip'));
  await expect(page.getByTestId('slots-hint')).toHaveText('Name your tinker to start your first climb.');
  await press(page, page.getByTestId('slot-begin-1'));
  await expect(page.getByTestId('name-input')).toBeFocused();
  await page.keyboard.type('Mina');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('bellfoot')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as G).__game.profile()?.name)).toBe('Mina');
});

test('wrong taps say what the step wants; Run is asleep and says so until its step; the Strut is named and has a 40 px hit area', async ({ page }) => {
  await firstLaunch(page);
  await waitStep(page, 1);
  await expect(page.getByTestId('run')).toHaveCSS('opacity', '0.45');
  await press(page, page.getByTestId('run')); // not yet
  await expect(page.getByTestId('coach-note')).toContainText('glowing cell next to the Mainspring');
  expect(await tutorialStep(page)).toBe(1);
  await press(page, card(page, 'Escapement'));
  await press(page, page.getByTestId('cell-B2'));
  await expect(page.getByTestId('coach-note')).toContainText('glowing cell');
  await advanceTo(page, 3);
  await press(page, page.getByTestId('enemy-core-e0'));
  await expect(page.getByTestId('coach-note')).toHaveText('Tap the Strut, the arm with 6 HP.');
  expect(await tutorialStep(page)).toBe(3);
  const strut = page.getByTestId('enemy-part-e0-rig-strut');
  expect(await page.evaluate(() => document.body.dataset.tut)).toBe('target');
  expect(await strut.evaluate((el) => getComputedStyle(el, '::after').content)).toContain('Strut');
  // a tap 19 px off the marker's centre (a 40 px area) still lands on the Strut
  const b = (await strut.boundingBox())!;
  const hit = await page.evaluate(
    ([x, y]) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest('[data-testid]')?.getAttribute('data-testid'),
    [b.x + b.width / 2 + 19, b.y + b.height / 2] as const,
  );
  expect(hit).toBe('enemy-part-e0-rig-strut');
  // the Incoming pill's place is kept once the Strut's attack is cancelled: the pills after it do not move
  const before = await page.getByTestId('turn').boundingBox();
  await press(page, strut);
  await waitStep(page, 4);
  const after = await page.getByTestId('turn').boundingBox();
  expect(after?.x).toBe(before?.x);
  expect(after?.y).toBe(before?.y);
  await expect(page.getByTestId('run')).not.toHaveCSS('opacity', '0.45');
});
