import { describe, expect, it } from 'vitest';
import { createCombat, placePart, runTurn, setTarget, swapParts } from '../../src/core/combat';
import { ENEMIES } from '../../src/core/content/enemies';
import { MAINSPRING } from '../../src/core/types';
import { initStreams, int } from '../../src/core/rng';
import { chooseTurn } from '../../src/sim/bot';
import { buildReport, loadEncounters, randomBin } from '../../src/sim/combat-report';
import { playFight } from '../../src/sim/fight';

const tinker = (): { uid: number; defId: string; plus: boolean }[] =>
  ['spur', 'spur', 'spur', 'escapement', 'escapement', 'escapement', 'idler', 'coil'].map((defId, i) => ({
    uid: i + 1,
    defId,
    plus: false,
  }));

describe('BS1: the fight report', () => {
  it('is byte-identical for the same seed except the date line', async () => {
    const encounters = await loadEncounters();
    const a = buildReport({ seed: 3, fights: 60, encounters }, '2026-01-01');
    const b = buildReport({ seed: 3, fights: 60, encounters }, '2026-02-02');
    const strip = (s: string): string => s.replace(/^Date: .*$/m, '');
    expect(strip(a)).toBe(strip(b));
    expect(a).not.toBe(b);
    const c = buildReport({ seed: 4, fights: 60, encounters }, '2026-01-01');
    expect(strip(c)).not.toBe(strip(a));
  });

  it('a 2000-fight report finishes in under 60 s', async () => {
    const encounters = await loadEncounters();
    const t0 = Date.now();
    const md = buildReport({ seed: 1, fights: 2000, encounters }, '2026-01-01');
    expect(Date.now() - t0).toBeLessThan(60_000);
    expect(md).toContain('## Parts');
  }, 90_000);
});

describe('the bot', () => {
  it('never makes an illegal move and never places on A2 (200 random combats)', async () => {
    const encounters = (await loadEncounters()).filter((e) => e.enemies.length <= 3);
    for (let i = 0; i < 200; i++) {
      const rng = initStreams(900 + i);
      const enc = encounters[int(rng, 'map', encounters.length)];
      const c = createCombat({
        seed: 50 + i,
        bin: randomBin(rng, enc.act),
        enemies: enc.enemies,
        hp: 40,
        maxHp: 40,
      });
      for (let t = 0; t < 6 && c.outcome === 'ongoing'; t++) {
        const turn = chooseTurn(c);
        expect(turn.placements.length).toBeLessThanOrEqual(c.placementsLeft);
        for (const p of turn.placements) {
          expect(p.cell).not.toBe(MAINSPRING);
          expect(p.cell).toBeGreaterThanOrEqual(0);
          expect(p.cell).toBeLessThan(15);
          expect(placePart(c, p.hand, p.cell)).toBe(true);
        }
        if (turn.swap) {
          expect(turn.swap).not.toContain(MAINSPRING);
          expect(swapParts(c, turn.swap[0], turn.swap[1])).toBe(true);
        }
        expect(c.enemies[turn.target].hp).toBeGreaterThan(0);
        setTarget(c, turn.target);
        runTurn(c);
      }
    }
  });

  it('is deterministic', () => {
    const mk = () => createCombat({ seed: 5, bin: tinker(), enemies: ['cog-rat'], hp: 50, maxHp: 50 });
    expect(chooseTurn(mk())).toEqual(chooseTurn(mk()));
  });

  it('beats a practice dummy', () => {
    const c = createCombat({ seed: 2, bin: tinker(), enemies: ['dummy'], hp: 50, maxHp: 50 });
    let dealt = 0;
    for (let t = 0; t < 5; t++) {
      const turn = chooseTurn(c);
      for (const p of turn.placements) placePart(c, p.hand, p.cell);
      if (turn.swap) swapParts(c, turn.swap[0], turn.swap[1]);
      dealt += runTurn(c).preview.damageByEnemy[0];
    }
    expect(dealt).toBeGreaterThan(40);
    expect(c.enemies[0].hp).toBe(ENEMIES.dummy.hp - dealt);
  });

  it('wins most act 1 easy fights with the Tinker start', () => {
    const easy = [['rust-mite', 'rust-mite'], ['cog-rat']];
    let wins = 0;
    let n = 0;
    for (let seed = 1; seed <= 20; seed++) {
      for (const enemies of easy) {
        const r = playFight({ seed, bin: tinker(), enemies, hp: 50 });
        wins += r.won ? 1 : 0;
        n += 1;
        expect(r.turns).toBeLessThanOrEqual(30);
      }
    }
    expect(wins / n).toBeGreaterThan(0.7);
  });
});
