// Run flow beyond the acceptance cases: act progression, boss rewards, blueprints, Second Wind, shop, determinism.
import { describe, expect, it } from 'vitest';
import { runTurn } from '../../src/core/combat';
import { PARTS } from '../../src/core/content/parts';
import { TRINKETS } from '../../src/core/content/trinkets';
import {
  availableNodes,
  brassFor,
  chooseEvent,
  defaultRunConfig,
  enterNode,
  eventPickPart,
  forgeUpgrade,
  leaveNode,
  makeShop,
  newRun,
  oilRepair,
  runRecord,
  settleCombat,
  shopBuy,
  shopRemove,
  takeRewardPart,
  takeRewardTrinket,
} from '../../src/core/run';
import type { RunConfig, RunState } from '../../src/core/types';

function winCombat(run: RunState): void {
  const c = run.combat!;
  for (let i = 0; i < 6 && c.outcome === 'ongoing'; i++) {
    for (const e of c.enemies) e.hp = 0;
    runTurn(c);
  }
  expect(c.outcome).toBe('won');
  expect(settleCombat(run)).toBe(true);
}

/** Walk one floor with a fixed policy; returns the phase it passed through. */
function doNode(run: RunState, pick: number): void {
  const ids = availableNodes(run);
  expect(enterNode(run, ids[pick % ids.length])).toBe(true);
  switch (run.phase) {
    case 'combat':
      winCombat(run);
      takeRewardPart(run, 0);
      takeRewardTrinket(run, 0);
      break;
    case 'event': {
      for (let ch = 0; ch < 3 && run.pending && run.pending.kind === 'event' && run.pending.result === undefined; ch++) {
        chooseEvent(run, ch);
        if (run.pending.kind === 'event' && run.pending.needsPart) expect(eventPickPart(run, run.bin[0].uid)).toBe(true);
      }
      break;
    }
    case 'forge':
      forgeUpgrade(run, run.bin.find((b) => !b.plus)!.uid);
      break;
    case 'oil':
      oilRepair(run);
      break;
    default:
      break;
  }
  expect(leaveNode(run)).toBe(true);
}

/** Play a whole act (12 floors and the boss), cheating every fight. */
function playAct(run: RunState, pick = 0): void {
  const act = run.act;
  for (let f = 1; f <= 13; f++) {
    expect(run.act).toBe(act);
    doNode(run, pick + f);
    run.hp = run.maxHp;
  }
}

function runWith(cfg: Partial<RunConfig> = {}, seed = 3): RunState {
  return newRun({ ...defaultRunConfig(seed), ...cfg });
}

describe('run progression', () => {
  it('beating the act 1 boss opens the act 2 map', () => {
    const run = runWith();
    playAct(run);
    expect(run.act).toBe(2);
    expect(run.floor).toBe(0);
    expect(run.phase).toBe('map');
    expect(run.map.act).toBe(2);
    expect(run.stats.bossesBeaten).toBe(1);
    expect(availableNodes(run).length).toBeGreaterThanOrEqual(2);
  });

  it('three bosses end in victory with the Brass of a full climb', () => {
    const run = runWith();
    playAct(run);
    playAct(run);
    playAct(run);
    expect(run.phase).toBe('victory');
    const rec = runRecord(run);
    expect(rec.result).toBe('win');
    expect(rec.act).toBe(3);
    expect(rec.brassEarned).toBeGreaterThanOrEqual(75 + 50 + 12 * (4 + 6 + 8));
    expect(brassFor(run)).toBe(rec.brassEarned);
  });

  it('a boss gives the best part choices available, 3 boss trinkets, a blueprint, and heals 40% of lost HP', () => {
    const run = runWith();
    // walk to floor 12 quickly
    for (let f = 1; f <= 12; f++) doNode(run, 0);
    run.hp = 20;
    const boss = availableNodes(run)[0];
    enterNode(run, boss);
    expect(run.combat!.kind).toBe('boss');
    run.combat!.playerHp = 20;
    winCombat(run);
    const p = run.pending!;
    if (p.kind !== 'reward') throw new Error('no reward');
    expect(p.parts.length).toBe(3);
    // every rare part is locked at the start, so the offer steps down to uncommon until a rare blueprint is found
    for (const id of p.parts) expect(PARTS[id].rarity).not.toBe('common');
    expect(p.trinkets.length).toBe(3);
    for (const id of p.trinkets) expect(TRINKETS[id].rarity).toBe('boss');
    expect(p.blueprint).toBeDefined();
    expect(PARTS[p.blueprint!].locked).toBe(true);
    expect(run.stats.blueprintsFound).toContain(p.blueprint);
    expect(run.hp).toBe(20 + Math.floor(30 * 0.4));
    const before = run.maxHp;
    expect(takeRewardTrinket(run, p.trinkets.indexOf('brass-heart') >= 0 ? p.trinkets.indexOf('brass-heart') : 0)).toBe(true);
    expect(takeRewardTrinket(run, 0)).toBe(false);
    expect(run.maxHp).toBeGreaterThanOrEqual(before);
  });

  it('elites drop a trinket and a blueprint; the extra blueprint comes once per act', () => {
    const run = runWith({ extraEliteBlueprint: true }, 5);
    run.act = 1;
    // find an elite node on the map and teleport next to it
    const elite = run.map.nodes.find((n) => n.type === 'elite')!;
    run.nodeId = null;
    run.map.nodes.filter((n) => n.floor === 1).forEach((n) => (n.next = [elite.id]));
    run.map.nodes.find((n) => n.floor === 1)!.next = [elite.id];
    run.nodeId = run.map.nodes.find((n) => n.floor === 1)!.id;
    run.phase = 'map';
    enterNode(run, elite.id);
    expect(run.combat!.kind).toBe('elite');
    winCombat(run);
    const p = run.pending!;
    if (p.kind !== 'salvage') throw new Error('no salvage tray');
    expect(p.trinkets.length).toBe(1);
    expect(p.blueprint).toBeDefined();
    expect(p.extraBlueprint).toBeDefined();
    expect(p.extraBlueprint).not.toBe(p.blueprint);
    expect(run.cogs).toBeGreaterThanOrEqual(25);
    expect(run.stats.blueprintsFound.length).toBe(2);
    // found blueprints join the reward pool: all locked parts eventually appear only when found
    expect(run.stats.elites).toBe(1);
  });

  it('Second Wind keeps the player alive at 1 HP once per run', () => {
    const run = runWith({ secondWind: true });
    enterNode(run, availableNodes(run)[0]);
    const c = run.combat!;
    c.playerHp = 1;
    for (const e of c.enemies) e.intent = { kind: 'attack', amount: 40, label: 'Attack 40' };
    runTurn(c);
    expect(c.outcome).toBe('lost');
    expect(settleCombat(run)).toBe(false);
    expect(run.flags.secondWindUsed).toBe(true);
    expect(run.phase).toBe('combat');
    expect(c.outcome).toBe('ongoing');
    expect(c.playerHp).toBe(1);
    expect(c.hand.length).toBeGreaterThan(0);
    for (const e of c.enemies) e.intent = { kind: 'attack', amount: 40, label: 'Attack 40' };
    runTurn(c);
    expect(settleCombat(run)).toBe(true);
    expect(run.phase).toBe('defeat');
    expect(run.killedBy).toBeTruthy();
  });

  it('fights never repeat an encounter within 3 fights', () => {
    const run = runWith();
    const seen: string[] = [];
    for (let f = 1; f <= 6; f++) {
      const id = availableNodes(run)[0];
      const node = run.map.nodes.find((n) => n.id === id)!;
      node.type = 'fight';
      enterNode(run, id);
      seen.push(run.combat!.enemies.map((e) => e.defId).join('+'));
      winCombat(run);
      leaveNode(run);
    }
    for (let i = 3; i < seen.length; i++) {
      expect(seen.slice(i - 3, i)).not.toContain(seen[i]);
    }
  });
});

describe('run level trinkets and the shop', () => {
  it('Lucky Bolt, Tin Cup and Collar Tag apply at run level', () => {
    const run = runWith({ trinkets: ['lucky-bolt', 'tin-cup', 'sprocket-tag'] });
    run.hp = 30;
    enterNode(run, availableNodes(run)[0]);
    run.combat!.playerHp = 30;
    winCombat(run);
    expect(run.hp).toBe(33);
    const p = run.pending!;
    if (p.kind !== 'salvage') throw new Error('no salvage tray');
    expect(p.cogs).toBeGreaterThanOrEqual(14);
  });

  it('Clockwork Heart and Brass Heart raise max HP on gain; Mainspring Key lowers the hand', () => {
    const run = runWith({ trinkets: ['clockwork-heart', 'brass-heart', 'mainspring-key'] });
    expect(run.maxHp).toBe(50 + 8 + 15);
    enterNode(run, availableNodes(run)[0]);
    expect(run.combat!.handSize).toBe(2);
  });

  it('shop removal costs 60, then 80, then 100', () => {
    const run = runWith();
    run.phase = 'shop';
    run.pending = { kind: 'shop', stock: makeShop(run), removalsBought: 0 };
    run.cogs = 1000;
    const price = () => (run.pending as { stock: { kind: string; price: number }[] }).stock.find((s) => s.kind === 'removal')!.price;
    expect(price()).toBe(60);
    expect(shopRemove(run, run.bin[0].uid)).toBe(true);
    expect(run.cogs).toBe(940);
    expect(price()).toBe(80);
    expect(shopRemove(run, run.bin[0].uid)).toBe(true);
    expect(price()).toBe(100);
    run.cogs = 99;
    expect(shopRemove(run, run.bin[0].uid)).toBe(false);
  });

  it('shop stock has 5 parts (3 common), 2 trinkets, removal and oil; Gilded Cog takes 20% off', () => {
    const plain = runWith({}, 9);
    const gilded = runWith({ trinkets: ['gilded-cog'] }, 9);
    const a = makeShop(plain);
    const b = makeShop(gilded);
    expect(a.filter((s) => s.kind === 'part').length).toBe(5);
    expect(a.filter((s) => s.kind === 'part' && PARTS[s.id!].rarity === 'common').length).toBe(3);
    expect(a.filter((s) => s.kind === 'trinket').length).toBe(2);
    expect(a.some((s) => s.kind === 'removal')).toBe(true);
    expect(a.some((s) => s.kind === 'oil')).toBe(true);
    expect(new Set(a.filter((s) => s.kind === 'part').map((s) => s.id)).size).toBe(5);
    expect(a.find((s) => s.kind === 'removal')!.price).toBe(60);
    expect(b.find((s) => s.kind === 'removal')!.price).toBe(48);
  });

  it('shop oil heals 15 and sells once; offers are recorded for the sim', () => {
    const run = runWith();
    run.phase = 'shop';
    run.pending = { kind: 'shop', stock: makeShop(run), removalsBought: 0 };
    run.cogs = 500;
    run.hp = 20;
    const i = run.pending.kind === 'shop' ? run.pending.stock.findIndex((s) => s.kind === 'oil') : -1;
    expect(shopBuy(run, i)).toBe(true);
    expect(run.hp).toBe(35);
    expect(shopBuy(run, i)).toBe(false);
    expect(run.stats.offers.filter((o) => o.source === 'shop').length).toBe(5);
  });
});

describe('determinism', () => {
  it('the same seed and the same choices give the same run', () => {
    const play = () => {
      const run = runWith({}, 21);
      playAct(run);
      return JSON.stringify({ ...run, combat: null });
    };
    expect(play()).toBe(play());
  });

  it('different seeds give different maps', () => {
    expect(JSON.stringify(runWith({}, 1).map)).not.toBe(JSON.stringify(runWith({}, 2).map));
  });
});
