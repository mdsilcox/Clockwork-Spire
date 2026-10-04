import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { noSidewaysScroll, press, setIntent, setSpeed, state, tutorialStep, watchErrors } from './helpers';

const card = (page: Page, name: string) => page.getByTestId('hand-card').filter({ hasText: name }).first();

async function waitStep(page: Page, step: number): Promise<void> {
  await expect.poll(() => tutorialStep(page), { timeout: 15_000 }).toBe(step);
}

test('the first launch starts the guided fight, and it can be completed through the real UI', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  // a brand-new profile goes straight into the tutorial
  await expect(page.getByTestId('coach')).toBeVisible();
  await waitStep(page, 1);
  await noSidewaysScroll(page);
  await setSpeed(page, 'skip');

  // 1: a Spur next to the Mainspring
  await press(page, card(page, 'Spur Gear'));
  await press(page, page.getByTestId('cell-B2'));
  await waitStep(page, 2);
  // 2: the preview badges
  await expect(page.getByTestId('badge-B2')).toHaveText('x3');
  await press(page, page.getByTestId('coach-next'));
  await waitStep(page, 3);
  // 3: Run
  await press(page, page.getByTestId('run'));
  await waitStep(page, 4);
  // 4: read the intent
  await expect(page.getByTestId('intent-0')).toBeVisible();
  await press(page, page.getByTestId('coach-next'));
  await waitStep(page, 5);
  // 5: an Escapement for Plating
  await press(page, card(page, 'Escapement'));
  await press(page, page.getByTestId('cell-C2'));
  await waitStep(page, 6);
  // 6: the Coil Spring holds, then releases
  await press(page, card(page, 'Coil Spring'));
  await press(page, page.getByTestId('cell-B1'));
  await expect(page.getByTestId('preview')).toContainText('Plating');
  await press(page, page.getByTestId('run'));
  await expect.poll(async () => [7, 8].includes(await tutorialStep(page)), { timeout: 15_000 }).toBe(true);
  // 7: the Rust intent (when the enemy shows one), then the finish
  if ((await tutorialStep(page)) === 7) {
    await expect(page.locator('.cell.sabo').first()).toBeVisible();
    await press(page, page.getByTestId('coach-next'));
  }
  await waitStep(page, 8);
  await page.evaluate(() => (window as unknown as { __game: { setEnemyHp(n: number): void } }).__game.setEnemyHp(1));
  await press(page, page.getByTestId('run'));
  await expect(page.getByTestId('result')).toBeVisible({ timeout: 10_000 });
  await noSidewaysScroll(page);
  await press(page, page.getByTestId('again')); // "Finish" in the tutorial
  await expect(page.getByTestId('title')).toBeVisible();
  expect(await tutorialStep(page)).toBe(0);

  // finished: a reload goes to the title, not the tutorial
  await page.reload();
  await expect(page.getByTestId('title')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the tutorial can be skipped, and cannot be lost', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await waitStep(page, 1);
  await setSpeed(page, 'skip');
  // an enemy that would flatten the player: HP stays at 1 and the coach is kind about it
  await setIntent(page, 0, { kind: 'attack', amount: 999, label: 'Attack 999' });
  await press(page, page.getByTestId('run'));
  await expect(page.getByTestId('coach-text')).toHaveText('The Spire is gentle today.');
  const s = await state(page);
  expect(s.outcome).toBe('ongoing');
  expect(s.playerHp).toBe(1);
  await expect(page.getByTestId('hp')).toContainText('1/');

  await press(page, page.getByTestId('coach-skip'));
  await expect(page.getByTestId('title')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('title')).toBeVisible();
  // and it can be started again from the title screen
  await press(page, page.getByTestId('tutorial'));
  await waitStep(page, 1);
  expect(errors).toEqual([]);
});
