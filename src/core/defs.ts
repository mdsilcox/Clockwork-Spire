// Static definition types (parts, enemies). Definitions are code keyed by id; state lives in types.ts.
import type { CombatState, EnemyState, Family, GameEvent, Intent, PlacedPart, Rarity } from './types';
import type { RngState } from './rng';

/** What a part's hooks may do while the machine ticks (and at turn start / enemy attacks). Built by machine.ts. */
export interface TickCtx {
  c: CombatState;
  tick: number; // 1-based; 0 outside the machine's ticks (turn start, enemy turn)
  step: number; // breadth-first depth (1 = next to the Mainspring)
  cell: number;
  /** Boost handed to this part by the part that powered it. Strike, Sweep and Plate add it. */
  boostIn: number;
  /** Set this to hand a boost to every part this part passes motion to. */
  boostOut: number;
  /** Set this to make every part this part passes motion to fire with Echo (Lever). */
  echoOut: boolean;
  /** True after `release()` was called during this firing. */
  released: boolean;
  /** True while the effect resolves its second time (Echo). */
  isEcho: boolean;
  isLastTick(): boolean;
  /** True the first time this part fires in the turn (an Echo repeat does not count again). */
  isFirstFire(): boolean;
  /** True once per turn per key (hairspring tick, etc.). */
  oncePerTurn(key: string): boolean;
  /** Did a part with this def id fire earlier this tick? */
  firedEarlier(defId: string): boolean;
  strike(amount: number): void;
  /** Strike a specific enemy (Spring Trap). */
  strikeAt(idx: number, amount: number): void;
  sweep(amount: number): void;
  plate(amount: number): void;
  addPressure(amount: number): void;
  /** Spend exactly `amount` Pressure if available; returns whether it was spent. */
  spendPressure(amount: number): boolean;
  /** Add a tick to this turn (capped at 8 in total). */
  addTick(): boolean;
  /** Mark a release (charge reached its threshold). Adjacent parts with `onNeighborRelease` react. */
  release(): void;
  /** A Cam pays off: a release for neighbor triggers (note 'cam'). */
  camPayoff(): void;
  /** Apply a status to the target enemy, to every living enemy, or to one enemy index. */
  applyStatus(who: 'target' | 'all' | number, status: string, amount: number): void;
  /** Heal the player (never above max HP). */
  heal(amount: number): void;
  /** Draw this many extra parts at the next turn start. */
  drawNextTurn(n: number): void;
  /** Inventor's Lamp: Scald and Cracked applied from now this turn are +n. */
  addStatusBonus(n: number): void;
  /** Clear Rust from the part at `cell`. */
  clearRust(cell: number): void;
}

export interface ReleaseInfo {
  cam: boolean; // true when this is a Cam payoff rather than a charge release
  from: number; // cell of the releasing part
}

export interface PartDef {
  id: string;
  name: string;
  family: Family;
  rarity: Rarity;
  locked: boolean;
  text: string;
  textPlus: string;
  flavor?: string;
  threshold?: number;
  thresholdPlus?: number;
  /** After onFire: does the part hold motion instead of passing it? Default: passes. */
  holds?: (ctx: TickCtx, p: PlacedPart) => boolean;
  onFire(ctx: TickCtx, p: PlacedPart): void;
  /** Also passes motion to diagonal neighbors (Bevel Gear). */
  diagonal?: boolean;
  /** Torsion Spring: runs at the start of the player's turn. */
  onTurnStart?(ctx: TickCtx, p: PlacedPart): void;
  /** Spring Trap: runs after enemy `enemyIdx` attacks the player. */
  onEnemyAttack?(ctx: TickCtx, p: PlacedPart, enemyIdx: number): void;
  /** An adjacent part released (or an adjacent Cam paid off). Fires at most once per release. */
  onNeighborRelease?(ctx: TickCtx, p: PlacedPart, info: ReleaseInfo): void;
}

export interface IntentStep extends Omit<Intent, 'target' | 'targets'> {}

export interface PhaseDef {
  hp: number;
  line: string;
  /** Pattern for this phase; defaults to the def's pattern. */
  pattern?: IntentStep[];
}

export interface EnemyDef {
  id: string;
  name: string;
  act: 1 | 2 | 3;
  tier: 'normal' | 'elite' | 'boss';
  hp: number;
  pattern: IntentStep[];
  /** Only appears when summoned by another enemy; never in encounter pools. */
  summonOnly?: boolean;
  /** Boss phases (Clockmaker). Phase 0 uses `hp`; reaching 0 starts the next phase with that phase's hp. */
  phases?: PhaseDef[];
  /** Picks the next intent. Default: the pattern step at `e.step`. */
  intentFor?: (e: EnemyState, c: CombatState, rng: RngState) => Intent;
  /** Combat creation: spawn companions (summonEnemy) and set scratch. No events are emitted. */
  onStart?: (c: CombatState, idx: number) => void;
  /** Start of this enemy's action (after its Shell fell away): passives such as heat, Shell, healing. */
  onTurn?: (c: CombatState, idx: number, events: GameEvent[]) => void;
  /** After the player's machine ran, before the enemies act (enrage). */
  afterMachine?: (c: CombatState, idx: number, events: GameEvent[]) => void;
  /** Summons this def once when its HP drops to half or below (checked at the start of its turn). */
  summonAtHalf?: string;
  /** Rewinds the player's strongest combination at the start of its turn (the Clockmaker, rules 4.4). */
  rewinds?: boolean;
}
