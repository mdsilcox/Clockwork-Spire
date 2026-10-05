// Static definition types (parts, enemies). Definitions are code keyed by id; state lives in types.ts.
import type { ActionDef, Cadence, CombatState, EnemyState, Family, GameEvent, Intent, PlacedPart, Plan, Rarity } from './types';
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
  /** B9b (Cascade Piston): a Strike whose overkill carries once to the next standing entry of the target order. */
  strikeCarrying(amount: number): void;
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
  // B7 CONTRACT: the v2 player words (docs/rules.md 2.3). Boost, Grit and Brass Knuckles apply as for strike().
  /** X to every unbroken part of the enemy the next Strike would hit (not its core). */
  shatter(amount: number): void;
  /** A Strike that ignores Shell, Bulwark and Governor (still Braced, still no carry). */
  drill(amount: number): void;
  /** The part the next Strike would hit skips its next action (a countdown on it doesn't tick). */
  jam(): void;
  /** Strike X at the unbroken part with the least HP left on the enemy the next Strike would hit (ties left to right); no parts: a normal Strike. */
  pry(amount: number): boolean; // true if it broke a part (Sapper)
  /** Heal X HP (rules 2.6). */
  patch(amount: number): void;
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
  /** B9b: the achievement id that unlocks this Masterwork or Legendary part (content.md section 7). */
  unlock?: string;
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

// ---------- v2 enemy machines (B7 CONTRACT; docs/content.md section 3 is the data) ----------

export type Passive = { kind: 'bulwark' } | { kind: 'governor'; cap: number } | { kind: 'ratchet'; x: number } | { kind: 'enrage'; x: number };

export interface EnemyPartDef {
  id: string; // content.md id, e.g. 'rat-jaw'
  name: string;
  hp: number;
  rarity: Rarity;
  actions: ActionDef[]; // performed in order when it acts; [] for passives
  /** Different action lists by turn of its cycle (the Midnight Bell): key = turn number within `cadence.of`. */
  actionsByTurn?: Record<number, ActionDef[]>;
  passive?: Passive;
  cadence: Cadence;
  /** Each time it acts, its first action's amount grows by this (Spring Imp's tail); back to base at escalateResetAt. */
  escalate?: number;
  escalateResetAt?: number;
  salvage: string | 'spire-key' | null; // player part id it drops when broken
  keystone?: boolean; // the core stays sealed until every keystone of the phase is broken
  /** B9a: wardens only. A standing part retracts (removed, not broken, no salvage) when a phase after this one begins.
   * Without it, a standing part stays into later phases. */
  lastPhase?: number;
  anchor: string; // where it sits on the painting, in words (art rig anchors use the part id)
}

export interface WardenPhaseDef {
  keystones: string[];
  parts: EnemyPartDef[]; // parts that unfold in this phase (parts of earlier phases that still stand stay)
  /** The line when this phase begins; B9a: a line that depends on whether a part is broken (the Queen's Gauge). */
  beat: string | { ifBroken: string; text: string; otherwise: string };
  action: ActionDef | null; // the phase action, taken on the warden's next turn (rules 4.8); null for phase 1
  mood: string; // rig mood for the beat ('phase')
  coreExposed?: boolean; // the last phase: the core is not sealed
}

export interface FrameDef {
  core: number; // core HP
  coreAction: ActionDef; // the Bump, used only when every acting part is broken
  sealed?: boolean; // elites: sealed until every keystone is broken
  parts: EnemyPartDef[]; // regulars and elites (wardens: phase 1 parts are phases[0].parts)
  phases?: WardenPhaseDef[]; // wardens
  braced?: boolean; // wardens only (rules 2.4); never elites
  scrap: number; // the enemy's own drop
  punishes: ('plating' | 'burst' | 'pressure' | 'statuses' | 'slow')[];
  bestiary: string;
  /** Enemies this one summons when combat starts (Tinpot General's horn is a part action instead). */
  startSummons?: string[];
  /** B9a: the Clockmaker's memory: the part he adds at combat start for the player's main plan (not a keystone, never retracted). */
  memoryParts?: Record<Plan, EnemyPartDef>;
}

export interface EnemyDef {
  id: string;
  name: string;
  act: 1 | 2 | 3;
  tier: 'normal' | 'elite' | 'boss';
  hp: number; // legacy enemies; frame enemies: equals frame.core
  /** v2: a frame enemy. When present the engine uses it and ignores pattern, phases and the legacy hooks. */
  frame?: FrameDef;
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
}

// ---------- B9b: achievements (docs/content.md section 7; rules 5.6) ----------

export interface AchievementReward {
  parts?: string[]; // part ids into the pool (unlocks)
  trinkets?: string[]; // trinket ids into the pool
  journal?: string; // a journal page title
  collar?: string; // a collar id (cosmetic, recorded in profile.rewards until B10)
  landmark?: string; // a landmark id (recorded until B10)
  overwind?: number; // Overwind level reached (recorded until B10)
  chassis?: string; // a chassis id (the Scrapper waits for B10)
}

export interface AchievementDef {
  id: string;
  name: string;
  /** The condition, as shown on the trophy shelf. */
  text: string;
  tier: 'easy' | 'medium' | 'hard';
  hidden: boolean;
  reward: AchievementReward;
  /** False when it opens with Bellfoot in B10: shown locked with "Opens with Bellfoot". */
  available: boolean;
}
