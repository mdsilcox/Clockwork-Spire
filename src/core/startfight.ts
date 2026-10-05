// Starting a combat on a run (shared by v1's enterNode and the climb's section flow). Pure.
import { createCombat } from './combat';
import type { CreateCombatOpts } from './combat';
import { int } from './rng';
import type { CombatState, RunState } from './types';

/** Create the run's combat from its bin, HP, trinkets and chassis; sets `run.combat` and phase 'combat'. */
export function startCombat(run: RunState, enemies: string[], kind: CombatState['kind'], extra: Pick<CreateCombatOpts, 'overwound' | 'prepared'> = {}): CombatState {
  const handSize = Math.max(1, run.config.handSize - (run.trinkets.includes('mainspring-key') ? 1 : 0));
  const opts: CreateCombatOpts = {
    seed: int(run.rng, 'enemy', 0x7fffffff),
    bin: run.bin,
    enemies,
    hp: run.hp,
    maxHp: run.maxHp,
    kind,
    trinkets: run.trinkets,
    handSize,
    chassis: run.config.chassis,
    ...extra,
  };
  run.combat = createCombat(opts);
  run.phase = 'combat';
  return run.combat;
}
