// Core contract types for Clockwork Spire. Pure data: everything here is JSON-serializable state
// or a static definition keyed by id. See docs/data-model.md and docs/rules.md.

export type Family = 'gear' | 'spring' | 'cam' | 'tempo' | 'steam' | 'chime';
export type Rarity = 'common' | 'uncommon' | 'rare';
export type RngStream = 'map' | 'draw' | 'enemy' | 'reward' | 'event' | 'shop';

/** Board geometry: 5 columns x 3 rows, index = row * 5 + col. A2 (index 5) is the Mainspring. */
export const COLS = 5;
export const ROWS = 3;
export const CELLS = COLS * ROWS;
export const MAINSPRING = 5;

// ---------- Saved state ----------

export interface PartInstance {
  uid: number;
  defId: string;
  plus: boolean;
}

export interface PlacedPart extends PartInstance {
  charge: number; // springs, ratchet; persists across turns of one combat
  counter: number; // cams: firings counted this combat
  rusted: number; // turns of rust left (0 = clean)
  magnetized: boolean; // pulled back to hand at next turn start
  firedThisTurn: number; // reset each turn
}

export type IntentKind =
  | 'attack'
  | 'defend'
  | 'buff'
  | 'debuff'
  | 'sabotage'
  | 'charge'
  | 'summon'
  | 'special';

export interface Intent {
  kind: IntentKind;
  amount?: number; // damage per hit, shell, buff size...
  hits?: number; // multi-hit attacks
  target?: number; // board cell for sabotage
  sabotage?: 'rust' | 'jam' | 'magnetize' | 'drain';
  label: string; // short text shown in tooltips, e.g. "Attack 8 x2"
}

export interface EnemyState {
  defId: string;
  hp: number;
  maxHp: number;
  shell: number;
  statuses: Record<string, number>; // scald, cracked, dazed, strength...
  intent: Intent;
  step: number; // position in its pattern
  phase: number; // bosses: 0-based phase index
  mem: Record<string, number>; // per-enemy scratch (heat, rage...)
}

export interface TurnContribution {
  value: number; // damage dealt + plating gained this turn
  fedBy: number | null; // uid of the part that first powered it, null if the Mainspring
}

export interface CombatState {
  kind: 'fight' | 'elite' | 'boss' | 'practice';
  turn: number; // 1-based
  ticksThisTurn: number;
  board: (PlacedPart | null)[]; // length CELLS; board[MAINSPRING] is always null (the Mainspring is implicit)
  hand: number[]; // part uids
  draw: number[];
  discard: number[];
  parts: Record<number, PartInstance>; // every part in this combat by uid
  handSize: number; // the hand is refilled to this many parts each turn (ADDED in B1)
  placementsLeft: number;
  swapUsed: boolean;
  plating: number;
  pressure: number;
  momentum: number;
  jammed: number; // ticks removed from the next turn
  playerHp: number;
  playerMaxHp: number;
  playerStatuses: Record<string, number>;
  enemies: EnemyState[];
  targetIdx: number;
  lastTurnContrib: Record<number, TurnContribution>;
  rng: Record<RngStream, number>; // stream states (only 'draw' and 'enemy' are used in combat)
  outcome: 'ongoing' | 'won' | 'lost';
  trinkets: string[];
  log: TurnSummary[];
}

export interface TurnSummary {
  turn: number;
  damage: number;
  plating: number;
  momentum: number;
  ticks: number;
}

// ---------- The event timeline ----------

/** One thing that happened while resolving a turn. The renderer replays these and never re-runs rules. */
export interface GameEvent {
  kind:
    | 'turnStart'
    | 'draw'
    | 'tick' // a new tick begins
    | 'pulse' // motion travels from `from` cell to `cell`
    | 'power' // a part is powered and fires
    | 'hold' // a part holds motion
    | 'charge'
    | 'release'
    | 'strike' // damage to enemy `target`
    | 'sweep'
    | 'plate'
    | 'pressure'
    | 'overpressure'
    | 'status' // a status applied (name in `status`)
    | 'tickAdded'
    | 'enemyAction' // an enemy performs its intent
    | 'playerHit'
    | 'enemyDied'
    | 'sabotage'
    | 'intent' // an enemy shows its next intent
    | 'combatEnd';
  tick: number; // 0 for events outside the machine's ticks
  step: number; // breadth-first depth within the tick (0 = Mainspring)
  cell?: number;
  from?: number;
  amount?: number;
  target?: number; // enemy index
  status?: string;
  uid?: number;
  note?: string;
}

export interface TurnPreview {
  damageByEnemy: number[]; // after shell and cracked, before enemy actions
  plating: number;
  pressureAfter: number;
  ticks: number;
  momentum: number;
  firing: Record<number, number>; // cell -> times its effect resolves this turn
  statuses: { target: number; status: string; amount: number }[];
  overpressure: boolean;
}

export interface TurnResult {
  events: GameEvent[];
  preview: TurnPreview; // what the machine part of the turn did (equals the preview taken before Run)
}
