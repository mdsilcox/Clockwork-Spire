import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { isTouch, noSidewaysScroll, practice, press, setIntent, setSpeed, showTip, skipFirstLaunch, state, watchErrors } from './helpers';

const KINDS = ['attack', 'defend', 'sabotage', 'buff', 'debuff', 'charge', 'summon', 'special'];

test.beforeEach(async ({ page }) => {
  await skipFirstLaunch(page);
});

async function fightWithSpur(page: Page, enemies = ['tutorial-automaton', 'tutorial-automaton']): Promise<void> {
  // legacy (core-only) enemies: these tests read the single intent chip and set intents by hand; frame enemies show part intents (v2-machines.spec.ts)
  await page.goto('/');
  await expect(page.getByTestId('title')).toBeVisible();
  for (let seed = 1; seed < 80; seed++) {
    await practice(page, { enemies, bin: 'tinker', seed });
    const s = await state(page);
    if (s.hand.some((u) => s.parts[u].defId === 'spur')) return;
  }
  throw new Error('no seed with a Spur in the opening hand');
}

async function placeSpur(page: Page): Promise<void> {
  const s = await state(page);
  const idx = s.hand.findIndex((u) => s.parts[u].defId === 'spur');
  await press(page, page.getByTestId('hand-card').nth(idx));
  await press(page, page.getByTestId('cell-B2'));
  await expect(page.getByTestId('badge-B2')).toBeVisible();
}

test('M15: tooltips on a part, an intent, a status and the gauges', async ({ page }) => {
  const errors = watchErrors(page);
  await fightWithSpur(page);
  await placeSpur(page);
  const tip = page.getByTestId('tooltip');

  // a part on the board
  await showTip(page, page.getByTestId('cell-B2'));
  await expect(tip).toContainText('Spur Gear');
  await expect(tip).toContainText('Strike 3');
  // Strike is a glossary word: underlined, and it opens the glossary entry
  await tip.locator('.gl', { hasText: 'Strike' }).first().click();
  await expect(page.getByTestId('glossary')).toBeVisible();
  await expect(page.locator('.gentry.focus h3')).toContainText('Strike');
  await page.getByTestId('glossary-close').click();
  await expect(page.getByTestId('glossary')).toHaveCount(0);

  // an intent
  await showTip(page, page.getByTestId('intent-0'));
  await expect(tip).toContainText('Attack');
  // a status pip on an enemy
  await page.evaluate(() => (window as unknown as { __game: { debugEnemy(i: number, p: object): void } }).__game.debugEnemy(0, { statuses: { scald: 2 }, shell: 4 }));
  await expect(page.getByTestId('pip-scald-0')).toBeVisible();
  await showTip(page, page.getByTestId('pip-scald-0'));
  await expect(tip).toContainText('Scald');
  await expect(tip).toContainText('damage');
  await showTip(page, page.getByTestId('pip-shell-0'));
  await expect(tip).toContainText('Shell');
  // the HUD: Plating, Pressure, Ticks, Momentum
  for (const [id, word] of [
    ['plating', 'Block'],
    ['pressure', 'overpressures'],
    ['ticks', 'beats'],
    ['momentum', 'fired'],
  ] as const) {
    await showTip(page, page.getByTestId(id));
    await expect(tip).toContainText(word);
  }
  // the debug hook returns the same text
  const text = await page.evaluate(() => (window as unknown as { __game: { tooltip(s: string): Promise<string | null> } }).__game.tooltip('[data-testid="cell-B2"]'));
  expect(text).toContain('Spur Gear');
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('tooltips stay inside the screen, and go away on tap-away, placement and Run', async ({ page }) => {
  await fightWithSpur(page);
  const tip = page.getByTestId('tooltip');
  const vp = page.viewportSize()!;
  // a hand card at the edge
  await showTip(page, page.getByTestId('hand-card').first());
  await expect(tip).toBeVisible();
  let box = (await tip.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height);

  // tap away
  await page.mouse.click(vp.width / 2, 4);
  await expect(tip).toHaveCount(0);

  // placement
  const s = await state(page);
  const idx = s.hand.findIndex((u) => s.parts[u].defId === 'spur');
  await showTip(page, page.getByTestId('hand-card').nth(idx));
  await expect(tip).toBeVisible();
  await press(page, page.getByTestId('hand-card').nth(idx));
  await press(page, page.getByTestId('cell-B2'));
  await expect(page.getByTestId('badge-B2')).toBeVisible();
  await expect(tip).toHaveCount(0);

  // Run
  await showTip(page, page.getByTestId('cell-B2'));
  await expect(tip).toBeVisible();
  box = (await tip.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
  await setSpeed(page, 'skip');
  await page.getByTestId('run').dispatchEvent('click');
  await expect(tip).toHaveCount(0);
});

test('O2: the glossary opens from the title and the menu, lists every term and searches', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await press(page, page.getByTestId('open-glossary'));
  await expect(page.getByTestId('glossary')).toBeVisible();
  const terms = await page.evaluate(() => (window as unknown as { __game: { glossary(): { term: string }[] } }).__game.glossary());
  expect(terms.length).toBeGreaterThan(60);
  await expect(page.getByTestId('glossary-entry')).toHaveCount(terms.length);
  await noSidewaysScroll(page);
  // each entry can be reached by scrolling
  const last = page.getByTestId('glossary-entry').last();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeVisible();
  // search
  await page.getByTestId('glossary-search').fill('plating');
  const n = await page.getByTestId('glossary-entry').count();
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(terms.length);
  await page.getByTestId('glossary-search').fill('zzzzz');
  await expect(page.getByText('Nothing matches that')).toBeVisible();
  await page.getByTestId('glossary-close').click();

  // from the combat menu
  await press(page, page.getByTestId('practice'));
  await expect(page.getByTestId('combat')).toBeVisible();
  await press(page, page.getByTestId('menu'));
  await press(page, page.getByTestId('menu-glossary'));
  await expect(page.getByTestId('glossary')).toBeVisible();
  // typing in the search box must not trigger game keys (R runs the machine)
  await page.getByTestId('glossary-search').fill('r');
  expect((await state(page)).turn).toBe(1);
  await page.getByTestId('glossary-close').click();
  expect(errors).toEqual([]);
});

test('C5: a Rust intent outlines its cell before the player builds; Jam and Drain show badges', async ({ page }) => {
  const errors = watchErrors(page);
  await fightWithSpur(page);
  await setIntent(page, 0, { kind: 'sabotage', sabotage: 'rust', target: 7, label: 'Rusts a part' });
  await expect(page.locator('.cell.sabo')).toHaveCount(1);
  await expect(page.getByTestId('sabo-C2')).toBeVisible();
  const rows = await page.evaluate(() => (window as unknown as { __game: { intents(): { kind: string; targets: string[] }[] } }).__game.intents());
  expect(rows[0]).toMatchObject({ kind: 'sabotage', targets: ['C2'] });
  // hovering the intent highlights its cells
  if (!(await isTouch(page))) {
    await page.getByTestId('intent-0').hover();
    await expect(page.locator('.cell.sabo.hot')).toHaveCount(1);
  }
  await setIntent(page, 0, { kind: 'sabotage', sabotage: 'jam', label: 'Jams the Mainspring' });
  await expect(page.locator('.cell.sabo')).toHaveCount(0);
  await expect(page.getByTestId('jam-badge')).toBeVisible();
  await setIntent(page, 0, { kind: 'sabotage', sabotage: 'drain', amount: 5, label: 'Drains Pressure' });
  await expect(page.getByTestId('jam-badge')).toHaveCount(0);
  await expect(page.getByTestId('drain-badge')).toBeVisible();
  await setIntent(page, 0, { kind: 'attack', amount: 4, label: 'Attack 4' });
  await expect(page.getByTestId('drain-badge')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Q3: every intent kind has its own shape, and color-blind icons add a word', async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => window.localStorage.setItem('cs.colorBlind', '1'));
  await fightWithSpur(page, ['tutorial-automaton']);
  const shapes = new Set<string>();
  for (const kind of KINDS) {
    await setIntent(page, 0, { kind, amount: 8, hits: kind === 'attack' ? 2 : undefined, label: kind });
    const intent = page.getByTestId('intent-0');
    await expect(intent).toHaveAttribute('data-kind', kind);
    shapes.add(await intent.locator('svg path, svg circle').evaluateAll((els) => els.map((e) => e.getAttribute('d') ?? `c${e.getAttribute('r')}`).join('|')));
    await expect(intent.locator('.ilabel')).toHaveText(/\S/);
  }
  expect(shapes.size).toBe(KINDS.length);
  // multi-hit reads "8 x2"
  await setIntent(page, 0, { kind: 'attack', amount: 8, hits: 2, label: 'Attack 8 x2' });
  await expect(page.getByTestId('intent-0')).toContainText('8 x2');
  // turning the option off (the settings record is the source of truth now)
  await page.evaluate(() => (window as unknown as { __game: { setSettings(p: object): void } }).__game.setSettings({ colorBlindIcons: false }));
  await expect(page.locator('.ilabel')).toHaveCount(0);
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByTestId('combat')).toBeVisible(); // the saved fight resumes
  await expect(page.locator('.ilabel')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('four enemies fit, the sandbox picker starts any encounter, and the screen never scrolls sideways', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await press(page, page.getByTestId('sandbox'));
  await expect(page.getByTestId('practice-picker')).toBeVisible();
  await noSidewaysScroll(page);
  await press(page, page.getByTestId('bin-pick'));
  await press(page, page.getByTestId('part-spur-plus'));
  await press(page, page.getByTestId('part-spur-plus'));
  await expect(page.getByTestId('count-spur')).toHaveText('2');
  await noSidewaysScroll(page);
  await press(page, page.getByTestId('start-practice'));
  await expect(page.getByTestId('combat')).toBeVisible();
  let s = await state(page);
  expect(s.hand.every((u) => s.parts[u].defId === 'spur')).toBe(true);

  await practice(page, { enemies: ['cog-rat', 'rust-mite', 'rust-mite', 'cog-rat'], bin: 'random10' });
  s = await state(page);
  expect(s.enemies).toHaveLength(4);
  const stage = (await page.getByTestId('stage').boundingBox())!;
  for (let i = 0; i < 4; i++) {
    const intent = (await page.getByTestId(`enemy-core-e${i}`).boundingBox())!;
    const tap = (await page.getByTestId(`enemy-${i}`).boundingBox())!;
    expect(intent.x).toBeGreaterThanOrEqual(stage.x);
    expect(intent.x + intent.width).toBeLessThanOrEqual(stage.x + stage.width + 1);
    expect(tap.y + tap.height).toBeLessThanOrEqual(stage.y + stage.height + 1);
    expect(tap.height).toBeGreaterThanOrEqual(40);
  }
  // tapping an enemy targets it
  await press(page, page.getByTestId('enemy-2'));
  await expect(page.getByTestId('enemy-2')).toHaveAttribute('aria-pressed', 'true');
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('a turn summary line appears after Run', async ({ page }) => {
  await fightWithSpur(page);
  await placeSpur(page);
  await setSpeed(page, 'skip');
  await press(page, page.getByTestId('run'));
  await expect(page.getByTestId('turn-summary')).toContainText(/Chain x\d+, \d+ damage, \d+ Plating/);
});

test('every enemy slot is at least 48 px tall with 1 to 4 enemies, and a boss fits', async ({ page }) => {
  await page.goto('/');
  const sets = [['rust-mite'], ['cog-rat', 'rust-mite'], ['cog-rat', 'rust-mite', 'oil-slick'], ['cog-rat', 'rust-mite', 'rust-mite', 'brass-beetle'], ['foreman']];
  for (const enemies of sets) {
    await practice(page, { enemies, bin: 'tinker', seed: 2 });
    await expect(page.getByTestId('enemy-0')).toBeVisible();
    const stage = (await page.getByTestId('stage').boundingBox())!;
    for (let i = 0; i < enemies.length; i++) {
      const box = (await page.getByTestId(`enemy-${i}`).boundingBox())!;
      expect(box.height, `${enemies.join()} #${i}`).toBeGreaterThanOrEqual(48);
      expect(box.y + box.height).toBeLessThanOrEqual(stage.y + stage.height + 1);
    }
  }
  await noSidewaysScroll(page);
});

test('sandbox presets: a preset bin scaled by the chosen enemy act', async ({ page }) => {
  await page.goto('/');
  await press(page, page.getByTestId('sandbox'));
  // a preset is preselected
  await expect(page.getByTestId('bin-mixed')).toHaveAttribute('aria-pressed', 'true');
  await press(page, page.getByTestId('bin-spring-loaded'));
  await press(page, page.getByTestId('start-practice'));
  await expect(page.getByTestId('combat')).toBeVisible();
  const s = await state(page);
  const defs = Object.values(s.parts).map((p) => p.defId);
  expect(defs.length).toBeGreaterThanOrEqual(12);
  expect(defs).toContain('coil');
  expect(defs).toContain('torsion');
});
