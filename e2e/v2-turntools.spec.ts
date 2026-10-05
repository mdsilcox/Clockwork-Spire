// B9b acceptance (browser), owner: turn-tools. Desktop (1280x800) and phone (667x375 touch).
// The Inventor's Watch prompt, the Foresight Dial's second intent, a reload keeping the Watch snapshot
// (docs/briefs/B9b-rarity.md "The Inventor's Watch", "Foresight Dial"; docs/content.md 5 and 11).
// CONTRACT test ids and hooks the turn-tools lane implements:
//   watch-prompt      shown when a Run ends in a loss and the Watch is held and unused, BEFORE the fight settles:
//                     buttons `watch-wind-back` and `watch-accept` ("Wind back" / "Accept defeat"); no result and no end screen yet
//   watch-wind-back   also a combat button after any Run (not a loss) while the Watch is held, unused and has a snapshot
//   part-intent2-e{i}-{partId}   the dimmed second-turn chip beside a part's current intent (Foresight Dial); absent without the
//                     trinket; recomputed after a break; its opacity is below 1
//   __game.cheat.giveTrinket(id)  NEW: the run holds the trinket now (added to run.trinkets and to the live combat's trinkets)
//   existing: cheat.runFight, cheat.setHp, cheat.breakPart, setSpeed, run(), state() (the live combat, JSON, incl. watchSnapshot)
// Resolved reading of "Wind back, then Accept defeat on a second loss": test 1 loses and accepts at the prompt; test 2 winds back,
// loses again, and (the Watch being used) gets no prompt: the defeat settles at once.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { noSidewaysScroll, press, skipFirstLaunch, watchErrors } from './helpers';

type S = { turn: number; playerHp: number; outcome: string; watchSnapshot?: unknown; watchUsed?: boolean };
type G = {
  __game: {
    setSpeed(s: string): void;
    run(): Promise<unknown>;
    state(): S | null;
    cheat: { runFight(e: string[]): void; setHp(n: number): void; giveTrinket(id: string): void; breakPart(e: number, p: string): void };
  };
};

async function fight(page: Page, trinket: string, hp?: number): Promise<void> {
  await skipFirstLaunch(page);
  await page.goto('/');
  await page.evaluate(
    ([t, h]) => {
      const gm = (window as unknown as G).__game;
      gm.setSpeed('skip');
      gm.cheat.runFight(['cog-rat']);
      gm.cheat.giveTrinket(t as string);
      if (h !== undefined) gm.cheat.setHp(h as number);
    },
    [trinket, hp] as const,
  );
  await expect(page.getByTestId('hand')).toBeVisible();
}
const run = (page: Page) => page.evaluate(() => (window as unknown as G).__game.run());
const state = (page: Page) => page.evaluate(() => (window as unknown as G).__game.state());

test('the Watch: a lost Run waits for the choice; Accept defeat settles the fight', async ({ page }) => {
  const errors = watchErrors(page);
  await fight(page, 'inventors-watch', 1);
  await run(page);
  await expect(page.getByTestId('watch-prompt')).toBeVisible();
  await expect(page.getByTestId('watch-wind-back')).toBeVisible();
  await expect(page.getByTestId('watch-accept')).toBeVisible();
  await expect(page.getByTestId('result')).toHaveCount(0); // not settled yet
  await expect(page.getByTestId('end-continue')).toHaveCount(0);
  await noSidewaysScroll(page);
  await press(page, page.getByTestId('watch-accept'));
  await expect(page.getByTestId('watch-prompt')).toBeHidden();
  await expect(page.getByTestId('result').or(page.getByTestId('end-continue'))).toBeVisible();
  expect(errors).toEqual([]);
});

test('the Watch: Wind back returns the fight to before the Run; a second loss has no prompt and settles at once', async ({ page }) => {
  const errors = watchErrors(page);
  await fight(page, 'inventors-watch', 1);
  const before = await state(page);
  await run(page);
  await expect(page.getByTestId('watch-prompt')).toBeVisible();
  await press(page, page.getByTestId('watch-wind-back'));
  await expect(page.getByTestId('watch-prompt')).toBeHidden();
  const back = await state(page);
  expect(back?.turn).toBe(before?.turn);
  expect(back?.playerHp).toBe(1);
  expect(back?.outcome).toBe('ongoing');
  expect(back?.watchUsed).toBe(true);
  await run(page); // the same Run, the same loss
  await expect(page.getByTestId('watch-prompt')).toHaveCount(0);
  await expect(page.getByTestId('result').or(page.getByTestId('end-continue'))).toBeVisible();
  expect(errors).toEqual([]);
});

test('the Watch: after a Run that is not a loss, Wind back is offered once; a reload keeps the snapshot', async ({ page }) => {
  const errors = watchErrors(page);
  await fight(page, 'inventors-watch');
  expect((await state(page))?.watchSnapshot).toBeUndefined();
  await run(page);
  expect((await state(page))?.watchSnapshot).toBeTruthy();
  await expect(page.getByTestId('watch-wind-back')).toBeVisible();
  await page.waitForTimeout(400); // the autosave
  await page.reload();
  await expect(page.getByTestId('hand')).toBeVisible();
  expect((await state(page))?.watchSnapshot).toBeTruthy();
  await expect(page.getByTestId('watch-wind-back')).toBeVisible();
  await press(page, page.getByTestId('watch-wind-back'));
  await expect(page.getByTestId('watch-wind-back')).toHaveCount(0); // once per combat
  expect(errors).toEqual([]);
});

test('without the Watch there is no snapshot, no button and no prompt', async ({ page }) => {
  await skipFirstLaunch(page);
  await page.goto('/');
  await page.evaluate(() => {
    const gm = (window as unknown as G).__game;
    gm.setSpeed('skip');
    gm.cheat.runFight(['cog-rat']);
    gm.cheat.setHp(1);
  });
  await run(page);
  await expect(page.getByTestId('watch-prompt')).toHaveCount(0);
  await expect(page.getByTestId('watch-wind-back')).toHaveCount(0);
});

test('Foresight Dial: the second turn shows dimmed beside the current intent, and follows a break', async ({ page }) => {
  const errors = watchErrors(page);
  await skipFirstLaunch(page);
  await page.goto('/');
  await page.evaluate(() => {
    const gm = (window as unknown as G).__game;
    gm.setSpeed('skip');
    gm.cheat.runFight(['cog-rat']);
  });
  await expect(page.getByTestId('part-intent-e0-rat-jaw')).toBeVisible(); // the jaw attacks on odd turns: turn 1
  await expect(page.locator('[data-testid^="part-intent2-"]')).toHaveCount(0); // not without the Dial
  await page.evaluate(() => (window as unknown as G).__game.cheat.giveTrinket('foresight-dial'));
  const second = page.getByTestId('part-intent2-e0-rat-plate'); // the plate shells on even turns: the next-but-one turn is turn 2
  await expect(second).toBeVisible();
  await expect(second).toContainText(/shell/i);
  const opacity = await second.evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(opacity).toBeLessThan(1);
  await expect(page.getByTestId('part-intent-e0-rat-jaw')).toBeVisible();
  await page.evaluate(() => (window as unknown as G).__game.cheat.breakPart(0, 'rat-plate'));
  await expect(page.getByTestId('part-intent2-e0-rat-plate')).toHaveCount(0); // recomputed: a broken part is gone
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});
