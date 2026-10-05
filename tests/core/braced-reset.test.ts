// B10c round 0 (D-046): the kept semantics of `coreTookThisTurn`. Resetting it at the start of the player's turn was tried and breaks
// BV4, so the machine run resets it (the preview that closes every turn included): a finished turn leaves it at 0 for the next one.
import { describe, expect, it } from 'vitest';
import { runTurn } from '../../src/core/combat';
import { combatWith } from '../../src/core/testkit';

describe('coreTookThisTurn (D-046: reset by the machine run)', () => {
  it('is 0 when the next turn begins, although the core took damage', () => {
    const c = combatWith({ board: { B2: 'test-strike-31' }, enemies: ['dummy'], hp: 50 });
    c.enemies[0].hp = c.enemies[0].maxHp = 500;
    c.ticksThisTurn = 3;
    runTurn(c);
    expect(c.enemies[0].hp).toBeLessThan(500);
    expect(c.enemies[0].coreTookThisTurn).toBe(0);
  });
});
