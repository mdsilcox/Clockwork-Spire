// Shared pieces of the strategy bots: incoming damage, one-preview scoring parts, swap candidates.
// Copied from src/sim/bot.ts where noted so that file stays untouched. Deterministic: no clock, no Math.random.
import { cloneCombat } from '../../core/combat';
import { ENEMIES } from '../../core/content/enemies';
import { runMachine } from '../../core/machine';
import { CELLS, MAINSPRING } from '../../core/types';
import type { CombatState, TurnPreview } from '../../core/types';

export type { BotTurn } from '../bot';

/** Counts machine previews made by the strategy bots (for speed reporting). */
export const stratStats = { previews: 0 };

export function incomingOf(c: CombatState, i: number): number {
  const e = c.enemies[i];
  if (!e || e.hp <= 0 || e.intent.kind !== 'attack') return 0;
  return ((e.intent.amount ?? 0) + (e.statuses.strength ?? 0)) * (e.intent.hits ?? 1);
}

export function totalIncoming(c: CombatState): number {
  let t = 0;
  for (let i = 0; i < c.enemies.length; i++) t += incomingOf(c, i);
  return t;
}

/** HP the enemies still have to lose: shell, current HP and every later boss phase. */
export function remainingHp(c: CombatState): number {
  let t = 0;
  for (const e of c.enemies) {
    if (e.hp <= 0) continue;
    t += e.hp + e.shell;
    const ph = ENEMIES[e.defId]?.phases;
    if (ph) for (let k = e.phase + 1; k < ph.length; k++) t += ph[k].hp;
  }
  return t;
}

/** The enemy with the biggest shown attack (ties: lowest index). */
export function bestTarget(c: CombatState): number {
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

/** v1's six swap candidates (nearest vs farthest, then neighbors by distance). */
export function swapCandidates(c: CombatState): [number, number][] {
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

/** Every pair of occupied cells (the expert tries them all, cheaply, before the lookahead). */
export function allSwapPairs(c: CombatState): [number, number][] {
  const occ: number[] = [];
  for (let i = 0; i < CELLS; i++) if (i !== MAINSPRING && c.board[i]) occ.push(i);
  const out: [number, number][] = [];
  for (let i = 0; i < occ.length; i++) for (let j = i + 1; j < occ.length; j++) out.push([occ[i], occ[j]]);
  return out;
}

/** What one Run of the current board does: the preview numbers and the post-machine copy. */
export interface Ran {
  pre: TurnPreview;
  sim: CombatState;
  /** Damage dealt, capped at each enemy's HP. */
  dealt: number;
  /** Enemies the machine kills, and their summed shown attack. */
  kills: number;
  killedIncoming: number;
  incoming: number;
  plating: number;
}

export function ran(c: CombatState): Ran {
  stratStats.previews += 1;
  const sim = cloneCombat(c);
  const pre = runMachine(sim, []);
  let dealt = 0;
  let kills = 0;
  let killedIncoming = 0;
  for (let i = 0; i < c.enemies.length; i++) {
    const e = c.enemies[i];
    if (e.hp <= 0) continue;
    dealt += Math.min(pre.damageByEnemy[i] ?? 0, e.hp);
    if (sim.enemies[i] && sim.enemies[i].hp <= 0) {
      kills += 1;
      killedIncoming += incomingOf(c, i);
    }
  }
  return { pre, sim, dealt, kills, killedIncoming, incoming: totalIncoming(c), plating: sim.plating };
}

/** Charge held on the board after the run (springs keep it across turns). */
export function chargeOnBoard(sim: CombatState): number {
  let t = 0;
  for (const p of sim.board) if (p) t += p.charge;
  return t;
}

/** Cost of overwriting a part that holds charge (copied from v1's replacement penalty). */
export function replacePenalty(old: { charge: number; plus: boolean } | null): number {
  return old ? 0.5 * old.charge + (old.plus ? 0.5 : 0) : 0;
}
