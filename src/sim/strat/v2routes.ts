// v2 route policies for the climb (docs/acceptance.md BV11). Same combat bot for every policy, so only the routing differs:
//   expert: plans the hours (fights for salvage while there is time, heals at oil when hurt, trades, uses keys for vaults,
//           rings the bell when its machine is ready);
//   rusher: walks straight to the door and rings the bell at once;
//   grinder: clears every fight room it can reach before the clock runs out.
// The combat bot is the v2 expert with a narrower beam (a climb is about 60 turns; the full beam is for the fight report).
import { defaultRunConfig } from '../../core/run';
import { mainPlan } from '../../core/record';
import { playClimb } from './climb';
import type { RoutePolicy } from './climb';
import { makeExpert2 } from './v2combat';

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
}

export const ROUTE_COMBAT = makeExpert2({ width: 6, swapStates: 2, finalists: 3 });

export interface RouteRun {
  /** The run's main plan (plating, burst, pressure, statuses), or null when it dealt and gained nothing. */
  plan: ReturnType<typeof mainPlan>;
  won: boolean;
  act: number;
  illegal: string[];
}

/** One Journeyman climb (no meta progression); the run seed and the bot seed come from (seed, index) only. */
export function routeRun(policy: RoutePolicyV2, seed: number, index: number): RouteRun {
  const cfg = { ...defaultRunConfig(seed * 100003 + index), legacyMap: false };
  const r = playClimb(cfg, seed * 31 + index, policy, ROUTE_COMBAT);
  return { plan: mainPlan(r.run.stats.plan), won: r.won, act: r.act, illegal: r.illegal };
}

export function summarize(policy: RoutePolicyV2, rows: RouteRun[]): RouteStatsV2 {
  const n = rows.length;
  return { policy, runs: n, winRate: rows.filter((r) => r.won).length / Math.max(1, n), actReached: rows.reduce((a, r) => a + r.act, 0) / Math.max(1, n) };
}

/** Play `runs` Journeyman runs per policy (no meta progression) and report each policy's win rate. Deterministic. */
export function routeStatsV2(o: RouteOptsV2): RouteStatsV2[] {
  return o.policies.map((p) => summarize(p, Array.from({ length: o.runs }, (_, i) => routeRun(p, o.seed, i))));
}
