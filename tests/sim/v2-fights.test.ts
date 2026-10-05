// B7 acceptance: no single strategy trivializes v2 fights (docs/acceptance.md BV3 normals and elites, BV6, BV8;
// rules 7.4 targets 3, 6, 7). Fixed seeds; the bots play. Written by the orchestrator in the B7 contract step.
import { describe, expect, it } from 'vitest';
import { enemyDef } from '../../src/core/content/enemies';
import { fightStatsV2, wardenStatsV2, type V2FightStats } from '../../src/sim/strat/v2';

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

  it('BV4: expert medians Foreman 6 to 9, Queen 7 to 10, Clockmaker 8 to 12 turns; expert and max-burst spend 2+ turns in every phase and 3+ in the last (100 fights each)', { timeout: 600_000 }, () => {
    const rows = wardenStatsV2({ seed: 1, fights: 100, bots: ['expert', 'maxburst'] });
    const cell = (bot: string, warden: string) => {
      const r = rows.find((x) => x.bot === bot && x.warden === warden);
      if (!r) throw new Error(`no warden stats for ${bot} vs ${warden}`);
      return r;
    };
    const medians: Record<string, [number, number]> = { foreman: [6, 9], boilermaker: [7, 10], clockmaker: [8, 12] };
    for (const [warden, [lo, hi]] of Object.entries(medians)) {
      const m = cell('expert', warden).turnsMedian;
      expect(m, `expert median turns vs ${warden}`).toBeGreaterThanOrEqual(lo);
      expect(m, `expert median turns vs ${warden}`).toBeLessThanOrEqual(hi);
    }
    for (const bot of ['expert', 'maxburst']) {
      for (const warden of Object.keys(medians)) {
        const r = cell(bot, warden);
        expect(r.fights, `${bot} vs ${warden} fights`).toBe(100);
        const phases = enemyDef(warden).frame?.phases?.length ?? 0;
        expect(phases, `${warden} has phases`).toBeGreaterThan(0);
        expect(r.phaseTurnsMin).toHaveLength(phases);
        r.phaseTurnsMin.forEach((n, i) => expect(n, `${bot} vs ${warden}, phase ${i + 1} of ${phases}`).toBeGreaterThanOrEqual(i === phases - 1 ? 3 : 2));
      }
    }
  });

  it('BV6: the expert decides in under 50 ms per turn on average', () => {
    for (const act of [1, 2, 3] as const) for (const tier of ['normal', 'elite']) expect(get('expert', act, tier).msPerTurn).toBeLessThan(50);
  });
});
