// Static definition types (parts, enemies). Definitions are code keyed by id; state lives in types.ts.
import type { CombatState, EnemyState, Family, Intent, PlacedPart, Rarity } from './types';
import type { RngState } from './rng';

/** What a part's hooks may do while the machine ticks. Built by machine.ts. */
export interface TickCtx {
  c: CombatState;
  tick: number; // 1-based
  step: number; // breadth-first depth (1 = next to the Mainspring)
  cell: number;
  /** Boost handed to this part by the part that powered it. Strike, Sweep and Plate add it. */
  boostIn: number;
  /** Set this to hand a boost to every part this part passes motion to. */
  boostOut: number;
  /** True after `release()` was called during this firing. */
  released: boolean;
  isLastTick(): boolean;
  strike(amount: number): void;
  sweep(amount: number): void;
  plate(amount: number): void;
  addPressure(amount: number): void;
  /** Spend exactly `amount` Pressure if available; returns whether it was spent. */
  spendPressure(amount: number): boolean;
  /** Add a tick to this turn (capped at 8 in total). */
  addTick(): boolean;
  /** Mark a release (charge reached its threshold). */
  release(): void;
}

export interface PartDef {
  id: string;
  name: string;
  family: Family;
  rarity: Rarity;
  locked: boolean;
  text: string;
  textPlus: string;
  threshold?: number;
  thresholdPlus?: number;
  /** After onFire: does the part hold motion instead of passing it? Default: passes. */
  holds?: (ctx: TickCtx, p: PlacedPart) => boolean;
  onFire(ctx: TickCtx, p: PlacedPart): void;
  /** Also passes motion to diagonal neighbors (Bevel Gear). */
  diagonal?: boolean;
}

export interface IntentStep extends Omit<Intent, 'target'> {}

export interface EnemyDef {
  id: string;
  name: string;
  act: 1 | 2 | 3;
  tier: 'normal' | 'elite' | 'boss';
  hp: number;
  pattern: IntentStep[];
  /** Picks the next intent. Default: the pattern step at `e.step`. */
  intentFor?: (e: EnemyState, c: CombatState, rng: RngState) => Intent;
}
