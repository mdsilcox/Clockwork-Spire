import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { noSidewaysScroll, press, skipFirstLaunch, state, watchErrors } from './helpers';

type G = {
  newRun(seed?: number): void;
  runState(): { phase: string; hp: number; maxHp: number; cogs: number; bin: { uid: number; defId: string; plus: boolean }[]; floor: number; act: number; trinkets: string[]; map: { nodes: { id: string; floor: number; type: string }[] } } | null;
  nodes(): string[];
  go(id: string): boolean;
  setSpeed(s: string): void;
  debugEnemy(i: number, p: object): void;
  newFight(seed?: number): void;
  cheat: { winFight(): Promise<void>; setHp(n: number): void; gotoFloor(a: number, f: number, type?: string): void; setCogs(n: number): void };
};
const rs = (page: Page) => page.evaluate(() => (window as unknown as { __game: G }).__game.runState());
const nodesNow = (page: Page) => page.evaluate(() => (window as unknown as { __game: G }).__game.nodes());

/** The run API is stubs until the run-core lane merges; these specs skip when it throws. */
test.beforeEach(async ({ page }) => {
  await skipFirstLaunch(page);
  await page.goto('/');
  const ok = await page.evaluate(() => {
    try {
      (window as unknown as { __game: G }).__game.newRun(11);
      return true;
    } catch {
      return false;
    }
  });
  test.skip(!ok, 'run API not implemented yet');
  await page.evaluate(() => (window as unknown as { __game: G }).__game.setSpeed('skip'));
});

async function enterFirst(page: Page): Promise<void> {
  const id = (await nodesNow(page))[0];
  await page.getByTestId(`node-${id}`).scrollIntoViewIfNeeded();
  await press(page, page.getByTestId(`node-${id}`));
}

async function toNode(page: Page, type: string, act = 1, floor = 7): Promise<void> {
  await page.evaluate(([a, f, t]) => (window as unknown as { __game: G }).__game.cheat.gotoFloor(a as number, f as number, t as string), [act, floor, type] as const);
  await expect(page.getByTestId('map')).toBeVisible();
  await enterFirst(page);
}

test('map: legend, act title, and R9 tapping a reachable node (unreachable ones cannot be chosen)', async ({ page }) => {
  const errors = watchErrors(page);
  await expect(page.getByTestId('map')).toBeVisible();
  await expect(page.getByTestId('act-title')).toContainText('Act 1: the Gearworks');
  await expect(page.getByTestId('legend')).toContainText('Boss');
  await noSidewaysScroll(page);
  const avail = await nodesNow(page);
  expect(avail.length).toBeGreaterThan(0);
  const floor2 = (await rs(page))!.map.nodes.filter((n) => n.floor === 2);
  const locked = floor2.find((n) => !avail.includes(n.id))!;
  await page.getByTestId(`node-${locked.id}`).scrollIntoViewIfNeeded();
  await expect(page.getByTestId(`node-${locked.id}`)).toBeDisabled();
  await enterFirst(page);
  await expect(page.getByTestId('combat')).toBeVisible();
  await expect(page.getByTestId('run-where')).toContainText('Floor 1');
  expect(errors).toEqual([]);
});

test('fight, salvage tray and back to the map; the title offers Continue climb', async ({ page }) => {
  const errors = watchErrors(page);
  await enterFirst(page);
  await expect(page.getByTestId('combat')).toBeVisible();
  const before = (await rs(page))!.bin.length;
  await page.evaluate(() => (window as unknown as { __game: G }).__game.cheat.winFight());
  await expect(page.getByTestId('screen-reward')).toBeVisible({ timeout: 10_000 });
  // v2: the salvage tray replaces the pick-1-of-3 part reward; winning without breaking a part leaves it empty
  await expect(page.getByTestId('salvage-tray')).toBeVisible();
  await expect(page.getByTestId('salvage-cogs')).toContainText('Cogs');
  await expect(page.getByTestId('reward-part')).toHaveCount(0);
  await noSidewaysScroll(page);
  await press(page, page.getByTestId('salvage-done'));
  await expect(page.getByTestId('map')).toBeVisible();
  expect((await rs(page))!.bin.length).toBe(before);

  await press(page, page.getByTestId('run-menu'));
  await press(page, page.getByTestId('run-to-title'));
  await expect(page.getByTestId('title')).toBeVisible();
  await press(page, page.getByTestId('continue-run'));
  await expect(page.getByTestId('map')).toBeVisible();
  expect((await rs(page))!.bin.length).toBe(before);
  expect(errors).toEqual([]);
});

test('forge: upgrade a part through the real UI', async ({ page }) => {
  await toNode(page, 'forge');
  await expect(page.getByTestId('screen-forge')).toBeVisible();
  await press(page, page.getByTestId('forge-upgrade'));
  await expect(page.getByTestId('part-picker')).toBeVisible();
  await expect(page.getByTestId('pick-part').first()).toContainText('Upgraded');
  await noSidewaysScroll(page);
  await press(page, page.getByTestId('pick-part').first());
  await expect(page.getByTestId('forge-done')).toBeVisible();
  expect((await rs(page))!.bin.some((p) => p.plus)).toBe(true);
  await press(page, page.getByTestId('continue-node'));
  await expect(page.getByTestId('map')).toBeVisible();
});

test('oil: polish adds max HP; repair says why it is off at full HP; the screen is framed with art', async ({ page }) => {
  await toNode(page, 'oil', 1, 12);
  await expect(page.getByTestId('screen-oil')).toBeVisible();
  await expect(page.getByTestId('oil-repair')).toBeDisabled();
  await expect(page.getByTestId('oil-repair-text')).toContainText('Already at full HP');
  await expect(page.locator('.nodeart svg').first()).toBeVisible();
  const frame = (await page.locator('.nodeframe').boundingBox())!;
  expect(frame.width).toBeLessThanOrEqual(1001);
  const max = (await rs(page))!.maxHp;
  await press(page, page.getByTestId('oil-polish'));
  await expect(page.getByTestId('oil-done')).toBeVisible();
  expect((await rs(page))!.maxHp).toBe(max + 4);
  await noSidewaysScroll(page);
  await press(page, page.getByTestId('continue-node'));
  await expect(page.getByTestId('map')).toBeVisible();
});

test('shop: buy a part, sold state, and remove a part', async ({ page }) => {
  await page.evaluate(() => (window as unknown as { __game: G }).__game.cheat.setCogs(400));
  await toNode(page, 'shop', 1, 5);
  await expect(page.getByTestId('screen-shop')).toBeVisible();
  await noSidewaysScroll(page);
  const bin = (await rs(page))!.bin.length;
  const item = page.getByTestId('shop-item').first();
  await item.scrollIntoViewIfNeeded();
  await press(page, item);
  await expect(item).toBeDisabled();
  await expect(item).toContainText('Sold');
  expect((await rs(page))!.bin.length).toBe(bin + 1);
  const rem = page.getByTestId('shop-removal');
  await rem.scrollIntoViewIfNeeded();
  await press(page, rem);
  await expect(page.getByTestId('part-picker')).toBeVisible();
  await press(page, page.getByTestId('pick-part').first());
  await expect(page.getByTestId('part-picker')).toHaveCount(0);
  expect((await rs(page))!.bin.length).toBe(bin);
  await page.getByTestId('leave-shop').scrollIntoViewIfNeeded();
  await press(page, page.getByTestId('leave-shop'));
  await expect(page.getByTestId('map')).toBeVisible();
});

test('event: read it, choose, and continue', async ({ page }) => {
  await toNode(page, 'event', 1, 4);
  await expect(page.getByTestId('event')).toBeVisible();
  await noSidewaysScroll(page);
  const choice = page.getByTestId('event-choice').and(page.locator(':enabled')).first();
  await press(page, choice);
  if (await page.getByTestId('part-picker').count()) await press(page, page.getByTestId('pick-part').first());
  await expect(page.getByTestId('continue-node')).toBeVisible();
  await press(page, page.getByTestId('continue-node'));
  await expect(page.getByTestId('map')).toBeVisible();
});

test('R8: a reload mid-combat restores the same hand, board and intents', async ({ page }) => {
  const errors = watchErrors(page);
  await enterFirst(page);
  await expect(page.getByTestId('combat')).toBeVisible();
  await press(page, page.getByTestId('hand-card').first());
  await press(page, page.getByTestId('cell-B2'));
  await expect(page.getByTestId('badge-B2')).toBeVisible();
  const a = await state(page);
  await page.waitForTimeout(300); // let the autosave land
  await page.reload();
  await expect(page.getByTestId('combat')).toBeVisible();
  const b = await state(page);
  expect(b.hand).toEqual(a.hand);
  expect(b.board).toEqual(a.board);
  expect(b.enemies.map((e) => e.intent)).toEqual(a.enemies.map((e) => e.intent));
  await expect(page.getByTestId('run-where')).toBeVisible();
  expect(errors).toEqual([]);
});

test('defeat: the defeat screen shows the floor and leads back to the title', async ({ page }) => {
  await enterFirst(page);
  await expect(page.getByTestId('combat')).toBeVisible();
  await page.evaluate(() => {
    // v2 enemies act from their parts, so the quickest defeat is a player at 1 HP
    (window as unknown as { __game: { cheat: { setHp(n: number): void } } }).__game.cheat.setHp(1);
  });
  await press(page, page.getByTestId('run'));
  await expect(page.getByTestId('defeat')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('end-stats')).toContainText('Brass');
  await noSidewaysScroll(page);
  await press(page, page.getByTestId('end-continue'));
  await expect(page.getByTestId('bellfoot').or(page.getByTestId('title'))).toBeVisible();
  await expect(page.getByTestId('continue-run')).toHaveCount(0);
});

test('a map tooltip goes away when a fight starts', async ({ page }) => {
  const id = (await nodesNow(page))[0];
  const node = page.getByTestId(`node-${id}`);
  await node.scrollIntoViewIfNeeded();
  const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  if (!touch) {
    await page.mouse.move(2, 2);
    await node.hover();
    await expect(page.getByTestId('tooltip')).toBeVisible();
  }
  await press(page, node);
  await expect(page.getByTestId('combat')).toBeVisible();
  await page.mouse.move(2, 2); // a mouse left over the new screen would legitimately hover something there
  await expect(page.getByTestId('tooltip')).toHaveCount(0);
});

test('title: a finished practice fight does not hide the climb', async ({ page }) => {
  await press(page, page.getByTestId('run-menu'));
  await press(page, page.getByTestId('run-to-title'));
  await expect(page.getByTestId('continue-run')).toBeVisible();
  await expect(page.getByTestId('practice')).toBeVisible();
});
