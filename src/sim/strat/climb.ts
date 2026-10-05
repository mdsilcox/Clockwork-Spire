// The climb driver for the simulator: plays a whole v2 run (sections, hours, roaming elites, workbench, trader, oil, the
// bell) through the real run API. The decisions come from decide.ts (shared with the in-game autoplay); this file only
// carries them out on the core. Combat is the v2 expert for every route policy.
// Deterministic: no clock, no Math.random.
import { abandonRun, leaveNode, newRun, takeRewardPart, takeRewardTrinket, chooseEvent, eventPickPart } from '../../core/run';
import { barter, fuse, polish, rest, workbenchRemove, workbenchUpgrade } from '../../core/rooms';
import { moveTo, pickLock, ringBell, useKey } from '../../core/section';
import { takeSalvage } from '../../core/salvage';
import type { RunConfig, RunState } from '../../core/types';
import { check, newMemory } from '../runbot';
import type { BotMemory } from '../runbot';
import type { Hooks } from './drive';
import { playCombat } from './drive';
import type { Policy } from './combat';
import { decide } from './decide';
import type { Action, RoutePolicy } from './decide';

export { EXPERT_KNOBS } from './decide';
export type { RoutePolicy } from './decide';

const STEP_CAP = 4000;

/** Carry out one action on the core. Returns whether it was legal (an event choice returns its outcome text). */
export function execute(run: RunState, a: Action, m: BotMemory): boolean {
  switch (a.t) {
    case 'move':
      return check(m, 'moveTo', moveTo(run, a.to));
    case 'ring':
      return check(m, 'ringBell', ringBell(run));
    case 'key':
      return check(m, 'useKey', useKey(run, a.passage));
    case 'lock':
      return check(m, 'pickLock', pickLock(run, a.passage));
    case 'leave':
      return check(m, 'leaveNode', leaveNode(run));
    case 'salvage':
      return check(m, 'takeSalvage', takeSalvage(run, a.keep));
    case 'trinket':
      return check(m, 'takeRewardTrinket', takeRewardTrinket(run, a.index));
    case 'rewardPart':
      return check(m, 'takeRewardPart', takeRewardPart(run, a.index));
    case 'choose':
      return check(m, 'chooseEvent', chooseEvent(run, a.index) !== null);
    case 'pickPart':
      return check(m, 'eventPickPart', eventPickPart(run, a.uid));
    case 'upgrade':
      return check(m, 'workbenchUpgrade', workbenchUpgrade(run, a.uid));
    case 'remove':
      return check(m, 'workbenchRemove', workbenchRemove(run, a.uid));
    case 'fuse':
      return check(m, 'fuse', fuse(run, a.a, a.b, a.pick));
    case 'barter':
      return check(m, 'barter', barter(run, a.index, a.offer));
    case 'rest':
      return check(m, 'rest', rest(run));
    case 'polish':
      return check(m, 'polish', polish(run));
    case 'abandon':
      abandonRun(run);
      return true;
  }
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
  let fails = 0;
  for (let step = 0; step < STEP_CAP && run.phase !== 'victory' && run.phase !== 'defeat'; step++) {
    if (run.phase === 'combat') {
      playCombat(run, m, combat, hooks);
      continue;
    }
    fails = execute(run, decide(run, route, m), m) ? 0 : fails + 1;
    if (fails >= 3) abandonRun(run); // never loop on an action the core refuses
  }
  if (run.phase !== 'victory' && run.phase !== 'defeat') abandonRun(run);
  return { won: run.phase === 'victory' && !run.flags.abandoned, act: run.act, run, illegal: m.illegal };
}
