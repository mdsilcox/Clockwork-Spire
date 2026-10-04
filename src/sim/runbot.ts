// Decisions for every run phase (docs/rules.md section 7). Pure choices: they read a RunState and call the run API.
// Randomness (20% exploration) comes only from the bot's own seeded stream.
import { CHASSIS } from '../core/content/chassis';
import { EVENTS } from '../core/content/events';
import { PARTS } from '../core/content/parts';
import { TRINKETS } from '../core/content/trinkets';
import {
  availableNodes,
  chooseEvent,
  enterNode,
  eventPickPart,
  forgeRemove,
  forgeUpgrade,
  leaveNode,
  oilPolish,
  oilRepair,
  shopBuy,
  shopRemove,
  takeRewardPart,
  takeRewardTrinket,
} from '../core/run';
import { initStreams, next } from '../core/rng';
import type { RngState } from '../core/rng';
import type { Family, MapNode, PartInstance, RunState } from '../core/types';

export const EXPLORE = 0.2;
const RARITY_BASE = { common: 1, uncommon: 2, rare: 3 } as const;

export interface BotMemory {
  rng: RngState;
  /** Times each part id was powered across the run's fights. */
  fired: Record<string, number>;
  illegal: string[];
}

export function newMemory(botSeed: number): BotMemory {
  return { rng: initStreams(botSeed), fired: {}, illegal: [] };
}

const roll = (m: BotMemory): number => next(m.rng, 'reward');
const pickIdx = (m: BotMemory, n: number): number => Math.floor(roll(m) * n);

/** Record an API call that returned false. */
export function check(m: BotMemory, name: string, ok: boolean): boolean {
  if (!ok) m.illegal.push(name);
  return ok;
}

function familyCount(run: RunState, family: string): number {
  let n = 0;
  for (const p of run.bin) if (PARTS[p.defId]?.family === family) n += 1;
  return n;
}

/** How much a part is worth taking into this bin. */
export function partValue(run: RunState, defId: string, m: BotMemory): number {
  const d = PARTS[defId];
  if (!d) return 0;
  let v = RARITY_BASE[d.rarity];
  v += 0.6 * Math.min(4, familyCount(run, d.family));
  const dup = run.bin.filter((p) => p.defId === defId).length;
  if (dup >= 3) v -= 1.5;
  else if (dup === 2) v -= 0.5;
  v += Math.min(1, (m.fired[defId] ?? 0) / 200);
  return v;
}

/** How much we want to keep a part already in the bin. */
function keepValue(run: RunState, p: { defId: string; plus: boolean }, m: BotMemory): number {
  return partValue(run, p.defId, m) + (p.plus ? 1.5 : 0);
}

function starterIds(run: RunState): Set<string> {
  return new Set(CHASSIS[run.config.chassis]?.startingBin ?? ['spur', 'escapement']);
}

/** The weakest starter-type part in the bin (an Escapement or Spur first), or null. */
function weakestStarter(run: RunState, m: BotMemory, pool: PartInstance[] = run.bin): number | null {
  const starters = starterIds(run);
  let best: number | null = null;
  let bestV = Infinity;
  for (const p of pool) {
    if (!starters.has(p.defId)) continue;
    const pref = p.defId === 'escapement' || p.defId === 'spur' ? -0.5 : 0;
    const v = keepValue(run, p, m) + pref;
    if (v < bestV) {
      bestV = v;
      best = p.uid;
    }
  }
  return best;
}

function weakestAny(run: RunState, m: BotMemory, pool: PartInstance[] = run.bin): number | null {
  let best: number | null = null;
  let bestV = Infinity;
  for (const p of pool) {
    const v = keepValue(run, p, m);
    if (v < bestV) {
      bestV = v;
      best = p.uid;
    }
  }
  return best;
}

function mostFired(_run: RunState, m: BotMemory, plusOk: boolean, pool: PartInstance[] = _run.bin): number | null {
  let best: number | null = null;
  let bestF = -1;
  for (const p of pool) {
    if (p.plus && !plusOk) continue;
    const f = m.fired[p.defId] ?? 0;
    if (f > bestF) {
      bestF = f;
      best = p.uid;
    }
  }
  return best;
}

// ---------- Map ----------

function nodeScore(run: RunState, n: MapNode): number {
  const hpFrac = run.hp / run.maxHp;
  switch (n.type) {
    case 'boss':
      return 100;
    case 'oil':
      return hpFrac < 0.5 ? 9 : 1;
    case 'elite':
      return hpFrac > 0.6 && n.floor >= 4 ? 6 : 0.5;
    case 'shop':
      return run.cogs >= 100 ? 7 : 1.5;
    case 'fight':
      return n.floor <= 5 ? 8 : 5;
    case 'forge':
      return 3;
    case 'event':
      return 3.5;
  }
}

export function chooseNode(run: RunState): string {
  const ids = availableNodes(run);
  let best = ids[0];
  let bestS = -Infinity;
  for (const id of ids) {
    const n = run.map.nodes.find((x) => x.id === id);
    if (!n) continue;
    const s = nodeScore(run, n) - n.lane * 0.001; // ties by lane
    if (s > bestS) {
      bestS = s;
      best = id;
    }
  }
  return best;
}

export function doMap(run: RunState, m: BotMemory): void {
  check(m, 'enterNode', enterNode(run, chooseNode(run)));
}

// ---------- Reward ----------

export function doReward(run: RunState, m: BotMemory): void {
  const p = run.pending;
  if (!p || p.kind !== 'reward') return;
  if (p.parts.length > 0 && !p.partTaken) {
    let idx: number | null = null;
    if (roll(m) < EXPLORE) idx = pickIdx(m, p.parts.length);
    else {
      let bestV = -Infinity;
      p.parts.forEach((id, i) => {
        const v = partValue(run, id, m);
        if (v > bestV) {
          bestV = v;
          idx = i;
        }
      });
      if (run.bin.length > 20 && bestV < 3) idx = null;
    }
    check(m, 'takeRewardPart', takeRewardPart(run, idx));
  }
  if (p.trinkets.length > 0 && !p.trinketTaken) {
    const idx = roll(m) < EXPLORE ? pickIdx(m, p.trinkets.length) : 0;
    check(m, 'takeRewardTrinket', takeRewardTrinket(run, idx));
  }
  check(m, 'leaveNode', leaveNode(run));
}

// ---------- Events ----------

/** Preferred choice index per event id; anything else falls back to the choice with no HP loss. */
const EVENT_PREF: Record<string, number> = {
  'sprocket-blueprint': 0,
  'sprocket-pipe': 1,
  'sprocket-nap': 1,
  journal: 0,
  'oil-merchant': 2,
  automaton: 1,
  'gear-gamble': 1,
  'steam-bath': 1,
  'rusted-shrine': 0,
  'mirror-clock': 1,
  'toll-gate': 0,
  choir: 0,
  'collapsed-stair': 1,
  apprentice: 0,
  lantern: 1,
  'pressure-leak': 0,
  'hour-ghost': 1,
  'scrap-heap': 0,
  'old-forge': 0,
  teacup: 0,
  'ticking-box': 1,
  lamplighter: 1,
};

const HP_LOSS = /lose \d+ (max )?hp/i;

function eventChoice(run: RunState, eventId: string): number {
  const def = EVENTS[eventId];
  if (!def) return 0;
  const ok = (i: number): boolean => {
    const c = def.choices[i];
    return !!c && (!c.available || c.available(run));
  };
  let pref = EVENT_PREF[eventId];
  const low = run.hp / run.maxHp < 0.5;
  if (low && (eventId === 'sprocket-nap' || eventId === 'steam-bath' || eventId === 'teacup')) pref = 0;
  if (eventId === 'oil-merchant' && run.hp / run.maxHp < 0.6 && run.cogs >= 30) pref = 0;
  if (eventId === 'automaton' && run.hp / run.maxHp >= 0.6) pref = 0;
  if (pref !== undefined && ok(pref) && !(HP_LOSS.test(def.choices[pref].detail) && run.hp / run.maxHp < 0.5)) return pref;
  for (let i = 0; i < def.choices.length; i++) if (ok(i) && !HP_LOSS.test(def.choices[i].detail)) return i;
  for (let i = 0; i < def.choices.length; i++) if (ok(i)) return i;
  return 0;
}

export function doEvent(run: RunState, m: BotMemory): void {
  const p = run.pending;
  if (!p || p.kind !== 'event') return;
  if (p.needsPart) {
    const filter: Family | undefined = p.partFilter;
    let pool = run.bin.filter((x) => (!filter || PARTS[x.defId]?.family === filter) && (p.needsPart !== 'upgrade' || !x.plus));
    if (pool.length === 0) pool = run.bin;
    let uid: number | null = null;
    if (p.needsPart === 'upgrade') uid = mostFired(run, m, false, pool);
    else if (p.needsPart === 'duplicate') uid = mostFired(run, m, true, pool);
    else uid = weakestStarter(run, m, pool) ?? weakestAny(run, m, pool);
    if (uid === null) uid = pool[0]?.uid ?? null;
    if (uid !== null) check(m, 'eventPickPart', eventPickPart(run, uid));
    if (run.pending && run.pending.kind === 'event' && run.pending.needsPart) return; // caller guards against loops
  } else if (p.result === undefined) {
    const out = chooseEvent(run, eventChoice(run, p.eventId));
    check(m, 'chooseEvent', out !== null);
    const q = run.pending;
    if (q && q.kind === 'event' && q.needsPart) return;
  }
  check(m, 'leaveNode', leaveNode(run));
}

// ---------- Shop, forge, oil ----------

export function doShop(run: RunState, m: BotMemory): void {
  for (let guard = 0; guard < 20; guard++) {
    const p = run.pending;
    if (!p || p.kind !== 'shop') break;
    let best = -1;
    let bestV = 0;
    p.stock.forEach((it, i) => {
      if (it.sold || it.price > run.cogs) return;
      let v = 0;
      if (it.kind === 'part' && it.id) v = partValue(run, it.id, m) / Math.max(1, it.price / 45);
      else if (it.kind === 'trinket' && it.id) v = TRINKETS[it.id]?.rarity === 'boss' ? 0 : 2.2 / Math.max(1, it.price / 100);
      else if (it.kind === 'oil') v = run.hp / run.maxHp < 0.6 ? 3 : 0;
      else return; // removal is handled below
      if (v > bestV + 1e-9) {
        bestV = v;
        best = i;
      }
    });
    if (best >= 0) {
      if (!check(m, 'shopBuy', shopBuy(run, best))) break;
      continue;
    }
    const removal = p.stock.find((it) => it.kind === 'removal');
    const weak = weakestStarter(run, m);
    if (removal && !removal.sold && removal.price <= run.cogs && run.bin.length > 9 && weak !== null) {
      if (!check(m, 'shopRemove', shopRemove(run, weak))) break;
      continue;
    }
    break;
  }
  check(m, 'leaveNode', leaveNode(run));
}

export function doForge(run: RunState, m: BotMemory): void {
  const weak = weakestStarter(run, m);
  if (run.bin.length > 14 && weak !== null) check(m, 'forgeRemove', forgeRemove(run, weak));
  else {
    const uid = mostFired(run, m, false);
    if (uid !== null) check(m, 'forgeUpgrade', forgeUpgrade(run, uid));
  }
  check(m, 'leaveNode', leaveNode(run));
}

export function doOil(run: RunState, m: BotMemory): void {
  if (run.hp / run.maxHp < 0.7) check(m, 'oilRepair', oilRepair(run));
  else check(m, 'oilPolish', oilPolish(run));
  check(m, 'leaveNode', leaveNode(run));
}
