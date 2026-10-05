// One instrumented combat: plays a CombatState to its end with a policy and records what the report needs.
import { placePart, runTurn, swapParts } from '../../core/combat';
import type { CombatState } from '../../core/types';
import { applyAim } from '../bot';
import type { Policy } from './combat';
import { incomingOf } from './common';

export const TURN_CAP = 40;

export interface FightStats {
  won: boolean;
  /** Ended by the turn cap (counts as lost). */
  capped: boolean;
  turns: number;
  hpStart: number;
  hpLost: number;
  /** Highest Plating the machine produced in any turn. */
  peakPlating: number;
  /** Longest run of turns where an enemy attacked and no HP was lost. */
  absorbStreak: number;
  /** Turns the enemies attacked. */
  attackTurns: number;
  /** v2: enemy turns that tried to damage you, and those where Plating took all of it (no HP lost). */
  damageTurns: number;
  absorbedTurns: number;
  /** Player turns that started while the first enemy (a warden) was in phase k. */
  phaseStartTurns: number[];
  /** Total time spent deciding, in ms (timing only). */
  decideMs: number;
  /** Turn on which the boss phase counter first became 1 and 2 (Clockmaker): turns each phase lasted. */
  phaseTurns: number[];
  /** Times each part id was powered. */
  fired: Record<string, number>;
}

/** Plays `c` in place (it must be 'ongoing'). Records stats; does not settle the run. */
export function playCombatWith(c: CombatState, policy: Policy, turnCap = TURN_CAP): FightStats {
  const st: FightStats = {
    won: false,
    capped: false,
    turns: 0,
    hpStart: c.playerHp,
    hpLost: 0,
    peakPlating: 0,
    absorbStreak: 0,
    attackTurns: 0,
    damageTurns: 0,
    absorbedTurns: 0,
    decideMs: 0,
    phaseStartTurns: [],
    phaseTurns: [],
    fired: {},
  };
  let streak = 0;
  let lastPhase = 0;
  let phaseStart = 1;
  for (let t = 0; t < turnCap && c.outcome === 'ongoing'; t++) {
    const attacking = c.enemies.some((_e, i) => incomingOf(c, i) > 0);
    const hp0 = c.playerHp;
    const ph0 = c.enemies[0]?.phase ?? 0;
    st.phaseStartTurns[ph0] = (st.phaseStartTurns[ph0] ?? 0) + 1;
    const d0 = performance.now();
    const turn = policy(c);
    st.decideMs += performance.now() - d0;
    for (const p of turn.placements) placePart(c, p.hand, p.cell);
    if (turn.swap) swapParts(c, turn.swap[0], turn.swap[1]);
    applyAim(c, turn);
    const res = runTurn(c);
    st.turns += 1;
    if (res.preview.plating > st.peakPlating) st.peakPlating = res.preview.plating;
    for (const e of res.events) {
      if (e.kind === 'power' && e.uid !== undefined) {
        const id = c.parts[e.uid]?.defId;
        if (id) st.fired[id] = (st.fired[id] ?? 0) + 1;
      }
    }
    let tried = 0;
    let lostHp = 0;
    for (const e of res.events) {
      if (e.kind !== 'playerHit') continue;
      const ab = /absorbed:(\d+)/.exec(e.note ?? '');
      lostHp += e.amount ?? 0;
      tried += (e.amount ?? 0) + (ab ? Number(ab[1]) : 0);
    }
    if (tried > 0) {
      st.damageTurns += 1;
      if (lostHp === 0) st.absorbedTurns += 1;
    }
    if (attacking) {
      st.attackTurns += 1;
      if (c.playerHp >= hp0) {
        streak += 1;
        if (streak > st.absorbStreak) st.absorbStreak = streak;
      } else streak = 0;
    }
    const ph = Math.max(0, ...c.enemies.map((e) => e.phase));
    while (ph > lastPhase) {
      st.phaseTurns.push(st.turns - phaseStart + 1);
      phaseStart = st.turns + 1;
      lastPhase += 1;
    }
  }
  if (c.outcome === 'won') {
    st.won = true;
    if (lastPhase > 0 || c.enemies.some((e) => e.phase > 0 || e.defId === 'clockmaker')) st.phaseTurns.push(st.turns - phaseStart + 1);
  } else if (c.outcome === 'ongoing') st.capped = true;
  st.hpLost = Math.max(0, st.hpStart - Math.max(0, c.playerHp));
  return st;
}
