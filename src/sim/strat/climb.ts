// The climb driver: plays a whole v2 run (sections, hours, roaming elites, workbench, trader, oil, the bell) through
// the real run API, with a route policy deciding where to walk. Combat is the v2 expert for every route policy.
// Deterministic: no clock, no Math.random.
import { PARTS } from '../../core/content/parts';
import { abandonRun, leaveNode, newRun } from '../../core/run';
import { barter, barterPrice, fuse, fuseCandidates, PART_VALUE, polish, removeCost, rest, UPGRADE_SCRAP, workbenchRemove, workbenchUpgrade } from '../../core/rooms';
import { elitesNext, hoursLeft, moveTo, pickLock, ringBell, useKey } from '../../core/section';
import { scrapOf } from '../../core/rewards';
import type { Passage, Room, RunConfig, RunState } from '../../core/types';
import { check, newMemory } from '../runbot';
import type { BotMemory } from '../runbot';
import type { Hooks } from './drive';
import { playCombat } from './drive';
import type { Policy } from './combat';
import { expertRun, keep, strongest, takeBar, trinketValue, value, weakest } from './runbot';

export type RoutePolicy = 'expert' | 'rusher' | 'grinder';

const STEP_CAP = 4000;

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

/** Take one step toward `target` along a shortest path, preferring a step no elite will meet when `avoidElites`. */
function walkToward(run: RunState, m: BotMemory, target: string, allowLocked: boolean, avoidElites: boolean): boolean {
  const here = run.roomId as string;
  const dist = distances(run, target, allowLocked);
  const dHere = dist.get(here);
  if (dHere === undefined || dHere === 0) return false;
  const cands = steps(run, here, allowLocked).filter((s) => (dist.get(s.to) ?? 99) === dHere - 1);
  if (!cands.length) return false;
  let pickStep = cands[0];
  if (avoidElites) {
    const safe = cands.find((s) => !eliteDanger(run, s.to));
    if (safe) pickStep = safe;
  }
  if (pickStep.locked) {
    if ((run.keys ?? 0) > 0) check(m, 'useKey', useKey(run, pickStep.passage));
    else if (!check(m, 'pickLock', pickLock(run, pickStep.passage))) return false;
    // picking a lock spends an hour and may start a fight or the warden; the walk continues next step
    if (run.phase !== 'section') return true;
    if ((run.section as { passages: Passage[] }).passages[pickStep.passage].locked) return false;
  }
  return check(m, 'moveTo', moveTo(run, pickStep.to));
}

// ---------- room screens ----------

function doWorkbench(run: RunState, m: BotMemory): void {
  const p = run.pending;
  if (!p || p.kind !== 'workbench') return;
  // Fuse two weak parts of one family and rarity into the next rarity (thins the bin and lifts quality).
  if (!p.usedFuse) {
    let best: { a: number; b: number; pick: number; gain: number } | null = null;
    const bin = run.bin;
    for (let i = 0; i < bin.length; i++) {
      for (let j = i + 1; j < bin.length; j++) {
        const da = PARTS[bin[i].defId];
        const db = PARTS[bin[j].defId];
        if (!da || !db || da.family !== db.family || da.rarity !== db.rarity || bin[i].plus || bin[j].plus) continue;
        if (da.rarity !== 'common' && da.rarity !== 'uncommon') continue;
        const res = fuseCandidates(run, bin[i].uid, bin[j].uid);
        if (!('candidates' in res)) continue;
        const vals = res.candidates.map((id) => value(run, id));
        const top = Math.max(...vals);
        const gain = top - Math.max(keep(run, bin[i]), keep(run, bin[j]));
        if (gain > 0.4 && (!best || gain > best.gain)) best = { a: bin[i].uid, b: bin[j].uid, pick: vals.indexOf(top), gain };
      }
    }
    if (best) check(m, 'fuse', fuse(run, best.a, best.b, best.pick));
  }
  if (!p.usedUpgrade) {
    const uid = strongest(run, m, false);
    const part = run.bin.find((b) => b.uid === uid);
    const def = part ? PARTS[part.defId] : undefined;
    if (part && def && scrapOf(run) >= UPGRADE_SCRAP[def.rarity] + 10) check(m, 'workbenchUpgrade', workbenchUpgrade(run, part.uid));
  }
  if (!p.usedRemove) {
    const w = weakest(run);
    if (w && w.v < 2 && run.bin.length > 8 && scrapOf(run) >= removeCost(run) + 10) check(m, 'workbenchRemove', workbenchRemove(run, w.uid));
  }
  check(m, 'leaveNode', leaveNode(run));
}

function doTrader(run: RunState, m: BotMemory): void {
  for (let guard = 0; guard < 12; guard++) {
    const p = run.pending;
    if (!p || p.kind !== 'trader') break;
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
    if (best < 0) break;
    if (!check(m, 'barter', barter(run, best, bestOffer))) break;
  }
  check(m, 'leaveNode', leaveNode(run));
}

function doOil(run: RunState, m: BotMemory, restBelow: number): void {
  const p = run.pending;
  if (p && p.kind === 'oil' && !p.done) {
    const need = run.hp / run.maxHp < restBelow && hoursLeft(run) >= 2;
    if (need) check(m, 'rest', rest(run));
    else check(m, 'polish', polish(run));
  }
  // resting spends an hour: a collision or midnight may already have moved the run on
  if (run.phase === 'oil') check(m, 'leaveNode', leaveNode(run));
}

// ---------- routes ----------

const clearedFights = (run: RunState): number => (run.section as { rooms: Room[] }).rooms.filter((r) => r.kind === 'fight' && r.cleared).length;

function atDoorRing(run: RunState, m: BotMemory): void {
  check(m, 'ringBell', ringBell(run));
}

function routeRusher(run: RunState, m: BotMemory): void {
  const door = (run.section as { door: string }).door;
  if (run.roomId === door) return atDoorRing(run, m);
  if (!walkToward(run, m, door, false, false)) check(m, 'walk', false);
}

function routeGrinder(run: RunState, m: BotMemory): void {
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
  if (best) {
    if (!walkToward(run, m, best.id, false, false)) check(m, 'walk', false);
    return;
  }
  if (run.roomId === s.door) return atDoorRing(run, m);
  if (!walkToward(run, m, s.door, false, false)) check(m, 'walk', false);
}

/** Route knobs of the expert (tuned in B8.5): hours it tries to keep for the bell, fights it wants cleared per act. */
export const EXPERT_KNOBS = { reserve: 4, need: [4, 5, 6], hp: 0.8 };

/** Is the machine ready for the warden? Enough fights cleared (salvage taken) and healthy. */
function ready(run: RunState): boolean {
  return clearedFights(run) >= EXPERT_KNOBS.need[run.act - 1] && run.hp / run.maxHp >= EXPERT_KNOBS.hp;
}

function benchUseful(run: RunState): boolean {
  const w = weakest(run);
  const scrap = scrapOf(run);
  return scrap >= 45 || (!!w && w.v < 2 && run.bin.length > 8 && scrap >= removeCost(run) + 10);
}

function routeExpert(run: RunState, m: BotMemory): void {
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
    if (ready(run) || !best || bestS < 0.5) return atDoorRing(run, m);
  }
  if (best && !(ready(run) && !atDoor && bestS < 1.2)) {
    const viaLock = best.kind === 'vault';
    if (walkToward(run, m, best.id, viaLock, hpFrac < 0.65)) return;
  }
  if (atDoor) return atDoorRing(run, m);
  if (!walkToward(run, m, s.door, false, hpFrac < 0.65)) check(m, 'walk', false);
}

// ---------- the driver ----------

export interface ClimbResult {
  won: boolean;
  /** The furthest act reached (1..3). */
  act: number;
  run: RunState;
  illegal: string[];
}

export function playClimb(cfg: RunConfig, botSeed: number, route: RoutePolicy, combat: Policy, hooks?: Hooks): ClimbResult {
  const run = newRun(cfg);
  const m = newMemory(botSeed);
  const restBelow = route === 'expert' ? 0.85 : route === 'grinder' ? 0.5 : 0;
  let eventStuck = 0;
  for (let step = 0; step < STEP_CAP && run.phase !== 'victory' && run.phase !== 'defeat'; step++) {
    switch (run.phase) {
      case 'section':
        if (route === 'rusher') routeRusher(run, m);
        else if (route === 'grinder') routeGrinder(run, m);
        else routeExpert(run, m);
        break;
      case 'combat':
        playCombat(run, m, combat, hooks);
        break;
      case 'reward':
        expertRun.doReward(run, m);
        break;
      case 'event':
        expertRun.doEvent(run, m);
        if (run.phase === 'event' && ++eventStuck > 5) abandonRun(run);
        break;
      case 'workbench':
        doWorkbench(run, m);
        break;
      case 'trader':
        doTrader(run, m);
        break;
      case 'oil':
        doOil(run, m, restBelow);
        break;
      default:
        abandonRun(run);
    }
    if (run.phase !== 'event') eventStuck = 0;
    if (m.illegal.length > 0) break;
  }
  if (run.phase !== 'victory' && run.phase !== 'defeat') abandonRun(run);
  return { won: run.phase === 'victory' && !run.flags.abandoned, act: run.act, run, illegal: m.illegal };
}
