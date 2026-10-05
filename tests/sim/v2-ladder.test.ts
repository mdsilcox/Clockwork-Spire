// B10b acceptance (sim, HEAVY: 4 modes x 300 expert climbs, a few minutes): the difficulty ladder (docs/briefs/B10b-curve.md "Round 2"
// M6 and "Round 2 additions": "Ladder test"). Written by the orchestrator's test-porter in the B10b.0 contract step.
// The expert route bot plays the same 300 seeds on each mode. Over them the win rate does not rise from Apprentice to Clockwork, the
// mean act reached falls strictly, and Apprentice's mean act is at least 0.5 above Clockwork's. (Not "strictly decreasing win rates":
// near 0% the harder modes tie at zero, and the assertion must still hold after B10c's retune; B10c re-validates it.)
// Needs `routeStatsV2({ mode })` (src/sim/strat/v2routes.ts takes a mode and sets RunConfig.mode: added by the contract step).
// Today every mode plays like Journeyman, so the mean acts are equal and the strict assertions fail until the modes apply.
import { describe, expect, it } from 'vitest';
import { routeStatsV2, type RouteStatsV2 } from '../../src/sim/strat/v2routes';

const MODES = ['apprentice', 'journeyman', 'master', 'clockwork'] as const;

describe('B10b ladder: the expert on each mode (300 runs per mode)', () => {
  const stats: Record<string, RouteStatsV2> = {};

  it('plays 300 expert runs on each of the four modes', { timeout: 3_600_000 }, () => {
    for (const mode of MODES) {
      const s = routeStatsV2({ seed: 1, runs: 300, policies: ['expert'], mode })[0];
      expect(s.runs).toBe(300);
      stats[mode] = s;
      console.log(`ladder ${mode}: win ${(s.winRate * 100).toFixed(1)}%, mean act ${s.actReached.toFixed(2)}`);
    }
    expect(Object.keys(stats)).toEqual([...MODES]);
  });

  it('the win rate does not increase from Apprentice to Clockwork', () => {
    const w = MODES.map((m) => stats[m]?.winRate ?? NaN);
    for (let i = 1; i < w.length; i++) expect(w[i], `${MODES[i]} wins no more often than ${MODES[i - 1]}`).toBeLessThanOrEqual(w[i - 1]);
  });

  it('the mean act reached strictly decreases from Apprentice to Clockwork', () => {
    const a = MODES.map((m) => stats[m]?.actReached ?? NaN);
    for (let i = 1; i < a.length; i++) expect(a[i], `${MODES[i]} reaches fewer acts than ${MODES[i - 1]}`).toBeLessThan(a[i - 1]);
  });

  it("Apprentice's mean act is at least 0.5 above Clockwork's", () => {
    expect(stats.apprentice?.actReached - stats.clockwork?.actReached).toBeGreaterThanOrEqual(0.5);
  });
});
