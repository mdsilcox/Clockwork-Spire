// B8 acceptance: route policies on the climb (docs/acceptance.md BV11; rules 7.4). Same combat bot, different routes:
// the expert must beat the rusher (straight to the door and an early bell) and the grinder (every fight room).
// Written by the orchestrator's test-porter in the B8.0 contract step. Heavy: 3 policies x 300 runs.
import { describe, expect, it } from 'vitest';
import { routeStatsV2, type RouteStatsV2 } from '../../src/sim/strat/v2routes';

describe('v2 runs: route policies (BV11)', () => {
  let stats: RouteStatsV2[] = [];
  const get = (p: string): RouteStatsV2 => {
    const s = stats.find((x) => x.policy === p);
    if (!s) throw new Error(`no stats for ${p}`);
    return s;
  };

  it('BV11: runs the report, 300 runs per policy', { timeout: 1_800_000 }, () => {
    stats = routeStatsV2({ seed: 1, runs: 300, policies: ['expert', 'rusher', 'grinder'] });
    expect(stats.map((s) => s.policy).sort()).toEqual(['expert', 'grinder', 'rusher']);
    for (const s of stats) {
      expect(s.runs).toBe(300);
      expect(s.winRate).toBeGreaterThanOrEqual(0);
      expect(s.winRate).toBeLessThanOrEqual(1);
      expect(s.actReached).toBeGreaterThanOrEqual(1);
      expect(s.actReached).toBeLessThanOrEqual(3);
    }
  });

  it('BV11: the expert wins more often than the rusher', () => {
    expect(get('expert').winRate).toBeGreaterThan(get('rusher').winRate);
  });

  it('BV11: the expert wins more often than the grinder', () => {
    expect(get('expert').winRate).toBeGreaterThan(get('grinder').winRate);
  });

  it('BV11: the report is deterministic (the same seed twice gives identical stats)', { timeout: 600_000 }, () => {
    const a = routeStatsV2({ seed: 5, runs: 6, policies: ['expert', 'rusher', 'grinder'] });
    const b = routeStatsV2({ seed: 5, runs: 6, policies: ['expert', 'rusher', 'grinder'] });
    expect(b).toEqual(a);
  });
});
