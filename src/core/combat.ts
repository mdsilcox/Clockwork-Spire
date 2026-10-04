// Combat flow: create, place, swap, preview, run a whole turn. Functions mutate the CombatState in place.
import { CELLS, MAINSPRING } from './types';
import type { CombatState, EnemyState, GameEvent, Intent, PartInstance, TurnPreview, TurnResult } from './types';
import { inBoard } from './board';
import { enemyDef } from './content/enemies';
import { anyAlive, damagePlayer, MAX_TICKS, runMachine } from './machine';
import { initStreams, int, shuffle } from './rng';

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
    draw: shuffle(
      rng,
      'draw',
      o.bin.map((p) => p.uid),
    ),
    discard: [],
    parts,
    handSize: o.handSize ?? DEFAULT_HAND_SIZE,
    placementsLeft: BASE_PLACEMENTS,
    swapUsed: false,
    plating: 0,
    pressure: 0,
    momentum: 0,
    jammed: 0,
    playerHp: o.hp,
    playerMaxHp: o.maxHp,
    playerStatuses: {},
    enemies: [],
    targetIdx: 0,
    lastTurnContrib: {},
    rng,
    outcome: 'ongoing',
    trinkets: (o.trinkets ?? []).slice(),
    log: [],
  };
  for (const id of o.enemies) {
    const def = enemyDef(id);
    c.enemies.push({
      defId: id,
      hp: def.hp,
      maxHp: def.hp,
      shell: 0,
      statuses: {},
      intent: { kind: 'special', label: '' },
      step: 0,
      phase: 0,
      mem: {},
    });
  }
  for (let i = 0; i < c.enemies.length; i++) chooseIntent(c, i);
  beginTurn(c, []);
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
    contrib[k] = { value: c.lastTurnContrib[k].value, fedBy: c.lastTurnContrib[k].fedBy };
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
      (e): EnemyState => ({ ...e, statuses: { ...e.statuses }, intent: { ...e.intent }, mem: { ...e.mem } }),
    ),
    targetIdx: c.targetIdx,
    lastTurnContrib: contrib,
    rng: { ...c.rng },
    outcome: c.outcome,
    trinkets: c.trinkets.slice(),
    log: c.log.slice(),
  };
}

// ---------- Player actions ----------

export function placePart(c: CombatState, handIndex: number, cellIdx: number): boolean {
  if (c.outcome !== 'ongoing' || c.placementsLeft <= 0) return false;
  if (!inBoard(cellIdx) || cellIdx === MAINSPRING) return false;
  if (!Number.isInteger(handIndex) || handIndex < 0 || handIndex >= c.hand.length) return false;
  const uid = c.hand[handIndex];
  const inst = c.parts[uid];
  const old = c.board[cellIdx];
  if (old) c.discard.push(old.uid);
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
  c.placementsLeft -= 1;
  return true;
}

/** Free, once per turn: swap the positions of two parts already on the board. */
export function swapParts(c: CombatState, a: number, b: number): boolean {
  if (c.outcome !== 'ongoing' || c.swapUsed || a === b) return false;
  if (!inBoard(a) || !inBoard(b) || a === MAINSPRING || b === MAINSPRING) return false;
  if (!c.board[a] || !c.board[b]) return false;
  [c.board[a], c.board[b]] = [c.board[b], c.board[a]];
  c.swapUsed = true;
  return true;
}

export function setTarget(c: CombatState, idx: number): void {
  if (c.enemies[idx] && c.enemies[idx].hp > 0) c.targetIdx = idx;
}

/** What Run would do now. Runs the real machine on a copy; never mutates `c`. */
export function previewTurn(c: CombatState): TurnPreview {
  return runMachine(cloneCombat(c), []);
}

// ---------- A whole turn ----------

export function runTurn(c: CombatState): TurnResult {
  const events: GameEvent[] = [];
  if (c.outcome !== 'ongoing') return { events, preview: previewTurn(c) };

  const preview = runMachine(c, events);
  for (const p of c.board) if (p && p.rusted > 0) p.rusted -= 1;
  c.discard.push(...c.hand);
  c.hand = [];
  const dealt = preview.damageByEnemy.reduce((a, b) => a + b, 0);
  c.log.push({ turn: c.turn, damage: dealt, plating: preview.plating, momentum: preview.momentum, ticks: preview.ticks });

  if (!anyAlive(c)) return finish(c, events, preview, 'won');
  if (c.playerHp <= 0) return finish(c, events, preview, 'lost');

  enemyTurn(c, events);
  if (c.playerHp <= 0) return finish(c, events, preview, 'lost');
  if (!anyAlive(c)) return finish(c, events, preview, 'won');

  beginTurn(c, events);
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
  c.plating = 0;
  for (const s of Object.keys(c.playerStatuses)) {
    c.playerStatuses[s] -= 1;
    if (c.playerStatuses[s] <= 0) delete c.playerStatuses[s];
  }
  for (const e of c.enemies) {
    for (const s of Object.keys(e.statuses)) {
      if (s === 'scald') continue; // scald ticks at the end of the enemy turn
      e.statuses[s] -= 1;
      if (e.statuses[s] <= 0) delete e.statuses[s];
    }
  }
  c.ticksThisTurn = Math.min(MAX_TICKS, Math.max(1, BASE_TICKS - c.jammed));
  c.jammed = 0;
  c.placementsLeft = BASE_PLACEMENTS;
  c.swapUsed = false;
  c.momentum = 0;
  for (const p of c.board) if (p) p.firedThisTurn = 0;
  if (!c.enemies[c.targetIdx] || c.enemies[c.targetIdx].hp <= 0) {
    const i = c.enemies.findIndex((e) => e.hp > 0);
    c.targetIdx = i < 0 ? 0 : i;
  }
  events.push({ kind: 'turnStart', tick: 0, step: 0, amount: c.turn });
  while (c.hand.length < c.handSize) {
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

// ---------- Enemies ----------

/** Pick the next intent of enemy `idx` from its pattern. A rust sabotage names its target cell now (enemy stream). */
export function chooseIntent(c: CombatState, idx: number): void {
  const e = c.enemies[idx];
  const def = enemyDef(e.defId);
  let intent: Intent;
  if (def.intentFor) intent = def.intentFor(e, c, c.rng);
  else {
    const step = def.pattern[e.step % def.pattern.length];
    intent = { ...step };
  }
  if (intent.kind === 'sabotage' && intent.sabotage === 'rust') {
    const occupied: number[] = [];
    const any: number[] = [];
    for (let i = 0; i < CELLS; i++) {
      if (i === MAINSPRING) continue;
      any.push(i);
      if (c.board[i]) occupied.push(i);
    }
    const pool = occupied.length > 0 ? occupied : any;
    intent.target = pool[int(c.rng, 'enemy', pool.length)];
  }
  e.intent = intent;
}

function enemyTurn(c: CombatState, events: GameEvent[]): void {
  for (let i = 0; i < c.enemies.length; i++) {
    const e = c.enemies[i];
    if (e.hp <= 0) continue;
    e.shell = 0;
    const it = e.intent;
    if (it.kind !== 'special') {
      events.push({ kind: 'enemyAction', tick: 0, step: 0, target: i, note: it.kind, amount: it.amount });
    }
    if (it.kind === 'attack') {
      let amt = it.amount ?? 0;
      if ((e.statuses.dazed ?? 0) > 0) amt = Math.floor(amt * 0.75);
      for (let h = 0; h < (it.hits ?? 1); h++) {
        damagePlayer(c, amt, events);
        if (c.playerHp <= 0) return;
      }
    } else if (it.kind === 'defend') {
      e.shell += it.amount ?? 0;
    } else if (it.kind === 'sabotage' && it.sabotage === 'rust') {
      const t = it.target ?? -1;
      const part = t >= 0 ? c.board[t] : null;
      if (part) {
        part.rusted = 1;
        events.push({ kind: 'sabotage', tick: 0, step: 0, cell: t, target: i, note: 'rust' });
      } else {
        events.push({ kind: 'sabotage', tick: 0, step: 0, cell: t, target: i, note: 'fizzle' });
      }
    }
    const scald = e.statuses.scald ?? 0;
    if (scald > 0) {
      e.hp = Math.max(0, e.hp - scald);
      e.statuses.scald = scald - 1;
      if (e.statuses.scald <= 0) delete e.statuses.scald;
      if (e.hp <= 0) events.push({ kind: 'enemyDied', tick: 0, step: 0, target: i });
    }
    e.step += 1;
    if (e.hp > 0) {
      chooseIntent(c, i);
      events.push({
        kind: 'intent',
        tick: 0,
        step: 0,
        target: i,
        note: e.intent.kind,
        amount: e.intent.amount,
        cell: e.intent.target,
      });
    }
  }
}
