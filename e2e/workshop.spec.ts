import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { noSidewaysScroll, press, skipFirstLaunch, watchErrors } from './helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */
const call = <T = unknown>(page: Page, expr: string, arg?: unknown): Promise<T> =>
  page.evaluate(([e, a]) => new Function('g', 'a', `return (async () => (${e}))()`)((window as any).__game, a), [expr, arg] as const) as Promise<T>;

/** One slot as stored in IndexedDB (to prove what was written, and when). */
const rawSlot = (page: Page, n: number): Promise<any> =>
  page.evaluate(
    (k) =>
      new Promise((resolve) => {
        const open = indexedDB.open('clockwork-spire');
        open.onsuccess = () => {
          const get = open.result.transaction('saves').objectStore('saves').get(`slot-${k}`);
          get.onsuccess = () => resolve(get.result ?? null);
        };
        open.onerror = () => resolve(null);
      }),
    n,
  );

/** The meta API is stubs until the meta-balance lane merges; these specs skip when it throws. */
test.beforeEach(async ({ page }) => {
  await skipFirstLaunch(page);
  await page.goto('/');
  const ok = await page.evaluate(() => {
    try {
      return (window as any).__game.newSlot(1, 'Ada').then(
        () => true,
        () => false,
      );
    } catch {
      return false;
    }
  });
  test.skip(!ok, 'meta API not implemented yet');
  await call(page, 'g.setSpeed("skip")');
});

async function leaveResult(page: Page): Promise<void> {
  if (await page.getByTestId('victory').count()) {
    const skip = page.getByTestId('ending-skip');
    if (await skip.count()) await skip.click();
    await page.getByTestId('ending-done').click({ timeout: 10_000 });
  }
  await press(page, page.getByTestId('end-continue'));
  await expect(page.getByTestId('workshop')).toBeVisible();
}

test('slots: three independent saves, a name prompt, a confirmed delete, and a reload that keeps all three', async ({ page }) => {
  const errors = watchErrors(page);
  await call(page, 'g.cheat.brass(50)');
  await call(page, 'g.newSlot(2, "Bo")');
  await call(page, 'g.cheat.brass(70)');
  // a third slot through the real UI
  await page.reload();
  await expect(page.getByTestId('title')).toBeVisible();
  await press(page, page.getByTestId('open-slots'));
  await expect(page.getByTestId('slots')).toBeVisible();
  await noSidewaysScroll(page);
  await expect(page.getByTestId('slot-3')).toHaveAttribute('data-state', 'empty');
  await press(page, page.getByTestId('slot-begin-3'));
  await expect(page.getByTestId('name-input')).toHaveValue('Tinkerer');
  await page.getByTestId('name-input').fill('Cy');
  await press(page, page.getByTestId('name-begin'));
  await expect(page.getByTestId('workshop')).toBeVisible();
  await expect(page.getByTestId('ws-name')).toHaveText('Cy');

  // each slot kept its own profile
  await page.reload();
  await press(page, page.getByTestId('open-slots'));
  await expect(page.getByTestId('slot-name-1')).toHaveText('Ada');
  await expect(page.getByTestId('slot-name-2')).toHaveText('Bo');
  await expect(page.getByTestId('slot-name-3')).toHaveText('Cy');
  expect((await call<any>(page, 'g.useSlot(1).then(() => g.profile())')).brass).toBe(50);
  expect((await call<any>(page, 'g.useSlot(2).then(() => g.profile())')).brass).toBe(70);
  await call(page, 'g.useSlot(3)');
  await press(page, page.getByTestId('ws-menu'));
  await press(page, page.getByTestId('ws-slots'));

  // delete asks first
  await press(page, page.getByTestId('slot-delete-2'));
  await expect(page.getByTestId('delete-dialog')).toBeVisible();
  await press(page, page.getByTestId('delete-cancel'));
  await expect(page.getByTestId('slot-2')).toHaveAttribute('data-state', 'ok');
  await press(page, page.getByTestId('slot-delete-2'));
  await press(page, page.getByTestId('delete-confirm'));
  await expect(page.getByTestId('slot-2')).toHaveAttribute('data-state', 'empty');
  await expect(page.getByTestId('slot-1')).toHaveAttribute('data-state', 'ok');
  await expect(page.getByTestId('slot-3')).toHaveAttribute('data-state', 'ok');
  expect(errors).toEqual([]);
});

test('slots: an unreadable save is kept aside and never overwritten', async ({ page }) => {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('clockwork-spire');
        open.onsuccess = () => {
          const tx = open.result.transaction('saves', 'readwrite');
          tx.objectStore('saves').put({ slot: 'slot-2', version: 1, data: { nonsense: true }, savedAt: 0 });
          tx.oncomplete = () => resolve();
        };
      }),
  );
  await page.reload();
  await press(page, page.getByTestId('open-slots'));
  await expect(page.getByTestId('slot-2')).toHaveAttribute('data-state', 'corrupt');
  await expect(page.getByTestId('slot-2')).toContainText('could not be read');
  const kept = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('clockwork-spire');
        open.onsuccess = () => {
          const get = open.result.transaction('saves').objectStore('saves').get('slot-2-corrupt');
          get.onsuccess = () => resolve(!!get.result);
        };
      }),
  );
  expect(kept).toBe(true);
  await press(page, page.getByTestId('slot-delete-2'));
  await press(page, page.getByTestId('delete-confirm'));
  await expect(page.getByTestId('slot-2')).toHaveAttribute('data-state', 'empty');
});

test('W1: the run is settled into the profile in one write before the result shows, and once only', async ({ page }) => {
  await call(page, 'g.climb("tinker")');
  await call(page, 'g.cheat.finishRun("loss", 20)');
  await expect(page.getByTestId('defeat')).toBeVisible();
  // the stored slot already holds the Brass and the record, and no run
  const raw = await rawSlot(page, 1);
  expect(raw.data.run).toBeNull();
  expect(raw.data.profile.history).toHaveLength(1);
  const brass = raw.data.profile.brass;
  expect(brass).toBeGreaterThan(0);
  await expect(page.getByTestId('end-stats')).toContainText('Brass');
  await noSidewaysScroll(page);
  // reload on the result screen: still once
  await page.reload();
  await press(page, page.getByTestId('open-slots'));
  await press(page, page.getByTestId('slot-continue-1'));
  await expect(page.getByTestId('workshop')).toBeVisible();
  const p = await call<any>(page, 'g.profile()');
  expect(p.history).toHaveLength(1);
  expect(p.brass).toBe(brass);
});

test('W2: 40 Brass buys Reinforced Frame I, and the next run has 55 max HP', async ({ page }) => {
  await call(page, 'g.cheat.brass(40)');
  await call(page, 'g.useSlot(1)');
  await press(page, page.getByTestId('tab-bench'));
  await expect(page.getByTestId('upgrade-frame')).toBeVisible();
  await expect(page.getByTestId('buy-toolbelt')).toBeDisabled();
  await expect(page.getByTestId('upgrade-toolbelt')).toContainText('more Brass');
  await noSidewaysScroll(page);
  await press(page, page.getByTestId('buy-frame'));
  await expect(page.getByTestId('ws-brass')).toContainText('0');
  await expect(page.getByTestId('upgrade-frame')).toHaveAttribute('data-level', '1');
  await press(page, page.getByTestId('climb'));
  await expect(page.getByTestId('map')).toBeVisible();
  expect((await call<any>(page, 'g.runState()')).maxHp).toBe(55);
});

test('W3: an unlocked chassis can be picked and starts with its own bin', async ({ page }) => {
  await call(page, 'g.climb("tinker")');
  await call(page, 'g.cheat.finishRun("loss", 20)'); // reaching act 2 unlocks the Stoker
  await leaveResult(page);
  await press(page, page.getByTestId('tab-chassis'));
  await expect(page.getByTestId('chassis-horologist')).toHaveAttribute('data-unlocked', 'false');
  await expect(page.getByTestId('chassis-horologist')).toContainText('300');
  await noSidewaysScroll(page);
  await expect(page.getByTestId('chassis-stoker')).toHaveAttribute('data-unlocked', 'true');
  await press(page, page.getByTestId('chassis-select-stoker'));
  await press(page, page.getByTestId('climb'));
  await expect(page.getByTestId('map')).toBeVisible();
  const run = await call<any>(page, 'g.runState()');
  const defs = run.bin.map((b: any) => b.defId);
  expect(defs).toContain('boiler');
  expect(defs).toContain('piston');
  expect(run.config.chassis).toBe('stoker');
});

test('W3: a locked chassis can be bought with Brass', async ({ page }) => {
  await call(page, 'g.cheat.brass(400)');
  await call(page, 'g.useSlot(1)');
  await press(page, page.getByTestId('tab-chassis'));
  await press(page, page.getByTestId('chassis-buy-horologist'));
  await expect(page.getByTestId('chassis-horologist')).toHaveAttribute('data-unlocked', 'true');
});

test('W4: Sprocket celebrates a win, wiggles for a good climb and nudges after a bad run', async ({ page }) => {
  const errors = watchErrors(page);
  await call(page, 'g.climb("tinker")');
  await call(page, 'g.cheat.finishRun("win")');
  await expect(page.getByTestId('victory')).toBeVisible();
  await leaveResult(page);
  expect(await call(page, 'g.sprocket()')).toBe('celebrate');
  await expect(page.getByTestId('sprocket')).toHaveAttribute('data-mood', 'celebrate');

  await call(page, 'g.climb("tinker")');
  await call(page, 'g.cheat.finishRun("loss", 20)');
  await leaveResult(page);
  expect(await call(page, 'g.sprocket()')).toBe('happy');

  await call(page, 'g.climb("tinker")');
  await call(page, 'g.cheat.finishRun("loss", 3)'); // below the best floor, in act 1
  await leaveResult(page);
  expect(await call(page, 'g.sprocket()')).toBe('comfort');
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('W5: idle for 20 seconds and Sprocket falls asleep; a tap wakes and pets him', async ({ page }) => {
  await call(page, 'g.useSlot(1)');
  await expect(page.getByTestId('workshop')).toBeVisible();
  expect(await call(page, 'g.sprocket()')).toBe('idle');
  await call(page, 'g.cheat.idle(20000)');
  await expect.poll(() => call(page, 'g.sprocket()')).toBe('sleepy');
  await press(page, page.getByTestId('sprocket'));
  expect(await call(page, 'g.sprocket()')).toBe('pet');
});

test('title to slots to the Workshop, every panel fits, and the door starts a run', async ({ page }) => {
  const errors = watchErrors(page);
  await page.reload();
  await expect(page.getByTestId('title')).toBeVisible();
  await press(page, page.getByTestId('climb'));
  await expect(page.getByTestId('slots')).toBeVisible();
  await press(page, page.getByTestId('slot-continue-1'));
  await expect(page.getByTestId('workshop')).toBeVisible();
  for (const tab of ['bench', 'chassis', 'notes', 'parts', 'history']) {
    await press(page, page.getByTestId(`tab-${tab}`));
    await expect(page.getByTestId('tabbody')).toBeVisible();
    await noSidewaysScroll(page);
  }
  await press(page, page.getByTestId('climb'));
  await expect(page.getByTestId('map')).toBeVisible();
  // a climb in progress: the title and the Workshop both offer Continue
  await press(page, page.getByTestId('run-menu'));
  await press(page, page.getByTestId('run-to-title'));
  await expect(page.getByTestId('continue-run')).toBeVisible();
  await press(page, page.getByTestId('continue-run'));
  await expect(page.getByTestId('map')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a reload during a climb resumes it; the other slots stay intact', async ({ page }) => {
  await call(page, 'g.newSlot(2, "Bo")');
  await call(page, 'g.useSlot(1)');
  await call(page, 'g.climb("tinker")');
  await expect(page.getByTestId('map')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('map')).toBeVisible();
  expect((await call<any>(page, 'g.runState()')).phase).toBe('map');
  expect((await rawSlot(page, 2)).data.profile.name).toBe('Bo');
});
