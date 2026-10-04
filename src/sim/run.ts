// Plays one complete run with the bot and the real rules (docs/rules.md section 7).
import { placePart, runTurn, setTarget, swapParts } from '../core/combat';
import { abandonRun, newRun, runRecord, settleCombat } from '../core/run';
import type { RunConfig, RunRecord, RunState } from '../core/types';
import { chooseTurn } from './bot';
import { check, doEvent, doForge, doMap, doOil, doReward, doShop, newMemory } from './runbot';
import type { BotMemory } from './runbot';

export const COMBAT_TURN_CAP = 60;
const STEP_CAP = 3000;

export interface RunResult {
  won: boolean;
  act: number;
  floor: number;
  record: Omit<RunRecord, 'n' | 'endedAt'>;
  offers: RunState['stats']['offers'];
  /** HP when entering each boss, by act (1-based index 0 = act 1). */
  hpAtBoss: (number | null)[];
  /** Bosses beaten by the end of the run. */
  bossesBeaten: number;
  /** Encounter (enemy ids joined) that killed the run, if any. */
  killedBy?: string;
  turns: number;
  /** API calls that returned false (should be empty). */
  illegal: string[];
}

function playCombat(run: RunState, m: BotMemory): void {
  const c = run.combat;
  if (!c) return;
  for (let t = 0; t < COMBAT_TURN_CAP && c.outcome === 'ongoing'; t++) {
    const turn = chooseTurn(c);
    for (const p of turn.placements) check(m, 'placePart', placePart(c, p.hand, p.cell));
    if (turn.swap) check(m, 'swapParts', swapParts(c, turn.swap[0], turn.swap[1]));
    setTarget(c, turn.target);
    const res = runTurn(c);
    for (const e of res.events) {
      if (e.kind === 'power' && e.uid !== undefined) {
        const id = c.parts[e.uid]?.defId;
        if (id) m.fired[id] = (m.fired[id] ?? 0) + 1;
      }
    }
    if (settleCombat(run)) return;
  }
  // Turn cap: count as a loss by abandoning (a run stuck in a combat is not a win).
  abandonRun(run);
}

export function playRun(cfg: RunConfig, botSeed: number): RunResult {
  return playRunState(cfg, botSeed).result;
}

/** Like playRun, but also returns the finished RunState (careers settle it with finishRun). */
export function playRunState(cfg: RunConfig, botSeed: number): { result: RunResult; run: RunState } {
  const run = newRun(cfg);
  const m = newMemory(botSeed);
  const hpAtBoss: (number | null)[] = [null, null, null];
  let eventStuck = 0;
  for (let step = 0; step < STEP_CAP && run.phase !== 'victory' && run.phase !== 'defeat'; step++) {
    switch (run.phase) {
      case 'map': {
        const before = run.act;
        doMap(run, m);
        if ((run.phase as string) === 'combat' && run.combat?.kind === 'boss') hpAtBoss[before - 1] = run.hp;
        break;
      }
      case 'combat':
        playCombat(run, m);
        break;
      case 'reward':
        doReward(run, m);
        break;
      case 'event':
        doEvent(run, m);
        if (run.phase === 'event' && ++eventStuck > 5) abandonRun(run);
        break;
      case 'shop':
        doShop(run, m);
        break;
      case 'forge':
        doForge(run, m);
        break;
      case 'oil':
        doOil(run, m);
        break;
    }
    if ((run.phase as string) !== 'event') eventStuck = 0;
    if (m.illegal.length > 0) break; // never loop on an illegal call
  }
  if (run.phase !== 'victory' && run.phase !== 'defeat') abandonRun(run);
  const record = runRecord(run);
  const result: RunResult = {
    won: record.result === 'win',
    act: record.act,
    floor: record.floor,
    record,
    offers: run.stats.offers,
    hpAtBoss,
    bossesBeaten: run.stats.bossesBeaten,
    killedBy: record.killedBy,
    turns: run.stats.turns,
    illegal: m.illegal,
  };
  return { result, run };
}
