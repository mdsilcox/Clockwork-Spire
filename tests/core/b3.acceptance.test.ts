// B3 acceptance tests (docs/acceptance.md). Written before the build; never weaken an assertion.
import { describe, expect, it } from 'vitest';
import { cell } from '../../src/core/testkit';
import { createCombat, placePart, runTurn } from '../../src/core/combat';
import { initStreams } from '../../src/core/rng';
import { takeSalvage } from '../../src/core/salvage';
import { generateActMap } from '../../src/core/map';
import {
  defaultRunConfig,
  newRun,
  availableNodes,
  enterNode,
  settleCombat,
  leaveNode,
  chooseEvent,
  eventPickPart,
  makeShop,
  shopBuy,
  forgeUpgrade,
  forgeRemove,
  oilRepair,
  oilPolish,
  runRecord,
} from '../../src/core/run';
import { EVENTS } from '../../src/core/content/events';
import { TRINKETS } from '../../src/core/content/trinkets';
import { PARTS } from '../../src/core/content/parts';
import { CHASSIS } from '../../src/core/content/chassis';
import type { RunState } from '../../src/core/types';

function freshRun(seed = 7): RunState {
  return newRun(defaultRunConfig(seed, 'tinker'));
}

/** Enter the first available fight on floor 1 and win it instantly. */
function winFirstFight(run: RunState): void {
  const id = availableNodes(run)[0];
  expect(enterNode(run, id)).toBe(true);
  expect(run.phase).toBe('combat');
  for (const e of run.combat!.enemies) e.hp = 0;
  runTurn(run.combat!);
  expect(settleCombat(run)).toBe(true);
}

describe('B3 map', () => {
  it('R1: three acts of 12 floors plus a boss, with the fixed floors and full connectivity', () => {
    for (let seed = 1; seed <= 25; seed++) {
      for (const act of [1, 2, 3] as const) {
        const map = generateActMap(initStreams(seed), act);
        const byFloor = (f: number) => map.nodes.filter((n) => n.floor === f);
        expect(Math.max(...map.nodes.map((n) => n.floor))).toBe(13);
        expect(byFloor(13).length).toBe(1);
        expect(byFloor(13)[0].type).toBe('boss');
        for (let f = 1; f <= 12; f++) {
          const nodes = byFloor(f);
          expect(nodes.length, `act ${act} floor ${f}`).toBeGreaterThanOrEqual(2);
          expect(nodes.length).toBeLessThanOrEqual(4);
          for (const n of nodes) {
            expect(n.next.length).toBeGreaterThanOrEqual(1);
            expect(n.next.length).toBeLessThanOrEqual(2);
            for (const nx of n.next) expect(map.nodes.find((m) => m.id === nx)!.floor).toBe(f + 1);
            if (f === 1) expect(n.type).toBe('fight');
            if (f === 7) expect(n.type).toBe('forge');
            if (f === 12) expect(n.type).toBe('oil');
            if (f < 4) expect(n.type).not.toBe('elite');
          }
        }
        // every node is reachable from floor 1 and reaches the boss
        const reach = new Set(byFloor(1).map((n) => n.id));
        for (let f = 1; f <= 12; f++) for (const n of byFloor(f)) if (reach.has(n.id)) n.next.forEach((x) => reach.add(x));
        expect(reach.size).toBe(map.nodes.length);
        for (const n of map.nodes) {
          let cur = [n];
          while (cur[0].floor < 13) cur = cur.flatMap((c) => c.next.map((x) => map.nodes.find((m) => m.id === x)!));
          expect(cur[0].type).toBe('boss');
        }
      }
    }
  });

  it('R1b: the same seed gives the same map', () => {
    expect(JSON.stringify(generateActMap(initStreams(3), 2))).toBe(JSON.stringify(generateActMap(initStreams(3), 2)));
  });
});

describe('B3 run flow', () => {
  it('starts from the chassis bin on the act 1 map', () => {
    const run = freshRun();
    expect(run.bin.map((p) => p.defId).sort()).toEqual([...CHASSIS.tinker.startingBin].sort());
    expect(run.phase).toBe('map');
    expect(run.act).toBe(1);
    expect(availableNodes(run).length).toBeGreaterThanOrEqual(2);
    expect(enterNode(run, 'not-a-node')).toBe(false);
  });

  it('R2 (salvage tray, B7): a won fight gives Cogs and the salvage tray; scrapping everything is allowed', () => {
    const run = freshRun();
    const cogs = run.cogs;
    winFirstFight(run);
    expect(run.phase).toBe('reward');
    const p = run.pending!;
    expect(p.kind).toBe('salvage');
    if (p.kind !== 'salvage') return;
    expect(run.cogs - cogs).toBeGreaterThanOrEqual(12);
    expect(run.cogs - cogs).toBeLessThanOrEqual(20);
    const binBefore = run.bin.length;
    expect(takeSalvage(run, [])).toBe(true);
    expect(run.bin.length).toBe(binBefore);
    expect(takeSalvage(run, [])).toBe(false);
    expect(leaveNode(run)).toBe(true);
    expect(run.phase).toBe('map');
  });

  it('R2b (salvage tray, B7): keeping a salvaged part adds it to the bin; scrapped ones pay 3 Cogs each', () => {
    const run = freshRun(11);
    winFirstFight(run);
    const p = run.pending!;
    if (p.kind !== 'salvage') throw new Error('no salvage tray');
    p.items = [
      { enemy: 0, partId: 'jaw', salvage: 'spur', rarity: 'common', locked: false },
      { enemy: 0, partId: 'tail', salvage: 'coil', rarity: 'common', locked: false },
    ];
    const cogs = run.cogs;
    const spurs = run.bin.filter((b) => b.defId === 'spur').length;
    expect(takeSalvage(run, [0, 5])).toBe(false); // an index that is not in the tray changes nothing
    expect(takeSalvage(run, [0])).toBe(true);
    expect(run.bin.filter((b) => b.defId === 'spur').length).toBe(spurs + 1);
    expect(run.cogs).toBe(cogs + 3);
    expect(takeSalvage(run, [1])).toBe(false);
  });

  it('C3: dying ends the run in defeat with a record', () => {
    const run = freshRun();
    enterNode(run, availableNodes(run)[0]);
    const c = run.combat!;
    c.playerHp = 1;
    for (const e of c.enemies) e.intent = { kind: 'attack', amount: 30, label: 'Attack 30' };
    runTurn(c);
    expect(c.outcome).toBe('lost');
    settleCombat(run);
    expect(run.phase).toBe('defeat');
    const rec = runRecord(run);
    expect(rec.result).toBe('loss');
    expect(rec.act).toBe(1);
    expect(rec.floor).toBe(1);
  });

  it('R3: a Forge upgrades or removes exactly one part', () => {
    const run = freshRun();
    run.phase = 'forge';
    run.pending = { kind: 'forge', done: false };
    const uid = run.bin[0].uid;
    expect(forgeUpgrade(run, uid)).toBe(true);
    expect(run.bin.find((b) => b.uid === uid)!.plus).toBe(true);
    expect(forgeRemove(run, run.bin[1].uid)).toBe(false);
    const run2 = freshRun();
    run2.phase = 'forge';
    run2.pending = { kind: 'forge', done: false };
    const n = run2.bin.length;
    expect(forgeRemove(run2, run2.bin[2].uid)).toBe(true);
    expect(run2.bin.length).toBe(n - 1);
  });

  it('R4: an Oil station repairs 30% (rounded down) up to max, or polishes +4 max HP', () => {
    const run = freshRun();
    run.phase = 'oil';
    run.pending = { kind: 'oil', done: false };
    run.hp = 20;
    expect(oilRepair(run)).toBe(true);
    expect(run.hp).toBe(35);
    expect(oilPolish(run)).toBe(false);
    const run2 = freshRun();
    run2.phase = 'oil';
    run2.pending = { kind: 'oil', done: false };
    run2.hp = 45;
    oilRepair(run2);
    expect(run2.hp).toBe(50);
    const run3 = freshRun();
    run3.phase = 'oil';
    run3.pending = { kind: 'oil', done: false };
    expect(oilPolish(run3)).toBe(true);
    expect(run3.maxHp).toBe(54);
  });

  it('R5: the shop sells for Cogs and refuses without enough', () => {
    const run = freshRun();
    run.phase = 'shop';
    run.pending = { kind: 'shop', stock: makeShop(run), removalsBought: 0 };
    const stock = (run.pending as { stock: { kind: string; price: number; sold: boolean }[] }).stock;
    const i = stock.findIndex((s) => s.kind === 'part');
    expect(i).toBeGreaterThanOrEqual(0);
    run.cogs = 0;
    expect(shopBuy(run, i)).toBe(false);
    run.cogs = 1000;
    const n = run.bin.length;
    expect(shopBuy(run, i)).toBe(true);
    expect(run.cogs).toBe(1000 - stock[i].price);
    expect(run.bin.length).toBe(n + 1);
    expect(shopBuy(run, i)).toBe(false);
  });
});

describe('B3 content', () => {
  it('R6: at least 20 events, 3 with Sprocket; every choice applies without error', () => {
    const all = Object.values(EVENTS);
    expect(all.length).toBeGreaterThanOrEqual(20);
    expect(all.filter((e) => e.sprocket).length).toBeGreaterThanOrEqual(3);
    for (const ev of all) {
      for (let ch = 0; ch < ev.choices.length; ch++) {
        const run = freshRun(100 + ch);
        run.cogs = 200;
        run.hp = 40;
        run.phase = 'event';
        run.pending = { kind: 'event', eventId: ev.id };
        const text = chooseEvent(run, ch);
        if (run.pending && run.pending.kind === 'event' && run.pending.needsPart) {
          expect(eventPickPart(run, run.bin[0].uid), ev.id).toBe(true);
        }
        expect(typeof text === 'string' || text === null).toBe(true);
        expect(run.hp).toBeGreaterThan(0);
        expect(run.hp).toBeLessThanOrEqual(run.maxHp);
      }
    }
  });

  it('R7: at least 25 trinkets, each with text, each harmless in a sample combat', () => {
    const all = Object.values(TRINKETS);
    expect(all.length).toBeGreaterThanOrEqual(25);
    for (const t of all) {
      expect(t.text.length).toBeGreaterThan(0);
      const bin = CHASSIS.tinker.startingBin.concat(['boiler', 'boiler', 'coil', 'cam']).map((defId, i) => ({ uid: i + 1, defId, plus: false }));
      const c = createCombat({ seed: 5, bin, enemies: ['cog-rat', 'rust-mite'], hp: 50, maxHp: 50, trinkets: [t.id] });
      for (let turn = 0; turn < 5 && c.outcome === 'ongoing'; turn++) {
        for (const at of [cell('B2'), cell('A1'), cell('A3'), cell('C2')]) if (c.placementsLeft > 0 && c.hand.length > 0) placePart(c, 0, at);
        runTurn(c);
      }
    }
  });

  it('W9: the Sprocket Wheel and the Collar Tag exist and are reachable through Sprocket events', () => {
    expect(PARTS['sprocket-wheel'].locked).toBe(true);
    expect(TRINKETS['sprocket-tag']).toBeDefined();
    const run = freshRun();
    run.phase = 'event';
    run.pending = { kind: 'event', eventId: 'sprocket-blueprint' };
    chooseEvent(run, 0);
    expect(run.stats.blueprintsFound).toContain('sprocket-wheel');
    const run2 = freshRun();
    run2.phase = 'event';
    run2.pending = { kind: 'event', eventId: 'sprocket-pipe' };
    chooseEvent(run2, 0);
    expect(run2.trinkets).toContain('sprocket-tag');
  });
});

// RETIRED in B9a: C6 to C9 (the v1 Clockmaker's Rewind, per-phase HP, Tock's Pressure reset, Midnight's two rewinds and alternate
// Jam) asserted the legacy phase machine. The Clockmaker is a frame with phases now; the same rules (v1 C6 to C9 kept) are
// tests/v2/b9-wardens.test.ts: WP4 (Rewind lifts the strongest combination and its feeder, heals half), WP5 (Tock resets
// Pressure, the Hour Wheel lifts two, the Midnight Bell jams on even turns only) and WP2 (the phase actions).
