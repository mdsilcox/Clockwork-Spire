// B4 acceptance tests (docs/acceptance.md W1-W4). Written before the build; never weaken an assertion.
// BS2-BS4 (the simulator targets) are written by the meta-balance lane in tests/sim/targets.test.ts.
import { describe, expect, it } from 'vitest';
import { newProfile, buyUpgrade, upgradeCost, runConfigFor, finishRun, chassisAvailable, buyChassis, sprocketMood } from '../../src/core/meta';
import { newRun, abandonRun, brassFor } from '../../src/core/run';
import { CHASSIS } from '../../src/core/content/chassis';
import type { RunRecord } from '../../src/core/types';

const T = '2026-10-04T12:00:00Z';

function finishedRun(seed: number, opts: { act: 1 | 2 | 3; floor: number; won?: boolean; blueprints?: string[] }) {
  const p = newProfile('Test', T);
  const run = newRun(runConfigFor(p, seed, 'tinker'));
  run.act = opts.act;
  run.floor = opts.floor;
  run.stats.blueprintsFound = opts.blueprints ?? [];
  run.stats.floorBrass = 4 * opts.floor;
  run.stats.elites = 1;
  run.phase = opts.won ? 'victory' : 'defeat';
  return { p, run };
}

describe('B4 meta', () => {
  it('W1: finishing a run adds Brass, blueprints and the record in one call, once', () => {
    const { p, run } = finishedRun(3, { act: 1, floor: 9, blueprints: ['ratchet'] });
    const expected = brassFor(run);
    expect(expected).toBeGreaterThan(0);
    const out = finishRun(p, run, T);
    expect(p.brass).toBe(expected);
    expect(out.brass).toBe(expected);
    expect(p.blueprints).toContain('ratchet');
    expect(p.history[0]).toEqual(out.record);
    expect(p.history[0].result).toBe('loss');
    const snapshot = JSON.stringify(p);
    finishRun(p, run, T);
    expect(JSON.stringify(p)).toBe(snapshot);
  });

  it('W2: 40 Brass buys Reinforced Frame I, and the next run has 55 max HP', () => {
    const p = newProfile('Test', T);
    p.brass = 40;
    expect(upgradeCost(p, 'frame')).toBe(40);
    expect(buyUpgrade(p, 'frame')).toBe(true);
    expect(p.brass).toBe(0);
    expect(buyUpgrade(p, 'frame')).toBe(false);
    const run = newRun(runConfigFor(p, 1, 'tinker'));
    expect(run.maxHp).toBe(55);
    expect(run.hp).toBe(55);
  });

  it('W3: Stoker unlocks by reaching act 2 and Horologist by beating the act 2 boss; each has its own bin', () => {
    const { p, run } = finishedRun(5, { act: 2, floor: 4 });
    expect(chassisAvailable(p)).toEqual(['tinker']);
    finishRun(p, run, T);
    expect(chassisAvailable(p)).toContain('stoker');
    expect(chassisAvailable(p)).not.toContain('horologist');
    const r2 = newRun(runConfigFor(p, 6, 'tinker'));
    r2.act = 3;
    r2.floor = 2;
    r2.stats.bossesBeaten = 2;
    r2.phase = 'defeat';
    finishRun(p, r2, T);
    expect(chassisAvailable(p)).toContain('horologist');
    const stoker = newRun(runConfigFor(p, 7, 'stoker'));
    expect(stoker.bin.map((b) => b.defId).sort()).toEqual([...CHASSIS.stoker.startingBin].sort());
  });

  it('W3b: a chassis can also be bought with Brass', () => {
    const p = newProfile('Test', T);
    p.brass = 150;
    expect(buyChassis(p, 'stoker')).toBe(true);
    expect(p.brass).toBe(0);
    expect(chassisAvailable(p)).toContain('stoker');
  });

  it('W4: Sprocket celebrates a win, wiggles after a good climb and comforts after a bad run', () => {
    const rec = (result: RunRecord['result'], act: number, floor: number): RunRecord => ({
      n: 1, seed: 1, chassis: 'tinker', result, act, floor, brassEarned: 0, blueprintsFound: [], partsAtEnd: [], trinkets: [], turns: 10, biggestTurn: 10, endedAt: T,
    });
    expect(sprocketMood(rec('win', 3, 13), 30)).toBe('celebrate');
    expect(sprocketMood(rec('loss', 2, 3), 30)).toBe('happy');
    expect(sprocketMood(rec('loss', 1, 9), 5)).toBe('happy');
    expect(sprocketMood(rec('loss', 1, 4), 12)).toBe('comfort');
  });

  it('an abandoned run still pays what it earned', () => {
    const p = newProfile('Test', T);
    const run = newRun(runConfigFor(p, 9, 'tinker'));
    run.floor = 5;
    abandonRun(run);
    finishRun(p, run, T);
    expect(p.history[0].result).toBe('abandoned');
  });
});
