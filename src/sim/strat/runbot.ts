// The expert run policy: v1's event choices and Oil logic, with a drafting plan (Plating engine plus burst parts,
// committed to one package by act 1 floor 4), removal of weak parts, and pathing for elites when healthy.
// Deterministic: no exploration, no Math.random, no clock.
import { PARTS } from '../../core/content/parts';
import {
  availableNodes,
  chooseEvent,
  enterNode,
  eventPickPart,
  forgeRemove,
  forgeUpgrade,
  leaveNode,
  shopBuy,
  shopRemove,
  takeRewardPart,
  takeRewardTrinket,
} from '../../core/run';
import { takeSalvage } from '../../core/salvage';
import type { Family, MapNode, PartInstance, RunState } from '../../core/types';
import { check, eventChoice, doOil } from '../runbot';
import type { BotMemory } from '../runbot';
import type { RunPolicy } from './drive';

type Pkg = 'steam' | 'spring' | 'cam' | 'any';

/** Base worth of each part for the Plating-stack plus burst plan (hand-assigned from docs/content.md texts). */
const BASE: Record<string, number> = {
  // gear
  spur: 1.2, idler: 1.8, bevel: 1.8, crown: 1.5, ratchet: 2, flywheel: 1.5, planetary: 2.5, 'sprocket-wheel': 2.2,
  // spring
  coil: 3.2, leaf: 3, torsion: 2.8, trap: 2.2, recoil: 2, volute: 4, hairspring: 3,
  // cam
  cam: 2.5, 'triple-cam': 1.5, lever: 3, 'trip-hammer': 2, tappet: 1.5, 'cam-follower': 2.2, toggle: 2.2,
  // tempo
  escapement: 2.4, pendulum: 3, anchor: 3, metronome: 3, 'balance-wheel': 2.2, verge: 3, grandfather: 3, chronometer: 3.2,
  // steam
  boiler: 2, piston: 3, whistle: 1.5, 'safety-valve': 2.4, firebox: 2, kettle: 1.4, condenser: 2.2, 'steam-hammer': 3.4, governor: 2,
  // chime
  // v2 parts (content.md): machine breakers
  auger: 2.6, 'core-drill': 3, 'pry-bar': 3, wedge: 2, sapper: 3, 'cold-chisel': 3, 'mending-spool': 2.2, 'soothing-valve': 1.8, sunder: 3.2,
  // B9b Masterwork and Legendary parts (hand-valued from content.md; the same numbers for every bot)
  skewframe: 3.5, 'mirror-gear': 3, 'twin-mainspring': 3.5, 'free-pawl': 3, 'night-watchman': 3.2, 'resonance-rod': 3, 'hour-hand': 3, 'ballast-lance': 3.2,
  'cascade-piston': 3.4, 'conductors-baton': 2.5, 'perpetual-engine': 4.5, 'bottled-dusk': 4, 'sun-orb-core': 3.5, 'apprentices-hands': 3.5, 'sprockets-blanket': 3.5,
  chime: 1.2, 'bell-hammer': 2, 'oil-can': 1.2, 'tuning-fork': 1.5, 'alarm-clock': 2, gong: 1.5, lamp: 1.5,
};

const PKG: Record<string, Pkg> = {
  boiler: 'steam', piston: 'steam', whistle: 'steam', 'safety-valve': 'steam', firebox: 'steam', kettle: 'steam', condenser: 'steam', 'steam-hammer': 'steam', governor: 'steam',
  coil: 'spring', leaf: 'spring', torsion: 'spring', trap: 'spring', recoil: 'spring', volute: 'spring', hairspring: 'spring', 'trip-hammer': 'spring', 'cam-follower': 'spring',
  cam: 'cam', 'triple-cam': 'cam', lever: 'cam', tappet: 'cam', toggle: 'cam', 'pry-bar': 'cam', wedge: 'cam', sapper: 'cam', 'night-watchman': 'cam', 'resonance-rod': 'cam', 'free-pawl': 'spring', 'sprockets-blanket': 'spring', 'cascade-piston': 'steam', 'sun-orb-core': 'steam',
};

const TRINKET_BASE: Record<string, number> = {
  oilcloth: 3, 'copper-wire': 2, 'lucky-bolt': 1, whetstone: 2.5, 'tin-cup': 2, bellows: 1.5, 'pressure-gauge': 1, 'brass-knuckles': 2.5,
  'grease-pot': 1, 'magnet-ward': 0.5, 'feather-duster': 1.5, 'blueprint-scrap': 1, 'pocket-watch': 1.5, spectacles: 3, 'extra-pocket': 2,
  'cracked-lens': 1, 'soot-mask': 1, counterweight: 2, 'steam-locket': 1, hourglass: 2.5, 'gilded-cog': 2, 'sprocket-tag': 1.5,
  'overrun-coupler': 3, 'foresight-dial': 2.5, 'two-left-hands': 3, 'tow-hook': 2.5, 'inventors-watch': 4, 'sprockets-whistle': 4,
  'clockwork-heart': 3, 'spare-spring': 3.5, 'mainspring-key': 2.5, 'ember-coal': 1, 'echo-chamber': 3.5, 'brass-heart': 3,
};

const pkgOf = (id: string): Pkg => PKG[id] ?? 'any';

/** The package the bin leans on most (sum of base values of its parts), or 'any' when none leads clearly. */
function leadingPkg(bin: PartInstance[]): Pkg {
  const sum: Record<Pkg, number> = { steam: 0, spring: 0, cam: 0, any: 0 };
  for (const p of bin) sum[pkgOf(p.defId)] += BASE[p.defId] ?? 1;
  let best: Pkg = 'any';
  let bestV = 4;
  for (const k of ['spring', 'steam', 'cam'] as const) {
    if (sum[k] > bestV) {
      bestV = sum[k];
      best = k;
    }
  }
  return best;
}

/** Drafting bias of the plating plan (the 'plater' route): added to the value of every Plating part. Set around a run by the caller. */
export const DRAFT = { plating: 0 };
export const PLATE_PARTS = new Set(['escapement', 'leaf', 'anchor', 'toggle', 'cam-follower', 'balance-wheel', 'safety-valve', 'condenser', 'volute', 'recoil', 'sprockets-blanket', 'ballast-lance', 'resonance-rod']);

const committed = (run: RunState): boolean => run.act > 1 || run.floor >= 4;

/** How much a part is worth taking into this bin. */
export function value(run: RunState, defId: string): number {
  const d = PARTS[defId];
  if (!d) return 0;
  let v = (BASE[defId] ?? 1) + (PLATE_PARTS.has(defId) ? DRAFT.plating : 0);
  const pkg = pkgOf(defId);
  const lead = leadingPkg(run.bin);
  const same = run.bin.filter((p) => pkgOf(p.defId) === pkg && p.defId !== defId).length;
  if (pkg !== 'any') {
    v += (committed(run) ? 0.6 : 0.35) * Math.min(5, same);
    if (committed(run) && lead !== 'any' && lead !== pkg && v < 4.5) v -= 0.8;
  }
  // Steam payoffs need Boilers to feed them.
  if (defId === 'piston' || defId === 'steam-hammer' || defId === 'governor' || defId === 'safety-valve' || defId === 'condenser' || defId === 'whistle') {
    const boil = run.bin.filter((p) => p.defId === 'boiler' || p.defId === 'firebox' || p.defId === 'kettle').length;
    v += 0.5 * Math.min(3, boil) - (boil === 0 ? 0.8 : 0);
  }
  // B10c.0: Masterworks that pay only with the right bin around them
  if (defId === 'free-pawl') {
    const springs = run.bin.filter((p) => PARTS[p.defId]?.family === 'spring').length;
    v += springs >= 4 ? 1 : springs >= 2 ? 0.2 : -1; // it frees the Springs next to it; with none it does nothing
  }
  if (defId === 'cascade-piston') {
    const boil = run.bin.filter((p) => p.defId === 'boiler' || p.defId === 'firebox' || p.defId === 'kettle').length;
    v += boil >= 2 ? 1 : boil === 1 ? 0 : -1.2; // Strike 12 needs 3 Pressure; without it, Strike 3
  }
  const dup = run.bin.filter((p) => p.defId === defId).length;
  if (dup >= 4) v -= 2;
  else if (dup === 3) v -= 0.8;
  else if (dup === 2) v -= 0.2;
  return v;
}

export const keep = (run: RunState, p: PartInstance): number => value(run, p.defId) + (p.plus ? 1.2 : 0);

/** A new part is worth a slot only above this; a big bin raises the bar. */
export const takeBar = (run: RunState): number => 2.2 + 0.07 * Math.max(0, run.bin.length - 10);

export function weakest(run: RunState, pool: PartInstance[] = run.bin): { uid: number; v: number } | null {
  let best: { uid: number; v: number } | null = null;
  for (const p of pool) {
    const v = keep(run, p) - (PARTS[p.defId]?.family === 'gear' && p.defId === 'spur' ? 0.3 : 0);
    if (!best || v < best.v) best = { uid: p.uid, v };
  }
  return best;
}

export function strongest(run: RunState, m: BotMemory, plusOk: boolean, pool: PartInstance[] = run.bin): number | null {
  let best: number | null = null;
  let bestV = -Infinity;
  for (const p of pool) {
    if (p.plus && !plusOk) continue;
    const v = value(run, p.defId) + Math.min(1, (m.fired[p.defId] ?? 0) / 300);
    if (v > bestV) {
      bestV = v;
      best = p.uid;
    }
  }
  return best;
}

export function trinketValue(run: RunState, id: string): number {
  let v = TRINKET_BASE[id] ?? 1;
  const lead = leadingPkg(run.bin);
  if ((id === 'bellows' || id === 'pressure-gauge' || id === 'ember-coal' || id === 'steam-locket') && lead === 'steam') v += 1.5;
  if (id === 'spare-spring' && lead === 'spring') v += 1;
  return v;
}

// ---------- Map ----------

function nodeScore(run: RunState, n: MapNode): number {
  const hpFrac = run.hp / run.maxHp;
  switch (n.type) {
    case 'boss':
      return 100;
    case 'oil':
      return hpFrac < 0.55 ? 9 : 1.5;
    case 'elite':
      return hpFrac > 0.65 && (n.floor >= 3 || run.act > 1) ? 7.5 : 0.3;
    case 'shop': {
      const w = weakest(run);
      const thin = w !== null && w.v < 2 && run.bin.length > 8;
      return run.cogs >= 100 || (thin && run.cogs >= 65) ? 7 : 1.5;
    }
    case 'fight':
      return n.floor <= 5 ? 8 : 5.5;
    case 'forge':
      return 4;
    case 'event':
      return 3.5;
  }
}

function doMap(run: RunState, m: BotMemory): void {
  const ids = availableNodes(run);
  let best = ids[0];
  let bestS = -Infinity;
  for (const id of ids) {
    const n = run.map.nodes.find((x) => x.id === id);
    if (!n) continue;
    const s = nodeScore(run, n) - n.lane * 0.001;
    if (s > bestS) {
      bestS = s;
      best = id;
    }
  }
  check(m, 'enterNode', enterNode(run, best));
}

// ---------- Reward ----------

/** Salvage to keep: unlocked parts above the take bar (each kept part joins the bin), the Spire key always. */
export function salvageKeep(run: RunState): number[] {
  const p = run.pending;
  if (!p || p.kind !== 'salvage') return [];
  const keep: number[] = [];
  let extra = 0;
  const bar = takeBar(run);
  // Best first, so a big bin keeps the best items.
  const order = p.items.map((_, i) => i).sort((a, b) => value(run, p.items[b].salvage) - value(run, p.items[a].salvage));
  for (const i of order) {
    const it = p.items[i];
    if (it.locked) continue;
    if (it.salvage === 'spire-key') {
      keep.push(i);
      continue;
    }
    if (value(run, it.salvage) >= bar + 0.07 * extra) {
      keep.push(i);
      extra += 1;
    }
  }
  return keep;
}

function doReward(run: RunState, m: BotMemory): void {
  const p = run.pending;
  if (p && p.kind === 'salvage') {
    if (!p.done) check(m, 'takeSalvage', takeSalvage(run, salvageKeep(run)));
    if (p.trinkets.length > 0 && !p.trinketTaken) {
      let idx = 0;
      let bestV = -Infinity;
      p.trinkets.forEach((id, i) => {
        const v = trinketValue(run, id);
        if (v > bestV) {
          bestV = v;
          idx = i;
        }
      });
      check(m, 'takeRewardTrinket', takeRewardTrinket(run, idx));
    }
    check(m, 'leaveNode', leaveNode(run));
    return;
  }
  if (!p || p.kind !== 'reward') return;
  if (p.parts.length > 0 && !p.partTaken) {
    let idx: number | null = null;
    let bestV = -Infinity;
    p.parts.forEach((id, i) => {
      const v = value(run, id);
      if (v > bestV) {
        bestV = v;
        idx = i;
      }
    });
    if (bestV < takeBar(run)) idx = null;
    check(m, 'takeRewardPart', takeRewardPart(run, idx));
  }
  if (p.trinkets.length > 0 && !p.trinketTaken) {
    let idx = 0;
    let bestV = -Infinity;
    p.trinkets.forEach((id, i) => {
      const v = trinketValue(run, id);
      if (v > bestV) {
        bestV = v;
        idx = i;
      }
    });
    check(m, 'takeRewardTrinket', takeRewardTrinket(run, idx));
  }
  check(m, 'leaveNode', leaveNode(run));
}

// ---------- Events ----------

export function eventPartUid(run: RunState, m: BotMemory): number | null {
  const p = run.pending;
  if (!p || p.kind !== 'event' || !p.needsPart) return null;
  const filter: Family | undefined = p.partFilter;
  let pool = run.bin.filter((x) => (!filter || PARTS[x.defId]?.family === filter) && (p.needsPart !== 'upgrade' || !x.plus));
  if (pool.length === 0) pool = run.bin;
  let uid: number | null;
  if (p.needsPart === 'upgrade') uid = strongest(run, m, false, pool);
  else if (p.needsPart === 'duplicate') uid = strongest(run, m, true, pool);
  else uid = weakest(run, pool)?.uid ?? null;
  return uid ?? pool[0]?.uid ?? null;
}

function doEvent(run: RunState, m: BotMemory): void {
  const p = run.pending;
  if (!p || p.kind !== 'event') return;
  if (p.needsPart) {
    const uid = eventPartUid(run, m);
    if (uid !== null) check(m, 'eventPickPart', eventPickPart(run, uid));
    if (run.pending && run.pending.kind === 'event' && run.pending.needsPart) return;
  } else if (p.result === undefined) {
    const out = chooseEvent(run, eventChoice(run, p.eventId));
    check(m, 'chooseEvent', out !== null);
    const q = run.pending;
    if (q && q.kind === 'event' && q.needsPart) return;
  }
  check(m, 'leaveNode', leaveNode(run));
}

// ---------- Shop, forge ----------

function doShop(run: RunState, m: BotMemory): void {
  for (let guard = 0; guard < 20; guard++) {
    const p = run.pending;
    if (!p || p.kind !== 'shop') break;
    // 1. Thin the bin first: a weak part out is worth more than a mediocre part in.
    const removal = p.stock.find((it) => it.kind === 'removal');
    const w = weakest(run);
    if (removal && !removal.sold && removal.price <= run.cogs && run.bin.length > 8 && w && w.v < 2) {
      if (!check(m, 'shopRemove', shopRemove(run, w.uid))) break;
      continue;
    }
    // 2. Then the best part or trinket per cog above the bar.
    let best = -1;
    let bestV = 0;
    p.stock.forEach((it, i) => {
      if (it.sold || it.price > run.cogs) return;
      let v = 0;
      if (it.kind === 'part' && it.id) {
        const pv = value(run, it.id);
        v = pv >= takeBar(run) + 0.3 ? pv / Math.max(1, it.price / 45) : 0;
      } else if (it.kind === 'trinket' && it.id) {
        const tv = trinketValue(run, it.id);
        v = tv >= 2.2 ? tv / Math.max(1, it.price / 100) : 0;
      } else if (it.kind === 'oil') v = run.hp / run.maxHp < 0.6 ? 3 : 0;
      if (v > bestV + 1e-9) {
        bestV = v;
        best = i;
      }
    });
    if (best < 0) break;
    if (!check(m, 'shopBuy', shopBuy(run, best))) break;
  }
  check(m, 'leaveNode', leaveNode(run));
}

function doForge(run: RunState, m: BotMemory): void {
  const w = weakest(run);
  if (w && w.v < 2 && run.bin.length > 8) check(m, 'forgeRemove', forgeRemove(run, w.uid));
  else {
    const uid = strongest(run, m, false);
    if (uid !== null) check(m, 'forgeUpgrade', forgeUpgrade(run, uid));
  }
  check(m, 'leaveNode', leaveNode(run));
}

export const expertRun: RunPolicy = { doMap, doReward, doEvent, doShop, doForge, doOil };
