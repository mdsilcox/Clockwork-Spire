// B9a acceptance (browser): the archivist's note names the Clockmaker's memory part (docs/acceptance.md WP6 (E); brief "The
// archivist's note"). Desktop and phone.
// B9a CONTRACT test id and hook:
//   archivist-line   one line in the archivist's Clockmaker's note tab (moved there by B10a), e.g.
//                    "The archivist says: he remembers your Plating. He has a drill now." Absent (no element) with no history.
//   __game.cheat.setPlanHistory(plans: ('plating'|'burst'|'pressure'|'statuses')[]): NEW. Sets the active profile's
//        planHistory, saves, and re-renders the Workshop.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { noSidewaysScroll, openPlace, press, skipFirstLaunch, watchErrors } from './helpers';

type G = { __game: { newSlot(n: 1 | 2 | 3, name: string): Promise<boolean>; cheat: { setPlanHistory(p: string[]): void } } };

async function workshop(page: Page): Promise<void> {
  await skipFirstLaunch(page);
  await page.goto('/');
  await page.evaluate(() => (window as unknown as G).__game.newSlot(1, 'Ada'));
  await expect(page.getByTestId('bellfoot')).toBeVisible();
  // the archivist's line lives on his desk, in the Clockmaker's note tab (B10a)
  await openPlace(page, 'archivist');
  await press(page, page.getByTestId('archivist-tab-note'));
}
const setHistory = (page: Page, h: string[]) => page.evaluate((x) => (window as unknown as G).__game.cheat.setPlanHistory(x), h);

test('WP6: with Plating, Plating, burst the note tab says he remembers Plating and has a drill', async ({ page }) => {
  const errors = watchErrors(page);
  await workshop(page);
  await setHistory(page, ['plating', 'plating', 'burst']);
  const line = page.getByTestId('archivist-line');
  await expect(line).toBeVisible();
  await expect(line).toContainText('The archivist says');
  await expect(line).toContainText(/remembers your Plating/i);
  await expect(line).toContainText(/drill/i);
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('WP6: the line follows the last three runs, and with no history there is no line', async ({ page }) => {
  await workshop(page);
  await expect(page.getByTestId('archivist-line')).toHaveCount(0);
  await setHistory(page, ['burst', 'pressure', 'pressure']);
  await expect(page.getByTestId('archivist-line')).toContainText(/pressure/i);
  await setHistory(page, []);
  await expect(page.getByTestId('archivist-line')).toHaveCount(0);
});
