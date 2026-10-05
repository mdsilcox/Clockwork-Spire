// B8 acceptance (unit): the climb, its rooms, Scrap, save migration (docs/acceptance.md CL1 to CL6, CL8 U, CL9, CL10,
// SV3 to SV6, AD4 hours, CL11 U; rules 4.1 to 4.6, 5.7, 6; semantics in docs/briefs/B8-the-climb.md).
// Written by the orchestrator's test-porter in the B8.0 contract step. Lanes may adapt a test to the code but never weaken it.
// Scenario runs: `fixtureRun()` puts testkit's `sectionFixture()` on a v1-built run, so core and economy lanes don't
// depend on each other; the generated-section tests use `newRun(defaultRunConfig(seed))` then `startAct`.
//
// Fixture map (src/core/testkit.ts): r0 entry, r1 fight (cog-rat), r2 oil, r3 workbench, r4 trader, r5 event, r6 fight
// (brass-beetle), r7 vault (locked, gearhound), r8 door. Passages by index: 0 r0-r1, 1 r1-r2, 2 r1-r3, 3 r2-r4, 4 r3-r4,
// 5 r3-r5, 6 r4-r6 (locked), 7 r5-r6, 8 r5-r7 (locked), 9 r6-r8. Elite: tinpot-general, patrol r3 r4 r6 r5, at 0 (r3).
import { describe, expect, it } from 'vitest';
import { BASE_PLACEMENTS, createCombat, runTurn } from '../../src/core/combat';
import { ENEMIES } from '../../src/core/content/enemies';
import { ENCOUNTERS } from '../../src/core/content/encounters';
import { EVENTS } from '../../src/core/content/events';
import { PARTS } from '../../src/core/content/parts';
import { TRINKETS } from '../../src/core/content/trinkets';
import { UPGRADES } from '../../src/core/content/upgrades';
import { migrateSlot, SAVE_VERSION } from '../../src/core/migrate';
import { newProfile } from '../../src/core/meta';
import { initStreams } from '../../src/core/rng';
import { newPart } from '../../src/core/rewards';
import {
  barter,
  fuse,
  fuseCandidates,
  OIL_HEAL,
  PART_VALUE,
  polish,
  rest,
  traderStock,
  UPGRADE_SCRAP,
  workbenchRemove,
  workbenchUpgrade,
} from '../../src/core/rooms';
import { brassFor, defaultRunConfig, newRun } from '../../src/core/run';
import { isPartUnlocked, takeSalvage } from '../../src/core/salvage';
import {
  afterRoom,
  connectedRooms,
  elitesNext,
  generateSection,
  hoursLeft,
  moveTo,
  pickLock,
  ringBell,
  startAct,
  useKey,
} from '../../src/core/section';
import { sectionFixture } from '../../src/core/testkit';
import type { ActSection, RoamingElite, RunState, SaveSlot, TradeItem } from '../../src/core/types';

// ---------- helpers ----------

const climbRun = (seed = 1): RunState => {
  const run = newRun(defaultRunConfig(seed));
  startAct(run, 1);
  return run;
};

const sec = (run: RunState): ActSection => {
  if (!run.section) throw new Error('run has no section');
  return run.section;
};
const room = (run: RunState, id: string) => {
  const r = sec(run).rooms.find((x) => x.id === id);
  if (!r) throw new Error(`no room ${id}`);
  return r;
};
const elites = (run: RunState): RoamingElite[] => {
  if (!run.elites) throw new Error('run has no elites');
  return run.elites;
};
const eliteRoom = (run: RunState, i = 0): string => elites(run)[i].patrol[elites(run)[i].at];
const neighborsOf = (s: ActSection, id: string): string[] =>
  s.passages.filter((p) => p.a === id || p.b === id).map((p) => (p.a === id ? p.b : p.a));

/** Reveal `id` and its neighbors, mark it visited (what entering a room does). */
function visit(run: RunState, id: string): void {
  room(run, id).visited = true;
  room(run, id).revealed = true;
  for (const n of neighborsOf(sec(run), id)) room(run, n).revealed = true;
}

/** A run on the fixture section, standing in `at` (visited), v1-built so it never touches generation. */
function fixtureRun(o: { at?: string; hour?: number; scrap?: number; keys?: number; clear?: string[] } = {}): RunState {
  const run = newRun(defaultRunConfig(5));
  const f = sectionFixture();
  run.section = f.section;
  run.elites = f.elites;
  run.act = 1;
  run.hours = 12;
  run.hour = o.hour ?? 0;
  run.scrap = o.scrap ?? 0;
  run.keys = o.keys ?? 0;
  run.roomId = o.at ?? 'r0';
  run.phase = 'section';
  run.combat = null;
  run.pending = null;
  visit(run, 'r0');
  visit(run, run.roomId);
  for (const id of o.clear ?? []) room(run, id).cleared = true;
  return run;
}

const give = (run: RunState, defId: string, plus = false): number => newPart(run, defId, plus).uid;

/** The warden fight of act 1 is the Foreman (legacy def until B9). */
const inWardenFight = (run: RunState): boolean => run.phase === 'combat' && run.combat?.kind === 'boss' && run.combat.enemies[0].defId === 'foreman';

// ---------- CL1: generation ----------

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

/** Shortest path in moves from `from` to `to`, using only the passages `usable` accepts. */
function shortest(s: ActSection, from: string, to: string, usable: (p: ActSection['passages'][number]) => boolean = () => true): number {
  const dist = new Map<string, number>([[from, 0]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift() as string;
    if (cur === to) return dist.get(cur) as number;
    for (const p of s.passages.filter((q) => usable(q) && (q.a === cur || q.b === cur))) {
      const n = p.a === cur ? p.b : p.a;
      if (!dist.has(n)) {
        dist.set(n, (dist.get(cur) as number) + 1);
        queue.push(n);
      }
    }
  }
  return Infinity;
}

describe('CL1: section generation over 200 seeds (rules 4.1, 4.3, 4.4)', () => {
  const bySeed = (act: 1 | 2 | 3) => SEEDS.map((seed) => ({ seed, ...generateSection(initStreams(seed), act) }));

  for (const act of [1, 2, 3] as const) {
    it(`act ${act}: 16 to 20 rooms on 5 to 6 floors of 3 to 4 rooms; entry at the bottom, door at the top, ids unique`, () => {
      for (const { seed, section } of bySeed(act)) {
        const why = `seed ${seed}`;
        expect(section.act, why).toBe(act);
        expect(section.rooms.length, why).toBeGreaterThanOrEqual(16);
        expect(section.rooms.length, why).toBeLessThanOrEqual(20);
        const floors = new Set(section.rooms.map((r) => r.floor));
        expect(floors.size, why).toBeGreaterThanOrEqual(5);
        expect(floors.size, why).toBeLessThanOrEqual(6);
        const top = Math.max(...floors);
        expect(Math.min(...floors), why).toBe(0);
        expect(top, why).toBe(floors.size - 1); // floors 0..n-1 with none empty
        for (const f of floors) {
          const n = section.rooms.filter((r) => r.floor === f).length;
          expect(n, `${why} floor ${f}`).toBeGreaterThanOrEqual(3);
          expect(n, `${why} floor ${f}`).toBeLessThanOrEqual(4);
        }
        expect(new Set(section.rooms.map((r) => r.id)).size, why).toBe(section.rooms.length);
        const entry = section.rooms.find((r) => r.id === section.entry);
        const door = section.rooms.find((r) => r.id === section.door);
        expect(entry?.kind, why).toBe('entry');
        expect(entry?.floor, why).toBe(0);
        expect(door?.kind, why).toBe('door');
        expect(door?.floor, why).toBe(top);
        expect(section.rooms.filter((r) => r.kind === 'entry').length, why).toBe(1);
        expect(section.rooms.filter((r) => r.kind === 'door').length, why).toBe(1);
      }
    });

    it(`act ${act}: connected, at least two loops, passages sane, shortest entry-to-door path at most 5 moves without any key`, () => {
      for (const { seed, section } of bySeed(act)) {
        const why = `seed ${seed}`;
        const ids = new Set(section.rooms.map((r) => r.id));
        const seen = new Set<string>();
        for (const p of section.passages) {
          expect(ids.has(p.a) && ids.has(p.b), why).toBe(true);
          expect(p.a, why).not.toBe(p.b);
          const key = [p.a, p.b].sort().join('|');
          expect(seen.has(key), `${why} duplicate passage ${key}`).toBe(false);
          seen.add(key);
          const fa = section.rooms.find((r) => r.id === p.a)!.floor;
          const fb = section.rooms.find((r) => r.id === p.b)!.floor;
          if (p.kind === 'floor') expect(fa, `${why} floor passage ${key}`).toBe(fb);
          else expect(fa, `${why} ${p.kind} passage ${key}`).not.toBe(fb);
        }
        // every room reachable (locked doors count as passages here: vaults sit behind them)
        for (const r of section.rooms) expect(shortest(section, section.entry, r.id), `${why} ${r.id}`).toBeLessThan(Infinity);
        // loops = edges - rooms + 1 (cyclomatic number of a connected graph)
        expect(section.passages.length - section.rooms.length + 1, `${why} loops`).toBeGreaterThanOrEqual(2);
        // the door is reachable without keys, in at most 5 moves (rules 4.1: leaves at least 3 spare hours)
        const open = shortest(section, section.entry, section.door, (p) => !p.locked);
        expect(open, `${why} unlocked path`).toBeLessThanOrEqual(5);
        expect(shortest(section, section.entry, section.door), why).toBeLessThanOrEqual(5);
      }
    });

    it(`act ${act}: room counts per rules 4.4 (fights 7-9, workbench ${act === 3 ? 2 : 1}, oil 1-2, trader 1-2, event 3-4, vault 0-1)`, () => {
      for (const { seed, section } of bySeed(act)) {
        const n = (kind: string) => section.rooms.filter((r) => r.kind === kind).length;
        const why = `seed ${seed}`;
        expect(n('fight'), `${why} fights`).toBeGreaterThanOrEqual(7);
        expect(n('fight'), `${why} fights`).toBeLessThanOrEqual(9);
        expect(n('workbench'), `${why} workbench`).toBe(act === 3 ? 2 : 1);
        expect(n('oil'), `${why} oil`).toBeGreaterThanOrEqual(1);
        expect(n('oil'), `${why} oil`).toBeLessThanOrEqual(2);
        expect(n('trader'), `${why} trader`).toBeGreaterThanOrEqual(1);
        expect(n('trader'), `${why} trader`).toBeLessThanOrEqual(2);
        expect(n('event'), `${why} event`).toBeGreaterThanOrEqual(3);
        expect(n('event'), `${why} event`).toBeLessThanOrEqual(4);
        expect(n('vault'), `${why} vault`).toBeLessThanOrEqual(1);
      }
    });

    it(`act ${act}: fight rooms carry encounters from the act's pool (the one next to the entry is easy); events and vaults are real`, () => {
      const pool = ENCOUNTERS.filter((e) => e.act === act && e.tier !== 'elite' && e.tier !== 'boss');
      const key = (ids: string[]) => ids.join(',');
      const easy = new Set(pool.filter((e) => e.band === 'easy').map((e) => key(e.enemies)));
      const all = new Set(pool.map((e) => key(e.enemies)));
      for (const { seed, section } of bySeed(act)) {
        const why = `seed ${seed}`;
        for (const r of section.rooms.filter((x) => x.kind === 'fight')) {
          expect(r.encounter, `${why} ${r.id}`).toBeTruthy();
          expect(all.has(key(r.encounter as string[])), `${why} ${r.id} ${key(r.encounter as string[])}`).toBe(true);
        }
        for (const r of section.rooms.filter((x) => x.kind === 'fight' && neighborsOf(section, x.id).includes(section.entry))) {
          expect(easy.has(key(r.encounter as string[])), `${why} ${r.id} next to the entry is easy`).toBe(true);
        }
        for (const r of section.rooms.filter((x) => x.kind === 'event')) expect(EVENTS[r.eventId ?? ''], `${why} ${r.id}`).toBeTruthy();
        for (const r of section.rooms.filter((x) => x.kind === 'vault')) {
          const g = ENEMIES[r.guardian ?? ''];
          expect(g?.tier, `${why} vault guardian`).toBe('elite');
          expect(g?.act, `${why} vault guardian`).toBe(act);
          // behind a locked door (rules 4.4)
          const around = section.passages.filter((p) => p.a === r.id || p.b === r.id);
          expect(around.length, why).toBeGreaterThan(0);
          for (const p of around) expect(p.locked, `${why} vault ${r.id} passage`).toBe(true);
        }
      }
    });

    it(`act ${act}: ${act === 1 ? 'one' : 'two'} roaming elite${act === 1 ? '' : 's'} on patrols of 3 to 5 rooms that avoid the entry and the door`, () => {
      for (const { seed, section, elites: el } of bySeed(act)) {
        const why = `seed ${seed}`;
        expect(el.length, why).toBe(act === 1 ? 1 : 2);
        expect(new Set(el.map((e) => e.defId)).size, why).toBe(el.length);
        for (const e of el) {
          expect(ENEMIES[e.defId]?.tier, `${why} ${e.defId}`).toBe('elite');
          expect(ENEMIES[e.defId]?.act, `${why} ${e.defId}`).toBe(act);
          expect(e.defeated, why).toBe(false);
          expect(e.patrol.length, why).toBeGreaterThanOrEqual(3);
          expect(e.patrol.length, why).toBeLessThanOrEqual(5);
          expect(new Set(e.patrol).size, why).toBe(e.patrol.length);
          expect(e.at, why).toBeGreaterThanOrEqual(0);
          expect(e.at, why).toBeLessThan(e.patrol.length);
          for (const id of e.patrol) {
            expect(section.rooms.some((r) => r.id === id), `${why} ${id} exists`).toBe(true);
            expect(id, why).not.toBe(section.entry);
            expect(id, why).not.toBe(section.door);
          }
          // a loop along passages: each room connects to the next, the last back to the first
          e.patrol.forEach((id, i) => {
            const next = e.patrol[(i + 1) % e.patrol.length];
            expect(neighborsOf(section, id).includes(next), `${why} patrol ${id} -> ${next}`).toBe(true);
          });
        }
      }
    });
  }

  it('the same seed generates the same section; different seeds generate different ones', () => {
    const a = generateSection(initStreams(7), 1);
    expect(generateSection(initStreams(7), 1)).toEqual(a);
    const layouts = new Set(SEEDS.slice(0, 20).map((s) => JSON.stringify(generateSection(initStreams(s), 1).section)));
    expect(layouts.size).toBeGreaterThan(10);
  });
});

describe('startAct (the climb starts at dusk)', () => {
  it('act 1 starts at hour 0 in the entry room, revealed with its neighbors, with the section and elites on the run', () => {
    const run = climbRun(3);
    const s = sec(run);
    expect(run.act).toBe(1);
    expect(s.act).toBe(1);
    expect(run.roomId).toBe(s.entry);
    expect(run.hour).toBe(0);
    expect(run.phase).toBe('section');
    expect(elites(run).length).toBe(1);
    expect(room(run, s.entry).visited).toBe(true);
    for (const id of [s.entry, ...neighborsOf(s, s.entry)]) expect(room(run, id).revealed, id).toBe(true);
    const hidden = s.rooms.filter((r) => ![s.entry, ...neighborsOf(s, s.entry)].includes(r.id));
    expect(hidden.length).toBeGreaterThan(0);
    for (const r of hidden) expect(r.revealed, r.id).toBe(false);
    expect(run.keys ?? 0).toBe(0);
    const open = connectedRooms(run);
    expect(open.length).toBeGreaterThan(0); // at least one open passage leaves the entry
    for (const id of open) expect(neighborsOf(s, s.entry)).toContain(id);
  });

  it('after a warden the next act starts at dusk again: a fresh section, hour 0, two elites in act 2', () => {
    const run = climbRun(3);
    run.hour = 9;
    startAct(run, 2);
    expect(run.act).toBe(2);
    expect(sec(run).act).toBe(2);
    expect(run.hour).toBe(0);
    expect(run.roomId).toBe(sec(run).entry);
    expect(elites(run).length).toBe(2);
  });

  it('Scrap replaces Cogs: a new climb holds the config\'s starting amount (Spare Scrap) as scrap', () => {
    const run = newRun({ ...defaultRunConfig(4), cogs: 25 });
    startAct(run, 1);
    expect(run.scrap).toBe(25);
  });
});

// ---------- AD4: hours per act ----------

describe('AD4 (hours only; the other modes come in B10): Journeyman has 12 hours per act', () => {
  it('a Journeyman climb has 12 hours: 12 left at dusk, 11 after a move', () => {
    const run = climbRun(2);
    expect(run.hours).toBe(12);
    expect(hoursLeft(run)).toBe(12);
    expect(moveTo(run, connectedRooms(run)[0])).toBe(true);
    expect(run.hour).toBe(1);
    expect(hoursLeft(run)).toBe(11);
  });
});

// ---------- CL2 to CL4, CL6, CL8: moving ----------

describe('CL2: a move costs an hour and the elites step', () => {
  it('hour 3, a connected cleared room: hour 4; the elite steps one room along its patrol', () => {
    const run = fixtureRun({ at: 'r1', hour: 3, clear: ['r1'] });
    expect(eliteRoom(run)).toBe('r3');
    expect(moveTo(run, 'r0')).toBe(true);
    expect(run.hour).toBe(4);
    expect(run.roomId).toBe('r0');
    expect(eliteRoom(run)).toBe('r4');
    expect(elites(run)[0].at).toBe(1);
    expect(run.phase).toBe('section');
  });

  it('the patrol is a loop: after its last room the elite is back at the first', () => {
    const run = fixtureRun({ at: 'r0', clear: ['r1'] });
    elites(run)[0].at = 3; // r5, the last patrol room
    expect(moveTo(run, 'r1')).toBe(true);
    expect(elites(run)[0].at).toBe(0);
  });

  it('a room that is not connected (or a locked passage) is refused and costs nothing', () => {
    const run = fixtureRun({ at: 'r0' });
    expect(moveTo(run, 'r4')).toBe(false);
    expect(moveTo(run, 'r0')).toBe(false); // not a move
    expect(moveTo(run, 'nowhere')).toBe(false);
    expect(run.hour).toBe(0);
    expect(run.roomId).toBe('r0');
    expect(eliteRoom(run)).toBe('r3');
    const locked = fixtureRun({ at: 'r4', clear: ['r1'] });
    expect(connectedRooms(locked).sort()).toEqual(['r2', 'r3']);
    expect(moveTo(locked, 'r6')).toBe(false);
    expect(locked.hour).toBe(0);
  });

  it('hoursLeft and elitesNext report what the act screen shows', () => {
    const run = fixtureRun({ hour: 5 });
    expect(hoursLeft(run)).toBe(7);
    expect(elitesNext(run)).toEqual([{ defId: 'tinpot-general', at: 'r3', next: 'r4' }]);
    elites(run)[0].at = 3;
    expect(elitesNext(run)).toEqual([{ defId: 'tinpot-general', at: 'r5', next: 'r3' }]);
  });
});

describe('CL3: elite collisions start a fight there', () => {
  it('an elite steps into the player\'s room: that elite fight starts there, after the hour is spent', () => {
    const run = fixtureRun({ at: 'r1', hour: 2 });
    elites(run)[0].at = 3; // r5: its next room is r3
    expect(moveTo(run, 'r3')).toBe(true);
    expect(run.hour).toBe(3);
    expect(run.roomId).toBe('r3');
    expect(eliteRoom(run)).toBe('r3');
    expect(run.phase).toBe('combat');
    expect(run.combat?.kind).toBe('elite');
    expect(run.combat?.enemies[0].defId).toBe('tinpot-general');
  });

  it('the player steps into an elite\'s room: that fight starts, and the elite does not also step', () => {
    const run = fixtureRun({ at: 'r1', hour: 2 });
    expect(eliteRoom(run)).toBe('r3');
    expect(moveTo(run, 'r3')).toBe(true);
    expect(run.hour).toBe(3);
    expect(run.phase).toBe('combat');
    expect(run.combat?.kind).toBe('elite');
    expect(run.combat?.enemies[0].defId).toBe('tinpot-general');
    expect(elites(run)[0].at).toBe(0);
  });

  it('a defeated elite is not met and does not step', () => {
    const run = fixtureRun({ at: 'r1', hour: 2 });
    elites(run)[0].defeated = true;
    expect(moveTo(run, 'r3')).toBe(true);
    expect(run.phase).toBe('workbench'); // the workbench resolves instead
    expect(elites(run)[0].at).toBe(0);
  });
});

describe('CL4: midnight', () => {
  it('hour 11, one move: the warden fight starts where the player stands, after the room resolves, and the warden is Overwound', () => {
    const run = fixtureRun({ at: 'r1', hour: 11, clear: ['r1'] });
    expect(moveTo(run, 'r0')).toBe(true);
    expect(run.hour).toBe(12);
    expect(run.roomId).toBe('r0');
    expect(inWardenFight(run)).toBe(true);
    expect(run.overwound).toBe(true);
    const w = run.combat!.enemies[0];
    expect(w.statuses.strength).toBe(3);
    expect(w.shell).toBe(10);
    expect(w.overwound).toBe(true);
  });

  it('hour 10, one move: no warden yet', () => {
    const run = fixtureRun({ at: 'r1', hour: 10, clear: ['r1'] });
    expect(moveTo(run, 'r0')).toBe(true);
    expect(run.hour).toBe(11);
    expect(run.phase).toBe('section');
    expect(run.combat).toBeNull();
    expect(run.overwound).toBeFalsy();
  });

  it('a fight room at midnight: that fight is never interrupted, and the warden comes when it is done', () => {
    const run = fixtureRun({ at: 'r0', hour: 11 });
    expect(moveTo(run, 'r1')).toBe(true);
    expect(run.hour).toBe(12);
    expect(run.phase).toBe('combat');
    expect(run.combat?.kind).toBe('fight');
    expect(run.combat?.enemies[0].defId).toBe('cog-rat');
    expect(run.overwound).toBeFalsy();
    // the room's business is done (fight settled, tray taken): the midnight check runs
    room(run, 'r1').cleared = true;
    run.combat = null;
    run.pending = null;
    run.phase = 'section';
    afterRoom(run);
    expect(inWardenFight(run)).toBe(true);
    expect(run.overwound).toBe(true);
    expect(run.combat!.enemies[0].shell).toBe(10);
  });

  it('afterRoom before midnight just returns to the section', () => {
    const run = fixtureRun({ at: 'r1', hour: 5, clear: ['r1'] });
    run.phase = 'event';
    afterRoom(run);
    expect(run.phase).toBe('section');
    expect(run.combat).toBeNull();
  });
});

describe('createCombat options: overwound and prepared (rules 4.2)', () => {
  const bin = () => newRun(defaultRunConfig(1)).bin;

  it('overwound: the warden starts with Strength 3 and Shell 10; without it, neither', () => {
    const plain = createCombat({ seed: 1, bin: bin(), enemies: ['foreman'], hp: 50, maxHp: 50, kind: 'boss' });
    expect(plain.enemies[0].statuses.strength ?? 0).toBe(0);
    expect(plain.enemies[0].shell).toBe(0);
    const wound = createCombat({ seed: 1, bin: bin(), enemies: ['foreman'], hp: 50, maxHp: 50, kind: 'boss', overwound: true });
    expect(wound.enemies[0].statuses.strength).toBe(3);
    expect(wound.enemies[0].shell).toBe(10);
  });

  it('prepared N: N extra placements on turn 1 only', () => {
    for (const n of [0, 1, 2]) {
      const c = createCombat({ seed: 1, bin: bin(), enemies: ['dummy'], hp: 50, maxHp: 50, kind: 'boss', prepared: n });
      expect(c.placementsLeft, `prepared ${n}`).toBe(BASE_PLACEMENTS + n);
      runTurn(c);
      expect(c.turn).toBe(2);
      expect(c.placementsLeft, `prepared ${n} on turn 2`).toBe(BASE_PLACEMENTS);
    }
  });
});

describe('CL6: a cleared room', () => {
  it('moving through a cleared fight room again: no encounter, one hour', () => {
    const run = fixtureRun({ at: 'r0', hour: 2, clear: ['r1'] });
    expect(moveTo(run, 'r1')).toBe(true);
    expect(run.hour).toBe(3);
    expect(run.phase).toBe('section');
    expect(run.combat).toBeNull();
    expect(run.pending).toBeNull();
    expect(moveTo(run, 'r0')).toBe(true);
    expect(moveTo(run, 'r1')).toBe(true);
    expect(run.hour).toBe(5);
    expect(run.phase).toBe('section');
  });

  it('an uncleared fight room starts its encounter', () => {
    const run = fixtureRun({ at: 'r0' });
    expect(moveTo(run, 'r1')).toBe(true);
    expect(run.phase).toBe('combat');
    expect(run.combat?.kind).toBe('fight');
    expect(run.combat?.enemies.map((e) => e.defId)).toEqual(['cog-rat']);
  });
});

describe('CL8 (U, without the Lamplighter): visibility', () => {
  it('entering a room shows it and its neighbors; the rest stay silhouettes', () => {
    const run = fixtureRun({ at: 'r0' });
    expect(room(run, 'r0').revealed).toBe(true);
    expect(room(run, 'r1').revealed).toBe(true);
    expect(room(run, 'r2').revealed).toBe(false);
    expect(moveTo(run, 'r1')).toBe(true);
    expect(room(run, 'r1').visited).toBe(true);
    for (const id of ['r0', 'r1', 'r2', 'r3']) expect(room(run, id).revealed, id).toBe(true);
    for (const id of ['r4', 'r5', 'r6', 'r7', 'r8']) expect(room(run, id).revealed, id).toBe(false);
  });

  it('a revealed room stays revealed when you walk away', () => {
    const run = fixtureRun({ at: 'r0', clear: ['r1'] });
    moveTo(run, 'r1');
    moveTo(run, 'r0');
    expect(room(run, 'r3').revealed).toBe(true);
  });
});

// ---------- CL5: the bell ----------

describe('CL5: ringing the bell (rules 4.2)', () => {
  it('at the door at hour 6 (6 left): +36 Scrap, +12 Brass, Prepared 2; the warden fight starts, not Overwound', () => {
    const run = fixtureRun({ at: 'r8', hour: 6, scrap: 10 });
    const brass = brassFor(run);
    expect(ringBell(run)).toBe(true);
    expect(run.scrap).toBe(46);
    expect(brassFor(run) - brass).toBe(12);
    expect(run.prepared).toBe(2);
    expect(inWardenFight(run)).toBe(true);
    expect(run.overwound).toBeFalsy();
    expect(run.combat!.enemies[0].statuses.strength ?? 0).toBe(0);
    expect(run.combat!.enemies[0].shell).toBe(0);
    expect(run.combat!.placementsLeft).toBe(BASE_PLACEMENTS + 2);
  });

  it('Prepared is min(2, floor(hours left / 3)); the payout is 6 Scrap and 2 Brass per hour left', () => {
    for (const [left, prepared] of [[12, 2], [9, 2], [8, 2], [6, 2], [5, 1], [3, 1], [2, 0], [1, 0]] as const) {
      const run = fixtureRun({ at: 'r8', hour: 12 - left, scrap: 0 });
      const brass = brassFor(run);
      expect(ringBell(run), `${left} left`).toBe(true);
      expect(run.prepared, `${left} left`).toBe(prepared);
      expect(run.scrap, `${left} left`).toBe(6 * left);
      expect(brassFor(run) - brass, `${left} left`).toBe(2 * left);
      expect(run.combat!.placementsLeft, `${left} left`).toBe(BASE_PLACEMENTS + prepared);
    }
  });

  it('only at the warden\'s door: elsewhere the bell does nothing', () => {
    const run = fixtureRun({ at: 'r6', hour: 3, scrap: 5, clear: ['r6'] });
    expect(ringBell(run)).toBe(false);
    expect(run.scrap).toBe(5);
    expect(run.phase).toBe('section');
    expect(run.combat).toBeNull();
  });

  it('walking into the door room does not ring it by itself: the player chooses', () => {
    const run = fixtureRun({ at: 'r6', hour: 3, clear: ['r6'] });
    expect(moveTo(run, 'r8')).toBe(true);
    expect(run.roomId).toBe('r8');
    expect(run.combat).toBeNull(); // the warden waits behind the bell
    expect(run.hour).toBe(4);
  });
});

// ---------- CL9: locked doors and keys ----------

describe('CL9: locked doors (rules 4.6)', () => {
  it('a Spire Key opens a locked passage, costs no hour and no Scrap, and the passage then connects', () => {
    const run = fixtureRun({ at: 'r4', hour: 3, scrap: 30, keys: 1, clear: ['r1'] });
    expect(connectedRooms(run)).not.toContain('r6');
    expect(useKey(run, 6)).toBe(true);
    expect(sec(run).passages[6].locked).toBeFalsy();
    expect(run.keys).toBe(0);
    expect(run.hour).toBe(3);
    expect(run.scrap).toBe(30);
    expect(eliteRoom(run)).toBe('r3'); // no hour, so no step
    expect(connectedRooms(run)).toContain('r6');
    expect(moveTo(run, 'r6')).toBe(true);
  });

  it('without a key, or on an open passage, a key does nothing', () => {
    const none = fixtureRun({ at: 'r4', keys: 0 });
    expect(useKey(none, 6)).toBe(false);
    expect(sec(none).passages[6].locked).toBe(true);
    const open = fixtureRun({ at: 'r4', keys: 1 });
    expect(useKey(open, 3)).toBe(false);
    expect(open.keys).toBe(1);
    expect(useKey(open, 99)).toBe(false);
  });

  it('picking the lock costs 25 Scrap and 1 extra hour (the elites step) and opens the passage', () => {
    const run = fixtureRun({ at: 'r4', hour: 3, scrap: 30 });
    expect(pickLock(run, 6)).toBe(true);
    expect(sec(run).passages[6].locked).toBeFalsy();
    expect(run.scrap).toBe(5);
    expect(run.hour).toBe(4);
    expect(eliteRoom(run)).toBe('r4');
    expect(run.keys ?? 0).toBe(0);
    expect(connectedRooms(run)).toContain('r6');
  });

  it('picking a lock without 25 Scrap, or on an open passage, changes nothing', () => {
    const poor = fixtureRun({ at: 'r4', hour: 3, scrap: 24 });
    expect(pickLock(poor, 6)).toBe(false);
    expect(poor.scrap).toBe(24);
    expect(poor.hour).toBe(3);
    expect(sec(poor).passages[6].locked).toBe(true);
    const open = fixtureRun({ at: 'r4', hour: 3, scrap: 100 });
    expect(pickLock(open, 3)).toBe(false);
    expect(open.scrap).toBe(100);
    expect(open.hour).toBe(3);
  });

  it('picking the lock at hour 11 spends the last hour: midnight comes after the door business is done', () => {
    const run = fixtureRun({ at: 'r4', hour: 11, scrap: 30 });
    expect(pickLock(run, 6)).toBe(true);
    expect(run.hour).toBe(12);
    afterRoom(run);
    expect(inWardenFight(run)).toBe(true);
    expect(run.overwound).toBe(true);
  });
});

// ---------- CL10: oil stations ----------

describe('CL10: an oil station (rules 4.4)', () => {
  const atOil = (o: { hp?: number; maxHp?: number; hour?: number } = {}): RunState => {
    const run = fixtureRun({ at: 'r2', hour: o.hour ?? 4, clear: ['r1'] });
    run.maxHp = o.maxHp ?? 50;
    run.hp = o.hp ?? 20;
    run.phase = 'oil';
    run.pending = { kind: 'oil', done: false };
    return run;
  };

  it('rest: heals 30% of max HP rounded down (50 -> 15, 55 -> 16), costs 1 extra hour, and the elites step', () => {
    const a = atOil({ hp: 20, maxHp: 50 });
    expect(OIL_HEAL).toBe(15); // the trader's oil, content.md section 10
    expect(rest(a)).toBe(true);
    expect(a.hp).toBe(35);
    expect(a.hour).toBe(5);
    expect(eliteRoom(a)).toBe('r4');
    const b = atOil({ hp: 10, maxHp: 55 });
    rest(b);
    expect(b.hp).toBe(26);
  });

  it('rest never heals above max HP', () => {
    const run = atOil({ hp: 45, maxHp: 50 });
    expect(rest(run)).toBe(true);
    expect(run.hp).toBe(50);
  });

  it('polish: +4 max HP, no extra hour, the elites stay', () => {
    const run = atOil({ hp: 20, maxHp: 50 });
    expect(polish(run)).toBe(true);
    expect(run.maxHp).toBe(54);
    expect(run.hour).toBe(4);
    expect(eliteRoom(run)).toBe('r3');
  });

  it('once per station: after resting, neither rest nor polish works again, on the same visit or a later one', () => {
    const run = atOil();
    expect(rest(run)).toBe(true);
    const hp = run.hp;
    const hour = run.hour;
    expect(rest(run)).toBe(false);
    expect(polish(run)).toBe(false);
    expect(run.hp).toBe(hp);
    expect(run.maxHp).toBe(50);
    expect(run.hour).toBe(hour);
    expect(room(run, 'r2').used).toBe(true);
    run.pending = { kind: 'oil', done: false }; // walk back in later
    expect(rest(run)).toBe(false);
    expect(polish(run)).toBe(false);
  });

  it('once per station: after polishing, rest is refused', () => {
    const run = atOil();
    expect(polish(run)).toBe(true);
    expect(rest(run)).toBe(false);
    expect(run.hp).toBe(20);
  });
});

// ---------- SV3 to SV5: the workbench and traders ----------

const atWorkbench = (scrap = 200): RunState => {
  const run = fixtureRun({ at: 'r3', scrap, clear: ['r1'] });
  run.phase = 'workbench';
  run.pending = { kind: 'workbench', usedUpgrade: false, usedRemove: false, usedFuse: false };
  return run;
};
const freshVisit = (run: RunState): void => {
  run.phase = 'workbench';
  run.pending = { kind: 'workbench', usedUpgrade: false, usedRemove: false, usedFuse: false };
};

describe('SV3: fuse two parts at the workbench (rules 4.4)', () => {
  it('two Common Gears: both leave the bin, two Uncommon Gear candidates show, the picked one joins the bin', () => {
    const run = atWorkbench();
    const a = give(run, 'spur');
    const b = give(run, 'spur');
    const size = run.bin.length;
    const res = fuseCandidates(run, a, b);
    expect('candidates' in res).toBe(true);
    const cands = (res as { candidates: string[] }).candidates;
    const unlockedUncommonGears = Object.values(PARTS).filter((p) => p.family === 'gear' && p.rarity === 'uncommon' && isPartUnlocked(run, p.id)).map((p) => p.id);
    expect(cands.length).toBe(2);
    expect(new Set(cands).size).toBe(2);
    for (const c of cands) expect(unlockedUncommonGears).toContain(c);
    expect(fuse(run, a, b, 1)).toBe(true);
    expect(run.bin.some((p) => p.uid === a || p.uid === b)).toBe(false);
    expect(run.bin.length).toBe(size - 1);
    expect(run.bin[run.bin.length - 1].defId).toBe(cands[1]);
    expect(run.scrap).toBe(200); // fuse is free
  });

  it('fusing keeps the family: two Common Tempo parts give Uncommon Tempo candidates', () => {
    const run = atWorkbench();
    const a = give(run, 'escapement');
    const b = give(run, 'anchor');
    const res = fuseCandidates(run, a, b) as { candidates: string[] };
    expect(res.candidates.length).toBe(2);
    expect([...res.candidates].sort()).toEqual(['balance-wheel', 'pendulum']);
  });

  it('only unlocked parts are candidates; with the next rarity locked the fuse is refused with a reason', () => {
    const run = atWorkbench();
    const a = give(run, 'bevel');
    const b = give(run, 'crown');
    const res = fuseCandidates(run, a, b);
    expect('reason' in res).toBe(true);
    expect((res as { reason: string }).reason.length).toBeGreaterThan(3);
    expect(fuse(run, a, b, 0)).toBe(false);
    expect(run.bin.some((p) => p.uid === a)).toBe(true);
    // a blueprint found opens the target
    run.config.unlockedParts.push('flywheel', 'planetary');
    const open = fuseCandidates(run, a, b) as { candidates: string[] };
    expect([...open.candidates].sort()).toEqual(['flywheel', 'planetary']);
  });

  it('refused: different family, different rarity, the same part twice, Masterworks into Legendaries', () => {
    const run = atWorkbench();
    const spur = give(run, 'spur');
    const coil = give(run, 'coil');
    const bevel = give(run, 'bevel');
    const tm = give(run, 'twin-mainspring');
    const fp = give(run, 'free-pawl');
    for (const [x, y] of [[spur, coil], [spur, bevel], [spur, spur], [tm, fp]] as const) {
      expect('reason' in fuseCandidates(run, x, y), `${x}+${y}`).toBe(true);
      expect(fuse(run, x, y, 0), `${x}+${y}`).toBe(false);
    }
    expect(run.bin.some((p) => p.uid === spur)).toBe(true);
  });

  it('once per visit; a new visit allows it again', () => {
    const run = atWorkbench();
    const [a, b, c, d] = [give(run, 'spur'), give(run, 'spur'), give(run, 'spur'), give(run, 'spur')];
    expect(fuse(run, a, b, 0)).toBe(true);
    expect(fuse(run, c, d, 0)).toBe(false);
    freshVisit(run);
    expect(fuse(run, c, d, 0)).toBe(true);
  });
});

describe('SV4: trader barter (rules 4.5, content.md section 10)', () => {
  const stockOf = (): TradeItem[] => [
    { kind: 'part', id: 'volute', value: 60, sold: false },
    { kind: 'part', id: 'bevel', value: 35, sold: false },
    { kind: 'part', id: 'cam', value: 20, sold: false },
    { kind: 'part', id: 'twin-mainspring', value: 100, sold: false },
  ];
  const atTrader = (scrap: number): RunState => {
    const run = fixtureRun({ at: 'r4', scrap, clear: ['r1'] });
    run.phase = 'trader';
    run.pending = { kind: 'trader', stock: stockOf() };
    return run;
  };

  it('a Rare (value 60) for a Common (20) plus 40 Scrap: the Rare joins the bin, the Common leaves, Scrap -40', () => {
    const run = atTrader(100);
    const common = give(run, 'spur');
    const size = run.bin.length;
    expect(barter(run, 0, common)).toBe(true);
    expect(run.scrap).toBe(60);
    expect(run.bin.some((p) => p.uid === common)).toBe(false);
    expect(run.bin.length).toBe(size); // one in, one out
    expect(run.bin[run.bin.length - 1].defId).toBe('volute');
    expect((run.pending as { stock: TradeItem[] }).stock[0].sold).toBe(true);
    expect(barter(run, 0, give(run, 'spur'))).toBe(false); // sold
  });

  it('with only 39 Scrap the same barter is refused and nothing changes', () => {
    const run = atTrader(39);
    const common = give(run, 'spur');
    const size = run.bin.length;
    expect(barter(run, 0, common)).toBe(false);
    expect(run.scrap).toBe(39);
    expect(run.bin.length).toBe(size);
    expect((run.pending as { stock: TradeItem[] }).stock[0].sold).toBe(false);
  });

  it('buying with Scrap alone costs value + 25%: C 25, U 44, R 75, M 125', () => {
    const prices = [75, 44, 25, 125];
    for (let i = 0; i < 4; i++) {
      const poor = atTrader(prices[i] - 1);
      expect(barter(poor, i, null), `item ${i} with ${prices[i] - 1}`).toBe(false);
      expect(poor.scrap).toBe(prices[i] - 1);
      const run = atTrader(prices[i]);
      const size = run.bin.length;
      expect(barter(run, i, null), `item ${i} with ${prices[i]}`).toBe(true);
      expect(run.scrap, `item ${i}`).toBe(0);
      expect(run.bin.length).toBe(size + 1);
      expect(run.bin[run.bin.length - 1].defId).toBe(stockOf()[i].id);
    }
  });

  it('a part of equal value is a straight swap: no Scrap; an offer that is not in the bin is refused', () => {
    const run = atTrader(0);
    const common = give(run, 'idler');
    expect(barter(run, 2, 99999)).toBe(false);
    expect(barter(run, 2, common)).toBe(true); // cam (20) for idler (20)
    expect(run.scrap).toBe(0);
  });

  it('rolled stock: 4 parts and 1 trinket with fixed prices (value by rarity), deterministic, unlocked parts only', () => {
    const a = fixtureRun({ at: 'r4' });
    const b = fixtureRun({ at: 'r4' });
    const stock = traderStock(a);
    expect(traderStock(b)).toEqual(stock);
    const parts = stock.filter((s) => s.kind === 'part');
    const trinkets = stock.filter((s) => s.kind === 'trinket');
    const oil = stock.filter((s) => s.kind === 'oil');
    expect(parts.length).toBe(4);
    expect(trinkets.length).toBe(1);
    expect(oil.length).toBeLessThanOrEqual(1);
    for (const p of parts) {
      expect(PARTS[p.id ?? ''], p.id).toBeTruthy();
      expect(isPartUnlocked(a, p.id as string), p.id).toBe(true);
      expect(p.value, p.id).toBe(PART_VALUE[PARTS[p.id as string].rarity]);
      expect(p.sold).toBe(false);
    }
    expect(TRINKETS[trinkets[0].id ?? '']).toBeTruthy();
    expect(trinkets[0].value).toBeGreaterThanOrEqual(60);
    expect(trinkets[0].value).toBeLessThanOrEqual(160);
    for (const o of oil) expect(o.value).toBe(15);
  });
});

describe('SV5: the workbench upgrades and removes (rules 4.4)', () => {
  it('upgrading costs C 15, U 25, R 40, M 60 Scrap; the part becomes upgraded', () => {
    expect(UPGRADE_SCRAP).toMatchObject({ common: 15, uncommon: 25, rare: 40, masterwork: 60, legendary: 80 });
    for (const [defId, cost] of [['spur', 15], ['bevel', 25], ['volute', 40], ['twin-mainspring', 60]] as const) {
      const run = atWorkbench(100);
      const uid = give(run, defId);
      expect(workbenchUpgrade(run, uid), defId).toBe(true);
      expect(run.scrap, defId).toBe(100 - cost);
      expect(run.bin.find((p) => p.uid === uid)?.plus, defId).toBe(true);
    }
  });

  it('upgrading a Rare for 40: refused without 40 Scrap, refused when already upgraded, once per visit', () => {
    const poor = atWorkbench(39);
    const rare = give(poor, 'volute');
    expect(workbenchUpgrade(poor, rare)).toBe(false);
    expect(poor.scrap).toBe(39);
    expect(poor.bin.find((p) => p.uid === rare)?.plus).toBe(false);
    const run = atWorkbench(200);
    const done = give(run, 'volute', true);
    expect(workbenchUpgrade(run, done)).toBe(false);
    expect(run.scrap).toBe(200);
    const a = give(run, 'spur');
    const b = give(run, 'spur');
    expect(workbenchUpgrade(run, a)).toBe(true);
    expect(workbenchUpgrade(run, b)).toBe(false); // once per visit
    freshVisit(run);
    expect(workbenchUpgrade(run, b)).toBe(true);
  });

  it('removing a part costs 25 Scrap, then 40, then 55 (+15 per use in a run); once per visit', () => {
    const run = atWorkbench(100);
    const [a, b, c] = [give(run, 'spur'), give(run, 'spur'), give(run, 'spur')];
    expect(workbenchRemove(run, a)).toBe(true);
    expect(run.scrap).toBe(75);
    expect(run.bin.some((p) => p.uid === a)).toBe(false);
    expect(workbenchRemove(run, b)).toBe(false); // same visit
    expect(run.scrap).toBe(75);
    freshVisit(run);
    expect(workbenchRemove(run, b)).toBe(true);
    expect(run.scrap).toBe(35);
    freshVisit(run);
    expect(workbenchRemove(run, c)).toBe(false); // would be 55
    expect(run.scrap).toBe(35);
    expect(run.bin.some((p) => p.uid === c)).toBe(true);
    run.scrap = 55;
    expect(workbenchRemove(run, c)).toBe(true);
    expect(run.scrap).toBe(0);
  });

  it('removing a part that is not in the bin is refused', () => {
    const run = atWorkbench(100);
    expect(workbenchRemove(run, 424242)).toBe(false);
    expect(run.scrap).toBe(100);
  });
});

// ---------- Scrap and offers ----------

describe('Scrap replaces Cogs in v2 (rules 4.5, 2.5)', () => {
  it('the salvage tray pays Scrap (3 per scrapped part, 1 per wrecked), never Cogs', () => {
    const run = fixtureRun({ at: 'r1', scrap: 10 });
    run.cogs = 7;
    run.phase = 'reward';
    run.pending = {
      kind: 'salvage',
      items: [
        { enemy: 0, partId: 'rat-jaw', salvage: 'spur', rarity: 'common', locked: false },
        { enemy: 0, partId: 'rat-tail', salvage: 'idler', rarity: 'common', locked: false },
      ],
      wrecked: 2,
      cogs: 0,
      trinkets: [],
      trinketTaken: false,
      done: false,
    };
    const size = run.bin.length;
    expect(takeSalvage(run, [0])).toBe(true);
    expect(run.bin.length).toBe(size + 1); // the kept Spur
    expect(run.scrap).toBe(10 + 3 + 2);
    expect(run.cogs).toBe(7);
  });
});

describe('SV6: trader stock, fuse candidates and salvage count as offers for the impact metric (rules 7)', () => {
  const offersFrom = (run: RunState, source: string) => run.stats.offers.filter((o) => (o.source as string) === source);

  it('trader: every part in the rolled stock is an offer, and the one bought is marked taken', () => {
    const run = fixtureRun({ at: 'r4', scrap: 500 });
    const stock = traderStock(run);
    run.phase = 'trader';
    run.pending = { kind: 'trader', stock };
    const parts = stock.map((s, i) => ({ s, i })).filter((x) => x.s.kind === 'part');
    expect(offersFrom(run, 'trader').map((o) => o.partId).sort()).toEqual(parts.map((x) => x.s.id as string).sort());
    expect(offersFrom(run, 'trader').every((o) => !o.taken)).toBe(true);
    expect(barter(run, parts[0].i, null)).toBe(true);
    expect(offersFrom(run, 'trader').filter((o) => o.taken).map((o) => o.partId)).toEqual([parts[0].s.id]);
  });

  it('fuse: both candidates are offers and the picked one is marked taken', () => {
    const run = atWorkbench();
    const a = give(run, 'spur');
    const b = give(run, 'spur');
    const cands = (fuseCandidates(run, a, b) as { candidates: string[] }).candidates;
    expect(fuse(run, a, b, 0)).toBe(true);
    const offers = offersFrom(run, 'fuse');
    expect(offers.map((o) => o.partId).sort()).toEqual([...cands].sort());
    expect(offers.filter((o) => o.taken).map((o) => o.partId)).toEqual([cands[0]]);
  });

  it('salvage: parts kept count as taken offers, parts scrapped as offers not taken', () => {
    const run = fixtureRun({ at: 'r1' });
    run.phase = 'reward';
    run.pending = {
      kind: 'salvage',
      items: [
        { enemy: 0, partId: 'rat-jaw', salvage: 'spur', rarity: 'common', locked: false },
        { enemy: 0, partId: 'rat-tail', salvage: 'idler', rarity: 'common', locked: false },
      ],
      wrecked: 0,
      cogs: 0,
      trinkets: [],
      trinketTaken: false,
      done: false,
    };
    expect(takeSalvage(run, [1])).toBe(true);
    const offers = offersFrom(run, 'salvage');
    expect(offers.map((o) => `${o.partId}:${o.taken}`).sort()).toEqual(['idler:true', 'spur:false']);
  });
});

// ---------- Save version 2 ----------

describe('Rules 6: save version 2 migration', () => {
  const NOTICE = 'The Spire has changed while you were away.';
  const v1Slot = (withRun: boolean): { slot: SaveSlot; gain: number; seed: number } => {
    const profile = newProfile('Tess', '2026-01-01T00:00:00.000Z');
    profile.brass = 77;
    profile.brassEarnedTotal = 200;
    profile.upgrades = { frame: 2, cogs: 2, bearings: 1 };
    profile.blueprints = ['volute'];
    profile.chassisUnlocked = ['tinker', 'stoker'];
    profile.wins = 1;
    profile.runsStarted = 5;
    profile.runsFinished = 4;
    profile.bestFloor = 17;
    profile.storyFlags = ['first-run'];
    profile.version = 1;
    const run = newRun(defaultRunConfig(9));
    run.act = 2;
    run.floor = 5;
    run.cogs = 40;
    run.stats.floorBrass = 4 * 12 + 6 * 4;
    run.stats.elites = 1;
    run.stats.bossesBeaten = 1;
    const slot: SaveSlot = { slot: 1, version: 1, profile, run: withRun ? run : null, updatedAt: '2026-02-01T00:00:00.000Z' };
    return { slot, gain: brassFor(run), seed: 9 };
  };
  const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
  const scrapUpgradeId = (): string | undefined => Object.values(UPGRADES).find((u) => u.name === 'Spare Scrap')?.id;

  it('the save version is 2', () => {
    expect(SAVE_VERSION).toBe(2);
  });

  it('a v1 save keeps the profile: Brass, upgrades, blueprints, chassis, history and statistics', () => {
    const { slot } = v1Slot(false);
    const before = clone(slot);
    const { slot: out, notice } = migrateSlot(slot);
    expect(slot).toEqual(before); // the input is not mutated
    expect(out.version).toBe(2);
    expect(out.profile.version).toBe(2);
    expect(out.slot).toBe(1);
    expect(out.run).toBeNull();
    expect(notice).toBeNull(); // nothing was in progress
    expect(out.profile.name).toBe('Tess');
    expect(out.profile.brass).toBe(77);
    expect(out.profile.brassEarnedTotal).toBe(200);
    expect(out.profile.upgrades.frame).toBe(2);
    expect(out.profile.upgrades.bearings).toBe(1);
    expect(out.profile.blueprints).toEqual(['volute']);
    expect(out.profile.chassisUnlocked).toEqual(['tinker', 'stoker']);
    expect([out.profile.wins, out.profile.runsStarted, out.profile.runsFinished, out.profile.bestFloor]).toEqual([1, 5, 4, 17]);
    expect(out.profile.storyFlags).toEqual(['first-run']);
  });

  it('Spare Cogs II becomes Spare Scrap II with the same Brass spent (the upgrade renamed, the level kept)', () => {
    const id = scrapUpgradeId();
    expect(id, 'an upgrade named Spare Scrap exists in content/upgrades.ts').toBeDefined();
    const { slot } = v1Slot(false);
    const { slot: out } = migrateSlot(slot);
    expect(out.profile.upgrades.cogs).toBeUndefined();
    expect(out.profile.upgrades[id as string]).toBe(2);
    expect(Object.values(UPGRADES).some((u) => u.name === 'Spare Cogs')).toBe(false);
    expect(out.profile.brass).toBe(77); // nothing refunded or charged
    expect(out.profile.brassEarnedTotal).toBe(200);
  });

  it('a v1 run in progress is closed as a loss at its floor and credited its Brass, in the same write, with the notice', () => {
    const { slot, gain, seed } = v1Slot(true);
    expect(gain).toBeGreaterThan(0);
    const { slot: out, notice } = migrateSlot(slot);
    expect(notice).toBe(NOTICE);
    expect(out.run).toBeNull(); // Cogs and the run are gone
    expect(out.profile.brass).toBe(77 + gain);
    expect(out.profile.brassEarnedTotal).toBe(200 + gain);
    expect(out.profile.runsFinished).toBe(5);
    expect(out.profile.finishedSeeds).toContain(seed);
    const rec = out.profile.history[0];
    expect(rec.result).toBe('loss');
    expect(rec.seed).toBe(seed);
    expect(rec.act).toBe(2);
    expect(rec.floor).toBe(5);
    expect(rec.brassEarned).toBe(gain);
    expect(out.profile.history.length).toBe(1);
  });

  it('a version 2 slot is returned unchanged, with no notice; migrating twice changes nothing more', () => {
    const { slot } = v1Slot(true);
    const once = migrateSlot(slot);
    const again = migrateSlot(clone(once.slot));
    expect(again.slot).toEqual(once.slot);
    expect(again.notice).toBeNull();
  });
});

// ---------- CL11 (U): a run in progress survives a JSON round trip ----------

describe('CL11 (U): the climb state is plain data that saves and restores exactly', () => {
  it('layout, room, hour, elite positions and revealed rooms survive a JSON round trip, and play continues identically', () => {
    const run = climbRun(11);
    const start = connectedRooms(run)[0];
    expect(moveTo(run, start)).toBe(true);
    const copy = JSON.parse(JSON.stringify(run)) as RunState;
    expect(copy.section).toEqual(run.section);
    expect(copy.roomId).toBe(run.roomId);
    expect(copy.hour).toBe(run.hour);
    expect(copy.elites).toEqual(run.elites);
    expect(copy.hours).toBe(run.hours);
    // both continue the same way: the same rooms are open from here, and the same move leaves both states equal
    expect(connectedRooms(copy)).toEqual(connectedRooms(run));
    expect(copy).toEqual(run);
  });
});
