// B10d acceptance (browser), owner: title lane. Desktop (1280x800) and phone (667x375 touch).
// docs/acceptance.md AR3 (and AR1's budget is a unit test elsewhere); docs/briefs/B10d-front-door.md "Round 2" and "Round 2 additions".
// Written by the orchestrator's test-porter in the B10d.0 contract step. Lanes never weaken an assertion.
// CONTRACT test ids and hooks the title lane implements (src/ui/Title.tsx, a new title.css; every id and behavior the title has
// today stays: `climb`, `continue-run`, `continue`, `open-slots`, `practice`, `tutorial`, `sandbox`, `open-howto`, `open-glossary`,
// `open-settings`, `colorblind`; labels may change):
//   title                 existing root. A fresh profile (no cs.tutorialDone) now lands HERE on boot, not in the tutorial
//   title-art             the painted title (an <img>, canvas or element with a background): visible once loaded, covers at least
//                         90% of the viewport; data-loaded="false" until the image has decoded, then "true"
//   title-heading         the text title ("Clockwork Spire", the existing h1): visible while data-loaded="false" so a delayed image
//                         never leaves a blank screen; it may be visually hidden afterwards (the painting carries the name) but stays in
//                         the DOM for screen readers
//   title-ambience        the animated layer (steam from the chimneys, lamp flicker; a canvas or a set of animated elements) over the
//                         painting; its on-screen pixels change over time (the test samples it)
//   title-tower           an invisible, non-interactive element (pointer-events none, aria-hidden) whose box IS the tower's region on
//                         screen at the current size; no button, input or the banner may intersect it
//   title-banner          the one line "There's a new tutorial for the new Spire." inside the title card; present only while
//                         cs.tutorialDone is set and cs.tutorialV2Seen is not; plain text (not a button or link), outside every
//                         button and the tower's box
//   Buttons: every title button is at least 40 px in both directions (phone included) and inside the viewport; no sideways scroll.
//   Continue: `continue-run` only while a run is in progress (a saved climb), `continue` only while a practice fight is in progress;
//   `climb` otherwise. (The brief's "Continue when a save exists" is the existing continue-run, kept by Round 2.)
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { noSidewaysScroll, press, skipFirstLaunch, watchErrors } from './helpers';

type G = { __game: { newSlot(n: 1 | 2 | 3, name: string): Promise<boolean>; climb(chassis: string): boolean; setSpeed(s: string): void } };
const g = <T,>(page: Page, expr: string): Promise<T> => page.evaluate((e) => new Function('g', `return (async () => (${e}))()`)((window as unknown as G).__game), expr) as Promise<T>;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** The title for a profile that finished a tutorial (the 21 specs' path): cs.tutorialDone set. */
async function title(page: Page, url = '/'): Promise<void> {
  await skipFirstLaunch(page);
  await page.goto(url);
  await expect(page.getByTestId('title')).toBeVisible();
}
const BUTTONS = '[data-testid="title"] button';
async function buttonBoxes(page: Page): Promise<{ id: string; box: Box }[]> {
  const out: { id: string; box: Box }[] = [];
  const all = page.locator(BUTTONS);
  for (let i = 0; i < (await all.count()); i++) {
    const b = all.nth(i);
    if (!(await b.isVisible())) continue;
    const box = await b.boundingBox();
    if (box) out.push({ id: (await b.getAttribute('data-testid')) ?? `button ${i}`, box });
  }
  return out;
}
const boxOf = async (l: Locator): Promise<Box> => {
  const b = await l.boundingBox();
  expect(b, 'has a box').toBeTruthy();
  return b as Box;
};

test('AR3: a fresh profile boots to the painted title, not the tutorial; the painting is loaded and fills the screen', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/'); // nothing set: the first launch
  await expect(page.getByTestId('title')).toBeVisible();
  await expect(page.getByTestId('coach')).toHaveCount(0);
  await expect(page.getByTestId('title-art')).toHaveAttribute('data-loaded', 'true', { timeout: 15_000 });
  await expect(page.getByTestId('title-art')).toBeVisible();
  const vp = page.viewportSize() ?? { width: 1280, height: 800 };
  const art = await boxOf(page.getByTestId('title-art'));
  expect(art.width).toBeGreaterThanOrEqual(vp.width * 0.9);
  expect(art.height).toBeGreaterThanOrEqual(vp.height * 0.9);
  await expect(page.getByTestId('climb')).toBeVisible();
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('AR3: the steam and the lamps move: the ambience region changes pixels over time', async ({ page }) => {
  await title(page);
  await expect(page.getByTestId('title-art')).toHaveAttribute('data-loaded', 'true', { timeout: 15_000 });
  const amb = page.getByTestId('title-ambience');
  await expect(amb).toBeVisible();
  const clip = await boxOf(amb);
  const shots: Buffer[] = [];
  for (let i = 0; i < 5; i++) {
    shots.push(await page.screenshot({ clip }));
    await page.waitForTimeout(450);
  }
  const distinct = new Set(shots.map((s) => s.toString('base64'))).size;
  expect(distinct, 'at least two different frames in about two seconds').toBeGreaterThanOrEqual(2);
});

test('AR3: the buttons never cover the tower, are 40 px, and stay on screen', async ({ page }) => {
  await title(page);
  await expect(page.getByTestId('title-art')).toHaveAttribute('data-loaded', 'true', { timeout: 15_000 });
  const tower = await boxOf(page.getByTestId('title-tower'));
  const vp = page.viewportSize() ?? { width: 1280, height: 800 };
  expect(tower.width).toBeGreaterThan(20);
  expect(tower.height).toBeGreaterThan(20);
  expect(await page.getByTestId('title-tower').evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
  const boxes = await buttonBoxes(page);
  expect(boxes.length).toBeGreaterThanOrEqual(8);
  for (const { id, box } of boxes) {
    expect(overlaps(box, tower), `${id} stays off the tower`).toBe(false);
    expect(box.width >= 39.5 && box.height >= 39.5, `${id} is a 40 px target (${Math.round(box.width)}x${Math.round(box.height)})`).toBe(true);
    expect(box.x >= -0.5 && box.y >= -0.5 && box.x + box.width <= vp.width + 0.5 && box.y + box.height <= vp.height + 0.5, `${id} is on screen`).toBe(true);
  }
  await noSidewaysScroll(page);
});

test('AR3: the same holds with a run and a practice fight in progress (Continue buttons added, still off the tower)', async ({ page }) => {
  await title(page);
  await g(page, 'g.newSlot(1, "Ada")');
  await g(page, 'g.setSpeed("skip")');
  await g(page, 'g.climb("tinker")');
  await press(page, page.getByTestId('run-menu'));
  await press(page, page.getByTestId('run-to-title'));
  await expect(page.getByTestId('title')).toBeVisible();
  await expect(page.getByTestId('continue-run')).toBeVisible();
  await expect(page.getByTestId('climb')).toHaveCount(0);
  const tower = await boxOf(page.getByTestId('title-tower'));
  for (const { id, box } of await buttonBoxes(page)) expect(overlaps(box, tower), `${id} stays off the tower`).toBe(false);
  await press(page, page.getByTestId('continue-run'));
  await expect(page.getByTestId('act-screen')).toBeVisible();
});

test('AR3: Continue appears only when something is in progress', async ({ page }) => {
  await title(page);
  await expect(page.getByTestId('continue-run')).toHaveCount(0);
  await expect(page.getByTestId('continue')).toHaveCount(0);
  await expect(page.getByTestId('climb')).toBeVisible();
  await press(page, page.getByTestId('practice'));
  await expect(page.getByTestId('combat')).toBeVisible();
  await press(page, page.getByTestId('menu'));
  await press(page, page.getByTestId('menu-title'));
  await expect(page.getByTestId('title')).toBeVisible();
  await expect(page.getByTestId('continue')).toBeVisible();
});

test('every existing title id is present', async ({ page }) => {
  const errors = watchErrors(page);
  await title(page);
  for (const id of ['climb', 'open-slots', 'practice', 'tutorial', 'sandbox', 'open-howto', 'open-glossary', 'open-settings', 'colorblind']) await expect(page.getByTestId(id), id).toBeVisible();
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

// each one in a fresh page (a practice fight autosaves and would change the next boot)
const GOES: [string, string][] = [
  ['climb', 'slots'], // no save yet: the slot screen (name prompt) as today
  ['open-slots', 'slots'],
  ['practice', 'combat'],
  ['sandbox', 'practice-picker'],
  ['open-howto', 'howto'],
  ['open-glossary', 'glossary'],
  ['open-settings', 'settings'],
  ['tutorial', 'coach'],
];
for (const [id, lands] of GOES) {
  test(`title id ${id} still opens ${lands}`, async ({ page }) => {
    await title(page);
    await press(page, page.getByTestId(id));
    await expect(page.getByTestId(lands)).toBeVisible();
    await noSidewaysScroll(page);
  });
}

test('title id colorblind still toggles the preference', async ({ page }) => {
  await title(page);
  await page.getByTestId('colorblind').check();
  expect(await page.evaluate(() => window.localStorage.getItem('cs.colorBlind'))).toBe('1');
});

test('AR3: while the painting is delayed the text title shows with the same buttons; then the painting arrives and the buttons are the same DOM', async ({ page }) => {
  await skipFirstLaunch(page);
  await page.route('**/art/title/**', async (route) => {
    await new Promise((r) => setTimeout(r, 3500));
    await route.continue();
  });
  await page.goto('/');
  await expect(page.getByTestId('title')).toBeVisible();
  await expect(page.getByTestId('title-art')).toHaveAttribute('data-loaded', 'false');
  await expect(page.getByTestId('title-heading')).toBeVisible();
  await expect(page.getByTestId('title-heading')).toContainText('Clockwork Spire');
  const early = (await buttonBoxes(page)).map((b) => b.id);
  expect(early).toEqual(expect.arrayContaining(['climb', 'open-slots', 'practice', 'tutorial', 'sandbox', 'open-howto', 'open-glossary', 'open-settings']));
  await press(page, page.getByTestId('open-howto')); // usable at once
  await expect(page.getByTestId('howto')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('title-art')).toHaveAttribute('data-loaded', 'true', { timeout: 20_000 });
  const late = (await buttonBoxes(page)).map((b) => b.id);
  expect(late).toEqual(early);
  await noSidewaysScroll(page);
});

test('the v1-done banner: only with cs.tutorialDone set and cs.tutorialV2Seen unset; plain text outside the buttons and the tower', async ({ page }) => {
  // set: shown
  await title(page);
  const banner = page.getByTestId('title-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toHaveText("There's a new tutorial for the new Spire.");
  expect(['BUTTON', 'A', 'INPUT']).not.toContain(await banner.evaluate((el) => el.tagName));
  expect(await banner.evaluate((el) => !el.closest('button, a, [role="button"]'))).toBe(true);
  const b = await boxOf(banner);
  const tower = await boxOf(page.getByTestId('title-tower'));
  expect(overlaps(b, tower), 'the banner is off the tower').toBe(false);
  for (const { id, box } of await buttonBoxes(page)) expect(overlaps(b, box), `the banner is off ${id}`).toBe(false);
  const vp = page.viewportSize() ?? { width: 1280, height: 800 };
  expect(b.x >= -0.5 && b.x + b.width <= vp.width + 0.5 && b.y >= -0.5 && b.y + b.height <= vp.height + 0.5, 'and on screen').toBe(true);
  await noSidewaysScroll(page);
  // starting the new tutorial marks it seen (and skipping does too)
  await press(page, page.getByTestId('tutorial'));
  await expect(page.getByTestId('coach')).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('cs.tutorialV2Seen'))).toBe('1');
  await page.goto('/');
  await expect(page.getByTestId('title')).toBeVisible();
  await expect(page.getByTestId('title-banner')).toHaveCount(0);
});

test('the v1-done banner is absent on a fresh profile and when both keys are set', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('title')).toBeVisible();
  await expect(page.getByTestId('title-banner')).toHaveCount(0); // nothing set: first launch
  await page.evaluate(() => {
    window.localStorage.setItem('cs.tutorialDone', '1');
    window.localStorage.setItem('cs.tutorialV2Seen', '1');
  });
  await page.reload();
  await expect(page.getByTestId('title')).toBeVisible();
  await expect(page.getByTestId('title-banner')).toHaveCount(0);
});
