// The climb bots' decisions as data: given a run state (read only), `decide` returns the next Action. Two executors
// carry the actions out: the simulator (climb.ts, straight on the core) and the in-game autoplay (src/app/autoplay.ts,
// through the controller's player actions). Deterministic: no clock, no Math.random. `decide` never mutates the run it
// is given (fuse candidates are previewed on a clone, which rolls the same candidates as the real call).
import { PARTS } from '../../core/content/parts';
import { barterPrice, fuseCandidates, PART_VALUE, removeCost, UPGRADE_SCRAP } from '../../core/rooms';
import { elitesNext, hoursLeft } from '../../core/section';
import { scrapOf } from '../../core/rewards';
import type { Passage, Room, RunState } from '../../core/types';
import { eventChoice } from '../runbot';
import type { BotMemory } from '../runbot';
import { eventPartUid, keep, salvageKeep, strongest, takeBar, trinketValue, value, weakest } from './runbot';

export type RoutePolicy = 'expert' | 'rusher' | 'grinder';

export type Action =
  | { t: 'move'; to: string }
  | { t: 'ring' }
  | { t: 'key'; passage: number }
  | { t: 'lock'; passage: number }
  | { t: 'leave' }
  | { t: 'salvage'; keep: number[] }
  | { t: 'trinket'; index: number }
  | { t: 'rewardPart'; index: number | null }
  | { t: 'choose'; index: number }
  | { t: 'pickPart'; uid: number }
  | { t: 'upgrade'; uid: number }
  | { t: 'remove'; uid: number }
  | { t: 'fuse'; a: number; b: number; pick: number }
  | { t: 'barter'; index: number; offer: number | null }
  | { t: 'rest' }
  | { t: 'polish' }
  | { t: 'abandon' };

/** Route knobs of the expert (tuned in B8.5): hours it tries to keep for the bell, fights it wants cleared per act. */
export const EXPERT_KNOBS = { reserve: 4, need: [4, 5, 6], hp: 0.8 };

// ---------- the graph ----------

interface Step {
  to: string;
  passage: number;
  locked: boolean;
}

function steps(run: RunState, from: string, allowLocked: boolean): Step[] {
  const out: Step[] = [];
  (run.section as { passages: Passage[] }).passages.forEach((p, i) => {
    if (p.locked && !allowLocked) return;
    if (p.a === from) out.push({ to: p.b, passage: i, locked: !!p.locked });
    else if (p.b === from) out.push({ to: p.a, passage: i, locked: !!p.locked });
  });
  return out;
}

/** BFS distances (in moves) from `from`; with `allowLocked`, a locked passage counts one move (the lock is paid separately). */
function distances(run: RunState, from: string, allowLocked: boolean): Map<string, number> {
  const d = new Map<string, number>([[from, 0]]);
  const q = [from];
  for (let i = 0; i < q.length; i++) {
    for (const s of steps(run, q[i], allowLocked)) {
      if (!d.has(s.to)) {
        d.set(s.to, (d.get(q[i]) as number) + 1);
        q.push(s.to);
      }
    }
  }
  return d;
}

/** Elites that would meet the player in `id` after a move there (in the room now, or stepping into it). */
function eliteDanger(run: RunState, id: string): boolean {
  return elitesNext(run).some((e) => e.at === id || e.next === id);
}

/** The next action on a shortest path to `target` (a move, or the key or lock for a locked passage), or null. */
function walkToward(run: RunState, target: string, allowLocked: boolean, avoidElites: boolean): Action | null {
  const here = run.roomId as string;
  const dist = distances(run, target, allowLocked);
  const dHere = dist.get(here);
  if (dHere === undefined || dHere === 0) return null;
  const cands = steps(run, here, allowLocked).filter((s) => (dist.get(s.to) ?? 99) === dHere - 1);
  if (!cands.length) return null;
  let pickStep = cands[0];
  if (avoidElites) {
    const safe = cands.find((s) => !eliteDanger(run, s.to));
    if (safe) pickStep = safe;
  }
  if (pickStep.locked) return (run.keys ?? 0) > 0 ? { t: 'key', passage: pickStep.passage } : { t: 'lock', passage: pickStep.passage };
  return { t: 'move', to: pickStep.to };
}

// ---------- routes ----------

const ABANDON: Action = { t: 'abandon' };
const clearedFights = (run: RunState): number => (run.section as { rooms: Room[] }).rooms.filter((r) => r.kind === 'fight' && r.cleared).length;

function routeRusher(run: RunState): Action {
  const door = (run.section as { door: string }).door;
  if (run.roomId === door) return { t: 'ring' };
  return walkToward(run, door, false, false) ?? ABANDON;
}

function routeGrinder(run: RunState): Action {
  const s = run.section as { rooms: Room[]; door: string };
  const d = distances(run, run.roomId as string, false);
  let best: Room | null = null;
  let bestD = Infinity;
  for (const r of s.rooms) {
    if (r.kind !== 'fight' || r.cleared) continue;
    const dd = d.get(r.id);
    if (dd === undefined || dd === 0) continue;
    if (dd < bestD) {
      bestD = dd;
      best = r;
    }
  }
  if (best) return walkToward(run, best.id, false, false) ?? ABANDON;
  if (run.roomId === s.door) return { t: 'ring' };
  return walkToward(run, s.door, false, false) ?? ABANDON;
}

/** Is the machine ready for the warden? Enough fights cleared (salvage taken) and healthy. */
function ready(run: RunState): boolean {
  return clearedFights(run) >= EXPERT_KNOBS.need[run.act - 1] && run.hp / run.maxHp >= EXPERT_KNOBS.hp;
}

function benchUseful(run: RunState): boolean {
  const w = weakest(run);
  const scrap = scrapOf(run);
  return scrap >= 45 || (!!w && w.v < 2 && run.bin.length > 8 && scrap >= removeCost(run) + 10);
}

function routeExpert(run: RunState): Action {
  const s = run.section as { rooms: Room[]; door: string };
  const here = run.roomId as string;
  const H = hoursLeft(run);
  const hpFrac = run.hp / run.maxHp;
  const dDoor = distances(run, s.door, false);
  const dHere = distances(run, here, false);
  const dKey = (run.keys ?? 0) > 0 ? distances(run, here, true) : dHere;
  let best: Room | null = null;
  let bestS = 0;
  for (const r of s.rooms) {
    if (r.id === here || r.kind === 'entry' || r.kind === 'door') continue;
    const viaLock = r.kind === 'vault';
    const dh = (viaLock ? dKey : dHere).get(r.id);
    const back = dDoor.get(r.id);
    if (dh === undefined || back === undefined) continue;
    if (dh + back > H - EXPERT_KNOBS.reserve) continue; // keep hours in hand for the door and the bell
    let v = 0;
    switch (r.kind) {
      case 'fight':
        if (r.cleared) break;
        v = hpFrac < 0.4 ? 1 : 3.2;
        break;
      case 'oil':
        if (r.used) break;
        v = hpFrac < 0.85 ? 6 : 0.8;
        break;
      case 'workbench':
        v = benchUseful(run) ? (scrapOf(run) >= 70 ? 5.5 : 3.5) : 0.2;
        break;
      case 'trader':
        v = scrapOf(run) >= 80 ? 4.5 : scrapOf(run) >= 55 ? 3 : 0.2;
        break;
      case 'event':
        if (r.cleared) break;
        v = hpFrac < 0.4 ? 0.5 : 2.5;
        break;
      case 'vault':
        v = !r.cleared && (run.keys ?? 0) > 0 && hpFrac > 0.7 ? 5 : 0;
        break;
    }
    if (v <= 0) continue;
    if (eliteDanger(run, r.id) && hpFrac < 0.65) v -= 2.5;
    const sc = v / dh;
    if (sc > bestS) {
      bestS = sc;
      best = r;
    }
  }
  const atDoor = here === s.door;
  if (atDoor) {
    if (ready(run) || !best || bestS < 0.5) return { t: 'ring' };
  }
  if (best && !(ready(run) && !atDoor && bestS < 1.2)) {
    const a = walkToward(run, best.id, best.kind === 'vault', hpFrac < 0.65);
    if (a) return a;
  }
  if (atDoor) return { t: 'ring' };
  return walkToward(run, s.door, false, hpFrac < 0.65) ?? ABANDON;
}

// ---------- the room screens ----------

function decideWorkbench(run: RunState, m: BotMemory): Action {
  const p = run.pending;
  if (!p || p.kind !== 'workbench') return { t: 'leave' };
  if (!p.usedFuse) {
    // Fuse two weak parts of one family and rarity into the next rarity (thins the bin and lifts quality). The
    // candidates are previewed on a clone: the same rng state rolls the same ones when the real fuse asks.
    let best: { a: number; b: number; pick: number; gain: number } | null = null;
    const bin = run.bin;
    for (let i = 0; i < bin.length; i++) {
      for (let j = i + 1; j < bin.length; j++) {
        const da = PARTS[bin[i].defId];
        const db = PARTS[bin[j].defId];
        if (!da || !db || da.family !== db.family || da.rarity !== db.rarity || bin[i].plus || bin[j].plus) continue;
        if (da.rarity !== 'common' && da.rarity !== 'uncommon') continue;
        const res = fuseCandidates(JSON.parse(JSON.stringify(run)) as RunState, bin[i].uid, bin[j].uid);
        if (!('candidates' in res)) continue;
        const vals = res.candidates.map((id) => value(run, id));
        const top = Math.max(...vals);
        const gain = top - Math.max(keep(run, bin[i]), keep(run, bin[j]));
        if (gain > 0.4 && (!best || gain > best.gain)) best = { a: bin[i].uid, b: bin[j].uid, pick: vals.indexOf(top), gain };
      }
    }
    if (best) return { t: 'fuse', a: best.a, b: best.b, pick: best.pick };
  }
  if (!p.usedUpgrade) {
    const uid = strongest(run, m, false);
    const part = run.bin.find((b) => b.uid === uid);
    const def = part ? PARTS[part.defId] : undefined;
    if (part && def && scrapOf(run) >= UPGRADE_SCRAP[def.rarity] + 10) return { t: 'upgrade', uid: part.uid };
  }
  if (!p.usedRemove) {
    const w = weakest(run);
    if (w && w.v < 2 && run.bin.length > 8 && scrapOf(run) >= removeCost(run) + 10) return { t: 'remove', uid: w.uid };
  }
  return { t: 'leave' };
}

function decideTrader(run: RunState): Action {
  const p = run.pending;
  if (!p || p.kind !== 'trader') return { t: 'leave' };
  const w = weakest(run);
  let best = -1;
  let bestOffer: number | null = null;
  let bestV = 0;
  p.stock.forEach((it, i) => {
    if (it.sold) return;
    let v = 0;
    let offer: number | null = null;
    if (it.kind === 'part' && it.id) {
      const pv = value(run, it.id);
      if (pv < takeBar(run) + 0.3) return;
      // pay with the weakest part when it is worth less than the item and low in value
      const wDef = w ? PARTS[run.bin.find((b) => b.uid === w.uid)?.defId ?? ''] : undefined;
      if (w && w.v < 2 && run.bin.length > 8 && wDef && PART_VALUE[wDef.rarity] <= it.value) offer = w.uid;
      v = pv;
    } else if (it.kind === 'trinket' && it.id) {
      const tv = trinketValue(run, it.id);
      if (tv < 2.2 || run.trinkets.includes(it.id)) return;
      v = tv;
    } else if (it.kind === 'oil') {
      if (run.hp / run.maxHp >= 0.6) return;
      v = 3;
    } else return;
    let offeredValue: number | null = null;
    if (offer !== null) {
      const d = PARTS[run.bin.find((b) => b.uid === offer)?.defId ?? ''];
      offeredValue = d ? PART_VALUE[d.rarity] : null;
    }
    const price = barterPrice(run, it, it.kind === 'oil' ? null : offeredValue);
    if (price > scrapOf(run)) return;
    const ratio = v / Math.max(1, price / 40);
    if (ratio > bestV) {
      bestV = ratio;
      best = i;
      bestOffer = offer;
    }
  });
  return best < 0 ? { t: 'leave' } : { t: 'barter', index: best, offer: bestOffer };
}

function decideOil(run: RunState, restBelow: number): Action {
  const p = run.pending;
  if (p && p.kind === 'oil' && !p.done) {
    return run.hp / run.maxHp < restBelow && hoursLeft(run) >= 2 ? { t: 'rest' } : { t: 'polish' };
  }
  return { t: 'leave' };
}

function decideReward(run: RunState): Action {
  const p = run.pending;
  if (p && p.kind === 'salvage') {
    if (!p.done) return { t: 'salvage', keep: salvageKeep(run) };
    if (p.trinkets.length > 0 && !p.trinketTaken) return { t: 'trinket', index: bestTrinket(run, p.trinkets) };
    return { t: 'leave' };
  }
  if (p && p.kind === 'reward') {
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
      return { t: 'rewardPart', index: idx };
    }
    if (p.trinkets.length > 0 && !p.trinketTaken) return { t: 'trinket', index: bestTrinket(run, p.trinkets) };
  }
  return { t: 'leave' };
}

function bestTrinket(run: RunState, ids: string[]): number {
  let idx = 0;
  let bestV = -Infinity;
  ids.forEach((id, i) => {
    const v = trinketValue(run, id);
    if (v > bestV) {
      bestV = v;
      idx = i;
    }
  });
  return idx;
}

function decideEvent(run: RunState, m: BotMemory): Action {
  const p = run.pending;
  if (!p || p.kind !== 'event') return { t: 'leave' };
  if (p.needsPart) {
    const uid = eventPartUid(run, m);
    return uid !== null ? { t: 'pickPart', uid } : ABANDON;
  }
  if (p.result === undefined) return { t: 'choose', index: eventChoice(run, p.eventId) };
  return { t: 'leave' };
}

/** The next action for a climb run that is not in combat. `restBelow` is the HP fraction under which an oil station rests. */
export function decide(run: RunState, route: RoutePolicy, m: BotMemory): Action {
  const restBelow = route === 'expert' ? 0.85 : route === 'grinder' ? 0.5 : 0;
  switch (run.phase) {
    case 'section':
      return route === 'rusher' ? routeRusher(run) : route === 'grinder' ? routeGrinder(run) : routeExpert(run);
    case 'reward':
      return decideReward(run);
    case 'event':
      return decideEvent(run, m);
    case 'workbench':
      return decideWorkbench(run, m);
    case 'trader':
      return decideTrader(run);
    case 'oil':
      return decideOil(run, restBelow);
    default:
      return ABANDON;
  }
}
