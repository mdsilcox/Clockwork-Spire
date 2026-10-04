// B7 acceptance: no single strategy trivializes v2 fights (docs/acceptance.md BV3 normals and elites, BV6, BV8;
// rules 7.4 targets 3, 6, 7). Fixed seeds; the bots play. Written by the orchestrator in the B7 contract step.
import { describe, expect, it } from 'vitest';
import { fightStatsV2, type V2FightStats } from '../../src/sim/strat/v2';

describe('v2 fights: strategy bots', () => {
  let stats: V2FightStats[] = [];
  const get = (bot: string, act: number, tier: string): V2FightStats => {
    const s = stats.find((x) => x.bot === bot && x.act === act && x.tier === tier);
    if (!s) throw new Error(`no stats for ${bot} act ${act} ${tier}`);
    return s;
  };

  it('runs the report', { timeout: 600_000 }, () => {
    stats = fightStatsV2({ seed: 1, fightsPerTier: 40, bots: ['turtle', 'burst', 'expert'] });
    expect(stats.length).toBe(3 * 3 * 2);
  });

  for (const act of [1, 2, 3] as const) {
    it(`BV3 act ${act}: turtle and burst lose at least 1.5x the expert's HP on elites`, () => {
      const ex = get('expert', act, 'elite').hpLostMean;
      expect(get('turtle', act, 'elite').hpLostMean).toBeGreaterThanOrEqual(1.5 * ex);
      expect(get('burst', act, 'elite').hpLostMean).toBeGreaterThanOrEqual(1.5 * ex);
    });
    it(`BV3 act ${act}: turtle and burst lose at least 10% of max HP in normal fights`, () => {
      expect(get('turtle', act, 'normal').hpLostPctMean).toBeGreaterThanOrEqual(0.1);
      expect(get('burst', act, 'normal').hpLostPctMean).toBeGreaterThanOrEqual(0.1);
    });
    it(`BV8 act ${act}: the turtle's Plating fully absorbs at most 40% of enemy turns`, () => {
      const t = [get('turtle', act, 'normal'), get('turtle', act, 'elite')];
      for (const s of t) expect(s.absorbedTurnShare).toBeLessThanOrEqual(0.4);
    });
  }

  it('BV6: the expert decides in under 50 ms per turn on average', () => {
    for (const act of [1, 2, 3] as const) for (const tier of ['normal', 'elite']) expect(get('expert', act, tier).msPerTurn).toBeLessThan(50);
  });
});
