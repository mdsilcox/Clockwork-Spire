// The curve, enforced by the balance simulator (docs/rules.md 5.6 and 7). Fixed seeds; the bot plays, not a human.
import { beforeAll, describe, expect, it } from 'vitest';
import { summarizeCareers, playCareers } from '../../src/sim/career-report';
import type { CareersSummary } from '../../src/sim/career-report';
import { playRuns } from '../../src/sim/run-report';

let careers: CareersSummary;

beforeAll(() => {
  careers = summarizeCareers({ seed: 1, careers: 100 }, playCareers({ seed: 1, careers: 100 }));
}, 280_000);

describe('balance targets', () => {
  it('BS2: with no meta progression the bot wins under 3% of runs (300 runs)', () => {
    const runs = playRuns({ seed: 1, runs: 300 });
    const wins = runs.filter((r) => r.won).length;
    console.log(`BS2 no-meta win rate: ${((wins / runs.length) * 100).toFixed(1)}%`);
    expect(wins / runs.length).toBeLessThan(0.03);
  }, 200_000);

  it('BS3: the median first win falls between run 8 and run 12 (100 careers)', () => {
    console.log(`BS3 median first win: ${careers.medianFirstWin}, never won: ${careers.neverWon}`);
    expect(careers.careers).toBe(100);
    expect(careers.medianFirstWin).toBeGreaterThanOrEqual(8);
    expect(careers.medianFirstWin).toBeLessThanOrEqual(12);
  });

  it('BS4: no part win-rate impact is more than double the median', () => {
    console.log(`BS4 impact median ${careers.medianImpact}, max ${careers.maxImpact}`);
    expect(careers.medianImpact).not.toBeNull();
    expect(careers.flagged).toEqual([]);
  });
});
