// B7 acceptance (browser): part markers, the target order, intents on parts, the salvage tray
// (docs/acceptance.md EM8, EM9, SV1). Runs on the desktop (1280x800) and phone (667x375 touch) projects.
// B7 CONTRACT test ids (the combat-ui lane implements them):
//   enemy-part-e{i}-{partId} (a button on the part's anchor; tap toggles it in the order), enemy-core-e{i},
//   order-badge (inside a part or core button, text = its place in the order),
//   part-intent-e{i}-{partId}, part-hp-e{i}-{partId},
//   salvage-tray, salvage-item-{n}, salvage-keep-{n} (toggle), salvage-done.
// Test hooks: __game.practice({ enemies, bin }), __game.order() -> string[],
//   __game.cheat.runFight(enemies: string[]) (a new run, seed 1, in a fight against exactly these enemies),
//   __game.cheat.breakPart(enemy: number, partId: string), __game.cheat.winFight().
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { noSidewaysScroll, press, showTip, skipFirstLaunch, watchErrors } from './helpers';

type G = {
  __game: {
    practice(o: { enemies?: string[]; bin?: string | string[]; seed?: number }): void;
    order(): string[];
    setSpeed(s: string): void;
    state(): { phase?: string; run?: { pending?: { kind: string } | null } };
    cheat: { runFight(e: string[]): void; breakPart(e: number, p: string): void; winFight(): Promise<void> };
  };
};
const game = (page: Page) => ({
  order: () => page.evaluate(() => (window as unknown as G).__game.order()),
});

async function practiceRat(page: Page): Promise<void> {
  await skipFirstLaunch(page);
  await page.goto('/');
  await page.evaluate(() => {
    const g = (window as unknown as G).__game;
    g.setSpeed('skip');
    g.practice({ enemies: ['cog-rat'], bin: ['spur', 'spur', 'spur', 'escapement', 'escapement'], seed: 1 });
  });
  await expect(page.getByTestId('enemy-part-e0-rat-jaw')).toBeVisible();
}

test('EM8: tapping parts and the core builds a numbered target order that persists', async ({ page }) => {
  const errors = watchErrors(page);
  await practiceRat(page);
  await page.evaluate(() => (window as unknown as G).__game.order()); // hook exists
  // start from an empty order
  for (const ref of await game(page).order()) {
    const [e, p] = ref.split('.');
    const id = p === 'core' ? `enemy-core-${e}` : `enemy-part-${e}-${p}`;
    await press(page, page.getByTestId(id));
  }
  expect(await game(page).order()).toEqual([]);
  await press(page, page.getByTestId('enemy-part-e0-rat-tail'));
  await press(page, page.getByTestId('enemy-part-e0-rat-jaw'));
  await press(page, page.getByTestId('enemy-core-e0'));
  expect(await game(page).order()).toEqual(['e0.rat-tail', 'e0.rat-jaw', 'e0.core']);
  await expect(page.getByTestId('enemy-part-e0-rat-tail').getByTestId('order-badge')).toHaveText('1');
  await expect(page.getByTestId('enemy-part-e0-rat-jaw').getByTestId('order-badge')).toHaveText('2');
  await expect(page.getByTestId('enemy-core-e0').getByTestId('order-badge')).toHaveText('3');
  await press(page, page.getByTestId('enemy-part-e0-rat-jaw')); // tap again removes it
  expect(await game(page).order()).toEqual(['e0.rat-tail', 'e0.core']);
  const box = await page.getByTestId('enemy-part-e0-rat-tail').boundingBox();
  expect(box && box.width >= 40 && box.height >= 40).toBe(true); // tap targets 40 px+
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('EM9: the acting part shows its intent and HP on its anchor, with a tooltip naming it', async ({ page }) => {
  const errors = watchErrors(page);
  await practiceRat(page);
  const intent = page.getByTestId('part-intent-e0-rat-jaw'); // the jaw attacks on odd turns: turn 1
  await expect(intent).toBeVisible();
  await expect(intent).toContainText('5');
  await expect(page.getByTestId('part-hp-e0-rat-jaw')).toBeVisible();
  const partBox = await page.getByTestId('enemy-part-e0-rat-jaw').boundingBox();
  const intentBox = await intent.boundingBox();
  expect(partBox && intentBox).toBeTruthy();
  // the intent sits on (or right next to) its part
  expect(Math.abs(intentBox!.x + intentBox!.width / 2 - (partBox!.x + partBox!.width / 2))).toBeLessThan(80);
  await showTip(page, page.getByTestId('enemy-part-e0-rat-jaw'));
  await expect(page.getByRole('tooltip')).toContainText('Gnawing Jaw');
  expect(errors).toEqual([]);
});

test('SV1: after a fight the salvage tray offers the broken parts; nothing is a pick-1-of-3', async ({ page }) => {
  const errors = watchErrors(page);
  await skipFirstLaunch(page);
  await page.goto('/');
  await page.evaluate(async () => {
    const g = (window as unknown as G).__game;
    g.setSpeed('skip');
    g.cheat.runFight(['cog-rat']);
    g.cheat.breakPart(0, 'rat-jaw');
    await g.cheat.winFight();
  });
  const tray = page.getByTestId('salvage-tray');
  await expect(tray).toBeVisible();
  await expect(page.getByTestId('salvage-item-0')).toContainText('Spur');
  await expect(page.getByTestId('salvage-item-1')).toHaveCount(0);
  await press(page, page.getByTestId('salvage-keep-0'));
  await press(page, page.getByTestId('salvage-done'));
  await expect(tray).toBeHidden();
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});
