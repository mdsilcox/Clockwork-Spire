// B10b acceptance (unit): Journeyman at Overwind 0 plays exactly as before B10b (docs/briefs/B10b-curve.md "Round 2 additions":
// "a regression test compares a seeded Journeyman run before and after"; the B10c baselines stay valid). Its own file, because the
// test parts and test enemies the other B10b tests register would otherwise leak into the pool the route bot drafts from.
// Written by the orchestrator's test-porter in the B10b.0 contract step. Lanes may adapt a test to the code but never weaken it.
import { describe, expect, it } from 'vitest';
import { brassFor, defaultRunConfig } from '../../src/core/run';
import type { RunConfig } from '../../src/core/types';
import { playClimb } from '../../src/sim/strat/climb';
import { ROUTE_COMBAT } from '../../src/sim/strat/v2routes';

describe('regression: a seeded Journeyman run at Overwind 0 matches the numbers of the code before B10b', () => {
  // Snapshot taken from the contract commit (9488b48) before any effect existed: playClimb with the route sim's expert combat bot.
  const SNAP = [
    { idx: 0, won: false, act: 1, turns: 16, hp: 0, maxHp: 50, hour: 8, hours: 12, scrap: 137, brass: 28, fights: 4, elites: 1, bin: ['escapement', 'escapement', 'escapement', 'coil+', 'cam', 'coil', 'auger', 'pry-bar+', 'lever', 'pry-bar'], trinkets: ['bellows'] },
    { idx: 1, won: false, act: 2, turns: 41, hp: 0, maxHp: 54, hour: 8, hours: 12, scrap: 295, brass: 87, fights: 9, elites: 2, bin: ['escapement+', 'escapement+', 'coil+', 'wedge', 'coil', 'trap', 'torsion', 'cam-follower', 'cam', 'leaf', 'cold-chisel', 'trip-hammer', 'cold-chisel', 'trip-hammer', 'lever', 'trip-hammer'], trinkets: ['spectacles', 'echo-chamber', 'extra-pocket'] },
    { idx: 2, won: false, act: 3, turns: 63, hp: 0, maxHp: 65, hour: 5, hours: 12, scrap: 405, brass: 139, fights: 8, elites: 5, bin: ['spur', 'spur', 'escapement', 'escapement', 'escapement', 'idler', 'coil+', 'cam', 'pry-bar', 'pry-bar', 'trap', 'pry-bar', 'pry-bar', 'cam', 'toggle', 'coil', 'anchor', 'sapper', 'anchor', 'anchor', 'grandfather'], trinkets: ['tin-cup', 'hourglass', 'brass-heart', 'pocket-watch', 'counterweight', 'echo-chamber', 'grease-pot', 'bellows'] },
  ];
  const play = (idx: number, explicit: boolean): ReturnType<typeof playClimb> => {
    const c: RunConfig = { ...defaultRunConfig(100003 + idx), legacyMap: false };
    if (explicit) {
      c.mode = 'journeyman';
      c.overwind = 0;
    } else {
      delete c.mode;
      delete c.overwind;
    }
    return playClimb(c, 31 + idx, 'expert', ROUTE_COMBAT);
  };
  for (const s of SNAP) {
    for (const explicit of [true, false]) {
      it(`expert climb ${s.idx} (${explicit ? 'mode and level set' : 'an old config with neither'}): the same win or loss, turns, HP, hours, Scrap, Brass, bin and trinkets`, () => {
        const r = play(s.idx, explicit);
        const run = r.run;
        const { idx, ...want } = s;
        expect(idx).toBe(s.idx);
        expect({ won: r.won, act: r.act, turns: run.stats.turns, hp: run.hp, maxHp: run.maxHp, hour: run.hour, hours: run.hours, scrap: run.scrap, brass: brassFor(run), fights: run.stats.fights, elites: run.stats.elites, bin: run.bin.map((b) => b.defId + (b.plus ? '+' : '')), trinkets: run.trinkets }).toEqual(want);
      });
    }
  }
});
