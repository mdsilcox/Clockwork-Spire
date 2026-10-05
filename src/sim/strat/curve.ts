// B10c.0 measurement library: v2 careers (BV2, BV10), the offer-based impact table (BV5), win rates over many climbs (BV1)
// and the Plating reach rates, all run on a pool of worker threads (every task is independent and deterministic, so the
// numbers do not depend on the pool size). `careersV2` plays the same career as the in-game autoplay (src/app/autoplay.ts):
// the same seeds, the same SENSIBLE_PATH bought before each run, the same chassis rotation, the same route and combat.
// Deterministic: no clock for decisions, no Math.random.
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { CHASSIS } from '../../core/content/chassis';
import { PARTS } from '../../core/content/parts';
import { TRINKETS } from '../../core/content/trinkets';
import { UPGRADES } from '../../core/content/upgrades';
import { buyUpgrade, chassisAvailable, finishRun, newProfile, runConfigFor, upgradeCost } from '../../core/meta';
import { achievementUnlocks } from '../../core/pool';
import type { Profile } from '../../core/types';
import { SENSIBLE_PATH } from '../career';
import { impactOf } from '../run-report';
import type { RunResult } from '../run';
import { playClimb } from './climb';
import type { RoutePolicy } from './decide';
import { routeRun } from './v2routes';
import type { RouteRun, RouteRunOpts } from './v2routes';
import { makeExpert2 } from './v2combat';

export const CAREER_ROUTES = ['expert', 'greedy'] as const;
export type CareerRoute = (typeof CAREER_ROUTES)[number];

const AT = '1970-01-01T00:00:00Z';

export interface CareerRunOut {
  n: number;
  won: boolean;
  act: number;
  chassis: string;
  bossesBeaten: number;
  offers: { partId: string; taken: boolean; act: number }[];
  /** Brass spent on upgrades before this run started. */
  brassSpent: number;
}

export interface CareerOut {
  /** 1-based run number of the first win, or null within the cap. */
  firstWin: number | null;
  runs: CareerRunOut[];
  /** Masterwork parts and trinkets in the achievement-unlocked pool at the first win (at the end without one). */
  masterworkParts: number;
  masterworkTrinkets: number;
  achievements: number;
}

export interface CareerOptsV2 {
  /** The career's base seed (the autoplay's `seed`): runs use seed * 1000003 + i * 7 + 1 and bot seed seed * 977 + i. */
  seed: number;
  route: CareerRoute;
  maxRuns?: number;
  continueAfterWin?: boolean;
  path?: string[];
}

const COMBAT = makeExpert2({ width: 6, swapStates: 2, finalists: 3 });

function masterworks(profile: Profile): { parts: number; trinkets: number } {
  const u = achievementUnlocks(profile);
  const parts = new Set(u.parts.filter((id) => PARTS[id]?.rarity === 'masterwork'));
  const trinkets = new Set(u.trinkets.filter((id) => TRINKETS[id]?.rarity === 'masterwork'));
  return { parts: parts.size, trinkets: trinkets.size };
}

/** One career: a fresh profile, upgrades bought along the sensible path before each run, achievements earned by `finishRun`
 * (their unlocks enter the next run's pool through `runConfigFor`), until the first win or the cap. */
export function playCareerV2(o: CareerOptsV2): CareerOut {
  const maxRuns = o.maxRuns ?? 30;
  const profile = newProfile('sim', AT);
  const path = o.path ?? SENSIBLE_PATH;
  let cursor = 0;
  const runs: CareerRunOut[] = [];
  let firstWin: number | null = null;
  let atWin: { parts: number; trinkets: number } | null = null;
  for (let i = 0; i < maxRuns; i++) {
    while (cursor < path.length) {
      const id = path[cursor];
      if (!UPGRADES[id] || upgradeCost(profile, id) === null) {
        cursor += 1;
        continue;
      }
      if (!buyUpgrade(profile, id)) break;
      cursor += 1;
    }
    const avail = chassisAvailable(profile).filter((id) => CHASSIS[id]);
    const chassis = avail[i % avail.length];
    const cfg = runConfigFor(profile, o.seed * 1000003 + i * 7 + 1, chassis);
    const brassSpent = profile.brassEarnedTotal - profile.brass;
    const r = playClimb(cfg, o.seed * 977 + i, o.route as RoutePolicy, COMBAT);
    runs.push({
      n: i + 1,
      won: r.won,
      act: r.act,
      chassis,
      bossesBeaten: r.run.stats.bossesBeaten,
      offers: r.run.stats.offers.map((x) => ({ partId: x.partId, taken: x.taken, act: x.act })),
      brassSpent,
    });
    finishRun(profile, r.run, AT);
    if (r.won && firstWin === null) {
      firstWin = i + 1;
      atWin = masterworks(profile);
      if (!o.continueAfterWin) break;
    }
  }
  const m = atWin ?? masterworks(profile);
  return { firstWin, runs, masterworkParts: m.parts, masterworkTrinkets: m.trinkets, achievements: Object.keys(profile.achievements ?? {}).length };
}

// ---------- tasks and the pool ----------

export type CurveTask = { kind: 'route'; policy: RoutePolicy; seed: number; index: number; opts: RouteRunOpts } | { kind: 'career'; opts: CareerOptsV2 };

export type CurveResult = { kind: 'route'; run: RouteRun } | { kind: 'career'; career: CareerOut };

export function runCurveTask(t: CurveTask): CurveResult {
  if (t.kind === 'route') return { kind: 'route', run: routeRun(t.policy, t.seed, t.index, t.opts) };
  return { kind: 'career', career: playCareerV2(t.opts) };
}

export class CurvePool {
  private workers: Worker[] = [];
  constructor(n = Math.max(1, Math.min(20, availableParallelism() - 2))) {
    for (let i = 0; i < n; i++) this.workers.push(new Worker(new URL('./curveworker.ts', import.meta.url), { execArgv: ['--import', 'tsx'] }));
  }
  /** Run the tasks on the workers; results come back in task order. */
  run(tasks: CurveTask[]): Promise<CurveResult[]> {
    return new Promise((resolve, reject) => {
      const results: CurveResult[] = new Array(tasks.length);
      let next = 0;
      let done = 0;
      if (tasks.length === 0) return resolve(results);
      const feed = (w: Worker): void => {
        if (next >= tasks.length) return;
        const id = next++;
        w.postMessage({ id, task: tasks[id] });
      };
      const cleanup = (): void => {
        for (const x of this.workers) {
          x.removeAllListeners('message');
          x.removeAllListeners('error');
        }
      };
      for (const w of this.workers) {
        w.on('message', (m: { id: number; result: CurveResult }) => {
          results[m.id] = m.result;
          done += 1;
          if (done === tasks.length) {
            cleanup();
            resolve(results);
          } else feed(w);
        });
        w.on('error', (e) => {
          cleanup();
          reject(e);
        });
        feed(w);
      }
    });
  }
  close(): Promise<number[]> {
    return Promise.all(this.workers.map((w) => w.terminate()));
  }
}

// ---------- the measurements ----------

export interface RateStats {
  runs: number;
  /** Wins / runs, 0..1. */
  winRate: number;
  /** Share of runs that reached act 2 (at least) and act 3. */
  reach2: number;
  reach3: number;
  meanAct: number;
}

export function rateStats(rows: { won: boolean; act: number }[]): RateStats {
  const n = Math.max(1, rows.length);
  return {
    runs: rows.length,
    winRate: rows.filter((r) => r.won).length / n,
    reach2: rows.filter((r) => r.act >= 2).length / n,
    reach3: rows.filter((r) => r.act >= 3).length / n,
    meanAct: rows.reduce((a, r) => a + r.act, 0) / n,
  };
}

/** No-meta Journeyman climbs of one policy (BV1; with `platingBias` the Plating viability runs). */
export async function climbRates(pool: CurvePool, policy: RoutePolicy, seed: number, runs: number, opts: RouteRunOpts = {}): Promise<{ stats: RateStats; rows: RouteRun[] }> {
  const res = await pool.run(Array.from({ length: runs }, (_, index) => ({ kind: 'route' as const, policy, seed, index, opts })));
  const rows = res.map((r) => (r as { run: RouteRun }).run);
  return { stats: rateStats(rows), rows };
}

export interface CareersStats {
  route: CareerRoute;
  careers: number;
  /** First win run of each career, sorted; no win by the cap counts as cap + 1. */
  firsts: number[];
  median: number;
  q1: number;
  q3: number;
  neverWon: number;
  /** Median Masterwork parts and trinkets unlocked by the first win (careers with no win: at their end). */
  masterworkPartsMedian: number;
  masterworkTrinketsMedian: number;
  /** The same over the careers that won. */
  masterworkPartsAtWinMedian: number;
  runsPlayed: number;
}

export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function careersStats(route: CareerRoute, careers: CareerOut[], maxRuns = 30): CareersStats {
  const firsts = careers.map((c) => c.firstWin ?? maxRuns + 1).sort((a, b) => a - b);
  const num = (xs: number[]): number[] => xs.slice().sort((a, b) => a - b);
  const won = careers.filter((c) => c.firstWin !== null);
  return {
    route,
    careers: careers.length,
    firsts,
    median: quantile(firsts, 0.5),
    q1: quantile(firsts, 0.25),
    q3: quantile(firsts, 0.75),
    neverWon: careers.length - won.length,
    masterworkPartsMedian: quantile(num(careers.map((c) => c.masterworkParts)), 0.5),
    masterworkTrinketsMedian: quantile(num(careers.map((c) => c.masterworkTrinkets)), 0.5),
    masterworkPartsAtWinMedian: quantile(num(won.map((c) => c.masterworkParts)), 0.5),
    runsPlayed: careers.reduce((a, c) => a + c.runs.length, 0),
  };
}

/** `count` careers (base seeds seed * 10007 + i, as v1's careers) on the pool. */
export async function careersV2(pool: CurvePool, route: CareerRoute, seed: number, count: number, extra: Partial<CareerOptsV2> = {}): Promise<{ stats: CareersStats; careers: CareerOut[] }> {
  const res = await pool.run(Array.from({ length: count }, (_, i) => ({ kind: 'career' as const, opts: { seed: seed * 10007 + i, route, ...extra } })));
  const careers = res.map((r) => (r as { career: CareerOut }).career);
  return { stats: careersStats(route, careers, extra.maxRuns ?? 30), careers };
}

/** BV5: offer-based impact over runs (the same table as v1's `impactOf`). */
export function impactTable(rows: { won: boolean; bossesBeaten: number; offers: { partId: string; taken: boolean; act: number }[] }[], minOffers = 30): ReturnType<typeof impactOf> {
  return impactOf(rows as unknown as RunResult[], minOffers);
}
