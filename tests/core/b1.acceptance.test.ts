// B1 acceptance tests (docs/acceptance.md). Written before the build; never weaken an assertion.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { MANIFEST } from '../../src/art/manifest';
import { ENEMIES } from '../../src/core/content/enemies';
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
  // A1, rescoped to AR1 by D-033 (docs/spike-art.md): painted art ships as WebP under public/art/, listed in the manifest.
  // v1 banned every image; the sound and font bans stay, and so does "nothing hand-drawn outside the manifest".
  const walk = (dir: string): string[] => {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  };
  const norm = (p: string): string => p.replace(/\\/g, '/');

  it('A1: no audio or font files in src/ or public/, and no SVG', () => {
    const banned = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.flac', '.aac', '.opus', '.ttf', '.otf', '.woff', '.woff2', '.eot', '.svg']);
    expect([...walk('src'), ...walk('public')].filter((p) => banned.has(extname(p).toLowerCase())).map(norm)).toEqual([]);
  });

  it('A1: images only as WebP under public/art/, none in src/', () => {
    const images = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp', '.ico']);
    expect(walk('src').filter((p) => images.has(extname(p).toLowerCase())).map(norm)).toEqual([]);
    const stray = walk('public')
      .filter((p) => images.has(extname(p).toLowerCase()))
      .filter((p) => !(norm(p).startsWith('public/art/') && extname(p).toLowerCase() === '.webp'));
    expect(stray.map(norm)).toEqual([]);
  });

  it('A1: every file under public/art/ is in the manifest with a source under art/, and every entry has its file', () => {
    const listed = new Set(MANIFEST.flatMap((e) => e.files.map((f) => `public/${f.path}`)));
    for (const p of walk('public/art').map(norm)) expect(listed.has(p), p).toBe(true);
    for (const e of MANIFEST) {
      expect(existsSync(e.source), `${e.id} source ${e.source}`).toBe(true);
      for (const f of e.files) expect(existsSync(join('public', f.path)), f.path).toBe(true);
    }
  });

  it('A1: size budget, 120 KB per regular cut-out, 250 KB per warden, 600 KB per scene, 6 MB in all', () => {
    let total = 0;
for (const e of MANIFEST) {      const sizes = e.files.map((f) => statSync(join('public', f.path)).size);      if (e.id === 'bellfoot' || e.id === 'title') expect(sizes.reduce((n, x) => n + x, 0), 'scene ' + e.id).toBeLessThanOrEqual(600 * 1024);      else for (const [i, n] of sizes.entries()) expect(n, e.files[i].path).toBeLessThanOrEqual(ENEMIES[e.id]?.tier === 'boss' ? 250 * 1024 : 120 * 1024);      total += sizes.reduce((n, x) => n + x, 0);    }
    expect(total).toBeLessThanOrEqual(6 * 1024 * 1024);
  });
});
