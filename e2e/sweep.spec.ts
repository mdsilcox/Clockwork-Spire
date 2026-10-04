// The dev server's hot-reload socket (not game code; the game opens no sockets) may log a refused connection under load.
const VITE_HMR_NOISE = /\[vite\]|WebSocket connection to 'ws:/;
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { noSidewaysScroll, press, skipFirstLaunch } from './helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Q5: every screen, at both sizes, with no console error or warning, no unhandled rejection and no sideways scroll.
const call = <T = unknown>(page: Page, expr: string, arg?: unknown): Promise<T> =>
  page.evaluate(([e, a]) => new Function('g', 'a', `return (async () => (${e}))()`)((window as any).__game, a), [expr, arg] as const) as Promise<T>;

function watchAll(page: Page): string[] {
  const bad: string[] = [];
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !VITE_HMR_NOISE.test(m.text())) bad.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => bad.push(`pageerror: ${String(e)}`));
  return bad;
}

async function look(page: Page, testid?: string): Promise<void> {
  if (testid) await expect(page.getByTestId(testid).first()).toBeVisible();
  await page.waitForTimeout(120);
  await noSidewaysScroll(page);
}

test('the first launch tutorial is clean', async ({ page }) => {
  const bad = watchAll(page);
  await page.goto('/');
  await expect.poll(() => call<number>(page, 'g.tutorial()')).toBeGreaterThan(0);
  await look(page);
  expect(bad).toEqual([]);
});

test('every screen is clean', async ({ page }, info) => {
  test.setTimeout(120_000);
  const bad = watchAll(page);
  await skipFirstLaunch(page);
  await page.goto('/');
  await look(page, 'title');

  // title menus
  for (const [open, shown, close] of [
    ['open-settings', 'settings', 'settings-close'],
    ['open-howto', 'howto', 'howto-close'],
    ['open-glossary', 'glossary', 'glossary-close'],
  ] as const) {
    await press(page, page.getByTestId(open));
    await look(page, shown);
    await press(page, page.getByTestId(close));
  }

  // slots and a new profile
  await press(page, page.getByTestId('open-slots'));
  await look(page, 'slots');
  await press(page, page.getByTestId('slot-begin-1'));
  await look(page, 'name-dialog');
  await page.getByTestId('name-input').fill('Ada');
  await press(page, page.getByTestId('name-begin'));
  await look(page, 'workshop');

  // the Workshop and its tabs
  for (const tab of ['bench', 'chassis', 'notes', 'parts', 'history']) {
    await press(page, page.getByTestId(`tab-${tab}`));
    await look(page, 'tabbody');
  }

  // a run: the map and every node type
  await call(page, 'g.setSpeed("skip")');
  await call(page, 'g.cheat.brass(500)');
  await call(page, 'g.climb("tinker")');
  await look(page, 'map');
  const stage = async (type: string, floor: number): Promise<void> => {
    await call(page, 'g.cheat.gotoFloor(1, a[0], a[1])', [floor, type]);
    await look(page, 'map');
    const id = (await call<string[]>(page, 'g.nodes()'))[0];
    await call(page, 'g.go(a)', id);
  };
  const leaveReward = async (): Promise<void> => {
    await look(page, 'screen-reward');
    await call(page, 'g.rewardTrinket(0)');
    await call(page, 'g.salvage([])');
    await call(page, 'g.leave()');
  };

  await stage('fight', 2);
  await look(page, 'combat');
  await call(page, 'g.cheat.winFight()');
  await leaveReward();
  await stage('elite', 5);
  await call(page, 'g.cheat.winFight()');
  await leaveReward();
  await stage('event', 3);
  await look(page, 'screen-event');
  await call(page, 'g.choose(1)');
  if ((await call<any>(page, 'g.runState().pending.needsPart')) ?? false) await call(page, 'g.pickPart(g.runState().bin[0].uid)');
  await look(page, 'screen-event');
  await call(page, 'g.leave()');
  await stage('shop', 4);
  await look(page, 'screen-shop');
  await call(page, 'g.shopBuy(0)');
  await look(page, 'screen-shop');
  await call(page, 'g.leave()');
  await stage('forge', 6);
  await look(page, 'screen-forge');
  await call(page, 'g.forge("upgrade", g.runState().bin[0].uid)');
  await call(page, 'g.leave()');
  await stage('oil', 7);
  await look(page, 'screen-oil');
  await call(page, 'g.oil("polish")');
  await call(page, 'g.leave()');
  await stage('boss', 13);
  await look(page, 'boss-intro');
  await press(page, page.getByTestId('boss-intro-go'));
  await call(page, 'g.cheat.winFight()');
  await leaveReward();

  // defeat
  await call(page, 'g.cheat.finishRun("loss", 9)');
  await look(page, 'defeat');
  await press(page, page.getByTestId('end-continue'));
  await look(page, 'workshop');

  // victory, ending, credits
  await call(page, 'g.climb("tinker")');
  await call(page, 'g.cheat.finishRun("win")');
  await look(page, 'victory');
  await look(page, 'ending');
  const skip = page.getByTestId('ending-skip');
  if (await skip.count()) await skip.click();
  await look(page, 'credits');
  await page.getByTestId('ending-done').click();
  await look(page, 'brass-breakdown');
  await press(page, page.getByTestId('end-continue'));
  await look(page, 'workshop');

  // the sandbox picker, then boss fights in it
  await press(page, page.getByTestId('ws-menu'));
  await press(page, page.getByTestId('ws-title'));
  await look(page, 'title');
  await press(page, page.getByTestId('sandbox'));
  await look(page, 'practice-picker');
  await press(page, page.getByTestId('picker-back'));
  await call(page, 'g.setSpeed("skip")');
  await call(page, 'g.practice({ enemies: ["clockmaker"], bin: "random10", seed: 4 })');
  await look(page, 'combat');
  await call(page, 'g.run()');
  await look(page, 'combat');
  await call(page, 'g.practice({ enemies: ["foreman"], bin: "tinker", seed: 5 })');
  await look(page, 'combat');

  // an upright phone shows the portrait card
  if (info.project.name === 'phone') {
    await page.setViewportSize({ width: 375, height: 667 });
    await look(page, 'portrait-card');
    await page.setViewportSize({ width: 667, height: 375 });
    await look(page, 'combat');
  }
  expect(bad).toEqual([]);
});

test('with IndexedDB blocked the game still plays and says progress will not be saved', async ({ page }) => {
  const bad = watchAll(page);
  await skipFirstLaunch(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
  await page.goto('/');
  await look(page, 'title');
  await call(page, 'g.setSpeed("skip")');
  await call(page, 'g.newSlot(1, "Mem")');
  await look(page, 'workshop');
  await call(page, 'g.climb("tinker")');
  await look(page, 'map');
  await expect(page.getByTestId('save-notice')).toContainText("Progress won't be saved in this window");
  await noSidewaysScroll(page);
  expect(bad).toEqual([]);
});

test('a render error shows "Something slipped a gear" with Reload instead of a blank screen', async ({ page }) => {
  await skipFirstLaunch(page);
  await page.goto('/');
  await call(page, 'g.setSpeed("skip")');
  await call(page, 'g.newSlot(1, "Oops")');
  await call(page, 'g.climb("tinker")');
  await look(page, 'map');
  await call(page, 'g.cheat.crash()');
  await expect(page.getByTestId('error-boundary')).toContainText('Something slipped a gear');
  await expect(page.getByTestId('error-reload')).toBeVisible();
  await noSidewaysScroll(page);
});
