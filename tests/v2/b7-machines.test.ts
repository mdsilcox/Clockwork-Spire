// B7 acceptance: enemy machines, targeting, the new actions and words, Braced phases, salvage
// (docs/acceptance.md sections 9, 10, 11 WP1 and WP8, 13 SV1 and SV2; rules 2 and 4.8).
// Written by the orchestrator in the B7 contract step. Lanes may adapt a test to the code but never weaken it.
import { describe, expect, it } from 'vitest';
import { previewTurn, runTurn } from '../../src/core/combat';
import { canTarget, setOrder, toggleTarget } from '../../src/core/frames';
import { salvageItems, salvagePayout } from '../../src/core/salvage';
import { cell, combatWith, put } from '../../src/core/testkit';
import type { CombatState, GameEvent } from '../../src/core/types';

const part = (c: CombatState, e: number, id: string) => {
  const p = c.enemies[e].parts.find((x) => x.id === id);
  if (!p) throw new Error(`no part ${id}`);
  return p;
};
const lostTotal = (events: GameEvent[]): number =>
  events.filter((e) => e.kind === 'lost' || e.kind === 'braced').reduce((a, e) => a + (e.amount ?? 0), 0);

describe('9. Enemy machines and targeting', () => {
  it('EM2: a Strike 9 breaks an 8 HP jaw, cancels its intent, and the 1 overkill is lost', () => {
    const c = combatWith({
      board: { B2: 'piston' },
      pressure: 3,
      ticks: 1,
      enemies: [{ core: 20, bump: 'shell 1', parts: [{ id: 'jaw', hp: 8, act: 'attack 5x2' }] }],
      order: ['e0.jaw'],
    });
    const r = runTurn(c);
    expect(part(c, 0, 'jaw').broken).toBe(true);
    expect(c.enemies[0].hp).toBe(20);
    expect(c.playerHp).toBe(50);
    expect(lostTotal(r.events)).toBe(1);
  });

  it('EM3: order [jaw, core], Spur x3 ticks: jaw 5 breaks on tick 2 (1 lost), tick 3 hits the core', () => {
    const c = combatWith({
      board: { B2: 'spur' },
      enemies: [{ core: 20, bump: 'attack 1', parts: [{ id: 'jaw', hp: 5, act: 'attack 1' }] }],
      order: ['e0.jaw', 'e0.core'],
    });
    const pv = previewTurn(c);
    expect(pv.byTarget['e0.jaw']).toEqual({ damage: 5, breaks: true });
    expect(pv.byTarget['e0.core']).toEqual({ damage: 3, breaks: false });
    runTurn(c);
    expect(c.enemies[0].hp).toBe(17);
  });

  it('EM4: an empty order sends Strikes to the leftmost living enemy\'s front', () => {
    const c = combatWith({
      board: { B2: 'spur' },
      ticks: 1,
      enemies: [{ core: 10, parts: [{ id: 'a', hp: 5, act: 'attack 1' }] }, { core: 10 }],
    });
    setOrder(c, []);
    runTurn(c);
    expect(c.enemies[0].hp).toBe(7);
    expect(part(c, 0, 'a').hp).toBe(5);
    expect(c.enemies[1].hp).toBe(10);
  });

  it('EM5: a sealed core cannot join the order, and a Sweep hits its first unbroken keystone', () => {
    const c = combatWith({
      board: { B2: 'crown' },
      ticks: 1,
      enemies: [
        {
          core: 30,
          sealed: true,
          parts: [
            { id: 'k', hp: 10, act: 'attack 1', keystone: true },
            { id: 'x', hp: 5, act: 'attack 1' },
          ],
        },
      ],
    });
    expect(canTarget(c, 'e0.core')).toBe(false);
    expect(toggleTarget(c, 'e0.core')).toBe(false);
    expect(c.order).not.toContain('e0.core');
    runTurn(c);
    expect(part(c, 0, 'k').hp).toBe(8);
    expect(part(c, 0, 'x').hp).toBe(5);
    expect(c.enemies[0].hp).toBe(30);
  });

  it('EM6: an enemy whose acting parts are all broken falls back to its core action', () => {
    const c = combatWith({
      board: { B2: 'spur' },
      ticks: 1,
      enemies: [{ core: 20, bump: 'attack 4', parts: [{ id: 'jaw', hp: 3, act: 'attack 9' }] }],
      order: ['e0.jaw'],
    });
    runTurn(c);
    expect(c.playerHp).toBe(46);
    expect(c.enemies[0].intents.map((i) => i.partId)).toEqual(['core']);
  });

  it('EM7: the preview equals the run per target (damage, breaks, cancelled) and leaves the state unchanged', () => {
    const c = combatWith({
      board: { B2: 'spur', C2: 'coil', A1: 'piston', B1: 'crown' },
      pressure: 6,
      enemies: [
        { core: 14, parts: [{ id: 'jaw', hp: 4, act: 'attack 5' }, { id: 'plate', hp: 6, act: 'shell 6', cadence: 'even' }] },
        { core: 12, parts: [{ id: 'gland', hp: 3, act: 'pierce 4' }] },
      ],
      order: ['e0.jaw', 'e1.gland', 'e0.core'],
    });
    const before = JSON.stringify(c);
    const pv = previewTurn(c);
    expect(JSON.stringify(c)).toBe(before);
    const r = runTurn(c);
    expect(r.preview.byTarget).toEqual(pv.byTarget);
    expect(r.preview.cancelled).toEqual(pv.cancelled);
    expect(pv.cancelled.length).toBeGreaterThan(0);
  });

  it('EM10: Shatter 4 hits every unbroken part of the target enemy, not its core', () => {
    const c = combatWith({
      board: { B2: 'test-shatter-4' },
      ticks: 1,
      enemies: [
        {
          core: 30,
          parts: [
            { id: 'a', hp: 10, act: 'attack 1' },
            { id: 'b', hp: 10, act: 'attack 1' },
            { id: 'c', hp: 10, act: 'attack 1' },
          ],
        },
      ],
      order: ['e0.core'],
    });
    runTurn(c);
    expect(['a', 'b', 'c'].map((id) => part(c, 0, id).hp)).toEqual([6, 6, 6]);
    expect(c.enemies[0].hp).toBe(30);
  });

  it('EM11: Drill 10 ignores Shell and a standing Bulwark', () => {
    const c = combatWith({
      board: { B2: 'test-drill-10' },
      ticks: 1,
      enemies: [{ core: 30, bump: 'attack 1', parts: [{ id: 'plate', hp: 5, passive: { kind: 'bulwark' } }] }],
      order: ['e0.core'],
    });
    c.enemies[0].shell = 6;
    const pv = previewTurn(c);
    expect(pv.byTarget['e0.core'].damage).toBe(10);
    runTurn(c);
    expect(c.enemies[0].hp).toBe(20);
  });
});

describe('10. Enemy actions: counters to turtling and burst', () => {
  it('EA1: Pierce 7 ignores 20 Plating', () => {
    const c = combatWith({ enemies: [{ core: 99, parts: [{ id: 'drill', hp: 10, act: 'pierce 7' }] }], plating: 20 });
    runTurn(c);
    expect(c.playerHp).toBe(43);
  });

  it('EA2: Corrode 50% strips half the Plating (rounded up) before the attack; it scales with the stack', () => {
    const a = combatWith({ enemies: [{ core: 99, parts: [{ id: 'arm', hp: 10, act: 'corrode 50%, attack 9' }] }], plating: 12 });
    runTurn(a);
    expect(a.playerHp).toBe(47);
    const b = combatWith({ enemies: [{ core: 99, parts: [{ id: 'arm', hp: 10, act: 'corrode 50%, attack 9' }] }], plating: 40 });
    const r = runTurn(b);
    expect(b.playerHp).toBe(50);
    expect(r.events.find((e) => e.kind === 'corrode')?.amount).toBe(20);
  });

  it('EA3: Siphon 8 into 10 Plating heals the core by the 8 Plating it removed', () => {
    const c = combatWith({ enemies: [{ core: 40, parts: [{ id: 'tube', hp: 10, act: 'siphon 8' }] }], plating: 10 });
    c.enemies[0].hp = 30;
    runTurn(c);
    expect(c.playerHp).toBe(50);
    expect(c.enemies[0].hp).toBe(38);
  });

  it('EA4: Ratchet 2 grows every turn its part stands, and stops when it breaks', () => {
    const c = combatWith({
      enemies: [
        { core: 99, parts: [{ id: 'tail', hp: 3, passive: { kind: 'ratchet', x: 2 } }, { id: 'jaw', hp: 20, act: 'attack 5' }] },
      ],
    });
    runTurn(c);
    expect(c.enemies[0].statuses.strength).toBe(2);
    expect(c.playerHp).toBe(43);
    runTurn(c);
    expect(c.enemies[0].statuses.strength).toBe(4);
    expect(c.playerHp).toBe(34);
    put(c, 'B2', 'test-strike-3');
    setOrder(c, ['e0.tail']);
    c.ticksThisTurn = 1;
    runTurn(c);
    expect(part(c, 0, 'tail').broken).toBe(true);
    expect(c.enemies[0].statuses.strength).toBe(4);
    expect(c.playerHp).toBe(25);
  });

  it('EA5: Countdown 2 lands on the second enemy turn and resets; breaking defuses it; Jam delays it a turn', () => {
    const mk = () =>
      combatWith({ enemies: [{ core: 99, bump: 'shell 1', parts: [{ id: 'bomb', hp: 10, act: 'pierce 25', cadence: { countdown: 2 } }] }] }); // bump: a defused bomb leaves the core Bump, which must not hit
    const a = mk();
    runTurn(a);
    expect(a.playerHp).toBe(50);
    runTurn(a);
    expect(a.playerHp).toBe(25);
    expect(part(a, 0, 'bomb').countdown).toBe(2);

    const b = mk();
    put(b, 'B2', 'test-strike-10');
    setOrder(b, ['e0.bomb']);
    b.ticksThisTurn = 1;
    runTurn(b);
    b.board[cell('B2')] = null;
    runTurn(b);
    expect(b.playerHp).toBe(50);

    const j = mk();
    put(j, 'B2', 'test-jam');
    setOrder(j, ['e0.bomb']);
    j.ticksThisTurn = 1;
    runTurn(j);
    j.board[cell('B2')] = null;
    runTurn(j);
    expect(j.playerHp).toBe(50);
    runTurn(j);
    expect(j.playerHp).toBe(25);
  });

  it('EA12: Build-up 6 to 20 with the drained bonus fires on the third turn after draining 4, then drops to 0', () => {
    const c = combatWith({
      hp: 60,
      pressure: 10,
      enemies: [
        {
          core: 99,
          parts: [
            { id: 'valve', hp: 10, act: 'drain 4', cadence: { of: 3, at: [2] } },
            { id: 'gauge', hp: 20, act: 'attack 40', cadence: { buildUp: 6, to: 20, bonus: 'drained' } },
          ],
        },
      ],
    });
    runTurn(c);
    expect(part(c, 0, 'gauge').gauge).toBe(6);
    runTurn(c);
    expect(part(c, 0, 'gauge').gauge).toBe(16);
    expect(c.playerHp).toBe(60);
    runTurn(c);
    expect(c.playerHp).toBe(20);
    expect(part(c, 0, 'gauge').gauge).toBe(0);
  });

  it('EA6: a standing Bulwark halves Strikes to the core (rounded down)', () => {
    const mk = () =>
      combatWith({
        board: { B2: 'piston' },
        pressure: 3,
        ticks: 1,
        enemies: [{ core: 30, bump: 'attack 1', parts: [{ id: 'plate', hp: 20, passive: { kind: 'bulwark' } }] }],
        order: ['e0.core'],
      });
    const a = mk();
    runTurn(a);
    expect(a.enemies[0].hp).toBe(26);
    const b = mk();
    part(b, 0, 'plate').broken = true;
    runTurn(b);
    expect(b.enemies[0].hp).toBe(21);
  });

  it('EA7: Governor 8 caps a Strike 20 at 8; the rest is lost', () => {
    const c = combatWith({
      board: { B2: 'test-strike-20' },
      ticks: 1,
      enemies: [{ core: 50, bump: 'attack 1', parts: [{ id: 'hat', hp: 20, passive: { kind: 'governor', cap: 8 } }] }],
      order: ['e0.core'],
    });
    const r = runTurn(c);
    expect(c.enemies[0].hp).toBe(42);
    expect(lostTotal(r.events)).toBe(12);
  });

  it('EA8: a rebuild Mend brings a broken part back at half HP (rounded up) and takes it off the salvage list', () => {
    const c = combatWith({
      board: { B2: 'spur' },
      ticks: 1,
      enemies: [
        {
          core: 99,
          parts: [
            { id: 'jaw', hp: 3, act: 'attack 1', salvage: 'spur' },
            { id: 'mender', hp: 20, act: 'rebuild jaw' },
          ],
        },
      ],
      order: ['e0.jaw'],
    });
    runTurn(c);
    expect(part(c, 0, 'jaw').broken).toBe(false);
    expect(part(c, 0, 'jaw').hp).toBe(2);
    expect(c.broken.some((b) => b.partId === 'jaw')).toBe(false);
  });

  it('EA9: Jam makes a part skip its next action only', () => {
    const c = combatWith({
      board: { B2: 'test-jam' },
      ticks: 1,
      enemies: [{ core: 99, parts: [{ id: 'jaw', hp: 20, act: 'attack 5' }] }],
      order: ['e0.jaw'],
    });
    runTurn(c);
    expect(c.playerHp).toBe(50);
    c.board[cell('B2')] = null;
    runTurn(c);
    expect(c.playerHp).toBe(45);
  });

  it('EA10: Patch 5 heals, never above max HP', () => {
    const a = combatWith({ board: { B2: 'test-patch-5' }, ticks: 1 });
    a.playerHp = 30;
    runTurn(a);
    expect(a.playerHp).toBe(35);
    const b = combatWith({ board: { B2: 'test-patch-5' }, ticks: 1 });
    b.playerHp = 48;
    runTurn(b);
    expect(b.playerHp).toBe(50);
  });
});

describe('11. Wardens: phase changes and Braced', () => {
  it('WP1: the last keystone breaking ends the phase at the end of the Run; the rest of the Run is lost; the next turn is the phase action', () => {
    const c = combatWith({
      board: { B2: 'test-strike-31' },
      enemies: [
        {
          core: 50,
          warden: {
            phases: [
              {
                keystones: ['a', 'b'],
                parts: [
                  { id: 'a', hp: 10, act: 'attack 1', keystone: true },
                  { id: 'b', hp: 10, act: 'attack 1', keystone: true },
                ],
              },
              { keystones: [], parts: [{ id: 'c', hp: 20, act: 'attack 2' }], action: 'shell 5', coreExposed: true },
            ],
          },
        },
      ],
      order: ['e0.a', 'e0.b'],
    });
    part(c, 0, 'a').hp = 1;
    part(c, 0, 'b').hp = 1;
    const r = runTurn(c);
    const e = c.enemies[0];
    expect(e.phase).toBe(1);
    expect(e.hp).toBe(50);
    expect(lostTotal(r.events)).toBe(91);
    expect(e.shell).toBe(5);
    expect(c.playerHp).toBe(50);
    expect(part(c, 0, 'c').broken).toBe(false);
    expect(e.intents.map((i) => i.partId)).toEqual(['c']);
  });

  it('WP8: Braced: a 40 HP keystone takes at most 20 a turn, a last-phase 90 HP core at most 30', () => {
    const a = combatWith({
      board: { B2: 'test-strike-100' },
      ticks: 1,
      enemies: [
        {
          core: 100,
          warden: {
            phases: [
              { keystones: ['k'], parts: [{ id: 'k', hp: 40, act: 'attack 1', keystone: true }] },
              { keystones: [], parts: [], coreExposed: true },
            ],
          },
        },
      ],
      order: ['e0.k'],
    });
    runTurn(a);
    expect(part(a, 0, 'k').hp).toBe(20);
    const b = combatWith({
      board: { B2: 'test-strike-100' },
      ticks: 1,
      enemies: [{ core: 90, bump: 'attack 1', warden: { phases: [{ keystones: [], parts: [], coreExposed: true }] } }],
      order: ['e0.core'],
    });
    runTurn(b);
    expect(b.enemies[0].hp).toBe(60);
  });
});

describe('13. Salvage', () => {
  it('SV1 (rules): a broken part offers its salvage; scrapping pays 3, a wrecked part 1', () => {
    const c = combatWith({
      board: { B2: 'spur' },
      ticks: 1,
      enemies: [{ core: 99, parts: [{ id: 'jaw', hp: 3, act: 'attack 1', salvage: 'spur' }, { id: 'plate', hp: 9, act: 'shell 1', salvage: 'escapement' }] }],
      order: ['e0.jaw'],
    });
    runTurn(c);
    const items = salvageItems(c, () => true);
    expect(items.map((i) => i.salvage)).toEqual(['spur']);
    expect(salvagePayout(items, [], 1)).toEqual({ kept: [], scrap: 4 });
    expect(salvagePayout(items, [0], 1)).toEqual({ kept: ['spur'], scrap: 1 });
  });

  it('SV2: a broken part whose salvage is locked pays 6 and cannot be kept', () => {
    const c = combatWith({
      board: { B2: 'spur' },
      ticks: 1,
      enemies: [{ core: 99, parts: [{ id: 'haunch', hp: 3, act: 'attack 1', salvage: 'volute', rarity: 'rare' }] }],
      order: ['e0.haunch'],
    });
    runTurn(c);
    const items = salvageItems(c, (id) => id !== 'volute');
    expect(items).toHaveLength(1);
    expect(items[0].locked).toBe(true);
    expect(salvagePayout(items, [0], 0)).toEqual({ kept: [], scrap: 6 });
  });
});
