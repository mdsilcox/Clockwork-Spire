import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

interface GameState {
  turn: number;
  hand: number[];
  parts: Record<string, { defId: string }>;
  board: ({ defId: string } | null)[];
  enemies: { hp: number; maxHp: number }[];
  outcome: string;
  playerHp: number;
}
interface Preview {
  damageByEnemy: number[];
  plating: number;
  ticks: number;
}
interface Game {
  state(): GameState;
  preview(): Preview;
  newFight(seed?: number): void;
  setSpeed(s: string): void;
  setEnemyHp(hp: number): void;
  busy(): boolean;
}

const state = (page: Page) => page.evaluate(() => (window as unknown as { __game: Game }).__game.state());
const preview = (page: Page) => page.evaluate(() => (window as unknown as { __game: Game }).__game.preview());
const handDefs = async (page: Page) => {
  const s = await state(page);
  return s.hand.map((u) => s.parts[u].defId);
};

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

async function noSidewaysScroll(page: Page): Promise<void> {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(sw).toBeLessThanOrEqual(cw);
}

async function atLeast40(loc: Locator): Promise<void> {
  const box = await loc.boundingBox();
  expect(box, 'element has a box').not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(40);
  expect(box!.height).toBeGreaterThanOrEqual(40);
}

/** Tap on the phone project, click on desktop. */
async function press(page: Page, loc: Locator): Promise<void> {
  const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  if (touch) await loc.tap();
  else await loc.click();
}

/** Start a fight whose opening hand has a Spur Gear. */
async function newFightWithSpur(page: Page): Promise<void> {
  for (let seed = 1; seed < 60; seed++) {
    await page.evaluate((s) => (window as unknown as { __game: Game }).__game.newFight(s), seed);
    if ((await handDefs(page)).includes('spur')) return;
  }
  throw new Error('no seed with a Spur in the opening hand');
}

test('plays a practice fight through the real UI', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Clockwork Spire' })).toBeVisible();
  await noSidewaysScroll(page);
  await press(page, page.getByRole('button', { name: 'Practice fight' }));
  await expect(page.getByTestId('combat')).toBeVisible();
  await expect(page.getByTestId('hand-card')).toHaveCount(3);
  await newFightWithSpur(page);
  await expect(page.getByTestId('combat')).toBeVisible();
  await noSidewaysScroll(page);

  // tap targets
  await atLeast40(page.getByTestId('run'));
  await atLeast40(page.getByTestId('speed'));
  await atLeast40(page.getByTestId('hand-card').first());
  await atLeast40(page.getByTestId('cell-B2'));

  // build: Spur Gear to B2, then any other card to A1 (both touch the Mainspring)
  const defs = await handDefs(page);
  const spurIdx = defs.indexOf('spur');
  await press(page, page.getByTestId('hand-card').nth(spurIdx));
  await press(page, page.getByTestId('cell-B2'));
  await press(page, page.getByTestId('hand-card').first());
  await press(page, page.getByTestId('cell-A1'));
  await expect(page.getByTestId('placements')).toContainText('0');

  // the preview shows badges on firing parts
  await expect(page.getByTestId('badge-B2')).toHaveText('x3');
  await expect(page.getByTestId('badge-A1')).toBeVisible();
  await expect(page.getByTestId('preview')).toContainText('damage');

  // a third placement is refused with a message
  if ((await handDefs(page)).length > 0) {
    await press(page, page.getByTestId('hand-card').first());
    await press(page, page.getByTestId('cell-C2'));
    await expect(page.getByTestId('toast')).toContainText('No placements left');
  }

  const before = await state(page);
  const p = await preview(page);
  expect(p.damageByEnemy[0]).toBeGreaterThanOrEqual(9);

  // run at 2x, then check the damage dealt equals the preview
  await press(page, page.getByTestId('speed'));
  await expect(page.getByTestId('speed')).toHaveText('2x');
  await press(page, page.getByTestId('run'));
  await expect.poll(async () => (await state(page)).turn, { timeout: 15_000 }).toBeGreaterThan(before.turn);
  const after = await state(page);
  expect(before.enemies[0].hp - after.enemies[0].hp).toBe(p.damageByEnemy[0]);
  expect(before.enemies[1].hp - after.enemies[1].hp).toBe(p.damageByEnemy[1]);
  await expect(page.getByTestId('hand-card')).toHaveCount(3);

  // skip speed, then cheat the enemies down and win
  await press(page, page.getByTestId('speed'));
  await expect(page.getByTestId('speed')).toHaveText('Skip');
  await page.evaluate(() => (window as unknown as { __game: Game }).__game.setEnemyHp(1));
  await press(page, page.getByTestId('run'));
  await expect(page.getByTestId('result')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('combat')).toHaveAttribute('data-outcome', 'won');
  await noSidewaysScroll(page);

  // again
  await press(page, page.getByTestId('again'));
  await expect(page.getByTestId('result')).toHaveCount(0);
  await expect(page.getByTestId('hand-card')).toHaveCount(3);
  expect((await state(page)).turn).toBe(1);

  expect(errors).toEqual([]);
});

test('keyboard: 1 picks a part, Enter places it, R runs', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.getByTestId('practice').click();
  await newFightWithSpur(page);
  const defs = await handDefs(page);
  const spurIdx = defs.indexOf('spur');
  await page.keyboard.press(String(spurIdx + 1));
  await expect(page.getByTestId('hand-card').nth(spurIdx)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Enter'); // the cursor starts on B2
  await expect(page.getByTestId('cell-B2')).toHaveAttribute('aria-label', /Spur Gear/);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('1');
  await page.keyboard.press('Enter'); // A1
  await expect(page.getByTestId('placements')).toContainText('0');
  await page.keyboard.press('r');
  await expect.poll(async () => (await state(page)).turn, { timeout: 15_000 }).toBe(2);
  expect(errors).toEqual([]);
});

test('swapping two placed parts is free once per turn', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('practice').click();
  await newFightWithSpur(page);
  await press(page, page.getByTestId('hand-card').first());
  await press(page, page.getByTestId('cell-B2'));
  await press(page, page.getByTestId('hand-card').first());
  await press(page, page.getByTestId('cell-C2'));
  const s1 = await state(page);
  await press(page, page.getByTestId('cell-B2'));
  await press(page, page.getByTestId('cell-C2'));
  const s2 = await state(page);
  expect(s2.board[6]!.defId).toBe(s1.board[7]!.defId);
  expect(s2.board[7]!.defId).toBe(s1.board[6]!.defId);
  await expect(page.getByTestId('placements')).toContainText('0');
});

test('a fight in progress survives a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('practice').click();
  await newFightWithSpur(page);
  await press(page, page.getByTestId('hand-card').first());
  await press(page, page.getByTestId('cell-B2'));
  const saved = () =>
    page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const open = indexedDB.open('clockwork-spire');
          open.onerror = () => resolve(-1);
          open.onsuccess = () => {
            const db = open.result;
            if (!db.objectStoreNames.contains('saves')) return resolve(-1);
            const get = db.transaction('saves').objectStore('saves').get('practice');
            get.onsuccess = () => {
              const row = get.result as { combat: { board: unknown[] } } | undefined;
              resolve(row ? row.combat.board.filter((b) => b).length : -1);
            };
            get.onerror = () => resolve(-1);
          };
        }),
    );
  await expect.poll(saved).toBe(1);
  const before = await state(page);
  await page.reload();
  await expect(page.getByTestId('combat')).toBeVisible();
  const after = await state(page);
  expect(after).toEqual(before);
});

test('the title screen and fight fit without sideways scroll', async ({ page }) => {
  await page.goto('/');
  await noSidewaysScroll(page);
  await page.getByTestId('practice').click();
  await expect(page.getByTestId('combat')).toBeVisible();
  await noSidewaysScroll(page);
  const vp = page.viewportSize()!;
  const combat = await page.getByTestId('combat').boundingBox();
  expect(combat!.height).toBeLessThanOrEqual(vp.height + 1);
  const run = await page.getByTestId('run').boundingBox();
  expect(run!.y + run!.height).toBeLessThanOrEqual(vp.height);
});

test('dragging a card onto a cell places it', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('practice').click();
  await newFightWithSpur(page);
  const card = await page.getByTestId('hand-card').first().boundingBox();
  const cell = await page.getByTestId('cell-C2').boundingBox();
  await page.mouse.move(card!.x + card!.width / 2, card!.y + card!.height / 2);
  await page.mouse.down();
  await page.mouse.move(card!.x + card!.width / 2 + 30, card!.y - 40, { steps: 4 });
  await page.mouse.move(cell!.x + cell!.width / 2, cell!.y + cell!.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId('cell-C2')).toHaveAttribute('aria-label', /^C2, (?!empty)/);
  expect((await state(page)).board[7]).not.toBeNull();
});

test('rules tooltip on hover, focus and long press stays inside the screen', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('practice').click();
  await newFightWithSpur(page);
  const inside = async () => {
    const b = await page.getByTestId('tooltip').boundingBox();
    const vp = page.viewportSize()!;
    expect(b!.x).toBeGreaterThanOrEqual(0);
    expect(b!.y).toBeGreaterThanOrEqual(0);
    expect(b!.x + b!.width).toBeLessThanOrEqual(vp.width);
    expect(b!.y + b!.height).toBeLessThanOrEqual(vp.height);
  };
  // keyboard focus on a hand card
  await page.getByTestId('hand-card').first().focus();
  await expect(page.getByTestId('tooltip')).toContainText('.');
  await inside();
  // long press on a hand card (works with a mouse too)
  await page.getByTestId('hand-card').nth(1).blur();
  const box = (await page.getByTestId('hand-card').nth(1).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(550);
  await expect(page.getByTestId('tooltip')).toBeVisible();
  await inside();
  await page.mouse.up();
  // a placed part shows its name and text
  await page.evaluate(() => (window as unknown as { __game: Game & { debugBoard(s: object): void } }).__game.debugBoard({ B2: 'coil' }));
  await page.getByTestId('cell-B2').focus();
  await expect(page.getByTestId('tooltip')).toContainText('Coil Spring');
  await expect(page.getByTestId('tooltip')).toContainText('Charge 0/3');
  await inside();
});

test('no stale chain counter after a win and reload', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('practice').click();
  await newFightWithSpur(page);
  await page.evaluate(() => {
    const g = (window as unknown as { __game: Game & { debugBoard(s: object): void } }).__game;
    g.debugBoard({ B2: 'spur', A1: 'spur', A3: 'spur' });
    g.setSpeed('skip');
    g.setEnemyHp(1);
  });
  await page.getByTestId('run').click();
  await expect(page.getByTestId('result')).toBeVisible();
  await expect(page.getByTestId('chain')).toBeHidden();
  await expect(page.getByTestId('result')).toContainText('Victory');
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByTestId('result')).toBeVisible();
  await expect(page.getByTestId('chain')).toBeHidden();
});
