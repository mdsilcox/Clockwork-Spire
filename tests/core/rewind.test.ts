// The Clockmaker's Rewind (rules 4.4, 4.9): the part action. See the retirement note at the bottom for what moved to tests/v2/b9-wardens.test.ts.
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

  it('never heals him above his max HP', () => {
    const d = combatWith({ board: { B2: 'spur' }, enemies: ['clockmaker'], hp: 999 });
    d.enemies[0].hp = d.enemies[0].maxHp - 1;
    runTurn(d);
    expect(d.enemies[0].hp).toBeLessThanOrEqual(d.enemies[0].maxHp);
  });

  // RETIRED in B9a (legacy phase machine): 'heals half the damage ... rounded down' (exact numbers of v1's 110 HP Clockmaker),
  // 'phase 1 keeps Pressure; phase 2 resets it', 'phase 3 jams on his 1st, 3rd, 5th turn' and 'a turn that ends a phase keeps the
  // board'. The Rewind rules are kept and tested on the v2 Clockmaker in tests/v2/b9-wardens.test.ts: WP4 (heal exactly half the
  // lifted combination's damage), WP5 (Tock resets Pressure; Midnight jams on even turns only, the old odd-turn Jam is gone) and
  // WP2 (the 1 to 2 phase action is a Rewind, so a turn that ends phase 1 does lift a combination now).
});
