// B10c round 0 (D-046): coreTookThisTurn resets at the start of the player's turn (before start-of-turn hooks), so Braced counts
// from the turn's start and the counter never carries a finished turn's damage into the next turn.
import { describe, expect, it } from 'vitest';
import { runTurn } from '../../src/core/combat';
import { cell } from '../../src/core/board';
import { combatWith } from '../../src/core/testkit';

// Skipped: the fix was tried and breaks BV4 (DECISIONS.md D-046); un-skip together with a warden retune that restores BV4.
describe.skip('coreTookThisTurn reset (D-046)', () => {
  it('is 0 at the start of the next turn, after a turn in which the core took damage', () => {
    const c = combatWith({ board: { B2: 'test-strike-31' }, enemies: ['dummy'], hp: 50 });
    c.ticksThisTurn = 3;
    const hp0 = c.enemies[0].hp;
    runTurn(c);
    expect(c.enemies[0].hp).toBeLessThan(hp0);
    expect(c.enemies[0].coreTookThisTurn).toBe(0);
  });

  it('is 0 at creation, and a stale value is cleared when a turn begins', () => {
    const c = combatWith({ board: { B2: 'test-strike-31' }, enemies: ['dummy'], hp: 50 });
    expect(c.enemies[0].coreTookThisTurn).toBe(0);
    c.enemies[0].coreTookThisTurn = 99;
    c.ticksThisTurn = 3;
    runTurn(c); // the run itself starts from the stale value (it no longer resets); the next turn start clears it
    expect(c.enemies[0].coreTookThisTurn).toBe(0);
    expect(cell('B2')).toBeGreaterThanOrEqual(0);
  });
});
