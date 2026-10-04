// Shared helpers for the B2 UI specs.
import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export interface GameState {
  turn: number;
  hand: number[];
  parts: Record<string, { defId: string }>;
  board: ({ defId: string } | null)[];
  enemies: { hp: number; maxHp: number; intent: { kind: string; target?: number } }[];
  outcome: string;
  playerHp: number;
  plating: number;
}

export interface Game {
  state(): GameState;
  tutorial(): number;
  startTutorial(): void;
  practice(o: { enemies?: string[]; bin?: string | string[]; seed?: number }): void;
  glossary(): { term: string; text: string }[];
  intents(): { kind: string; label: string; target: string | null; targets: string[] }[];
  tooltip(selector: string): Promise<string | null>;
  setSpeed(s: string): void;
  setEnemyHp(hp: number): void;
  debugEnemy(i: number, patch: Record<string, unknown>): void;
  run(): Promise<unknown>;
  busy(): boolean;
}

type W = { __game: Game };
export const state = (page: Page): Promise<GameState> => page.evaluate(() => (window as unknown as W).__game.state());
export const tutorialStep = (page: Page): Promise<number> => page.evaluate(() => (window as unknown as W).__game.tutorial());
export const setSpeed = (page: Page, s: string): Promise<void> => page.evaluate((v) => (window as unknown as W).__game.setSpeed(v), s);
export const practice = (page: Page, o: { enemies?: string[]; bin?: string | string[]; seed?: number }): Promise<void> =>
  page.evaluate((v) => (window as unknown as W).__game.practice(v), o);
export const setIntent = (page: Page, i: number, intent: Record<string, unknown>): Promise<void> =>
  page.evaluate(([n, it]) => (window as unknown as W).__game.debugEnemy(n as number, { intent: it as never }), [i, intent] as const);

/** The dev server's hot-reload socket may log a refused connection under load; the game itself opens no sockets. */
export const VITE_HMR_NOISE = /\[vite\]|WebSocket connection to 'ws:/;

export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !VITE_HMR_NOISE.test(m.text())) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

/** The very first launch starts the tutorial; specs that want the title screen mark it done first. */
export async function skipFirstLaunch(page: Page): Promise<void> {
  await page.addInitScript(() => window.localStorage.setItem('cs.tutorialDone', '1'));
}

export async function noSidewaysScroll(page: Page): Promise<void> {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(sw).toBeLessThanOrEqual(cw);
}

/** Tap on the phone project, click on desktop. */
export async function press(page: Page, loc: Locator): Promise<void> {
  const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  if (touch) await loc.tap();
  else await loc.click();
}

export async function isTouch(page: Page): Promise<boolean> {
  return page.evaluate(() => navigator.maxTouchPoints > 0);
}

/** Show the tooltip of `loc` the way the device does it: hover with a mouse, a 400 ms press on touch. */
export async function showTip(page: Page, loc: Locator): Promise<void> {
  if (await isTouch(page)) {
    await loc.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 7, bubbles: true });
    await page.waitForTimeout(520);
    await loc.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 7, bubbles: true });
  } else {
    await page.mouse.move(2, 2); // leave whatever was hovered, so the pointer enters again
    await loc.hover();
  }
}
