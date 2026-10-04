// The controller: holds the combat, dispatches actions, replays turns on the stage, autosaves.
import { signal } from '@preact/signals';
import { cloneCombat, createCombat, placePart, previewTurn, runTurn, setTarget, swapParts } from '../core/combat';
import type { CreateCombatOpts } from '../core/combat';
import { cell as cellIndex } from '../core/board';
import { ENEMIES } from '../core/content/enemies';
import { PARTS } from '../core/content/parts';
import { GLOSSARY } from '../core/content/glossary';
import type { CombatState, GameEvent, PartInstance, TurnPreview, TurnResult } from '../core/types';
import type { Speed, Stage } from '../render/stage';
import type { StageView } from '../render/replay';
import * as audio from '../audio/synth';
import { intentRows } from './intents';
import { loadPractice, savePractice } from './save';
import { markTutorialDone, tutorialDone } from './prefs';

export type Screen = 'loading' | 'title' | 'combat' | 'practice';

/** Tinker starting bin (docs/content.md) plus Cam, Boiler, Piston and Pendulum, so the practice fight has real choices. */
const PRACTICE_BIN = ['spur', 'spur', 'spur', 'escapement', 'escapement', 'escapement', 'idler', 'coil', 'cam', 'boiler', 'piston', 'pendulum'];
/** Fallback when the B2 enemies are missing: tuned with a greedy bot (about 3 turns) and a random placer. */
const B1_ENEMIES = ['cog-rat', 'rust-mite', 'rust-mite'];
/** B2 default: a Shell-heavy beetle and an imp whose attack grows, so careless building loses. */
const B2_ENEMIES = ['brass-beetle', 'spring-imp'];
const PRACTICE_HP = 50;

export interface Encounter {
  act: number;
  tier: string;
  enemies: string[];
}

// encounters.ts arrives with the content lane; until then this resolves to nothing and the B1 enemies are used.
const encounterModules = import.meta.glob('../core/content/encounters.ts', { eager: true }) as Record<string, { ENCOUNTERS?: Encounter[] }>;

/** Every encounter the sandbox can start: the content lane pools, plus any boss and any enemy not yet covered. */
export function allEncounters(): Encounter[] {
  const mod = Object.values(encounterModules)[0];
  const out: Encounter[] = (mod?.ENCOUNTERS ?? []).filter((e) => e.enemies.every((id) => ENEMIES[id]));
  const covered = new Set(out.flatMap((e) => e.enemies));
  for (const d of Object.values(ENEMIES)) {
    if (d.id === 'dummy' || d.id === 'tutorial-automaton' || covered.has(d.id)) continue;
    out.push({ act: d.act, tier: d.tier, enemies: [d.id] });
  }
  if (!out.some((e) => e.enemies.join() === B1_ENEMIES.join())) out.unshift({ act: 1, tier: 'normal', enemies: B1_ENEMIES });
  if (ENEMIES['dummy']) out.push({ act: 1, tier: 'practice', enemies: ['dummy'] });
  return out;
}

export function defaultEnemies(): string[] {
  return B2_ENEMIES.every((id) => ENEMIES[id]) ? B2_ENEMIES : B1_ENEMIES;
}

/** Every part in the catalog, for the sandbox picker. */
export function catalog(): { id: string; name: string }[] {
  return Object.values(PARTS).map((p) => ({ id: p.id, name: p.name }));
}

/** Preset bins that show off a synergy. A trailing + means upgraded. Act 2 adds upgraded parts, act 3 adds rares too. */
export interface Preset {
  id: string;
  name: string;
  blurb: string;
  base: string[];
  act2: string[];
  act3: string[];
}

export const PRESETS: Preset[] = [
  {
    id: 'mixed',
    name: 'Mixed best-of',
    blurb: 'A bit of everything',
    base: ['spur', 'spur', 'idler', 'lever', 'coil', 'coil', 'boiler', 'piston', 'pendulum', 'escapement', 'escapement', 'chime'],
    act2: ['spur+', 'coil+'],
    act3: ['planetary', 'steam-hammer'],
  },
  {
    id: 'gear-train',
    name: 'Gear train',
    blurb: 'Long chains of gears',
    base: ['spur', 'spur', 'spur', 'idler', 'idler', 'lever', 'bevel', 'crown', 'escapement', 'escapement', 'coil', 'cam'],
    act2: ['spur+', 'bevel+'],
    act3: ['planetary', 'flywheel'],
  },
  {
    id: 'spring-loaded',
    name: 'Spring loaded',
    blurb: 'Charge up, then release',
    base: ['coil', 'coil', 'coil', 'leaf', 'leaf', 'torsion', 'trap', 'recoil', 'trip-hammer', 'spur', 'spur', 'escapement'],
    act2: ['coil+', 'torsion+'],
    act3: ['volute', 'hairspring'],
  },
  {
    id: 'full-steam',
    name: 'Full steam',
    blurb: 'Pressure for big Strikes',
    base: ['boiler', 'boiler', 'boiler', 'piston', 'piston', 'whistle', 'safety-valve', 'firebox', 'spur', 'spur', 'escapement', 'idler'],
    act2: ['piston+', 'boiler+'],
    act3: ['steam-hammer', 'governor'],
  },
  {
    id: 'clockwork-tempo',
    name: 'Clockwork tempo',
    blurb: 'Cams and extra ticks',
    base: ['cam', 'cam', 'triple-cam', 'tappet', 'cam-follower', 'pendulum', 'metronome', 'anchor', 'verge', 'spur', 'spur', 'escapement'],
    act2: ['cam+', 'pendulum+'],
    act3: ['chronometer', 'balance-wheel'],
  },
  {
    id: 'bells',
    name: 'Bells and statuses',
    blurb: 'Chimes that apply statuses',
    base: ['chime', 'chime', 'bell-hammer', 'bell-hammer', 'tuning-fork', 'alarm-clock', 'lamp', 'gong', 'spur', 'spur', 'idler', 'escapement'],
    act2: ['chime+', 'spur+'],
    act3: ['oil-can', 'gong'],
  },
];

/** The part ids of a preset for an act (1 to 3). Parts missing from the catalog are dropped when the fight starts. */
export function presetBin(id: string, act: number): string[] {
  const p = PRESETS.find((x) => x.id === id) ?? PRESETS[0];
  return [...p.base, ...(act >= 2 ? p.act2 : []), ...(act >= 3 ? p.act3 : [])];
}

export type BinSpec = 'tinker' | 'random10' | string[];

export function resolveBin(spec: BinSpec, rnd: () => number = Math.random): string[] {
  const have = (id: string): boolean => Object.values(PARTS).some((p) => p.id === id);
  if (spec === 'tinker') return PRACTICE_BIN.filter(have);
  if (spec === 'random10') {
    const pool = Object.values(PARTS).filter((p) => !p.locked).map((p) => p.id);
    const all = pool.length >= 10 ? pool : Object.values(PARTS).map((p) => p.id);
    const out: string[] = [];
    for (let i = 0; i < 10; i++) out.push(all[Math.floor(rnd() * all.length)]);
    return out;
  }
  return spec.filter((id) => have(id.replace(/\+$/, '')));
}

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
  if (e.kind === 'combatEnd') {
    if (e.note === 'won') audio.victory();
    else audio.defeat();
    return;
  }
  if (sp === 'skip') return;
  if (e.kind === 'pulse') audio.tick(e.step);
  else if (e.kind === 'release') audio.chime();
  else if ((e.kind === 'strike' && (e.amount ?? 0) > 0) || (e.kind === 'playerHit' && (e.amount ?? 0) > 0)) audio.thud();
}

function publish(): void {
  combat.value = live ? cloneCombat(live) : null;
}

function persist(): void {
  if (live && !tutorial.value) void savePractice(live);
}

export function isBusy(): boolean {
  return replaying.value !== null;
}

function clockSeed(): number {
  // The seed comes from the clock only here, in the app layer; core stays pure.
  return (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0;
}

function toBin(ids: string[]): PartInstance[] {
  return ids.map((id, i) => ({ uid: i + 1, defId: id.replace(/\+$/, ''), plus: id.endsWith('+') }));
}

function resetView(): void {
  if (stage?.isPlaying()) stage.setSpeed('skip');
  replaying.value = null;
  view.value = null;
  lastResult.value = null;
  gentle.value = false;
}

/** The default practice fight. */
export function newFight(seed?: number): void {
  startPractice({ enemies: defaultEnemies(), bin: 'tinker', seed });
}

/** The practice sandbox: any enemies, any parts. */
export function startPractice(o: { enemies?: string[]; bin?: BinSpec; seed?: number }): void {
  endTutorial(true);
  resetView();
  const enemies = (o.enemies ?? defaultEnemies()).filter((id) => ENEMIES[id]);
  const ids = resolveBin(o.bin ?? 'tinker');
  const opts: CreateCombatOpts = {
    seed: o.seed ?? clockSeed(),
    bin: toBin(ids.length > 0 ? ids : resolveBin('tinker')),
    enemies: enemies.length > 0 ? enemies : B1_ENEMIES,
    hp: PRACTICE_HP,
    maxHp: PRACTICE_HP,
    kind: 'practice',
  };
  live = createCombat(opts);
  screen.value = 'combat';
  publish();
  persist();
}

// ---------- the guided first fight ----------

export interface TutorialState {
  step: number;
  /** The turn on which the current step began. */
  turn: number;
}
export const tutorial = signal<TutorialState | null>(null);
/** Set after a tutorial turn that would have knocked the player out. */
export const gentle = signal(false);
export const TUTORIAL_LAST = 8;
let stash: CombatState | null = null;

/** Scripted bin: uids 1 to 3 are the first hand, 4 to 6 the second. */
const TUTORIAL_BIN = ['spur', 'spur', 'escapement', 'escapement', 'coil', 'spur', 'spur', 'escapement', 'idler', 'spur'];

export function startTutorial(): void {
  if (!tutorial.value) stash = live && live.outcome === 'ongoing' ? live : stash;
  resetView();
  const enemy = ENEMIES['tutorial-automaton'] ? 'tutorial-automaton' : 'rust-mite';
  // noShuffle is added to createCombat by the content lane; the hands are also forced below so the script holds either way.
  const opts: CreateCombatOpts & { noShuffle?: boolean } = {
    seed: 7,
    bin: toBin(TUTORIAL_BIN),
    enemies: [enemy],
    hp: 40,
    maxHp: 40,
    kind: 'practice',
    noShuffle: true,
  };
  const c = createCombat(opts);
  c.hand = [1, 2, 3];
  c.draw = [10, 9, 8, 7, 6, 5, 4];
  c.discard = [];
  // Tougher than its fight stat, so the guided fight lasts until the Rust intent has been shown (turn 3).
  c.enemies[0].hp = 36;
  c.enemies[0].maxHp = 36;
  live = c;
  tutorial.value = { step: 1, turn: 1 };
  screen.value = 'combat';
  publish();
  advanceTutorial(false);
}

/** Leave the tutorial. `silent` skips going back to the title. */
export function endTutorial(silent = false): void {
  if (!tutorial.value) return;
  tutorial.value = null;
  markTutorialDone();
  gentle.value = false;
  live = stash;
  stash = null;
  if (!silent) {
    combat.value = live ? cloneCombat(live) : null;
    screen.value = 'title';
  }
}

export function tutorialAck(): void {
  const t = tutorial.value;
  if (!t) return;
  if (t.step === 2 || t.step === 4 || t.step === 7) setStep(t.step + 1);
  else if (t.step === TUTORIAL_LAST) endTutorial();
}

function setStep(step: number): void {
  const turn = live?.turn ?? 1;
  tutorial.value = { step, turn };
  advanceTutorial(false);
}

/** Move the tutorial on when the player has done what the current step asked for. */
function advanceTutorial(afterRun: boolean): void {
  const t = tutorial.value;
  if (!t || !live) return;
  const c = live;
  const on = (defId: string): boolean => c.board.some((p) => p?.defId === defId);
  if (c.outcome === 'won' && t.step < TUTORIAL_LAST) return void setStep(TUTORIAL_LAST);
  if (afterRun && c.turn > t.turn && t.step <= 3) return void setStep(4); // they pressed Run early: that is fine
  switch (t.step) {
    case 1:
      if ([0, 6, 10].some((i) => c.board[i]?.defId === 'spur')) setStep(2);
      break;
    case 3:
      if (afterRun) setStep(4);
      break;
    case 5:
      if (on('escapement')) setStep(6);
      break;
    case 6:
      if (afterRun && c.turn > t.turn) setStep(c.enemies.some((e) => e.hp > 0 && e.intent.kind === 'sabotage') ? 7 : TUTORIAL_LAST);
      break;
    default:
      break;
  }
}

/** Test and debug: where the tutorial stands (0 when it is not running). */
export function tutorialStep(): number {
  return tutorial.value?.step ?? 0;
}

export function place(handIndex: number, target: number | string): boolean {
  if (!live || isBusy()) return false;
  const idx = typeof target === 'string' ? cellIndex(target) : target;
  const ok = placePart(live, handIndex, idx);
  if (ok) {
    publish();
    persist();
    advanceTutorial(false);
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
  let gentleRun = false;
  gentle.value = false;
  if (tutorial.value) {
    // The guided fight cannot be lost: if this turn would knock the player out, soak it up and stay at 1 HP.
    const trial = cloneCombat(live);
    runTurn(trial);
    if (trial.outcome === 'lost') {
      gentleRun = true;
      live.plating += 999;
    }
  }
  const result = runTurn(live);
  if (gentleRun) {
    live.plating = 0;
    live.playerHp = 1;
    gentle.value = true;
  }
  const after = cloneCombat(live);
  lastResult.value = result;
  replaying.value = before;
  view.value = null;
  if (stage) await stage.play(result.events, before, after);
  replaying.value = null;
  view.value = null;
  publish();
  persist();
  advanceTutorial(true);
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
  if (tutorial.value) {
    endTutorial();
    return;
  }
  screen.value = 'title';
}

export function openPractice(): void {
  screen.value = 'practice';
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
  } else if (!tutorialDone()) {
    startTutorial(); // the very first launch: a guided fight, skippable
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
    /** The current tutorial step (1 to 8), or 0 when it is not running. */
    tutorial: (): number => tutorialStep(),
    startTutorial: (): void => startTutorial(),
    /** Start a sandbox fight: enemy ids and a bin ('tinker', 'random10' or part ids). */
    practice: (o: { enemies?: string[]; bin?: BinSpec; seed?: number }): void => startPractice(o),
    glossary: (): { term: string; text: string }[] => GLOSSARY.map((e) => ({ term: e.term, text: e.text })),
    intents: (): ReturnType<typeof intentRows> => (live ? intentRows(live) : []),
    /** The text of the tooltip that appears when hovering or focusing the element matching `selector`. */
    tooltip: async (selector: string): Promise<string | null> => {
      const el = document.querySelector(selector);
      if (!el) return null;
      el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
      await new Promise((r) => setTimeout(r, 60));
      const tip = document.querySelector('[data-testid="tooltip"]');
      return tip ? (tip.textContent ?? '') : null;
    },
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
