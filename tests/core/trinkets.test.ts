// Combat effects of trinkets and chassis passives, each proven with a concrete number.
import { describe, expect, it } from 'vitest';
import { cell } from '../../src/core/board';
import { createCombat, placePart, previewTurn, runTurn } from '../../src/core/combat';
import { combatWith } from '../../src/core/testkit';
import type { CombatWithOpts } from '../../src/core/testkit';
import type { CombatState, PartInstance } from '../../src/core/types';

const withT = (trinkets: string[], o: CombatWithOpts = {}): CombatState => {
  const c = combatWith(o);
  c.trinkets = trinkets;
  return c;
};
const bin = (...ids: string[]): PartInstance[] => ids.map((defId, i) => ({ uid: i + 1, defId, plus: false }));
const start = (trinkets: string[], chassis?: string, ids = ['spur', 'spur', 'spur', 'spur']) =>
  createCombat({ seed: 3, bin: bin(...ids), enemies: ['dummy'], hp: 50, maxHp: 50, trinkets, chassis });
const dmg = (c: CombatState) => previewTurn(c).damageByEnemy[0];

describe('combat start trinkets', () => {
  it('Oilcloth: 4 Plating', () => expect(start(['oilcloth']).plating).toBe(4));
  it('Bellows: 4 Pressure', () => expect(start(['bellows']).pressure).toBe(4));
  it('Whetstone: Grit 1 makes a Spur strike 4', () => {
    expect(start(['whetstone']).playerStatuses.grit).toBe(1);
    const c = withT(['whetstone'], { board: { B2: 'spur' } });
    c.playerStatuses.grit = 1; // what onCombatStart sets
    expect(dmg(c)).toBe(12);
  });
  it('Magnet Ward: the first Magnetize each combat fails, the second works', () => {
    const c = withT(['magnet-ward'], { board: { B2: 'spur' }, enemies: ['test-attacker-8'], hp: 999 });
    const mag = () => {
      c.enemies[0].intent = { kind: 'sabotage', sabotage: 'magnetize', target: cell('B2'), targets: [cell('B2')], label: 'Magnetizes a part' };
    };
    mag();
    runTurn(c);
    expect(c.board[cell('B2')]).not.toBeNull();
    mag();
    runTurn(c);
    expect(c.board[cell('B2')]).toBeNull();
  });
});

describe('turn start trinkets and passives', () => {
  it('Pocket Watch: 4 ticks on the first turn only', () => {
    const c = start(['pocket-watch']);
    expect(c.ticksThisTurn).toBe(4);
    runTurn(c);
    expect(c.ticksThisTurn).toBe(3);
  });
  it('Mainspring Key: +1 tick every turn', () => {
    const c = start(['mainspring-key']);
    expect(c.ticksThisTurn).toBe(4);
    runTurn(c);
    expect(c.ticksThisTurn).toBe(4);
  });
  it('Extra Pocket: 3 placements on the first turn only', () => {
    const c = start(['extra-pocket']);
    expect(c.placementsLeft).toBe(3);
    runTurn(c);
    expect(c.placementsLeft).toBe(2);
  });
  it('Hourglass: +1 placement from the 5th turn', () => {
    const c = start(['hourglass']);
    for (let t = 1; t < 4; t++) runTurn(c);
    expect(c.turn).toBe(4);
    expect(c.placementsLeft).toBe(2);
    runTurn(c);
    expect(c.turn).toBe(5);
    expect(c.placementsLeft).toBe(3);
  });
  it('Feather Duster: clears all Rust at a turn start, once per combat', () => {
    const c = withT(['feather-duster'], { board: { B2: 'spur', C2: 'spur' } });
    c.board[cell('C2')]!.rusted = 2;
    runTurn(c);
    expect(c.board[cell('C2')]!.rusted).toBe(0);
    c.board[cell('C2')]!.rusted = 2;
    runTurn(c);
    expect(c.board[cell('C2')]!.rusted).toBe(1); // the machine's own decrement only
  });
  it('Tinker: the first replace each combat refunds the placement', () => {
    const c = start([], 'tinker');
    expect(placePart(c, 0, cell('B2'))).toBe(true);
    expect(c.placementsLeft).toBe(1);
    expect(placePart(c, 0, cell('B2'))).toBe(true); // replace
    expect(c.placementsLeft).toBe(1);
    expect(placePart(c, 0, cell('B2'))).toBe(true); // a second replace costs
    expect(c.placementsLeft).toBe(0);
  });
  it('without Tinker a replace costs a placement', () => {
    const c = start([]);
    placePart(c, 0, cell('B2'));
    placePart(c, 0, cell('B2'));
    expect(c.placementsLeft).toBe(0);
  });
  it('Stoker starts with 6 Pressure', () => expect(start([], 'stoker').pressure).toBe(6));
  it('Horologist: the first turn has 4 ticks', () => {
    const c = start([], 'horologist');
    expect(c.ticksThisTurn).toBe(4);
    runTurn(c);
    expect(c.ticksThisTurn).toBe(3);
  });
});

describe('machine trinkets', () => {
  it('Copper Wire: Boost 1 on the first part the Mainspring powers each tick', () => {
    expect(dmg(withT(['copper-wire'], { board: { B2: 'spur' } }))).toBe(12);
    expect(dmg(withT(['copper-wire'], { board: { B2: 'spur', A1: 'spur' } }))).toBe(12 + 9); // A1 (up) is first
  });
  it('Brass Knuckles: the first Strike each turn deals +4', () => {
    expect(dmg(withT(['brass-knuckles'], { board: { B2: 'spur' } }))).toBe(13);
  });
  it('Cracked Lens: Cracked lasts 1 more turn', () => {
    const c = withT(['cracked-lens'], { board: { B2: 'bell-hammer' } });
    runTurn(c);
    expect(c.enemies[0].statuses.cracked).toBe(1); // 2 turns, one has passed
  });
  it('Soot Mask: Scald you apply is +1', () => {
    const c = withT(['soot-mask'], { board: { B2: 'whistle' }, pressure: 2, ticks: 1 });
    expect(previewTurn(c).statuses[0]).toMatchObject({ status: 'scald', amount: 4 });
  });
  it('Counterweight: Plate 3 whenever a part adds a tick', () => {
    expect(previewTurn(withT(['counterweight'], { board: { B2: 'pendulum' } })).plating).toBe(3);
    expect(previewTurn(combatWith({ board: { B2: 'pendulum' } })).plating).toBe(0);
  });
  it('Pressure Gauge: overpressure only above 25', () => {
    const over = (t: string[], pressure: number) => previewTurn(withT(t, { pressure, board: { B2: 'boiler' }, ticks: 1 })).overpressure;
    expect(over(['pressure-gauge'], 23)).toBe(false); // 25
    expect(over(['pressure-gauge'], 24)).toBe(true); // 26
    expect(over([], 19)).toBe(true); // 21
  });
  it('Steam Locket: overpressure also Sweeps 10', () => {
    const c = withT(['steam-locket'], { pressure: 21, board: { B2: 'boiler' }, ticks: 1 });
    runTurn(c);
    expect(c.enemies[0].maxHp - c.enemies[0].hp).toBe(10);
  });
  it('Grease Pot: a part next to the Mainspring cannot be Rusted', () => {
    const c = withT(['grease-pot'], { board: { B2: 'spur', C2: 'spur' }, enemies: ['test-attacker-8'], hp: 999 });
    c.enemies[0].intent = { kind: 'sabotage', sabotage: 'rust', target: cell('B2'), targets: [cell('B2'), cell('C2')], label: 'Rusts 2 parts' };
    runTurn(c);
    expect(c.board[cell('B2')]!.rusted).toBe(0);
    expect(c.board[cell('C2')]!.rusted).toBe(1);
  });
  it('Spare Spring: springs release one charge sooner', () => {
    expect(dmg(withT([], { board: { B2: 'coil' }, ticks: 2 }))).toBe(0);
    expect(dmg(withT(['spare-spring'], { board: { B2: 'coil' }, ticks: 2 }))).toBe(10);
    expect(previewTurn(withT(['spare-spring'], { board: { B2: 'leaf' }, ticks: 1 })).plating).toBe(10);
  });
  it('Ember Coal: Boilers give +1 Pressure', () => {
    expect(previewTurn(withT(['ember-coal'], { board: { B2: 'boiler' } })).pressureAfter).toBe(9);
    expect(previewTurn(combatWith({ board: { B2: 'boiler' } })).pressureAfter).toBe(6);
  });
  it('Echo Chamber: the first part to fire each turn fires with Echo', () => {
    expect(dmg(withT(['echo-chamber'], { board: { B2: 'spur' } }))).toBe(12);
  });
  it('the preview stays exact with trinkets', () => {
    const c = withT(['copper-wire', 'brass-knuckles', 'echo-chamber', 'counterweight', 'ember-coal'], {
      board: { B2: 'pendulum', C2: 'boiler', A1: 'spur' },
    });
    const p = previewTurn(c);
    expect(runTurn(c).preview).toEqual(p);
  });
});
