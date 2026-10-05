// Combat flow: create, place, swap, preview, run a whole turn. Functions mutate the CombatState in place.
import { CELLS, MAINSPRING } from './types';
import type { CombatState, EnemyState, GameEvent, PartInstance, Plan, PlanStats, TurnPreview, TurnResult, WatchSnapshot } from './types';
import { inBoard } from './board';
import { enemyDef } from './content/enemies';
import { afterPlayerTurn, chooseIntent, enemyTurn, newEnemy, summonEnemy } from './enemy';
import { initPart } from './framelib';
import { beforeEnemyTurn, canPlaceAt, onPlatingFall, onTurnStart } from './itemhooks';
import { defaultOrder, defaultOrderFor, syncTargetIdx } from './frames';
import { PARTS } from './content/parts';
import { trinketDef } from './content/trinkets';
import { anyAlive, hasTrinket, MAX_TICKS, runEnemyAttackHooks, runMachine, runTurnStartHooks } from './machine';
import { initStreams, shuffle } from './rng';

export { chooseIntent };

export const BASE_TICKS = 3;
export const BASE_PLACEMENTS = 2;
export const DEFAULT_HAND_SIZE = 3;

export interface CreateCombatOpts {
  seed: number;
  bin: PartInstance[];
  enemies: string[];
  hp: number;
  maxHp: number;
  kind?: CombatState['kind'];
  trinkets?: string[];
  handSize?: number;
  /** Draw pile in bin order, the first bin entry drawn first (the guided first fight). */
  noShuffle?: boolean;
  /** Starting Pressure (Stoker passive, Bellows). */
  pressure?: number;
  /** Chassis id: Tinker refunds the first replace, Stoker starts with 6 Pressure, Horologist's first turn has +1 tick. */
  chassis?: string;
  /** B8: the warden came at midnight: it starts with Strength 3 and Shell 10 (rules 4.2). */
  overwound?: boolean;
  /** B8: rang the bell early: this many extra placements on turn 1 (at most 2). */
  prepared?: number;
  /** B9a: the plan the Clockmaker remembers; he starts with the matching memory part (frame.memoryParts). */
  memory?: Plan | null;
}

export function createCombat(o: CreateCombatOpts): CombatState {
  const rng = initStreams(o.seed);
  const parts: Record<number, PartInstance> = {};
  for (const p of o.bin) parts[p.uid] = { uid: p.uid, defId: p.defId, plus: p.plus };
  const c: CombatState = {
    kind: o.kind ?? 'fight',
    turn: 0,
    ticksThisTurn: BASE_TICKS,
    board: new Array(CELLS).fill(null),
    hand: [],
    draw: o.noShuffle
      ? o.bin.map((p) => p.uid).reverse() // draws pop from the end, so the first bin entry comes out first
      : shuffle(
          rng,
          'draw',
          o.bin.map((p) => p.uid),
        ),
    discard: [],
    parts,
    handSize: o.handSize ?? DEFAULT_HAND_SIZE,
    extraDraw: 0,
    placementsLeft: BASE_PLACEMENTS,
    swapUsed: false,
    plating: 0,
    pressure: (o.pressure ?? 0) + (o.chassis === 'stoker' ? 6 : 0) + (o.trinkets?.includes('bellows') ? 4 : 0),
    momentum: 0,
    jammed: 0,
    playerHp: o.hp,
    playerMaxHp: o.maxHp,
    playerStatuses: {},
    enemies: [],
    targetIdx: 0,
    order: [],
    broken: [],
    wrecked: 0,
    lastTurnContrib: {},
    rng,
    outcome: 'ongoing',
    trinkets: (o.trinkets ?? []).slice(),
    log: [],
    chassis: o.chassis,
    flags: {},
  };
  for (const id of o.enemies) c.enemies.push(newEnemy(id));
  if (o.memory) {
    for (const e of c.enemies) {
      const m = enemyDef(e.defId).frame?.memoryParts?.[o.memory];
      if (m) e.parts.push(initPart(m));
    }
  }
  if (o.overwound) {
    for (const e of c.enemies) {
      e.statuses.strength = 3;
      e.shell = 10;
      e.overwound = true;
    }
  }
  const initial = c.enemies.length;
  for (let i = 0; i < initial; i++) enemyDef(c.enemies[i].defId).onStart?.(c, i);
  for (let i = 0; i < initial; i++) {
    for (const id of enemyDef(c.enemies[i].defId).frame?.startSummons ?? []) summonEnemy(c, id, null);
  }
  for (let i = 0; i < initial; i++) chooseIntent(c, i); // companions summoned by onStart chose their own
  c.order = defaultOrder(c);
  syncTargetIdx(c);
  beginTurn(c, []);
  c.placementsLeft += Math.max(0, Math.min(2, o.prepared ?? 0));
  for (const id of c.trinkets) trinketDef(id).onCombatStart?.(c);
  return c;
}

/** Hand-written deep copy: fast, and the engine for previews. */
export function cloneCombat(c: CombatState): CombatState {
  const parts: Record<number, PartInstance> = {};
  for (const k in c.parts) {
    const p = c.parts[k];
    parts[k] = { uid: p.uid, defId: p.defId, plus: p.plus };
  }
  const contrib: CombatState['lastTurnContrib'] = {};
  for (const k in c.lastTurnContrib) {
    contrib[k] = { value: c.lastTurnContrib[k].value, fedBy: c.lastTurnContrib[k].fedBy, dmg: c.lastTurnContrib[k].dmg };
  }
  return {
    kind: c.kind,
    turn: c.turn,
    ticksThisTurn: c.ticksThisTurn,
    board: c.board.map((p) => (p ? { ...p } : null)),
    hand: c.hand.slice(),
    draw: c.draw.slice(),
    discard: c.discard.slice(),
    parts,
    handSize: c.handSize,
    extraDraw: c.extraDraw ?? 0,
    placementsLeft: c.placementsLeft,
    swapUsed: c.swapUsed,
    plating: c.plating,
    pressure: c.pressure,
    momentum: c.momentum,
    jammed: c.jammed,
    playerHp: c.playerHp,
    playerMaxHp: c.playerMaxHp,
    playerStatuses: { ...c.playerStatuses },
    enemies: c.enemies.map(
      (e): EnemyState => ({
        ...e,
        statuses: { ...e.statuses },
        intent: { ...e.intent },
        mem: { ...e.mem },
        parts: (e.parts ?? []).map((p) => ({ ...p })),
        intents: (e.intents ?? []).map((i) => ({ ...i, actions: i.actions.map((a) => ({ ...a })), targets: i.targets?.slice() })),
      }),
    ),
    targetIdx: c.targetIdx,
    order: (c.order ?? []).slice(),
    broken: (c.broken ?? []).map((b) => ({ ...b })),
    wrecked: c.wrecked ?? 0,
    lastTurnContrib: contrib,
    rng: { ...c.rng },
    outcome: c.outcome,
    planAcc: c.planAcc ? { ...c.planAcc } : undefined,
    watchSnapshot: c.watchSnapshot,
    watchUsed: c.watchUsed,
    trinkets: c.trinkets.slice(),
    log: c.log.slice(),
    chassis: c.chassis,
    flags: { ...(c.flags ?? {}) },
    swapsUsed: c.swapsUsed,
  };
}

// ---------- Player actions ----------

export function placePart(c: CombatState, handIndex: number, cellIdx: number): boolean {
  if (c.outcome !== 'ongoing' || c.placementsLeft <= 0) return false;
  if (!inBoard(cellIdx) || cellIdx === MAINSPRING) return false;
  if (!Number.isInteger(handIndex) || handIndex < 0 || handIndex >= c.hand.length) return false;
  const uid = c.hand[handIndex];
  const inst = c.parts[uid];
  if (!canPlaceAt(c, inst.defId, cellIdx)) return false; // B9b hook (items-engine): the Twin Mainspring's D2-only rule
  const old = c.board[cellIdx];
  if (old) c.discard.push(old.uid);
  const flags = (c.flags ??= {});
  const refund = !!old && c.chassis === 'tinker' && !flags.tinkerRefund; // Tinker: the first replace each combat is free
  if (refund) flags.tinkerRefund = 1;
  c.hand.splice(handIndex, 1);
  c.board[cellIdx] = {
    uid,
    defId: inst.defId,
    plus: inst.plus,
    charge: 0,
    counter: 0,
    rusted: 0,
    magnetized: false,
    firedThisTurn: 0,
  };
  if (!refund) c.placementsLeft -= 1;
  return true;
}

/** Free swaps per turn: one, two with Two Left Hands (B9b). */
const swapLimit = (c: CombatState): number => (hasTrinket(c, 'two-left-hands') ? 2 : 1);

function useSwap(c: CombatState): void {
  c.swapsUsed = (c.swapsUsed ?? 0) + 1;
  c.swapUsed = c.swapsUsed >= swapLimit(c);
}

/** Two Left Hands (B9b): trade the board part at `cellIdx` with the part at `handIndex` of the hand; uses one of the two swaps. */
export function swapWithHand(c: CombatState, cellIdx: number, handIndex: number): boolean {
  if (c.outcome !== 'ongoing' || c.swapUsed || !hasTrinket(c, 'two-left-hands')) return false;
  if (!inBoard(cellIdx) || cellIdx === MAINSPRING) return false;
  const onBoard = c.board[cellIdx];
  if (!onBoard || !Number.isInteger(handIndex) || handIndex < 0 || handIndex >= c.hand.length) return false;
  const uid = c.hand[handIndex];
  const inst = c.parts[uid];
  if (!canPlaceAt(c, inst.defId, cellIdx)) return false;
  c.hand[handIndex] = onBoard.uid;
  c.board[cellIdx] = { uid, defId: inst.defId, plus: inst.plus, charge: 0, counter: 0, rusted: 0, magnetized: false, firedThisTurn: 0 };
  useSwap(c);
  return true;
}

/** Free, once per turn (twice with Two Left Hands): swap the positions of two parts already on the board. */
export function swapParts(c: CombatState, a: number, b: number): boolean {
  if (c.outcome !== 'ongoing' || c.swapUsed || a === b) return false;
  if (!inBoard(a) || !inBoard(b) || a === MAINSPRING || b === MAINSPRING) return false;
  if (!c.board[a] || !c.board[b]) return false;
  if (!canPlaceAt(c, c.board[a]!.defId, b) || !canPlaceAt(c, c.board[b]!.defId, a)) return false; // the Twin Mainspring stays on D2
  [c.board[a], c.board[b]] = [c.board[b], c.board[a]];
  useSwap(c);
  return true;
}

/** v1 shortcut: aim at one enemy (its default order: acting parts, then its core). */
export function setTarget(c: CombatState, idx: number): void {
  if (!c.enemies[idx] || c.enemies[idx].hp <= 0) return;
  c.order = defaultOrderFor(c, idx);
  c.targetIdx = idx;
}

/** What Run would do now. Runs the real machine on a copy; never mutates `c`. */
export function previewTurn(c: CombatState): TurnPreview {
  return runMachine(cloneCombat(c), []);
}

// ---------- A whole turn ----------

/** B9a: put this turn's events into the fight's plan stats (plating, burst, pressure, statuses; docs/briefs/B9a-wardens.md). */
function accumulatePlan(c: CombatState, events: GameEvent[]): void {
  const acc: PlanStats = (c.planAcc ??= { plating: 0, burst: 0, pressure: 0, statuses: 0 });
  for (const ev of events) {
    const n = ev.amount ?? 0;
    if (n <= 0) continue;
    if (ev.kind === 'plate') acc.plating += n;
    else if (ev.kind === 'strike' || ev.kind === 'partHit') {
      const def = ev.uid !== undefined ? c.parts[ev.uid]?.defId : undefined;
      const steam = def ? PARTS[def]?.family === 'steam' : ev.tick === 0 && ev.uid === undefined; // overpressure damage (Steam Locket) has no part
      acc[steam ? 'pressure' : 'burst'] += n;
    } else if (ev.kind === 'statusTick' && ev.status === 'scald') acc.statuses += n;
  }
}

/** B9b: the Inventor's Watch snapshot: the whole combat as it stands, without the Watch's own fields. JSON-serializable. */
function watchShot(c: CombatState): WatchSnapshot {
  const s = cloneCombat(c);
  delete s.watchSnapshot;
  delete s.watchUsed;
  return s;
}

/** The Inventor's Watch: once per combat, restore the snapshot taken just before the last Run (also after a lost Run). */
export function windBack(c: CombatState): boolean {
  const snap = c.watchSnapshot;
  if (!snap || c.watchUsed || c.outcome === 'won') return false;
  const back = structuredClone(snap) as CombatState;
  for (const k of Object.keys(c)) if (!(k in back) && k !== 'watchSnapshot' && k !== 'watchUsed') delete (c as unknown as Record<string, unknown>)[k]; // keys a JSON save dropped as undefined
  Object.assign(c, back);
  delete c.watchSnapshot;
  c.watchUsed = true;
  return true;
}

export function runTurn(c: CombatState): TurnResult {
  if (c.outcome === 'ongoing' && !c.watchUsed && hasTrinket(c, 'inventors-watch')) c.watchSnapshot = watchShot(c);
  const r = runTurnInner(c);
  accumulatePlan(c, r.events);
  return r;
}

function runTurnInner(c: CombatState): TurnResult {
  const events: GameEvent[] = [];
  if (c.outcome !== 'ongoing') return { events, preview: previewTurn(c) };

  const preview = runMachine(c, events);
  for (const p of c.board) if (p && p.rusted > 0) p.rusted -= 1;
  tickPlayerStatuses(c);
  c.discard.push(...c.hand);
  c.hand = [];
  const dealt = preview.damageByEnemy.reduce((a, b) => a + b, 0);
  c.log.push({ turn: c.turn, damage: dealt, plating: preview.plating, momentum: preview.momentum, ticks: preview.ticks });

  if (!anyAlive(c)) return finish(c, events, preview, 'won');
  if (c.playerHp <= 0) return finish(c, events, preview, 'lost');

  for (let i = 0; i < c.enemies.length; i++) {
    if (c.enemies[i].hp > 0) enemyDef(c.enemies[i].defId).afterMachine?.(c, i, events);
  }
  beforeEnemyTurn(c, events); // B9b hook (items-engine): Night Watchman
  afterPlayerTurn(c, events);
  enemyTurn(c, events, (i, partId) => runEnemyAttackHooks(c, i, events, partId));
  if (c.playerHp <= 0) return finish(c, events, preview, 'lost');
  if (!anyAlive(c)) return finish(c, events, preview, 'won');

  beginTurn(c, events);
  if (!anyAlive(c)) return finish(c, events, preview, 'won'); // a Torsion Spring released at turn start
  return { events, preview };
}

function finish(c: CombatState, events: GameEvent[], preview: TurnPreview, outcome: 'won' | 'lost'): TurnResult {
  c.outcome = outcome;
  events.push({ kind: 'combatEnd', tick: 0, step: 0, note: outcome });
  return { events, preview };
}

// ---------- Turn start ----------

function beginTurn(c: CombatState, events: GameEvent[]): void {
  c.turn += 1;
  c.plating = onPlatingFall(c, c.plating); // B9b hook (items-engine): Sprocket's Blanket keeps some (pass-through: 0)
  for (const e of c.enemies) {
    for (const s of Object.keys(e.statuses)) {
      if (s === 'scald' || s === 'strength') continue; // scald ticks at the end of the enemy turn; strength lasts
      e.statuses[s] -= 1;
      if (e.statuses[s] <= 0) delete e.statuses[s];
    }
  }
  let ticks = BASE_TICKS - c.jammed;
  if (hasTrinket(c, 'mainspring-key')) ticks += 1;
  if (c.turn === 1) ticks += (hasTrinket(c, 'pocket-watch') ? 1 : 0) + (c.chassis === 'horologist' ? 1 : 0);
  c.ticksThisTurn = Math.min(MAX_TICKS, Math.max(1, ticks));
  c.jammed = 0;
  c.placementsLeft = BASE_PLACEMENTS;
  if (c.turn === 1 && hasTrinket(c, 'extra-pocket')) c.placementsLeft += 1;
  if (c.turn >= 5 && hasTrinket(c, 'hourglass')) c.placementsLeft += 1;
  const flags = (c.flags ??= {});
  if (hasTrinket(c, 'feather-duster') && !flags.duster && c.turn > 1) {
    flags.duster = 1; // once per combat, at the start of a turn: clear all Rust
    for (let i = 0; i < c.board.length; i++) {
      const p = c.board[i];
      if (p && p.rusted > 0) {
        p.rusted = 0;
        events.push({ kind: 'sabotage', tick: 0, step: 0, cell: i, note: 'clear' });
      }
    }
  }
  c.swapUsed = false;
  c.swapsUsed = 0;
  c.momentum = 0;
  for (const p of c.board) if (p) p.firedThisTurn = 0;
  syncTargetIdx(c);
  events.push({ kind: 'turnStart', tick: 0, step: 0, amount: c.turn });
  // Magnetized parts return to the hand with their charge lost.
  for (let i = 0; i < c.board.length; i++) {
    const p = c.board[i];
    if (p && p.magnetized) {
      c.board[i] = null;
      c.hand.push(p.uid);
      events.push({ kind: 'unmagnetize', tick: 0, step: 0, cell: i, uid: p.uid });
    }
  }
  runTurnStartHooks(c, events);
  onTurnStart(c, events); // B9b hook (items-engine): Sprocket's Whistle fetches
  if (!anyAlive(c)) return;
  const want = c.handSize + (c.extraDraw ?? 0);
  c.extraDraw = 0;
  while (c.hand.length < want) {
    if (c.draw.length === 0) {
      if (c.discard.length === 0) break;
      c.draw = shuffle(c.rng, 'draw', c.discard);
      c.discard = [];
    }
    const uid = c.draw.pop() as number;
    c.hand.push(uid);
    events.push({ kind: 'draw', tick: 0, step: 0, uid });
  }
}

/** Player statuses tick down after the machine ran (Grit lasts the whole combat). */
function tickPlayerStatuses(c: CombatState): void {
  for (const s of Object.keys(c.playerStatuses)) {
    if (s === 'grit') continue;
    c.playerStatuses[s] -= 1;
    if (c.playerStatuses[s] <= 0) delete c.playerStatuses[s];
  }
}
