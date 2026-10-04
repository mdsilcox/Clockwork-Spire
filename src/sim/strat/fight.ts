// One instrumented combat: plays a CombatState to its end with a policy and records what the report needs.
import { placePart, runTurn, setTarget, swapParts } from '../../core/combat';
import type { CombatState } from '../../core/types';
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
    phaseTurns: [],
    fired: {},
  };
  let streak = 0;
  let lastPhase = 0;
  let phaseStart = 1;
  for (let t = 0; t < turnCap && c.outcome === 'ongoing'; t++) {
    const attacking = c.enemies.some((_e, i) => incomingOf(c, i) > 0);
    const hp0 = c.playerHp;
    const turn = policy(c);
    for (const p of turn.placements) placePart(c, p.hand, p.cell);
    if (turn.swap) swapParts(c, turn.swap[0], turn.swap[1]);
    setTarget(c, turn.target);
    const res = runTurn(c);
    st.turns += 1;
    if (res.preview.plating > st.peakPlating) st.peakPlating = res.preview.plating;
    for (const e of res.events) {
      if (e.kind === 'power' && e.uid !== undefined) {
        const id = c.parts[e.uid]?.defId;
        if (id) st.fired[id] = (st.fired[id] ?? 0) + 1;
      }
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
