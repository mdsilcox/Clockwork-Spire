// B7 acceptance: the enemy catalog as machines (docs/acceptance.md EM1, EA11, BV9; docs/content.md section 3).
// Written by the orchestrator in the B7 contract step. Wardens become frames in B9 (EM1 covers regulars and elites here).
import { describe, expect, it } from 'vitest';
import { bypassShare } from '../../src/core/content/balance';
import { ENEMIES } from '../../src/core/content/enemies';
import { PARTS } from '../../src/core/content/parts';
import type { EnemyDef } from '../../src/core/defs';

const pool = (tier: 'normal' | 'elite'): EnemyDef[] =>
  Object.values(ENEMIES).filter(
    (d) => d.tier === tier && !d.summonOnly && !d.id.startsWith('test-') && d.id !== 'dummy' && !d.id.startsWith('tutorial'),
  );

const PLATING_ANSWERS = new Set(['pierce', 'corrode', 'siphon']);

describe('EM1: regulars and elites are machines', () => {
  it('15 regulars and 6 elites, each a frame with 1 to 8 well-formed parts', () => {
    const regulars = pool('normal');
    const elites = pool('elite');
    expect(regulars).toHaveLength(15);
    expect(elites).toHaveLength(6);
    for (const d of [...regulars, ...elites]) {
      expect(d.frame, d.id).toBeDefined();
      const f = d.frame!;
      expect(f.core, d.id).toBeGreaterThan(0);
      expect(f.parts.length, d.id).toBeGreaterThanOrEqual(1);
      expect(f.parts.length, d.id).toBeLessThanOrEqual(8);
      expect(f.braced ?? false, `${d.id}: elites are never Braced`).toBe(false);
      for (const p of f.parts) {
        expect(p.hp, `${d.id}.${p.id}`).toBeGreaterThan(0);
        expect(p.anchor.length, `${d.id}.${p.id} anchor`).toBeGreaterThan(0);
        expect(p.actions.length > 0 || !!p.passive, `${d.id}.${p.id} acts or has a passive`).toBe(true);
        if (p.salvage && p.salvage !== 'spire-key') expect(PARTS[p.salvage], `${d.id}.${p.id} salvage ${p.salvage}`).toBeDefined();
      }
    }
  });

  it('regular cores hold most of the HP (about 60%, rules 2.4)', () => {
    for (const d of pool('normal')) {
      const f = d.frame!;
      const total = f.core + f.parts.reduce((a, p) => a + p.hp, 0);
      expect(f.core / total, d.id).toBeGreaterThanOrEqual(0.5);
    }
  });
});

describe('EA11: every regular answers Plating or burst, by its actions', () => {
  it('counts from actions and passives, not tags', () => {
    let plating = 0;
    let burst = 0;
    for (const d of pool('normal')) {
      const parts = d.frame!.parts;
      const answersPlating = parts.some(
        (p) =>
          p.actions.some((a) => PLATING_ANSWERS.has(a.kind)) ||
          p.passive?.kind === 'ratchet' ||
          (typeof p.cadence === 'object' && 'countdown' in p.cadence),
      );
      const answersBurst = parts.some(
        (p) => p.passive?.kind === 'bulwark' || p.passive?.kind === 'governor' || p.actions.some((a) => a.kind === 'shell'),
      );
      expect(answersPlating || answersBurst, d.id).toBe(true);
      if (answersPlating) plating += 1;
      if (answersBurst) burst += 1;
    }
    expect(plating).toBeGreaterThanOrEqual(8);
    expect(burst).toBeGreaterThanOrEqual(5);
  });
});

describe('BV9: each act\'s regular pool carries at least 30% Pierce or Siphon damage', () => {
  // docs/content.md section 3.0: act 1 35%, act 2 64%, act 3 47% after the B7.5 tune (the code must agree with the doc within 1 point).
  const doc = { 1: 0.35, 2: 0.64, 3: 0.47 } as const;
  for (const act of [1, 2, 3] as const) {
    it(`act ${act}`, () => {
      const s = bypassShare(act);
      expect(s.share).toBeGreaterThanOrEqual(0.3);
      expect(Math.abs(s.share - doc[act])).toBeLessThanOrEqual(0.01);
    });
  }
});
