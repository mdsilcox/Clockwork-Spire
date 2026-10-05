// B9b: the achievement facts are counted from a real fight's events (record.ts noteFacts and recordFight), not only set on RunStats:
// a Drill breaking a part under Shell, a Shatter triple, Scald damage, parts broken (docs/briefs/B9b-rarity.md "Achievement facts").
import { describe, expect, it } from 'vitest';
import { runTurn } from '../../src/core/combat';
import { recordFight } from '../../src/core/record';
import { defaultRunConfig, newRun } from '../../src/core/run';
import { combatWith } from '../../src/core/testkit';

const part = (id: string, hp: number) => ({ id, hp, act: 'attack 1' });

describe('facts counted from a real fight', () => {
  it('a Drill breaking a part that Shell protected counts as drillThrough, and the broken part is counted', () => {
    const c = combatWith({ board: { B2: 'test-drill-20' }, ticks: 1, enemies: [{ core: 99, parts: [part('p1', 5), part('p2', 50)] }], order: ['e0.p1'] });
    c.enemies[0].shell = 10;
    runTurn(c);
    const run = newRun(defaultRunConfig(1));
    recordFight(run, c);
    expect(run.stats.drillThrough).toBe(true);
    expect(run.stats.partsBroken).toBe(1);
    expect(c.flags?.fDrill).toBeUndefined(); // moved into the run once
  });

  it('a Drill with nothing protecting the part is not a drill-through', () => {
    const c = combatWith({ board: { B2: 'test-drill-20' }, ticks: 1, enemies: [{ core: 99, parts: [part('p1', 5), part('p2', 50)] }], order: ['e0.p1'] });
    runTurn(c);
    const run = newRun(defaultRunConfig(1));
    recordFight(run, c);
    expect(run.stats.drillThrough).toBeFalsy();
    expect(run.stats.partsBroken).toBe(1);
  });

  it('Shatter breaking three parts of one enemy in one turn counts as shatterTriple', () => {
    const c = combatWith({ board: { B2: 'test-shatter-9' }, ticks: 1, enemies: [{ core: 99, parts: [part('a', 3), part('b', 3), part('c', 3)] }], order: ['e0.a'] });
    runTurn(c);
    const run = newRun(defaultRunConfig(1));
    recordFight(run, c);
    expect(run.stats.partsBroken).toBe(3);
    expect(run.stats.shatterTriple).toBe(true);
  });

  it('Scald damage dealt in the fight is the scaldBest', () => {
    const c = combatWith({ board: {}, ticks: 1, enemies: [{ core: 99, parts: [part('a', 50)] }], order: ['e0.core'] });
    c.enemies[0].statuses.scald = 7;
    runTurn(c);
    const run = newRun(defaultRunConfig(1));
    recordFight(run, c);
    expect(run.stats.scaldBest).toBeGreaterThanOrEqual(7);
  });
});
