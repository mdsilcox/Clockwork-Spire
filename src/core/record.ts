// B9a (docs/briefs/B9a-wardens.md, "Plan stats" and "Memory"). recordFight is called at every fight end (settleCombat win and
// loss, abandonRun); B9b extends it with the achievement facts, in sequence. The per-turn accumulation lives in combat.ts
// (`accumulatePlan`, from the GameEvent timeline); recordFight moves a fight's totals into the run.
import type { CombatState, Plan, PlanStats, RunState } from './types';

export const PLAN_ORDER: Plan[] = ['plating', 'burst', 'pressure', 'statuses'];

/** Add this fight's play style to `run.stats.plan`. Once per fight: the combat's own tally is cleared afterwards. */
export function recordFight(run: RunState, combat: CombatState): void {
  const acc = combat.planAcc;
  if (!acc) return;
  const plan: PlanStats = (run.stats.plan ??= { plating: 0, burst: 0, pressure: 0, statuses: 0 });
  for (const k of PLAN_ORDER) plan[k] += acc[k] ?? 0;
  combat.planAcc = undefined;
}

/** The run's main plan: the largest; ties plating, burst, pressure, statuses; all zero gives null. */
export function mainPlan(stats: PlanStats | undefined): Plan | null {
  if (!stats) return null;
  let best: Plan | null = null;
  let bestVal = 0;
  for (const k of PLAN_ORDER) {
    const v = stats[k] ?? 0;
    if (v > bestVal) {
      bestVal = v;
      best = k;
    }
  }
  return best;
}

/** The plan the Clockmaker remembers: the most frequent of the last three, a tie to the latest; null with no history. */
export function memoryPlan(history: Plan[] | undefined): Plan | null {
  const last = (history ?? []).slice(-3);
  if (last.length === 0) return null;
  const count = (p: Plan): number => last.filter((x) => x === p).length;
  let best = last[last.length - 1];
  for (let i = last.length - 1; i >= 0; i--) if (count(last[i]) > count(best)) best = last[i];
  return best;
}
