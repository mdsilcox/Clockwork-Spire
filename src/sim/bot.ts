// The combat bot: greedy search over placements using the real machine (docs/rules.md section 7).
// Deterministic: ties go to the lowest hand index, then the lowest cell. No clock, no Math.random.
import { cloneCombat, placePart, setTarget, swapParts } from '../core/combat';
import { refOf, setOrder } from '../core/frames';
import { runMachine } from '../core/machine';
import { CELLS, MAINSPRING } from '../core/types';
import type { CombatState, TargetRef } from '../core/types';

export interface BotTurn {
  /** Applied in order; `hand` indexes the hand as it is when that placement is made. */
  placements: { hand: number; cell: number }[];
  swap?: [number, number];
  /** v1 shortcut: aim at this enemy (its default order). Used when `order` is absent. */
  target: number;
  /** v2: the target order (rules 2.3). Wins over `target`. */
  order?: TargetRef[];
}

/** Apply a turn's swap and aim (placements are applied by the caller, in order, before this). */
export function applyAim(c: CombatState, turn: BotTurn): void {
  if (turn.order) setOrder(c, turn.order);
  else setTarget(c, turn.target);
}

/** The acting part of enemy `i` that hits hardest or punishes Plating (Pierce, Siphon, Corrode) first. */
export function worstPart(c: CombatState, i: number): string | null {
  const e = c.enemies[i];
  if (!e || e.hp <= 0) return null;
  let best: string | null = null;
  let bestRank = 0;
  for (const it of e.intents) {
    if (it.partId === 'core') continue;
    let rank = 0;
    for (const a of it.actions) {
      const n = (a.amount ?? 0) * (a.hits ?? 1);
      if (a.kind === 'pierce' || a.kind === 'siphon') rank += 1000 + n;
      else if (a.kind === 'corrode') rank += 1000 + (a.pct ?? 0);
      else if (a.kind === 'attack') rank += n;
    }
    if (rank > bestRank) {
      bestRank = rank;
      best = it.partId;
    }
  }
  return best;
}

/** v1 greedy's order: the enemy's worst acting part, then its core. */
export function simpleOrder(c: CombatState, i: number): TargetRef[] {
  const w = worstPart(c, i);
  return w ? [refOf(i, w), refOf(i, 'core')] : [refOf(i, 'core')];
}

/** Counts machine previews made by the bot (for speed reporting). */
export const botStats = { previews: 0 };

function incomingOf(c: CombatState, i: number): number {
  const e = c.enemies[i];
  if (!e || e.hp <= 0 || e.intent.kind !== 'attack') return 0;
  return ((e.intent.amount ?? 0) + (e.statuses.strength ?? 0)) * (e.intent.hits ?? 1);
}

function totalIncoming(c: CombatState): number {
  let t = 0;
  for (let i = 0; i < c.enemies.length; i++) t += incomingOf(c, i);
  return t;
}

/** Score of Run now: one real machine run on a copy. */
export function score(c: CombatState): number {
  botStats.previews += 1;
  const sim = cloneCombat(c);
  const pre = runMachine(sim, []);
  let s = 0;
  for (let i = 0; i < c.enemies.length; i++) {
    const e = c.enemies[i];
    if (e.hp <= 0) continue;
    const dealt = Math.min(pre.damageByEnemy[i] ?? 0, e.hp);
    s += dealt;
    if (sim.enemies[i] && sim.enemies[i].hp <= 0) s += 10 + incomingOf(c, i);
  }
  // v2: damage to enemy parts counts, and a part that breaks cancels its intent.
  for (const key in pre.byTarget) {
    if (key.endsWith('.core')) continue;
    const t = pre.byTarget[key];
    s += 0.7 * t.damage + (t.breaks ? 4 : 0);
  }
  const incoming = totalIncoming(c);
  const plating = sim.plating;
  s += Math.min(plating, incoming) + 0.2 * Math.max(0, plating - incoming);
  for (const p of sim.board) if (p) s += 1.5 * p.charge;
  s += 0.3 * Math.min(pre.pressureAfter, 18);
  if (pre.overpressure) s -= 15;
  return s;
}

function bestTarget(c: CombatState): number {
  let best = -1;
  let bestIn = -1;
  for (let i = 0; i < c.enemies.length; i++) {
    if (c.enemies[i].hp <= 0) continue;
    const inc = incomingOf(c, i);
    if (inc > bestIn) {
      bestIn = inc;
      best = i;
    }
  }
  return best < 0 ? 0 : best;
}

function dist(cellIdx: number): number {
  return Math.abs((cellIdx % 5) - (MAINSPRING % 5)) + Math.abs(Math.floor(cellIdx / 5) - Math.floor(MAINSPRING / 5));
}

function swapCandidates(c: CombatState): [number, number][] {
  const occ: number[] = [];
  for (let i = 0; i < CELLS; i++) if (i !== MAINSPRING && c.board[i]) occ.push(i);
  occ.sort((a, b) => dist(a) - dist(b) || a - b);
  const n = occ.length;
  const out: [number, number][] = [];
  const seen = new Set<string>();
  const add = (a: number, b: number): void => {
    if (a === undefined || b === undefined || a === b) return;
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    if (seen.has(key) || out.length >= 6) return;
    seen.add(key);
    out.push([a, b]);
  };
  for (let i = 0; i < 3; i++) add(occ[i], occ[n - 1 - i]);
  for (let i = 0; i < 3; i++) add(occ[i], occ[i + 1]);
  return out;
}

export function chooseTurn(c: CombatState): BotTurn {
  const work = cloneCombat(c);
  setTarget(work, bestTarget(work));
  const placements: { hand: number; cell: number }[] = [];
  let base = score(work);

  while (work.placementsLeft > 0 && work.hand.length > 0) {
    let bestS = base;
    let bestH = -1;
    let bestC = -1;
    for (let h = 0; h < work.hand.length; h++) {
      for (let cell = 0; cell < CELLS; cell++) {
        if (cell === MAINSPRING) continue;
        const old = work.board[cell];
        const trial = cloneCombat(work);
        if (!placePart(trial, h, cell)) continue;
        let s = score(trial);
        if (old) s -= 0.5 * old.charge + (old.plus ? 0.5 : 0);
        if (s > bestS + 1e-9) {
          bestS = s;
          bestH = h;
          bestC = cell;
        }
      }
    }
    if (bestH < 0) break;
    placePart(work, bestH, bestC);
    placements.push({ hand: bestH, cell: bestC });
    base = score(work);
  }

  let swap: [number, number] | undefined;
  let bestSwap = base;
  for (const [a, b] of swapCandidates(work)) {
    const trial = cloneCombat(work);
    if (!swapParts(trial, a, b)) continue;
    const s = score(trial);
    if (s > bestSwap + 1e-9) {
      bestSwap = s;
      swap = [a, b];
    }
  }
  if (swap) swapParts(work, swap[0], swap[1]);

  let target = bestTarget(work);
  let bestT = -Infinity;
  for (let i = 0; i < work.enemies.length; i++) {
    if (work.enemies[i].hp <= 0) continue;
    const trial = cloneCombat(work);
    setTarget(trial, i);
    const s = score(trial) + 0.01 * incomingOf(work, i);
    if (s > bestT + 1e-9) {
      bestT = s;
      target = i;
    }
  }
  const order = simpleOrder(work, target);
  return swap ? { placements, swap, target, order } : { placements, target, order };
}
