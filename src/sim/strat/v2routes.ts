// v2 route policies for the climb (docs/acceptance.md BV11). B8 CONTRACT STUB: the strategy-bots lane implements it
// after the climb core merges. Same combat bot for every policy, so only the routing differs:
//   expert: the v2 expert's route (fight the elites it can beat, workbench, trader, oil, ring the bell when ready);
//   rusher: walks straight to the door and rings the bell at once;
//   grinder: clears every fight room it can reach before the clock runs out.
export type RoutePolicyV2 = 'expert' | 'rusher' | 'grinder';

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

/** Play `runs` Journeyman runs per policy (no meta progression) and report each policy's win rate. Deterministic. */
export function routeStatsV2(o: RouteOptsV2): RouteStatsV2[] {
  void o;
  throw new Error('B8: routeStatsV2 not implemented');
}
