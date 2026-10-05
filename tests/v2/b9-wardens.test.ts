// B9a acceptance: the three wardens as frame machines with visible phases, Rewind, the Clockmaker's memory, plan stats
// (docs/acceptance.md WP2 to WP6 (U), BF4, section 11; docs/briefs/B9a-wardens.md "Semantics"; docs/content.md 3.2, 3.4, 3.6;
// docs/rules.md 4.7 to 4.9 and 5.4). Written by the orchestrator's test-porter in the B9a.0 contract step.
// Lanes may adapt a test to the code but never weaken an assertion. The tests are the spec.
//
// HOOKS the wardens-core lane implements (the tests read them; nothing else is assumed):
//   - content/enemies.ts: `foreman`, `boilermaker`, `clockmaker` get `frame` with `frame.phases` (WardenPhaseDef[]), `braced: true`.
//     Part ids are content.md's (foreman-wrench, queen-gauge, clock-tick, ...). The Clockmaker's frame also gets
//     `memoryParts: Record<Plan, EnemyPartDef>` (ids mem-drill, mem-governor, mem-valve, mem-chime), added to the frame at
//     combat start, non-keystone, present from phase 1, never retracted.
//   - A conditional beat: `beat: { ifBroken: <part id>, text: <line when broken>, otherwise: <line when standing> }`; the `phase`
//     event's `note` carries the resolved line.
//   - `CreateCombatOpts.memory?: Plan | null` (combat.ts); `RunConfig.memory?: Plan | null` set by `runConfigFor` from
//     `memoryPlan(profile.planHistory)`; `startCombat` passes `run.config.memory` through.
//   - record.ts: `recordFight`, `mainPlan`, `memoryPlan` (stubs today); plan stats on `run.stats.plan`; `finishRun` appends the
//     run's main plan to `profile.planHistory` (last three, oldest first); `migrateSlot` fills `planHistory: []` for slots of
//     any version (a version 2 slot from B8 has no field either).
//   - Brass: each broken Clockmaker part (memory part included) adds 4 to `brassFor(run)` after the win; he gives no part.
import { describe, expect, it } from 'vitest';
import { createCombat, runTurn } from '../../src/core/combat';
import type { CreateCombatOpts } from '../../src/core/combat';
import { enemyDef } from '../../src/core/content/enemies';
import type { EnemyPartDef, WardenPhaseDef } from '../../src/core/defs';
import { afterPlayerTurn, refreshIntents } from '../../src/core/enemy';
import { setOrder } from '../../src/core/frames';
import { initPart, partState } from '../../src/core/framelib';
import { runMachine } from '../../src/core/machine';
import { migrateSlot } from '../../src/core/migrate';
import { finishRun, newProfile, runConfigFor } from '../../src/core/meta';
import { mainPlan, memoryPlan } from '../../src/core/record';
import { abandonRun, brassFor, defaultRunConfig, newRun, settleCombat, takeRewardTrinket } from '../../src/core/run';
import { startCombat } from '../../src/core/startfight';
import { cell, combatWith, put } from '../../src/core/testkit';
import type { CombatState, GameEvent, Plan, PlanStats, RunConfig, RunState, SaveSlot, TargetRef } from '../../src/core/types';

const T = '2026-10-04T12:00:00Z';
const PLANS: Plan[] = ['plating', 'burst', 'pressure', 'statuses'];

// ---------- helpers ----------

/** The warden's phases from its real def; an assertion failure (not a crash) while it is still a legacy enemy. */
function phasesOf(id: string): WardenPhaseDef[] {
  const f = enemyDef(id).frame;
  expect(f, `${id} is a frame enemy (content/enemies.ts)`).toBeTruthy();
  expect(f?.phases, `${id} has frame.phases`).toBeTruthy();
  return f?.phases as WardenPhaseDef[];
}

function part(c: CombatState, e: number, id: string) {
  const p = c.enemies[e].parts.find((x) => x.id === id);
  expect(p, `enemy ${e} has part ${id}`).toBeTruthy();
  return p as NonNullable<typeof p>;
}
const has = (c: CombatState, e: number, id: string): boolean => c.enemies[e].parts.some((x) => x.id === id);
const kinds = (events: GameEvent[], kind: GameEvent['kind']): GameEvent[] => events.filter((e) => e.kind === kind);

/** Put warden `idx` straight into phase `n` (as if its earlier keystones broke): parts unfolded, cadences restarted, no pending action. */
function enterPhase(c: CombatState, idx: number, n: number): void {
  const ph = phasesOf(c.enemies[idx].defId);
  const e = c.enemies[idx];
  const mem = e.parts.filter((p) => p.id.startsWith('mem-'));
  e.parts = [];
  for (let i = 0; i <= n; i++) {
    for (const d of ph[i].parts) {
      if (d.lastPhase !== undefined && d.lastPhase < n) continue;
      const s = initPart(d);
      if (i < n && d.keystone) {
        s.broken = true;
        s.hp = 0;
      }
      e.parts.push(s);
    }
  }
  e.parts.push(...mem);
  e.phase = n;
  e.sealed = !ph[n].coreExposed;
  e.phaseActionPending = false;
  e.turnsActed = 0;
  e.coreTookThisTurn = 0;
  refreshIntents(c, idx);
}

/** Break these parts of enemy `idx` with a real Strike (1 HP left each, a Strike 31 on the order), one turn. */
function breakParts(c: CombatState, ids: string[], idx = 0) {
  for (const id of ids) part(c, idx, id).hp = 1;
  if (!c.board[cell('B2')]) put(c, 'B2', 'test-strike-31');
  c.ticksThisTurn = 3;
  c.jammed = 0;
  setOrder(c, ids.map((id) => `e${idx}.${id}` as TargetRef));
  return runTurn(c);
}

/** Break every standing keystone of the warden's current phase: the phase changes this turn. */
function breakPhase(c: CombatState, idx = 0) {
  const e = c.enemies[idx];
  const keys = phasesOf(e.defId)[e.phase].keystones.filter((k) => !part(c, idx, k).broken);
  return breakParts(c, keys, idx);
}

const lift = (events: GameEvent[]): number[] => kinds(events, 'rewind').map((e) => e.uid as number);

// ---------- WP3: the defs ----------

/** What a phase's parts do, as tags: action kinds, passives, build-up cadences, and the phase action. */
function mechanics(ph: WardenPhaseDef): Set<string> {
  const out = new Set<string>();
  for (const p of ph.parts) {
    for (const a of p.actions) out.add(a.kind);
    for (const list of Object.values(p.actionsByTurn ?? {})) for (const a of list) out.add(a.kind);
    if (p.passive) out.add(`passive:${p.passive.kind}`);
    if (typeof p.cadence === 'object' && 'buildUp' in p.cadence) out.add('build-up');
    if (typeof p.cadence === 'object' && 'countdown' in p.cadence) out.add('countdown');
  }
  return out;
}

describe('WP3: each warden is a frame with phases, and each phase adds a mechanic', () => {
  const WARDENS: [string, number][] = [
    ['foreman', 2],
    ['boilermaker', 3],
    ['clockmaker', 3],
  ];
  for (const [id, n] of WARDENS) {
    it(`${id}: ${n} phases, braced, keystones in each but the last, the core exposed only in the last`, () => {
      const ph = phasesOf(id);
      expect(enemyDef(id).frame?.braced).toBe(true);
      expect(ph).toHaveLength(n);
      ph.forEach((p, i) => {
        const last = i === n - 1;
        expect(p.mood, `${id} phase ${i} mood`).toBe('phase');
        expect(p.coreExposed === true, `${id} phase ${i} core exposed`).toBe(last);
        if (i === 0) expect(p.action, 'phase 1 has no phase action').toBeNull();
        else expect(p.action, `${id} phase ${i} has a phase action`).toBeTruthy();
        if (!last) {
          expect(p.keystones.length, `${id} phase ${i} keystones`).toBeGreaterThanOrEqual(2);
          for (const k of p.keystones) expect(p.parts.find((d) => d.id === k)?.keystone, `${id}.${k} is a keystone part of its phase`).toBe(true);
        } else expect(p.keystones).toEqual([]);
      });
    });

    it(`${id}: every phase after the first adds a mechanic the earlier phases lack`, () => {
      const ph = phasesOf(id);
      const seen = new Set<string>();
      ph.forEach((p, i) => {
        const m = mechanics(p);
        if (p.action) m.add(`action:${p.action.kind}`);
        if (i > 0) expect([...m].filter((x) => !seen.has(x)).length, `${id} phase ${i} adds a mechanic`).toBeGreaterThan(0);
        for (const x of m) seen.add(x);
      });
    });
  }

  it('the phase actions are the decided ones (summon, summon then mend, rewind then jam)', () => {
    expect(phasesOf('foreman')[1].action).toMatchObject({ kind: 'summon', summon: 'cog-rat' });
    expect(phasesOf('boilermaker')[1].action).toMatchObject({ kind: 'summon', summon: 'steam-wraith' });
    expect(phasesOf('boilermaker')[2].action?.kind).toBe('rebuild');
    expect(phasesOf('clockmaker')[1].action?.kind).toBe('rewind');
    expect(phasesOf('clockmaker')[2].action?.kind).toBe('jam');
  });

  it("the Queen's 2 to 3 beat is conditional on the Gauge; the other beats are plain lines", () => {
    const beat = phasesOf('boilermaker')[2].beat;
    expect(typeof beat).toBe('object');
    expect(beat).toMatchObject({ ifBroken: 'queen-gauge' });
    for (const [id, i] of [['foreman', 1], ['boilermaker', 1], ['clockmaker', 1], ['clockmaker', 2]] as const) {
      expect(typeof phasesOf(id)[i].beat, `${id} phase ${i} beat`).toBe('string');
    }
  });
});

// ---------- WP2: the phase action ----------

describe('WP2: the last keystone breaks: the phase action happens once, was shown first, and the beat plays', () => {
  it('Foreman 1 to 2: the next turn is a Cog Rat summon shown as the intent first, taken once, with the beat and no attack', () => {
    const ph = phasesOf('foreman');
    const shown = combatWith({ board: { B2: 'test-strike-31' }, enemies: ['foreman'], hp: 500 });
    for (const k of ph[0].keystones) part(shown, 0, k).hp = 1;
    setOrder(shown, ph[0].keystones.map((k) => `e0.${k}` as TargetRef));
    const ev: GameEvent[] = [];
    runMachine(shown, ev);
    afterPlayerTurn(shown, ev); // the enemy has not acted yet: this is what the intent chip shows
    const e = shown.enemies[0];
    expect(e.phase).toBe(1);
    expect(e.phaseActionPending).toBe(true);
    expect(e.intents.map((i) => i.partId)).toEqual(['core']);
    expect(e.intents[0].label).toMatch(/summon/i);
    expect(shown.enemies).toHaveLength(1);

    const c = combatWith({ board: { B2: 'test-strike-31' }, enemies: ['foreman'], hp: 500 });
    const r = breakPhase(c);
    expect(c.enemies).toHaveLength(2);
    expect(c.enemies[1].defId).toBe('cog-rat');
    expect(c.playerHp).toBe(500); // the phase action is the whole turn: no attacks
    expect(kinds(r.events, 'playerHit')).toHaveLength(0);
    const evs = r.events;
    const iPhase = evs.findIndex((x) => x.kind === 'phase');
    const iAct = evs.findIndex((x) => x.kind === 'phaseAction');
    expect(iPhase, 'a phase event').toBeGreaterThanOrEqual(0);
    expect(iAct, 'a phaseAction event').toBeGreaterThan(iPhase);
    expect(evs[iPhase]).toMatchObject({ target: 0, amount: 1, note: ph[1].beat });
    expect(evs[iAct].note).toBe('summon');
    expect(kinds(evs, 'phaseAction')).toHaveLength(1);
    // once: the next turn has no phase action and no second summon
    const r2 = runTurn(c);
    expect(kinds(r2.events, 'phaseAction')).toHaveLength(0);
    expect(kinds(r2.events, 'summon')).toHaveLength(0);
    expect(c.enemies).toHaveLength(2);
  });

  it('Queen 1 to 2: a Steam Wraith summon, with her beat', () => {
    const ph = phasesOf('boilermaker');
    const c = combatWith({ board: { B2: 'test-strike-31' }, enemies: ['boilermaker'], hp: 500 });
    const r = breakPhase(c);
    expect(c.enemies.map((e) => e.defId)).toEqual(['boilermaker', 'steam-wraith']);
    expect(kinds(r.events, 'phase')[0]).toMatchObject({ amount: 1, note: ph[1].beat });
    expect(kinds(r.events, 'phaseAction')).toHaveLength(1);
    expect(c.playerHp).toBe(500);
  });

  it("Queen 2 to 3: the beat names her Gauge when it is broken and shrugs when it stands", () => {
    const beat = phasesOf('boilermaker')[2].beat as { ifBroken: string; text: string; otherwise: string };
    const line = (broken: boolean): string => {
      const c = combatWith({ board: { B2: 'test-strike-31' }, enemies: ['boilermaker'], hp: 500 });
      if (broken) {
        part(c, 0, 'queen-gauge').broken = true;
        part(c, 0, 'queen-gauge').hp = 0;
      }
      breakPhase(c);
      const r = breakPhase(c);
      const ph = kinds(r.events, 'phase');
      expect(ph).toHaveLength(1);
      expect(ph[0].amount).toBe(2);
      return ph[0].note as string;
    };
    expect(line(true)).toBe(beat.text);
    expect(beat.text).toContain('cracked my gauge');
    expect(line(false)).toBe(beat.otherwise);
    expect(beat.otherwise).toContain('only a little fire');
  });

  it('Clockmaker 1 to 2: Rewind 1 combination as the phase action, even though the Tick Spring is broken', () => {
    const c = combatWith({ board: { B2: 'test-strike-31', A1: 'escapement' }, enemies: ['clockmaker'], hp: 999 });
    const r = breakPhase(c);
    expect(part(c, 0, 'clock-tick').broken).toBe(true);
    expect(kinds(r.events, 'phaseAction')).toHaveLength(1);
    expect(kinds(r.events, 'phaseAction')[0].note).toBe('rewind');
    expect(kinds(r.events, 'rewind')).toHaveLength(1);
    expect(kinds(r.events, 'sabotage').filter((x) => x.note === 'jam')).toHaveLength(0);
    expect(c.playerHp).toBe(999);
  });

  it('Clockmaker 2 to 3: Jam the Mainspring for the next turn, no attack', () => {
    const c = combatWith({ board: { B2: 'test-strike-31' }, enemies: ['clockmaker'], hp: 999 });
    enterPhase(c, 0, 1);
    const r = breakPhase(c);
    expect(c.enemies[0].phase).toBe(2);
    expect(kinds(r.events, 'phaseAction')[0].note).toBe('jam');
    expect(kinds(r.events, 'sabotage').filter((x) => x.note === 'jam')).toHaveLength(1);
    expect(c.ticksThisTurn).toBe(2); // 3 ticks, one jammed
    expect(c.playerHp).toBe(999);
  });
});

// ---------- WP4, WP5: Rewind ----------

describe('WP4: the Clockmaker rewinds the strongest combination while the Tick Spring stands (v1 C6 kept)', () => {
  const setup = () => {
    const c = combatWith({ board: { B2: 'idler', C2: 'coil' }, enemies: ['clockmaker'], hp: 999 });
    return { c, idler: c.board[cell('B2')]!.uid, coil: c.board[cell('C2')]!.uid };
  };

  it('lifts the Coil and its feeder the Idler back to the draw pile and heals half their damage', () => {
    const { c, idler, coil } = setup();
    c.enemies[0].hp = 40; // the sealed core is below max so the heal shows
    expect(partState(c.enemies[0], 'clock-tick')?.broken).toBe(false);
    const r = runTurn(c);
    expect(lift(r.events).sort((a, b) => a - b)).toEqual([idler, coil].sort((a, b) => a - b));
    expect(c.board[cell('B2')]).toBeNull();
    expect(c.board[cell('C2')]).toBeNull();
    for (const u of [idler, coil]) expect([...c.draw, ...c.hand]).toContain(u);
    const dmg = (u: number): number => c.lastTurnContrib[u]?.dmg ?? 0;
    const expected = Math.floor((dmg(idler) + dmg(coil)) / 2);
    expect(expected, 'the combination dealt damage').toBeGreaterThan(0);
    const healed = kinds(r.events, 'enemyHeal').reduce((a, x) => a + (x.amount ?? 0), 0);
    expect(healed).toBe(expected);
    expect(c.enemies[0].hp).toBe(40 + expected);
  });

  it('after the Tick Spring breaks there is no Rewind for the rest of the phase', () => {
    const { c } = setup();
    const spring = part(c, 0, 'clock-tick');
    spring.broken = true;
    spring.hp = 0;
    refreshIntents(c, 0);
    for (let t = 0; t < 2; t++) {
      const r = runTurn(c);
      expect(kinds(r.events, 'rewind'), `turn ${t + 1}`).toHaveLength(0);
      expect(c.board[cell('B2')]).not.toBeNull();
      expect(c.board[cell('C2')]).not.toBeNull();
    }
  });
});

describe('WP5: Tock resets Pressure, Midnight rewinds two and jams on the even turns (v1 C8, C9)', () => {
  it('Tick keeps Pressure; the Tock Weight sets it to 0 and only while it stands', () => {
    const run = (phase: number, breakTock = false): number => {
      const c = combatWith({ board: { B2: 'boiler', A1: 'spur' }, enemies: ['clockmaker'], hp: 999, pressure: 4 });
      enterPhase(c, 0, phase);
      if (breakTock) {
        part(c, 0, 'clock-tock').broken = true;
        part(c, 0, 'clock-tock').hp = 0;
      }
      runTurn(c);
      return c.pressure;
    };
    expect(run(0)).toBe(10); // 4 + 3 ticks x 2
    expect(run(1)).toBe(0);
    expect(run(1, true)).toBe(10);
  });

  it('the Hour Wheel lifts the two strongest combinations, not the third', () => {
    const c = combatWith({ board: { B2: 'test-strike-5', A1: 'escapement', A3: 'test-strike-2' }, enemies: ['clockmaker'], hp: 999 });
    enterPhase(c, 0, 2);
    const r = runTurn(c);
    expect(kinds(r.events, 'rewind').map((x) => x.cell).sort()).toEqual([cell('A1'), cell('B2')].sort());
    expect(c.board[cell('A3')]).not.toBeNull();
  });

  it('the Midnight Bell: odd turns Corrode 75% then Attack 32; even turns Jam and Attack 36, and Jam only once', () => {
    const c = combatWith({ enemies: ['clockmaker'], hp: 999 });
    enterPhase(c, 0, 2);
    const lost: number[] = [];
    const jams: number[] = [];
    const ticks: number[] = [];
    for (let t = 1; t <= 4; t++) {
      c.plating = t % 2 === 1 ? 40 : 0;
      const before = c.playerHp;
      const r = runTurn(c);
      lost.push(before - c.playerHp);
      jams.push(kinds(r.events, 'sabotage').filter((x) => x.note === 'jam').length);
      ticks.push(c.ticksThisTurn);
    }
    expect(lost).toEqual([22, 36, 22, 36]); // 40 Plating, Corrode 75% leaves 10, Attack 32 lands 22
    expect(jams).toEqual([0, 1, 0, 1]);
    expect(ticks).toEqual([3, 2, 3, 2]);
  });
});

// ---------- parts that stay or retract; the Gauge ----------

describe('which parts persist across phases', () => {
  it("the Foreman's Apron Plate retracts at phase 2 (removed, not broken, no salvage); his keystones stay broken", () => {
    const c = combatWith({ board: { B2: 'test-strike-31' }, enemies: ['foreman'], hp: 500 });
    expect(phasesOf('foreman')[0].parts.find((d) => d.id === 'foreman-apron')?.lastPhase).toBe(1);
    expect(has(c, 0, 'foreman-apron')).toBe(true);
    const wrecked = c.wrecked;
    const r = breakPhase(c);
    expect(has(c, 0, 'foreman-apron')).toBe(false);
    expect(c.broken.some((b) => b.partId === 'foreman-apron')).toBe(false);
    expect(kinds(r.events, 'partBroken').some((x) => x.part === 'foreman-apron')).toBe(false);
    expect(c.wrecked).toBe(wrecked);
    expect(part(c, 0, 'foreman-wrench').broken).toBe(true);
    expect(part(c, 0, 'foreman-grate').broken).toBe(true);
    expect(has(c, 0, 'foreman-bulwark')).toBe(true);
    expect(has(c, 0, 'foreman-rivet')).toBe(true);
  });

  it("the Queen's Gauge has no lastPhase: it stands into phase 3, and its reading carries over", () => {
    expect(phasesOf('boilermaker')[0].parts.find((d) => d.id === 'queen-gauge')?.lastPhase).toBeUndefined();
    const c = combatWith({ board: { B2: 'test-strike-31' }, enemies: ['boilermaker'], hp: 500 });
    part(c, 0, 'queen-gauge').gauge = 6;
    breakPhase(c);
    expect(part(c, 0, 'queen-gauge').broken).toBe(false);
    expect(part(c, 0, 'queen-gauge').gauge).toBe(6);
    breakPhase(c);
    expect(c.enemies[0].phase).toBe(2);
    expect(part(c, 0, 'queen-gauge').broken).toBe(false);
    expect(part(c, 0, 'queen-gauge').hp).toBe(20);
  });

  it('Mend at the 2 to 3 change rebuilds a broken Gauge at half HP with its reading at 0, and not before', () => {
    const c = combatWith({ board: { B2: 'test-strike-31' }, enemies: ['boilermaker'], hp: 500 });
    const g = part(c, 0, 'queen-gauge');
    g.broken = true;
    g.hp = 0;
    g.gauge = 14;
    c.enemies[0].intents = c.enemies[0].intents.filter((i) => i.partId !== 'queen-gauge');
    breakPhase(c); // 1 to 2: a Wraith, the Gauge stays broken
    expect(part(c, 0, 'queen-gauge').broken).toBe(true);
    const r = breakPhase(c); // 2 to 3: Mend
    const after = part(c, 0, 'queen-gauge');
    expect(after.broken).toBe(false);
    expect(after.hp).toBe(10);
    expect(after.gauge).toBe(0);
    expect(kinds(r.events, 'partRebuilt').some((x) => x.part === 'queen-gauge')).toBe(true);
    expect(c.broken.some((b) => b.partId === 'queen-gauge')).toBe(false);
  });
});

// ---------- plan stats ----------

const zero = (): PlanStats => ({ plating: 0, burst: 0, pressure: 0, statuses: 0 });
const planOf = (run: RunState): PlanStats => ({ ...zero(), ...(run.stats.plan ?? {}) });
function runWith(c: CombatState): RunState {
  const run = newRun(defaultRunConfig(1));
  c.kind = 'fight';
  run.combat = c;
  run.phase = 'combat';
  return run;
}
/** Kill the enemies on an empty board: the fight is won this turn and no more damage is dealt. */
function winNow(c: CombatState): void {
  c.board.fill(null);
  for (const e of c.enemies) e.hp = 0;
  runTurn(c);
  expect(c.outcome).toBe('won');
}

describe('plan stats: recordFight puts each fight into plating, burst, pressure or statuses', () => {
  const dummy = { core: 99, bump: 'attack 1' };
  const fights: [Plan, () => CombatState, number][] = [
    ['plating', () => combatWith({ board: { A1: 'escapement' }, ticks: 1, enemies: [dummy] }), 3],
    ['burst', () => combatWith({ board: { B2: 'test-strike-7' }, ticks: 1, enemies: [dummy] }), 7],
    ['pressure', () => combatWith({ board: { B2: 'piston' }, pressure: 3, ticks: 1, enemies: [dummy] }), 9],
    ['statuses', () => combatWith({ board: { B2: 'whistle' }, pressure: 2, ticks: 1, enemies: [dummy] }), 3],
  ];
  for (const [plan, mk, amount] of fights) {
    it(`a fight of ${plan} only records ${amount} ${plan} and its main plan is ${plan}`, () => {
      const c = mk();
      const run = runWith(c);
      runTurn(c);
      winNow(c);
      expect(settleCombat(run)).toBe(true);
      expect(planOf(run)).toEqual({ ...zero(), [plan]: amount });
      expect(mainPlan(run.stats.plan)).toBe(plan);
    });
  }

  it('adds up across fights', () => {
    const run = runWith(combatWith({ board: { B2: 'test-strike-7' }, ticks: 1, enemies: [dummy] }));
    for (let i = 0; i < 2; i++) {
      if (i > 0) {
        run.phase = 'combat';
        run.pending = null;
        run.combat = combatWith({ board: { B2: 'test-strike-7' }, ticks: 1, enemies: [dummy] });
      }
      const c = run.combat as CombatState;
      runTurn(c);
      winNow(c);
      expect(settleCombat(run)).toBe(true);
    }
    expect(planOf(run).burst).toBe(14);
  });

  it('is recorded on a loss', () => {
    const c = combatWith({ board: { B2: 'test-strike-7' }, ticks: 1, hp: 5, enemies: [{ core: 99, bump: 'attack 50' }] });
    const run = runWith(c);
    runTurn(c);
    expect(c.outcome).toBe('lost');
    expect(settleCombat(run)).toBe(true);
    expect(run.phase).toBe('defeat');
    expect(planOf(run).burst).toBe(7);
  });

  it('is recorded when the run is abandoned mid-fight (the fight so far counts)', () => {
    const c = combatWith({ board: { B2: 'test-strike-7' }, ticks: 1, hp: 500, enemies: [dummy] });
    const run = runWith(c);
    runTurn(c);
    expect(c.outcome).toBe('ongoing');
    abandonRun(run);
    expect(run.phase).toBe('defeat');
    expect(planOf(run).burst).toBe(7);
  });

  it('mainPlan: the largest; ties go plating, burst, pressure, statuses; all zero or missing gives null', () => {
    expect(mainPlan({ plating: 5, burst: 5, pressure: 5, statuses: 5 })).toBe('plating');
    expect(mainPlan({ plating: 0, burst: 4, pressure: 4, statuses: 1 })).toBe('burst');
    expect(mainPlan({ plating: 1, burst: 0, pressure: 3, statuses: 3 })).toBe('pressure');
    expect(mainPlan({ plating: 0, burst: 0, pressure: 0, statuses: 2 })).toBe('statuses');
    expect(mainPlan({ plating: 2, burst: 9, pressure: 3, statuses: 4 })).toBe('burst');
    expect(mainPlan(zero())).toBeNull();
    expect(mainPlan(undefined)).toBeNull();
  });
});

// ---------- planHistory ----------

describe('planHistory: finishRun keeps the last three main plans; old profiles migrate to []', () => {
  const ended = (p: ReturnType<typeof newProfile>, seed: number, plan?: Partial<PlanStats>): RunState => {
    const run = newRun(runConfigFor(p, seed, 'tinker'));
    run.phase = 'defeat';
    if (plan) run.stats.plan = { ...zero(), ...plan };
    return run;
  };

  it('a new profile starts with an empty history', () => {
    expect(newProfile('t', T).planHistory).toEqual([]);
  });

  it('appends the run\'s main plan, once per run, in the same write', () => {
    const p = newProfile('t', T);
    const run = ended(p, 11, { burst: 8, plating: 3 });
    finishRun(p, run, T);
    expect(p.planHistory).toEqual(['burst']);
    finishRun(p, run, T); // the same seed again pays and records nothing
    expect(p.planHistory).toEqual(['burst']);
  });

  it('a run that dealt and gained nothing records nothing', () => {
    const p = newProfile('t', T);
    finishRun(p, ended(p, 12), T);
    finishRun(p, ended(p, 13, zero()), T);
    expect(p.planHistory).toEqual([]);
  });

  it('keeps only the last three, oldest first', () => {
    const p = newProfile('t', T);
    const order: Plan[] = ['plating', 'burst', 'pressure', 'statuses'];
    order.forEach((pl, i) => finishRun(p, ended(p, 20 + i, { [pl]: 5 }), T));
    expect(p.planHistory).toEqual(['burst', 'pressure', 'statuses']);
  });

  const slotWith = (version: number, history: Plan[] | undefined): SaveSlot => {
    const profile = newProfile('Tess', T);
    profile.version = version;
    if (history) profile.planHistory = history;
    else delete (profile as { planHistory?: Plan[] }).planHistory;
    return { slot: 1, version, profile, run: null, updatedAt: T };
  };

  it('a v1 slot and a B8 (version 2) slot without the field both come out with planHistory []', () => {
    expect(migrateSlot(slotWith(1, undefined)).slot.profile.planHistory).toEqual([]);
    expect(migrateSlot(slotWith(2, undefined)).slot.profile.planHistory).toEqual([]);
  });

  it('a slot that has a history keeps it', () => {
    expect(migrateSlot(slotWith(2, ['burst', 'plating'])).slot.profile.planHistory).toEqual(['burst', 'plating']);
  });
});

// ---------- BF4, WP6: the Clockmaker's memory ----------

describe('BF4: memoryPlan picks the most frequent of the last three, a tie to the latest', () => {
  it('Plating, Plating, burst gives Plating', () => {
    expect(memoryPlan(['plating', 'plating', 'burst'])).toBe('plating');
  });
  it('a three-way tie goes to the latest run; a two-run tie too', () => {
    expect(memoryPlan(['plating', 'burst', 'pressure'])).toBe('pressure');
    expect(memoryPlan(['burst', 'plating'])).toBe('plating');
  });
  it('only the last three count', () => {
    expect(memoryPlan(['pressure', 'pressure', 'burst', 'statuses'])).toBe('statuses');
  });
  it('no history gives null', () => {
    expect(memoryPlan([])).toBeNull();
    expect(memoryPlan(undefined)).toBeNull();
  });
});

type MemDefs = Partial<Record<Plan, EnemyPartDef>>;
const memoryDefs = (): MemDefs => {
  const m = (enemyDef('clockmaker').frame as unknown as { memoryParts?: MemDefs } | undefined)?.memoryParts;
  expect(m, "the Clockmaker's frame has memoryParts").toBeTruthy();
  return m as MemDefs;
};
const memCombat = (memory: Plan | null | undefined): CombatState =>
  createCombat({ seed: 1, bin: [], enemies: ['clockmaker'], hp: 999, maxHp: 999, kind: 'boss', memory } as CreateCombatOpts);
const memParts = (c: CombatState): string[] => c.enemies[0].parts.filter((p) => p.id.startsWith('mem-')).map((p) => p.id);

describe('WP6 (U): the Clockmaker starts with the part that answers your main plan', () => {
  it('the four memory parts are content.md 3.6 (id, HP, action, cadence), non-keystone', () => {
    const m = memoryDefs();
    expect(m.plating).toMatchObject({ id: 'mem-drill', hp: 24, cadence: 'every', actions: [{ kind: 'pierce', amount: 14 }] });
    expect(m.burst).toMatchObject({ id: 'mem-governor', hp: 24, cadence: 'passive', passive: { kind: 'governor', cap: 12 } });
    expect(m.pressure).toMatchObject({ id: 'mem-valve', hp: 22, cadence: 'every', actions: [{ kind: 'drain', amount: 8 }] });
    expect(m.statuses).toMatchObject({ id: 'mem-chime', hp: 22, cadence: 'every', actions: [{ kind: 'purge' }] });
    for (const pl of PLANS) {
      expect(m[pl]?.keystone ?? false, `${pl} part is not a keystone`).toBe(false);
      expect(m[pl]?.lastPhase, `${pl} part is never retracted`).toBeUndefined();
    }
  });

  for (const [plan, id] of [['plating', 'mem-drill'], ['burst', 'mem-governor'], ['pressure', 'mem-valve'], ['statuses', 'mem-chime']] as const) {
    it(`${plan}: he has ${id} from phase 1, standing, and it stays into the next phase`, () => {
      const c = memCombat(plan);
      expect(memParts(c)).toEqual([id]);
      expect(part(c, 0, id).broken).toBe(false);
      const sealedKeys = phasesOf('clockmaker')[0].keystones;
      expect(sealedKeys).not.toContain(id); // not a keystone: breaking the phase's keystones does not need it
      put(c, 'B2', 'test-strike-31');
      breakPhase(c);
      expect(c.enemies[0].phase).toBe(1);
      expect(part(c, 0, id).broken).toBe(false);
    });
  }

  it('with no history he has no memory part', () => {
    expect(memParts(memCombat(null))).toEqual([]);
    expect(memParts(memCombat(undefined))).toEqual([]);
  });

  it('a profile whose last three runs were Plating, Plating, burst starts a run that meets the drill', () => {
    const p = newProfile('t', T);
    p.planHistory = ['plating', 'plating', 'burst'];
    const cfg = runConfigFor(p, 5, 'tinker') as RunConfig & { memory?: Plan | null };
    expect(cfg.memory).toBe('plating');
    const run = newRun(cfg);
    const c = startCombat(run, ['clockmaker'], 'boss');
    expect(memParts(c)).toEqual(['mem-drill']);
    const q = newProfile('t', T);
    expect((runConfigFor(q, 5, 'tinker') as RunConfig & { memory?: Plan | null }).memory ?? null).toBeNull();
    expect(memParts(startCombat(newRun(runConfigFor(q, 5, 'tinker')), ['clockmaker'], 'boss'))).toEqual([]);
  });

  it('only the Clockmaker remembers: the Foreman and the Queen never get a memory part', () => {
    for (const id of ['foreman', 'boilermaker']) {
      const c = createCombat({ seed: 1, bin: [], enemies: [id], hp: 99, maxHp: 99, kind: 'boss', memory: 'plating' } as CreateCombatOpts);
      expect(c.enemies[0].parts.some((p) => p.id.startsWith('mem-')), id).toBe(false);
    }
  });
});

// ---------- Brass 4, the core rewards ----------

function bossRunWon(memory: Plan | null, breakIds: string[][]): RunState {
  const c = memCombat(memory);
  const run = newRun(defaultRunConfig(1));
  run.combat = c;
  run.phase = 'combat';
  for (const ids of breakIds) breakParts(c, ids);
  winNow(c);
  expect(settleCombat(run)).toBe(true);
  return run;
}

describe('the Clockmaker pays Brass 4 for each broken part and gives no part; the other wardens keep the boss trinket choice', () => {
  it('four broken parts (two keystones of each of two phases) add 16 Brass; a fight that broke none adds nothing', () => {
    const base = brassFor(bossRunWon(null, []));
    const four = bossRunWon(null, [['clock-hour', 'clock-tick'], ['clock-minute', 'clock-tock']]);
    expect(brassFor(four) - base).toBe(16);
  });

  it('the memory part pays Brass 4 too', () => {
    const base = brassFor(bossRunWon('plating', []));
    const run = bossRunWon('plating', [['mem-drill']]);
    expect(brassFor(run) - base).toBe(4);
  });

  it('he offers no part and no salvage', () => {
    const run = bossRunWon('plating', [['clock-hour', 'clock-tick']]);
    const p = run.pending;
    const offered = p?.kind === 'reward' ? p.parts : p?.kind === 'salvage' ? p.items : [];
    expect(offered).toEqual([]);
  });

  for (const id of ['foreman', 'boilermaker']) {
    it(`after the ${id} falls the boss trinket choice still appears`, () => {
      const c = combatWith({ enemies: [id], hp: 500 });
      c.kind = 'boss';
      const run = newRun(defaultRunConfig(1));
      run.combat = c;
      run.phase = 'combat';
      winNow(c);
      expect(settleCombat(run)).toBe(true);
      expect(run.phase).toBe('reward');
      const p = run.pending;
      expect(p?.kind === 'reward' || p?.kind === 'salvage').toBe(true);
      const trinkets = (p as { trinkets: string[] }).trinkets;
      expect(trinkets.length).toBeGreaterThan(0);
      expect(takeRewardTrinket(run, 0)).toBe(true);
    });
  }
});
