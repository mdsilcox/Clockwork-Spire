// v2 combat policies on enemy machines (docs/rules.md 7.1): turtle, burst, expert and max-burst choose placements,
// a swap and a target order. Turtle and burst are the naive plans (cores first). The expert searches placements with
// a part-aware order, hill-climbs the order on its best states, then looks one turn ahead through the real enemy turn.
// Deterministic: no clock, no Math.random.
import { cloneCombat, placePart, runTurn, swapParts } from '../../core/combat';
import { frameOf, partDefOf } from '../../core/framelib';
import { canTarget, refOf, setOrder, targetables } from '../../core/frames';
import { initStreams, shuffle } from '../../core/rng';
import { CELLS, MAINSPRING } from '../../core/types';
import type { ActionDef, CombatState, TargetRef } from '../../core/types';
import { chooseTurn } from '../bot';
import type { BotTurn } from '../bot';
import { chargeOnBoard, stratStats, allSwapPairs, replacePenalty } from './common';
import { runMachine } from '../../core/machine';
import { beforeEnemyTurn } from '../../core/itemhooks';

export type V2Policy = (c: CombatState) => BotTurn;

// ---------- reading the enemy ----------

/** The actions of an intent; a legacy warden's core intent carries none, so read its v1 summary. */
function actionsOf(e: CombatState['enemies'][number], it: CombatState['enemies'][number]['intents'][number]): ActionDef[] {
  if (it.actions.length > 0 || it.partId !== 'core') return it.actions;
  const v = e.intent;
  if (v.kind === 'attack') return [{ kind: 'attack', amount: (v.amount ?? 0) + (v.alsoAttack ?? 0), hits: v.hits }];
  return [];
}

/** HP the shown intents would cost given `plating` (Corrode first, Pierce ignores Plating, Siphon strips it). */
export function lossFrom(c: CombatState, plating: number): number {
  let loss = 0;
  let p = plating;
  for (const e of c.enemies) {
    if (e.hp <= 0) continue;
    const str = e.statuses.strength ?? 0;
    for (const it of e.intents) {
      for (const a of actionsOf(e, it)) {
        const n = (a.amount ?? 0) * (a.hits ?? 1);
        if (a.kind === 'corrode') p -= Math.ceil(((a.pct ?? 0) / 100) * p);
        else if (a.kind === 'attack') {
          const d = n + str * (a.hits ?? 1);
          const soak = Math.min(p, d);
          p -= soak;
          loss += d - soak;
        } else if (a.kind === 'pierce') loss += n;
        else if (a.kind === 'siphon') {
          const take = Math.min(p, a.amount ?? 0);
          p -= take;
          loss += 0.5 * take; // it heals the enemy by that much
        }
      }
    }
  }
  return loss;
}

/** Damage the shown intents would do with no Plating at all. */
export function rawLoss(c: CombatState): number {
  return lossFrom(c, 0);
}

function intentDamage(c: CombatState, enemy: number, partId: string): number {
  const e = c.enemies[enemy];
  const it = e?.intents.find((i) => i.partId === partId);
  if (!it) return 0;
  let t = 0;
  for (const a of actionsOf(e, it)) {
    if (a.kind === 'attack' || a.kind === 'pierce') t += (a.amount ?? 0) * (a.hits ?? 1);
    else if (a.kind === 'corrode') t += 6;
    else if (a.kind === 'siphon') t += 6;
  }
  return t;
}

/** What breaking this part is worth: its cancelled damage over a couple of turns, passives, keystones, salvage. */
function breakValue(c: CombatState, enemy: number, partId: string, hpW: number): number {
  const e = c.enemies[enemy];
  const d = partDefOf(e, partId);
  let v = 1.5;
  v += 2 * hpW * intentDamage(c, enemy, partId);
  if (d?.passive) v += 4;
  if (d?.keystone) v += 5;
  if (d && d.actions.some((a) => a.kind === 'mend' || a.kind === 'rebuild' || a.kind === 'shell')) v += 2;
  return v;
}

/** What is left to do to the enemies, in HP-equivalent points (core, Shell, later phases, standing parts). */
export function remaining(c: CombatState, hpW: number): number {
  let t = 0;
  for (let i = 0; i < c.enemies.length; i++) {
    const e = c.enemies[i];
    if (e.hp <= 0) continue;
    t += e.hp + e.shell;
    const ph = frameOf(e)?.phases;
    if (ph) for (let k = e.phase + 1; k < ph.length; k++) for (const p of ph[k].parts) if (p.keystone) t += p.hp;
    for (const p of e.parts) if (!p.broken) t += (p.hp / Math.max(1, p.maxHp)) * breakValue(c, i, p.id, hpW);
  }
  return t;
}

// ---------- scoring one Run ----------

interface Ran2 {
  sim: CombatState;
  dealt: number;
  kills: number;
  killedIncoming: number;
  /** HP the remaining intents (after breaks) cost with the Plating made. */
  loss: number;
  /** HP the remaining intents would cost with no Plating. */
  raw: number;
  /** The same two numbers for the intents as shown before the machine ran (the naive bots plan against these). */
  lossShown: number;
  rawShown: number;
  partValue: number;
  plating: number;
  overpressure: boolean;
  pressureAfter: number;
}

function ran2(c: CombatState, hpW: number): Ran2 {
  stratStats.previews += 1;
  const sim = cloneCombat(c);
  const pre = runMachine(sim, []);
  beforeEnemyTurn(sim, []); // B10c.0: a powered Night Watchman fires before the enemies act (runTurn does the same), so the score counts its Strike
  let dealt = 0;
  let kills = 0;
  let killedIncoming = 0;
  let partValue = 0;
  for (let i = 0; i < c.enemies.length; i++) {
    const e = c.enemies[i];
    if (e.hp <= 0) continue;
    const s = sim.enemies[i];
    dealt += Math.min(Math.max(0, e.hp - Math.max(0, s.hp)), e.hp);
    if (s.hp <= 0) {
      kills += 1;
      for (const it of e.intents) killedIncoming += intentDamage(c, i, it.partId);
      continue;
    }
    for (const p of e.parts) {
      if (p.broken) continue;
      const sp = s.parts.find((x) => x.id === p.id);
      if (!sp) continue;
      const frac = (p.hp - Math.max(0, sp.hp)) / Math.max(1, p.maxHp);
      if (frac > 0) partValue += frac * breakValue(c, i, p.id, hpW);
    }
  }
  return { sim, dealt, kills, killedIncoming, loss: lossFrom(sim, sim.plating), raw: rawLoss(sim), lossShown: lossFrom(c, sim.plating), rawShown: rawLoss(c), partValue, plating: sim.plating, overpressure: pre.overpressure, pressureAfter: pre.pressureAfter };
}

const pressureTerms = (r: Ran2): number => 0.3 * Math.min(r.pressureAfter, 18) - (r.overpressure ? 15 : 0);

// ---------- orders ----------

/** Every living enemy's core, left to right (the naive plan; sealed cores drop out and Strikes fall back to the front). */
export function coreOrder(c: CombatState): TargetRef[] {
  const out: TargetRef[] = [];
  c.enemies.forEach((e, i) => {
    if (e.hp > 0) out.push(refOf(i, 'core'));
  });
  return out;
}

/** The part-aware default: parts that punish or hit hardest first (keystones early), then the cores. */
export function smartOrder(c: CombatState, hpW = 5): TargetRef[] {
  const scored: { ref: TargetRef; v: number }[] = [];
  c.enemies.forEach((e, i) => {
    if (e.hp <= 0) return;
    for (const p of e.parts) {
      if (p.broken) continue;
      const v = breakValue(c, i, p.id, hpW) / Math.max(1, p.hp);
      scored.push({ ref: refOf(i, p.id), v });
    }
  });
  scored.sort((a, b) => b.v - a.v);
  return [...scored.map((s) => s.ref), ...coreOrder(c)].filter((r) => canTarget(c, r)).slice(0, 6);
}

function withOrder(c: CombatState, order: TargetRef[]): CombatState {
  const t = cloneCombat(c);
  setOrder(t, order);
  return t;
}

// ---------- turtle and burst: greedy placements with a naive score ----------

type Score2 = (r: Ran2) => number;

const turtleScore: Score2 = (r) => {
  const absorbed = r.rawShown - r.lossShown;
  const extra = Math.max(0, r.plating - r.rawShown);
  return 10 * absorbed + 0.3 * extra + r.dealt + r.kills * 10 + 1.5 * chargeOnBoard(r.sim) + pressureTerms(r);
};
const burstScore: Score2 = (r) => r.dealt + r.kills * 10 + r.killedIncoming + 0.05 * (r.rawShown - r.lossShown) + 1.5 * chargeOnBoard(r.sim) + pressureTerms(r);

function greedy2(score: Score2): V2Policy {
  return (c) => {
    const order = coreOrder(c);
    const work = withOrder(c, order);
    const placements: { hand: number; cell: number }[] = [];
    let base = score(ran2(work, 1.5));
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
          const s = score(ran2(trial, 1.5)) - replacePenalty(old);
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
      base = score(ran2(work, 1.5));
    }
    let swap: [number, number] | undefined;
    let bestSwap = base;
    for (const [a, b] of allSwapPairs(work).slice(0, 10)) {
      const trial = cloneCombat(work);
      if (!swapParts(trial, a, b)) continue;
      const s = score(ran2(trial, 1.5));
      if (s > bestSwap + 1e-9) {
        bestSwap = s;
        swap = [a, b];
      }
    }
    const first = work.enemies.findIndex((e) => e.hp > 0);
    return swap ? { placements, swap, target: Math.max(0, first), order } : { placements, target: Math.max(0, first), order };
  };
}

export const turtle2: V2Policy = greedy2(turtleScore);
export const burst2: V2Policy = greedy2(burstScore);
export const greedy: V2Policy = chooseTurn;

// ---------- expert ----------

export interface Expert2Opts {
  width: number;
  swapStates: number;
  finalists: number;
  gamma: number;
  /** HP is worth this much per point against 1 per point of enemy progress. */
  hpWeight: number;
  /** Extra weight on kills (max-burst). */
  killWeight: number;
}

export const EXPERT2_DEFAULTS: Expert2Opts = { width: 12, swapStates: 4, finalists: 6, gamma: 0.8, hpWeight: 5, killWeight: 6 };
export const MAXBURST2_DEFAULTS: Partial<Expert2Opts> = { hpWeight: 0.4, killWeight: 30 };

function quick2(c: CombatState, o: Expert2Opts): number {
  const r = ran2(c, o.hpWeight);
  return r.dealt + r.partValue + r.kills * o.killWeight + r.killedIncoming * o.hpWeight - o.hpWeight * r.loss + 1.2 * chargeOnBoard(r.sim) + pressureTerms(r);
}

interface Cand2 {
  state: CombatState;
  placements: { hand: number; cell: number }[];
  swap?: [number, number];
  quick: number;
}

function sig(c: CombatState): string {
  let s = '';
  for (let i = 0; i < CELLS; i++) {
    const p = c.board[i];
    s += p ? `${p.defId}${p.plus ? '+' : ''}${p.charge},` : '_,';
  }
  return s + c.hand.length;
}

/** Hill-climb the order on a state: start from the best of a few fixed orders, then try every single insertion. */
function bestOrder(base: CombatState, o: Expert2Opts): { state: CombatState; quick: number } {
  const all = targetables(base);
  const fixed: TargetRef[][] = [smartOrder(base, o.hpWeight), coreOrder(base), base.order.slice()];
  let best = base;
  let bestQ = -Infinity;
  for (const f of fixed) {
    const t = withOrder(base, f);
    const q = quick2(t, o);
    if (q > bestQ + 1e-9) {
      bestQ = q;
      best = t;
    }
  }
  // Greedy extension from empty: append the entry that helps most, stop when nothing does.
  let cur: TargetRef[] = [];
  let curQ = quick2(withOrder(base, cur), o);
  for (let depth = 0; depth < 5; depth++) {
    let pick: TargetRef | null = null;
    let pickQ = curQ;
    for (const t of all) {
      if (cur.includes(t)) continue;
      const q = quick2(withOrder(base, [...cur, t]), o);
      if (q > pickQ + 0.01) {
        pickQ = q;
        pick = t;
      }
    }
    if (!pick) break;
    cur = [...cur, pick];
    curQ = pickQ;
  }
  if (curQ > bestQ + 1e-9) {
    bestQ = curQ;
    best = withOrder(base, cur);
  }
  return { state: best, quick: bestQ };
}

function nextTurnValue(la: CombatState, o: Expert2Opts): number {
  la.order = smartOrder(la, o.hpWeight);
  let best = quick2(la, o);
  const seen = new Set<string>();
  for (let h = 0; h < la.hand.length; h++) {
    const inst = la.parts[la.hand[h]];
    const key = `${inst.defId}${inst.plus}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (let cell = 0; cell < CELLS; cell++) {
      if (cell === MAINSPRING) continue;
      const trial = cloneCombat(la);
      if (!placePart(trial, h, cell)) continue;
      const s = quick2(trial, o) - replacePenalty(la.board[cell]);
      if (s > best) best = s;
    }
  }
  return best;
}

function lookahead(c: CombatState, cand: Cand2, o: Expert2Opts): number {
  const la = cloneCombat(cand.state);
  const before = remaining(la, o.hpWeight);
  const hpBefore = la.playerHp;
  la.rng = initStreams(c.turn * 7919 + 13 + c.log.length);
  la.draw = shuffle(la.rng, 'draw', la.draw);
  stratStats.previews += 1;
  runTurn(la);
  if (la.outcome === 'won') return 5000 + la.playerHp;
  if (la.outcome === 'lost') return -5000;
  let v = before - remaining(la, o.hpWeight) - o.hpWeight * (hpBefore - la.playerHp);
  v += 1.2 * chargeOnBoard(la) + 0.3 * Math.min(la.pressure, 18);
  v += o.gamma * nextTurnValue(la, o);
  return v;
}

export function makeExpert2(opts: Partial<Expert2Opts> = {}): V2Policy {
  const o: Expert2Opts = { ...EXPERT2_DEFAULTS, ...opts };
  return (c) => {
    const root = withOrder(c, smartOrder(c, o.hpWeight));
    const rootCand: Cand2 = { state: root, placements: [], quick: quick2(root, o) };
    const all: Cand2[] = [rootCand];
    let frontier: Cand2[] = [rootCand];
    const seenSig = new Set<string>([sig(root)]);
    for (let depth = 0; depth < root.placementsLeft; depth++) {
      const next: Cand2[] = [];
      for (const f of frontier) {
        if (f.state.hand.length === 0 || f.state.placementsLeft <= 0) continue;
        const seenPart = new Set<string>();
        for (let h = 0; h < f.state.hand.length; h++) {
          const inst = f.state.parts[f.state.hand[h]];
          const key = `${inst.defId}${inst.plus}`;
          if (seenPart.has(key)) continue;
          seenPart.add(key);
          for (let cell = 0; cell < CELLS; cell++) {
            if (cell === MAINSPRING) continue;
            const trial = cloneCombat(f.state);
            const old = trial.board[cell];
            if (!placePart(trial, h, cell)) continue;
            const s = sig(trial);
            if (seenSig.has(s)) continue;
            seenSig.add(s);
            next.push({ state: trial, placements: [...f.placements, { hand: h, cell }], quick: quick2(trial, o) - replacePenalty(old) });
          }
        }
      }
      next.sort((a, b) => b.quick - a.quick);
      frontier = next.slice(0, o.width);
      all.push(...frontier);
    }
    all.sort((a, b) => b.quick - a.quick);
    const pool: Cand2[] = all.slice(0, o.swapStates);
    if (!pool.includes(rootCand)) pool.push(rootCand);
    const withSwaps: Cand2[] = [...pool];
    if (!root.swapUsed) {
      for (const base of pool) {
        for (const [a, b] of allSwapPairs(base.state)) {
          const trial = cloneCombat(base.state);
          if (!swapParts(trial, a, b)) continue;
          const sc = quick2(trial, o);
          if (sc > base.quick + 1e-9) withSwaps.push({ state: trial, placements: base.placements, swap: [a, b], quick: sc });
        }
      }
    }
    withSwaps.sort((a, b) => b.quick - a.quick);
    const finalists: Cand2[] = [];
    for (const cand of withSwaps.slice(0, o.finalists)) {
      const bo = bestOrder(cand.state, o);
      finalists.push({ ...cand, state: bo.state, quick: bo.quick });
    }
    let best = finalists[0];
    let bestV = -Infinity;
    for (const f of finalists) {
      const v = lookahead(c, f, o);
      if (v > bestV + 1e-9) {
        bestV = v;
        best = f;
      }
    }
    const first = Math.max(0, best.state.enemies.findIndex((e) => e.hp > 0));
    const turn: BotTurn = { placements: best.placements, target: first, order: best.state.order.slice() };
    if (best.swap) turn.swap = best.swap;
    return turn;
  };
}

export const expert2: V2Policy = makeExpert2();
export const maxburst2: V2Policy = makeExpert2(MAXBURST2_DEFAULTS);
