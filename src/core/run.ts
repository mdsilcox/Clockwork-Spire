// The run: map, nodes, rewards, shop, forge, oil, events and act progression (docs/rules.md section 4).
// B3 CONTRACT: the signatures below are fixed; the `run-core` lane implements them. Pure: no DOM, no clock.
// Every function mutates the RunState in place and returns nothing unless stated. Illegal actions return false
// (or throw nothing) and leave the state unchanged.
import { BASE_PLACEMENTS, BASE_TICKS, createCombat } from './combat';
import type { CreateCombatOpts } from './combat';
import { CHASSIS } from './content/chassis';
import { bandForFloor, ENCOUNTERS, encounterPool } from './content/encounters';
import type { Encounter } from './content/encounters';
import { EVENTS } from './content/events';
import { candidates, EFFECTS, randomPartOf } from './eventfx';
import { generateActMap } from './map';
import { initStreams, int, pick, shuffle } from './rng';
import { addBlueprint, bossTrinkets, eliteTrinket, gainTrinket, heal, markOfferTaken, newPart, offerParts, recordOffers, rollBlueprint } from './rewards';
import { makeShop as buildShop, OIL_HEAL, removalPrice } from './shop';
import { isPartUnlocked, salvageItems } from './salvage';
import type { CombatState, RunConfig, RunRecord, RunState, ShopItem } from './types';

const BRASS_PER_FLOOR = [4, 6, 8];

/** Default RunConfig for a fresh profile (B4 replaces fields from upgrades). */
export function defaultRunConfig(seed: number, chassis = 'tinker'): RunConfig {
  return {
    seed,
    chassis,
    maxHp: 50,
    cogs: 0,
    handSize: 3,
    upgradedStarters: 0,
    trinkets: [],
    unlockedParts: [],
    rewardChoices: 3,
    extraEliteBlueprint: false,
    secondWind: false,
  };
}

/** Start a run: bin from the chassis, act 1 map, phase 'map', floor 0. */
export function newRun(cfg: RunConfig): RunState {
  const chassis = CHASSIS[cfg.chassis];
  if (!chassis) throw new Error(`Unknown chassis: ${cfg.chassis}`);
  const rng = initStreams(cfg.seed);
  const bin = chassis.startingBin.map((defId, i) => ({ uid: i + 1, defId, plus: false }));
  const order = shuffle(
    rng,
    'reward',
    bin.map((_, i) => i),
  );
  for (const i of order.slice(0, Math.max(0, cfg.upgradedStarters))) bin[i].plus = true;
  const run: RunState = {
    version: 1,
    config: { ...cfg, trinkets: cfg.trinkets.slice(), unlockedParts: cfg.unlockedParts.slice() },
    rng,
    act: 1,
    floor: 0,
    hp: cfg.maxHp,
    maxHp: cfg.maxHp,
    cogs: cfg.cogs,
    bin,
    nextUid: bin.length + 1,
    trinkets: [],
    map: generateActMap(rng, 1),
    nodeId: null,
    phase: 'map',
    combat: null,
    pending: null,
    recentEncounters: [],
    stats: {
      turns: 0,
      biggestTurn: 0,
      fights: 0,
      elites: 0,
      bossesBeaten: 0,
      brassEarned: 0,
      blueprintsFound: [],
      offers: [],
      removals: 0,
      floorBrass: 0,
      bonusBrass: 0,
    },
    flags: {},
  };
  for (const t of cfg.trinkets) gainTrinket(run, t);
  return run;
}

/** Node ids the player may enter now (floor 1 nodes at the start; else the current node's `next`). */
export function availableNodes(run: RunState): string[] {
  if (run.phase !== 'map') return [];
  if (run.nodeId === null) return run.map.nodes.filter((n) => n.floor === 1).map((n) => n.id);
  return run.map.nodes.find((n) => n.id === run.nodeId)?.next.slice() ?? [];
}

function pickEncounter(run: RunState, tier: Encounter['tier']): Encounter {
  const act = run.act;
  // Fight rooms draw by band (content.md section 4); the 12 map floors count as 6 floors.
  const pool =
    tier === 'normal'
      ? encounterPool(act, bandForFloor(Math.ceil(run.floor / 2), 6))
      : ENCOUNTERS.filter((e) => e.act === act && e.tier === tier);
  const key = (e: Encounter) => `${e.act}:${e.enemies.join('+')}`;
  const fresh = pool.filter((e) => !run.recentEncounters.includes(key(e)));
  const e = pick(run.rng, 'enemy', fresh.length ? fresh : pool);
  if (tier !== 'boss') run.recentEncounters = [...run.recentEncounters, key(e)].slice(-3);
  return e;
}

function pickEvent(run: RunState): string {
  const ids = Object.values(EVENTS)
    .filter((e) => !e.act || e.act === run.act)
    .map((e) => e.id);
  const unseen = ids.filter((id) => !run.flags[`event:${id}`]);
  const id = pick(run.rng, 'event', unseen.length ? unseen : ids);
  run.flags[`event:${id}`] = true;
  return id;
}

/** Enter a node: fight/elite/boss create `run.combat` (phase 'combat'); others set `run.pending` and their phase. */
export function enterNode(run: RunState, nodeId: string): boolean {
  if (!availableNodes(run).includes(nodeId)) return false;
  const node = run.map.nodes.find((n) => n.id === nodeId);
  if (!node) return false;
  run.nodeId = nodeId;
  run.floor = node.floor;
  node.visited = true;
  run.combat = null;
  run.pending = null;
  if (node.type === 'fight' || node.type === 'elite' || node.type === 'boss') {
    const enc = pickEncounter(run, node.type === 'fight' ? 'normal' : node.type);
    const handSize = Math.max(1, run.config.handSize - (run.trinkets.includes('mainspring-key') ? 1 : 0));
    const opts: CreateCombatOpts & { chassis: string } = {
      seed: int(run.rng, 'enemy', 0x7fffffff),
      bin: run.bin,
      enemies: enc.enemies,
      hp: run.hp,
      maxHp: run.maxHp,
      kind: node.type,
      trinkets: run.trinkets,
      handSize,
      chassis: run.config.chassis, // consumed by the combat-hooks lane's createCombat
    };
    run.combat = createCombat(opts);
    run.phase = 'combat';
  } else if (node.type === 'event') {
    run.pending = { kind: 'event', eventId: pickEvent(run) };
    run.phase = 'event';
  } else if (node.type === 'shop') {
    run.pending = { kind: 'shop', stock: makeShop(run), removalsBought: 0 };
    run.phase = 'shop';
  } else if (node.type === 'forge') {
    run.pending = { kind: 'forge', done: false };
    run.phase = 'forge';
  } else {
    run.pending = { kind: 'oil', done: false };
    run.phase = 'oil';
  }
  return true;
}

/** Second Wind: the player survives at 1 HP and the fight goes on with a fresh turn. */
function revive(c: CombatState): void {
  c.outcome = 'ongoing';
  c.playerHp = 1;
  c.turn += 1;
  c.plating = 0;
  c.momentum = 0;
  c.placementsLeft = BASE_PLACEMENTS;
  c.swapUsed = false;
  c.ticksThisTurn = BASE_TICKS;
  c.jammed = 0;
  for (const p of c.board) if (p) p.firedThisTurn = 0;
  while (c.hand.length < c.handSize) {
    if (c.draw.length === 0) {
      if (c.discard.length === 0) break;
      c.draw = shuffle(c.rng, 'draw', c.discard);
      c.discard = [];
    }
    c.hand.push(c.draw.pop() as number);
  }
}

function syncBrass(run: RunState): void {
  run.stats.brassEarned = brassFor(run);
}

/**
 * Call after every runTurn on `run.combat`. If the combat ended: on a win, move to 'reward' (Cogs, part choices,
 * trinket for elites and bosses, blueprint drops), copy HP back, update stats; on a loss, phase 'defeat'.
 * Second Wind applies here. Returns true if the combat ended.
 */
export function settleCombat(run: RunState): boolean {
  const c = run.combat;
  if (!c || run.phase !== 'combat' || c.outcome === 'ongoing') return false;

  if (c.outcome === 'lost' && run.config.secondWind && !run.flags.secondWindUsed) {
    run.flags.secondWindUsed = true;
    revive(c);
    return false;
  }

  run.stats.turns += c.log.length;
  run.stats.biggestTurn = Math.max(run.stats.biggestTurn, ...c.log.map((t) => t.damage), 0);

  if (c.outcome === 'lost') {
    run.hp = 0;
    run.killedBy = (c.enemies.find((e) => e.hp > 0) ?? c.enemies[0])?.defId;
    run.phase = 'defeat';
    run.combat = null;
    run.pending = null;
    syncBrass(run);
    return true;
  }

  // Won.
  const kind = c.kind === 'elite' || c.kind === 'boss' ? c.kind : 'fight';
  run.hp = Math.max(1, Math.min(run.maxHp, c.playerHp));
  let cogs = kind === 'fight' ? 12 + int(run.rng, 'reward', 9) : kind === 'elite' ? 25 + int(run.rng, 'reward', 11) : 40 + int(run.rng, 'reward', 11);
  if (run.trinkets.includes('lucky-bolt')) cogs = Math.round(cogs * 1.2);
  run.cogs += cogs;
  if (kind === 'boss') {
    run.stats.bossesBeaten += 1;
    heal(run, Math.floor((run.maxHp - run.hp) * 0.4));
  } else if (kind === 'elite') run.stats.elites += 1;
  else run.stats.fights += 1;
  if (run.trinkets.includes('tin-cup')) heal(run, 3);

  const trinkets: string[] = [];
  if (kind === 'elite') {
    const t = eliteTrinket(run);
    if (t) trinkets.push(t);
  } else if (kind === 'boss') trinkets.push(...bossTrinkets(run));

  let blueprint: string | undefined;
  let extraBlueprint: string | undefined;
  if (kind !== 'fight') {
    const b = rollBlueprint(run);
    if (b) {
      addBlueprint(run, b);
      blueprint = b;
    }
    const flag = `firstElite:${run.act}`;
    if (kind === 'elite' && run.config.extraEliteBlueprint && !run.flags[flag]) {
      run.flags[flag] = true;
      const x = rollBlueprint(run);
      if (x) {
        addBlueprint(run, x);
        extraBlueprint = x;
      }
    }
  }
  if (kind === 'boss') {
    const parts = offerParts(run, kind);
    recordOffers(run, parts, 'reward');
    run.pending = { kind: 'reward', cogs, parts, trinkets, blueprint, extraBlueprint, partTaken: false, trinketTaken: trinkets.length === 0 };
  } else {
    // v2: the salvage tray replaces the part choice after fights and elites (rules 2.5); the bin grows by choice.
    run.pending = {
      kind: 'salvage',
      items: salvageItems(c, (id) => isPartUnlocked(run, id)),
      wrecked: c.wrecked,
      cogs,
      trinkets,
      blueprint,
      extraBlueprint,
      trinketTaken: trinkets.length === 0,
      done: false,
    };
  }
  run.phase = 'reward';
  run.combat = null;
  syncBrass(run);
  return true;
}

/** Reward screen: take a part (index into pending.parts) or null to skip; take a trinket index (elite/boss). */
export function takeRewardPart(run: RunState, index: number | null): boolean {
  const p = run.pending;
  if (run.phase !== 'reward' || !p || p.kind !== 'reward' || p.partTaken) return false;
  if (index === null) {
    p.partTaken = true;
    if (run.trinkets.includes('sprocket-tag')) run.cogs += 12;
    return true;
  }
  const id = p.parts[index];
  if (id === undefined) return false;
  newPart(run, id);
  markOfferTaken(run, id, 'reward');
  p.partTaken = true;
  return true;
}

export function takeRewardTrinket(run: RunState, index: number | null): boolean {
  const p = run.pending;
  if (run.phase !== 'reward' || !p || (p.kind !== 'reward' && p.kind !== 'salvage') || p.trinketTaken || p.trinkets.length === 0) return false;
  if (index === null) {
    p.trinketTaken = true;
    return true;
  }
  const id = p.trinkets[index];
  if (id === undefined || !gainTrinket(run, id)) return false;
  p.trinketTaken = true;
  return true;
}

/** Events: choose a choice index. If the choice needs a part (remove, upgrade...), pending.needsPart is set and
 * `eventPickPart(run, uid)` completes it. Returns the outcome text. */
export function chooseEvent(run: RunState, choice: number): string | null {
  const p = run.pending;
  if (run.phase !== 'event' || !p || p.kind !== 'event' || p.result !== undefined || p.needsPart) return null;
  const ch = EVENTS[p.eventId]?.choices[choice];
  const fx = EFFECTS[p.eventId]?.[choice];
  if (!ch || !fx) return null;
  if (ch.available && !ch.available(run)) return null;
  if (fx.need) {
    if (candidates(run, fx).length === 0) {
      const part = fx.randomIfNone ? randomPartOf(run, fx) : null;
      const text = part ? fx.run(run, part) : fx.need === 'upgrade' ? 'Every part is already upgraded.' : 'There is nothing you can spare.';
      p.result = text;
      return text;
    }
    p.needsPart = fx.need;
    p.choice = choice;
    p.partFilter = fx.family;
    return fx.prompt ?? 'Choose a part.';
  }
  const text = fx.run(run);
  p.result = text;
  return text;
}

export function eventPickPart(run: RunState, uid: number): boolean {
  const p = run.pending;
  if (run.phase !== 'event' || !p || p.kind !== 'event' || !p.needsPart || p.choice === undefined) return false;
  const fx = EFFECTS[p.eventId]?.[p.choice];
  if (!fx) return false;
  const part = candidates(run, fx).find((x) => x.uid === uid);
  if (!part) return false;
  p.result = fx.run(run, part);
  p.needsPart = undefined;
  return true;
}

/** Shop stock for the current run (5 parts, 2 trinkets, removal, oil); used by enterNode. */
export function makeShop(run: RunState): ShopItem[] {
  return buildShop(run);
}

function shopPending(run: RunState) {
  const p = run.pending;
  return run.phase === 'shop' && p && p.kind === 'shop' ? p : null;
}

/** Shop. */
export function shopBuy(run: RunState, itemIndex: number): boolean {
  const p = shopPending(run);
  const item = p?.stock[itemIndex];
  if (!p || !item || item.sold || item.kind === 'removal' || run.cogs < item.price) return false;
  if (item.kind === 'part' && item.id) {
    newPart(run, item.id);
    markOfferTaken(run, item.id, 'shop');
  } else if (item.kind === 'trinket' && item.id) {
    if (!gainTrinket(run, item.id)) return false;
  } else if (item.kind === 'oil') {
    if (run.hp >= run.maxHp) return false;
    heal(run, OIL_HEAL);
  } else return false;
  run.cogs -= item.price;
  item.sold = true;
  return true;
}

/** Removal service: remove the part `uid` (pays the removal price). */
export function shopRemove(run: RunState, uid: number): boolean {
  const p = shopPending(run);
  if (!p) return false;
  const price = removalPrice(run);
  if (run.cogs < price || run.bin.length <= 1 || !run.bin.some((b) => b.uid === uid)) return false;
  run.cogs -= price;
  run.bin = run.bin.filter((b) => b.uid !== uid);
  run.stats.removals = (run.stats.removals ?? 0) + 1;
  p.removalsBought += 1;
  const item = p.stock.find((s) => s.kind === 'removal');
  if (item) item.price = removalPrice(run);
  return true;
}

function forgePending(run: RunState) {
  const p = run.pending;
  return run.phase === 'forge' && p && p.kind === 'forge' && !p.done ? p : null;
}

/** Forge: upgrade or remove exactly one part. */
export function forgeUpgrade(run: RunState, uid: number): boolean {
  const p = forgePending(run);
  const part = run.bin.find((b) => b.uid === uid);
  if (!p || !part || part.plus) return false;
  part.plus = true;
  p.done = true;
  return true;
}
export function forgeRemove(run: RunState, uid: number): boolean {
  const p = forgePending(run);
  if (!p || run.bin.length <= 1 || !run.bin.some((b) => b.uid === uid)) return false;
  run.bin = run.bin.filter((b) => b.uid !== uid);
  p.done = true;
  return true;
}

function oilPending(run: RunState) {
  const p = run.pending;
  return run.phase === 'oil' && p && p.kind === 'oil' && !p.done ? p : null;
}

/** Oil station: repair 30% of max HP (rounded down) or polish +4 max HP (Collar Tag: +5 heal). */
export function oilRepair(run: RunState): boolean {
  const p = oilPending(run);
  if (!p) return false;
  heal(run, Math.floor(run.maxHp * 0.3) + (run.trinkets.includes('sprocket-tag') ? 5 : 0));
  p.done = true;
  return true;
}
export function oilPolish(run: RunState): boolean {
  const p = oilPending(run);
  if (!p) return false;
  run.maxHp += 4;
  run.hp += 4;
  p.done = true;
  return true;
}

/** Leave the current non-combat node (or the reward screen) back to the map; after the boss: next act or 'victory'. */
export function leaveNode(run: RunState): boolean {
  if (!['reward', 'event', 'shop', 'forge', 'oil'].includes(run.phase)) return false;
  const p = run.pending;
  if (p && p.kind === 'event' && p.needsPart) return false;
  const node = run.map.nodes.find((n) => n.id === run.nodeId);
  run.pending = null;
  run.combat = null;
  if (node && node.type === 'boss') {
    if (run.act === 3) {
      run.phase = 'victory';
    } else {
      run.act = (run.act + 1) as 2 | 3;
      run.map = generateActMap(run.rng, run.act);
      run.nodeId = null;
      run.floor = 0;
      run.phase = 'map';
      run.recentEncounters = [];
    }
  } else {
    run.stats.floorBrass = (run.stats.floorBrass ?? 0) + BRASS_PER_FLOOR[run.act - 1] + (run.trinkets.includes('blueprint-scrap') ? 1 : 0);
    run.phase = 'map';
  }
  syncBrass(run);
  return true;
}

/** Abandon the run (phase 'defeat', result 'abandoned' in the record). */
export function abandonRun(run: RunState): void {
  run.flags.abandoned = true;
  run.phase = 'defeat';
  run.combat = null;
  run.pending = null;
  syncBrass(run);
}

/** Brass earned by this run so far per rules 5.2 (B4 pays it out; B3 shows it). */
export function brassFor(run: RunState): number {
  const s = run.stats;
  return (s.floorBrass ?? 0) + s.elites * 10 + s.bossesBeaten * 25 + (run.phase === 'victory' ? 50 : 0) + (s.bonusBrass ?? 0);
}

/** The history record for a finished run. `endedAt` and `n` are filled by the app. */
export function runRecord(run: RunState): Omit<RunRecord, 'n' | 'endedAt'> {
  return {
    seed: run.config.seed,
    chassis: run.config.chassis,
    result: run.flags.abandoned ? 'abandoned' : run.phase === 'victory' ? 'win' : 'loss',
    act: run.act,
    floor: run.floor,
    killedBy: run.killedBy,
    brassEarned: brassFor(run),
    blueprintsFound: run.stats.blueprintsFound.slice(),
    partsAtEnd: run.bin.map((b) => b.defId),
    trinkets: run.trinkets.slice(),
    turns: run.stats.turns,
    biggestTurn: run.stats.biggestTurn,
  };
}

/** Floor counted across acts (act 2 floor 3 = 16), for best-floor tracking. */
export function absoluteFloor(run: RunState): number {
  return (run.act - 1) * 13 + run.floor;
}
