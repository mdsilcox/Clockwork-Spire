// B9b acceptance: one behavior test per new item (10 Masterwork and 5 Legendary parts, 4 Masterwork and 2 Legendary
// trinkets), the turn tools, EM7 (preview equals run) over every item, and invariants 2, 3 and 8 as amended
// (docs/content.md sections 2 and 5; docs/briefs/B9b-rarity.md "Semantics" and "Round 2 additions"; docs/acceptance.md EM7).
// Written by the orchestrator's test-porter in the B9b.0 contract step. Lanes may adapt a test to the code but never
// weaken an assertion. The tests are the spec. Describes are named for their owner lane.
//
// HOW ITEMS ARE PLACED: parts straight onto the board with testkit `combatWith` (their def ids), upgraded with a trailing `+`;
// trinkets by pushing the id onto `combat.trinkets`. Locks are not involved here (progression tests those).
//
// HOOKS and NAMES the lanes must provide (the tests read them; nothing else is assumed):
//   - combat.ts `windBack(c: CombatState): boolean` (turn-tools): the Inventor's Watch. Restores `c.watchSnapshot` (everything
//     but `watchSnapshot` and `watchUsed`), sets `c.watchUsed = true`, returns true. Returns false when there is no snapshot, the
//     Watch was used, or the fight was won. Works after a lost Run (the snapshot has outcome 'ongoing').
//     `runTurn` takes the snapshot just before the Run, only while `inventors-watch` is in `c.trinkets`.
//   - combat.ts `swapWithHand(c: CombatState, cell: number, handIndex: number): boolean` (turn-tools): Two Left Hands trades the
//     board part at `cell` with the hand part at `handIndex`; uses one of the two swaps. `swapParts` keeps its signature.
//   - enemy.ts `previewIntents(c, enemyIndex, turnsAhead)` (turn-tools; the contract added a throwing stub):
//     1 = the enemy's next turn (equals its current intents), 2 = the one after. A broken part is gone, a Jam shows (a jammed
//     part's next action is skipped), cadences decide, a quiet turn is [], no standing acting part gives the core Bump.
//   - Cascade Piston, Overrun Coupler and Apprentice's Hands route through machine.ts `routeStrike`; Sprocket's Whistle breaks
//     carry `by: 'sprocket'` and `word: 'pry'` on the 'partBroken' event.
//   - Decided readings (ambiguities resolved here): the Free Pawl+ "Boost 1 on each release" boosts the parts the spring then
//     passes motion to (not its own release Strike); the Conductor's Baton spreads statuses applied after it fired this turn
//     (it sits earlier in the motion order than the part applying them); Perpetual Engine re-fires every OTHER part that fired
//     this turn, once each, on the last tick; its upgrade adds at least 6 Plating over the base; Hour Hand+ adds at least 2 Plating;
//     an upgraded Apprentice's Hands second hit is exactly three quarters (use multiples of 4).
import { describe, expect, it } from 'vitest';
import * as combatMod from '../../src/core/combat';
import { createCombat, placePart, previewTurn, runTurn, swapParts } from '../../src/core/combat';
import { previewIntents } from '../../src/core/enemy';
import { runMachine } from '../../src/core/machine';
import { cell, combatWith, put, registerTestEnemy } from '../../src/core/testkit';
import type { CombatWithOpts, TestEnemy } from '../../src/core/testkit';
import type { CombatState, GameEvent } from '../../src/core/types';

// ---------- helpers ----------

const FOE: TestEnemy = { core: 200, bump: 'shell 1' };
const kinds = (events: GameEvent[], kind: GameEvent['kind']): GameEvent[] => events.filter((e) => e.kind === kind);

/** A combat with an item board; trinkets are added to the live combat. Default enemy: a 200 HP core that only shells. */
function scen(o: CombatWithOpts & { trinkets?: string[] }): CombatState {
  const { trinkets, ...rest } = o;
  const c = combatWith({ enemies: [FOE], ...rest });
  c.trinkets.push(...(trinkets ?? []));
  return c;
}
/** Run only the machine (no enemy turn): the state right after the player's Run. */
function mach(c: CombatState) {
  const events: GameEvent[] = [];
  const p = runMachine(c, events);
  return { p, events };
}
const coreLoss = (c: CombatState, e = 0): number => c.enemies[e].maxHp - c.enemies[e].hp;
const partOf = (c: CombatState, e: number, id: string) => {
  const p = c.enemies[e].parts.find((x) => x.id === id);
  expect(p, `enemy ${e} has part ${id}`).toBeTruthy();
  return p as NonNullable<typeof p>;
};
const hpOfPart = (c: CombatState, e: number, id: string): number => partOf(c, e, id).hp;

// ---------- items-engine: the 17 effects ----------

describe('items-engine: Masterwork parts', () => {
  it('Skewframe: Strike 2 and motion passes to all 8 neighbors, diagonals included (+: Strike 4)', () => {
    const board = (item: string) => ({ B2: item, C1: 'spur', C3: 'spur' }); // C1 and C3 are diagonal to B2
    const a = scen({ board: board('skewframe'), ticks: 1 });
    mach(a);
    expect(coreLoss(a)).toBe(2 + 3 + 3);
    const b = scen({ board: board('skewframe+'), ticks: 1 });
    mach(b);
    expect(coreLoss(b)).toBe(4 + 3 + 3);
    const control = scen({ board: board('spur'), ticks: 1 }); // a plain Gear does not reach the diagonals
    mach(control);
    expect(coreLoss(control)).toBe(3);
  });

  it('Mirror Gear: fires as a copy of the first adjacent part in the order up, right, down, left (+: Boost 1)', () => {
    const board = { B2: 'mirror-gear', C2: 'spur', B3: 'escapement' }; // up B1 is empty: right (the Spur) wins over down
    const a = scen({ board, ticks: 1 });
    mach(a);
    expect(coreLoss(a)).toBe(3 + 3); // the copy Strikes 3, the Spur Strikes 3
    expect(a.plating).toBe(3); // only the Escapement itself, not a second copy of it
    const b = scen({ board: { B2: 'mirror-gear+', C2: 'spur', B3: 'escapement' }, ticks: 1 });
    mach(b);
    expect(coreLoss(b)).toBe(3 + 4); // Boost 1 goes to what it passes to, not to its own copy
    expect(b.plating).toBe(4);
  });

  it("Mirror Gear uses its OWN charge, not the copied part's", () => {
    const lone = scen({ board: { B2: 'ratchet' }, ticks: 3 });
    mach(lone);
    const r = coreLoss(lone);
    expect(r).toBeGreaterThan(0);
    const both = scen({ board: { B2: 'mirror-gear', C2: 'ratchet' }, ticks: 3 });
    mach(both);
    expect(coreLoss(both)).toBe(2 * r); // the copy grows its own charge exactly as a second Ratchet would
  });

  it('Twin Mainspring: placed only on D2; emits its own pulse each tick (+: Boost 1 to its first powered part)', () => {
    const c = combatWith({ hand: ['twin-mainspring'], enemies: [FOE] });
    expect(placePart(c, 0, cell('B2'))).toBe(false);
    expect(placePart(c, 0, cell('E3'))).toBe(false);
    expect(c.hand).toHaveLength(1);
    expect(placePart(c, 0, cell('D2'))).toBe(true);
    expect(c.board[cell('D2')]?.defId).toBe('twin-mainspring');
    const a = scen({ board: { D2: 'twin-mainspring', E2: 'spur' }, ticks: 2 }); // nothing links A2 to D2
    mach(a);
    expect(coreLoss(a)).toBe(6);
    const b = scen({ board: { D2: 'twin-mainspring+', E2: 'spur' }, ticks: 2 });
    mach(b);
    expect(coreLoss(b)).toBe(8);
    const control = scen({ board: { D2: 'spur', E2: 'spur' }, ticks: 2 });
    mach(control);
    expect(coreLoss(control)).toBe(0);
  });

  it('Free Pawl: Springs next to it charge and pass motion instead of holding (+: Boost 1 on each release)', () => {
    const one = scen({ board: { B2: 'free-pawl', C2: 'coil', D2: 'spur' }, ticks: 1 });
    mach(one);
    expect(coreLoss(one)).toBe(3); // the Coil passed motion on tick 1 instead of holding
    const control = scen({ board: { B2: 'idler', C2: 'coil', D2: 'spur' }, ticks: 1 });
    mach(control);
    expect(coreLoss(control)).toBe(0);
    const three = scen({ board: { B2: 'free-pawl', C2: 'coil', D2: 'spur' }, ticks: 3 });
    mach(three);
    expect(coreLoss(three)).toBe(3 + 3 + 10 + 3); // ticks 1 and 2 the Spur, tick 3 the Coil releases Strike 10 and passes
    const up = scen({ board: { B2: 'free-pawl+', C2: 'coil', D2: 'spur' }, ticks: 3 });
    mach(up);
    expect(coreLoss(up)).toBe(3 + 3 + 10 + 4); // the release hands Boost 1 to the Spur
  });

  it("Night Watchman: if powered, before the enemies act it fires once: Strike 7 at the first part that will act (+: 10)", () => {
    const foe = (jaw: number): TestEnemy => ({
      core: 200,
      bump: 'shell 1',
      parts: [
        { id: 'rest', hp: 20, act: 'attack 5', cadence: 'even' }, // does not act on turn 1
        { id: 'jaw', hp: jaw, act: 'attack 5' },
      ],
    });
    const a = scen({ board: { A1: 'night-watchman' }, enemies: [foe(7)] });
    const r = runTurn(a);
    expect(partOf(a, 0, 'jaw').broken).toBe(true); // broken before it acted
    expect(a.playerHp).toBe(50);
    expect(hpOfPart(a, 0, 'rest')).toBe(20);
    expect(kinds(r.events, 'partBroken').some((e) => e.part === 'jaw')).toBe(true);
    const unpowered = scen({ board: { E3: 'night-watchman' }, enemies: [foe(7)] }); // nothing powers E3
    runTurn(unpowered);
    expect(partOf(unpowered, 0, 'jaw').broken).toBe(false);
    expect(unpowered.playerHp).toBe(45);
    const base = scen({ board: { A1: 'night-watchman' }, enemies: [foe(10)] });
    runTurn(base);
    expect(partOf(base, 0, 'jaw').broken).toBe(false); // 7 is not enough for 10 HP
    expect(hpOfPart(base, 0, 'jaw')).toBe(3);
    const up = scen({ board: { A1: 'night-watchman+' }, enemies: [foe(10)] });
    runTurn(up);
    expect(partOf(up, 0, 'jaw').broken).toBe(true);
    expect(up.playerHp).toBe(50);
  });

  it('Resonance Rod: Plate 1; the other two cells in its column fire with Echo (+: Plate 3)', () => {
    const a = scen({ board: { B2: 'resonance-rod', B1: 'spur', B3: 'spur', C2: 'spur' }, ticks: 1 });
    mach(a);
    expect(coreLoss(a)).toBe(3 * 5); // B1 and B3 twice, C2 (not in the column) once: five Strikes of 3 (adapted: the file said 12, which miscounts)
    expect(a.plating).toBe(1);
    const b = scen({ board: { B2: 'resonance-rod+', B1: 'spur', B3: 'spur', C2: 'spur' }, ticks: 1 });
    mach(b);
    expect(b.plating).toBe(3);
  });

  it('Hour Hand: the parts to its left and right treat every tick as the last tick (+: also Plate 2)', () => {
    const right = scen({ board: { B2: 'hour-hand', C2: 'chronometer' }, ticks: 3 });
    mach(right);
    expect(coreLoss(right)).toBe(3 * 9); // Chronometer: Strike 3 x 3 ticks, on each of the 3 ticks
    const left = scen({ board: { C2: 'hour-hand', B2: 'chronometer' }, ticks: 3 });
    mach(left);
    expect(coreLoss(left)).toBe(3 * 9);
    const control = scen({ board: { B2: 'escapement', C2: 'chronometer' }, ticks: 3 }); // adapted: an Idler would Boost the Chronometer by 2
    mach(control);
    expect(coreLoss(control)).toBe(9); // last tick only
    const plain = scen({ board: { B2: 'hour-hand', C2: 'chronometer' }, ticks: 3 });
    mach(plain);
    expect(plain.plating).toBe(0);
    const up = scen({ board: { B2: 'hour-hand+', C2: 'chronometer' }, ticks: 3 });
    mach(up);
    expect(up.plating).toBeGreaterThanOrEqual(2);
  });

  it('Ballast Lance: on the last tick Strike half your Plating (rounded up, max 20), Plating kept (+: three quarters, max 24)', () => {
    const run = (item: string, plating: number, ticks = 1) => {
      const c = scen({ board: { A1: item }, plating, ticks });
      mach(c);
      return c;
    };
    expect(coreLoss(run('ballast-lance', 5))).toBe(3); // ceil(2.5)
    expect(coreLoss(run('ballast-lance', 100))).toBe(20); // max 20
    expect(run('ballast-lance', 100).plating).toBe(100); // kept
    expect(coreLoss(run('ballast-lance', 100, 3))).toBe(20); // the last tick only, not each tick
    expect(coreLoss(run('ballast-lance+', 100))).toBe(24);
    expect(coreLoss(run('ballast-lance+', 8))).toBe(6);
  });

  it('Cascade Piston: spend 3 Pressure for Strike 12; the excess carries to the next standing order entry, once (+: Strike 16)', () => {
    const foe = (tail: number): TestEnemy => ({
      core: 200,
      bump: 'shell 1',
      parts: [
        { id: 'jaw', hp: 5, act: 'attack 1' },
        { id: 'tail', hp: tail, act: 'attack 1' },
      ],
    });
    const a = scen({ board: { A1: 'cascade-piston' }, pressure: 3, ticks: 1, enemies: [foe(100)], order: ['e0.jaw', 'e0.tail'] });
    mach(a);
    expect(partOf(a, 0, 'jaw').broken).toBe(true);
    expect(hpOfPart(a, 0, 'tail')).toBe(100 - 7);
    expect(a.pressure).toBe(0);
    // a carried hit never carries again: the 7 breaks the 4 HP tail and the 3 beyond is lost, the core is untouched
    const b = scen({ board: { A1: 'cascade-piston' }, pressure: 3, ticks: 1, enemies: [foe(4)], order: ['e0.jaw', 'e0.tail', 'e0.core'] });
    mach(b);
    expect(partOf(b, 0, 'tail').broken).toBe(true);
    expect(coreLoss(b)).toBe(0);
    // without Pressure: Strike 3, no carry
    const c = scen({ board: { A1: 'cascade-piston' }, pressure: 0, ticks: 1, enemies: [foe(100)], order: ['e0.jaw', 'e0.tail'] });
    mach(c);
    expect(hpOfPart(c, 0, 'jaw')).toBe(2);
    expect(hpOfPart(c, 0, 'tail')).toBe(100);
    const d = scen({ board: { A1: 'cascade-piston+' }, pressure: 3, ticks: 1, enemies: [foe(100)], order: ['e0.jaw', 'e0.tail'] });
    mach(d);
    expect(hpOfPart(d, 0, 'tail')).toBe(100 - 11);
  });

  it("Conductor's Baton: Strike 2; each Cracked, Dazed or Scald applied this turn also lands on every other enemy (+: Strike 3)", () => {
    const two = (board: Record<string, string>, extra: Partial<CombatWithOpts> = {}) =>
      scen({ board, ticks: 1, enemies: [FOE, { core: 100, bump: 'shell 1' }], ...extra });
    const cracked = two({ A1: 'conductors-baton', B2: 'bell-hammer' });
    mach(cracked);
    expect(cracked.enemies[0].statuses.cracked).toBe(1);
    expect(cracked.enemies[1].statuses.cracked).toBe(1);
    const dazed = two({ A1: 'conductors-baton', B2: 'chime' });
    mach(dazed);
    expect(dazed.enemies[1].statuses.dazed).toBe(1);
    const scald = two({ A1: 'conductors-baton', B2: 'alarm-clock' });
    mach(scald);
    expect(scald.enemies[0].statuses.scald).toBe(4); // the last tick
    expect(scald.enemies[1].statuses.scald).toBe(4);
    const off = two({ E3: 'conductors-baton', B2: 'bell-hammer' }); // not powered
    mach(off);
    expect(off.enemies[1].statuses.cracked).toBeUndefined();
    const strike = two({ A1: 'conductors-baton' });
    mach(strike);
    expect(coreLoss(strike)).toBe(2);
    const up = two({ A1: 'conductors-baton+' });
    mach(up);
    expect(coreLoss(up)).toBe(3);
  });
});

describe('items-engine: Legendary parts', () => {
  it('Perpetual Engine: on the last tick every other part that fired this turn fires once more (+: also Plate 6)', () => {
    const board = { A1: 'spur', B2: 'perpetual-engine', C2: 'escapement' };
    const a = scen({ board, ticks: 2 });
    mach(a);
    expect(coreLoss(a)).toBe(3 * 2 + 3); // the Spur fired on both ticks and once more
    expect(a.plating).toBe(3 * 2 + 3);
    const control = scen({ board: { A1: 'spur', B2: 'spur', C2: 'escapement' }, ticks: 2 }); // adapted: an Idler would Boost the Escapement
    mach(control);
    expect(control.plating).toBe(6);
    const up = scen({ board: { A1: 'spur', B2: 'perpetual-engine+', C2: 'escapement' }, ticks: 2 });
    mach(up);
    expect(up.plating).toBeGreaterThanOrEqual(a.plating + 6);
  });

  it('Bottled Dusk: +2 ticks (once per turn); each tick after the 3rd adds 2 Pressure (+: +3 ticks)', () => {
    const run = (board: Record<string, string>) => previewTurn(scen({ board }));
    const a = run({ A1: 'bottled-dusk' });
    expect(a.ticks).toBe(5);
    expect(a.pressureAfter).toBe(4); // ticks 4 and 5
    expect(run({ A1: 'bottled-dusk', A3: 'bottled-dusk' }).ticks).toBe(5); // once per turn
    const up = run({ A1: 'bottled-dusk+' });
    expect(up.ticks).toBe(6);
    expect(up.pressureAfter).toBe(6);
  });

  it('Sun-Orb Core: you never overpressure; spend all Pressure above 10 for Sweep 2 per Pressure (+: Sweep 3)', () => {
    const a = scen({ board: { A1: 'sun-orb-core' }, pressure: 16, ticks: 1 });
    mach(a);
    expect(a.pressure).toBe(10);
    expect(coreLoss(a)).toBe(12);
    const low = scen({ board: { A1: 'sun-orb-core' }, pressure: 8, ticks: 1 });
    mach(low);
    expect(low.pressure).toBe(8);
    expect(coreLoss(low)).toBe(0);
    const up = scen({ board: { A1: 'sun-orb-core+' }, pressure: 16, ticks: 1 });
    mach(up);
    expect(coreLoss(up)).toBe(18);
    const idle = scen({ board: { E3: 'sun-orb-core' }, pressure: 25, ticks: 1 }); // on the board but not powered
    const pv = previewTurn(idle);
    expect(pv.overpressure).toBe(false);
    const r = runTurn(idle);
    expect(kinds(r.events, 'overpressure')).toHaveLength(0);
    expect(idle.playerHp).toBe(50);
    const without = scen({ board: { E3: 'spur' }, pressure: 25, ticks: 1 });
    expect(previewTurn(without).overpressure).toBe(true); // control: Pressure 25 does overpressure
  });

  it("Apprentice's Hands: while powered, Strikes hit the first two standing order entries; the second takes half (+: three quarters)", () => {
    const foe: TestEnemy = {
      core: 200,
      bump: 'shell 1',
      parts: [
        { id: 'a', hp: 100, act: 'attack 1' },
        { id: 'b', hp: 100, act: 'attack 1' },
        { id: 'c', hp: 100, act: 'attack 1' },
      ],
    };
    const mk = (hands: string, strike: string, order = ['e0.a', 'e0.b', 'e0.c']) =>
      scen({ board: { A1: hands, B2: strike }, ticks: 1, enemies: [foe], order });
    const a = mk('apprentices-hands', 'test-strike-11');
    mach(a);
    expect(hpOfPart(a, 0, 'a')).toBe(89);
    expect(hpOfPart(a, 0, 'b')).toBe(95); // half of 11, rounded down
    expect(hpOfPart(a, 0, 'c')).toBe(100);
    const off = mk('idler', 'test-strike-11');
    mach(off);
    expect(hpOfPart(off, 0, 'b')).toBe(100);
    const unpowered = scen({ board: { E3: 'apprentices-hands', B2: 'test-strike-11' }, ticks: 1, enemies: [foe], order: ['e0.a', 'e0.b'] });
    mach(unpowered);
    expect(hpOfPart(unpowered, 0, 'b')).toBe(100);
    const one = mk('apprentices-hands', 'test-strike-10', ['e0.a']);
    mach(one);
    expect(hpOfPart(one, 0, 'a')).toBe(90); // a single entry: nothing to share with
    const up = mk('apprentices-hands+', 'test-strike-12');
    mach(up);
    expect(hpOfPart(up, 0, 'a')).toBe(88);
    expect(hpOfPart(up, 0, 'b')).toBe(91); // three quarters of 12
  });

  it("Sprocket's Blanket: Plate 3; half your Plating (down, max 12) stays when it would fall at turn start (+: Plate 5, two thirds, max 18)", () => {
    const after = (item: string, plating: number): number => {
      const c = scen({ board: { A1: item }, plating, ticks: 1 });
      runTurn(c);
      return c.plating;
    };
    expect(after('sprockets-blanket', 10)).toBe(6); // 10 + 3 = 13, half rounded down
    expect(after('sprockets-blanket', 30)).toBe(12); // max 12
    expect(after('escapement', 10)).toBe(0); // control: it all falls
    expect(after('sprockets-blanket+', 10)).toBe(10); // 10 + 5 = 15, two thirds
    expect(after('sprockets-blanket+', 60)).toBe(18); // max 18
  });
});

describe('items-engine: trinkets', () => {
  const foe = (parts: { id: string; hp: number }[]): TestEnemy => ({
    core: 200,
    bump: 'shell 1',
    parts: parts.map((p) => ({ ...p, act: 'attack 1' })),
  });

  it('Overrun Coupler: once per turn a Strike that overkills its target carries the excess to the next standing order entry', () => {
    const c = scen({
      board: { B2: 'test-strike-12' },
      ticks: 2,
      trinkets: ['overrun-coupler'],
      enemies: [foe([{ id: 'jaw', hp: 5 }, { id: 'tail', hp: 100 }])],
      order: ['e0.jaw', 'e0.tail'],
    });
    mach(c);
    expect(hpOfPart(c, 0, 'tail')).toBe(100 - 7 - 12); // tick 1 carries 7, tick 2 hits the tail directly
    const off = scen({ board: { B2: 'test-strike-12' }, ticks: 1, enemies: [foe([{ id: 'jaw', hp: 5 }, { id: 'tail', hp: 100 }])], order: ['e0.jaw', 'e0.tail'] });
    mach(off);
    expect(hpOfPart(off, 0, 'tail')).toBe(100); // without it the overkill is lost
  });

  it('Overrun Coupler: only once per turn, and a carried hit never carries again', () => {
    const c = scen({
      board: { A1: 'test-strike-12', B2: 'test-strike-12' },
      ticks: 1,
      trinkets: ['overrun-coupler'],
      enemies: [foe([{ id: 'p1', hp: 5 }, { id: 'p2', hp: 6 }, { id: 'p3', hp: 6 }, { id: 'p4', hp: 100 }])],
      order: ['e0.p1', 'e0.p2', 'e0.p3', 'e0.p4'],
    });
    mach(c);
    expect(partOf(c, 0, 'p1').broken).toBe(true); // first Strike: carries 7 to p2 (breaks it; the 1 beyond is lost)
    expect(partOf(c, 0, 'p2').broken).toBe(true);
    expect(partOf(c, 0, 'p3').broken).toBe(true); // second Strike goes to p3 and overkills 6: the carry was used up
    expect(hpOfPart(c, 0, 'p4')).toBe(100);
  });

  it('the Cascade Piston and the Overrun Coupler can each carry once in the same turn', () => {
    const c = scen({
      board: { A1: 'cascade-piston', B2: 'test-strike-12' },
      pressure: 3,
      ticks: 1,
      trinkets: ['overrun-coupler'],
      enemies: [foe([{ id: 'p1', hp: 5 }, { id: 'p2', hp: 3 }, { id: 'p3', hp: 4 }, { id: 'p4', hp: 100 }])],
      order: ['e0.p1', 'e0.p2', 'e0.p3', 'e0.p4'],
    });
    mach(c);
    expect(partOf(c, 0, 'p1').broken).toBe(true);
    expect(partOf(c, 0, 'p2').broken).toBe(true); // the Piston's carry (7 into 3 HP; the carried hit does not carry again)
    expect(partOf(c, 0, 'p3').broken).toBe(true); // the plain Strike overkills p3 by 8 ...
    expect(hpOfPart(c, 0, 'p4')).toBe(100 - 8); // ... and the Coupler's own carry takes it on
  });

  it("Sprocket's Whistle: at the start of each turn Sprocket fetches Pry 5 at the first living enemy, free; his break is flagged by: 'sprocket'", () => {
    const c = scen({
      trinkets: ['sprockets-whistle'],
      enemies: [foe([{ id: 'jaw', hp: 12 }, { id: 'tail', hp: 5 }])],
    });
    const r1 = runTurn(c);
    expect(partOf(c, 0, 'tail').broken).toBe(true);
    const br = kinds(r1.events, 'partBroken').find((e) => e.part === 'tail');
    expect(br?.by).toBe('sprocket');
    expect(br?.word).toBe('pry');
    expect(hpOfPart(c, 0, 'jaw')).toBe(12);
    runTurn(c);
    expect(hpOfPart(c, 0, 'jaw')).toBe(7); // every turn
    const player = scen({ board: { B2: 'test-strike-5' }, ticks: 1, enemies: [foe([{ id: 'tail', hp: 5 }, { id: 'jaw', hp: 100 }])], order: ['e0.tail'] });
    const r = mach(player);
    expect(kinds(r.events, 'partBroken')[0].by).toBeUndefined(); // the player's machine never carries the flag
  });
});

// ---------- turn-tools: Foresight Dial, the Inventor's Watch, Two Left Hands ----------

describe('turn-tools: Foresight Dial', () => {
  const foe: TestEnemy = {
    core: 99,
    bump: 'shell 1',
    parts: [
      { id: 'odd', hp: 20, act: 'attack 5', cadence: 'odd' },
      { id: 'even', hp: 20, act: 'attack 7', cadence: 'even' },
    ],
  };
  const ids = (c: CombatState, ahead: number): string[] => previewIntents(c, 0, ahead).map((i) => i.partId);

  it('the first turn is the current intents; the second is computed from the part cadences', () => {
    const c = scen({ enemies: [foe] });
    expect(ids(c, 1)).toEqual(['odd']);
    expect(previewIntents(c, 0, 1).map((i) => i.label)).toEqual(c.enemies[0].intents.map((i) => i.label));
    expect(ids(c, 2)).toEqual(['even']);
    const second = previewIntents(c, 0, 2)[0];
    expect(second.kind).toBe('attack');
    expect(second.actions[0].amount).toBe(7);
    expect(ids(c, 3)).toEqual(['odd']);
  });

  it('is recomputed after a break: a broken part is gone from the second turn, and with none left the core Bumps', () => {
    const c = scen({ board: { B2: 'test-strike-20' }, ticks: 1, enemies: [foe], order: ['e0.even'] });
    expect(ids(c, 2)).toEqual(['even']);
    mach(c);
    expect(partOf(c, 0, 'even').broken).toBe(true);
    expect(ids(c, 2)).toEqual([]); // a quiet turn: the Odd part still stands, so no Bump
    put(c, 'A1', 'test-strike-20');
    c.board[cell('B2')] = null;
    c.ticksThisTurn = 1;
    c.order = ['e0.odd'];
    mach(c);
    expect(ids(c, 2)).toEqual(['core']);
  });

  it('shows a Jam: a jammed part skips its next action, and acts again after', () => {
    const c = scen({ board: { B2: 'test-jam' }, ticks: 1, enemies: [foe], order: ['e0.even'] });
    expect(ids(c, 2)).toEqual(['even']);
    mach(c); // Jam the Even part: its next action (turn 2) is skipped
    expect(ids(c, 2)).toEqual([]);
    expect(ids(c, 4)).toEqual(['even']);
  });
});

describe("turn-tools: the Inventor's Watch", () => {
  const view = (c: CombatState): string =>
    JSON.stringify({
      turn: c.turn,
      board: c.board,
      hand: c.hand,
      draw: c.draw,
      discard: c.discard,
      rng: c.rng,
      hp: c.playerHp,
      plating: c.plating,
      pressure: c.pressure,
      statuses: c.playerStatuses,
      enemies: c.enemies,
      order: c.order,
      log: c.log,
      outcome: c.outcome,
      planAcc: { plating: 0, burst: 0, pressure: 0, statuses: 0, ...(c.planAcc ?? {}) },
    });
  const wind = (c: CombatState): boolean => {
    const f = (combatMod as unknown as { windBack?: (x: CombatState) => boolean }).windBack;
    expect(f, 'combat.ts exports windBack(c)').toBeTypeOf('function');
    return (f as (x: CombatState) => boolean)(c);
  };
  const mk = (o: { trinket?: boolean; core?: number; hp?: number; bump?: string } = {}): CombatState => {
    const enemy = registerTestEnemy({ core: o.core ?? 500, bump: o.bump ?? 'attack 2' });
    const bin = Array.from({ length: 10 }, (_, i) => ({ uid: i + 1, defId: ['spur', 'escapement', 'idler'][i % 3], plus: false }));
    const c = createCombat({
      seed: 7,
      bin,
      enemies: [enemy],
      hp: o.hp ?? 50,
      maxHp: 50,
      trinkets: o.trinket === false ? [] : ['inventors-watch'],
    });
    placePart(c, 0, cell('B2'));
    placePart(c, 0, cell('A1'));
    return c;
  };

  it('takes a snapshot just before a Run, only while the Watch is held', () => {
    const held = mk();
    expect(held.watchSnapshot).toBeUndefined();
    runTurn(held);
    expect(held.watchSnapshot).toBeTruthy();
    const without = mk({ trinket: false });
    runTurn(without);
    expect(without.watchSnapshot).toBeUndefined();
    expect(wind(without)).toBe(false);
  });

  it('winding back restores board, hand, draw order, streams, Pressure, HP, enemies and the fight tallies; the same draws follow', () => {
    const c = mk();
    const before = view(c);
    runTurn(c);
    const afterRun = view(c);
    expect(afterRun).not.toBe(before);
    expect((c.planAcc?.burst ?? 0) + (c.planAcc?.plating ?? 0)).toBeGreaterThan(0);
    expect(wind(c)).toBe(true);
    expect(view(c)).toBe(before); // nothing of the rewound Run is counted
    expect(c.watchUsed).toBe(true);
    runTurn(c);
    expect(view(c)).toBe(afterRun); // the same draws and intents follow
  });

  it('is once per combat', () => {
    const c = mk();
    runTurn(c);
    expect(wind(c)).toBe(true);
    runTurn(c);
    expect(wind(c)).toBe(false);
  });

  it('is usable after a lost Run (the fight goes back to ongoing) but not after a won one', () => {
    const lost = mk({ hp: 3, bump: 'attack 60' });
    const before = view(lost);
    runTurn(lost);
    expect(lost.outcome).toBe('lost');
    expect(wind(lost)).toBe(true);
    expect(lost.outcome).toBe('ongoing');
    expect(view(lost)).toBe(before);
    const won = mk();
    won.enemies[0].hp = 0; // every enemy down: this Run wins
    runTurn(won);
    expect(won.outcome).toBe('won');
    expect(wind(won)).toBe(false);
  });

  it('the snapshot survives a save round-trip (a reload keeps it)', () => {
    const c = mk();
    const before = view(c);
    runTurn(c);
    const reloaded = JSON.parse(JSON.stringify(c)) as CombatState;
    expect(wind(reloaded)).toBe(true);
    expect(view(reloaded)).toBe(before);
  });
});

describe('turn-tools: Two Left Hands', () => {
  const board = { B2: 'spur', C2: 'idler', B1: 'escapement' };

  it('two free swaps each turn instead of one', () => {
    const c = scen({ board, trinkets: ['two-left-hands'] });
    expect(swapParts(c, cell('B2'), cell('C2'))).toBe(true);
    expect(swapParts(c, cell('C2'), cell('B1'))).toBe(true);
    expect(swapParts(c, cell('B1'), cell('B2'))).toBe(false);
    const one = scen({ board });
    expect(swapParts(one, cell('B2'), cell('C2'))).toBe(true);
    expect(swapParts(one, cell('C2'), cell('B1'))).toBe(false);
  });

  it('a swap may trade a board part with a part in your hand, and counts as one of the two', () => {
    const swapWithHand = (combatMod as unknown as { swapWithHand?: (x: CombatState, cellIdx: number, h: number) => boolean }).swapWithHand;
    expect(swapWithHand, 'combat.ts exports swapWithHand(c, cell, handIndex)').toBeTypeOf('function');
    const c = scen({ board, hand: ['coil'], trinkets: ['two-left-hands'] });
    const onBoard = c.board[cell('B2')]!.uid;
    const inHand = c.hand[0];
    expect((swapWithHand as (x: CombatState, a: number, b: number) => boolean)(c, cell('B2'), 0)).toBe(true);
    expect(c.board[cell('B2')]?.uid).toBe(inHand);
    expect(c.hand).toEqual([onBoard]);
    expect(swapParts(c, cell('C2'), cell('B1'))).toBe(true);
    expect(swapParts(c, cell('B1'), cell('C2'))).toBe(false); // that was the second
    const plain = scen({ board, hand: ['coil'] });
    expect((swapWithHand as (x: CombatState, a: number, b: number) => boolean)(plain, cell('B2'), 0)).toBe(false); // not without the trinket
  });

  it('the swaps come back next turn', () => {
    const c = scen({ board, trinkets: ['two-left-hands'] });
    swapParts(c, cell('B2'), cell('C2'));
    swapParts(c, cell('C2'), cell('B1'));
    runTurn(c);
    expect(swapParts(c, cell('B2'), cell('C2'))).toBe(true);
    expect(swapParts(c, cell('C2'), cell('B1'))).toBe(true);
  });
});

// ---------- EM7 over every item, and invariants 2, 3 and 8 (amended) ----------

const RICH: TestEnemy = {
  core: 300,
  bump: 'shell 1',
  parts: [
    { id: 'a', hp: 40, act: 'attack 1' },
    { id: 'b', hp: 40, act: 'attack 1' },
    { id: 'c', hp: 40, act: 'attack 1', cadence: 'even' },
  ],
};
const RICH_ORDER = ['e0.a', 'e0.b', 'e0.c', 'e0.core'];
const rich = (board: Record<string, string>, extra: CombatWithOpts & { trinkets?: string[] } = {}): CombatState =>
  scen({ board, enemies: [RICH, { core: 100, bump: 'shell 1' }], order: RICH_ORDER, pressure: 6, plating: 4, ...extra });

/** Every item on a board that exercises it, and whether its whole effect lives in the machine (then preview == real damage). */
const ITEM_BOARDS: Record<string, { mk: () => CombatState; machineOnly: boolean }> = {
  skewframe: { mk: () => rich({ B2: 'skewframe', C1: 'spur', C3: 'spur' }), machineOnly: true },
  'mirror-gear': { mk: () => rich({ B2: 'mirror-gear', C2: 'spur', B3: 'escapement' }), machineOnly: true },
  'twin-mainspring': { mk: () => rich({ D2: 'twin-mainspring', E2: 'spur' }), machineOnly: true },
  'free-pawl': { mk: () => rich({ B2: 'free-pawl', C2: 'coil', D2: 'spur' }), machineOnly: true },
  'night-watchman': { mk: () => rich({ A1: 'night-watchman', B2: 'spur' }), machineOnly: false },
  'resonance-rod': { mk: () => rich({ B2: 'resonance-rod', B1: 'spur', B3: 'spur' }), machineOnly: true },
  'hour-hand': { mk: () => rich({ B2: 'hour-hand', C2: 'chronometer' }), machineOnly: true },
  'ballast-lance': { mk: () => rich({ A1: 'escapement', B2: 'ballast-lance' }), machineOnly: true },
  'cascade-piston': { mk: () => rich({ A1: 'cascade-piston', B2: 'spur' }, { pressure: 9 }), machineOnly: true },
  'conductors-baton': { mk: () => rich({ A1: 'conductors-baton', B2: 'bell-hammer' }), machineOnly: true },
  'perpetual-engine': { mk: () => rich({ A1: 'spur', B2: 'perpetual-engine', C2: 'escapement' }), machineOnly: true },
  'bottled-dusk': { mk: () => rich({ A1: 'bottled-dusk', B2: 'spur' }), machineOnly: true },
  'sun-orb-core': { mk: () => rich({ A1: 'sun-orb-core', B2: 'boiler' }, { pressure: 16 }), machineOnly: true },
  'apprentices-hands': { mk: () => rich({ A1: 'apprentices-hands', B2: 'test-strike-11' }), machineOnly: true },
  'sprockets-blanket': { mk: () => rich({ A1: 'sprockets-blanket', B2: 'spur' }), machineOnly: true },
  'overrun-coupler': { mk: () => rich({ B2: 'test-strike-60', A1: 'spur' }, { trinkets: ['overrun-coupler'] }), machineOnly: true },
  'sprockets-whistle': { mk: () => rich({ B2: 'spur' }, { trinkets: ['sprockets-whistle'] }), machineOnly: false },
  'foresight-dial': { mk: () => rich({ B2: 'spur', C2: 'escapement' }, { trinkets: ['foresight-dial'] }), machineOnly: true },
  'inventors-watch': { mk: () => rich({ B2: 'spur', C2: 'escapement' }, { trinkets: ['inventors-watch'] }), machineOnly: true },
  'two-left-hands': { mk: () => rich({ B2: 'spur', C2: 'escapement' }, { trinkets: ['two-left-hands'] }), machineOnly: true },
  'tow-hook': { mk: () => rich({ B2: 'spur', C2: 'escapement' }, { trinkets: ['tow-hook'] }), machineOnly: true },
};

function checkInvariants(c: CombatState, why: string): void {
  // 2: every part uid in exactly one of board, hand, draw, discard
  const seen: number[] = [];
  for (const p of c.board) if (p) seen.push(p.uid);
  seen.push(...c.hand, ...c.draw, ...c.discard);
  expect(new Set(seen).size, `${why}: a uid appears twice`).toBe(seen.length);
  expect([...seen].sort((x, y) => x - y), `${why}: every part is somewhere`).toEqual(Object.keys(c.parts).map(Number).sort((x, y) => x - y));
  // 3: bounds
  expect(c.playerHp, why).toBeGreaterThanOrEqual(0);
  expect(c.playerHp, why).toBeLessThanOrEqual(c.playerMaxHp);
  expect(c.pressure, why).toBeGreaterThanOrEqual(0);
  expect(c.pressure, why).toBeLessThanOrEqual(30);
  for (const p of c.board) if (p) {
    expect(p.charge, why).toBeGreaterThanOrEqual(0);
    expect(p.counter, why).toBeGreaterThanOrEqual(0);
  }
  for (const e of c.enemies) {
    expect(e.hp, why).toBeGreaterThanOrEqual(0);
    expect(e.hp, why).toBeLessThanOrEqual(e.maxHp);
    for (const p of e.parts) expect(p.hp, `${why}: ${p.id}`).toBeGreaterThanOrEqual(0);
  }
}

describe('EM7 and invariants over all 21 items', () => {
  for (const [id, { mk, machineOnly }] of Object.entries(ITEM_BOARDS)) {
    it(`${id}: the preview equals the run, leaves the state unchanged, matches the HP actually lost, and keeps invariants 2, 3 and 8`, () => {
      const c = mk();
      for (let t = 0; t < 3 && c.outcome === 'ongoing'; t++) {
        const why = `${id} turn ${t + 1}`;
        const snap = JSON.stringify(c);
        const pv = previewTurn(c);
        expect(JSON.stringify(c), `${why}: previewTurn leaves the state unchanged`).toBe(snap);
        const hp: Record<string, number> = {};
        c.enemies.forEach((e, i) => {
          hp[`e${i}.core`] = e.hp;
          for (const p of e.parts) hp[`e${i}.${p.id}`] = p.hp;
        });
        const r = runTurn(c);
        expect(r.preview, `${why}: preview equals run`).toEqual(pv);
        const after: Record<string, number> = {};
        c.enemies.forEach((e, i) => {
          after[`e${i}.core`] = e.hp;
          for (const p of e.parts) after[`e${i}.${p.id}`] = p.hp;
        });
        if (machineOnly) {
          for (const [ref, t] of Object.entries(pv.byTarget)) {
            expect(Math.max(0, hp[ref]) - Math.max(0, after[ref]), `${why}: ${ref} lost exactly what the preview said`).toBe(t.damage);
          }
        }
        // 8: the damage events for a target never exceed the HP it had
        const sums: Record<string, number> = {};
        for (const ev of kinds(r.events, 'partHit')) sums[`e${ev.target}.${ev.part}`] = (sums[`e${ev.target}.${ev.part}`] ?? 0) + (ev.amount ?? 0);
        for (const [ref, s] of Object.entries(sums)) expect(s, `${why}: damage events for ${ref}`).toBeLessThanOrEqual(hp[ref]);
        checkInvariants(c, why);
      }
    });
  }

  it('invariant 8: without the three carrying items an overkill is lost, never carried to the next entry', () => {
    const foe: TestEnemy = {
      core: 200,
      bump: 'shell 1',
      parts: [
        { id: 'jaw', hp: 5, act: 'attack 1' },
        { id: 'tail', hp: 100, act: 'attack 1' },
      ],
    };
    const c = scen({ board: { B2: 'test-strike-12' }, ticks: 1, enemies: [foe], order: ['e0.jaw', 'e0.tail'] });
    const r = mach(c);
    expect(partOf(c, 0, 'jaw').broken).toBe(true);
    expect(hpOfPart(c, 0, 'tail')).toBe(100);
    const lost = kinds(r.events, 'lost').reduce((a, e) => a + (e.amount ?? 0), 0);
    expect(lost).toBe(7);
  });
});
