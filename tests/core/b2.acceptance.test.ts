// B2 acceptance tests (docs/acceptance.md). Written before the build; never weaken an assertion.
import { describe, expect, it } from 'vitest';
import { combatWith, cell } from '../../src/core/testkit';
import { runTurn, previewTurn } from '../../src/core/combat';
import { PARTS } from '../../src/core/content/parts';
import { ENEMIES } from '../../src/core/content/enemies';

const dmg = (c: { enemies: { hp: number; maxHp: number }[] }, i = 0) => c.enemies[i].maxHp - c.enemies[i].hp;

describe('B2 machine', () => {
  it('M5: a Pendulum adds a tick the first time it fires each turn', () => {
    const c = combatWith({ board: { B2: 'pendulum', C2: 'spur' } });
    const r = runTurn(c);
    expect(r.preview.ticks).toBe(4);
    expect(dmg(c)).toBe(16);
  });

  it('M7: a Rusted part neither fires nor passes motion, and the rust clears after the turn', () => {
    const c = combatWith({ board: { B2: 'spur', C2: 'spur' } });
    c.board[cell('B2')]!.rusted = 1;
    runTurn(c);
    expect(dmg(c)).toBe(0);
    expect(c.board[cell('B2')]!.rusted).toBe(0);
    runTurn(c);
    expect(dmg(c)).toBe(18);
  });

  it('M8: Pressure above 20 at the end of the turn overpressures: 6 damage, Pressure 10', () => {
    const c = combatWith({ board: { A1: 'boiler', B2: 'boiler', A3: 'boiler' }, pressure: 4 });
    const hp = c.playerHp;
    const r = runTurn(c);
    expect(r.preview.overpressure).toBe(true);
    expect(c.playerHp).toBe(hp - 6);
    expect(c.pressure).toBe(10);
  });

  it('M9: a Lever makes the parts it powers fire with Echo', () => {
    const c = combatWith({ board: { B2: 'lever', C2: 'spur' } });
    runTurn(c);
    expect(dmg(c)).toBe(18);
  });

  it('M10: a Cam pays off on every 2nd firing, counted across turns', () => {
    const c = combatWith({ board: { B2: 'cam' } });
    runTurn(c);
    expect(dmg(c)).toBe(7);
    runTurn(c);
    expect(dmg(c)).toBe(21);
  });

  it('M12: the catalog has 46 parts in 6 families, each complete and upgradable', () => {
    const all = Object.values(PARTS);
    expect(all.length).toBeGreaterThanOrEqual(46);
    expect(new Set(all.map((p) => p.family)).size).toBeGreaterThanOrEqual(6);
    for (const p of all) {
      expect(p.name.length, p.id).toBeGreaterThan(0);
      expect(['common', 'uncommon', 'rare', 'masterwork', 'legendary'], p.id).toContain(p.rarity);
      expect(p.text.length, p.id).toBeGreaterThan(0);
      expect(p.textPlus.length, p.id).toBeGreaterThan(0);
      expect(p.textPlus, p.id).not.toBe(p.text);
    }
    // v1's 17, plus Sapper, Core Drill and Sunder (v2), plus the Masterwork stubs (all locked until B9)
    expect(all.filter((p) => p.locked && p.rarity !== 'masterwork' && p.rarity !== 'legendary').length).toBe(20);
    expect(all.filter((p) => p.rarity === 'masterwork' || p.rarity === 'legendary').every((p) => p.locked)).toBe(true); // B9b: 10 M and 5 L, all locked
  });

  it('M12b: every part fires without error, base and upgraded, in a busy machine', () => {
    for (const id of Object.keys(PARTS)) {
      for (const spec of [id, `${id}+`]) {
        const c = combatWith({
          board: { B2: spec, C2: 'spur', B1: 'cam', B3: 'boiler', C1: spec, C3: 'coil', D2: 'chime' },
          pressure: 12,
          enemies: ['dummy', 'dummy'],
        });
        const p = previewTurn(c);
        const r = runTurn(c);
        expect(r.preview, spec).toEqual(p);
        runTurn(c);
      }
    }
  });
});

describe('B2 enemies', () => {
  it('C4 (v2): 15 regulars and 6 elites are frames, 3 bosses stay v1 until B9, all distinct; fights are covered by EM1 and b7-machines', () => {
    const defs = Object.values(ENEMIES).filter((d) => !['dummy', 'tutorial-automaton'].includes(d.id) && !d.id.startsWith('test-'));
    const tier = (t: string) => defs.filter((d) => d.tier === t && !(d as { summonOnly?: boolean }).summonOnly);
    expect(tier('normal')).toHaveLength(15);
    expect(tier('elite')).toHaveLength(6);
    expect(tier('boss')).toHaveLength(3);
    const signatures = new Set<string>();
    for (const d of defs) {
      if (d.frame) {
        expect(d.hp, d.id).toBe(d.frame.core);
        expect(d.frame.bestiary.length, d.id).toBeGreaterThan(0);
        expect(d.frame.coreAction.kind, d.id).toBe('attack');
      } else {
        expect(d.tier, `${d.id} is legacy only as a warden`).toBe('boss');
      }
      const parts = d.frame?.parts.map((q) => `${q.id}:${q.hp}`).join(',') ?? 'legacy';
      signatures.add(`${d.id}|${d.hp}|${parts}`);
    }
    expect(signatures.size).toBe(defs.length);
  });

  it('C5 (rules): a Gauge Gremlin rust intent names an occupied target cell when shown', () => {
    const c = combatWith({ board: { B2: 'spur', C2: 'spur' }, enemies: ['gauge-gremlin'], hp: 999 });
    let found = false;
    for (let t = 0; t < 6; t++) {
      const it = c.enemies[0].intent;
      if (it.kind === 'sabotage' && it.sabotage === 'rust') {
        expect(it.target).toBeDefined();
        expect(c.board[it.target!]).not.toBeNull();
        found = true;
        break;
      }
      runTurn(c);
    }
    expect(found).toBe(true);
  });
});
