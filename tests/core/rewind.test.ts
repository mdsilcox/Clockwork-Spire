// The Clockmaker's Rewind (rules 4.4) and phases.
import { describe, expect, it } from 'vitest';
import { cell } from '../../src/core/board';
import { runTurn } from '../../src/core/combat';
import { combatWith } from '../../src/core/testkit';
import type { GameEvent } from '../../src/core/types';

const rewinds = (ev: GameEvent[]) => ev.filter((e) => e.kind === 'rewind');

describe('Rewind', () => {
  it('lifts the strongest part and its feeder back to the draw pile (drawn again at once when it is short)', () => {
    const c = combatWith({ board: { B2: 'idler', C2: 'coil' }, enemies: ['clockmaker'], hp: 999 });
    const r = runTurn(c);
    const lifted = rewinds(r.events).map((e) => e.uid!);
    expect(lifted).toHaveLength(2);
    for (const u of lifted) expect([...c.draw, ...c.hand]).toContain(u);
  });

  it('rewinds nothing when no part scored; parts with value 0 are never lifted', () => {
    const c = combatWith({ board: { B2: 'boiler', C2: 'boiler' }, enemies: ['clockmaker'], hp: 999 });
    const r = runTurn(c);
    expect(rewinds(r.events)).toHaveLength(0);
    expect(c.board[cell('B2')]).not.toBeNull();
  });

  it('breaks ties toward the lowest cell', () => {
    const c = combatWith({ board: { B2: 'spur', A1: 'spur' }, enemies: ['clockmaker'], hp: 999 });
    runTurn(c);
    expect(c.board[cell('A1')]).toBeNull();
    expect(c.board[cell('B2')]).not.toBeNull();
  });

  it('heals half the damage the combination dealt, rounded down, never above max HP', () => {
    const c = combatWith({ board: { B2: 'spur' }, enemies: ['clockmaker'], hp: 999 });
    runTurn(c);
    expect(c.enemies[0].hp).toBe(110 - 9 + 4);
    const d = combatWith({ board: { B2: 'spur' }, enemies: ['clockmaker'], hp: 999 });
    d.enemies[0].maxHp = 110;
    d.enemies[0].hp = 100;
    runTurn(d);
    expect(d.enemies[0].hp).toBeLessThanOrEqual(110);
  });

  it('phase 1 keeps Pressure; phase 2 resets it to 0', () => {
    const a = combatWith({ board: { B2: 'boiler', A1: 'spur' }, enemies: ['clockmaker'], hp: 999, pressure: 4 });
    runTurn(a);
    expect(a.pressure).toBe(10);
    const b = combatWith({ board: { B2: 'boiler', A1: 'spur' }, enemies: ['clockmaker'], hp: 999, pressure: 4 });
    b.enemies[0].phase = 1;
    runTurn(b);
    expect(b.pressure).toBe(0);
  });

  it('phase 3 jams on his 1st, 3rd, 5th turn of the phase', () => {
    const c = combatWith({ board: { B2: 'spur' }, enemies: ['clockmaker'], hp: 9999 });
    c.enemies[0].phase = 2;
    const ticks: number[] = [];
    for (let t = 0; t < 4; t++) {
      c.board[cell('B2')] = { uid: 50 + t, defId: 'spur', plus: false, charge: 0, counter: 0, rusted: 0, magnetized: false, firedThisTurn: 0 };
      c.parts[50 + t] = { uid: 50 + t, defId: 'spur', plus: false };
      c.enemies[0].hp = c.enemies[0].maxHp = 150;
      runTurn(c);
      ticks.push(c.ticksThisTurn);
    }
    expect(ticks).toEqual([2, 3, 2, 3]);
  });

  it('a turn that ends a phase keeps the board; the new phase starts at full HP', () => {
    const c = combatWith({ board: { B2: 'spur', C2: 'spur' }, enemies: ['clockmaker'], hp: 999 });
    c.enemies[0].hp = 1;
    const r = runTurn(c);
    expect(rewinds(r.events)).toHaveLength(0);
    expect(c.board[cell('B2')]).not.toBeNull();
    expect(c.enemies[0].hp).toBe(130);
    expect(c.enemies[0].phase).toBe(1);
  });
});
