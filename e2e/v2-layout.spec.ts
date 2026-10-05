// B7 round 2: enemy machine layout and the salvage tray at 667x375 (phone) and 1280x800 (desktop).
// Every marker and intent is inside the stage; no marker covers another marker, a name or an HP line;
// the salvage tray keeps its Done button and the payout on screen.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { noSidewaysScroll, press, skipFirstLaunch, watchErrors } from './helpers';

type G = {
  __game: {
    practice(o: { enemies?: string[]; bin?: string | string[]; seed?: number }): void;
    setSpeed(s: string): void;
    cheat: { runFight(e: string[]): void; breakPart(e: number, p: string): void; winFight(): Promise<void>; setPending(p: unknown): void };
    newSlot(n: number, name: string): Promise<boolean>;
    climb(c: string): boolean;
  };
};

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  what: string;
}

async function boxes(page: Page, selector: string, what: string): Promise<Box[]> {
  return page.evaluate(
    ([sel, w]) =>
      Array.from(document.querySelectorAll(sel))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height, what: `${w}:${el.getAttribute('data-testid') ?? el.textContent?.trim().slice(0, 20)}` };
        }),
    [selector, what] as const,
  );
}

const overlap = (a: Box, b: Box): boolean => a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;

async function fight(page: Page, enemies: string[]): Promise<void> {
  await skipFirstLaunch(page);
  await page.goto('/');
  await page.evaluate((e) => {
    const g = (window as unknown as G).__game;
    g.setSpeed('skip');
    g.practice({ enemies: e, bin: ['escapement', 'escapement', 'escapement', 'spur', 'spur'], seed: 1 });
  }, enemies);
  await expect(page.getByTestId('enemy-core-e0')).toBeVisible();
}

async function expectClean(page: Page): Promise<void> {
  const stage = (await page.getByTestId('stage').boundingBox())!;
  const markers = await boxes(page, '[data-target-marker]', 'marker');
  const intents = await boxes(page, '[data-testid^="part-intent-"]', 'intent');
  const texts = [...(await boxes(page, '.enemy .ename', 'name')), ...(await boxes(page, '.enemy .ehp', 'hp'))];
  expect(markers.length).toBeGreaterThan(0);
  for (const b of [...markers, ...intents]) {
    expect(b.x, b.what).toBeGreaterThanOrEqual(stage.x - 0.5);
    expect(b.y, b.what).toBeGreaterThanOrEqual(stage.y - 0.5);
    expect(b.x + b.w, b.what).toBeLessThanOrEqual(stage.x + stage.width + 0.5);
    expect(b.y + b.h, b.what).toBeLessThanOrEqual(stage.y + stage.height + 0.5);
  }
  for (let i = 0; i < markers.length; i++) {
    expect(markers[i].w, markers[i].what).toBeGreaterThanOrEqual(39.5);
    for (let j = i + 1; j < markers.length; j++) expect(overlap(markers[i], markers[j]), `${markers[i].what} over ${markers[j].what}`).toBe(false);
    for (const t of texts) expect(overlap(markers[i], t), `${markers[i].what} over ${t.what}`).toBe(false);
  }
  // an intent never covers another part's marker (inside its own marker on the phone, above it on the desktop)
  for (const it of intents) {
    const own = it.what.replace('intent:part-intent-', '');
    for (const m of markers) {
      const id = m.what.replace('marker:', '').replace('enemy-part-', '').replace('enemy-core-', '');
      if (own === id || own.endsWith(id) || id.endsWith(own)) continue;
      expect(overlap(it, m), `${it.what} over ${m.what}`).toBe(false);
    }
  }
}

test('LY1: four enemies keep every marker and intent inside the stage and clear of each other', async ({ page }) => {
  const errors = watchErrors(page);
  await fight(page, ['rust-mite', 'rust-mite', 'cog-rat', 'spring-imp']);
  await expectClean(page);
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('LY2: a warden-sized machine shows every acting part intent, clear of the name and HP', async ({ page }) => {
  const errors = watchErrors(page);
  await fight(page, ['tinpot-general']);
  await expectClean(page);
  for (const id of ['tinpot-horn', 'tinpot-bugle']) await expect(page.getByTestId(`part-intent-e0-${id}`)).toBeVisible();
  expect(errors).toEqual([]);
});

test('LY3: two enemies with parts stay clear of their names', async ({ page }) => {
  await fight(page, ['cog-rat', 'rust-mite']);
  await expectClean(page);
});

test('LY4: the salvage tray keeps Done on screen and shows what Done will add', async ({ page }) => {
  const errors = watchErrors(page);
  await skipFirstLaunch(page);
  await page.goto('/');
  await page.evaluate(async () => {
    const g = (window as unknown as G).__game;
    g.setSpeed('skip');
    g.cheat.runFight(['cog-rat']);
    g.cheat.breakPart(0, 'rat-jaw');
    g.cheat.breakPart(0, 'rat-plate');
    await g.cheat.winFight();
  });
  await expect(page.getByTestId('salvage-tray')).toBeVisible();
  const vh = page.viewportSize()!.height;
  const done = (await page.getByTestId('salvage-done').boundingBox())!;
  expect(done.y + done.height).toBeLessThanOrEqual(vh + 0.5);
  await expect(page.getByTestId('salvage-scrap')).toContainText('2 parts scrapped');
  const before = (await page.getByTestId('salvage-pay').textContent())!;
  expect(before).toMatch(/\+\d+ Cogs/);
  await press(page, page.getByTestId('salvage-keep-0'));
  const after = (await page.getByTestId('salvage-pay').textContent())!;
  expect(after).not.toEqual(before);
  await expect(page.getByTestId('salvage-scrap')).toContainText('1 part scrapped');
  const done2 = (await page.getByTestId('salvage-done').boundingBox())!;
  expect(done2.y + done2.height).toBeLessThanOrEqual(vh + 0.5);
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('LY5: a saved tray naming an unknown part renders instead of crashing', async ({ page }) => {
  const errors = watchErrors(page);
  await skipFirstLaunch(page);
  await page.goto('/');
  await page.evaluate(async () => {
    const g = (window as unknown as G).__game;
    g.setSpeed('skip');
    g.cheat.runFight(['cog-rat']);
    g.cheat.setPending({ kind: 'salvage', items: [{ enemy: 0, partId: 'ghost', salvage: 'no-such-part', rarity: 'common', locked: false }], cogs: 3, trinkets: [], trinketTaken: false, done: false });
  });
  await expect(page.getByTestId('salvage-item-0')).toContainText('Unknown part');
  await expect(page.getByTestId('salvage-keep-0')).toHaveCount(0);
  expect(errors).toEqual([]);
});
