// Where an enemy intent will land on the player's machine, so the UI can mark it before the player builds.
import { cellName } from '../core/board';
import { MAINSPRING } from '../core/types';
import type { CombatState } from '../core/types';

export interface IntentTargets {
  /** Board cells that will be hit (Rust, Magnetize). */
  cells: number[];
  /** Jam: the Mainspring. */
  mainspring: boolean;
  /** Drain: the Pressure gauge. */
  pressure: boolean;
}

export function intentTargets(c: CombatState, i: number): IntentTargets {
  const e = c.enemies[i];
  const none: IntentTargets = { cells: [], mainspring: false, pressure: false };
  if (!e || e.hp <= 0 || e.intent.kind !== 'sabotage') return none;
  const kind = e.intent.sabotage;
  if (kind === 'jam') return { ...none, mainspring: true };
  if (kind === 'drain') return { ...none, pressure: true };
  if (e.intent.target !== undefined && e.intent.target >= 0) return { ...none, cells: [e.intent.target] };
  return none;
}

/** The `window.__game.intents()` shape: one row per enemy. */
export function intentRows(c: CombatState): { kind: string; label: string; target: string | null; targets: string[] }[] {
  return c.enemies.map((e, i) => {
    const t = intentTargets(c, i);
    const targets = [...t.cells.map((x) => cellName(x)), ...(t.mainspring ? [cellName(MAINSPRING)] : []), ...(t.pressure ? ['pressure'] : [])];
    return {
      kind: e.hp > 0 ? e.intent.kind : 'none',
      label: e.intent.label,
      target: e.intent.target !== undefined && e.intent.target >= 0 ? cellName(e.intent.target) : null,
      targets,
    };
  });
}
