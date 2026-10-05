// B10a acceptance: residents, landmarks, the six new events, the Scrapper, and the five achievements Bellfoot opens
// (docs/acceptance.md BF2 (U), BF3, BF5; docs/briefs/B10a-bellfoot.md "Semantics", "Round 2 decisions", "Round 2 additions";
// docs/content.md 6, 7, 8; rules 4.4 and 5.4 as amended). Written by the orchestrator's test-porter in the B10a.0 contract step.
// Lanes may adapt a test to the code but never weaken an assertion. The tests are the spec.
//
// Everything goes through the public flow: events (`chooseEvent`), `finishRun`, `runConfigFor`, `newRun`, `startAct`,
// `generateSection`. Nothing assumes where a lane stores a landmark or a flag beyond the contract's fields.
//
// NAMES the memory-core lane must provide (the tests read them):
//   - rooms.ts `useOilFlask(run): boolean`: outside combat, in any room phase: needs oilFlasks > 0, heals 15 (never above max HP),
//     spends one flask, costs no hour; false otherwise (in combat, at 0 flasks).
//   - `RunState.met` gets an enemy id at every fight start (startCombat); `RunState.lore` gets the moment ('hour-ghost',
//     'stopped-clock', 'empty-chair', 'unsent-letter') when its event choice is taken; `finishRun` sets achievementProgress keys
//     `lore-hour-ghost`, `lore-stopped-clock`, `lore-empty-chair`, `lore-unsent-letter` to 1 and merges `run.met` into
//     `profile.bestiary` (unique).
//   - SalvageItem for the Scrapper: the wrecked-part offer has `scrapper: true` (the tray marks it "Scrapper"); the first break's
//     upgrade shows as the kept part's `plus` in the bin after `takeSalvage` (the tests read the bin).
//   - The `meta` rng stream (types.ts RngStream, rng.ts STREAMS) seeds the Apprentice's extra upgrade.
// Resolved readings: the lift lands on a room with `floor === 2` (the third floor, 0-based index; "floor 3" in the docs);
// BOTH the Vault Wheel's Spire-Key choice and its pick-the-lock choice open the vault, "Walk on" does not; "hear the Hour Ghost"
// for e-lore is his "Ask about the inventor" choice (index 1); a resident event may omit the move by being unavailable OR not
// being placed once that resident lives in Bellfoot (either passes); a known vault stays behind its door but is `revealed`.
import { describe, expect, it } from 'vitest';
import * as roomsMod from '../../src/core/rooms';
import { ACHIEVEMENTS } from '../../src/core/content/achievements';
import { CHASSIS } from '../../src/core/content/chassis';
import { ENCOUNTERS } from '../../src/core/content/encounters';
import { ENEMIES } from '../../src/core/content/enemies';
import { EVENTS } from '../../src/core/content/events';
import { LANDMARKS } from '../../src/core/content/landmarks';
import { RESIDENTS } from '../../src/core/content/residents';
import { UPGRADES } from '../../src/core/content/upgrades';
import { runTurn } from '../../src/core/combat';
import { chassisAvailable, chassisPrice, finishRun, newProfile, runConfigFor } from '../../src/core/meta';
import { migrateSlot } from '../../src/core/migrate';
import { chooseEvent, eventPickPart, defaultRunConfig, newRun, settleCombat } from '../../src/core/run';
import { initStreams } from '../../src/core/rng';
import { newPart } from '../../src/core/rewards';
import { takeSalvage } from '../../src/core/salvage';
import { generateSection, moveTo, resolveRoom, startAct } from '../../src/core/section';
import { combatWith, put } from '../../src/core/testkit';
import { startCombat } from '../../src/core/startfight';
import type { ActSection, Profile, RoamingElite, RunState, SaveSlot } from '../../src/core/types';

const T = '2026-10-05T12:00:00Z';
let seedN = 9000;

const ALL_RESIDENTS = RESIDENTS.map((r) => r.id);
const ALL_LANDMARKS = LANDMARKS.map((l) => l.id);

function profileWith(o: { residents?: string[]; landmarks?: string[]; upgrades?: Record<string, number> } = {}): Profile {
  const p = newProfile('t', T);
  p.residents = (o.residents ?? []).slice();
  p.landmarks = (o.landmarks ?? []).slice();
  Object.assign(p.upgrades, o.upgrades ?? {});
  return p;
}
const mk = (p: Profile, chassis = 'tinker'): RunState => newRun(runConfigFor(p, seedN++, chassis));
const end = (run: RunState, phase: 'defeat' | 'victory' = 'defeat'): RunState => {
  run.phase = phase;
  return run;
};

// ---------- the events: residents, landmarks, lore ----------

/** A run standing at an event with plenty of Scrap and some HP missing. */
function atEvent(p: Profile, eventId: string, o: { act?: 1 | 2 | 3; chassis?: string } = {}): RunState {
  const run = mk(p, o.chassis ?? 'tinker');
  if (o.act && o.act !== 1) startAct(run, o.act);
  run.phase = 'event';
  run.pending = { kind: 'event', eventId };
  run.scrap = 100;
  run.hp = 30;
  return run;
}
/** Take choice `i`, picking a part when the event asks for one (a Cams and levers part for the lamplighter). */
function choose(run: RunState, i: number): string | null {
  const out = chooseEvent(run, i);
  const p = run.pending;
  if (p && p.kind === 'event' && p.needsPart) {
    const cand = run.bin.find((b) => b.defId === 'cam') ?? run.bin[0];
    expect(eventPickPart(run, cand.uid)).toBe(true);
    return (run.pending as { result?: string }).result ?? out;
  }
  return out;
}

describe('BF3: each resident has an event that sends them, and a stall effect on the next run', () => {
  it('the five residents are defined with an event whose move choice names Bellfoot', () => {
    expect(ALL_RESIDENTS.sort()).toEqual(['apprentice', 'hour-ghost', 'lamplighter', 'oil-merchant', 'traders-cousin']);
    for (const r of RESIDENTS) {
      const ev = EVENTS[r.eventId];
      expect(ev, `${r.id} event ${r.eventId}`).toBeTruthy();
      const ch = ev.choices[r.choice];
      expect(ch, `${r.id} choice ${r.choice}`).toBeTruthy();
      expect(`${ch.label} ${ch.detail}`, `${r.id} move choice`).toMatch(/bellfoot|move|come down|invite/i);
    }
  });

  for (const r of RESIDENTS) {
    it(`${r.id}: taking its choice sends them to Bellfoot after the run (won, lost or abandoned), once, in the same write`, () => {
      for (const how of ['defeat', 'victory'] as const) {
        const p = profileWith();
        const run = atEvent(p, r.eventId, { chassis: r.id === 'lamplighter' ? 'horologist' : 'tinker' });
        expect(choose(run, r.choice), `${how}: the choice resolves`).toBeTruthy();
        expect(run.resident).toBe(r.id);
        expect(p.residents).toEqual([]); // not before the run ends
        finishRun(p, end(run, how), T);
        expect(p.residents).toEqual([r.id]);
      }
      const p = profileWith();
      const run = atEvent(p, r.eventId, { chassis: r.id === 'lamplighter' ? 'horologist' : 'tinker' });
      choose(run, r.choice);
      const abandoned = end(run);
      abandoned.flags.abandoned = true;
      finishRun(p, abandoned, T);
      expect(p.residents).toEqual([r.id]);
    });

    it(`${r.id}: once they live in Bellfoot their event no longer offers the move`, () => {
      const fresh = atEvent(profileWith(), r.eventId, { chassis: r.id === 'lamplighter' ? 'horologist' : 'tinker' });
      const open = EVENTS[r.eventId].choices[r.choice].available;
      expect(open ? open(fresh) : true, 'before: the move is offered').toBe(true);
      const p = profileWith({ residents: [r.id] });
      const run = atEvent(p, r.eventId, { chassis: r.id === 'lamplighter' ? 'horologist' : 'tinker' });
      const avail = EVENTS[r.eventId].choices[r.choice].available;
      if (avail && avail(run) === false) return;
      // otherwise the event must never be placed in a section any more
      const act = (EVENTS[r.eventId].act ?? 1) as 1 | 2 | 3;
      for (let s = 0; s < 60; s++) {
        const q = mk(p);
        startAct(q, act);
        const placed = (q.section as ActSection).rooms.some((room) => room.eventId === r.eventId);
        expect(placed, `seed ${s}: ${r.eventId} placed although ${r.id} lives in Bellfoot`).toBe(false);
      }
    });
  }

  it('a resident living in Bellfoot is added only once', () => {
    const p = profileWith({ residents: ['apprentice'] });
    const run = atEvent(profileWith(), 'apprentice');
    run.resident = 'apprentice';
    finishRun(p, end(run), T);
    expect(p.residents).toEqual(['apprentice']);
  });
});

describe('each resident stall changes later runs', () => {
  it('Oil Merchant: starts each run with 2 Oil Flasks; a flask heals 15, costs no hour, never in combat', () => {
    expect(mk(profileWith()).oilFlasks).toBe(0);
    const run = mk(profileWith({ residents: ['oil-merchant'] }));
    expect(run.oilFlasks).toBe(2);
    const use = (roomsMod as unknown as { useOilFlask?: (r: RunState) => boolean }).useOilFlask;
    expect(use, 'rooms.ts exports useOilFlask(run)').toBeTypeOf('function');
    const f = use as (r: RunState) => boolean;
    run.hp = 30;
    const hour = run.hour;
    expect(f(run)).toBe(true);
    expect([run.hp, run.oilFlasks, run.hour]).toEqual([45, 1, hour]);
    run.hp = run.maxHp - 5;
    expect(f(run)).toBe(true);
    expect(run.hp).toBe(run.maxHp); // never above the maximum
    expect(f(run)).toBe(false); // none left
    expect(run.oilFlasks).toBe(0);
    const busy = mk(profileWith({ residents: ['oil-merchant'] }));
    startCombat(busy, ['cog-rat'], 'fight');
    busy.hp = 20;
    expect(f(busy)).toBe(false);
    expect(busy.oilFlasks).toBe(2);
  });

  it('Apprentice: one more starting part upgraded, from a `meta` stream, so every other stream is exactly as without him', () => {
    const plusCount = (r: RunState) => r.bin.filter((b) => b.plus).length;
    const seed = 424242;
    const without = newRun(runConfigFor(profileWith(), seed, 'tinker'));
    const withHim = newRun(runConfigFor(profileWith({ residents: ['apprentice'] }), seed, 'tinker'));
    expect(plusCount(withHim)).toBe(plusCount(without) + 1);
    for (const s of ['map', 'draw', 'enemy', 'reward', 'event', 'shop'] as const) expect(withHim.rng[s], `stream ${s}`).toBe(without.rng[s]);
    expect(JSON.stringify(withHim.section)).toBe(JSON.stringify(without.section)); // the same act 1 section
    expect(withHim.bin.map((b) => b.defId)).toEqual(without.bin.map((b) => b.defId));
    expect('meta' in withHim.rng, 'a meta stream exists').toBe(true);
    const again = newRun(runConfigFor(profileWith({ residents: ['apprentice'] }), seed, 'tinker'));
    expect(again.bin.map((b) => b.plus)).toEqual(withHim.bin.map((b) => b.plus)); // deterministic
    const bearings = newRun(runConfigFor(profileWith({ residents: ['apprentice'], upgrades: { bearings: 1 } }), seed, 'tinker'));
    const bearingsOnly = newRun(runConfigFor(profileWith({ upgrades: { bearings: 1 } }), seed, 'tinker'));
    expect(plusCount(bearings)).toBe(plusCount(bearingsOnly) + 1);
    expect(bearings.rng.reward).toBe(bearingsOnly.rng.reward);
  });

  it('Lamplighter: every room of every act starts with its kind revealed', () => {
    const run = mk(profileWith({ residents: ['lamplighter'] }));
    expect((run.section as ActSection).rooms.every((r) => r.revealed)).toBe(true);
    for (const act of [2, 3] as const) {
      startAct(run, act);
      expect((run.section as ActSection).rooms.every((r) => r.revealed), `act ${act}`).toBe(true);
    }
    const plain = mk(profileWith());
    expect((plain.section as ActSection).rooms.every((r) => r.revealed)).toBe(false);
  });

  it('Hour Ghost: the run carries the lore and bestiary flag for the archivist', () => {
    expect(runConfigFor(profileWith({ residents: ['hour-ghost'] }), 1, 'tinker').residentPatch?.loreAndBestiary).toBe(true);
    expect(runConfigFor(profileWith(), 1, 'tinker').residentPatch?.loreAndBestiary).toBeFalsy();
  });

  it("Trader's cousin: one regular fight per act becomes a trader, never the opening fight; no trader beside the entry", () => {
    for (const act of [1, 2, 3] as const) {
      for (let s = 0; s < 40; s++) {
        const run = mk(profileWith({ residents: ['traders-cousin'] }));
        startAct(run, act);
        const sec = run.section as ActSection;
        const n = (k: string) => sec.rooms.filter((r) => r.kind === k).length;
        const why = `act ${act} seed ${s}`;
        expect(n('trader'), why).toBeGreaterThanOrEqual(2);
        expect(n('trader'), why).toBeLessThanOrEqual(3);
        expect(n('fight'), why).toBeGreaterThanOrEqual(6);
        expect(n('fight'), why).toBeLessThanOrEqual(8);
        const nextToEntry = sec.passages.filter((p) => p.a === sec.entry || p.b === sec.entry).map((p) => (p.a === sec.entry ? p.b : p.a));
        expect(sec.rooms.some((r) => nextToEntry.includes(r.id) && r.kind === 'fight'), `${why}: a fight stays beside the entry`).toBe(true);
        for (const id of nextToEntry) expect(sec.rooms.find((r) => r.id === id)?.kind, `${why}: no trader beside the entry`).not.toBe('trader');
      }
    }
  });
});

// ---------- landmarks ----------

describe('landmarks: the lift, opened vaults, the beacon', () => {
  const sec = (seed: number, act: 1 | 2 | 3, opts = {}) => generateSection(initStreams(seed), act, opts);
  /** The landmark lift: an unlocked 'lift' passage from the entry that SKIPS a floor (ordinary passages join neighboring floors). */
  const lifts = (s: ActSection) =>
    s.passages.filter((p) => {
      if (p.kind !== 'lift' || p.locked || (p.a !== s.entry && p.b !== s.entry)) return false;
      const other = s.rooms.find((r) => r.id === (p.a === s.entry ? p.b : p.a));
      return !!other && other.floor >= 2;
    });

  it('the repaired lift: one passage from the entry to a middle-floor room that is never next to the warden door; only in the Gearworks', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { section } = sec(seed, 1, { lift: true });
      const l = lifts(section);
      expect(l, `seed ${seed}`).toHaveLength(1);
      const target = section.rooms.find((r) => r.id === (l[0].a === section.entry ? l[0].b : l[0].a)) as ActSection['rooms'][number];
      expect(target.floor, `seed ${seed}: the third floor`).toBe(2);
      expect(target.id).not.toBe(section.door);
      const nearDoor = section.passages.some((p) => (p.a === target.id && p.b === section.door) || (p.b === target.id && p.a === section.door));
      expect(nearDoor, `seed ${seed}: not next to the door`).toBe(false);
      expect(lifts(sec(seed, 1).section), `seed ${seed} without the landmark`).toHaveLength(0);
      for (const act of [2, 3] as const) expect(lifts(sec(seed, act, { lift: true }).section), `act ${act}`).toHaveLength(0);
    }
  });

  it('moving by lift costs 1 hour like any move', () => {
    const run = mk(profileWith({ landmarks: ['lift'] }));
    const s = run.section as ActSection;
    expect(lifts(s), 'the lift passage exists').toHaveLength(1);
    const l = lifts(s)[0];
    const target = l.a === s.entry ? l.b : l.a;
    expect(moveTo(run, target)).toBe(true);
    expect(run.hour).toBe(1);
    expect(run.roomId).toBe(target);
  });

  it('BF2 (U): the lift comes from the lamplighter event after a LOST run, and the next run has the stall, the reveal and the lift', () => {
    const p = profileWith();
    const run = atEvent(p, 'lamplighter', { chassis: 'horologist' });
    expect(choose(run, 2)).toBeTruthy();
    finishRun(p, end(run), T); // lost
    expect(p.residents).toContain('lamplighter');
    expect(p.landmarks).toContain('lift');
    const next = mk(p);
    expect((next.section as ActSection).rooms.every((r) => r.revealed)).toBe(true);
    expect(lifts(next.section as ActSection)).toHaveLength(1);
  });

  it("the lamplighter's fix is disabled without a Cams and levers part", () => {
    const tinker = atEvent(profileWith(), 'lamplighter');
    expect(tinker.bin.some((b) => b.defId === 'cam')).toBe(false);
    const fix = EVENTS.lamplighter.choices[2];
    expect(fix, 'a third choice').toBeTruthy();
    expect(fix.available?.(tinker)).toBe(false);
    expect(chooseEvent(tinker, 2)).toBeNull();
    const horo = atEvent(profileWith(), 'lamplighter', { chassis: 'horologist' });
    expect(EVENTS.lamplighter.choices[2].available?.(horo)).not.toBe(false);
    newPart(tinker, 'cam');
    expect(EVENTS.lamplighter.choices[2].available?.(tinker)).not.toBe(false);
  });

  it('opened vault: that act has a known vault room whose guardian is a regular fight from the act pool', () => {
    for (const act of [1, 2, 3] as const) {
      const pool = new Set(ENCOUNTERS.filter((e) => e.act === act && e.tier !== 'elite' && e.tier !== 'boss').flatMap((e) => e.enemies));
      for (let seed = 1; seed <= 60; seed++) {
        const { section } = sec(seed, act, { knownVaults: [act] });
        const vaults = section.rooms.filter((r) => r.kind === 'vault');
        expect(vaults, `act ${act} seed ${seed}`).toHaveLength(1);
        expect(vaults[0].revealed, `act ${act} seed ${seed}: a known room`).toBe(true);
        const g = ENEMIES[vaults[0].guardian ?? ''];
        expect(g?.tier, `${act}:${seed} guardian`).toBe('normal');
        expect(pool.has(g.id), `${act}:${seed} guardian ${g?.id} from the act's pool`).toBe(true);
        const other = (act % 3) + 1;
        for (const r of sec(seed, other as 1 | 2 | 3, { knownVaults: [act] }).section.rooms.filter((x) => x.kind === 'vault')) {
          expect(ENEMIES[r.guardian ?? ''].tier, 'another act keeps its elite guardian').toBe('elite');
        }
      }
    }
  });

  it('an opened vault still pays its loot when its regular-fight guardian falls', () => {
    const p = profileWith({ landmarks: ['vault-1'] });
    const run = mk(p);
    run.config.unlockedParts.push('flywheel'); // a Rare is unlocked, so the vault has loot to give
    const s = run.section as ActSection;
    const vault = s.rooms.find((r) => r.kind === 'vault') as ActSection['rooms'][number];
    expect(vault, 'act 1 has its opened vault').toBeTruthy();
    run.roomId = vault.id;
    run.phase = 'section';
    resolveRoom(run);
    expect(run.phase).toBe('combat');
    const c = run.combat!;
    expect(ENEMIES[c.enemies[0].defId].tier).toBe('normal');
    for (const e of c.enemies) e.hp = 0;
    c.board.fill(null);
    runTurn(c);
    const bin = run.bin.length;
    const scrap = run.scrap ?? 0;
    expect(settleCombat(run)).toBe(true);
    expect(vault.cleared).toBe(true);
    expect(run.bin.length).toBeGreaterThan(bin);
    expect((run.scrap ?? 0) - scrap).toBeGreaterThanOrEqual(40);
  });

  it('the vault-wheel event opens the vault of its own act, with a key or by picking the lock; walking on opens nothing', () => {
    for (const act of [1, 2, 3] as const) {
      const key = atEvent(profileWith(), 'vault-wheel', { act });
      key.keys = 1;
      expect(choose(key, 0)).toBeTruthy();
      expect(key.keys).toBe(0);
      const p = profileWith();
      finishRun(p, end(key), T);
      expect(p.landmarks, `act ${act} by key`).toContain(`vault-${act}`);
      const lock = atEvent(profileWith(), 'vault-wheel', { act });
      const before = lock.scrap;
      const hour = lock.hour ?? 0;
      expect(choose(lock, 1)).toBeTruthy();
      expect([lock.scrap, lock.hour]).toEqual([(before ?? 0) - 25, hour + 1]);
      const q = profileWith();
      finishRun(q, end(lock), T);
      expect(q.landmarks, `act ${act} by lock`).toContain(`vault-${act}`);
      const walk = atEvent(profileWith(), 'vault-wheel', { act });
      choose(walk, 2);
      const r = profileWith();
      finishRun(r, end(walk), T);
      expect(r.landmarks).toEqual([]);
    }
    const none = atEvent(profileWith(), 'vault-wheel');
    none.keys = 0;
    expect(EVENTS['vault-wheel'].choices[0].available?.(none)).toBe(false);
  });

  it('the beacon: act 3 shows every elite patrol and the warden door from the start, and has 1 extra hour', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { section, elites } = sec(seed, 3, { beacon: true });
      const shown = new Set(section.rooms.filter((r) => r.revealed).map((r) => r.id));
      expect(shown.has(section.door), `seed ${seed}: the door`).toBe(true);
      for (const e of elites) for (const id of e.patrol) expect(shown.has(id), `seed ${seed}: patrol room ${id}`).toBe(true);
      const plain = sec(seed, 3).section;
      expect(plain.rooms.filter((r) => r.revealed).length, `seed ${seed}: without it nothing is revealed up front`).toBe(0);
    }
    const run = mk(profileWith({ landmarks: ['beacon'] }));
    expect(run.hours).toBe(12);
    startAct(run, 2);
    expect(run.hours).toBe(12);
    startAct(run, 3);
    expect(run.hours).toBe(13);
    expect(run.hour).toBe(0);
    const plain = mk(profileWith());
    startAct(plain, 3);
    expect(plain.hours).toBe(12);
  });

  it('the beacon event costs 8 HP and 1 hour and lights it after the run; walking on does nothing', () => {
    const run = atEvent(profileWith(), 'beacon', { act: 3 });
    const hour = run.hour ?? 0;
    expect(choose(run, 0)).toBeTruthy();
    expect([run.hp, run.hour]).toEqual([22, hour + 1]);
    const p = profileWith();
    finishRun(p, end(run), T);
    expect(p.landmarks).toContain('beacon');
    const walk = atEvent(profileWith(), 'beacon', { act: 3 });
    choose(walk, 1);
    const q = profileWith();
    finishRun(q, end(walk), T);
    expect(q.landmarks).toEqual([]);
  });

  it('the m-vaults reward is the landmark vault-1', () => {
    const p = profileWith();
    const run = mk(p);
    run.stats.vaultsByAct = [1, 1, 1];
    finishRun(p, end(run), T);
    expect(p.landmarks).toContain('vault-1');
  });
});

// ---------- CL1 with every patch on at once ----------

describe('CL1: 200 seeds per act with every landmark, the Lamplighter and the Trader\'s cousin together', () => {
  const rich = profileWith({ residents: ALL_RESIDENTS, landmarks: ALL_LANDMARKS });
  const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

  function shortest(s: ActSection, from: string, to: string, usable: (p: ActSection['passages'][number]) => boolean = () => true): number {
    const dist = new Map<string, number>([[from, 0]]);
    const q = [from];
    while (q.length) {
      const cur = q.shift() as string;
      if (cur === to) return dist.get(cur) as number;
      for (const p of s.passages.filter((x) => usable(x) && (x.a === cur || x.b === cur))) {
        const n = p.a === cur ? p.b : p.a;
        if (!dist.has(n)) {
          dist.set(n, (dist.get(cur) as number) + 1);
          q.push(n);
        }
      }
    }
    return Infinity;
  }
  const neighborsOf = (s: ActSection, id: string): string[] => s.passages.filter((p) => p.a === id || p.b === id).map((p) => (p.a === id ? p.b : p.a));

  for (const act of [1, 2, 3] as const) {
    it(`act ${act}: every CL1 bound holds (counts with the cousin: 6 to 8 fights, 2 to 3 traders)`, () => {
      for (const seed of SEEDS) {
        const cfg = runConfigFor(rich, seed, 'tinker');
        const run = newRun({ ...cfg });
        startAct(run, act);
        const section = run.section as ActSection;
        const elites = run.elites as RoamingElite[];
        const why = `act ${act} seed ${seed}`;
        const n = (k: string) => section.rooms.filter((r) => r.kind === k).length;
        expect(section.rooms.length, why).toBeGreaterThanOrEqual(16);
        expect(section.rooms.length, why).toBeLessThanOrEqual(20);
        const floors = new Set(section.rooms.map((r) => r.floor));
        expect([floors.size >= 5 && floors.size <= 6, Math.min(...floors), Math.max(...floors)], why).toEqual([true, 0, floors.size - 1]);
        for (const f of floors) {
          const c = section.rooms.filter((r) => r.floor === f).length;
          expect(c >= 3 && c <= 4, `${why} floor ${f}`).toBe(true);
        }
        expect(new Set(section.rooms.map((r) => r.id)).size, why).toBe(section.rooms.length);
        expect(section.rooms.find((r) => r.id === section.entry)?.kind, why).toBe('entry');
        expect(section.rooms.find((r) => r.id === section.door)?.kind, why).toBe('door');
        const seen = new Set<string>();
        for (const p of section.passages) {
          const key = [p.a, p.b].sort().join('|');
          expect(seen.has(key), `${why} duplicate ${key}`).toBe(false);
          seen.add(key);
          const fa = section.rooms.find((r) => r.id === p.a)!.floor;
          const fb = section.rooms.find((r) => r.id === p.b)!.floor;
          if (p.kind === 'floor') expect(fa, why).toBe(fb);
          else expect(fa, why).not.toBe(fb);
        }
        for (const r of section.rooms) expect(shortest(section, section.entry, r.id), `${why} ${r.id} reachable`).toBeLessThan(Infinity);
        expect(section.passages.length - section.rooms.length + 1, `${why} loops`).toBeGreaterThanOrEqual(2);
        expect(shortest(section, section.entry, section.door, (p) => !p.locked), `${why} door path`).toBeLessThanOrEqual(5);
        expect(n('fight'), `${why} fights`).toBeGreaterThanOrEqual(6);
        expect(n('fight'), `${why} fights`).toBeLessThanOrEqual(8);
        expect(n('trader'), `${why} traders`).toBeGreaterThanOrEqual(2);
        expect(n('trader'), `${why} traders`).toBeLessThanOrEqual(3);
        expect(n('workbench'), why).toBe(act === 3 ? 2 : 1);
        expect(n('oil'), why).toBeGreaterThanOrEqual(1);
        expect(n('oil'), why).toBeLessThanOrEqual(2);
        expect(n('event'), `${why} events`).toBeGreaterThanOrEqual(3);
        expect(n('event'), `${why} events`).toBeLessThanOrEqual(4);
        expect(n('vault'), `${why} the known vault`).toBe(1); // every act's vault is opened
        const next = neighborsOf(section, section.entry);
        for (const r of section.rooms.filter((x) => x.kind === 'fight' && next.includes(x.id))) {
          const easy = ENCOUNTERS.filter((e) => e.act === act && e.band === 'easy').map((e) => e.enemies.join(','));
          expect(easy.includes((r.encounter ?? []).join(',')), `${why} ${r.id} easy next to the entry`).toBe(true);
        }
        expect(section.rooms.some((r) => next.includes(r.id) && r.kind === 'fight'), `${why} an opening fight`).toBe(true);
        for (const r of section.rooms.filter((x) => x.kind === 'event')) {
          expect(EVENTS[r.eventId ?? ''], `${why} event ${r.eventId}`).toBeTruthy();
          const e = EVENTS[r.eventId as string];
          expect(!e.act || e.act === act, `${why} ${e.id} belongs to act ${e.act}`).toBe(true);
        }
        expect(elites.length, why).toBe(act === 1 ? 1 : 2);
        for (const e of elites) {
          expect(e.patrol.length >= 3 && e.patrol.length <= 5, why).toBe(true);
          expect(e.patrol, why).not.toContain(section.entry);
          expect(e.patrol, why).not.toContain(section.door);
          e.patrol.forEach((id, i) => expect(neighborsOf(section, id).includes(e.patrol[(i + 1) % e.patrol.length]), `${why} patrol`).toBe(true));
        }
        const l = section.passages.filter((p) => {
          if (p.kind !== 'lift' || p.locked || (p.a !== section.entry && p.b !== section.entry)) return false;
          return (section.rooms.find((r) => r.id === (p.a === section.entry ? p.b : p.a))?.floor ?? 0) >= 2;
        });
        expect(l.length, `${why} lift`).toBe(act === 1 ? 1 : 0);
        expect(section.rooms.every((r) => r.revealed), `${why} the Lamplighter revealed everything`).toBe(true);
      }
    });
  }
});

// ---------- the six new events ----------

describe('the six new events: traders-cousin, stopped-clock, empty-chair, unsent-letter, beacon, vault-wheel', () => {
  const ACTS: Record<string, (1 | 2 | 3)[]> = {
    'traders-cousin': [1, 2, 3],
    'stopped-clock': [1],
    'empty-chair': [2],
    'unsent-letter': [3],
    beacon: [3],
    'vault-wheel': [1, 2, 3],
  };
  const COUNT: Record<string, number> = { 'traders-cousin': 2, 'stopped-clock': 2, 'empty-chair': 2, 'unsent-letter': 2, beacon: 2, 'vault-wheel': 3 };

  it('exist with their choices and act limits, and appear in generated sections only in their acts', () => {
    for (const [id, acts] of Object.entries(ACTS)) {
      const ev = EVENTS[id];
      expect(ev, id).toBeTruthy();
      expect(ev.choices, id).toHaveLength(COUNT[id]);
      if (acts.length < 3) expect(ev.act, id).toBe(acts[0]);
    }
    const seen: Record<string, number> = {};
    for (const act of [1, 2, 3] as const) {
      for (let seed = 1; seed <= 200; seed++) {
        for (const r of generateSection(initStreams(seed), act).section.rooms) {
          if (!r.eventId || !ACTS[r.eventId]) continue;
          expect(ACTS[r.eventId], `${r.eventId} placed in act ${act}`).toContain(act);
          seen[r.eventId] = (seen[r.eventId] ?? 0) + 1;
        }
      }
    }
    for (const id of Object.keys(ACTS)) expect(seen[id] ?? 0, `${id} appears`).toBeGreaterThan(0);
  });

  it("traders-cousin: buy his map (20 Scrap) reveals this act's layout; telling him about Bellfoot sends him down", () => {
    const run = atEvent(profileWith(), 'traders-cousin');
    expect((run.section as ActSection).rooms.every((r) => r.revealed)).toBe(false);
    expect(choose(run, 0)).toBeTruthy();
    expect(run.scrap).toBe(80);
    expect((run.section as ActSection).rooms.every((r) => r.revealed)).toBe(true);
    const poor = atEvent(profileWith(), 'traders-cousin');
    poor.scrap = 19;
    expect(EVENTS['traders-cousin'].choices[0].available?.(poor)).toBe(false);
    const move = atEvent(profileWith(), 'traders-cousin');
    choose(move, 1);
    expect(move.resident).toBe('traders-cousin');
  });

  it('stopped-clock: read the inscription (lore, heal 6) or take the cogs (25 Scrap)', () => {
    const a = atEvent(profileWith(), 'stopped-clock');
    choose(a, 0);
    expect([a.hp, a.lore]).toEqual([36, ['stopped-clock']]);
    const b = atEvent(profileWith(), 'stopped-clock');
    choose(b, 1);
    expect([b.scrap, b.lore]).toEqual([125, []]);
  });

  it('empty-chair: sit (heal 10, lore) or search the desk (30 Scrap, a blueprint one time in three)', () => {
    const a = atEvent(profileWith(), 'empty-chair', { act: 2 });
    choose(a, 0);
    expect([a.hp, a.lore]).toEqual([40, ['empty-chair']]);
    let found = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const b = atEvent(profileWith(), 'empty-chair', { act: 2 });
      choose(b, 1);
      expect(b.scrap).toBe(130);
      expect(b.lore).toEqual([]);
      if (b.stats.blueprintsFound.length > 0) found++;
    }
    expect(found / N).toBeGreaterThan(0.22);
    expect(found / N).toBeLessThan(0.45);
  });

  it('unsent-letter: carry it down (lore, 15 Brass, a journal page after the run) or read it to Sprocket (heal 12)', () => {
    const a = atEvent(profileWith(), 'unsent-letter', { act: 3 });
    const brass = a.stats.bonusBrass ?? 0;
    choose(a, 0);
    expect(a.lore).toEqual(['unsent-letter']);
    expect((a.stats.bonusBrass ?? 0) - brass).toBe(15);
    const p = profileWith();
    finishRun(p, end(a), T);
    expect(p.journal.length).toBeGreaterThan(0);
    const b = atEvent(profileWith(), 'unsent-letter', { act: 3 });
    choose(b, 1);
    expect([b.hp, b.lore]).toEqual([42, []]);
  });

  it('the Hour Ghost: asking about the inventor is the lore, with 10 Brass', () => {
    const run = atEvent(profileWith(), 'hour-ghost');
    const brass = run.stats.bonusBrass ?? 0;
    choose(run, 1);
    expect(run.lore).toContain('hour-ghost');
    expect((run.stats.bonusBrass ?? 0) - brass).toBe(10);
  });
});

// ---------- finishRun: residents, landmarks, bestiary, lore, achievements ----------

describe('finishRun records what Bellfoot remembers, in the one write', () => {
  it('the enemies met in a run join the bestiary (unique, in order); a fight start marks the enemy met', () => {
    const run = mk(profileWith());
    startCombat(run, ['cog-rat', 'rust-mite'], 'fight');
    startCombat(run, ['cog-rat'], 'fight');
    expect(run.met).toEqual(['cog-rat', 'rust-mite']);
    const p = profileWith();
    p.bestiary = ['spring-imp'];
    finishRun(p, end(run), T);
    expect(p.bestiary).toEqual(['spring-imp', 'cog-rat', 'rust-mite']);
  });

  it('lore moments become progress keys, and e-lore opens when all four are heard, across runs', () => {
    const p = profileWith();
    const a = mk(p);
    a.lore = ['hour-ghost', 'stopped-clock'];
    expect(finishRun(p, end(a), T).newAchievements).not.toContain('e-lore');
    for (const m of ['hour-ghost', 'stopped-clock']) expect(p.achievementProgress[`lore-${m}`]).toBe(1);
    expect(p.achievementProgress['lore-empty-chair']).toBeUndefined();
    const b = mk(p);
    b.lore = ['empty-chair', 'unsent-letter'];
    expect(finishRun(p, end(b), T).newAchievements).toContain('e-lore');
    expect(p.achievements['e-lore']).toBe(T);
  });

  it('the earned achievements put their journal pages and collars where Bellfoot reads them', () => {
    const p = profileWith();
    expect(p.collar).toBeNull();
    const win = mk(p);
    win.phase = 'victory';
    win.stats.plan = { plating: 150, burst: 1, pressure: 0, statuses: 0 };
    finishRun(p, win, T);
    expect(p.achievements['e-first-win']).toBeTruthy();
    expect(p.journal.length).toBe(1);
    const pet = profileWith();
    pet.achievementProgress.pets = 50;
    finishRun(pet, end(mk(pet)), T);
    expect(pet.collars).toContain('red');
    const bell = profileWith();
    const run = mk(bell);
    run.stats.bells = [{ act: 1, hoursLeft: 4 }];
    finishRun(bell, end(run), T);
    expect(bell.collars).toContain('bell');
    expect(bell.journal.length).toBe(1);
  });
});

describe('the five achievements Bellfoot opens, one test each', () => {
  const ids = ['e-resident', 'e-lore', 'm-residents', 'm-lift', 'm-beacon'];

  it('are available now; since B10b the six Overwind and Master ones are too (all 33)', () => {
    for (const id of ids) expect(ACHIEVEMENTS.find((a) => a.id === id)?.available, id).toBe(true);
    expect(ACHIEVEMENTS.filter((a) => !a.available).map((a) => a.id).sort()).toEqual([]);
  });

  it('e-resident: when finishRun adds a resident', () => {
    const p = profileWith();
    const none = mk(p);
    expect(finishRun(p, end(none), T).newAchievements).not.toContain('e-resident');
    const run = mk(p);
    run.resident = 'oil-merchant';
    expect(finishRun(p, end(run), T).newAchievements).toContain('e-resident');
  });

  it('m-residents: when the fifth resident arrives, not the fourth', () => {
    const p = profileWith({ residents: ALL_RESIDENTS.slice(0, 3) });
    const four = mk(p);
    four.resident = ALL_RESIDENTS[3];
    expect(finishRun(p, end(four), T).newAchievements).not.toContain('m-residents');
    const five = mk(p);
    five.resident = ALL_RESIDENTS[4];
    expect(finishRun(p, end(five), T).newAchievements).toContain('m-residents');
    expect(p.achievements['m-residents']).toBe(T);
  });

  it('m-lift: when the lift landmark is added', () => {
    const p = profileWith();
    const run = atEvent(p, 'lamplighter', { chassis: 'horologist' });
    choose(run, 2);
    expect(finishRun(p, end(run), T).newAchievements).toContain('m-lift');
    const q = profileWith();
    expect(finishRun(q, end(mk(q)), T).newAchievements).not.toContain('m-lift');
  });

  it('m-beacon: when the beacon is lit', () => {
    const p = profileWith();
    const run = atEvent(p, 'beacon', { act: 3 });
    choose(run, 0);
    expect(finishRun(p, end(run), T).newAchievements).toContain('m-beacon');
  });

  it('their unlock rewards: the Mirror Gear (m-residents) is now reachable', () => {
    expect(ACHIEVEMENTS.find((a) => a.id === 'm-residents')?.reward.parts).toEqual(['mirror-gear']);
  });
});

// ---------- the Scrapper ----------

describe('the Scrapper (content.md 8; B10a M9)', () => {
  it('has its 8 parts and passive, is not for sale, and shows on the rack only after m-salvager', () => {
    const c = CHASSIS.scrapper;
    expect(c, 'CHASSIS.scrapper').toBeTruthy();
    expect([...c.startingBin].sort()).toEqual(['cold-chisel', 'escapement', 'escapement', 'mending-spool', 'pry-bar', 'pry-bar', 'spur', 'spur']);
    expect(c.passive).toMatch(/salvag/i);
    const p = profileWith();
    expect(chassisAvailable(p)).not.toContain('scrapper');
    expect(chassisPrice(p, 'scrapper')).toBeNull();
    const run = mk(p);
    run.stats.partsBroken = 100;
    finishRun(p, end(run), T);
    expect(p.achievements['m-salvager']).toBeTruthy();
    expect(chassisAvailable(p)).toContain('scrapper');
    expect(chassisPrice(p, 'scrapper')).toBeNull(); // no Brass cost
  });

  const scrapperRun = (c: ReturnType<typeof combatWith>, chassis = 'scrapper'): RunState => {
    const run = newRun(defaultRunConfig(1));
    run.config.chassis = chassis;
    c.chassis = chassis;
    c.kind = 'fight';
    run.combat = c;
    run.phase = 'combat';
    return run;
  };
  const fresh = (run: RunState, before: number) => run.bin.slice(before);

  it('the first enemy part you break that has a part salvage is kept upgraded; later ones and other chassis are plain', () => {
    const mkFight = () =>
      combatWith({
        board: { B2: 'test-strike-31' },
        ticks: 3,
        enemies: [{ core: 99, parts: [
          { id: 'none', hp: 5, act: 'attack 1', salvage: null },
          { id: 'key', hp: 5, act: 'attack 1', salvage: 'spire-key' },
          { id: 'one', hp: 5, act: 'attack 1', salvage: 'bevel' },
          { id: 'two', hp: 5, act: 'attack 1', salvage: 'crown' },
        ] }],
        order: ['e0.none', 'e0.key', 'e0.one', 'e0.two'],
      });
    const play = (chassis: string) => {
      const c = mkFight();
      const run = scrapperRun(c, chassis);
      runTurn(c);
      runTurn(c);
      c.board.fill(null);
      for (const e of c.enemies) e.hp = 0;
      runTurn(c);
      expect(settleCombat(run)).toBe(true);
      const before = run.bin.length;
      const items = (run.pending as { items: { salvage: string }[] }).items;
      expect(takeSalvage(run, items.map((_, i) => i))).toBe(true);
      return Object.fromEntries(fresh(run, before).map((b) => [b.defId, b.plus]));
    };
    const s = play('scrapper');
    expect(s.bevel, 'the first part salvage is upgraded').toBe(true);
    expect(s.crown, 'the second is plain').toBe(false);
    const t = play('tinker');
    expect(t.bevel).toBe(false);
  });

  it('once per combat, when a core dies with parts standing, the tray offers the best wrecked part: highest rarity, ties leftmost, no keys, no armor', () => {
    const mkFight = (core2 = false) =>
      combatWith({
        board: { B2: 'test-strike-31' },
        ticks: 1,
        enemies: [
          { core: 15, parts: [
            { id: 'a', hp: 30, act: 'attack 1', rarity: 'uncommon', salvage: 'bevel' },
            { id: 'k', hp: 30, act: 'attack 1', rarity: 'rare', salvage: 'spire-key' },
            { id: 'armor', hp: 30, rarity: 'rare', passive: { kind: 'bulwark' }, salvage: null },
            { id: 'b', hp: 30, act: 'attack 1', rarity: 'rare', salvage: 'planetary' },
            { id: 'c', hp: 30, act: 'attack 1', rarity: 'rare', salvage: 'flywheel' },
          ] },
          ...(core2 ? [{ core: 20, parts: [{ id: 'd', hp: 30, act: 'attack 1', rarity: 'rare' as const, salvage: 'volute' }] }] : []),
        ],
        order: ['e0.core'],
      });
    const c = mkFight();
    const run = scrapperRun(c);
    runTurn(c);
    expect(c.outcome).toBe('won');
    expect(settleCombat(run)).toBe(true);
    const items = (run.pending as { items: { salvage: string; scrapper?: boolean }[] }).items;
    expect(items.map((i) => i.salvage)).toEqual(['planetary']);
    expect(items[0].scrapper, 'marked Scrapper').toBe(true);
    const before = run.bin.length;
    expect(takeSalvage(run, [0])).toBe(true);
    expect(fresh(run, before).map((b) => b.defId)).toEqual(['planetary']);
    // once per combat: the second core to die offers nothing
    const d = mkFight(true);
    const run2 = scrapperRun(d);
    runTurn(d);
    expect(d.outcome).toBe('ongoing');
    d.order = ['e1.core'];
    put(d, 'B2', 'test-strike-31');
    runTurn(d);
    expect(d.outcome).toBe('won');
    expect(settleCombat(run2)).toBe(true);
    expect((run2.pending as { items: { salvage: string }[] }).items.map((i) => i.salvage)).toEqual(['planetary']);
    // other chassis: nothing
    const e = mkFight();
    const run3 = scrapperRun(e, 'tinker');
    runTurn(e);
    settleCombat(run3);
    expect((run3.pending as { items: unknown[] }).items).toEqual([]);
  });
});

// ---------- BF5 and migration ----------

describe('BF5 and migration', () => {
  const slot = (version: number): SaveSlot => {
    const profile = newProfile('Tess', T);
    profile.version = version;
    profile.upgrades = { frame: 2, cogs: 2 };
    profile.brass = 77;
    const loose = profile as unknown as Record<string, unknown>;
    for (const k of ['residents', 'landmarks', 'journal', 'bestiary', 'collars', 'collar']) delete loose[k];
    return { slot: 1, version, profile, run: null, updatedAt: T };
  };

  it('BF5: Spare Cogs II becomes Spare Scrap II with the same Brass spent', () => {
    expect(UPGRADES.scrap.name).toBe('Spare Scrap');
    const out = migrateSlot(slot(1)).slot.profile;
    expect(out.upgrades.cogs).toBeUndefined();
    expect(out.upgrades.scrap).toBe(2);
    expect(out.brass).toBe(77);
  });

  it('a profile saved before Bellfoot gets empty residents, landmarks, journal, bestiary, collars and no collar, at any version', () => {
    for (const v of [1, 2]) {
      const p = migrateSlot(slot(v)).slot.profile;
      expect([p.residents, p.landmarks, p.journal, p.bestiary, p.collars, p.collar], `v${v}`).toEqual([[], [], [], [], [], null]);
    }
  });

  it('a run saved before Bellfoot gets oilFlasks 0, no resident, nothing met, no lore', () => {
    const s = slot(2);
    const run = mk(s.profile);
    for (const k of ['oilFlasks', 'resident', 'met', 'lore']) delete (run as unknown as Record<string, unknown>)[k];
    s.run = run;
    const out = migrateSlot(s).slot.run as RunState;
    expect([out.oilFlasks, out.resident, out.met, out.lore]).toEqual([0, null, [], []]);
  });
});
