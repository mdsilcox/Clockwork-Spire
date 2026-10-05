// B9b acceptance (browser), owner: progression. Desktop (1280x800) and phone (667x375 touch).
// docs/acceptance.md AD2 (E), AD6; docs/briefs/B9b-rarity.md ("The Queen's core", "Tier marks", achievements).
// CONTRACT test ids and hooks the progression lane implements (TierMark, `tier-mark`, is the contract's):
//   Workshop tab `tab-trophies` -> panel `trophies`; one row per achievement `trophy-{id}` with data-earned="true|false" and
//   data-available="true|false"; a row that is not available contains the text "Opens with Bellfoot". Rewards with no system
//   yet are listed in `trophy-rewards` (e.g. "Red collar"). A row shows its reward part or trinket with a `tier-mark`.
//   The Queen's pick: screen `legendary`, one `legendary-option-{n}` button per option (name, tier mark, effect text); there is no
//   skip control (`legendary-skip` never exists); taking one sets run.legendary and leaves the screen.
//   __game.cheat.unlock(id)  earn an achievement now, as finishRun would (unlocks, rewards, one save write)
//   __game.trophies()        the shelf data: { achievements: { id, earned: string | null, available: boolean }[], rewards }
//   __game.runState()        NEW: a JSON copy of the live RunState (or null), to read `legendary`
//   existing: cheat.setPending, cheat.openTrader, cheat.runFight, practice, newSlot.
// AD6 is checked from computed styles: the mark of each tier has a distinct shape signature (clip-path, mask, borders, radius,
// gradients, shadows, size, pseudo-elements) with every color stripped, so a mark that differs only by color fails; Common has none.
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { noSidewaysScroll, press, skipFirstLaunch, watchErrors } from './helpers';

type G = {
  __game: {
    newSlot(n: 1 | 2 | 3, name: string): Promise<boolean>;
    setSpeed(s: string): void;
    practice(o: { enemies?: string[]; bin?: string | string[]; seed?: number }): void;
    runState(): { legendary: string | null; pending: { kind: string } | null; phase: string } | null;
    trophies(): { achievements: { id: string; earned: string | null; available: boolean }[]; rewards: { collars: string[]; journal: string[] } };
    cheat: {
      unlock(id: string): void;
      setPending(p: unknown): void;
      openTrader(stock: { kind: 'part' | 'trinket' | 'oil'; id?: string; value: number; sold: boolean }[]): void;
      runFight(e: string[]): void;
    };
  };
};

async function workshop(page: Page): Promise<void> {
  await skipFirstLaunch(page);
  await page.goto('/');
  await page.evaluate(() => (window as unknown as G).__game.newSlot(1, 'Ada'));
  await expect(page.getByTestId('workshop')).toBeVisible();
}
const unlock = (page: Page, id: string) => page.evaluate((x) => (window as unknown as G).__game.cheat.unlock(x), id);

test('AD2 (E): an unlocked achievement shows on the trophy shelf, earned, with its reward', async ({ page }) => {
  const errors = watchErrors(page);
  await workshop(page);
  await press(page, page.getByTestId('tab-trophies'));
  await expect(page.getByTestId('trophies')).toBeVisible();
  await expect(page.getByTestId('trophy-m-burst')).toHaveAttribute('data-earned', 'false');
  await unlock(page, 'm-burst');
  await expect(page.getByTestId('trophy-m-burst')).toHaveAttribute('data-earned', 'true');
  await expect(page.getByTestId('trophy-m-burst')).toContainText(/resonance rod/i);
  await unlock(page, 'e-pet');
  await expect(page.getByTestId('trophy-rewards')).toContainText(/red collar/i);
  const shelf = await page.evaluate(() => (window as unknown as G).__game.trophies());
  expect(shelf.achievements.find((a) => a.id === 'm-burst')?.earned).toBeTruthy();
  await page.waitForTimeout(400); // the save lands in the same write
  await page.reload();
  await press(page, page.getByTestId('tab-trophies'));
  await expect(page.getByTestId('trophy-m-burst')).toHaveAttribute('data-earned', 'true');
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('achievements that open with Bellfoot say so, and are never earned', async ({ page }) => {
  await workshop(page);
  await press(page, page.getByTestId('tab-trophies'));
  for (const id of ['e-resident', 'm-residents', 'h-master', 'h-ow10']) {
    const row = page.getByTestId(`trophy-${id}`);
    await expect(row).toHaveAttribute('data-available', 'false');
    await expect(row).toHaveAttribute('data-earned', 'false');
    await expect(row).toContainText('Opens with Bellfoot');
  }
  await expect(page.getByTestId('trophy-m-burst')).toHaveAttribute('data-available', 'true');
  await expect(page.getByTestId('trophy-m-burst')).not.toContainText('Opens with Bellfoot');
});

type Look = Record<string, { visible: boolean; sig: string }>;

/** The look of each tier mark under `scope` with every color stripped, for it and its pseudo-elements. Runs in the page. */
async function shapes(scope: Locator): Promise<Look> {
  const rows = await scope.locator('[data-testid="tier-mark"]').evaluateAll((els) => {
    const strip = (v: string): string => v.replace(/rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{3,8}\b|\b(transparent|currentcolor)\b/gi, 'C');
    const props = ['clipPath', 'maskImage', 'webkitMaskImage', 'backgroundImage', 'borderRadius', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle', 'transform', 'content', 'width', 'height', 'boxShadow'];
    return els.map((el) => {
      const h = el as HTMLElement;
      const sig = [null, '::before', '::after'].map((ps) => {
        const cs = getComputedStyle(h, ps);
        return props.map((p) => strip(String((cs as unknown as Record<string, unknown>)[p]))).join('|');
      });
      return { rarity: h.getAttribute('data-rarity') as string, visible: h.offsetWidth > 0 && h.offsetHeight > 0, sig: sig.join('||') };
    });
  });
  return Object.fromEntries(rows.map((r) => [r.rarity, { visible: r.visible, sig: r.sig }]));
}

test('AD6: each tier is distinct by a shape mark, not color alone, on the hand, the salvage tray, the trader and the shelf', async ({ page }) => {
  const errors = watchErrors(page);
  await skipFirstLaunch(page);
  await page.goto('/');
  const seen: Look = {};
  const note = (m: Look, site: string): void => {
    for (const [r, v] of Object.entries(m)) {
      if (seen[r]) expect(v, `${site}: the ${r} mark looks the same everywhere`).toEqual(seen[r]);
      else seen[r] = v;
    }
  };
  // the hand: two hands of three cards cover the five tiers
  for (const bin of [['spur', 'bevel', 'flywheel'], ['skewframe', 'sprockets-blanket', 'spur']]) {
    await page.evaluate((b) => {
      const gm = (window as unknown as G).__game;
      gm.setSpeed('skip');
      gm.practice({ enemies: ['cog-rat'], bin: b, seed: 1 });
    }, bin);
    await expect(page.getByTestId('hand-card')).toHaveCount(3);
    note(await shapes(page.getByTestId('hand')), 'hand');
  }
  // the salvage tray: one item of every tier
  await page.evaluate(() => {
    const gm = (window as unknown as G).__game;
    gm.cheat.runFight(['cog-rat']);
    const mk = (salvage: string, rarity: string) => ({ enemy: 0, partId: salvage, salvage, rarity, locked: false });
    gm.cheat.setPending({ kind: 'salvage', items: [mk('spur', 'common'), mk('bevel', 'uncommon'), mk('flywheel', 'rare'), mk('skewframe', 'masterwork'), mk('sprockets-blanket', 'legendary')], cogs: 3, trinkets: [], trinketTaken: true, done: false });
  });
  await expect(page.getByTestId('salvage-tray')).toBeVisible();
  note(await shapes(page.getByTestId('salvage-tray')), 'salvage');
  // the trader
  await page.evaluate(() => {
    const gm = (window as unknown as G).__game;
    gm.cheat.runFight(['cog-rat']);
    const s = (id: string) => ({ kind: 'part' as const, id, value: 20, sold: false });
    gm.cheat.openTrader([s('spur'), s('bevel'), s('flywheel'), s('skewframe'), s('sprockets-blanket'), { kind: 'trinket', id: 'foresight-dial', value: 160, sold: false }]);
  });
  await expect(page.getByTestId('trader')).toBeVisible();
  note(await shapes(page.getByTestId('trader')), 'trader');
  // the shelf: Rare (sapper), Masterwork (resonance rod) and Legendary (Sprocket's Blanket) rewards
  await page.evaluate(() => (window as unknown as G).__game.newSlot(1, 'Ada'));
  await expect(page.getByTestId('workshop')).toBeVisible();
  for (const id of ['m-act2-breaker', 'm-burst', 'h-flawless']) await unlock(page, id);
  await press(page, page.getByTestId('tab-trophies'));
  await expect(page.getByTestId('trophy-h-flawless')).toHaveAttribute('data-earned', 'true');
  note(await shapes(page.getByTestId('trophies')), 'shelf');

  expect(Object.keys(seen).sort()).toEqual(['common', 'legendary', 'masterwork', 'rare', 'uncommon']);
  expect(seen.common.visible, 'Common has no mark').toBe(false);
  const shown = ['uncommon', 'rare', 'masterwork', 'legendary'];
  for (const r of shown) expect(seen[r].visible, `${r} mark is visible`).toBe(true);
  expect(new Set(shown.map((r) => seen[r].sig)).size, 'four distinct shapes with color removed').toBe(4);
  expect(errors).toEqual([]);
});

test("the Queen's pick of two: two Legendary cards, no skip, taking one sets the run's Legendary", async ({ page }) => {
  const errors = watchErrors(page);
  await skipFirstLaunch(page);
  await page.goto('/');
  await page.evaluate(() => {
    const gm = (window as unknown as G).__game;
    gm.setSpeed('skip');
    gm.cheat.runFight(['cog-rat']);
    gm.cheat.setPending({ kind: 'legendary', options: ['sprockets-blanket', 'sprockets-whistle'] });
  });
  const screen = page.getByTestId('legendary');
  await expect(screen).toBeVisible();
  await expect(page.locator('[data-testid^="legendary-option-"]')).toHaveCount(2);
  await expect(page.getByTestId('legendary-skip')).toHaveCount(0);
  await expect(page.getByTestId('legendary-option-0')).toContainText(/blanket/i);
  await expect(page.getByTestId('legendary-option-1')).toContainText(/whistle/i);
  await expect(page.getByTestId('legendary-option-0').getByTestId('tier-mark')).toHaveAttribute('data-rarity', 'legendary');
  await noSidewaysScroll(page);
  await press(page, page.getByTestId('legendary-option-1'));
  await expect(screen).toBeHidden();
  const run = await page.evaluate(() => (window as unknown as G).__game.runState());
  expect(run?.legendary).toBe('sprockets-whistle');
  expect(errors).toEqual([]);
});

test("the Queen's core with a single Legendary eligible shows one card to take", async ({ page }) => {
  await skipFirstLaunch(page);
  await page.goto('/');
  await page.evaluate(() => {
    const gm = (window as unknown as G).__game;
    gm.setSpeed('skip');
    gm.cheat.runFight(['cog-rat']);
    gm.cheat.setPending({ kind: 'legendary', options: ['sprockets-blanket'] });
  });
  await expect(page.locator('[data-testid^="legendary-option-"]')).toHaveCount(1);
  await expect(page.getByTestId('legendary-skip')).toHaveCount(0);
  await press(page, page.getByTestId('legendary-option-0'));
  await expect(page.getByTestId('legendary')).toBeHidden();
  expect((await page.evaluate(() => (window as unknown as G).__game.runState()))?.legendary).toBe('sprockets-blanket');
});
