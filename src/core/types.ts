// Core contract types for Clockwork Spire. Pure data: everything here is JSON-serializable state
// or a static definition keyed by id. See docs/data-model.md and docs/rules.md.

export type Family = 'gear' | 'spring' | 'cam' | 'tempo' | 'steam' | 'chime';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'masterwork' | 'legendary'; // v2: five tiers (rules 5.6)
export type RngStream = 'map' | 'draw' | 'enemy' | 'reward' | 'event' | 'shop' | 'meta'; // B10a: `meta` seeds Bellfoot's extras (the Apprentice) so no other stream moves

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

// ---------- v2 enemy machines (B7 CONTRACT; docs/rules.md 2 and 4.8, docs/data-model.md "Version 2") ----------

/** When a part acts, counted in the enemy's own turns (1 = its first turn; restarts at each warden phase). */
export type Cadence =
  | 'every'
  | 'odd'
  | 'even'
  | 'once' // its first turn only
  | 'passive' // never acts; has a passive
  | { of: number; at: number[] } // { of: 3, at: [1, 2] } = turns 1 and 2 of every 3
  | { countdown: number } // ticks down 1 per enemy turn; acts at 0 and resets (rules 2.4)
  | { buildUp: number; to: number; bonus?: 'drained' }; // gauge rises by buildUp (+ Pressure drained); acts at >= to and drops to 0

export type ActionKind =
  | 'attack' | 'pierce' | 'corrode' | 'siphon' | 'shell' | 'mend' | 'rebuild'
  | 'rust' | 'jam' | 'magnetize' | 'drain' | 'reset-pressure' | 'status' | 'summon' | 'buff' | 'purge' | 'echo' | 'rewind';

export interface ActionDef {
  kind: ActionKind;
  amount?: number; // damage per hit, shell, heal, drain, buff, rewind count
  pct?: number; // corrode: percent of the player's Plating removed (rounded up)
  hits?: number;
  status?: string; // 'status' actions: the player status applied ('corroded', 'dazed'...)
  summon?: string; // enemy def id
  count?: number; // summon count, rust part count
  target?: 'self' | 'allies'; // buff, mend
  part?: string; // rebuild: which broken part (default: the first broken one)
}

export interface EnemyPartState {
  id: string;
  hp: number;
  maxHp: number;
  broken: boolean;
  jammed: boolean; // skips its next action (and a countdown doesn't tick)
  countdown?: number; // countdown parts: turns left
  gauge?: number; // build-up parts: current gauge
  acted: number; // times it has acted (escalation)
  tookThisTurn: number; // damage taken during the current player turn (Braced)
}

/** What one part (or the core) will do on the enemy's next turn; shown on that part's anchor. */
export interface PartIntent {
  partId: string; // a part id, or 'core'
  actions: ActionDef[];
  kind: IntentKind; // icon
  label: string; // e.g. "Pierce 7", "Corrode 50%, Attack 13"
  target?: number; // sabotage board cell
  targets?: number[];
}

/** A target-order entry: enemy index and part id, or 'core'. */
export type TargetRef = `e${number}.${string}`;

/** A part broken this fight that drops as salvage (rules 2.5). */
export interface SalvageItem {
  enemy: number;
  partId: string;
  salvage: string; // player part id, or 'spire-key'
  rarity: Rarity;
  locked: boolean; // salvage not yet unlocked: pays 6 instead (rules 2.5)
  plus?: boolean; // B10a Scrapper: the first part salvage of the fight is kept upgraded
  scrapper?: boolean; // B10a Scrapper: a wrecked part's salvage offered once per combat (marked "Scrapper" in the tray)
}

export interface EnemyState {
  defId: string;
  hp: number; // the core's HP (v1: the only HP)
  maxHp: number;
  shell: number;
  statuses: Record<string, number>; // scald, cracked, dazed, strength... (the whole frame)
  /** DEPRECATED summary kept in sync by the engine for v1 consumers: the first entry of `intents`, or a quiet intent. */
  intent: Intent;
  step: number; // v1 pattern position (legacy enemies)
  phase: number; // 0-based phase index
  mem: Record<string, number>; // per-enemy scratch (heat, rage...)
  // v2 (frame enemies; legacy enemies have parts [] and one 'core' intent):
  parts: EnemyPartState[];
  sealed: boolean; // the core can't be targeted or damaged
  intents: PartIntent[];
  turnsActed: number; // enemy turns taken in this phase (cadence counter)
  phaseActionPending: boolean; // the next enemy turn is the phase action only (rules 4.8)
  coreTookThisTurn: number; // damage the core took during the current player turn (Braced, Ratchet)
  overwound?: boolean;
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
  swapUsed: boolean; // no free swap left this turn
  swapsUsed?: number; // B9b: free swaps used this turn (Two Left Hands gives two)
  plating: number;
  pressure: number;
  momentum: number;
  jammed: number; // ticks removed from the next turn
  playerHp: number;
  playerMaxHp: number;
  playerStatuses: Record<string, number>;
  enemies: EnemyState[];
  /** DEPRECATED: kept in sync by the engine (the enemy of the first standing order entry, else the leftmost living). */
  targetIdx: number;
  order: TargetRef[]; // v2 target order (rules 2.3), up to 6
  broken: SalvageItem[]; // v2: parts broken this fight with a salvage
  wrecked: number; // v2: parts left standing when their core died (1 Scrap each)
  lastTurnContrib: Record<number, TurnContribution>;
  rng: Record<RngStream, number>; // stream states (only 'draw' and 'enemy' are used in combat)
  outcome: 'ongoing' | 'won' | 'lost';
  /** B9a: this fight's play style so far, accumulated per turn from the event timeline; recordFight moves it into the run. */
  planAcc?: PlanStats;
  /** B10c: a climb combat (run fights): the per-act percents of content/balance.ts apply (attack amounts, regular core HP). Test and practice combats are unscaled. */
  curved?: boolean;
  /** B10b: the run's mode and Overwind level, copied at combat start so summons scale too (missing: journeyman, 0). */
  mode?: string;
  overwind?: number;
  /** B9b: the Inventor's Watch snapshot taken just before the last Run (only while the trinket is held): the whole combat
   * state (board, charges, Pressure, HP, statuses, every enemy, hand, draw order, every random stream, tallies), minus
   * these two fields. A reload keeps it. */
  watchSnapshot?: WatchSnapshot;
  /** B9b: the Watch was used this combat. Lives outside the snapshot. */
  watchUsed?: boolean;
  trinkets: string[];
  log: TurnSummary[];
}

/** B9b: a CombatState as it stood before a Run; JSON-serializable. */
export type WatchSnapshot = Omit<CombatState, 'watchSnapshot' | 'watchUsed'>;

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
    | 'unmagnetize' // a magnetized part at `cell` returns to the hand at turn start
    // B7 additions (v2 machines). `part` names the enemy part (`target` is the enemy index):
    | 'partHit' // part `part` of enemy `target` loses `amount`
    | 'partBroken' // part `part` of enemy `target` breaks; its intent is cancelled
    | 'partRebuilt' // Mend rebuilt part `part` at `amount` HP
    | 'braced' // `amount` damage to `part` (or the core) was lost to Braced
    | 'lost' // `amount` damage was lost past a target (no carry); `part` the target
    | 'corrode' // the player lost `amount` Plating to Corrode
    | 'pierce' // the player took `amount` that ignored Plating
    | 'siphon' // enemy `target` healed `amount` from Plating removed
    | 'gauge' // a countdown or build-up on `part` changed to `amount`
    | 'phaseAction' // a warden's phase action (`note` = action kind)
    | 'order'; // the target order changed (UI only)
  tick: number; // 0 for events outside the machine's ticks
  step: number; // breadth-first depth within the tick (0 = Mainspring)
  cell?: number;
  from?: number;
  amount?: number;
  target?: number; // enemy index
  part?: string; // B7: enemy part id ('core' for the core)
  status?: string;
  uid?: number;
  note?: string;
  /** B9b: on 'partBroken': the player word that broke it ('strike' | 'drill' | 'shatter' | 'pry' | 'sweep' | 'status'). */
  word?: string;
  /** B9b: on 'partBroken': what stood protecting that enemy at the hit, any of 'shell' (Shell above 0), 'bulwark', 'governor'
   * (a standing passive part), even when the word (Drill) ignored it. Omitted when none. */
  protectedBy?: string[];
  /** B9b: on 'partBroken': who broke it; omitted for the player's machine. Sprocket's Whistle sets 'sprocket'. */
  by?: 'sprocket';
  /** B9b: the item behind this event, for a replay cue ('night-watchman', 'skewframe', 'mirror-gear', 'resonance-rod', 'perpetual-engine',
   * 'bottled-dusk', 'carry', 'shared'). The stage only reads it. */
  item?: string;
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
  /** B7: per target-order entry and every part or core hit: damage it takes, and whether it breaks or dies. */
  byTarget: Record<string, { damage: number; breaks: boolean }>;
  /** B7: intents cancelled because their part breaks this turn. */
  cancelled: { enemy: number; partId: string }[];
}

export interface TurnResult {
  events: GameEvent[];
  preview: TurnPreview; // what the machine part of the turn did (equals the preview taken before Run)
}

// ---------- The run (B3 contract; see docs/data-model.md and docs/rules.md section 4) ----------

export type NodeType = 'fight' | 'elite' | 'event' | 'forge' | 'oil' | 'shop' | 'boss';

// ---------- v2 the climb (B8 CONTRACT; docs/rules.md 4.1 to 4.7, docs/briefs/B8-the-climb.md) ----------
// Additive: these sit beside v1's map, nodeId, floor and cogs until the B8 gate removes the old flow.

export type RoomKind = 'fight' | 'workbench' | 'oil' | 'trader' | 'event' | 'vault' | 'entry' | 'door';

export interface Room {
  id: string; // 'r0'... (entry is r0)
  floor: number; // 0 = bottom
  slot: number; // position along the floor, left to right
  kind: RoomKind;
  encounter?: string[]; // fight rooms: enemy ids (rolled at generation, `map` stream)
  eventId?: string; // event rooms
  guardian?: string; // vault rooms: the elite guarding it
  visited: boolean;
  cleared: boolean; // a fight won, an event resolved, a vault taken
  revealed: boolean; // its kind is shown (visited or next to a visited room)
  used?: boolean; // an oil station used, a workbench visited this time
}

export interface Passage {
  a: string;
  b: string;
  kind: 'floor' | 'stairs' | 'duct' | 'lift';
  locked?: boolean; // a locked door: a Spire Key or picking the lock (rules 4.6)
  shortcut?: boolean; // a landmark shortcut (B10)
}

export interface ActSection {
  act: 1 | 2 | 3;
  rooms: Room[];
  passages: Passage[];
  entry: string;
  door: string; // the warden's door
}

export interface RoamingElite {
  defId: string;
  patrol: string[]; // a loop of 3 to 5 room ids
  at: number; // index into patrol
  defeated: boolean;
}

export interface TradeItem {
  kind: 'part' | 'trinket' | 'oil';
  id?: string;
  value: number; // in Scrap (rules 4.5)
  sold: boolean;
}

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
  | { kind: 'trader'; stock: TradeItem[] } // B8
  | { kind: 'workbench'; usedUpgrade: boolean; usedRemove: boolean; usedFuse: boolean; fuse?: { a: number; b: number; candidates: string[] } } // B8
  | { kind: 'door'; passage: number } // B8: index into section.passages
  | { kind: 'salvage'; items: SalvageItem[]; wrecked?: number; cogs: number; trinkets: string[]; blueprint?: string; extraBlueprint?: string; trinketTaken: boolean; done: boolean } // B7: replaces 'reward' after fights (Cogs stand in for Scrap until B8)
  | { kind: 'reward'; cogs: number; parts: string[]; trinkets: string[]; blueprint?: string; extraBlueprint?: string; partTaken: boolean; trinketTaken: boolean }
  | { kind: 'event'; eventId: string; result?: string; needsPart?: 'remove' | 'upgrade' | 'duplicate' | 'transform' | 'sell'; choice?: number; partFilter?: Family } // choice, partFilter ADDED in B3
  | { kind: 'shop'; stock: ShopItem[]; removalsBought: number }
  | { kind: 'forge'; done: boolean }
  | { kind: 'oil'; done: boolean }
  | { kind: 'legendary'; options: string[]; after?: Pending }; // B9b: the Queen's core: one or two Legendary ids (parts or trinkets), take one, no skip

/** B9a: a run's main plan, for the Clockmaker's memory (rules 5.4). */
export type Plan = 'plating' | 'burst' | 'pressure' | 'statuses';
export type PlanStats = Record<Plan, number>;

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
  bonusBrass?: number; // ADDED in B3: Brass from events (includes clockBrass)
  clockBrass?: number; // B9a: Brass from broken Clockmaker parts (already counted in bonusBrass), for the breakdown
  /** B9a: the run's play style by source (docs/briefs/B9a-wardens.md), filled by recordFight. */
  plan?: PlanStats;
  // B9b achievement facts (docs/briefs/B9b-rarity.md "Achievement facts"); all optional so older runs load. Counted by
  // recordFight and the call sites named there (progression lane).
  partsBroken?: number; // enemy parts the player broke this run (retracted parts are not broken)
  partsBrokenAct1?: number; // the same, counted only while in act 1
  fuses?: number; // fuses done this run
  vaultsByAct?: [number, number, number]; // vaults opened in act 1, 2, 3
  elitesByAct?: [number, number, number]; // elites defeated in act 1, 2, 3
  bells?: { act: number; hoursLeft: number }[]; // bells rung early (section.ts ringBell)
  overpressured?: boolean; // an overpressure happened this run
  scaldBest?: number; // most Scald damage dealt in one fight
  drillThrough?: boolean; // a Drill broke a part that Shell, Bulwark or Governor protected
  shatterTriple?: boolean; // 3 parts of one enemy broken by Shatter in one turn
  wreckWins?: number; // fights won by killing a core with 2+ of its parts standing
  wardenFights?: { enemy: string; turns: number; hpLost: number; allBroken: boolean; won: boolean }[]; // one entry per warden fight; hpLost excludes damage Plating absorbed
  offers: { partId: string; taken: boolean; act: number; source: 'reward' | 'shop' | 'trader' | 'fuse' | 'salvage' }[]; // for the balance sim (rules 7)
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
  /** B8 transition: true keeps v1's map flow (newRun does not start the climb); `defaultRunConfig` sets it so the v1 tests and bots run unchanged. Real runs (meta `runConfigFor`) leave it unset. Removed at the gate. */
  legacyMap?: boolean;
  /** B10a: the resident stalls' combined effect on this run (docs/content.md 6); `runConfigFor` fills it. Undefined: none. */
  residentPatch?: RunConfigPatch;
  /** B10b: the difficulty mode id (content/modes.ts); missing means 'journeyman'. */
  mode?: string;
  /** B10b: the Overwind level 0 to 10; missing means 0. */
  overwind?: number;
  /** B10a: the landmarks' combined effect on map generation; `startAct` passes it to `generateSection`. Undefined: none. */
  mapPatch?: MapGenPatch;
  /** B10a: resident ids living in Bellfoot when the run started (resident events that would offer them again are not placed). */
  residents?: string[];
  /** B9a: the plan the Clockmaker remembers (memoryPlan of the profile's planHistory); null or missing: no memory part. */
  memory?: Plan | null;
  /** B9b: Masterwork and Legendary trinkets the profile's achievements have unlocked (parts go in `unlockedParts`). */
  unlockedTrinkets?: string[];
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
  phase: 'map' | 'combat' | 'reward' | 'event' | 'shop' | 'forge' | 'oil' | 'victory' | 'defeat' | 'section' | 'workbench' | 'trader' | 'door'; // B8: the last four are the climb's
  combat: CombatState | null;
  pending: Pending | null;
  recentEncounters: string[]; // last 3 encounter keys, to avoid repeats
  stats: RunStats;
  /** B9b: the run's one Legendary (part or trinket id), or null; replaces data-model's `legendaryTaken`. */
  legendary: string | null;
  // B10a: Bellfoot's memory in a run (flags stays boolean). All migrate to these defaults.
  oilFlasks: number; // Oil Flasks held: used outside combat in any room, heal 15, no hour
  resident: string | null; // the resident this run's event sent to Bellfoot (added to the profile at the run's end)
  met: string[]; // enemy ids met this run (merged into profile.bestiary at the run's end)
  lore: string[]; // lore moments heard: 'hour-ghost', 'stopped-clock', 'empty-chair', 'unsent-letter'
  flags: Record<string, boolean>; // secondWindUsed, firstEliteThisAct..., event once-flags
  killedBy?: string;
  // B8 the climb (optional while v1's flow still exists; new runs set them all):
  section?: ActSection;
  roomId?: string;
  hour?: number;
  hours?: number; // hours per act for this run's mode (Journeyman 12)
  elites?: RoamingElite[];
  scrap?: number; // replaces cogs
  keys?: number; // Spire Keys held
  prepared?: number; // extra placements on the warden's first turn (the bell)
  overwound?: boolean; // the warden caught you at midnight
}

// ---------- B10a patches (docs/data-model.md "Version 2") ----------

/** What a resident stall (or, in B10b, an Overwind twist) changes at the start of a run. All fields optional; none applied before B10a.1. */
export interface RunConfigPatch {
  oilFlasks?: number; // Oil Merchant: start with this many Oil Flasks
  upgradedStarters?: number; // Apprentice: this many more starting parts upgraded (the `meta` stream)
  revealRooms?: boolean; // Lamplighter: every room's kind is shown in every act
  extraTraders?: number; // Trader's cousin: this many extra traders per act (converts a regular fight room)
  loreAndBestiary?: boolean; // Hour Ghost: the archivist gains lore pages and full bestiary entries
}

/** What landmarks change in section generation. `generateSection` ignores it before B10a.1. */
export interface MapGenPatch {
  lift?: boolean; // Gearworks (act 1): a lift passage from the entry to one middle-floor room (floor 3), never next to the door
  knownVaults?: (1 | 2 | 3)[]; // acts whose vault is a known room with a regular-fight guardian
  beacon?: boolean; // act 3: every elite patrol and the door shown from the start, +1 hour
  revealRooms?: boolean; // every room's kind shown (Lamplighter)
  extraTraders?: number; // the Trader's cousin: converts regular fight rooms into traders (never the opening fight)
  excludeEvents?: string[]; // event ids not placed (a resident who lives in Bellfoot, a landmark already made)
}

export interface RunRecord {
  n: number;
  seed: number;
  chassis: string;
  result: 'win' | 'loss' | 'abandoned';
  act: number;
  floor: number;
  killedBy?: string;
  /** B10b: the mode and Overwind level the run was played on (missing on older records: journeyman, 0). */
  mode?: string;
  overwind?: number;
  brassEarned: number;
  blueprintsFound: string[];
  partsAtEnd: string[];
  trinkets: string[];
  turns: number;
  biggestTurn: number;
  endedAt: string; // ISO; filled by the app, never by core
}

// ---------- Meta-progression and saves (B4 contract; docs/data-model.md, docs/rules.md section 5) ----------

export type SprocketMood = 'celebrate' | 'happy' | 'comfort';

export interface Profile {
  version: number;
  name: string;
  createdAt: string; // ISO, from the app
  brass: number;
  brassEarnedTotal: number;
  blueprints: string[]; // part ids unlocked into the run pool
  upgrades: Record<string, number>; // upgrade id -> level bought
  chassisUnlocked: string[]; // starts ['tinker']
  runsStarted: number;
  runsFinished: number;
  wins: number;
  bestFloor: number; // absolute floor across acts (act 2 floor 3 = 16)
  history: RunRecord[]; // newest first, capped at 100
  storyFlags: string[]; // milestones reached (unlock Workshop notes)
  lastSprocketMood: SprocketMood | null;
  finishedSeeds: number[]; // seeds already settled by finishRun (guards double payout), last 20
  /** B9a: main plans of the last three finished runs, oldest first (rules 5.4); migrates to []. */
  planHistory?: Plan[];
  // B10a (docs/briefs/B10a-bellfoot.md): Bellfoot's memory. All migrate to empty / null.
  residents: string[]; // resident ids living in Bellfoot (content/residents.ts)
  landmarks: string[]; // landmark ids: 'lift', 'vault-1', 'vault-2', 'vault-3', 'beacon' (content/landmarks.ts)
  journal: string[]; // journal page ids, in the order found
  bestiary: string[]; // enemy ids met
  collars: string[]; // collar ids earned (content/collars.ts)
  collar: string | null; // the collar Sprocket wears
  /** B10b: modes open to the player (starts ['apprentice', 'journeyman']; migrates to that). */
  modesUnlocked: string[];
  /** B10b: the last mode and Overwind level chosen at the clock tower door (defaults 'journeyman', 0). */
  lastMode: string;
  lastOverwind: number;
  /** B9b: achievement id -> ISO time it was earned (docs/content.md section 7). Migrates to {}. */
  achievements: Record<string, string>;
  /** B9b: counters across runs (pets, bells with 3+ hours, parts broken, wrecking wins, per-chassis win flags). Migrates to {}. */
  achievementProgress: Record<string, number>;
  /** B9b: rewards with no system yet are recorded here (the trophy shelf lists them; B10 applies them). Migrates to empty. */
  rewards: ProfileRewards;
}

export interface ProfileRewards {
  journal: string[];
  collars: string[];
  landmarks: string[];
  overwind: number; // highest Overwind level earned so far
  chassis: string[]; // e.g. 'scrapper'; the chassis rack never offers it before B10 builds it
}

export interface SaveSlot {
  slot: 1 | 2 | 3;
  version: number;
  profile: Profile;
  run: RunState | null;
  updatedAt: string; // ISO
}

export interface Settings {
  version: number;
  master: number; // 0..1
  music: number;
  effects: number;
  muted: boolean;
  speed: '1x' | '2x' | 'skip';
  colorBlindIcons: boolean;
  reducedEffects: boolean;
}
