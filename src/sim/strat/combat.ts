// Three combat policies with the signature of v1's chooseTurn(c): turtle, burst and expert.
// turtle and burst are the greedy one-placement-at-a-time search of src/sim/bot.ts with a different score.
// expert is a beam search over placements, swaps and targets, then a one-turn lookahead through the real enemy turn.
import { cloneCombat, placePart, runTurn, setTarget, swapParts } from '../../core/combat';
import { initStreams, shuffle } from '../../core/rng';
import { CELLS, MAINSPRING } from '../../core/types';
import type { CombatState } from '../../core/types';
import { allSwapPairs, bestTarget, chargeOnBoard, incomingOf, ran, remainingHp, replacePenalty, stratStats, swapCandidates } from './common';
import type { BotTurn } from './common';

export type Policy = (c: CombatState) => BotTurn;

// ---------- greedy with a swappable score ----------

type ScoreFn = (c: CombatState) => number;

function pressureTerms(r: ReturnType<typeof ran>): number {
  return 0.3 * Math.min(r.pre.pressureAfter, 18) - (r.pre.overpressure ? 15 : 0);
}

/** Turtle: Plating first, until it covers the shown incoming; then damage. */
export const turtleScore: ScoreFn = (c) => {
  const r = ran(c);
  const cover = Math.min(r.plating, r.incoming);
  const extra = Math.max(0, r.plating - r.incoming);
  let s = 10 * cover + 0.3 * extra + r.dealt + r.kills * 10;
  s += 1.5 * chargeOnBoard(r.sim) + pressureTerms(r);
  return s;
};

/** Burst: damage first; Plating only as a tie-break. */
export const burstScore: ScoreFn = (c) => {
  const r = ran(c);
  let s = r.dealt + r.kills * 10 + r.killedIncoming + 0.05 * Math.min(r.plating, r.incoming);
  s += 1.5 * chargeOnBoard(r.sim) + pressureTerms(r);
  return s;
};

function greedy(score: ScoreFn): Policy {
  return (c) => {
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
          const s = score(trial) - replacePenalty(old);
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
    return swap ? { placements, swap, target } : { placements, target };
  };
}

export const turtle: Policy = greedy(turtleScore);
export const burst: Policy = greedy(burstScore);

// ---------- expert ----------

export interface ExpertOpts {
  /** Beam width per placement depth. */
  width: number;
  /** States (after placements) that get the swap search. */
  swapStates: number;
  /** Candidates that get the full lookahead. */
  finalists: number;
  /** Discount on the next-turn estimate. */
  gamma: number;
  /** HP is worth this much per point against 1 per point of enemy HP removed. */
  hpWeight: number;
  /** Turns of fast greedy play after the lookahead turn (0 = estimate the next turn with one placement). */
  rollout: number;
}

export const EXPERT_DEFAULTS: ExpertOpts = { width: 12, swapStates: 4, finalists: 6, gamma: 0.8, hpWeight: 5, rollout: 0 };

/** A fully applied turn: `state` already holds the placements, the swap and the target. */
interface Cand {
  state: CombatState;
  placements: { hand: number; cell: number }[];
  swap?: [number, number];
  target: number;
  quick: number;
}

/** Fast score of Run now: damage and Plating covering the shown incoming, plus stored charge and Pressure. */
function quick(c: CombatState, hpW: number): number {
  const r = ran(c);
  let s = r.dealt + r.kills * 6 + r.killedIncoming * hpW;
  s += hpW * Math.min(r.plating, r.incoming) + 0.05 * Math.max(0, r.plating - r.incoming);
  s += 1.2 * chargeOnBoard(r.sim) + pressureTerms(r);
  return s;
}

function sig(c: CombatState): string {
  let s = '';
  for (let i = 0; i < CELLS; i++) {
    const p = c.board[i];
    s += p ? `${p.defId}${p.plus ? '+' : ''}${p.charge},` : '_,';
  }
  return s;
}

/** Best value of the next turn from a state at its turn start: one more placement at most. Cheap by design. */
function nextTurnValue(la: CombatState, hpW: number): number {
  setTarget(la, bestTarget(la));
  let best = quick(la, hpW);
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
      const s = quick(trial, hpW) - replacePenalty(la.board[cell]);
      if (s > best) best = s;
    }
  }
  return best;
}

const rolloutCache = new Map<number, Policy>();
function rolloutPolicy(hpW: number): Policy {
  let p = rolloutCache.get(hpW);
  if (!p) {
    p = greedy((c) => quick(c, hpW));
    rolloutCache.set(hpW, p);
  }
  return p;
}

/** Play the candidate through the real enemy turn on a copy with a hidden (reshuffled) draw pile, then value it. */
function lookahead(c: CombatState, cand: Cand, o: ExpertOpts): number {
  const la = cloneCombat(cand.state);
  const before = remainingHp(la);
  const hpBefore = la.playerHp;
  // No peeking: the real next hand and the enemy's rolls are unknown to a player.
  la.rng = initStreams(c.turn * 7919 + 13 + c.log.length);
  la.draw = shuffle(la.rng, 'draw', la.draw);
  stratStats.previews += 1;
  runTurn(la);
  if (la.outcome === 'won') return 5000 + la.playerHp;
  if (la.outcome === 'lost') return -5000;
  const hpLost = hpBefore - la.playerHp;
  const progress = before - remainingHp(la);
  let v = progress - o.hpWeight * hpLost;
  let disc = 1;
  let cur = la;
  for (let k = 0; k < o.rollout; k++) {
    disc *= o.gamma;
    const pol = rolloutPolicy(o.hpWeight);
    const t = pol(cur);
    for (const p of t.placements) placePart(cur, p.hand, p.cell);
    if (t.swap) swapParts(cur, t.swap[0], t.swap[1]);
    setTarget(cur, t.target);
    const b2 = remainingHp(cur);
    const h2 = cur.playerHp;
    stratStats.previews += 1;
    runTurn(cur);
    if (cur.outcome === 'won') return v + disc * (2000 + cur.playerHp);
    if (cur.outcome === 'lost') return v - disc * 2000;
    v += disc * (b2 - remainingHp(cur) - o.hpWeight * (h2 - cur.playerHp));
  }
  v += 1.2 * chargeOnBoard(cur) + 0.3 * Math.min(cur.pressure, 18);
  if (o.rollout === 0) v += o.gamma * nextTurnValue(cur, o.hpWeight);
  return v;
}

export function makeExpert(opts: Partial<ExpertOpts> = {}): Policy {
  const o: ExpertOpts = { ...EXPERT_DEFAULTS, ...opts };
  return (c) => {
    const root = cloneCombat(c);
    setTarget(root, bestTarget(root));
    const rootCand: Cand = { state: root, placements: [], target: root.targetIdx, quick: quick(root, o.hpWeight) };
    const all: Cand[] = [rootCand];
    let frontier: Cand[] = [rootCand];
    const seenSig = new Set<string>([sig(root) + root.hand.length]);
    for (let depth = 0; depth < root.placementsLeft; depth++) {
      const next: Cand[] = [];
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
            const s = sig(trial) + trial.hand.length;
            if (seenSig.has(s)) continue;
            seenSig.add(s);
            const sc = quick(trial, o.hpWeight) - replacePenalty(old);
            next.push({ state: trial, placements: [...f.placements, { hand: h, cell }], target: f.target, quick: sc });
          }
        }
      }
      next.sort((a, b) => b.quick - a.quick);
      frontier = next.slice(0, o.width);
      all.push(...frontier);
    }
    // The best few states (including "place nothing") get every swap.
    all.sort((a, b) => b.quick - a.quick);
    const pool: Cand[] = all.slice(0, o.swapStates);
    if (!pool.includes(rootCand)) pool.push(rootCand);
    const withSwaps: Cand[] = [...pool];
    if (!root.swapUsed) {
      for (const base of pool) {
        for (const [a, b] of allSwapPairs(base.state)) {
          const trial = cloneCombat(base.state);
          if (!swapParts(trial, a, b)) continue;
          const sc = quick(trial, o.hpWeight);
          if (sc > base.quick + 1e-9) withSwaps.push({ state: trial, placements: base.placements, swap: [a, b], target: base.target, quick: sc });
        }
      }
    }
    // Targets: only when more than one enemy is alive.
    const alive: number[] = [];
    for (let i = 0; i < root.enemies.length; i++) if (root.enemies[i].hp > 0) alive.push(i);
    const full: Cand[] = [];
    for (const cand of withSwaps) {
      if (alive.length <= 1) {
        full.push(cand);
        continue;
      }
      for (const t of alive) {
        const trial = cloneCombat(cand.state);
        setTarget(trial, t);
        full.push({ ...cand, state: trial, target: t, quick: quick(trial, o.hpWeight) + 0.01 * incomingOf(cand.state, t) });
      }
    }
    full.sort((a, b) => b.quick - a.quick);
    const finalists = full.slice(0, o.finalists);
    let best = finalists[0];
    let bestV = -Infinity;
    for (const f of finalists) {
      const v = lookahead(c, f, o);
      if (v > bestV + 1e-9) {
        bestV = v;
        best = f;
      }
    }
    return best.swap ? { placements: best.placements, swap: best.swap, target: best.target } : { placements: best.placements, target: best.target };
  };
}

export const expert: Policy = makeExpert();
