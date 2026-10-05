// B10c.0 curve baselines (docs/acceptance.md BV1, BV2, BV5, BV10; rules 5.8, 7.4; docs/briefs/B10b-curve.md "Round 2").
// Heavy (minutes on a many-core machine): run with `npm run test:curve`; excluded from `test:unit`. The sims run on a pool
// of worker threads (src/sim/strat/curve.ts); every task is deterministic, so the numbers do not depend on the pool size.
// These are the targets, not today's numbers: they are red until B10c's levers land (see balance/2026-10-05-v2-curve-baseline.md).
import { afterAll, describe, expect, it } from 'vitest';
import { CurvePool, careersV2, climbRates, impactTable } from '../../src/sim/strat/curve';
import type { CareerOut, CareersStats, RateStats } from '../../src/sim/strat/curve';
import { PLATE_PARTS } from '../../src/sim/strat/runbot';
import type { RouteRun } from '../../src/sim/strat/v2routes';

const pool = new CurvePool();
afterAll(() => pool.close());

// Each measurement runs once and is shared by the tests that read it.
const memo = new Map<string, Promise<unknown>>();
const once = <T>(key: string, f: () => Promise<T>): Promise<T> => {
  if (!memo.has(key)) memo.set(key, f());
  return memo.get(key) as Promise<T>;
};

const SEED = 1;
const noMeta = (policy: 'expert' | 'greedy'): Promise<{ stats: RateStats; rows: RouteRun[] }> => once(`rates-${policy}`, () => climbRates(pool, policy, SEED, 300));
const careers = (route: 'expert' | 'greedy'): Promise<{ stats: CareersStats; careers: CareerOut[] }> => once(`careers-${route}`, () => careersV2(pool, route, SEED, 100, { maxRuns: 30 }));
const keepGoing = (): Promise<{ stats: CareersStats; careers: CareerOut[] }> => once('careers-keep', () => careersV2(pool, 'expert', SEED, 100, { maxRuns: 30, continueAfterWin: true }));

const LONG = { timeout: 3_600_000 };

describe('v2 curve (B10c.0 baselines)', () => {
  it('BV1: the expert with no meta wins under 5% of 300 Journeyman runs', LONG, async () => {
    const { stats } = await noMeta('expert');
    console.log(`BV1 expert: ${(stats.winRate * 100).toFixed(1)}% (reach act 2 ${(stats.reach2 * 100).toFixed(0)}%, act 3 ${(stats.reach3 * 100).toFixed(0)}%)`);
    expect(stats.runs).toBe(300);
    expect(stats.winRate).toBeLessThan(0.05);
  });

  it('BV1: the greedy bot with no meta wins under 2% of 300 Journeyman runs', LONG, async () => {
    const { stats } = await noMeta('greedy');
    console.log(`BV1 greedy: ${(stats.winRate * 100).toFixed(1)}%`);
    expect(stats.runs).toBe(300);
    expect(stats.winRate).toBeLessThan(0.02);
  });

  it('BV2: 100 expert careers on the sensible path have a median first win between run 8 and 12', LONG, async () => {
    const { stats } = await careers('expert');
    console.log(`BV2 expert careers: median ${stats.median} (q1 ${stats.q1}, q3 ${stats.q3}), never won ${stats.neverWon}, Masterwork parts unlocked at the first win (median over winners) ${stats.masterworkPartsAtWinMedian}`);
    expect(stats.careers).toBe(100);
    expect(stats.median).toBeGreaterThanOrEqual(8);
    expect(stats.median).toBeLessThanOrEqual(12);
  });

  it('BV10: 100 greedy careers have a median first win at most run 20', LONG, async () => {
    const { stats } = await careers('greedy');
    console.log(`BV10 greedy careers: median ${stats.median} (q1 ${stats.q1}, q3 ${stats.q3}), never won ${stats.neverWon}, Masterwork parts at the first win (median over winners) ${stats.masterworkPartsAtWinMedian}`);
    expect(stats.careers).toBe(100);
    expect(stats.median).toBeLessThanOrEqual(20);
  });

  it('BV5: offer-based part impact: the highest is at most 2x the median', LONG, async () => {
    const { careers: cs } = await keepGoing();
    const imp = impactTable(cs.flatMap((c) => c.runs));
    const max = imp.imps.length ? imp.imps[imp.imps.length - 1] : null;
    console.log(`BV5 impact: median ${imp.med?.toFixed(2)}, max ${max?.toFixed(2)} (${imp.imps.length} measured of ${imp.ids.length}); flagged ${imp.flagged.join(', ') || 'none'}`);
    expect(imp.med).not.toBeNull();
    expect(imp.imps.length).toBeGreaterThanOrEqual(10);
    expect(max as number).toBeLessThanOrEqual(2 * (imp.med as number));
  });

  it('Plating viability: an expert drafting for Plating reaches act 2 at least 60% and act 3 at least 50% as often as the base expert (600 runs each)', LONG, async () => {
    const base = await once('plating-base', () => climbRates(pool, 'expert', SEED, 600));
    const heavy = await once('plating-heavy', () => climbRates(pool, 'expert', SEED, 600, { platingBias: 4 }));
    // the bias is the expert's drafting only (its combat is unchanged); the check is only meaningful if the bins really hold more Plating parts
    const held = (rows: RouteRun[]): number => rows.reduce((a, r) => a + r.bin.filter((id) => PLATE_PARTS.has(id)).length, 0) / rows.length;
    console.log(`Plating: Plating parts in the final bin ${held(base.rows).toFixed(2)} (base) against ${held(heavy.rows).toFixed(2)} (biased); reach2 ${(base.stats.reach2 * 100).toFixed(1)}% against ${(heavy.stats.reach2 * 100).toFixed(1)}% (${((heavy.stats.reach2 / base.stats.reach2) * 100).toFixed(0)}% of base); reach3 ${(base.stats.reach3 * 100).toFixed(1)}% against ${(heavy.stats.reach3 * 100).toFixed(1)}% (${((heavy.stats.reach3 / base.stats.reach3) * 100).toFixed(0)}% of base)`);
    expect(heavy.stats.runs).toBeGreaterThanOrEqual(600);
    expect(held(heavy.rows)).toBeGreaterThanOrEqual(1.5 * held(base.rows));
    expect(heavy.stats.reach2).toBeGreaterThanOrEqual(0.6 * base.stats.reach2);
    expect(heavy.stats.reach3).toBeGreaterThanOrEqual(0.5 * base.stats.reach3);
  });
});
