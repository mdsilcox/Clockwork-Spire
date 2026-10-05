// Meta-progression: profiles, the upgrade bench, chassis unlocks, run settlement, Sprocket's mood.
// Pure: no DOM, no clock (times are passed in).
import { CHASSIS } from './content/chassis';
import { STORY_NOTES } from './content/story';
import { ACHIEVEMENTS } from './content/achievements';
import { TRINKETS } from './content/trinkets';
import { checkAchievements } from './achievements';
import { UPGRADES } from './content/upgrades';
import { split } from './rng';
import { mainPlan, memoryPlan } from './record';
import { absoluteFloor, brassFor, runRecord } from './run';
import type { Profile, RunConfig, RunRecord, RunState, SprocketMood } from './types';

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
  return {
    seed,
    chassis,
    maxHp: 50 + 5 * lv('frame'),
    cogs: 25 * lv('scrap'),
    handSize: lv('toolbelt') >= 1 ? 4 : 3,
    upgradedStarters: lv('bearings'),
    trinkets: lv('charm') >= 1 ? [commonTrinketFor(seed)] : [],
    unlockedParts: profile.blueprints.slice(),
    rewardChoices: lv('notes') >= 1 ? 4 : 3,
    extraEliteBlueprint: lv('notes') >= 2,
    secondWind: lv('secondwind') >= 1,
    memory: memoryPlan(profile.planHistory),
  };
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
  const brass = brassFor(run);
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
  // B9b: finishRun's fixed sequence: RunRecord and Brass -> planHistory -> achievements (unlocks and rewards) -> one save write
  const newAchievements = ACHIEVEMENTS.length > 0 ? checkAchievements(profile, run, record) : [];
  profile.finishedSeeds.push(seed);
  if (profile.finishedSeeds.length > SEEDS_KEPT) profile.finishedSeeds.splice(0, profile.finishedSeeds.length - SEEDS_KEPT);

  const newNotes = profile.storyFlags.filter((f) => !before.has(f) && STORY_NOTES.some((n) => n.id === f));
  return { record, mood, brass, newUnlocks, newNotes, newAchievements };
}

/** The Workshop notes unlocked so far, oldest first (wall order). */
export function workshopNotes(profile: Profile): { id: string; title: string; text: string }[] {
  return STORY_NOTES.filter((n) => profile.storyFlags.includes(n.id));
}
