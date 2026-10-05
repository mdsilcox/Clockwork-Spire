// B10b acceptance (unit): the four modes, the ten Overwind twists, the six hard achievements, the Thirteenth Hour
// (docs/acceptance.md AD4, AD5; docs/briefs/B10b-curve.md "Round 2" and "Round 2 additions"; docs/rules.md 5.7;
// docs/content.md 7 (h-master, h-clockwork, h-ow5, h-ow8, h-ow10, h-master-bare) and 9). Written by the orchestrator's
// test-porter in the B10b.0 contract step. Lanes may adapt a test to the code but never weaken an assertion. The tests are the spec.
//
// B10b is modes and Overwind only; the curve (BV1, BV2, BV5, BV10) is B10c. Everything here goes through the public engine:
// `createCombat` / `runTurn`, `newRun` / `startAct` / `spendHour` / `rest` / `barter` / `takeSalvage`, `finishRun`, `settleCombat`.
// The pass-through hooks of src/core/difficulty.ts are exercised through those, never called directly except `traderPrice`.
//
// WHAT THE LANE (modes-overwind) MUST PROVIDE (the tests read these; nothing else is assumed):
//   - difficulty.ts filled in as its header states: enemy HP = mode % times Overwind 3's +20% on PARTS (the core takes the mode %
//     only), one rounding half up at the end, at combat start AND for summons (`summonEnemy`); the damage the player takes is
//     base x mode damage % (rounded half up, per hit), then Strength, then Overwind 8's +2, then Dazed (x0.75 rounded down), then
//     Plating; the mode % never touches Shell, Mend, Bulwark, Governor or Drain. Attack, Pierce, Siphon, Countdown, Build-up and the
//     core's Bump are all "amounts the player takes". Hours per act: the mode's hours, minus 1 from Overwind 2, plus 1 for act 3
//     with the lit beacon (`mapPatch.beacon`), never below 6, for EVERY act (act 2 and 3 must not compound the reduction). Oil: base
//     x the mode's oil % / 30 (Journeyman unchanged: a station heals 30% of max HP, a flask and a trader's oil 15) x 0.5 from
//     Overwind 6, rounded half up once (stations, trader oil, Oil Flasks). Brass: mode % x (1 + 0.1 x level), once, at finishRun.
//     Trader price: x1.15 rounded half up from Overwind 1.
//   - A config or combat with `mode` / `overwind` missing behaves as Journeyman at 0 (an old save's run).
//   - Overwind 4: the first part placed each combat gets `rusted = 1` (an ordinary Rust: Grease Pot protects the Mainspring's neighbors).
//   - Overwind 5: `spendHour` (and `moveTo`) step every roaming elite twice when `run.hour` (after the increment) is a multiple of 3.
//   - Overwind 7: `takeSalvage` refuses (returns false) keeping more than one ordinary item; items with `scrapper: true` (the Scrapper's
//     wrecked-part offer and the Tow Hook's) do not count; every part not kept pays 2 Scrap instead of 3 (locked items still pay 6).
//   - Overwind 9: with `CreateCombatOpts.memory` set, the Foreman and the Queen (not the Clockmaker, who already has one) also start with
//     the memory part for that plan (ids mem-drill, mem-governor, mem-valve, mem-chime): a standing, non-keystone part with an intent,
//     whose def `partDefOf` resolves; with no memory plan they gain none.
//   - Overwind 10: the Thirteenth Hour as docs/content.md 9 and the brief's "Round 2 additions" state it, with the part ids of
//     content/overwind.ts (clock-thirteenth-chime, clock-hourless-dial), THIRTEENTH_HOUR.beat as the `phase` event's note (amount 3),
//     the keystones at HP 30 (later phases' parts come from their defs; Overwind 3 scales only what stands at combat start), the Governor
//     Frame retired, the core at 40 HP Braced to 13 once both keystones break, the new parts' Brass 4 and their part in h-whole-clock.
//   - Profile.modesUnlocked grows in finishRun: a Journeyman win adds 'master', a Master win adds 'clockwork' (an Apprentice win adds
//     nothing); the first Journeyman-or-harder win sets rewards.overwind to at least 3.
//   - checkAchievements: h-master (win with mode master), h-clockwork (clockwork), h-ow5 (win at overwind 5; the tests use exactly 5),
//     h-ow8 (8), h-ow10 (10), h-master-bare (win on master with under 150 Plating, `run.stats.plan.plating`); the six are `available: true`.
//   - sim: `routeRun` / `routeStatsV2` take a `mode` (tests/sim/v2-ladder.test.ts).
// The regression against today's numbers is tests/v2/b10b-regression.test.ts (its own file: the test parts registered here would
// otherwise leak into the real pool the route bot drafts from and change the snapshot).
// Test ids and hooks for the browser live in e2e/v2-clocktower.spec.ts.
import { describe, expect, it } from 'vitest';
import { createCombat, placePart, runTurn } from '../../src/core/combat';
import { ACHIEVEMENTS } from '../../src/core/content/achievements';
import { ENEMIES, enemyDef } from '../../src/core/content/enemies';
import { DEFAULT_MODE, MODE_BY_ID, MODES, START_MODES } from '../../src/core/content/modes';
import { OVERWIND_BRASS_PER_LEVEL, OVERWIND_TWISTS, THIRTEENTH_CORE, THIRTEENTH_HOUR, THIRTEENTH_KEYSTONE_BRACED } from '../../src/core/content/overwind';
import { earnAchievement } from '../../src/core/achievements';
import { traderPrice } from '../../src/core/difficulty';
import { refreshIntents, summonEnemy } from '../../src/core/enemy';
import { setOrder } from '../../src/core/frames';
import { initPart, partDefOf, partState } from '../../src/core/framelib';
import { finishRun, newProfile, runConfigFor } from '../../src/core/meta';
import { barter, barterPrice, rest, useOilFlask } from '../../src/core/rooms';
import { brassFor, defaultRunConfig, newRun, settleCombat } from '../../src/core/run';
import { takeSalvage } from '../../src/core/salvage';
import { spendHour, startAct } from '../../src/core/section';
import { startCombat } from '../../src/core/startfight';
import { cell, put, registerTestEnemy, testPart } from '../../src/core/testkit';
import type { TestEnemy, TestPart } from '../../src/core/testkit';
import type { ActSection, CombatState, GameEvent, PartInstance, Plan, Profile, RunConfig, RunState, SalvageItem, TargetRef } from '../../src/core/types';

const T = '2026-10-05T12:00:00Z';
let seedN = 31000;

// ---------- spec tables (rules 5.7), kept here so the tests do not read the data they check ----------

type ModeId = 'apprentice' | 'journeyman' | 'master' | 'clockwork';
const MODE_IDS: ModeId[] = ['apprentice', 'journeyman', 'master', 'clockwork'];
const SPEC: Record<ModeId, { hp: number; dmg: number; hours: number; oil: number; brass: number }> = {
  apprentice: { hp: 80, dmg: 75, hours: 14, oil: 40, brass: 75 },
  journeyman: { hp: 100, dmg: 100, hours: 12, oil: 30, brass: 100 },
  master: { hp: 115, dmg: 115, hours: 11, oil: 25, brass: 125 },
  clockwork: { hp: 130, dmg: 125, hours: 10, oil: 20, brass: 150 },
};

/** Round half up of n / d for non-negative integers. */
const rh = (n: number, d: number): number => Math.floor((2 * n + d) / (2 * d));
/** Enemy HP: the mode % times Overwind 3's +20% on parts, multiplied, rounded half up once. The core takes the mode % only. */
const hpFor = (hp: number, mode: ModeId, ow: number, isPart: boolean): number => rh(hp * SPEC[mode].hp * (isPart && ow >= 3 ? 120 : 100), 10000);
/** What the player takes from one hit of base `b`, before Strength, Overwind 8, Dazed and Plating. */
const hitFor = (b: number, mode: ModeId): number => rh(b * SPEC[mode].dmg, 100);
/** An oil heal: base (Journeyman's number) x the mode's oil % / 30, x 0.5 from Overwind 6, rounded half up once. */
const oilFor = (base: number, mode: ModeId, ow: number): number => rh(base * SPEC[mode].oil * (ow >= 6 ? 50 : 100), 3000);

// ---------- builders ----------

function cfg(o: { mode?: string; overwind?: number; seed?: number; climb?: boolean; beacon?: boolean } = {}): RunConfig {
  const c: RunConfig = { ...defaultRunConfig(o.seed ?? seedN++), legacyMap: !(o.climb ?? true) };
  if (o.mode !== undefined) c.mode = o.mode;
  if (o.overwind !== undefined) c.overwind = o.overwind;
  if (o.beacon) c.mapPatch = { beacon: true };
  return c;
}
/** A v2 run (act 1's section built) on `mode` at Overwind `overwind`. */
const mkRun = (mode: string = 'journeyman', overwind = 0, o: { beacon?: boolean; seed?: number } = {}): RunState => newRun(cfg({ mode, overwind, beacon: o.beacon, seed: o.seed }));

interface MkOpts {
  enemies: (string | TestEnemy)[];
  mode?: string;
  overwind?: number;
  hp?: number;
  board?: Record<string, string>;
  hand?: string[];
  trinkets?: string[];
  kind?: CombatState['kind'];
  memory?: Plan | null;
  strength?: number;
  dazed?: boolean;
  plating?: number;
  pressure?: number;
}

/** A combat through the real `createCombat` (so the mode and Overwind apply at combat start), with a hand and a board as testkit's `combatWith`. */
function mk(o: MkOpts): CombatState {
  const bin: PartInstance[] = [];
  const handUids: number[] = [];
  for (const spec of o.hand ?? []) {
    if (spec.startsWith('test-')) testPart(spec);
    bin.push({ uid: bin.length + 1, defId: spec, plus: false });
    handUids.push(bin.length);
  }
  const ids = o.enemies.map((e) => (typeof e === 'string' ? e : registerTestEnemy(e)));
  const hp = o.hp ?? 200;
  const c = createCombat({ seed: 1, bin, enemies: ids, hp, maxHp: hp, kind: o.kind, trinkets: o.trinkets, mode: o.mode, overwind: o.overwind, memory: o.memory });
  c.draw = [];
  c.discard = [];
  c.hand = handUids;
  for (const [name, spec] of Object.entries(o.board ?? {})) put(c, name, spec);
  if (o.strength) c.enemies[0].statuses.strength = o.strength;
  if (o.dazed) c.enemies[0].statuses.dazed = 3;
  if (o.strength || o.dazed) refreshIntents(c, 0);
  if (o.plating !== undefined) c.plating = o.plating;
  if (o.pressure !== undefined) c.pressure = o.pressure;
  return c;
}

/** One enemy whose single acting part does `act` (testkit's shorthand) each turn; its core never gets to act. */
const hitter = (act: string, extra: Partial<TestPart> = {}): TestEnemy => ({ core: 999, parts: [{ id: 'arm', hp: 99, act, ...extra }] });

/** HP the player loses to one enemy turn of `act` (the player runs an empty machine first). */
function taken(act: string, o: Omit<MkOpts, 'enemies'> & { part?: Partial<TestPart> } = {}): number {
  const { part, ...rest } = o;
  const c = mk({ ...rest, enemies: [hitter(act, part)], hp: 500 });
  runTurn(c);
  return 500 - c.playerHp;
}

const kinds = (events: GameEvent[], kind: GameEvent['kind']): GameEvent[] => events.filter((e) => e.kind === kind);
const partsOf = (c: CombatState, e = 0): Record<string, { hp: number; maxHp: number }> => Object.fromEntries(c.enemies[e].parts.map((p) => [p.id, { hp: p.hp, maxHp: p.maxHp }]));

// ---------- the modes as data (rules 5.7) ----------

describe('AD4: the mode table is the rules table', () => {
  it('four modes in order, Journeyman the default, Apprentice and Journeyman open from the start', () => {
    expect(MODES.map((m) => m.id)).toEqual(MODE_IDS);
    expect(DEFAULT_MODE).toBe('journeyman');
    expect(START_MODES).toEqual(['apprentice', 'journeyman']);
    for (const m of MODES) expect(MODE_BY_ID[m.id]).toBe(m);
    const p = newProfile('t', T);
    expect([p.modesUnlocked, p.lastMode, p.lastOverwind]).toEqual([['apprentice', 'journeyman'], 'journeyman', 0]);
  });

  it('every number matches rules 5.7', () => {
    for (const m of MODES) {
      const s = SPEC[m.id];
      expect([m.enemyHp, m.enemyDamage, m.hours, m.oilHeal, m.brass], m.id).toEqual([s.hp, s.dmg, s.hours, s.oil, s.brass]);
    }
  });

  it('the ten twists are named in order and each level adds 10% Brass', () => {
    expect(OVERWIND_TWISTS.map((t) => t.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(OVERWIND_TWISTS.map((t) => t.name)).toEqual(['Loose Bolts', 'Short Days', 'Thick Plates', 'Cold Joints', 'Restless Elites', 'Thin Oil', 'Salvage Rot', 'Wound Springs', 'The Warden Stirs', 'The Thirteenth Hour']);
    expect(OVERWIND_BRASS_PER_LEVEL).toBe(10);
  });

  it('the run, the combat and the config from the profile carry the mode and the level', () => {
    const run = mkRun('master', 4);
    expect([run.config.mode, run.config.overwind]).toEqual(['master', 4]);
    const c = createCombat({ seed: 1, bin: [], enemies: ['dummy'], hp: 50, maxHp: 50, mode: 'clockwork', overwind: 7 });
    expect([c.mode, c.overwind]).toEqual(['clockwork', 7]);
    const p = newProfile('t', T);
    p.lastMode = 'master';
    p.lastOverwind = 4;
    const rc = runConfigFor(p, 5, 'tinker');
    expect([rc.mode, rc.overwind]).toEqual(['master', 4]);
    const fought = startCombat(run, ['dummy'], 'fight');
    expect([fought.mode, fought.overwind]).toEqual(['master', 4]);
  });
});

// ---------- AD4: enemy HP ----------

const PARTS_HP = [10, 15, 30, 25, 40];
const HP_ENEMY: TestEnemy = { core: 50, parts: PARTS_HP.map((hp) => ({ id: `p${hp}`, hp })) };

describe('AD4: enemy HP per mode (parts and core, rounded half up)', () => {
  for (const mode of MODE_IDS) {
    it(`${mode}: every part and the core scale by ${SPEC[mode].hp}%`, () => {
      const c = mk({ enemies: [HP_ENEMY], mode });
      const e = c.enemies[0];
      expect([e.hp, e.maxHp], 'core').toEqual([hpFor(50, mode, 0, false), hpFor(50, mode, 0, false)]);
      for (const hp of PARTS_HP) expect(partsOf(c)[`p${hp}`], `part ${hp}`).toEqual({ hp: hpFor(hp, mode, 0, true), maxHp: hpFor(hp, mode, 0, true) });
    });
  }

  it('worked numbers: Master 10 -> 12 (11.5 rounds up), 15 -> 17, core 50 -> 58; Clockwork 15 -> 20, core 50 -> 65; Apprentice 15 -> 12, core 50 -> 40', () => {
    const m = mk({ enemies: [HP_ENEMY], mode: 'master' });
    expect([partsOf(m).p10.hp, partsOf(m).p15.hp, m.enemies[0].hp]).toEqual([12, 17, 58]);
    const k = mk({ enemies: [HP_ENEMY], mode: 'clockwork' });
    expect([partsOf(k).p15.hp, k.enemies[0].hp]).toEqual([20, 65]);
    const a = mk({ enemies: [HP_ENEMY], mode: 'apprentice' });
    expect([partsOf(a).p15.hp, a.enemies[0].hp]).toEqual([12, 40]);
  });

  it('Overwind 3 multiplies parts by 1.2 together with the mode, rounded once: Master 30 -> 41 (not 42), Clockwork 30 -> 47, Journeyman 30 -> 36; the core takes the mode % only', () => {
    const m = mk({ enemies: [HP_ENEMY], mode: 'master', overwind: 3 });
    expect(partsOf(m).p30.hp).toBe(41);
    expect(m.enemies[0].hp).toBe(58);
    expect(partsOf(mk({ enemies: [HP_ENEMY], mode: 'clockwork', overwind: 3 })).p30.hp).toBe(47);
    const j = mk({ enemies: [HP_ENEMY], mode: 'journeyman', overwind: 3 });
    expect(partsOf(j).p30).toEqual({ hp: 36, maxHp: 36 });
    expect(j.enemies[0].hp).toBe(50);
  });

  it('Overwind 2 does not change HP; Overwind 3 does, and every level above keeps it', () => {
    expect(partsOf(mk({ enemies: [HP_ENEMY], overwind: 2 })).p30.hp).toBe(30);
    for (const ow of [3, 6, 10]) expect(partsOf(mk({ enemies: [HP_ENEMY], overwind: ow })).p30.hp, `level ${ow}`).toBe(36);
  });

  it('every real enemy def: each part and the core of everything on the board scale per mode, at Overwind 0 and 3', () => {
    const ids = Object.keys(ENEMIES).filter((id) => !id.startsWith('test-') && ENEMIES[id].frame);
    expect(ids.length).toBeGreaterThanOrEqual(24);
    for (const mode of MODE_IDS) {
      for (const ow of [0, 3]) {
        for (const id of ids) {
          const c = createCombat({ seed: 1, bin: [], enemies: [id], hp: 50, maxHp: 50, mode, overwind: ow, kind: ENEMIES[id].tier === 'boss' ? 'boss' : 'fight' });
          c.enemies.forEach((e, i) => {
            const f = enemyDef(e.defId).frame;
            if (!f) return;
            const first = f.phases ? f.phases[0].parts : f.parts;
            expect([e.hp, e.maxHp], `${mode} ow${ow} ${e.defId} core`).toEqual([hpFor(f.core, mode, ow, false), hpFor(f.core, mode, ow, false)]);
            for (const d of first) expect(partsOf(c, i)[d.id], `${mode} ow${ow} ${e.defId} ${d.id}`).toEqual({ hp: hpFor(d.hp, mode, ow, true), maxHp: hpFor(d.hp, mode, ow, true) });
          });
        }
      }
    }
  });

  it('a summoned enemy scales like the rest (a Cog Rat summoned mid-fight)', () => {
    for (const [mode, ow] of [['master', 0], ['master', 3], ['clockwork', 3], ['apprentice', 0]] as [ModeId, number][]) {
      const c = mk({ enemies: [HP_ENEMY], mode, overwind: ow });
      const i = summonEnemy(c, 'cog-rat', null);
      expect(i, 'a slot was free').toBeGreaterThan(0);
      const f = enemyDef('cog-rat').frame!;
      expect(c.enemies[i].hp, `${mode} ow${ow} core`).toBe(hpFor(f.core, mode, ow, false));
      for (const d of f.parts) expect(partsOf(c, i)[d.id], `${mode} ow${ow} ${d.id}`).toEqual({ hp: hpFor(d.hp, mode, ow, true), maxHp: hpFor(d.hp, mode, ow, true) });
    }
  });

  it("Braced follows max HP: a Master Foreman's Wrench Arm takes at most half of its scaled maximum a turn", () => {
    const c = mk({ enemies: ['foreman'], kind: 'boss', mode: 'master', board: { B2: 'test-strike-99' }, hp: 900 });
    const max = partsOf(c)['foreman-wrench'].maxHp;
    expect(max).toBe(hpFor(26, 'master', 0, true)); // 30
    c.ticksThisTurn = 1;
    setOrder(c, ['e0.foreman-wrench' as TargetRef]);
    runTurn(c);
    expect(max - partState(c.enemies[0], 'foreman-wrench')!.hp).toBe(Math.ceil(max / 2));
  });

  it("Journeyman at Overwind 0 changes nothing: the defs' numbers exactly", () => {
    const c = mk({ enemies: [HP_ENEMY] });
    expect([c.enemies[0].hp, partsOf(c).p10.hp, partsOf(c).p15.hp, partsOf(c).p25.hp]).toEqual([50, 10, 15, 25]);
  });
});

// ---------- AD4: enemy damage ----------

describe('AD4: the damage the player takes (mode %, per hit, rounded half up; then Strength, Overwind 8, Dazed, Plating)', () => {
  const BASES = [6, 10, 7, 9];
  for (const mode of MODE_IDS) {
    it(`${mode}: Attack, Pierce and Siphon of ${BASES.join(', ')} come to ${BASES.map((b) => hitFor(b, mode)).join(', ')}`, () => {
      for (const b of BASES) {
        expect(taken(`attack ${b}`, { mode }), `attack ${b}`).toBe(hitFor(b, mode));
        expect(taken(`pierce ${b}`, { mode }), `pierce ${b}`).toBe(hitFor(b, mode));
        expect(taken(`siphon ${b}`, { mode }), `siphon ${b}`).toBe(hitFor(b, mode));
      }
    });
  }

  it('worked numbers: Apprentice 10 -> 8 (7.5 up), Master 10 -> 12 (11.5 up), Clockwork 6 -> 8 (7.5 up), Clockwork 10 -> 13 (12.5 up)', () => {
    expect(taken('attack 10', { mode: 'apprentice' })).toBe(8);
    expect(taken('attack 10', { mode: 'master' })).toBe(12);
    expect(taken('attack 6', { mode: 'clockwork' })).toBe(8);
    expect(taken('attack 10', { mode: 'clockwork' })).toBe(13);
  });

  it('each hit of a multi-hit attack is rounded on its own: Apprentice 3x3 -> 2 x 3 = 6 (not 7); Master 3x3 -> 3 x 3 = 9 (not 10)', () => {
    expect(taken('attack 3x3', { mode: 'apprentice' })).toBe(6);
    expect(taken('attack 3x3', { mode: 'master' })).toBe(9);
  });

  it("the core's Bump scales too (a part with no action leaves the core to act)", () => {
    const run = (mode: ModeId, ow = 0): number => {
      const c = mk({ enemies: [{ core: 999, parts: [{ id: 'idle', hp: 50 }], bump: 'attack 10' }], mode, overwind: ow, hp: 500 });
      runTurn(c);
      return 500 - c.playerHp;
    };
    expect(run('master')).toBe(12);
    expect(run('journeyman')).toBe(10);
    expect(run('journeyman', 8)).toBe(12);
  });

  it('Countdown and Build-up payloads scale (they are amounts the player takes)', () => {
    expect(taken('attack 10', { mode: 'master', part: { cadence: { countdown: 1 } } })).toBe(12);
    expect(taken('attack 10', { mode: 'apprentice', part: { cadence: { buildUp: 2, to: 2 } } })).toBe(8);
  });

  it('the intent on screen shows the number that will land (Master, Attack 10 shows 12)', () => {
    const c = mk({ enemies: [hitter('attack 10')], mode: 'master', hp: 500 });
    expect(c.enemies[0].intents[0].actions[0].amount).toBe(12);
    runTurn(c);
    expect(500 - c.playerHp).toBe(12);
  });

  it('order: base x mode %, then Strength, then Overwind 8 (+2), then Dazed (x0.75 down), then Plating', () => {
    expect(taken('attack 10', { mode: 'apprentice', strength: 2 })).toBe(10); // 8 + 2, not (10 + 2) x 0.75 = 9
    expect(taken('attack 10', { mode: 'apprentice', overwind: 8 })).toBe(10); // 8 + 2
    expect(taken('attack 10', { mode: 'master', strength: 3, overwind: 8 })).toBe(17); // 12 + 3 + 2
    expect(taken('attack 10', { mode: 'master', strength: 3, overwind: 8, dazed: true })).toBe(12); // floor(17 x 0.75), not floor(15 x .75) + 2 = 13
    expect(taken('attack 10', { mode: 'clockwork', plating: 5 })).toBe(8); // 13 against 5 Plating
    expect(taken('pierce 10', { mode: 'clockwork', plating: 50 })).toBe(13); // Pierce ignores Plating
  });

  it('Overwind 8 adds 2 to every enemy attack: Attack, Pierce, Siphon, each hit of a multi-hit; not at level 7', () => {
    expect(taken('attack 10', { overwind: 8 })).toBe(12);
    expect(taken('pierce 10', { overwind: 8 })).toBe(12);
    expect(taken('siphon 10', { overwind: 8 })).toBe(12);
    expect(taken('attack 3x3', { overwind: 8 })).toBe(15);
    expect(taken('attack 10', { overwind: 7 })).toBe(10);
    expect(taken('attack 10', { overwind: 10 })).toBe(12);
  });

  it('the mode % never touches Shell, Mend, Drain or a Governor cap', () => {
    for (const mode of MODE_IDS) {
      const sh = mk({ enemies: [hitter('shell 10')], mode, hp: 500 });
      runTurn(sh);
      expect(sh.enemies[0].shell, `${mode} shell`).toBe(10);
      const mend = mk({ enemies: [hitter('mend 6')], mode, hp: 500 });
      const core = mend.enemies[0];
      core.hp = core.maxHp - 20;
      const before = core.hp;
      runTurn(mend);
      expect(core.hp - before, `${mode} mend`).toBe(6);
      const drain = mk({ enemies: [hitter('drain 4')], mode, hp: 500, pressure: 9 });
      runTurn(drain);
      expect(drain.pressure, `${mode} drain`).toBe(5);
      const gov = mk({ enemies: [{ core: 999, parts: [{ id: 'cap', hp: 50, passive: { kind: 'governor', cap: 10 } }] }], mode, board: { B2: 'test-strike-30' }, hp: 500 });
      gov.ticksThisTurn = 1;
      const hp0 = gov.enemies[0].hp;
      runTurn(gov);
      expect(hp0 - gov.enemies[0].hp, `${mode} governor`).toBe(10);
    }
  });

  it('Journeyman at Overwind 0 changes nothing: Attack 10 is 10, 3x3 is 9, Pierce 7 is 7', () => {
    expect(taken('attack 10')).toBe(10);
    expect(taken('attack 3x3')).toBe(9);
    expect(taken('pierce 7')).toBe(7);
  });
});

// ---------- AD4: hours per act ----------

/** Walk a climb through the three acts (the next act starts as the warden's fall does). */
function actHours(mode: string, ow: number, beacon: boolean): number[] {
  const run = mkRun(mode, ow, { beacon });
  const out = [run.hours as number];
  startAct(run, 2);
  out.push(run.hours as number);
  startAct(run, 3);
  out.push(run.hours as number);
  return out;
}
const expectHours = (mode: ModeId, ow: number, beacon: boolean): number[] => [1, 2, 3].map((act) => Math.max(6, SPEC[mode].hours - (ow >= 2 ? 1 : 0) + (beacon && act === 3 ? 1 : 0)));

describe('AD4: hours per act (14, 12, 11, 10), Overwind 2 takes one, the beacon gives act 3 one, never below 6', () => {
  for (const mode of MODE_IDS) {
    it(`${mode}: ${SPEC[mode].hours} hours in each act; the clock starts at hour 0`, () => {
      expect(actHours(mode, 0, false)).toEqual([SPEC[mode].hours, SPEC[mode].hours, SPEC[mode].hours]);
      const run = mkRun(mode);
      expect(run.hour).toBe(0);
      expect(run.hours).toBe(SPEC[mode].hours);
    });
  }

  it('Overwind 2 and up: one hour fewer in every act, once (not one more per act, not one more per level)', () => {
    for (const mode of MODE_IDS) for (const ow of [1, 2, 5, 10]) expect(actHours(mode, ow, false), `${mode} ow${ow}`).toEqual(expectHours(mode, ow, false));
  });

  it('with the lit beacon act 3 has one more hour, in every mode and with Overwind 2; starting act 3 twice does not add twice', () => {
    for (const mode of MODE_IDS) for (const ow of [0, 2]) expect(actHours(mode, ow, true), `${mode} ow${ow}`).toEqual(expectHours(mode, ow, true));
    const run = mkRun('master', 2, { beacon: true });
    startAct(run, 3);
    const once = run.hours;
    startAct(run, 3);
    expect(run.hours).toBe(once);
    expect(once).toBe(11 - 1 + 1);
  });

  it('bounds, all four modes with and without Overwind 2 and the beacon: at least 6 hours, room to walk the shortest path, and the CL1 bounds still hold (25 seeds per act)', () => {
    const shortest = (s: ActSection): number => {
      const dist: Record<string, number> = { [s.entry]: 0 };
      const queue = [s.entry];
      for (let h = 0; h < queue.length; h++) {
        const id = queue[h];
        for (const p of s.passages) {
          const next = p.a === id ? p.b : p.b === id ? p.a : null;
          if (next && dist[next] === undefined) {
            dist[next] = dist[id] + 1;
            queue.push(next);
          }
        }
      }
      return dist[s.door];
    };
    for (const mode of MODE_IDS) {
      for (const ow of [0, 2]) {
        for (const beacon of [false, true]) {
          for (let seed = 1; seed <= 25; seed++) {
            const run = mkRun(mode, ow, { beacon, seed: 500 + seed });
            for (const act of [1, 2, 3] as const) {
              if (act > 1) startAct(run, act);
              const s = run.section as ActSection;
              expect(run.hours as number, `${mode} ow${ow} beacon ${beacon} act ${act}`).toBeGreaterThanOrEqual(6);
              expect(s.rooms.length).toBeGreaterThanOrEqual(16);
              expect(s.rooms.length).toBeLessThanOrEqual(20);
              expect(shortest(s)).toBeLessThanOrEqual(5);
              expect(run.hours as number).toBeGreaterThan(shortest(s) + 1);
            }
          }
        }
      }
    }
  });

  it('the map does not depend on the mode: the same seed makes the same act 1 on every mode and level', () => {
    const rooms = (mode: string, ow: number): string => JSON.stringify((mkRun(mode, ow, { seed: 77 }).section as ActSection).rooms.map((r) => [r.id, r.kind, r.floor]));
    const base = rooms('journeyman', 0);
    for (const mode of MODE_IDS) for (const ow of [0, 3, 10]) expect(rooms(mode, ow), `${mode} ow${ow}`).toBe(base);
  });

  it('a run saved before B10b (no mode, no level) is a Journeyman run: 12 hours, unscaled enemies, 10 damage for Attack 10', () => {
    const c0 = cfg({ seed: 4242 });
    delete c0.mode;
    delete c0.overwind;
    expect(newRun(c0).hours).toBe(12);
    const old = mk({ enemies: [hitter('attack 10')], hp: 500 });
    delete old.mode;
    delete old.overwind;
    runTurn(old);
    expect(500 - old.playerHp).toBe(10);
    const sized = mk({ enemies: [HP_ENEMY] });
    delete sized.mode;
    expect(sized.enemies[0].hp).toBe(50);
  });
});

// ---------- AD4: oil ----------

/** Rest at an oil station with 60 max HP and 1 HP (30% of 60 is 18, so the mode's percent lands on whole numbers). */
function restHeal(mode: string, ow: number): number {
  const run = mkRun(mode, ow);
  run.maxHp = 60;
  run.hp = 1;
  run.phase = 'oil';
  run.pending = { kind: 'oil', done: false };
  expect(rest(run)).toBe(true);
  return run.hp - 1;
}
function flaskHeal(mode: string, ow: number): number {
  const run = mkRun(mode, ow);
  run.maxHp = 60;
  run.hp = 1;
  run.oilFlasks = 1;
  run.phase = 'section';
  expect(useOilFlask(run)).toBe(true);
  return run.hp - 1;
}
function traderOilHeal(mode: string, ow: number): number {
  const run = mkRun(mode, ow);
  run.maxHp = 60;
  run.hp = 1;
  run.scrap = 200;
  run.phase = 'trader';
  run.pending = { kind: 'trader', stock: [{ kind: 'oil', value: 15, sold: false }] };
  expect(barter(run, 0, null)).toBe(true);
  return run.hp - 1;
}

describe('AD4: the oil heal per mode (40, 30, 25, 20 percent; Journeyman is today), stations, trader oil and Oil Flasks alike', () => {
  for (const mode of MODE_IDS) {
    it(`${mode}: a station heals ${oilFor(18, mode, 0)} of 60, a flask or a trader's oil ${oilFor(15, mode, 0)}`, () => {
      expect(restHeal(mode, 0)).toBe(oilFor(18, mode, 0));
      expect(flaskHeal(mode, 0)).toBe(oilFor(15, mode, 0));
      expect(traderOilHeal(mode, 0)).toBe(oilFor(15, mode, 0));
    });
  }

  it('worked numbers: Apprentice station 24 and flask 20, Master station 15 and flask 13 (12.5 up), Clockwork station 12 and flask 10', () => {
    expect([restHeal('apprentice', 0), flaskHeal('apprentice', 0)]).toEqual([24, 20]);
    expect([restHeal('master', 0), flaskHeal('master', 0)]).toEqual([15, 13]);
    expect([restHeal('clockwork', 0), flaskHeal('clockwork', 0)]).toEqual([12, 10]);
  });

  it('Overwind 6 halves it after the mode, rounded half up once: Journeyman station 9 and flask 8 (7.5 up), Master station 8 (7.5 up) and flask 6, Apprentice 12 and 10; not at level 5', () => {
    expect([restHeal('journeyman', 6), flaskHeal('journeyman', 6), traderOilHeal('journeyman', 6)]).toEqual([9, 8, 8]);
    expect([restHeal('master', 6), flaskHeal('master', 6)]).toEqual([8, 6]);
    expect([restHeal('apprentice', 6), flaskHeal('apprentice', 6)]).toEqual([12, 10]);
    expect([restHeal('journeyman', 5), flaskHeal('journeyman', 5)]).toEqual([18, 15]);
    for (const mode of MODE_IDS) for (const ow of [6, 10]) expect([restHeal(mode, ow), flaskHeal(mode, ow)], `${mode} ow${ow}`).toEqual([oilFor(18, mode, ow), oilFor(15, mode, ow)]);
  });

  it('Journeyman at Overwind 0 heals as before: 30% of max HP at a station, 15 from a flask or a trader', () => {
    expect([restHeal('journeyman', 0), flaskHeal('journeyman', 0), traderOilHeal('journeyman', 0)]).toEqual([18, 15, 15]);
  });
});

// ---------- AD4: Brass ----------

/** finishRun on a run that ended at 37 Brass of floors (a number where doing the multiplication twice differs from doing it once). */
function brassOf(mode: string, ow: number): { gave: number; profile: Profile } {
  const profile = newProfile('t', T);
  const run = mkRun(mode, ow);
  run.phase = 'defeat';
  run.stats.floorBrass = 37;
  expect(brassFor(run)).toBe(37);
  const out = finishRun(profile, run, T);
  expect(profile.brass).toBe(out.brass);
  return { gave: out.brass, profile };
}
const brassWant = (mode: ModeId, ow: number, base = 37): number => rh(base * SPEC[mode].brass * (10 + ow), 1000);

describe('AD4: Brass at the end of a run is the mode % times (1 + 0.1 x level), multiplied once', () => {
  for (const mode of MODE_IDS) {
    it(`${mode}: ${SPEC[mode].brass}% at level 0, and with levels`, () => {
      for (const ow of [0, 1, 4, 10]) expect(brassOf(mode, ow).gave, `${mode} ow${ow}`).toBe(brassWant(mode, ow));
    });
  }

  it('worked numbers on 37 Brass: Journeyman 37, Apprentice 28 (27.75), Master at level 4 is 65 (not 64: one multiplication), Clockwork at level 10 is 111', () => {
    expect(brassOf('journeyman', 0).gave).toBe(37);
    expect(brassOf('apprentice', 0).gave).toBe(28);
    expect(brassOf('master', 4).gave).toBe(65);
    expect(brassOf('clockwork', 10).gave).toBe(111);
  });

  it('a won run pays its victory Brass scaled too, and the profile total follows', () => {
    const profile = newProfile('t', T);
    const run = mkRun('master', 2);
    run.phase = 'victory';
    run.stats.floorBrass = 100;
    expect(brassFor(run)).toBe(150);
    const out = finishRun(profile, run, T);
    expect(out.brass).toBe(brassWant('master', 2, 150));
    expect(profile.brassEarnedTotal).toBe(out.brass);
  });

  it('the RunRecord carries the mode and the level, in the history and as returned', () => {
    const { profile } = brassOf('master', 4);
    expect([profile.history[0].mode, profile.history[0].overwind]).toEqual(['master', 4]);
    const p2 = newProfile('t', T);
    const r2 = mkRun('clockwork', 9);
    r2.phase = 'defeat';
    const rec = finishRun(p2, r2, T).record;
    expect([rec.mode, rec.overwind, p2.history[0].mode, p2.history[0].overwind]).toEqual(['clockwork', 9, 'clockwork', 9]);
  });

  it('finishing the same run twice pays once', () => {
    const profile = newProfile('t', T);
    const run = mkRun('master', 3);
    run.phase = 'defeat';
    run.stats.floorBrass = 37;
    const first = finishRun(profile, run, T).brass;
    const total = profile.brass;
    expect(finishRun(profile, run, T).brass).toBe(0);
    expect(profile.brass).toBe(total);
    expect(first).toBe(brassWant('master', 3));
  });
});

// ---------- the unlocks: modes and Overwind (AD4, AD5) ----------

function ended(profile: Profile, mode: string, ow: number, result: 'victory' | 'defeat', o: { plating?: number } = {}): ReturnType<typeof finishRun> {
  const run = mkRun(mode, ow);
  run.phase = result;
  if (o.plating !== undefined) run.stats.plan = { plating: o.plating, burst: 0, pressure: 0, statuses: 0 };
  return finishRun(profile, run, T);
}

describe('AD4: mode unlocks (Master after a Journeyman win, Clockwork after a Master win)', () => {
  it('a new profile has Master and Clockwork locked', () => {
    const p = newProfile('t', T);
    expect(p.modesUnlocked).not.toContain('master');
    expect(p.modesUnlocked).not.toContain('clockwork');
  });

  it('a Journeyman win opens Master and only Master', () => {
    const p = newProfile('t', T);
    ended(p, 'journeyman', 0, 'victory');
    expect(p.modesUnlocked).toContain('master');
    expect(p.modesUnlocked).not.toContain('clockwork');
    expect(p.modesUnlocked).toEqual(expect.arrayContaining(['apprentice', 'journeyman']));
  });

  it('a Master win opens Clockwork', () => {
    const p = newProfile('t', T);
    ended(p, 'journeyman', 0, 'victory');
    ended(p, 'master', 0, 'victory');
    expect(p.modesUnlocked).toEqual(expect.arrayContaining(['apprentice', 'journeyman', 'master', 'clockwork']));
  });

  it('an Apprentice win opens nothing, and neither does a loss on Journeyman', () => {
    const p = newProfile('t', T);
    ended(p, 'apprentice', 0, 'victory');
    ended(p, 'journeyman', 0, 'defeat');
    expect(p.modesUnlocked.slice().sort()).toEqual(['apprentice', 'journeyman']);
  });

  it('a Journeyman win never opens Clockwork; a win on Clockwork adds nothing twice', () => {
    const p = newProfile('t', T);
    ended(p, 'journeyman', 0, 'victory');
    expect(p.modesUnlocked).not.toContain('clockwork');
    ended(p, 'master', 0, 'victory');
    ended(p, 'clockwork', 0, 'victory');
    expect(p.modesUnlocked.slice().sort()).toEqual(['apprentice', 'clockwork', 'journeyman', 'master']);
  });
});

describe('AD5: Overwind is locked until a win on Journeyman or harder; level N applies twists 1 to N', () => {
  it('no win yet: Overwind is locked (rewards.overwind 0); a loss does not open it', () => {
    const p = newProfile('t', T);
    expect(p.rewards.overwind).toBe(0);
    ended(p, 'journeyman', 0, 'defeat');
    expect(p.rewards.overwind).toBe(0);
  });

  it('an Apprentice win: still locked (the feat e-first-win itself counts any mode)', () => {
    const p = newProfile('t', T);
    ended(p, 'apprentice', 0, 'victory');
    expect(p.rewards.overwind).toBe(0);
    expect(p.achievements['e-first-win']).toBeTruthy();
  });

  it('a Journeyman win: Overwind 1 to 3 open, no more', () => {
    const p = newProfile('t', T);
    ended(p, 'journeyman', 0, 'victory');
    expect(p.rewards.overwind).toBe(3);
  });

  it('the stages: Master opens 4 and 5, Clockwork 6 and 7, a win at Overwind 5 opens 8 and 9, at Overwind 8 opens 10', () => {
    const p = newProfile('t', T);
    ended(p, 'journeyman', 0, 'victory');
    expect(p.rewards.overwind).toBe(3);
    ended(p, 'master', 3, 'victory', { plating: 500 });
    expect(p.rewards.overwind).toBe(5);
    ended(p, 'clockwork', 5, 'victory', { plating: 500 });
    expect(p.rewards.overwind).toBeGreaterThanOrEqual(7);
    const q = newProfile('t', T);
    for (const [id, level] of [['h-master', 5], ['h-clockwork', 7], ['h-ow5', 9], ['h-ow8', 10]] as [string, number][]) {
      expect(earnAchievement(q, id, T), id).toBe(true);
      expect(q.rewards.overwind, id).toBe(level);
    }
  });

  it('an Apprentice win and a Journeyman loss still leave it locked; a Master win on a fresh profile opens 1 to 5 together', () => {
    const p = newProfile('t', T);
    ended(p, 'apprentice', 0, 'victory');
    ended(p, 'journeyman', 0, 'defeat');
    expect(p.rewards.overwind).toBe(0);
    const q = newProfile('t', T);
    ended(q, 'master', 0, 'victory', { plating: 500 });
    expect(q.rewards.overwind).toBe(5);
  });
});

// ---------- the twists, one probe each, then the AD5 matrix ----------

function salvageItems(n: number): SalvageItem[] {
  return ['spur', 'idler', 'coil', 'cam'].slice(0, n).map((salvage, i) => ({ enemy: 0, partId: `p${i}`, salvage, rarity: 'common', locked: false }));
}
const roamer = (run: RunState): void => {
  run.elites = [{ defId: 'tinpot-general', patrol: Array.from({ length: 40 }, (_, i) => `far${i}`), at: 0, defeated: false }];
};

/** Does twist `k` act at Overwind level `ow`? One cheap observation per twist, taken on Journeyman (every other number is the base's). */
const PROBES: ((ow: number) => boolean)[] = [
  // 1 Loose Bolts: traders charge more
  (ow) => barterPrice(mkRun('journeyman', ow), { kind: 'oil', value: 15, sold: false }, null) > 15,
  // 2 Short Days: fewer hours
  (ow) => (mkRun('journeyman', ow).hours as number) < 12,
  // 3 Thick Plates: enemy parts have more HP
  (ow) => partsOf(mk({ enemies: [HP_ENEMY], overwind: ow })).p30.hp > 30,
  // 4 Cold Joints: the first placed part is Rusted
  (ow) => {
    const c = mk({ enemies: [HP_ENEMY], overwind: ow, hand: ['test-strike-9'] });
    placePart(c, 0, cell('B2'));
    return (c.board[cell('B2')]?.rusted ?? 0) > 0;
  },
  // 5 Restless Elites: three hours spent, the elite has stepped four times
  (ow) => {
    const run = mkRun('journeyman', ow);
    roamer(run);
    for (let i = 0; i < 3; i++) spendHour(run);
    return run.elites?.[0].at === 4;
  },
  // 6 Thin Oil
  (ow) => restHeal('journeyman', ow) < 18,
  // 7 Salvage Rot: two kept parts are refused
  (ow) => {
    const run = mkRun('journeyman', ow);
    run.phase = 'reward';
    run.pending = { kind: 'salvage', items: salvageItems(2), cogs: 0, trinkets: [], trinketTaken: false, done: false };
    return !takeSalvage(run, [0, 1]);
  },
  // 8 Wound Springs
  (ow) => taken('attack 10', { overwind: ow }) > 10,
  // 9 The Warden Stirs: the Foreman starts with the remembered part
  (ow) => mk({ enemies: ['foreman'], kind: 'boss', overwind: ow, memory: 'plating' }).enemies[0].parts.some((p) => p.id.startsWith('mem-')),
  // 10 The Thirteenth Hour: Midnight's core at 0 starts another phase instead of a win
  (ow) => {
    const c = midnight(ow);
    strikeCore(c);
    return c.outcome === 'ongoing';
  },
];

describe('AD5: level N applies twists 1 to N, and none above (every level, every twist)', () => {
  for (let ow = 0; ow <= 10; ow++) {
    it(`Overwind ${ow}: twists ${ow === 0 ? 'none' : `1 to ${ow}`} act`, () => {
      PROBES.forEach((probe, i) => expect(probe(ow), `twist ${i + 1} (${OVERWIND_TWISTS[i].name}) at level ${ow}`).toBe(i + 1 <= ow));
    });
  }
});

describe('Overwind 1, Loose Bolts: traders charge 15% more (rounded half up)', () => {
  it('Scrap prices: 25 -> 29, 75 -> 86, an oil flask 15 -> 17, a trinket 113 -> 130; level 0 unchanged', () => {
    const at = (ow: number, v: number, kind: 'part' | 'oil' | 'trinket' = 'part'): number => barterPrice(mkRun('journeyman', ow), { kind, id: kind === 'oil' ? undefined : 'spur', value: v, sold: false }, null);
    // Scrap alone costs value + 25% first (20 -> 25, 60 -> 75, 90 -> 113), then +15%
    expect([at(1, 20), at(1, 60), at(1, 90, 'trinket')]).toEqual([29, 86, 130]);
    expect(at(1, 15, 'oil')).toBe(17);
    expect([at(0, 20), at(0, 60), at(0, 90, 'trinket'), at(0, 15, 'oil')]).toEqual([25, 75, 113, 15]);
  });

  it('trading a part in: the difference is raised the same way (value 35 against a part worth 20: 15 -> 17)', () => {
    const run = mkRun('journeyman', 1);
    expect(barterPrice(run, { kind: 'part', id: 'spur', value: 35, sold: false }, 20)).toBe(17);
  });

  it('half up: a price of 10 becomes 12 (11.5), of 30 becomes 35 (34.5), of 0 stays 0; level 0 is the identity', () => {
    const run = mkRun('journeyman', 1);
    expect([traderPrice(run, 10), traderPrice(run, 30), traderPrice(run, 0)]).toEqual([12, 35, 0]);
    expect(traderPrice(mkRun('journeyman', 0), 10)).toBe(10);
  });

  it('oil bought at a trader at level 6 costs the raised price and heals the halved amount', () => {
    const run = mkRun('journeyman', 6);
    run.maxHp = 60;
    run.hp = 1;
    run.scrap = 100;
    run.phase = 'trader';
    run.pending = { kind: 'trader', stock: [{ kind: 'oil', value: 15, sold: false }] };
    expect(barter(run, 0, null)).toBe(true);
    expect(run.scrap).toBe(100 - 17);
    expect(run.hp - 1).toBe(8);
  });
});

describe('Overwind 4, Cold Joints: the first part placed each combat is Rusted until your next turn (an ordinary Rust)', () => {
  const enemy: TestEnemy = { core: 500, parts: [] };

  it('the first placement is Rusted (rusted 1), the second is clean', () => {
    const c = mk({ enemies: [enemy], overwind: 4, hand: ['test-strike-9', 'test-strike-9'] });
    expect(placePart(c, 0, cell('B2'))).toBe(true);
    expect(c.board[cell('B2')]?.rusted).toBe(1);
    expect(placePart(c, 0, cell('A1'))).toBe(true);
    expect(c.board[cell('A1')]?.rusted).toBe(0);
  });

  it('it holds the part for the Run it was placed for: with Overwind 3 a Strike 9 on B2 deals 27, with Overwind 4 it deals 0 that turn and 27 the next', () => {
    const run = (ow: number): number[] => {
      const c = mk({ enemies: [enemy], overwind: ow, hand: ['test-strike-9'] });
      placePart(c, 0, cell('B2'));
      runTurn(c);
      const after1 = 500 - c.enemies[0].hp;
      runTurn(c);
      return [after1, 500 - c.enemies[0].hp - after1];
    };
    expect(run(3)).toEqual([27, 27]);
    expect(run(4)).toEqual([0, 27]);
    expect(run(10)).toEqual([0, 27]);
  });

  it('each combat has its own first placement; Grease Pot keeps a part next to the Mainspring clean as it does against any Rust', () => {
    const a = mk({ enemies: [enemy], overwind: 4, hand: ['test-strike-9'] });
    placePart(a, 0, cell('B2'));
    const b = mk({ enemies: [enemy], overwind: 4, hand: ['test-strike-9'] });
    placePart(b, 0, cell('B2'));
    expect([a.board[cell('B2')]?.rusted, b.board[cell('B2')]?.rusted]).toEqual([1, 1]);
    const g = mk({ enemies: [enemy], overwind: 4, hand: ['test-strike-9'], trinkets: ['grease-pot'] });
    placePart(g, 0, cell('B2'));
    expect(g.board[cell('B2')]?.rusted).toBe(0);
  });

  it('Journeyman at Overwind 0 places clean parts', () => {
    const c = mk({ enemies: [enemy], hand: ['test-strike-9'] });
    placePart(c, 0, cell('B2'));
    expect(c.board[cell('B2')]?.rusted).toBe(0);
  });
});

describe('Overwind 5, Restless Elites: on every third hour spent the roaming elites step twice', () => {
  const stepsAfter = (ow: number, hours: number): number[] => {
    const run = mkRun('journeyman', ow);
    roamer(run);
    const seen: number[] = [];
    for (let i = 0; i < hours; i++) {
      spendHour(run);
      seen.push(run.elites?.[0].at ?? -1);
    }
    return seen;
  };
  it('hours 3, 6 and 9 move an elite two rooms; the others one', () => {
    expect(stepsAfter(5, 9)).toEqual([1, 2, 4, 5, 6, 8, 9, 10, 12]);
    expect(stepsAfter(10, 6)).toEqual([1, 2, 4, 5, 6, 8]);
  });
  it('below level 5 an elite steps once per hour', () => {
    expect(stepsAfter(4, 9)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(stepsAfter(0, 3)).toEqual([1, 2, 3]);
  });
  it('resting at an oil station is an hour spent too: the third hour moves the elite twice', () => {
    const run = mkRun('journeyman', 5);
    roamer(run);
    run.hour = 2;
    run.phase = 'oil';
    run.pending = { kind: 'oil', done: false };
    expect(rest(run)).toBe(true);
    expect(run.hour).toBe(3);
    expect(run.elites?.[0].at).toBe(2);
  });
});

describe('Overwind 7, Salvage Rot: keep one salvaged part per combat, the rest scrap for 2 (the Scrapper and the Tow Hook do not count)', () => {
  const tray = (ow: number, items: SalvageItem[], wrecked = 0): RunState => {
    const run = mkRun('journeyman', ow);
    run.scrap = 10;
    run.phase = 'reward';
    run.pending = { kind: 'salvage', items, wrecked, cogs: 0, trinkets: [], trinketTaken: false, done: false };
    return run;
  };

  it('keeping one of three pays 2 Scrap for each of the others and adds the kept part to the bin', () => {
    const run = tray(7, salvageItems(3));
    const bin = run.bin.length;
    expect(takeSalvage(run, [1])).toBe(true);
    expect(run.bin.length).toBe(bin + 1);
    expect(run.scrap).toBe(10 + 2 + 2);
  });

  it('keeping none scraps all three at 2 each', () => {
    const run = tray(7, salvageItems(3));
    expect(takeSalvage(run, [])).toBe(true);
    expect(run.scrap).toBe(10 + 6);
  });

  it('keeping two is refused and nothing changes; the tray still works afterwards', () => {
    const run = tray(7, salvageItems(3));
    const bin = run.bin.length;
    expect(takeSalvage(run, [0, 1])).toBe(false);
    expect(run.bin.length).toBe(bin);
    expect(run.scrap).toBe(10);
    expect((run.pending as { done: boolean }).done).toBe(false);
    expect(takeSalvage(run, [0])).toBe(true);
  });

  it('a part whose salvage is still locked pays 6 as before, and wrecked parts 1 each', () => {
    const items = salvageItems(2);
    items[1].locked = true;
    const run = tray(7, items, 2);
    expect(takeSalvage(run, [0])).toBe(true);
    expect(run.scrap).toBe(10 + 2 + 6);
  });

  it("the Scrapper's wrecked-part offer and the Tow Hook's extra offers (marked scrapper: true) are not limited", () => {
    const items = salvageItems(2);
    items.push({ enemy: 0, partId: 'x', salvage: 'cam', rarity: 'common', locked: false, scrapper: true });
    const both = tray(7, items);
    const bin = both.bin.length;
    expect(takeSalvage(both, [0, 2])).toBe(true);
    expect(both.bin.length).toBe(bin + 2);
    expect(takeSalvage(tray(7, items), [0, 1])).toBe(false);
    expect(takeSalvage(tray(7, items), [0, 1, 2])).toBe(false);
  });

  it('below level 7 nothing changes: two kept, 3 Scrap for the rest', () => {
    for (const ow of [0, 6]) {
      const run = tray(ow, salvageItems(3));
      expect(takeSalvage(run, [0, 1]), `level ${ow}`).toBe(true);
      expect(run.scrap).toBe(10 + 3);
    }
  });
});

describe('Overwind 9, The Warden Stirs: the Foreman and the Queen start with the part of your plan, as the Clockmaker does', () => {
  const MEM: Record<Plan, string> = { plating: 'mem-drill', burst: 'mem-governor', pressure: 'mem-valve', statuses: 'mem-chime' };
  const memParts = (id: string, ow: number, memory: Plan | null): string[] =>
    mk({ enemies: [id], kind: 'boss', overwind: ow, memory })
      .enemies[0].parts.filter((p) => p.id.startsWith('mem-'))
      .map((p) => p.id);

  for (const id of ['foreman', 'boilermaker']) {
    it(`the ${id} gains the memory part of each plan at level 9, and none at level 8`, () => {
      for (const [plan, part] of Object.entries(MEM) as [Plan, string][]) {
        expect(memParts(id, 9, plan), `${id} ${plan}`).toEqual([part]);
        expect(memParts(id, 10, plan), `${id} ${plan} at 10`).toEqual([part]);
        expect(memParts(id, 8, plan), `${id} ${plan} at 8`).toEqual([]);
      }
    });

    it(`the ${id} gains none with no plan history`, () => {
      expect(memParts(id, 9, null)).toEqual([]);
    });

    it(`the ${id}'s extra part stands and acts, is not a keystone, and has a def the engine can read`, () => {
      const c = mk({ enemies: [id], kind: 'boss', overwind: 9, memory: 'plating' });
      const e = c.enemies[0];
      const p = partState(e, 'mem-drill');
      expect(p?.broken).toBe(false);
      expect(p?.hp).toBeGreaterThan(0);
      const d = partDefOf(e, 'mem-drill');
      expect(d, 'partDefOf resolves it').toBeTruthy();
      expect(d?.keystone).toBeFalsy();
      expect(e.intents.some((i) => i.partId === 'mem-drill')).toBe(true);
    });
  }

  it('the Clockmaker is unchanged: exactly one memory part, at every level', () => {
    for (const ow of [0, 9, 10]) expect(memParts('clockmaker', ow, 'burst'), `level ${ow}`).toEqual(['mem-governor']);
    expect(memParts('clockmaker', 9, null)).toEqual([]);
  });

  it('through a real run: the remembered plan of three runs reaches the Foreman at Overwind 9 and not at 8', () => {
    const fight = (ow: number, history: Plan[]): string[] => {
      const p = newProfile('t', T);
      p.planHistory = history;
      p.lastOverwind = ow;
      const run = newRun({ ...runConfigFor(p, seedN++, 'tinker'), legacyMap: false });
      return startCombat(run, ['foreman'], 'boss').enemies[0].parts.filter((q) => q.id.startsWith('mem-')).map((q) => q.id);
    };
    expect(fight(9, ['plating', 'plating', 'burst'])).toEqual(['mem-drill']);
    expect(fight(8, ['plating', 'plating', 'burst'])).toEqual([]);
    expect(fight(9, [])).toEqual([]);
  });
});

// ---------- the six hard achievements ----------

describe('B10b makes every achievement available (33 of 33); the six hard ones are earned in play', () => {
  it('all 33 are available, the six hard ones included', () => {
    expect(ACHIEVEMENTS.length).toBe(33);
    for (const id of ['h-master', 'h-clockwork', 'h-ow5', 'h-ow8', 'h-ow10', 'h-master-bare']) expect(ACHIEVEMENTS.find((a) => a.id === id)?.available, id).toBe(true);
    expect(ACHIEVEMENTS.filter((a) => !a.available).map((a) => a.id)).toEqual([]);
  });

  const win = (mode: string, ow: number, o: { plating?: number } = {}): { got: string[]; p: Profile } => {
    const p = newProfile('t', T);
    return { got: ended(p, mode, ow, 'victory', { plating: o.plating ?? 500 }).newAchievements, p };
  };
  const unlocked = (p: Profile): { parts: string[]; trinkets: string[] } => {
    const c = runConfigFor(p, 1, 'tinker');
    return { parts: c.unlockedParts, trinkets: c.unlockedTrinkets ?? [] };
  };

  it("h-master: a win on Master earns it, unlocks Apprentice's Hands and opens Overwind 4 and 5; a Journeyman or Apprentice win does not", () => {
    const { got, p } = win('master', 0);
    expect(got).toContain('h-master');
    expect(got).not.toContain('h-clockwork');
    expect(unlocked(p).parts).toContain('apprentices-hands');
    expect(p.rewards.overwind).toBeGreaterThanOrEqual(5);
    expect(win('journeyman', 0).got).not.toContain('h-master');
    expect(win('apprentice', 0).got).not.toContain('h-master');
  });

  it('h-clockwork: a win on Clockwork earns it, unlocks Bottled Dusk and opens Overwind 6 and 7; a Master win does not', () => {
    const { got, p } = win('clockwork', 0);
    expect(got).toContain('h-clockwork');
    expect(unlocked(p).parts).toContain('bottled-dusk');
    expect(p.rewards.overwind).toBeGreaterThanOrEqual(7);
    expect(win('master', 0).got).not.toContain('h-clockwork');
  });

  it('h-ow5: a win at Overwind 5 earns it, unlocks the Perpetual Engine and opens 8 and 9; a win at 4 does not', () => {
    const { got, p } = win('journeyman', 5);
    expect(got).toContain('h-ow5');
    expect(unlocked(p).parts).toContain('perpetual-engine');
    expect(p.rewards.overwind).toBeGreaterThanOrEqual(9);
    expect(win('journeyman', 4).got).not.toContain('h-ow5');
  });

  it('h-ow8: a win at Overwind 8 earns it and opens Overwind 10; a win at 7 does not', () => {
    const { got, p } = win('journeyman', 8);
    expect(got).toContain('h-ow8');
    expect(p.rewards.overwind).toBe(10);
    expect(win('journeyman', 7).got).not.toContain('h-ow8');
  });

  it('h-ow10 (hidden): a win at Overwind 10 earns it and unlocks the Sun-Orb Core; a win at 9 does not', () => {
    const { got, p } = win('journeyman', 10);
    expect(got).toContain('h-ow10');
    expect(unlocked(p).parts).toContain('sun-orb-core');
    expect(win('journeyman', 9).got).not.toContain('h-ow10');
    expect(ACHIEVEMENTS.find((a) => a.id === 'h-ow10')?.hidden).toBe(true);
  });

  it("h-master-bare: a Master win with under 150 Plating in total earns it and unlocks the Inventor's Watch; 150 does not; Journeyman does not", () => {
    const low = win('master', 0, { plating: 149 });
    expect(low.got).toContain('h-master-bare');
    expect(unlocked(low.p).trinkets).toContain('inventors-watch');
    expect(win('master', 0, { plating: 150 }).got).not.toContain('h-master-bare');
    expect(win('journeyman', 0, { plating: 0 }).got).not.toContain('h-master-bare');
  });

  it('none of the six is earned by a loss', () => {
    const p = newProfile('t', T);
    const out = ended(p, 'clockwork', 10, 'defeat', { plating: 0 });
    expect(out.newAchievements.filter((id) => id.startsWith('h-') && id !== 'h-flawless')).toEqual([]);
  });
});

// ---------- the Thirteenth Hour ----------

/** Put the Clockmaker into Midnight (phase 3 of 3, index 2) as if the earlier keystones had broken: unfolded parts, no pending action. */
function enterMidnight(c: CombatState): void {
  const ph = enemyDef('clockmaker').frame!.phases!;
  const e = c.enemies[0];
  e.parts = [];
  for (let i = 0; i <= 2; i++) {
    for (const d of ph[i].parts) {
      const s = initPart(d);
      if (i < 2 && d.keystone) {
        s.broken = true;
        s.hp = 0;
      }
      e.parts.push(s);
    }
  }
  e.phase = 2;
  e.sealed = !ph[2].coreExposed;
  e.phaseActionPending = false;
  e.turnsActed = 0;
  e.coreTookThisTurn = 0;
  refreshIntents(c, 0);
}

/** A Clockmaker fight standing in Midnight with 1 HP left on his core, at Overwind `ow` (Journeyman, 900 HP so nothing kills the player). */
function midnight(ow: number): CombatState {
  const c = mk({ enemies: ['clockmaker'], kind: 'boss', overwind: ow, hp: 900 });
  enterMidnight(c);
  c.enemies[0].hp = 1;
  return c;
}
/** One Run: a Strike 31 on the core. */
function strikeCore(c: CombatState): ReturnType<typeof runTurn> {
  put(c, 'B2', 'test-strike-31');
  c.ticksThisTurn = 1;
  c.jammed = 0;
  setOrder(c, ['e0.core' as TargetRef]);
  return runTurn(c);
}
/** One Run: a Strike 31 per part on these parts in order (each left at 1 HP first). */
function strikeParts(c: CombatState, ids: string[]): ReturnType<typeof runTurn> {
  for (const id of ids) {
    const p = partState(c.enemies[0], id);
    expect(p, `part ${id} stands`).toBeTruthy();
    (p as { hp: number }).hp = 1;
  }
  put(c, 'B2', 'test-strike-31');
  c.ticksThisTurn = ids.length;
  c.jammed = 0;
  setOrder(c, ids.map((id) => `e0.${id}` as TargetRef));
  return runTurn(c);
}
const idsOf = (c: CombatState): string[] => c.enemies[0].parts.map((p) => p.id);
const CHIME = THIRTEENTH_HOUR.keystones[0];
const DIAL = THIRTEENTH_HOUR.keystones[1];

describe('Overwind 10, the Thirteenth Hour: Midnight does not end the fight', () => {
  it("without Overwind 10 Midnight's core at 0 is the win it is today (control)", () => {
    const c = midnight(9);
    const r = strikeCore(c);
    expect(c.outcome).toBe('won');
    expect(kinds(r.events, 'enemyDied').length).toBe(1);
  });

  it("with Overwind 10 Midnight's core at 0 starts phase 4: the fight goes on, no death, no win, the beat plays", () => {
    const c = midnight(10);
    const r = strikeCore(c);
    expect(c.outcome).toBe('ongoing');
    expect(kinds(r.events, 'enemyDied')).toEqual([]);
    expect(kinds(r.events, 'combatEnd')).toEqual([]);
    const phase = kinds(r.events, 'phase');
    expect(phase.length).toBe(1);
    expect(phase[0].amount).toBe(3);
    expect(phase[0].note).toBe('There is one more hour. I kept it for you.');
    expect(phase[0].note).toBe(THIRTEENTH_HOUR.beat);
    expect(c.enemies[0].phase).toBe(3);
    expect(c.enemies[0].hp, 'he counts as alive for the win check').toBeGreaterThan(0);
  });

  it('the core re-seals behind the Thirteenth Chime and the Hourless Dial: HP 30 each, Braced to 15 a turn', () => {
    const c = midnight(10);
    strikeCore(c);
    const e = c.enemies[0];
    expect(e.sealed).toBe(true);
    for (const id of [CHIME, DIAL]) expect(partState(e, id), id).toMatchObject({ hp: 30, maxHp: 30, broken: false });
    expect(THIRTEENTH_KEYSTONE_BRACED).toBe(15);
    expect(partDefOf(e, CHIME)?.keystone).toBe(true);
    expect(partDefOf(e, DIAL)?.keystone).toBe(true);
    expect(partDefOf(e, CHIME)?.actions[0]).toMatchObject({ kind: 'pierce' });
    expect(partDefOf(e, DIAL)?.actions[0]).toMatchObject({ kind: 'rewind', amount: 3 });
  });

  it('a hit on the core goes nowhere while the keystones stand, and a keystone takes at most 15 a turn', () => {
    const c = midnight(10);
    strikeCore(c);
    const e = c.enemies[0];
    const hp = e.hp;
    put(c, 'B2', 'test-strike-99');
    c.ticksThisTurn = 3;
    c.jammed = 0;
    setOrder(c, ['e0.core' as TargetRef]); // a sealed core is not a target: the Run's hits find no core to hurt
    runTurn(c);
    expect(e.hp).toBe(hp);
    const d = midnight(10);
    strikeCore(d);
    put(d, 'B2', 'test-strike-99');
    d.ticksThisTurn = 3;
    d.jammed = 0;
    setOrder(d, [`e0.${CHIME}` as TargetRef]);
    runTurn(d);
    expect(partState(d.enemies[0], CHIME)?.hp).toBe(15);
  });

  it('the Hour Wheel and the Midnight Bell stay if standing (a broken Bell stays broken); the Governor Frame retracts', () => {
    const c = midnight(10);
    strikeCore(c);
    expect(idsOf(c)).toEqual(expect.arrayContaining(['clock-wheel', 'clock-bell', CHIME, DIAL]));
    expect(idsOf(c)).not.toContain('clock-gov');
    expect(partState(c.enemies[0], 'clock-wheel')?.broken).toBe(false);
    expect(partState(c.enemies[0], 'clock-bell')?.broken).toBe(false);
    const d = midnight(10);
    partState(d.enemies[0], 'clock-bell')!.broken = true;
    partState(d.enemies[0], 'clock-bell')!.hp = 0;
    strikeCore(d);
    expect(partState(d.enemies[0], 'clock-bell')?.broken ?? true).toBe(true);
  });

  it('below Overwind 10 nothing of this exists: the Governor Frame stands in Midnight and no Thirteenth part is added', () => {
    const c = midnight(9);
    expect(idsOf(c)).toContain('clock-gov');
    expect(idsOf(c)).not.toContain(CHIME);
  });

  /** HP lost over one Clockmaker turn with `plating` Plating up, in Midnight (phase 3) or in phase 4 (after the change, its phase-action turn and one more). */
  const lostWith = (where: 'midnight' | 'phase4', plating: number): number => {
    const c = midnight(10);
    if (where === 'phase4') {
      strikeCore(c);
      c.board[cell('B2')] = null;
      runTurn(c);
    }
    const before = c.playerHp;
    c.board[cell('B2')] = null;
    c.plating = plating;
    runTurn(c);
    return before - c.playerHp;
  };

  it('Plating is lost at the start of each of his turns in phase 4 only: 100 Plating changes nothing there, and helps in Midnight', () => {
    const none = lostWith('phase4', 0);
    expect(none).toBeGreaterThan(0);
    expect(lostWith('phase4', 100), 'Plating does not help in phase 4').toBe(none);
    expect(lostWith('midnight', 100), 'Plating still works in Midnight').toBeLessThan(lostWith('midnight', 0));
  });

  it('Plating is lost before his attacks: with 1000 Plating up none of his hits is absorbed in phase 4', () => {
    const c = midnight(10);
    strikeCore(c);
    c.board[cell('B2')] = null;
    runTurn(c);
    c.board[cell('B2')] = null;
    c.plating = 1000;
    const hits = kinds(runTurn(c).events, 'playerHit');
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) expect(h.note ?? '', 'no hit was absorbed by Plating').not.toMatch(/absorbed/);
  });

  it('both keystones break: the core reopens at 40 HP, Braced to 13 a turn (not 14, and no Governor cap of 10)', () => {
    const c = midnight(10);
    strikeCore(c);
    c.board[cell('B2')] = null;
    runTurn(c);
    const r = strikeParts(c, [CHIME, DIAL]);
    const e = c.enemies[0];
    expect(c.outcome).toBe('ongoing');
    expect(kinds(r.events, 'enemyDied')).toEqual([]);
    expect([partState(e, CHIME)?.broken, partState(e, DIAL)?.broken]).toEqual([true, true]);
    expect(e.sealed).toBe(false);
    expect([e.hp, e.maxHp]).toEqual([THIRTEENTH_CORE.hp, THIRTEENTH_CORE.hp]);
    // the Hour Wheel's Rewind would heal the core in his turn: take it out so the HP shows what the Run did
    const wheel = partState(e, 'clock-wheel');
    if (wheel) {
      wheel.broken = true;
      wheel.hp = 0;
    }
    put(c, 'B2', 'test-strike-31');
    c.ticksThisTurn = 3;
    c.jammed = 0;
    setOrder(c, ['e0.core' as TargetRef]);
    runTurn(c);
    expect(e.hp).toBe(40 - THIRTEENTH_CORE.bracedTo);
    expect(c.outcome).toBe('ongoing');
  });

  /** Play a whole Clockmaker fight with a Strike 999 each turn; `whole` breaks every standing part before the core, otherwise keystones only. */
  function playOut(c: CombatState, whole: boolean): { turnsIn: Record<number, number>; seen: number[] } {
    const turnsIn: Record<number, number> = {};
    const seen: number[] = [];
    for (let turns = 0; c.outcome === 'ongoing' && turns < 150; turns++) {
      const e = c.enemies[0];
      turnsIn[e.phase] = (turnsIn[e.phase] ?? 0) + 1;
      if (seen[seen.length - 1] !== e.phase) seen.push(e.phase);
      const standing = e.parts.filter((p) => !p.broken).map((p) => p.id);
      const keys = standing.filter((id) => partDefOf(e, id)?.keystone);
      const rest = standing.filter((id) => !partDefOf(e, id)?.keystone);
      put(c, 'B2', 'test-strike-999');
      c.ticksThisTurn = 3;
      c.jammed = 0;
      setOrder(c, [...(whole ? rest : []), ...keys, 'core'].map((id) => `e0.${id}` as TargetRef));
      runTurn(c);
    }
    return { turnsIn, seen };
  }

  it('a real four-phase fight with a Strike 999 every turn: all four phases happen, each lasts at least 2 turns and the last at least 3, and he is beaten', () => {
    const c = mk({ enemies: ['clockmaker'], kind: 'boss', overwind: 10, hp: 9000 });
    const { turnsIn, seen } = playOut(c, false);
    expect(c.outcome).toBe('won');
    expect(seen).toEqual([0, 1, 2, 3]);
    for (const phase of [0, 1, 2, 3]) expect(turnsIn[phase], `phase ${phase + 1}`).toBeGreaterThanOrEqual(2);
    expect(turnsIn[3], 'the last phase').toBeGreaterThanOrEqual(3);
    expect(turnsIn[2], 'Midnight, Braced to 26 on 78').toBeGreaterThanOrEqual(3);
  });

  it('the same fight at Overwind 9 has three phases (Midnight is the last) and is won at Midnight', () => {
    const c = mk({ enemies: ['clockmaker'], kind: 'boss', overwind: 9, hp: 9000 });
    const { seen, turnsIn } = playOut(c, false);
    expect(c.outcome).toBe('won');
    expect(seen).toEqual([0, 1, 2]);
    expect(turnsIn[2]).toBeGreaterThanOrEqual(3);
  });

  it('the new parts pay Brass 4 each and count for h-whole-clock: break every part, win, and the run records it', () => {
    const c = mk({ enemies: ['clockmaker'], kind: 'boss', overwind: 10, hp: 9000 });
    playOut(c, true);
    expect(c.outcome).toBe('won');
    const e = c.enemies[0];
    expect([partState(e, CHIME)?.broken, partState(e, DIAL)?.broken]).toEqual([true, true]);
    const run = newRun(defaultRunConfig(88));
    run.combat = c;
    run.phase = 'combat';
    expect(settleCombat(run)).toBe(true);
    const broken = e.parts.filter((p) => p.broken).length;
    expect(run.stats.clockBrass).toBe(4 * broken);
    expect(run.stats.clockBrass).toBeGreaterThanOrEqual(8);
    expect(run.stats.wardenFights?.[run.stats.wardenFights.length - 1]).toMatchObject({ enemy: 'clockmaker', won: true, allBroken: true });
  });

  it('leaving a part standing is not "every last gear": with keystones only, allBroken is false', () => {
    const c = mk({ enemies: ['clockmaker'], kind: 'boss', overwind: 10, hp: 9000 });
    playOut(c, false);
    expect(c.outcome).toBe('won');
    const run = newRun(defaultRunConfig(89));
    run.combat = c;
    run.phase = 'combat';
    settleCombat(run);
    expect(run.stats.wardenFights?.[run.stats.wardenFights.length - 1].allBroken).toBe(false);
  });
});
