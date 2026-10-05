// B9a CONTRACT (docs/briefs/B9a-wardens.md, "Plan stats" and "Memory"). wardens-core implements; B9b extends recordFight
// with the achievement facts, in sequence. recordFight is called at every fight end (settleCombat win and loss, abandonRun).
import type { CombatState, Plan, PlanStats, RunState } from './types';

/** Add this fight's play style to `run.stats.plan` from the combat's GameEvent log. B9a.0: a no-op until wardens-core. */
export function recordFight(run: RunState, combat: CombatState): void {
  void run;
  void combat;
}

/** The run's main plan: the largest; ties plating, burst, pressure, statuses; all zero gives null. */
export function mainPlan(stats: PlanStats | undefined): Plan | null {
  void stats;
  throw new Error('B9a: mainPlan not implemented');
}

/** The plan the Clockmaker remembers: the most frequent of the last three, a tie to the latest; null with no history. */
export function memoryPlan(history: Plan[] | undefined): Plan | null {
  void history;
  throw new Error('B9a: memoryPlan not implemented');
}
