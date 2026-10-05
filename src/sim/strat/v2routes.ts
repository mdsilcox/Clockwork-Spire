// v2 route policies for the climb (docs/acceptance.md BV11). Same combat bot for every policy, so only the routing differs:
//   expert: plans the hours (fights for salvage while there is time, heals at oil when hurt, trades, uses keys for vaults,
//           rings the bell when its machine is ready);
//   rusher: walks straight to the door and rings the bell at once;
//   grinder: clears every fight room it can reach before the clock runs out.
// The combat bot is the v2 expert with a narrower beam (a climb is about 60 turns; the full beam is for the fight report).
import { defaultRunConfig } from '../../core/run';
import { mainPlan } from '../../core/record';
import { ACHIEVEMENTS } from '../../core/content/achievements';
import { earnAchievement } from '../../core/achievements';
import { newProfile, runConfigFor } from '../../core/meta';
import type { Profile, RunConfig } from '../../core/types';
import { playClimb } from './climb';
import { DRAFT } from './runbot';
import type { RoutePolicy } from './climb';
import { makeExpert2, turtle2 } from './v2combat';

export type RoutePolicyV2 = RoutePolicy;

export interface RouteStatsV2 {
  policy: RoutePolicyV2;
  runs: number;
  /** Wins / runs, 0..1. */
  winRate: number;
  /** Mean of the furthest act each run reached (1..3). */
  actReached: number;
}

export interface RouteOptsV2 {
  seed: number;
  runs: number;
  policies: RoutePolicyV2[];
  /** B10b: the difficulty mode every run is played on (default 'journeyman'); the ladder test plays all four. */
  mode?: string;
}

export const ROUTE_COMBAT = makeExpert2({ width: 6, swapStates: 2, finalists: 3 });

export interface RouteRun {
  /** The run's main plan (plating, burst, pressure, statuses), or null when it dealt and gained nothing. */
  plan: ReturnType<typeof mainPlan>;
  won: boolean;
  act: number;
  illegal: string[];
  /** Part offers (trader, fuse, salvage, reward) with whether each was taken, and the trinkets held at the end. */
  offers: { partId: string; taken: boolean; act: number }[];
  /** Bosses beaten (an act-1 or act-2 offer is judged by that act's boss, an act-3 offer by the win). */
  bossesBeaten: number;
  /** B10c: the enemy that ended the run (the first living enemy at the defeat), when it lost in a fight. */
  killedBy?: string;
  trinkets: string[];
  /** The parts in the bin at the end. */
  bin: string[];
}

export interface RouteRunOpts {
  /** A profile with every available achievement earned: every reachable Masterwork and both Sprocket items are in the pool. */
  rarity?: boolean;
  /** B10b: the difficulty mode (RunConfig.mode); missing: journeyman. */
  mode?: string;
  /** B10c.0: a Plating drafting bias for any policy (the Plating viability check plays the expert's combat with this set). */
  platingBias?: number;
  /** B10c.0 lever probes: bench upgrade levels (id to level) and chassis, run through `runConfigFor` on a fresh profile; and a final patch on the RunConfig. */
  upgrades?: Record<string, number>;
  chassis?: string;
  patch?: Partial<RunConfig>;
}

/** A fresh profile with every available achievement earned (the B9b.5 input). */
export function allEarnedProfile(): Profile {
  const at = '1970-01-01T00:00:00Z';
  const profile = newProfile('sim', at);
  for (const a of ACHIEVEMENTS) earnAchievement(profile, a.id, at);
  return profile;
}

const PLATER_COMBAT = turtle2;

/** One Journeyman climb (no meta progression); the run seed and the bot seed come from (seed, index) only. */
export function routeRun(policy: RoutePolicyV2, seed: number, index: number, opts: RouteRunOpts = {}): RouteRun {
  const sd = seed * 100003 + index;
  let cfg: RunConfig;
  if (opts.rarity || opts.upgrades || opts.chassis) {
    const profile = opts.rarity ? allEarnedProfile() : newProfile('sim', '1970-01-01T00:00:00Z');
    if (opts.upgrades) Object.assign(profile.upgrades, opts.upgrades);
    cfg = runConfigFor(profile, sd, opts.chassis ?? 'tinker');
  } else cfg = { ...defaultRunConfig(sd), legacyMap: false };
  if (opts.patch) Object.assign(cfg, opts.patch);
  if (opts.mode !== undefined) cfg.mode = opts.mode; // B10b
  DRAFT.plating = opts.platingBias ?? (policy === 'plater' ? 2 : 0);
  try {
    const r = playClimb(cfg, seed * 31 + index, policy, policy === 'plater' ? PLATER_COMBAT : ROUTE_COMBAT);
    return {
      plan: mainPlan(r.run.stats.plan),
      won: r.won,
      act: r.act,
      illegal: r.illegal,
      offers: r.run.stats.offers.map((o) => ({ partId: o.partId, taken: o.taken, act: o.act })),
      bossesBeaten: r.run.stats.bossesBeaten,
      killedBy: r.run.killedBy,
      trinkets: r.run.trinkets.slice(),
      bin: r.run.bin.map((p) => p.defId),
    };
  } finally {
    DRAFT.plating = 0;
  }
}

export function summarize(policy: RoutePolicyV2, rows: RouteRun[]): RouteStatsV2 {
  const n = rows.length;
  return { policy, runs: n, winRate: rows.filter((r) => r.won).length / Math.max(1, n), actReached: rows.reduce((a, r) => a + r.act, 0) / Math.max(1, n) };
}

/** Play `runs` Journeyman runs per policy (no meta progression) and report each policy's win rate. Deterministic. */
export function routeStatsV2(o: RouteOptsV2): RouteStatsV2[] {
  return o.policies.map((p) => summarize(p, Array.from({ length: o.runs }, (_, i) => routeRun(p, o.seed, i, o.mode !== undefined ? { mode: o.mode } : {}))));
}
