// Meta-progression: profiles, the upgrade bench, chassis unlocks, run settlement, Sprocket's mood.
// Pure: no DOM, no clock (times are passed in).
import { CHASSIS } from './content/chassis';
import { STORY_NOTES } from './content/story';
import { DEFAULT_MODE, START_MODES } from './content/modes';
import { scaleBrass } from './difficulty';
import { ACHIEVEMENTS } from './content/achievements';
import { TRINKETS } from './content/trinkets';
import { checkAchievements } from './achievements';
import { achievementUnlocks } from './pool';
import { UPGRADES } from './content/upgrades';
import { split } from './rng';
import { mainPlan, memoryPlan } from './record';
import { absoluteFloor, brassFor, runRecord } from './run';
import { LANDMARKS } from './content/landmarks';
import { RESIDENTS } from './content/residents';
import { JOURNAL_BY_ID } from './content/story';
import type { MapGenPatch, Profile, RunConfig, RunConfigPatch, RunRecord, RunState, SprocketMood } from './types';

export const PROFILE_VERSION = 1;
export const HISTORY_CAP = 100;
const SEEDS_KEPT = 20;
/** Brass alternative to the chassis unlock rules. */
const CHASSIS_PRICE: Record<string, number> = { stoker: 150, horologist: 300 };

/** A fresh profile: no Brass, Tinker unlocked. */
export function newProfile(name: string, createdAt: string): Profile {
  return {
    version: PROFILE_VERSION,
    name,
    createdAt,
    brass: 0,
    brassEarnedTotal: 0,
    blueprints: [],
    upgrades: {},
    chassisUnlocked: ['tinker'],
    runsStarted: 0,
    runsFinished: 0,
    wins: 0,
    bestFloor: 0,
    history: [],
    storyFlags: [],
    lastSprocketMood: null,
    finishedSeeds: [],
    planHistory: [],
    residents: [],
    landmarks: [],
    journal: [],
    bestiary: [],
    collars: [],
    collar: null,
    modesUnlocked: START_MODES.slice(),
    lastMode: DEFAULT_MODE,
    lastOverwind: 0,
    achievements: {},
    achievementProgress: {},
    rewards: { journal: [], collars: [], landmarks: [], overwind: 0, chassis: [] },
  };
}

/** Brass cost of the next level of an upgrade, or null when maxed. */
export function upgradeCost(profile: Profile, upgradeId: string): number | null {
  const u = UPGRADES[upgradeId];
  if (!u) return null;
  const level = profile.upgrades[upgradeId] ?? 0;
  return level >= u.costs.length ? null : u.costs[level];
}

/** Buy the next level if affordable; returns whether it was bought. */
export function buyUpgrade(profile: Profile, upgradeId: string): boolean {
  const cost = upgradeCost(profile, upgradeId);
  if (cost === null || profile.brass < cost) return false;
  profile.brass -= cost;
  profile.upgrades[upgradeId] = (profile.upgrades[upgradeId] ?? 0) + 1;
  return true;
}

function commonTrinketFor(seed: number): string {
  const ids = Object.values(TRINKETS)
    .filter((t) => t.rarity === 'common')
    .map((t) => t.id)
    .sort();
  return ids[Math.floor((split(seed, 'shop') / 4294967296) * ids.length)];
}

/** The RunConfig a new run starts from, given the profile's upgrades and blueprints. */
export function runConfigFor(profile: Profile, seed: number, chassis: string): RunConfig {
  const lv = (id: string): number => profile.upgrades[id] ?? 0;
  const cfg: RunConfig = {
    seed,
    chassis,
    maxHp: 50 + 5 * lv('frame'),
    cogs: 25 * lv('scrap'),
    handSize: lv('toolbelt') >= 1 ? 4 : 3,
    upgradedStarters: lv('bearings'),
    trinkets: lv('charm') >= 1 ? [commonTrinketFor(seed)] : [],
    unlockedParts: [...new Set([...profile.blueprints, ...achievementUnlocks(profile).parts])],
    unlockedTrinkets: achievementUnlocks(profile).trinkets,
    rewardChoices: lv('notes') >= 1 ? 4 : 3,
    extraEliteBlueprint: lv('notes') >= 2,
    secondWind: lv('secondwind') >= 1,
    memory: memoryPlan(profile.planHistory),
    mode: profile.lastMode ?? DEFAULT_MODE,
    overwind: profile.lastOverwind ?? 0,
  };
  return applyMemory(cfg, profile);
}

/** B10a hook (memory-core): the residents' effects (RunConfigPatch) and the landmarks' (MapGenPatch) go onto the config here
 * (`residentPatch`, `mapPatch`, `upgradedStarters`...). Pass-through until B10a.1. */
function applyMemory(cfg: RunConfig, profile: Profile): RunConfig {
  const living = RESIDENTS.filter((r) => (profile.residents ?? []).includes(r.id));
  const marks = LANDMARKS.filter((l) => (profile.landmarks ?? []).includes(l.id));
  if (living.length === 0 && marks.length === 0) return cfg;
  const sum = (f: (r: RunConfigPatch) => number | undefined): number => living.reduce((n, r) => n + (f(r.effect) ?? 0), 0);
  const any = (f: (r: RunConfigPatch) => boolean | undefined): boolean => living.some((r) => !!f(r.effect));
  if (living.length > 0) {
    cfg.residentPatch = {
      oilFlasks: sum((e) => e.oilFlasks) || undefined,
      upgradedStarters: sum((e) => e.upgradedStarters) || undefined,
      revealRooms: any((e) => e.revealRooms) || undefined,
      extraTraders: sum((e) => e.extraTraders) || undefined,
      loreAndBestiary: any((e) => e.loreAndBestiary) || undefined,
    };
    cfg.residents = living.map((r) => r.id);
  }
  const map: MapGenPatch = {};
  for (const l of marks) {
    if (l.effect.lift) map.lift = true;
    if (l.effect.beacon) map.beacon = true;
    if (l.effect.knownVaults) map.knownVaults = [...new Set([...(map.knownVaults ?? []), ...l.effect.knownVaults])];
  }
  if (any((e) => e.revealRooms)) map.revealRooms = true;
  if (sum((e) => e.extraTraders) > 0) map.extraTraders = sum((e) => e.extraTraders);
  if (living.length > 0) map.excludeEvents = living.map((r) => r.eventId);
  cfg.mapPatch = map;
  return cfg;
}

/** Sprocket's greeting mood for a finished run (rules 5.5). */
export function sprocketMood(record: RunRecord, bestFloorBefore: number): SprocketMood {
  if (record.result === 'win') return 'celebrate';
  const abs = (record.act - 1) * 13 + record.floor;
  // A good climb: act 2 or beyond, or a new best that got past the act 1 forge (floor 8+).
  if (record.act >= 2 || (abs > bestFloorBefore && abs >= 8)) return 'happy';
  return 'comfort';
}

/** Chassis the player may pick now. */
export function chassisAvailable(profile: Profile): string[] {
  return Object.keys(CHASSIS).filter((id) => profile.chassisUnlocked.includes(id));
}

/** Brass price to unlock a chassis now, or null if unlocked or not for sale. */
export function chassisPrice(profile: Profile, chassisId: string): number | null {
  if (profile.chassisUnlocked.includes(chassisId)) return null;
  return CHASSIS_PRICE[chassisId] ?? null;
}

function addFlag(profile: Profile, flag: string): boolean {
  if (profile.storyFlags.includes(flag)) return false;
  profile.storyFlags.push(flag);
  return true;
}

/** The Brass alternative to unlocking a chassis (Stoker 150, Horologist 300). */
export function buyChassis(profile: Profile, chassisId: string): boolean {
  const price = chassisPrice(profile, chassisId);
  if (price === null || profile.brass < price) return false;
  profile.brass -= price;
  profile.chassisUnlocked.push(chassisId);
  addFlag(profile, `unlock-${chassisId}`);
  return true;
}

/**
 * Settle a finished run (victory, defeat or abandoned) into the profile in one mutation: Brass, blueprints,
 * the RunRecord (n and endedAt filled here), counters, best floor, chassis unlocks, story flags, mood.
 * Calling it twice for the same run changes nothing the second time.
 */
export function finishRun(
  profile: Profile,
  run: RunState,
  endedAt: string,
): { record: RunRecord; mood: SprocketMood; brass: number; newUnlocks: string[]; newNotes: string[]; newAchievements: string[] } {
  const seed = run.config.seed;
  if (profile.finishedSeeds.includes(seed)) {
    const prior = profile.history.find((r) => r.seed === seed);
    const record = prior ?? { ...runRecord(run), n: profile.runsFinished, endedAt };
    return { record, mood: profile.lastSprocketMood ?? 'comfort', brass: 0, newUnlocks: [], newNotes: [], newAchievements: [] };
  }
  const brass = scaleBrass(run, brassFor(run)); // B10b hook (modes-overwind)
  const base = runRecord(run);
  const bestBefore = profile.bestFloor;
  profile.runsFinished += 1;
  profile.runsStarted = Math.max(profile.runsStarted, profile.runsFinished);
  const record: RunRecord = { ...base, n: profile.runsFinished, endedAt };
  profile.brass += brass;
  profile.brassEarnedTotal += brass;
  for (const b of base.blueprintsFound) if (!profile.blueprints.includes(b)) profile.blueprints.push(b);
  profile.history.unshift(record);
  if (profile.history.length > HISTORY_CAP) profile.history.length = HISTORY_CAP;
  if (record.result === 'win') profile.wins += 1;
  profile.bestFloor = Math.max(profile.bestFloor, absoluteFloor(run));

  const before = new Set(profile.storyFlags);
  const newUnlocks: string[] = [];
  const unlock = (id: string): void => {
    if (!profile.chassisUnlocked.includes(id)) {
      profile.chassisUnlocked.push(id);
      newUnlocks.push(id);
      addFlag(profile, `unlock-${id}`);
    }
  };
  if (run.act >= 2) unlock('stoker');
  if (run.stats.bossesBeaten >= 2 || record.result === 'win') unlock('horologist');

  addFlag(profile, 'first-run');
  if (record.result === 'loss' && run.act === 1) addFlag(profile, 'first-death-act1');
  if (run.act >= 2) addFlag(profile, 'first-act2');
  if (run.stats.bossesBeaten >= 1) addFlag(profile, 'first-boss');
  if (run.stats.blueprintsFound.length > 0 && run.stats.elites > 0) addFlag(profile, 'first-elite-blueprint');
  if (run.act === 3 && (run.floor >= 13 || run.stats.bossesBeaten >= 3)) addFlag(profile, 'clockmaker-sighting');
  if (record.result === 'win') addFlag(profile, 'victory');

  const mood = sprocketMood(record, bestBefore);
  profile.lastSprocketMood = mood;
  const main = mainPlan(run.stats.plan);
  if (main) profile.planHistory = [...(profile.planHistory ?? []), main].slice(-3);
  // B10a: what Bellfoot remembers: the resident this run sent down, landmarks made, enemies met, lore heard
  rememberRun(profile, run);
  // B9b: finishRun's fixed sequence: RunRecord and Brass -> planHistory -> achievements (unlocks and rewards) -> one save write
  const newAchievements = ACHIEVEMENTS.length > 0 ? checkAchievements(profile, run, record) : [];
  profile.finishedSeeds.push(seed);
  if (profile.finishedSeeds.length > SEEDS_KEPT) profile.finishedSeeds.splice(0, profile.finishedSeeds.length - SEEDS_KEPT);

  const newNotes = profile.storyFlags.filter((f) => !before.has(f) && STORY_NOTES.some((n) => n.id === f));
  return { record, mood, brass, newUnlocks, newNotes, newAchievements };
}

/** B10a: a run's memory goes into the profile in finishRun's one write (rules 5.4): the resident its event sent to Bellfoot
 * (won, lost or abandoned), the landmarks it made (`flags['landmark:id']`), the enemies met (the bestiary), and the lore moments
 * heard (progress keys `lore-*` for e-lore, plus their journal pages). */
function rememberRun(profile: Profile, run: RunState): void {
  const addTo = (list: string[], id: string): void => {
    if (!list.includes(id)) list.push(id);
  };
  if (run.resident) addTo((profile.residents ??= []), run.resident);
  for (const k of Object.keys(run.flags)) if (k.startsWith('landmark:') && run.flags[k]) addTo((profile.landmarks ??= []), k.slice('landmark:'.length));
  for (const id of run.met ?? []) addTo((profile.bestiary ??= []), id);
  for (const m of run.lore ?? []) {
    profile.achievementProgress[`lore-${m}`] = 1;
    if (JOURNAL_BY_ID[`lore-${m}`]) addTo((profile.journal ??= []), `lore-${m}`);
  }
}

/** The Workshop notes unlocked so far, oldest first (wall order). */
export function workshopNotes(profile: Profile): { id: string; title: string; text: string }[] {
  return STORY_NOTES.filter((n) => profile.storyFlags.includes(n.id));
}
