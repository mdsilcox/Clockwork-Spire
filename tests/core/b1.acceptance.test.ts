// B1 acceptance tests (docs/acceptance.md). Written before the build; never weaken an assertion.
import { describe, expect, it } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { combatWith, cell } from '../../src/core/testkit';
import { createCombat, placePart, previewTurn, runTurn } from '../../src/core/combat';
import { MAINSPRING } from '../../src/core/types';

const dmg = (c: { enemies: { hp: number; maxHp: number }[] }, i = 0) => c.enemies[i].maxHp - c.enemies[i].hp;

describe('B1 machine', () => {
  it('M1: a Spur next to the Mainspring strikes 3 on each of 3 ticks', () => {
    const c = combatWith({ board: { B2: 'spur' } });
    const r = runTurn(c);
    expect(dmg(c)).toBe(9);
    expect(r.preview.momentum).toBe(3);
  });

  it('M2: a part not connected to the Mainspring never fires', () => {
    const c = combatWith({ board: { C2: 'spur' } });
    const r = runTurn(c);
    expect(dmg(c)).toBe(0);
    expect(r.events.some((e) => e.kind === 'power' && e.cell === cell('C2'))).toBe(false);
  });

  it('M3: a Coil Spring holds twice, then releases Strike 10 and passes motion', () => {
    const c = combatWith({ board: { B2: 'coil', C2: 'spur' } });
    runTurn(c);
    expect(dmg(c)).toBe(13);
    expect(c.board[cell('B2')]!.charge).toBe(0);
  });

  it('M4: an Idler boosts the next part by 2', () => {
    const c = combatWith({ board: { B2: 'idler', C2: 'spur' } });
    runTurn(c);
    expect(dmg(c)).toBe(15);
  });

  it('M6: the preview equals the run and never mutates state', () => {
    const c = combatWith({
      board: { B2: 'idler', C2: 'spur', B1: 'coil', B3: 'escapement', C1: 'cam', C3: 'boiler', D3: 'piston' },
      pressure: 4,
    });
    const before = JSON.stringify(c);
    const p1 = previewTurn(c);
    expect(JSON.stringify(c)).toBe(before);
    const p2 = previewTurn(c);
    expect(p2).toEqual(p1);
    const r = runTurn(c);
    expect(r.preview).toEqual(p1);
    expect(dmg(c)).toBe(p1.damageByEnemy[0]);
  });

  it('M11: the same seed and the same choices give identical event lists', () => {
    const play = () => {
      const bin = ['spur', 'spur', 'spur', 'escapement', 'escapement', 'escapement', 'idler', 'coil'].map(
        (defId, i) => ({ uid: i + 1, defId, plus: false }),
      );
      const c = createCombat({ seed: 1234, bin, enemies: ['rust-mite', 'rust-mite'], hp: 50, maxHp: 50 });
      const all: unknown[] = [];
      for (let t = 0; t < 6 && c.outcome === 'ongoing'; t++) {
        const free = [cell('B2'), cell('A1'), cell('A3'), cell('C2'), cell('B1'), cell('B3'), cell('D2')];
        let placed = 0;
        for (const target of free) {
          if (placed >= 2 || c.hand.length === 0) break;
          if (c.board[target] === null && placePart(c, 0, target)) placed++;
        }
        all.push(runTurn(c).events);
      }
      return JSON.stringify(all);
    };
    expect(play()).toBe(play());
  });

  it('M13: placing onto an occupied cell discards the old part and clears its charge', () => {
    const c = combatWith({ board: { B2: 'coil' }, hand: ['spur'] });
    c.board[cell('B2')]!.charge = 2;
    const oldUid = c.board[cell('B2')]!.uid;
    const left = c.placementsLeft;
    expect(placePart(c, 0, cell('B2'))).toBe(true);
    expect(c.board[cell('B2')]!.defId).toBe('spur');
    expect(c.discard).toContain(oldUid);
    expect(c.placementsLeft).toBe(left - 1);
  });

  it('M14: nothing can be placed on the Mainspring', () => {
    const c = combatWith({ hand: ['spur'] });
    const before = JSON.stringify(c);
    expect(placePart(c, 0, MAINSPRING)).toBe(false);
    expect(JSON.stringify(c)).toBe(before);
  });
});

describe('B1 combat', () => {
  it('C1: Plating absorbs an attack and falls away at the start of the next turn', () => {
    const c = combatWith({ board: { B2: 'escapement' }, enemies: ['test-attacker-8'], ticks: 1 });
    const hp = c.playerHp;
    runTurn(c); // 1 tick: Plate 3; enemy attacks 8
    expect(c.playerHp).toBe(hp - 5);
    expect(c.plating).toBe(0);
  });

  it('C2: killing every enemy wins the combat', () => {
    const c = combatWith({ board: { B2: 'spur' }, enemies: [{ core: 5 }] });
    runTurn(c);
    expect(c.outcome).toBe('won');
  });
});

describe('B1 assets', () => {
  it('A1: no image, font or audio files ship with the game', () => {
    const banned = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp3', '.ogg', '.wav', '.m4a', '.ttf', '.otf', '.woff', '.woff2']);
    const found: string[] = [];
    const walk = (dir: string) => {
      let entries: string[] = [];
      try {
        entries = readdirSync(dir);
      } catch {
        return;
      }
      for (const name of entries) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (banned.has(extname(name).toLowerCase())) found.push(p);
      }
    };
    walk('src');
    walk('public');
    expect(found).toEqual([]);
  });
});
