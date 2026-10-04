// The controller: holds the combat, dispatches actions, replays turns on the stage, autosaves.
import { signal } from '@preact/signals';
import { cloneCombat, createCombat, placePart, previewTurn, runTurn, setTarget, swapParts } from '../core/combat';
import { cell as cellIndex } from '../core/board';
import type { CombatState, GameEvent, PartInstance, TurnPreview, TurnResult } from '../core/types';
import type { Speed, Stage } from '../render/stage';
import type { StageView } from '../render/replay';
import * as audio from '../audio/synth';
import { loadPractice, savePractice } from './save';

export type Screen = 'loading' | 'title' | 'combat';

/** Tinker starting bin (docs/content.md): Spur x3, Escapement x3, Idler, Coil Spring. */
const TINKER_BIN = ['spur', 'spur', 'spur', 'escapement', 'escapement', 'escapement', 'idler', 'coil'];

export const screen = signal<Screen>('loading');
/** A copy of the current combat for rendering. */
export const combat = signal<CombatState | null>(null);
/** While a turn replays: the combat as it was when Run was pressed. */
export const replaying = signal<CombatState | null>(null);
/** While a turn replays: the numbers shown right now. */
export const view = signal<StageView | null>(null);
export const speed = signal<Speed>('1x');
export const lastResult = signal<TurnResult | null>(null);

let live: CombatState | null = null;
let stage: Stage | null = null;

export function attachStage(s: Stage | null): void {
  if (stage && stage !== s) {
    stage.onView = () => {};
    stage.onEvent = () => {};
  }
  stage = s;
  if (!s) return;
  s.setSpeed(speed.value);
  s.onView = (v) => {
    view.value = replaying.value ? { ...v, enemyHp: v.enemyHp.slice(), enemyShell: v.enemyShell.slice() } : null;
  };
  s.onEvent = onEvent;
}

function onEvent(e: GameEvent, sp: Speed): void {
  if (sp === 'skip') return;
  if (e.kind === 'pulse') audio.tick(e.step);
  else if (e.kind === 'release') audio.chime();
  else if ((e.kind === 'strike' && (e.amount ?? 0) > 0) || (e.kind === 'playerHit' && (e.amount ?? 0) > 0)) audio.thud();
}

function publish(): void {
  combat.value = live ? cloneCombat(live) : null;
}

function persist(): void {
  if (live) void savePractice(live);
}

export function isBusy(): boolean {
  return replaying.value !== null;
}

export function newFight(seed?: number): void {
  if (stage?.isPlaying()) stage.setSpeed('skip');
  // The seed comes from the clock only here, in the app layer; core stays pure.
  const s = seed ?? (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0;
  const bin: PartInstance[] = TINKER_BIN.map((defId, i) => ({ uid: i + 1, defId, plus: false }));
  live = createCombat({ seed: s, bin, enemies: ['rust-mite', 'rust-mite'], hp: 50, maxHp: 50, kind: 'practice' });
  replaying.value = null;
  view.value = null;
  lastResult.value = null;
  screen.value = 'combat';
  publish();
  persist();
}

export function place(handIndex: number, target: number | string): boolean {
  if (!live || isBusy()) return false;
  const idx = typeof target === 'string' ? cellIndex(target) : target;
  const ok = placePart(live, handIndex, idx);
  if (ok) {
    publish();
    persist();
  }
  return ok;
}

export function swap(a: number | string, b: number | string): boolean {
  if (!live || isBusy()) return false;
  const ia = typeof a === 'string' ? cellIndex(a) : a;
  const ib = typeof b === 'string' ? cellIndex(b) : b;
  const ok = swapParts(live, ia, ib);
  if (ok) {
    publish();
    persist();
  }
  return ok;
}

export function target(idx: number): void {
  if (!live || isBusy()) return;
  setTarget(live, idx);
  publish();
  persist();
}

export function preview(): TurnPreview | null {
  return live ? previewTurn(live) : null;
}

export async function run(): Promise<TurnResult | null> {
  if (!live || isBusy() || live.outcome !== 'ongoing') return null;
  const before = cloneCombat(live);
  const result = runTurn(live);
  const after = cloneCombat(live);
  lastResult.value = result;
  replaying.value = before;
  view.value = null;
  if (stage) await stage.play(result.events, before, after);
  replaying.value = null;
  view.value = null;
  publish();
  persist();
  return result;
}

export function setSpeed(s: Speed): void {
  speed.value = s;
  stage?.setSpeed(s);
}

export function cycleSpeed(): void {
  setSpeed(speed.value === '1x' ? '2x' : speed.value === '2x' ? 'skip' : '1x');
}

export function goTitle(): void {
  if (stage?.isPlaying()) stage.setSpeed('skip');
  screen.value = 'title';
}

export function resume(): void {
  if (live) screen.value = 'combat';
}

export function hasOngoingFight(): boolean {
  return !!live && live.outcome === 'ongoing';
}

export async function init(): Promise<void> {
  const saved = await loadPractice();
  if (saved) {
    live = saved;
    publish();
    screen.value = 'combat';
  } else {
    screen.value = 'title';
  }
}

/** Test and debug hooks. Not part of the game UI. */
export function installDebug(): void {
  const w = window as unknown as { __game?: unknown };
  w.__game = {
    state: (): CombatState | null => (live ? (JSON.parse(JSON.stringify(live)) as CombatState) : null),
    place: (handIndex: number, cellName: string): boolean => place(handIndex, cellName),
    swap: (a: string, b: string): boolean => swap(a, b),
    run: async (): Promise<TurnResult | null> => run(),
    newFight: (seed?: number): void => newFight(seed),
    setSpeed: (s: Speed): void => setSpeed(s),
    preview: (): TurnPreview | null => preview(),
    busy: (): boolean => isBusy(),
    /** Debug: put extra parts on the board, e.g. { B2: 'coil+' }. Breaks the bin invariant on purpose. */
    debugBoard: (spec: Record<string, string>): void => {
      if (!live) return;
      let n = 1000;
      for (const [name, spec1] of Object.entries(spec)) {
        const plus = spec1.endsWith('+');
        const defId = plus ? spec1.slice(0, -1) : spec1;
        const uid = n++;
        live.parts[uid] = { uid, defId, plus };
        live.board[cellIndex(name)] = { uid, defId, plus, charge: 0, counter: 0, rusted: 0, magnetized: false, firedThisTurn: 0 };
      }
      publish();
    },
    /** Debug: merge fields into an enemy, e.g. a sabotage intent to see its target ring. */
    debugEnemy: (i: number, patch: Partial<CombatState['enemies'][number]>): void => {
      if (!live || !live.enemies[i]) return;
      Object.assign(live.enemies[i], patch);
      publish();
    },
    /** Cheat for tests: set every living enemy to this many HP (at least 1). */
    setEnemyHp: (hp: number): void => {
      if (!live) return;
      for (const e of live.enemies) if (e.hp > 0) e.hp = Math.max(1, Math.min(e.maxHp, hp));
      publish();
      persist();
    },
  };
}
