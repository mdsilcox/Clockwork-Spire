// The controller: holds the combat, dispatches actions, replays turns on the stage, autosaves.
import { effect, signal } from '@preact/signals';
import { cloneCombat, createCombat, placePart, previewTurn, runTurn, setTarget, swapParts, swapWithHand, windBack } from '../core/combat';
import type { CreateCombatOpts } from '../core/combat';
import { cell as cellIndex } from '../core/board';
import { ENEMIES } from '../core/content/enemies';
import { PARTS } from '../core/content/parts';
import { GLOSSARY } from '../core/content/glossary';
import type { CombatState, GameEvent, PartInstance, PartIntent, RunState, SalvageItem, TargetRef, TurnPreview, TurnResult } from '../core/types';
import { frontOf, setOrder, toggleTarget as toggleOrder } from '../core/frames';
import { breakPartState } from '../core/enemy';
import { takeSalvage } from '../core/salvage';
import * as core from '../core/run';
import * as sect from '../core/section';
import * as rooms from '../core/rooms';
import { SAVE_VERSION } from '../core/migrate';
import { earnAchievement } from '../core/achievements';
import { ACHIEVEMENTS } from '../core/content/achievements';
import { LANDMARK_BY_ID } from '../core/content/landmarks';
import { RESIDENT_BY_ID } from '../core/content/residents';
import { sectionFixture } from '../core/testkit';
import { townPlaces } from '../ui/town';
import { generateActMap } from '../core/map';
import { partName } from '../core/content/parts';
import { enemyDef } from '../core/content/enemies';
import { actionLabel, listIntentKind } from '../core/framelib';
import { memoryPlan } from '../core/record';
import type { Speed, Stage } from '../render/stage';
import { sharedRigHub } from '../render/rig';
import type { StageView } from '../render/replay';
import * as audio from '../audio/synth';
import { intentRows } from './intents';
import { clearRun, loadPractice, loadRun, loadSettings, readSlot, removeSlot, savePractice, saveRun, saveSettings, writeSlot } from './save';
import type { SlotNo } from './save';
import * as meta from '../core/meta';
import { runAutoplay } from './autoplay';
import { crashNow } from './ErrorBoundary';
import type { AutoOpts, AutoResult } from './autoplay';
import { audioDebug, music, trackFor } from '../audio/music';
import type { TrackId } from '../audio/music';
import type { Plan, Profile, RunRecord, Settings, SprocketMood } from '../core/types';
import type { SprocketPose } from '../ui/Sprocket';
import { colorBlind } from './prefs';
import { markTutorialDone, tutorialDone, setColorBlind } from './prefs';

export type Screen = 'loading' | 'title' | 'combat' | 'practice' | 'run' | 'slots' | 'bellfoot';

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
  s.reducedEffects = settings.value.reducedEffects;
  s.onView = (v) => {
    view.value = replaying.value ? { ...v, enemyHp: v.enemyHp.slice(), enemyShell: v.enemyShell.slice(), partHp: { ...v.partHp }, partBroken: { ...v.partBroken } } : null;
  };
  s.onEvent = onEvent;
}

/** Sound is best effort: an audio exception never reaches the game. */
function safely(fn: () => void): void {
  try {
    fn();
  } catch {
    /* no sound is better than a broken turn */
  }
}

/** B9a: the warden's phase action, shown on its core chip from the phase beat until the replay ends (the replayed state is still the one before the phase). */
export const phaseIntent = signal<{ enemy: number; intent: PartIntent } | null>(null);

function onEvent(e: GameEvent, sp: Speed): void {
  if (e.kind === 'combatEnd') {
    safely(() => (e.note === 'won' ? audio.victory() : audio.defeat()));
    return;
  }
  if (e.kind === 'sabotage' && e.note === 'jam') {
    const who = e.target !== undefined && live?.enemies[e.target] ? enemyDef(live.enemies[e.target].defId).name : 'The enemy';
    showBanner(`${who} jammed your Mainspring: ${live?.ticksThisTurn ?? 2} ticks next turn.`, 'rewind');
  } else if (e.kind === 'phase') {
    showBanner(e.note ?? 'He changes.', 'phase');
    const defId = e.target !== undefined ? live?.enemies[e.target]?.defId : undefined;
    const act = defId && e.amount !== undefined ? enemyDef(defId).frame?.phases?.[e.amount]?.action : null;
    phaseIntent.value = act && e.target !== undefined ? { enemy: e.target, intent: { partId: 'core', actions: [act], kind: listIntentKind([act]), label: actionLabel(act) } } : null;
  }
  else if (e.kind === 'rewind') {
    const inst = e.uid !== undefined ? replaying.value?.parts[e.uid] : undefined;
    showBanner(inst ? `The Clockmaker rewinds your ${partName(inst.defId, inst.plus)}.` : 'The Clockmaker rewinds a part.', 'rewind');
  }
  if (sp === 'skip') return;
  if (e.kind === 'pulse') safely(() => audio.tick(e.step));
  else if (e.kind === 'release') safely(() => audio.chime());
  else if ((e.kind === 'strike' && (e.amount ?? 0) > 0) || (e.kind === 'playerHit' && (e.amount ?? 0) > 0)) safely(() => audio.thud());
}

function publish(): void {
  combat.value = live ? cloneCombat(live) : null;
}

function persist(): void {
  if (liveRun && screen.value === 'run') {
    saveActive();
    return;
  }
  if (live && !tutorial.value) void savePractice(live);
}

// ---------- the run ----------

/** A copy of the run for rendering. */
export const runView = signal<RunState | null>(null);
/** Bumps whenever a new node screen opens, so the UI can drop stale tooltips and remount. */
export const nodeKey = signal(0);
/** A caption over the stage: a boss phase line or a Rewind. */
export const banner = signal<{ text: string; kind: 'phase' | 'rewind'; n: number } | null>(null);
/** The boss intro card, shown before the first turn of a boss fight. */
export const bossIntro = signal<{ name: string; act: number; line: string } | null>(null);

let liveRun: RunState | null = null;
let practiceStash: CombatState | null = null;
let bannerTimer = 0;
let bannerN = 0;

function showBanner(text: string, kind: 'phase' | 'rewind'): void {
  window.clearTimeout(bannerTimer);
  banner.value = { text, kind, n: ++bannerN };
  bannerTimer = window.setTimeout(() => (banner.value = null), 3200);
}

export function hasRun(): boolean {
  return !!liveRun;
}

/** A run is in progress in the active slot (not yet at its result screen). */
export function climbing(): boolean {
  return !!liveRun && !runFinished();
}

export function runFinished(): boolean {
  return !!liveRun && (liveRun.phase === 'victory' || liveRun.phase === 'defeat');
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

const BOSS_LINES: Record<string, string> = {
  foreman: 'He has counted every cog in the Gearworks. He wants yours.',
  boilermaker: 'Steam rolls off her in waves. Mind the gauge.',
  clockmaker: 'He remembers your last turn. He will take it back.',
};

function maybeBossIntro(): void {
  const c = liveRun?.combat;
  if (!liveRun || liveRun.phase !== 'combat' || !c || c.turn > 1) return;
  const boss = c.enemies.find((e) => {
    try {
      return enemyDef(e.defId).tier === 'boss';
    } catch {
      return false;
    }
  });
  if (!boss) return;
  const def = enemyDef(boss.defId);
  const line = liveRun.overwound
    ? `Midnight strikes. ${def.name} comes for you, Overwound: Strength 3 and Shell 10 to start.`
    : (BOSS_LINES[def.id] ?? 'The way up is blocked.');
  bossIntro.value = { name: def.name, act: liveRun.act, line };
}

/** After any change to the run: show it, keep the combat in step, and save. */
function afterRun(newScreen = false): void {
  if (!liveRun) return;
  settleEnd();
  if (liveRun.phase !== 'section') doorPrompt.value = null;
  const wasCombat = live !== null && live === liveRun.combat;
  live = liveRun.phase === 'combat' ? liveRun.combat : null;
  runView.value = clone(liveRun);
  publish();
  if (newScreen || (!wasCombat && live)) {
    resetView();
    banner.value = null;
    nodeKey.value += 1;
  }
  if (newScreen && live) maybeBossIntro();
  screen.value = 'run';
  saveActive();
}

function runAction<T>(fn: (r: RunState) => T): T | undefined {
  if (!liveRun || isBusy()) return undefined;
  const before = `${liveRun.phase}|${liveRun.nodeId}|${liveRun.act}`;
  const out = fn(liveRun);
  afterRun(`${liveRun.phase}|${liveRun.nodeId}|${liveRun.act}` !== before);
  return out;
}

/** Start a run from the Workshop (or a test hook). With a slot, the profile shapes the run; without one, defaults. */
export function newRun(seed?: number, chassis = 'tinker'): void {
  if (!liveRun) practiceStash = live;
  if (stage?.isPlaying()) stage.setSpeed('skip');
  endTutorial(true);
  const sd = seed ?? clockSeed();
  let cfg;
  try {
    cfg = active ? meta.runConfigFor(active.profile, sd, chassis) : core.defaultRunConfig(sd, chassis);
  } catch {
    cfg = core.defaultRunConfig(sd, chassis);
  }
  liveRun = core.newRun(cfg);
  settledFor = null;
  endSummary.value = null;
  bossIntro.value = null;
  afterRun(true);
}

export function continueRun(): void {
  if (!liveRun) return;
  if (!(live && live === liveRun.combat)) practiceStash = practiceStash ?? live;
  afterRun(true);
}

/** Leave the run screens for the title; the run stays saved. */
export function runToTitle(): void {
  if (stage?.isPlaying()) stage.setSpeed('skip');
  live = practiceStash;
  publish();
  screen.value = 'title';
}

/** Give the run up: it ends as a defeat, is settled like one, and the result screen follows. */
export function abandonClimb(): void {
  if (!liveRun) return;
  core.abandonRun(liveRun);
  afterRun(true);
}

/** Close the result screen: on to the Workshop (or the title when there is no slot). */
export function leaveResult(): void {
  const mood = endSummary.value?.mood ?? null;
  const sum = endSummary.value;
  const moment = sum?.firstWin
    ? { title: 'First victory', text: 'The Clockmaker stopped, and the whole Workshop felt it.' }
    : sum?.newBest
      ? { title: 'New best', text: `You climbed to floor ${active?.profile.bestFloor ?? ''}, higher than ever before.` }
      : undefined;
  news.value = sum && (sum.newUnlocks.length > 0 || sum.newNotes.length > 0 || moment) ? { unlocks: sum.newUnlocks, notes: sum.newNotes, moment } : null;
  liveRun = null;
  settledFor = null;
  runView.value = null;
  endSummary.value = null;
  bossIntro.value = null;
  live = practiceStash;
  practiceStash = null;
  publish();
  if (active) {
    screen.value = 'bellfoot';
    greet(moment && mood === 'comfort' ? 'happy' : mood);
    if (profileView.value === null) profileView.value = clone(active.profile);
  } else {
    void clearRun();
    screen.value = 'title';
  }
}

/** Test and old callers: the B3 name for leaving a finished run. */
export function dropRun(abandon = false): void {
  if (abandon) abandonClimb();
  else leaveResult();
}

// ---------- save slots, the profile and the Workshop (B4) ----------

export interface SlotCard {
  n: SlotNo;
  state: 'empty' | 'ok' | 'corrupt';
  name?: string;
  wins?: number;
  bestFloor?: number;
  runs?: number;
  updatedAt?: string;
  climbing?: boolean;
}

export interface EndSummary {
  record: Omit<RunRecord, 'n' | 'endedAt'> & { n?: number; endedAt?: string };
  mood: SprocketMood | null;
  brass: number;
  newUnlocks: string[];
  /** A floor deeper than any climb before (not the very first run). */
  newBest?: boolean;
  firstWin?: boolean;
  newNotes: string[];
  won: boolean;
}

export const slotCards = signal<SlotCard[] | null>(null);
/** The profile of the active slot, copied for rendering. */
export const profileView = signal<Profile | null>(null);
export const slotNo = signal<SlotNo | null>(null);
export const endSummary = signal<EndSummary | null>(null);
/** What Sprocket is doing in the Workshop right now. */
export const pose = signal<SprocketPose>('idle');
export const idleShift = signal(0);
/** What changed after the last run: new chassis and notes, shown once in the Workshop. */
export const news = signal<{ unlocks: string[]; notes: string[]; moment?: { title: string; text: string } } | null>(null);

let active: { n: SlotNo; profile: Profile } | null = null;
let settledFor: RunState | null = null;
let lastActive = Date.now();
let greetTimer = 0;
const SLEEP_AFTER = 20_000;

/** Sprocket's greeting after a run, then back to idle after a while. */
export function greet(mood: SprocketMood | null): void {
  window.clearTimeout(greetTimer);
  lastActive = Date.now();
  idleShift.value = 0;
  if (!mood) {
    pose.value = 'idle';
    return;
  }
  pose.value = mood;
  greetTimer = window.setTimeout(() => {
    if (pose.value === mood) pose.value = 'idle';
  }, 9000);
}

/** Any touch in the Workshop: Sprocket wakes up. */
export function poke(): void {
  lastActive = Date.now();
  idleShift.value = 0;
  if (pose.value === 'sleepy') pose.value = 'idle';
}

// ---------- Bellfoot (B10a): where the tinker stands in the street, the open place, collars, Oil Flasks ----------

/** The place the tinker stands at (or is heading to) in Bellfoot. */
export const townPlace = signal<string>('gate');
/** The place whose panel is open over the street, or null. */
export const openPlaceId = signal<string | null>(null);
/** Bumped when something other than a walk moves the tinker (the town menu): the street jumps to townPlace. */
export const townJump = signal(0);

/** Sprocket's collar: one of the earned ones (content/collars.ts), or none. Kept in the profile and saved. */
export function setCollar(id: string | null): void {
  if (!active) return;
  active.profile.collar = id;
  saveActive();
}

/** Drink an Oil Flask on the climb screen: heal 15 HP, no hour. */
export const useOilFlask = (): boolean => runAction((r) => (r.phase === 'section' ? rooms.useOilFlask(r) : false)) ?? false;

export function petSprocket(): void {
  if (active) {
    // the e-pet counter (content.md 7); the achievement itself lands when a run ends
    active.profile.achievementProgress.pets = (active.profile.achievementProgress.pets ?? 0) + 1;
    saveActive();
  }
  window.clearTimeout(greetTimer);
  lastActive = Date.now();
  idleShift.value = 0;
  pose.value = 'pet';
  // the bark and the wiggle are Sprocket's own (the component plays them when he is tapped)
  greetTimer = window.setTimeout(() => {
    if (pose.value === 'pet') pose.value = 'idle';
  }, 1400);
}

/** Called about once a second by the Workshop: idle for 20 s means sleepy. */
export function checkSleepy(): void {
  if (screen.value !== 'bellfoot') return;
  if (pose.value === 'idle' && Date.now() + idleShift.value - lastActive >= SLEEP_AFTER) pose.value = 'sleepy';
}

/** The trophy shelf's data (B9b): every achievement with its earned time and availability, and the rewards recorded so far. */
export function trophyShelf(): { achievements: { id: string; earned: string | null; available: boolean }[]; rewards: Profile['rewards']; progress: Record<string, number> } {
  const p = active?.profile;
  return {
    achievements: ACHIEVEMENTS.map((a) => ({ id: a.id, earned: p?.achievements[a.id] ?? null, available: a.available })),
    rewards: clone(p?.rewards ?? { journal: [], collars: [], landmarks: [], overwind: 0, chassis: [] }),
    progress: clone(p?.achievementProgress ?? {}),
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function saveActive(): void {
  if (!active) {
    if (liveRun) void saveRun(liveRun);
    return;
  }
  profileView.value = clone(active.profile);
  const terminal = !!liveRun && (liveRun.phase === 'victory' || liveRun.phase === 'defeat');
  // one write: the profile (already settled when the run ended) and the run in progress, or none
  void writeSlot({ slot: active.n, version: SAVE_VERSION, profile: active.profile, run: terminal ? null : liveRun, updatedAt: nowIso() });
}

/** A run reached victory or defeat: settle it into the profile once, before any result screen or celebration. */
function settleEnd(): void {
  if (!liveRun || (liveRun.phase !== 'victory' && liveRun.phase !== 'defeat') || settledFor === liveRun) return;
  settledFor = liveRun;
  const won = liveRun.phase === 'victory';
  if (active) {
    try {
      const bestBefore = active.profile.bestFloor;
      const winsBefore = active.profile.wins;
      const out = meta.finishRun(active.profile, liveRun, nowIso());
      endSummary.value = {
        record: out.record,
        mood: out.mood,
        brass: out.brass,
        newUnlocks: out.newUnlocks,
        newNotes: out.newNotes,
        won,
        newBest: bestBefore > 0 && active.profile.bestFloor > bestBefore,
        firstWin: won && winsBefore === 0,
      };
      return;
    } catch {
      /* fall through to the plain summary */
    }
  }
  let rec: EndSummary['record'];
  try {
    rec = core.runRecord(liveRun);
  } catch {
    rec = { seed: liveRun.config.seed, chassis: liveRun.config.chassis, result: won ? 'win' : 'loss', act: liveRun.act, floor: liveRun.floor, brassEarned: 0, blueprintsFound: [], partsAtEnd: [], trinkets: [], turns: 0, biggestTurn: 0 };
  }
  let brass = 0;
  try {
    brass = core.brassFor(liveRun);
  } catch {
    brass = 0;
  }
  endSummary.value = { record: rec, mood: won ? 'celebrate' : 'comfort', brass, newUnlocks: [], newNotes: [], won };
}

function enterSlot(n: SlotNo, profile: Profile, run: RunState | null): void {
  active = { n, profile };
  slotNo.value = n;
  profileView.value = clone(profile);
  liveRun = run;
  settledFor = null;
  try {
    window.localStorage.setItem('cs.lastSlot', String(n));
  } catch {
    /* fine */
  }
}

export async function refreshSlots(): Promise<SlotCard[]> {
  const out: SlotCard[] = [];
  for (const n of [1, 2, 3] as SlotNo[]) {
    const r = await readSlot(n);
    if (r.state === 'ok') {
      const p = r.slot.profile;
      out.push({ n, state: 'ok', name: p.name, wins: p.wins, bestFloor: p.bestFloor, runs: p.runsFinished, updatedAt: r.slot.updatedAt, climbing: !!r.slot.run });
    } else out.push({ n, state: r.state });
  }
  slotCards.value = out;
  return out;
}

export async function openSlots(): Promise<void> {
  screen.value = 'slots';
  await refreshSlots();
}

/** Open a slot: its Workshop, or the run in progress through the Continue button. */
export async function useSlot(n: SlotNo): Promise<boolean> {
  const r = await readSlot(n);
  if (r.state !== 'ok') return false;
  if (stage?.isPlaying()) stage.setSpeed('skip');
  enterSlot(n, r.slot.profile, r.slot.run);
  if (liveRun && liveRun.phase === 'combat' && liveRun.combat && liveRun.combat.outcome !== 'ongoing' && !watchOffered(liveRun.combat)) {
    try {
      core.settleCombat(liveRun);
    } catch {
      /* leave it */
    }
  }
  if (liveRun) {
    runView.value = clone(liveRun);
    if (!(live && live === liveRun.combat)) practiceStash = practiceStash ?? live;
  } else runView.value = null;
  screen.value = 'bellfoot';
  greet(active?.profile.lastSprocketMood ?? null);
  if (!liveRun) pose.value = 'idle';
  return true;
}

export async function newSlot(n: SlotNo, name: string): Promise<boolean> {
  const profile = meta.newProfile((name.trim() || 'Tinkerer').slice(0, 20), nowIso());
  await writeSlot({ slot: n, version: SAVE_VERSION, profile, run: null, updatedAt: nowIso() });
  await refreshSlots();
  return useSlot(n);
}

export async function deleteSlot(n: SlotNo): Promise<void> {
  await removeSlot(n);
  if (active && active.n === n) {
    active = null;
    slotNo.value = null;
    profileView.value = null;
    liveRun = null;
    runView.value = null;
    try {
      window.localStorage.removeItem('cs.lastSlot');
    } catch {
      /* fine */
    }
  }
  await refreshSlots();
}

/** Title: into the active slot's Workshop, or the slot screen. */
export function enterWorkshop(): void {
  if (active) {
    screen.value = 'bellfoot';
    poke();
  } else void openSlots();
}

export function buyUpgrade(id: string): boolean {
  if (!active) return false;
  const ok = meta.buyUpgrade(active.profile, id);
  if (ok) saveActive();
  return ok;
}

export function buyChassisNow(id: string): boolean {
  if (!active) return false;
  const ok = meta.buyChassis(active.profile, id);
  if (ok) saveActive();
  return ok;
}

/** The door: start a run with a chassis. */
export function climb(chassis: string, seed?: number): boolean {
  if (!active || climbing()) return false;
  newRun(seed, chassis);
  return true;
}

export const goNode = (id: string): boolean => runAction((r) => core.enterNode(r, id)) ?? false;
export const rewardPart = (i: number | null): boolean => runAction((r) => core.takeRewardPart(r, i)) ?? false;
export const salvageDone = (keep: number[]): boolean => runAction((r) => takeSalvage(r, keep)) ?? false;
export const rewardTrinket = (i: number | null): boolean => runAction((r) => core.takeRewardTrinket(r, i)) ?? false;
/** B9b: the Queen's pick (Pending 'legendary'). */
export const takeLegendary = (id: string): boolean => runAction((r) => core.takeLegendary(r, id)) ?? false;
export const chooseEvent = (i: number): string | null =>
  runAction((r) => {
    const hp0 = r.hp;
    const out = core.chooseEvent(r, i);
    const pe = r.pending;
    if (pe && pe.kind === 'event' && pe.result) pe.result = pe.result.replace(/Healed \d+ HP\.?/, () => (r.hp > hp0 ? `Healed ${r.hp - hp0} HP.` : 'You are already at full HP.'));
    return out;
  }) ?? null;
export const pickEventPart = (uid: number): boolean => runAction((r) => core.eventPickPart(r, uid)) ?? false;
export const shopBuy = (i: number): boolean => runAction((r) => core.shopBuy(r, i)) ?? false;
export const shopRemove = (uid: number): boolean => runAction((r) => core.shopRemove(r, uid)) ?? false;
export const forge = (kind: 'upgrade' | 'remove', uid: number): boolean => runAction((r) => (kind === 'upgrade' ? core.forgeUpgrade(r, uid) : core.forgeRemove(r, uid))) ?? false;
export const oil = (kind: 'repair' | 'polish'): boolean => runAction((r) => (kind === 'repair' ? core.oilRepair(r) : core.oilPolish(r))) ?? false;
export const leave = (): boolean => runAction((r) => core.leaveNode(r)) ?? false;
export const availableNow = (): string[] => (liveRun ? core.availableNodes(liveRun) : []);
export const brassNow = (): number => (liveRun ? core.brassFor(liveRun) : 0);

// ---------- the climb (B8): the act screen, walking, doors and the room screens ----------

/** The walk in progress (1x and 2x speed): the walkers animate from `from` to `to`, then the screen catches up. */
export const walk = signal<{ from: string; to: string } | null>(null);
/** The workbench's fuse offer for the two chosen parts: the candidate part ids, or why not. */
export const fuseOffer = signal<{ a: number; b: number; candidates: string[]; reason?: string } | null>(null);

const WALK_MS: Record<Speed, number> = { '1x': 900, '2x': 450, skip: 0 };

const roomAt = (r: RunState, id: string | undefined) => r.section?.rooms.find((x) => x.id === id);

function lockedBetween(r: RunState, a: string, b: string): number {
  return r.section ? r.section.passages.findIndex((p) => p.locked && ((p.a === a && p.b === b) || (p.a === b && p.b === a))) : -1;
}

/** Tap a room: walk to it when connected; the far room of a locked passage opens the door screen; anything else does nothing. */
export function moveRoom(id: string): boolean {
  if (!liveRun || !liveRun.section || liveRun.phase !== 'section' || isBusy() || id === liveRun.roomId) return false;
  const r = liveRun;
  const from = r.roomId ?? r.section!.entry;
  let near: string[] = [];
  try {
    near = sect.connectedRooms(r);
  } catch {
    near = [];
  }
  if (!near.includes(id)) {
    const p = lockedBetween(r, from, id);
    if (p >= 0) doorPrompt.value = p;
    return false;
  }
  let ok = false;
  try {
    ok = sect.moveTo(r, id);
  } catch {
    ok = false;
  }
  if (!ok) return false;
  const ms = WALK_MS[speed.value];
  if (ms === 0) {
    afterRun(true);
    return true;
  }
  walk.value = { from, to: id };
  window.setTimeout(() => {
    walk.value = null;
    afterRun(true);
  }, ms);
  return true;
}

export const ringBell = (): boolean => runAction((r) => sect.ringBell(r)) ?? false;
/** The locked passage (index into section.passages) whose key-or-pick choice shows over the act screen. */
export const doorPrompt = signal<number | null>(null);
export const useKey = (passage: number): boolean => {
  const ok = runAction((r) => sect.useKey(r, passage)) ?? false;
  if (ok) doorPrompt.value = null;
  return ok;
};
export const pickLock = (passage: number): boolean => {
  const ok = runAction((r) => sect.pickLock(r, passage)) ?? false;
  if (ok) doorPrompt.value = null;
  return ok;
};
export const cancelDoor = (): void => {
  doorPrompt.value = null;
};
/** Done with a room's screen (workbench, trader, oil): the core clears the room, pays its Brass and runs the midnight check. */
export const leaveRoom = (): boolean => {
  fuseOffer.value = null;
  return leave();
};
export const benchUpgrade = (uid: number): boolean => runAction((r) => rooms.workbenchUpgrade(r, uid)) ?? false;
export const benchRemove = (uid: number): boolean => runAction((r) => rooms.workbenchRemove(r, uid)) ?? false;
/** Ask for the two fuse candidates for the chosen parts; they show on the workbench until one is picked. */
export function benchFuse(a: number, b: number): boolean {
  if (!liveRun) return false;
  const out = rooms.fuseCandidates(liveRun, a, b);
  afterRun(false);
  fuseOffer.value = 'candidates' in out ? { a, b, candidates: out.candidates } : { a, b, candidates: [], reason: out.reason };
  return 'candidates' in out;
}
export const benchFusePick = (a: number, b: number, pick: number): boolean =>
  runAction((r) => {
    const ok = rooms.fuse(r, a, b, pick);
    if (ok) fuseOffer.value = null;
    return ok;
  }) ?? false;
export const traderBuy = (index: number, offerUid: number | null): boolean => runAction((r) => rooms.barter(r, index, offerUid)) ?? false;
/** HP the last rest restored, for the oil screen's line. */
export const lastRestHeal = signal(0);
export const oilRest = (): boolean =>
  runAction((r) => {
    const hp0 = r.hp;
    const ok = rooms.rest(r);
    if (ok) lastRestHeal.value = r.hp - hp0;
    return ok;
  }) ?? false;
export const oilPolish = (): boolean => runAction((r) => rooms.polish(r)) ?? false;

/** The Scrap you would pay for a trader's item now (rules 4.5): its value less the offered part's, or value + 25% alone. */
export function tradeCost(r: RunState, index: number, offerUid: number | null): number {
  const item = r.pending?.kind === 'trader' ? r.pending.stock[index] : undefined;
  if (!item) return 0;
  const offer = offerUid === null ? undefined : r.bin.find((p) => p.uid === offerUid);
  const v = offer ? (rooms.PART_VALUE[PARTS[offer.defId]?.rarity ?? 'common'] ?? 0) : null;
  return rooms.barterPrice(r, item, v);
}

/** Test cheat: arrive in a room as if walked there, at no hour. */
function cheatGotoRoom(id: string): void {
  const r = liveRun;
  const room = r ? roomAt(r, id) : undefined;
  if (!r || !r.section || !room) return;
  r.roomId = id;
  room.visited = true;
  room.revealed = true;
  for (const p of r.section.passages) {
    const other = p.a === id ? p.b : p.b === id ? p.a : undefined;
    const o = roomAt(r, other);
    if (o) o.revealed = true;
  }
  // an elite standing in the room has moved on (a cheat skips the collision, or the screen would end in a fight)
  for (const e of r.elites ?? []) if (!e.defeated && e.patrol[e.at] === id) e.at = (e.at + 1) % e.patrol.length;
  r.phase = 'section';
  fuseOffer.value = null;
  sect.resolveRoom(r);
  afterRun(true);
}

/** Test cheat: a new run on the fixture section. */
function cheatFixtureSection(o: { at?: string; hour?: number; clear?: string[] } = {}): void {
  newRun(1);
  const r = liveRun;
  if (!r) return;
  const fx = sectionFixture();
  r.section = fx.section;
  r.elites = fx.elites;
  r.hour = o.hour ?? 0;
  r.hours = 12;
  r.scrap = 0;
  r.keys = 0;
  for (const id of o.clear ?? []) {
    const rm = roomAt(r, id);
    if (rm) {
      rm.cleared = true;
      rm.visited = true;
    }
  }
  r.roomId = o.at ?? 'r0';
  const here = roomAt(r, r.roomId);
  if (here) {
    here.visited = true;
    here.revealed = true;
  }
  for (const p of r.section.passages) {
    const other = p.a === r.roomId ? p.b : p.b === r.roomId ? p.a : undefined;
    const rm = roomAt(r, other);
    if (rm) rm.revealed = true;
  }
  r.phase = 'section';
  r.pending = null;
  afterRun(true);
}

function cheatStartClimb(seed: number): void {
  newRun(seed);
  if (!liveRun) return;
  sect.startAct(liveRun, 1);
  liveRun.phase = 'section';
  afterRun(true);
}

function cheatSet(fn: (r: RunState) => void): void {
  if (!liveRun) return;
  fn(liveRun);
  afterRun(false);
}

/** Test cheat: jump to a floor of an act. With `type`, a reachable node of that type is made available there. */
function cheatGoto(act: 1 | 2 | 3, floor: number, type?: string): void {
  if (!liveRun) return;
  const r = liveRun;
  if (r.act !== act) {
    r.map = generateActMap(r.rng as never, act);
    r.act = act;
  }
  r.combat = null;
  r.pending = null;
  r.phase = 'map';
  r.floor = floor - 1;
  const prev = r.map.nodes.filter((n) => n.floor === floor - 1);
  const here = r.map.nodes.filter((n) => n.floor === floor);
  for (const n of r.map.nodes) n.visited = n.floor < floor;
  if (floor === 1) {
    r.nodeId = null;
    if (type && here[0]) here[0].type = type as never;
    return;
  }
  const from = prev[0];
  const target = (type ? here.find((n) => n.type === type) : undefined) ?? here[0];
  if (type && target && target.type !== type) target.type = type as never;
  if (from && target) {
    from.next = [target.id];
    r.nodeId = from.id;
  }
}

export async function cheatWinFight(): Promise<void> {
  if (!live || !liveRun || liveRun.phase !== 'combat') return;
  for (const e of live.enemies) e.hp = 0;
  publish();
  await run();
}


/** The combat being played right now (not a copy), for the autoplay bot; never mutate it outside the actions. */
export function liveCombat(): CombatState | null {
  return live;
}

/** Debug: play the real game with the sim bots through the actions above, until the Clockmaker falls. */
export function autoplay(opts: AutoOpts = {}): Promise<AutoResult> {
  return runAutoplay(
    {
      profile: () => (active ? clone(active.profile) : null),
      newSlot: (n, name) => newSlot(n, name),
      buy: (id) => buyUpgrade(id),
      climb: (chassis, seed) => climb(chassis, seed),
      runState: () => (liveRun ? clone(liveRun) : null),
      combat: () => (liveRun && liveRun.phase === 'combat' ? live : null),
      go: (id) => goNode(id),
      reward: (i) => rewardPart(i),
      salvage: (keep) => salvageDone(keep),
      rewardTrinket: (i) => rewardTrinket(i),
      choose: (i) => chooseEvent(i),
      pickPart: (uid) => pickEventPart(uid),
      shopBuy: (i) => shopBuy(i),
      remove: (uid) => shopRemove(uid),
      forge: (kind, uid) => forge(kind, uid),
      oil: (kind) => oil(kind),
      leave: () => leave(),
      place: (h, c) => place(h, c),
      swap: (a, b) => swap(a, b),
      target: (i) => target(i),
      run: () => run(),
      leaveResult: () => leaveResult(),
      abandon: () => abandonClimb(),
      setSpeed: (s) => setSpeed(s),
    },
    opts,
  );
}

export function isBusy(): boolean {
  return replaying.value !== null || walk.value !== null;
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

/** B9b: a lost Run with the Inventor's Watch held and unused: the fight waits for the choice before it settles. */
export function watchOffered(c: CombatState | null | undefined): boolean {
  return !!c && c.outcome === 'lost' && !c.watchUsed && !!c.watchSnapshot && c.trinkets.includes('inventors-watch');
}

/** B9b: wind the fight back to before the last Run (the Watch), after a Run or at the defeat prompt. */
export function windBackNow(): boolean {
  if (!live || isBusy()) return false;
  const ok = windBack(live);
  if (ok) {
    banner.value = null;
    lastResult.value = null;
    publish();
    persist();
  }
  return ok;
}

/** B9b: decline the Watch at the defeat prompt: the fight settles as it always did. */
export function acceptDefeat(): void {
  if (!live || !liveRun || live !== liveRun.combat || live.outcome === 'ongoing') return;
  live.watchUsed = true; // no second offer, even after a reload
  core.settleCombat(liveRun);
  afterRun(liveRun.phase !== 'combat');
}

/** B9b: Two Left Hands: trade the board part at `cell` with a part in your hand. */
export function swapHand(cell: number | string, handIndex: number): boolean {
  if (!live || isBusy()) return false;
  const ok = swapWithHand(live, typeof cell === 'string' ? cellIndex(cell) : cell, handIndex);
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
  const front = (live.enemies[idx]?.parts?.length ?? 0) > 0 ? frontOf(live, idx) : null;
  if (front) setOrder(live, [front]);
  else setTarget(live, idx);
  publish();
  persist();
}

/** v2: tap a part or core: add it to the target order, or remove it. */
export function toggleTarget(ref: TargetRef): boolean {
  if (!live || isBusy() || live.outcome !== 'ongoing') return false;
  const changed = toggleOrder(live, ref);
  if (changed) {
    publish();
    persist();
  }
  return changed;
}

export const currentOrder = (): TargetRef[] => (live ? live.order.slice() : []);

/** Test cheat: a new run (seed 1) already in a fight against exactly these enemies. */
function cheatRunFight(enemies: string[]): void {
  newRun(1);
  const r = liveRun;
  if (!r) return;
  if (!r.section) {
    const id = core.availableNodes(r)[0];
    const node = r.map.nodes.find((n) => n.id === id);
    if (!node) return;
    node.type = 'fight';
    core.enterNode(r, id);
  }
  r.phase = 'combat';
  r.combat = createCombat({
    seed: 1,
    bin: r.bin,
    enemies: enemies.filter((e) => ENEMIES[e]),
    hp: r.hp,
    maxHp: r.maxHp,
    kind: 'fight',
    trinkets: r.trinkets,
    handSize: r.config.handSize,
    chassis: r.config.chassis,
    memory: active ? memoryPlan(active.profile.planHistory) : null,
  } as CreateCombatOpts);
  afterRun(true);
}

/**
 * Test cheat (B9a): break every standing keystone of an enemy's current phase as a Run does (the engine's own rules:
 * the last one sets phaseLocked), then play the turn like the Run button; resolves when the replay is done.
 */
async function cheatBreakPhase(enemy: number): Promise<void> {
  const c = live;
  const e = c?.enemies[enemy];
  if (!c || !e) return;
  const ph = enemyDef(e.defId).frame?.phases?.[e.phase];
  if (!ph) return;
  const events: GameEvent[] = [];
  for (const id of ph.keystones) {
    const p = e.parts.find((x) => x.id === id);
    if (p && !p.broken) breakPartState(c, enemy, p, events);
  }
  publish();
  await run();
}

/** Test cheat: break a part as if it had been hit, recording its salvage (the engine's breaking rules are not re-run). */
function cheatBreakPart(enemy: number, partId: string): void {
  const c = live;
  const e = c?.enemies[enemy];
  if (!c || !e) return;
  const st = e.parts.find((p) => p.id === partId);
  if (!st || st.broken) return;
  const fr = enemyDef(e.defId).frame;
  const defs = fr ? [...fr.parts, ...(fr.phases ?? []).flatMap((ph) => ph.parts)] : [];
  const def = defs.find((d) => d.id === partId);
  st.hp = 0;
  st.broken = true;
  e.intents = e.intents.filter((it) => it.partId !== partId);
  c.order = c.order.filter((r) => r !== `e${enemy}.${partId}`);
  if (def?.salvage) {
    const item: SalvageItem = { enemy, partId, salvage: def.salvage, rarity: def.rarity, locked: false };
    c.broken.push(item);
  }
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
  phaseIntent.value = null;
  publish();
  persist();
  advanceTutorial(true);
  if (liveRun && live === liveRun.combat) {
    // a run fight: let the last beat land, then settle (rewards, or defeat)
    if (live.outcome !== 'ongoing' && speed.value !== 'skip') await new Promise((r) => setTimeout(r, 650));
    if (watchOffered(live)) return result; // B9b: defeat waits for "Wind back" or "Accept defeat"
    core.settleCombat(liveRun);
    afterRun(liveRun.phase !== 'combat');
  }
  return result;
}

export function setSpeed(s: Speed): void {
  speed.value = s;
  stage?.setSpeed(s);
  if (settings.value.speed !== s) updateSettings({ speed: s });
}

export function cycleSpeed(): void {
  setSpeed(speed.value === '1x' ? '2x' : speed.value === '2x' ? 'skip' : '1x');
}

export function goTitle(): void {
  if (stage?.isPlaying()) stage.setSpeed('skip');
  if (screen.value === 'bellfoot' || screen.value === 'slots') {
    screen.value = 'title';
    return;
  }
  if (liveRun && screen.value === 'run') {
    runToTitle();
    return;
  }
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
  return !!live && live.outcome === 'ongoing' && !(liveRun && live === liveRun.combat);
}

// ---------- settings (B5): one record, applied at launch and live ----------

export const DEFAULT_SETTINGS: Settings = { version: 1, master: 0.8, music: 0.7, effects: 1, muted: false, speed: '1x', colorBlindIcons: false, reducedEffects: false };
export const settings = signal<Settings>({ ...DEFAULT_SETTINGS, colorBlindIcons: colorBlind.value });
let settingsReady = false;

function applyAudio(st: Settings, initial: boolean): void {
  try {
    music.setVolume('master', st.master);
    music.setVolume('music', st.music);
    music.setVolume('effects', st.effects);
    // under automation the sound starts muted: only an explicit choice changes that
    if (st.muted || !initial) music.setMuted(st.muted);
  } catch {
    /* audio is best effort */
  }
}

/** Change settings: applied now, kept for next time. */
export function updateSettings(patch: Partial<Settings>): void {
  const next = { ...settings.value, ...patch };
  settings.value = next;
  if (patch.colorBlindIcons !== undefined) setColorBlind(next.colorBlindIcons);
  if (patch.speed !== undefined) {
    speed.value = next.speed;
    stage?.setSpeed(next.speed);
  }
  if (patch.reducedEffects !== undefined && stage) stage.reducedEffects = next.reducedEffects;
  if (patch.master !== undefined || patch.music !== undefined || patch.effects !== undefined || patch.muted !== undefined) applyAudio(next, false);
  if (settingsReady) void saveSettings(next);
}

// the color-blind toggles elsewhere (title, menus) write the preference signal: keep the record in step
effect(() => {
  const cb = colorBlind.value;
  if (settingsReady && cb !== settings.peek().colorBlindIcons) updateSettings({ colorBlindIcons: cb });
});

/** Music follows the screen: the Workshop for the title and Workshop, the act's track on the map and in fights. */
effect(() => {
  const scr = screen.value;
  const rv = runView.value;
  const c = combat.value;
  try {
    const enemyIds = c ? c.enemies.map((e) => e.defId) : [];
    const clock = c?.enemies.find((e) => e.defId === 'clockmaker');
    let track: TrackId;
    if (scr === 'run' && rv) {
      if (rv.phase === 'combat') track = trackFor('combat', rv.act, enemyIds, clock?.phase ?? 0);
      else if (rv.phase === 'victory') track = trackFor('ending');
      else if (rv.phase === 'defeat') track = trackFor('workshop');
      else track = trackFor('map', rv.act);
    } else if (scr === 'combat') track = trackFor('combat', 1, enemyIds, 0);
    else if (scr === 'bellfoot') track = trackFor('bellfoot');
    else track = trackFor('title');
    if (track !== music.current()) music.play(track);
    if (clock && track === 'clockmaker') music.setIntensity(clock.phase ?? 0);
  } catch {
    /* music is best effort */
  }
});

export async function init(): Promise<void> {
  void loadSettings().then((st) => {
    // no record yet: the B2 localStorage preference is the starting point (it is already in `settings`)
    const start = st ? { ...DEFAULT_SETTINGS, ...st } : settings.value;
    settings.value = start;
    setColorBlind(start.colorBlindIcons);
    speed.value = start.speed;
    stage?.setSpeed(start.speed);
    if (stage) stage.reducedEffects = start.reducedEffects;
    applyAudio(start, true);
    settingsReady = true;
    if (!st) void saveSettings(start);
  });
  // the last slot used resumes straight into a run in progress (a reload mid-combat lands where it was)
  const last = Number(window.localStorage.getItem('cs.lastSlot') ?? '0');
  if (last >= 1 && last <= 3) {
    const r = await readSlot(last as SlotNo);
    if (screen.value !== 'loading') return;
    if (r.state === 'ok' && r.slot.run) {
      try {
        enterSlot(last as SlotNo, r.slot.profile, r.slot.run);
        if (liveRun) {
          // a reload during the beat after the last blow: settle it now
          if (liveRun.phase === 'combat' && liveRun.combat && liveRun.combat.outcome !== 'ongoing' && !watchOffered(liveRun.combat)) core.settleCombat(liveRun);
          afterRun(true);
          bossIntro.value = null;
          return;
        }
      } catch {
        liveRun = null;
      }
    }
  }
  // the B3 single run save (before slots): put it in slot 1 once, or keep playing it as it is
  const legacy = await loadRun();
  if (screen.value !== 'loading') return;
  if (legacy) {
    try {
      const empty = (await readSlot(1)).state === 'empty';
      if (empty) {
        const profile = meta.newProfile('Tinkerer', new Date().toISOString());
        enterSlot(1, profile, legacy);
        await writeSlot({ slot: 1, version: SAVE_VERSION, profile, run: legacy, updatedAt: new Date().toISOString() });
        await clearRun();
      } else {
        liveRun = legacy;
      }
    } catch {
      liveRun = legacy; // meta not available: play it as before
      active = null;
    }
    try {
      if (liveRun && liveRun.phase === 'combat' && liveRun.combat && liveRun.combat.outcome !== 'ongoing' && !watchOffered(liveRun.combat)) core.settleCombat(liveRun);
      if (liveRun) {
        afterRun(true);
        bossIntro.value = null;
        return;
      }
    } catch {
      liveRun = null;
    }
  }
  if (screen.value !== 'loading') return; // something (a test hook) started a fight while the saves loaded
  const saved = await loadPractice();
  if (screen.value !== 'loading') return;
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
    /** Debug: replay a made-up list of events on the current state (e.g. a Rewind), then leave the state as it was. */
    debugPlay: async (events: GameEvent[]): Promise<void> => {
      if (!live || !stage) return;
      const before = cloneCombat(live);
      replaying.value = before;
      view.value = null;
      await stage.play(events, before, cloneCombat(live));
      replaying.value = null;
      view.value = null;
      publish();
    },
    /** B3 run hooks. `run()` stays the combat Run; the RunState is `runState()`. */
    newRun: (seed?: number): void => newRun(seed),
    runState: (): RunState | null => (liveRun ? clone(liveRun) : null),
    go: (id: string): boolean => goNode(id),
    nodes: (): string[] => availableNow(),
    reward: (i: number | null): boolean => rewardPart(i),
    order: (): string[] => currentOrder(),
    toggleTarget: (ref: string): boolean => toggleTarget(ref as TargetRef),
    salvage: (keep: number[]): boolean => salvageDone(keep),
    rewardTrinket: (i: number | null): boolean => rewardTrinket(i),
    choose: (i: number): string | null => chooseEvent(i),
    pickPart: (uid: number): boolean => pickEventPart(uid),
    shopBuy: (i: number): boolean => shopBuy(i),
    slots: (): SlotCard[] | null => slotCards.value,
    useSlot: (n: SlotNo): Promise<boolean> => useSlot(n),
    newSlot: (n: SlotNo, name: string): Promise<boolean> => newSlot(n, name),
    deleteSlot: (n: SlotNo): Promise<void> => deleteSlot(n),
    profile: (): Profile | null => (active ? clone(active.profile) : null),
    buy: (id: string): boolean => buyUpgrade(id),
    buyChassis: (id: string): boolean => buyChassisNow(id),
    climb: (chassis: string): boolean => climb(chassis),
    autoplay: (o?: AutoOpts): Promise<AutoResult> => autoplay(o),
    sprocket: (): string => pose.value,
    settings: (): Settings => clone(settings.value),
    setSettings: (patch: Partial<Settings>): void => updateSettings(patch),
    remove: (uid: number): boolean => shopRemove(uid),
    forge: (kind: 'upgrade' | 'remove', uid: number): boolean => forge(kind, uid),
    oil: (kind: 'repair' | 'polish'): boolean => oil(kind),
    leave: (): boolean => leave(),
    /** B8: the same as tapping the room on the act screen. */
    move: (id: string): boolean => moveRoom(id),
    // ---- B9b.0 CONTRACT (progression lane, B9b.3, replaces the bodies; nobody else edits this block) ----
    /** Trophy shelf data: achievements (with earned times and progress), rewards and what each unlocks. */
    trophies: (): unknown => trophyShelf(),
    // ---- end B9b.0 block ----
    // ---- B10a.0 CONTRACT (bellfoot-ui fills town(); memory-core the cheats; nobody else edits these blocks) ----
    /** Bellfoot now: the current place id and the place list (src/ui/town.ts `townPlaces`). */
    town: (): { place: string; places: { id: string; label: string; x: number }[] } => ({
      place: townPlace.value,
      places: townPlaces(active?.profile.residents ?? []).map((p) => ({ id: p.id, label: p.label, x: p.x })),
    }),
    // ---- end B10a.0 block ----
    cheat: {
      // ---- B9b.0 CONTRACT (progression lane): earn an achievement now, as finishRun would (unlocks, rewards, one save write) ----
      unlock: (id: string): void => {
        if (active && earnAchievement(active.profile, id, nowIso())) saveActive();
      },
      // ---- end B9b.0 block ----
      // ---- B10a.0 CONTRACT (memory-core): add a resident or landmark to the active profile as finishRun would, then save ----
      addResident: (id: string): void => {
        if (!active || !RESIDENT_BY_ID[id]) return;
        if (!active.profile.residents.includes(id)) active.profile.residents.push(id);
        saveActive();
      },
      addLandmark: (id: string): void => {
        if (!active || !LANDMARK_BY_ID[id]) return;
        if (!active.profile.landmarks.includes(id)) active.profile.landmarks.push(id);
        saveActive();
      },
      // ---- end B10a.0 block ----
      /** B9a: set the active profile's planHistory (the Clockmaker's memory), save, and re-render the Workshop. */
      setPlanHistory: (plans: Plan[]): void => {
        if (!active) return;
        active.profile.planHistory = plans.slice(-3);
        saveActive();
      },
      /** B9b: the run holds this trinket now (run.trinkets and the live combat's). */
      giveTrinket: (id: string): void => {
        if (!liveRun) return;
        if (!liveRun.trinkets.includes(id)) liveRun.trinkets.push(id);
        if (live && !live.trinkets.includes(id)) live.trinkets.push(id);
        publish();
        persist();
      },
      startClimb: (seed: number): void => cheatStartClimb(seed),
      fixtureSection: (o?: { at?: string; hour?: number; clear?: string[] }): void => cheatFixtureSection(o),
      gotoRoom: (id: string): void => cheatGotoRoom(id),
      setScrap: (n: number): void =>
        cheatSet((r) => {
          r.scrap = n;
        }),
      setHour: (n: number): void =>
        cheatSet((r) => {
          r.hour = n;
        }),
      setKeys: (n: number): void =>
        cheatSet((r) => {
          r.keys = n;
        }),
      giveParts: (ids: string[]): number[] => {
        const uids: number[] = [];
        cheatSet((r) => {
          for (const id of ids) {
            const uid = r.nextUid++;
            r.bin.push({ uid, defId: id.replace(/\+$/, ''), plus: id.endsWith('+') });
            uids.push(uid);
          }
        });
        return uids;
      },
      openTrader: (stock: { kind: 'part' | 'trinket' | 'oil'; id?: string; value: number; sold: boolean }[]): void => {
        if (!liveRun) return;
        liveRun.combat = null;
        liveRun.pending = { kind: 'trader', stock };
        liveRun.phase = 'trader';
        afterRun(true);
      },
      /** Make the next render throw, to see the error boundary. */
      crash: (): void => {
        crashNow.value = true;
      },
      winFight: (): Promise<void> => cheatWinFight(),
      runFight: (enemies: string[]): void => cheatRunFight(enemies),
      /** Show a post-fight pending screen (a salvage tray, say) without playing the fight. */
      setPending: (pending: RunState['pending']): void => {
        if (!liveRun) return;
        liveRun.combat = null;
        liveRun.pending = pending;
        liveRun.phase = pending ? 'reward' : 'map';
        afterRun(true);
      },
      breakPart: (enemy: number, partId: string): void => cheatBreakPart(enemy, partId),
      breakPhase: (enemy: number): Promise<void> => cheatBreakPhase(enemy),
      setHp: (n: number): void => {
        if (!liveRun) return;
        liveRun.hp = n;
        if (liveRun.combat) liveRun.combat.playerHp = n;
        afterRun(false);
      },
      gotoFloor: (act: 1 | 2 | 3, floor: number, type?: string): void => {
        cheatGoto(act, floor, type);
        afterRun(true);
      },
      brass: (n: number): void => {
        if (!active) return;
        active.profile.brass += n;
        saveActive();
      },
      idle: (ms: number): void => {
        idleShift.value += ms;
        checkSleepy();
      },
      /** Finish the run now as a win or a loss; with `floor` (absolute) a loss lands there. */
      finishRun: (result: 'win' | 'loss', floor?: number): void => {
        if (!liveRun) climb('tinker');
        if (!liveRun) return;
        liveRun.combat = null;
        liveRun.pending = null;
        if (result === 'win') {
          liveRun.act = 3;
          liveRun.floor = 13;
          liveRun.phase = 'victory';
          // a genuine climb: every floor left (4, 6 and 8 Brass by act) and the three bosses beaten
          liveRun.stats.floorBrass = 12 * 4 + 12 * 6 + 12 * 8 + 3 * 0;
          liveRun.stats.bossesBeaten = 3;
        } else {
          const f = Math.max(1, floor ?? 3);
          liveRun.act = Math.min(3, Math.ceil(f / 13)) as 1 | 2 | 3;
          liveRun.floor = ((f - 1) % 13) + 1;
          liveRun.phase = 'defeat';
          liveRun.killedBy = 'rust-mite';
          // Brass for the floors actually left, as the real run pays it
          let fb = 0;
          for (let i = 1; i < f; i++) fb += [4, 6, 8][Math.ceil(i / 13) - 1] ?? 8;
          liveRun.stats.floorBrass = fb;
          liveRun.stats.bossesBeaten = Math.floor((f - 1) / 13);
        }
        afterRun(true);
      },
      /** Show a particular event right now (for looking at its art and text). */
      event: (id: string): void => {
        if (!liveRun) return;
        liveRun.combat = null;
        liveRun.pending = { kind: 'event', eventId: id };
        liveRun.phase = 'event';
        afterRun(true);
      },
      setCogs: (n: number): void => {
        if (!liveRun) return;
        liveRun.cogs = n;
        afterRun(false);
      },
    },
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
  // the music module's own view of the sound: current track, volumes, mute
  Object.defineProperty(w.__game, 'audio', { configurable: true, get: () => audioDebug() });
  // painted enemies (B8 AR4): the RigHub's frame stats and a simulated WebGL context loss
  Object.defineProperty(w.__game, 'rig', {
    configurable: true,
    value: {
      stats: () => sharedRigHub().stats(),
      reset: () => sharedRigHub().resetStats(),
      loseContext: () => sharedRigHub().loseContext(),
      restoreContext: () => sharedRigHub().restoreContext(),
      moods: (enemy: number): string[] => stage?.rigMoods(enemy) ?? [],
      mood: (enemy: number): string => stage?.rigMood(enemy) ?? '',
      force: (enemy: number, mood: string): void => stage?.forceRig(enemy, mood), // for recording a rig's moods
    },
  });
}
