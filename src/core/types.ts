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

/** Status ids. Enemy: scald, cracked, dazed, strength (attack bonus). Player: corroded, grit. */
export const ENEMY_STATUSES = ['scald', 'cracked', 'dazed', 'strength'] as const;
export const PLAYER_STATUSES = ['corroded', 'grit'] as const;

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
  targets?: number[]; // ADDED in B2: every board cell a multi-target sabotage names (`target` is the first)
  status?: string; // ADDED in B2: for kind 'debuff', the player status applied (e.g. 'corroded')
  alsoAttack?: number; // ADDED in B2: a combined intent also attacks for this much (Jam + Attack 6)
  alsoShell?: number; // ADDED in B2: a combined intent also gains this much Shell (Jam + Shell 12)
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
  dmg?: number; // ADDED in B3: damage (HP removed) alone, for the Clockmaker's Rewind heal
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
  chassis?: string; // ADDED in B3: chassis id (passives)
  flags?: Record<string, number>; // ADDED in B3: once-per-combat markers (trinkets, passives)
  extraDraw: number; // ADDED in B2: extra parts drawn at the next turn start (Sprocket Wheel); saves from B1 may lack it
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
    | 'combatEnd'
    // B2 additions (contract for the stage and UI lanes):
    | 'echo' // a part fires its effect again (Lever, Echo Chamber)
    | 'heal' // player healed `amount`
    | 'statusTick' // a status ticks (e.g. scald damage at end of enemy turn), `status`, `amount`, `target`
    | 'shell' // enemy `target` gains Shell `amount`
    | 'buff' // enemy `target` buffs (note: what), `amount`
    | 'summon' // enemy `target` (new index) appears; `note` = def id
    | 'phase' // boss `target` enters phase `amount` (0-based); `note` = short line
    | 'enemyHeal' // ADDED in B2: enemy `target` heals `amount`
    | 'rewind' // Clockmaker lifts the part at `cell` (uid) back to the draw pile (B3)
    | 'unmagnetize'; // a magnetized part at `cell` returns to the hand at turn start
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

// ---------- The run (B3 contract; see docs/data-model.md and docs/rules.md section 4) ----------

export type NodeType = 'fight' | 'elite' | 'event' | 'forge' | 'oil' | 'shop' | 'boss';

export interface MapNode {
  id: string; // `${act}-${floor}-${lane}`
  floor: number; // 1..13 (13 = boss)
  lane: number; // 0..3
  type: NodeType;
  next: string[]; // node ids on floor + 1
  visited: boolean;
}

export interface ActMap {
  act: 1 | 2 | 3;
  nodes: MapNode[];
}

export interface ShopItem {
  kind: 'part' | 'trinket' | 'removal' | 'oil';
  id?: string; // part or trinket id
  price: number;
  sold: boolean;
}

export type Pending =
  | { kind: 'reward'; cogs: number; parts: string[]; trinkets: string[]; blueprint?: string; extraBlueprint?: string; partTaken: boolean; trinketTaken: boolean }
  | { kind: 'event'; eventId: string; result?: string; needsPart?: 'remove' | 'upgrade' | 'duplicate' | 'transform' | 'sell'; choice?: number; partFilter?: Family } // choice, partFilter ADDED in B3
  | { kind: 'shop'; stock: ShopItem[]; removalsBought: number }
  | { kind: 'forge'; done: boolean }
  | { kind: 'oil'; done: boolean };

export interface RunStats {
  turns: number;
  biggestTurn: number;
  fights: number;
  elites: number;
  bossesBeaten: number;
  brassEarned: number;
  blueprintsFound: string[];
  removals?: number; // ADDED in B3: shop removals bought this run (raises the price)
  floorBrass?: number; // ADDED in B3: Brass from floors climbed (4/6/8 by act)
  bonusBrass?: number; // ADDED in B3: Brass from events
  offers: { partId: string; taken: boolean; act: number; source: 'reward' | 'shop' }[]; // for the balance sim (rules 7)
}

/** Everything a run needs from the profile at its start (B4 fills it from upgrades; B3 uses defaults). */
export interface RunConfig {
  seed: number;
  chassis: string; // 'tinker' | 'stoker' | 'horologist'
  maxHp: number; // base 50 (+5 per Reinforced Frame)
  cogs: number; // base 0 (+25 per Spare Cogs)
  handSize: number; // 3 (4 with Tool Belt)
  upgradedStarters: number; // Oiled Bearings level
  trinkets: string[]; // e.g. Lucky Charm's random common
  unlockedParts: string[]; // blueprint ids found so far (locked parts that are now in the pool)
  rewardChoices: number; // 3 (4 with Inventor's Notes I)
  extraEliteBlueprint: boolean; // Inventor's Notes II
  secondWind: boolean;
}

export interface RunState {
  version: number;
  config: RunConfig;
  rng: Record<RngStream, number>;
  act: 1 | 2 | 3;
  floor: number; // 0 before choosing the first node; 1..13
  hp: number;
  maxHp: number;
  cogs: number;
  bin: PartInstance[];
  nextUid: number;
  trinkets: string[];
  map: ActMap;
  nodeId: string | null;
  phase: 'map' | 'combat' | 'reward' | 'event' | 'shop' | 'forge' | 'oil' | 'victory' | 'defeat';
  combat: CombatState | null;
  pending: Pending | null;
  recentEncounters: string[]; // last 3 encounter keys, to avoid repeats
  stats: RunStats;
  flags: Record<string, boolean>; // secondWindUsed, firstEliteThisAct..., event once-flags
  killedBy?: string;
}

export interface RunRecord {
  n: number;
  seed: number;
  chassis: string;
  result: 'win' | 'loss' | 'abandoned';
  act: number;
  floor: number;
  killedBy?: string;
  brassEarned: number;
  blueprintsFound: string[];
  partsAtEnd: string[];
  trinkets: string[];
  turns: number;
  biggestTurn: number;
  endedAt: string; // ISO; filled by the app, never by core
}
