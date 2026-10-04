import { describe, expect, it } from 'vitest';
import { cell, cellName, diagonals, neighbors } from '../../src/core/board';
import { chooseIntent, createCombat, placePart, previewTurn, runTurn, setTarget, swapParts } from '../../src/core/combat';
import { PARTS } from '../../src/core/content/parts';
import { initStreams, int, next, pick, shuffle, split } from '../../src/core/rng';
import { combatWith } from '../../src/core/testkit';
import type { CombatState } from '../../src/core/types';

const lost = (c: CombatState, i = 0) => c.enemies[i].maxHp - c.enemies[i].hp;

describe('rng', () => {
  it('is deterministic per seed and stream', () => {
    const a = initStreams(42);
    const b = initStreams(42);
    const seqA = [next(a, 'draw'), next(a, 'draw'), next(a, 'enemy')];
    const seqB = [next(b, 'draw'), next(b, 'draw'), next(b, 'enemy')];
    expect(seqA).toEqual(seqB);
  });

  it('streams and seeds differ', () => {
    expect(split(1, 'draw')).not.toBe(split(1, 'enemy'));
    expect(split(1, 'draw')).not.toBe(split(2, 'draw'));
  });

  it('streams are independent: drawing from one does not move another', () => {
    const a = initStreams(7);
    const b = initStreams(7);
    next(a, 'draw');
    next(a, 'draw');
    expect(next(a, 'enemy')).toBe(next(b, 'enemy'));
  });

  it('int stays in range, pick returns an item, shuffle is a permutation and does not mutate', () => {
    const r = initStreams(3);
    for (let i = 0; i < 200; i++) {
      const n = int(r, 'draw', 7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
    }
    expect(['a', 'b', 'c']).toContain(pick(r, 'draw', ['a', 'b', 'c']));
    const src = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(r, 'draw', src);
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(out.slice().sort((x, y) => x - y)).toEqual(src);
  });
});

describe('board geometry', () => {
  it('names and indexes cells', () => {
    expect(cell('A1')).toBe(0);
    expect(cell('A2')).toBe(5);
    expect(cell('B2')).toBe(6);
    expect(cell('E3')).toBe(14);
    for (let i = 0; i < 15; i++) expect(cell(cellName(i))).toBe(i);
    expect(() => cell('F1')).toThrow();
  });

  it('orders neighbors up, right, down, left', () => {
    expect(neighbors(cell('A2'))).toEqual([cell('A1'), cell('B2'), cell('A3')]);
    expect(neighbors(cell('B2'))).toEqual([cell('B1'), cell('C2'), cell('B3'), cell('A2')]);
    expect(neighbors(cell('E3'))).toEqual([cell('E2'), cell('D3')]);
  });

  it('lists diagonals', () => {
    expect(diagonals(cell('B2')).sort((a, b) => a - b)).toEqual([cell('A1'), cell('C1'), cell('A3'), cell('C3')].sort((a, b) => a - b));
    expect(diagonals(cell('A1'))).toEqual([cell('B2')]);
  });
});

describe('B1 parts: base and upgraded', () => {
  it('registers the eight parts with text for both forms', () => {
    for (const id of ['spur', 'idler', 'coil', 'escapement', 'cam', 'boiler', 'piston', 'pendulum']) {
      expect(PARTS[id].text.length).toBeGreaterThan(0);
      expect(PARTS[id].textPlus.length).toBeGreaterThan(0);
    }
  });

  it('spur: Strike 3 / 5 on three ticks', () => {
    expect(lost(run({ B2: 'spur' }))).toBe(9);
    expect(lost(run({ B2: 'spur+' }))).toBe(15);
  });

  it('idler: Boost 2 / 3 to the next part', () => {
    expect(lost(run({ B2: 'idler', C2: 'spur' }))).toBe(15);
    expect(lost(run({ B2: 'idler+', C2: 'spur' }))).toBe(18);
  });

  it('coil: releases Strike 10 / 14 on the third tick', () => {
    expect(lost(run({ B2: 'coil' }))).toBe(10);
    expect(lost(run({ B2: 'coil+' }))).toBe(14);
  });

  it('coil keeps its charge across turns', () => {
    const c = combatWith({ board: { B2: 'coil' }, ticks: 2 });
    runTurn(c);
    expect(c.board[cell('B2')]!.charge).toBe(2);
    c.ticksThisTurn = 3;
    runTurn(c);
    expect(lost(c)).toBe(10);
    expect(c.board[cell('B2')]!.charge).toBe(2);
  });

  it('escapement: Plate 3 / 5 per tick', () => {
    expect(previewTurn(combatWith({ board: { B2: 'escapement' } })).plating).toBe(9);
    expect(previewTurn(combatWith({ board: { B2: 'escapement+' } })).plating).toBe(15);
  });

  it('cam: every second firing strikes 7 / 10', () => {
    expect(lost(run({ B2: 'cam' }, { ticks: 4 }))).toBe(14);
    expect(lost(run({ B2: 'cam+' }, { ticks: 4 }))).toBe(20);
    expect(lost(run({ B2: 'cam' }))).toBe(7);
  });

  it('boiler: +2 / +3 Pressure per tick', () => {
    expect(previewTurn(combatWith({ board: { B2: 'boiler' } })).pressureAfter).toBe(6);
    expect(previewTurn(combatWith({ board: { B2: 'boiler+' } })).pressureAfter).toBe(9);
  });

  it('piston: spends 3 Pressure for Strike 9 / 13, else strikes 2 and spends nothing', () => {
    const c = combatWith({ board: { B2: 'piston' }, pressure: 6 });
    runTurn(c);
    expect(lost(c)).toBe(9 + 9 + 2);
    expect(c.pressure).toBe(0);
    expect(lost(run({ B2: 'piston+' }, { pressure: 6 }))).toBe(13 + 13 + 2);
    const dry = combatWith({ board: { B2: 'piston' }, pressure: 2 });
    runTurn(dry);
    expect(lost(dry)).toBe(6);
    expect(dry.pressure).toBe(2);
  });

  it('pendulum: Strike 1, and the first firing adds one tick (capped at 8)', () => {
    const c = combatWith({ board: { B2: 'pendulum' } });
    const r = runTurn(c);
    expect(lost(c)).toBe(4);
    expect(r.preview.ticks).toBe(4);
    const plus = combatWith({ board: { B2: 'pendulum+' } });
    expect(previewTurn(plus).plating).toBe(16);
    const capped = combatWith({ board: { B2: 'pendulum' }, ticks: 8 });
    expect(previewTurn(capped).ticks).toBe(8);
  });

  it('a part fires at most once per tick even when two neighbors could power it', () => {
    const c = combatWith({ board: { B2: 'spur', B1: 'spur', B3: 'spur', C2: 'spur' } });
    const r = previewTurn(c);
    expect(Object.values(r.firing).every((n) => n === 3)).toBe(true);
  });
});

describe('Shell, Plating and enemies', () => {
  it('Shell absorbs strikes and falls away at the start of the enemy turn', () => {
    const c = combatWith({ board: { B2: 'spur' }, enemies: ['cog-rat'] });
    c.enemies[0].shell = 5;
    c.enemies[0].intent = { kind: 'special', label: 'Waits' };
    runTurn(c);
    expect(lost(c)).toBe(4);
    expect(c.enemies[0].shell).toBe(0);
  });

  it('a defend intent grants Shell that lasts through the next player turn', () => {
    const c = combatWith({ enemies: ['cog-rat'] });
    c.enemies[0].intent = { kind: 'defend', amount: 5, label: 'Shell 5' };
    runTurn(c);
    expect(c.enemies[0].shell).toBe(5);
  });

  it('multi-hit attacks hit once per hit and Plating absorbs from the pool', () => {
    const c = combatWith({ board: { B2: 'escapement' }, enemies: ['cog-rat'], ticks: 1 });
    runTurn(c); // Plate 3, cog rat attacks 4 x2: 3 + 8 - 3 = 5 lost
    expect(c.playerHp).toBe(50 - 5);
  });

  it('losing: the player at 0 HP loses the combat', () => {
    const c = combatWith({ enemies: ['test-attacker-8'], hp: 8 });
    runTurn(c);
    expect(c.playerHp).toBe(0);
    expect(c.outcome).toBe('lost');
  });

  it('strikes move on to the next living enemy when the target dies', () => {
    const c = combatWith({ board: { B2: 'spur' }, enemies: ['rust-mite', 'rust-mite'] });
    c.enemies[0].hp = 2;
    runTurn(c);
    expect(c.enemies[0].hp).toBe(0);
    expect(c.enemies[1].maxHp - c.enemies[1].hp).toBe(3 + 3);
  });

  it('setTarget aims strikes at a living enemy', () => {
    const c = combatWith({ board: { B2: 'spur' }, enemies: ['rust-mite', 'rust-mite'] });
    setTarget(c, 1);
    runTurn(c);
    expect(lost(c, 0)).toBe(0);
    expect(lost(c, 1)).toBe(9);
  });
});

describe('Pressure', () => {
  it('overpressure above 20 costs 6 HP and drops Pressure to 10', () => {
    const c = combatWith({ pressure: 25 });
    const pre = previewTurn(c);
    expect(pre.overpressure).toBe(true);
    expect(pre.pressureAfter).toBe(10);
    runTurn(c);
    expect(c.playerHp).toBe(44);
    expect(c.pressure).toBe(10);
  });

  it('exactly 20 is safe, and Pressure caps at 30', () => {
    const c = combatWith({ pressure: 20 });
    expect(previewTurn(c).overpressure).toBe(false);
    const big = combatWith({ board: { B2: 'boiler+' }, pressure: 29 });
    const p = previewTurn(big);
    expect(p.overpressure).toBe(true);
  });
});

describe('Rust and sabotage', () => {
  it('a rusted part neither fires nor passes motion', () => {
    const c = combatWith({ board: { B2: 'spur', C2: 'spur' } });
    c.board[cell('B2')]!.rusted = 1;
    runTurn(c);
    expect(lost(c)).toBe(0);
    expect(c.board[cell('B2')]!.rusted).toBe(0);
  });

  it('a Rust Mite names an occupied target cell when it picks its sabotage', () => {
    const c = combatWith({ board: { B2: 'spur', C2: 'spur' }, enemies: ['rust-mite'] });
    c.enemies[0].step = 2;
    for (let i = 0; i < 20; i++) {
      chooseIntent(c, 0);
      expect(c.enemies[0].intent.kind).toBe('sabotage');
      expect([cell('B2'), cell('C2')]).toContain(c.enemies[0].intent.target);
    }
  });

  it('executing the intent rusts the target for the next turn', () => {
    const c = combatWith({ board: { B2: 'spur', C2: 'spur' }, enemies: ['rust-mite'] });
    c.enemies[0].hp = c.enemies[0].maxHp = 99;
    c.enemies[0].intent = { kind: 'sabotage', sabotage: 'rust', target: cell('B2'), label: 'Rusts a part' };
    runTurn(c);
    expect(c.board[cell('B2')]!.rusted).toBe(1);
    expect(previewTurn(c).damageByEnemy[0]).toBe(0);
  });

  it('a sabotage on an empty cell fizzles', () => {
    const c = combatWith({ board: { B2: 'spur' }, enemies: ['rust-mite'] });
    c.enemies[0].intent = { kind: 'sabotage', sabotage: 'rust', target: cell('D2'), label: 'Rusts a part' };
    const r = runTurn(c);
    expect(c.board[cell('B2')]!.rusted).toBe(0);
    expect(r.events.some((e) => e.kind === 'sabotage' && e.note === 'fizzle')).toBe(true);
  });
});

describe('combat flow', () => {
  const bin = () =>
    ['spur', 'spur', 'spur', 'escapement', 'escapement', 'escapement', 'idler', 'coil'].map((defId, i) => ({
      uid: i + 1,
      defId,
      plus: false,
    }));

  it('deals a hand of 3, gives 2 placements and keeps every uid in exactly one place', () => {
    const c = createCombat({ seed: 9, bin: bin(), enemies: ['rust-mite'], hp: 50, maxHp: 50 });
    expect(c.hand.length).toBe(3);
    expect(c.placementsLeft).toBe(2);
    for (let t = 0; t < 4 && c.outcome === 'ongoing'; t++) {
      placePart(c, 0, cell('B2'));
      placePart(c, 0, cell('A1'));
      runTurn(c);
      const all = [...c.hand, ...c.draw, ...c.discard, ...c.board.filter((p) => p).map((p) => p!.uid)];
      expect(all.slice().sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(c.board[5]).toBeNull();
    }
  });

  it('refuses a third placement and a swap twice in a turn', () => {
    const c = createCombat({ seed: 9, bin: bin(), enemies: ['dummy'], hp: 50, maxHp: 50 });
    expect(placePart(c, 0, cell('B2'))).toBe(true);
    expect(placePart(c, 0, cell('C2'))).toBe(true);
    expect(placePart(c, 0, cell('D2'))).toBe(false);
    expect(swapParts(c, cell('B2'), cell('C2'))).toBe(true);
    expect(swapParts(c, cell('B2'), cell('C2'))).toBe(false);
  });

  it('a swap moves stored charge with the part', () => {
    const c = combatWith({ board: { B2: 'coil', C2: 'spur' } });
    c.board[cell('B2')]!.charge = 2;
    expect(swapParts(c, cell('B2'), cell('C2'))).toBe(true);
    expect(c.board[cell('C2')]!.defId).toBe('coil');
    expect(c.board[cell('C2')]!.charge).toBe(2);
  });

  it('reshuffles the discard when the draw pile runs out', () => {
    const c = createCombat({ seed: 3, bin: bin().slice(0, 4), enemies: ['dummy'], hp: 50, maxHp: 50 });
    for (let t = 0; t < 4; t++) runTurn(c);
    expect(c.hand.length).toBe(3);
  });
});

function run(board: Record<string, string>, o: { ticks?: number; pressure?: number } = {}): CombatState {
  const c = combatWith({ board, ...o });
  runTurn(c);
  return c;
}
