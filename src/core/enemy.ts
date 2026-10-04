// Enemy mechanics: creating enemies, picking intents, damage (Shell, phases), summons, strength, the enemy turn.
// Pure and deterministic. combat.ts calls enemyTurn; machine.ts calls damageEnemy.
import { CELLS, MAINSPRING } from './types';
import type { CombatState, EnemyState, GameEvent, Intent } from './types';
import { enemyDef } from './content/enemies';
import { int } from './rng';

export const MAX_ENEMIES = 4;

export interface EventBase {
  tick: number;
  step: number;
  cell?: number;
  uid?: number;
}
const NO_BASE: EventBase = { tick: 0, step: 0 };

export function newEnemy(defId: string, mem: Record<string, number> = {}): EnemyState {
  const def = enemyDef(defId);
  return {
    defId,
    hp: def.hp,
    maxHp: def.hp,
    shell: 0,
    statuses: {},
    intent: { kind: 'special', label: '' },
    step: 0,
    phase: 0,
    mem: { ...mem },
  };
}

/** Add an enemy mid-combat (summons, companions). Returns its index, or -1 when the board is full. */
export function summonEnemy(c: CombatState, defId: string, events: GameEvent[] | null, mem: Record<string, number> = {}): number {
  if (c.enemies.length >= MAX_ENEMIES) return -1;
  c.enemies.push(newEnemy(defId, mem));
  const idx = c.enemies.length - 1;
  chooseIntent(c, idx);
  events?.push({ kind: 'summon', tick: 0, step: 0, target: idx, note: defId });
  return idx;
}

export function attackLabel(amount: number, hits?: number): string {
  return `Attack ${amount}${hits && hits > 1 ? ` x${hits}` : ''}`;
}

/** Strength: every attack of this enemy deals more, including the intent already shown. */
export function addStrength(c: CombatState, idx: number, n: number, events: GameEvent[]): void {
  const e = c.enemies[idx];
  e.statuses.strength = (e.statuses.strength ?? 0) + n;
  if (e.intent.kind === 'attack') {
    e.intent.amount = (e.intent.amount ?? 0) + n;
    e.intent.label = attackLabel(e.intent.amount, e.intent.hits);
  }
  events.push({ kind: 'buff', tick: 0, step: 0, target: idx, note: 'strength', amount: n });
}

/** Gain Shell (block). */
export function gainShell(c: CombatState, idx: number, n: number, events: GameEvent[]): void {
  if (n <= 0) return;
  c.enemies[idx].shell += n;
  events.push({ kind: 'shell', tick: 0, step: 0, target: idx, amount: n });
}

export function healEnemy(c: CombatState, idx: number, n: number, events: GameEvent[]): void {
  const e = c.enemies[idx];
  const gain = Math.min(n, e.maxHp - e.hp);
  if (gain <= 0) return;
  e.hp += gain;
  events.push({ kind: 'enemyHeal', tick: 0, step: 0, target: idx, amount: gain });
}

/** Damage to the player: Plating absorbs first. Returns hp lost. */
export function damagePlayer(c: CombatState, amount: number, events: GameEvent[]): number {
  const absorbed = Math.min(c.plating, amount);
  c.plating -= absorbed;
  const lost = Math.min(c.playerHp, amount - absorbed);
  c.playerHp -= lost;
  events.push({ kind: 'playerHit', tick: 0, step: 0, amount: lost, note: absorbed > 0 ? `absorbed:${absorbed}` : undefined });
  return lost;
}

export interface DamageOpts {
  /** Damage goes straight to HP (Scald). */
  ignoreShell?: boolean;
  /** Emit a 'strike' event (default true). */
  strikeEvent?: boolean;
}

/**
 * Damage enemy `idx`: Shell first, then HP. Handles death and boss phases (a phase that reaches 0 starts the
 * next one with that phase's full HP). Returns HP actually lost.
 */
export function damageEnemy(
  c: CombatState,
  idx: number,
  dmg: number,
  events: GameEvent[],
  base: EventBase = NO_BASE,
  opts: DamageOpts = {},
): number {
  const e = c.enemies[idx];
  const absorbed = opts.ignoreShell ? 0 : Math.min(e.shell, dmg);
  e.shell -= absorbed;
  const lost = Math.min(e.hp, dmg - absorbed);
  e.hp -= lost;
  if (opts.strikeEvent !== false) {
    events.push({ kind: 'strike', ...base, target: idx, amount: lost, note: absorbed > 0 ? `absorbed:${absorbed}` : undefined });
  }
  if (e.hp <= 0 && lost > 0) {
    const def = enemyDef(e.defId);
    if (def.phases && e.phase < def.phases.length - 1) {
      e.phase += 1;
      const ph = def.phases[e.phase];
      e.hp = ph.hp;
      e.maxHp = ph.hp;
      e.shell = 0;
      e.statuses = {};
      e.step = 0;
      events.push({ kind: 'phase', ...base, target: idx, amount: e.phase, note: ph.line });
      chooseIntent(c, idx);
      events.push({ kind: 'intent', tick: 0, step: 0, target: idx, note: e.intent.kind, amount: e.intent.amount, cell: e.intent.target });
    } else {
      events.push({ kind: 'enemyDied', ...base, target: idx });
    }
  }
  return lost;
}

// ---------- Intents ----------

/** Pick `n` distinct board cells for a sabotage: occupied cells first (enemy stream), padded with empty ones. */
function pickCells(c: CombatState, n: number): number[] {
  const occupied: number[] = [];
  const empty: number[] = [];
  for (let i = 0; i < CELLS; i++) {
    if (i === MAINSPRING) continue;
    (c.board[i] ? occupied : empty).push(i);
  }
  const out: number[] = [];
  let pool = occupied.length > 0 ? occupied.slice() : empty.slice();
  while (out.length < n && pool.length > 0) {
    const k = int(c.rng, 'enemy', pool.length);
    out.push(pool[k]);
    pool = pool.filter((_, j) => j !== k);
    if (pool.length === 0 && out.length < n) pool = empty.filter((x) => !out.includes(x));
  }
  return out;
}

/** The cell of the part that contributed most last turn, or -1. */
export function strongestCell(c: CombatState): number {
  let best = -1;
  let bestVal = 0;
  for (let i = 0; i < CELLS; i++) {
    const p = c.board[i];
    if (!p) continue;
    const v = c.lastTurnContrib[p.uid]?.value ?? 0;
    if (v > bestVal) {
      bestVal = v;
      best = i;
    }
  }
  return best;
}

/** Strongest single contribution last turn (damage plus Plating of one part). */
export function strongestContribution(c: CombatState): number {
  let best = 0;
  for (const k in c.lastTurnContrib) best = Math.max(best, c.lastTurnContrib[k].value);
  return best;
}

/** Pick the next intent of enemy `idx`. Rust and Magnetize name their target cells now (enemy stream). */
export function chooseIntent(c: CombatState, idx: number): void {
  const e = c.enemies[idx];
  const def = enemyDef(e.defId);
  let intent: Intent;
  if (def.intentFor) intent = def.intentFor(e, c, c.rng);
  else {
    const pattern = def.phases?.[e.phase]?.pattern ?? def.pattern;
    intent = { ...pattern[e.step % pattern.length] };
  }
  const strength = e.statuses.strength ?? 0;
  if (intent.kind === 'attack' && strength > 0) {
    intent.amount = (intent.amount ?? 0) + strength;
    intent.label = attackLabel(intent.amount, intent.hits);
  }
  if (intent.kind === 'sabotage' && (intent.sabotage === 'rust' || intent.sabotage === 'magnetize')) {
    if (intent.target === undefined) {
      const count = intent.sabotage === 'rust' ? Math.max(1, intent.amount ?? 1) : 1;
      const cells = pickCells(c, count);
      intent.target = cells[0];
      intent.targets = cells;
    } else {
      intent.targets = [intent.target];
    }
  }
  e.intent = intent;
}

// ---------- The enemy turn ----------

/** Every enemy performs its intent left to right, then picks and shows the next one. `onAttack` runs after each attack. */
export function enemyTurn(c: CombatState, events: GameEvent[], onAttack: (enemyIdx: number) => void): void {
  const n = c.enemies.length; // enemies summoned this turn do not act until the next one
  for (let i = 0; i < n; i++) {
    const e = c.enemies[i];
    if (e.hp <= 0) continue;
    const def = enemyDef(e.defId);
    e.shell = 0;
    def.onTurn?.(c, i, events);
    if (def.summonAtHalf && !e.mem.halfSummoned && e.hp * 2 <= e.maxHp) {
      e.mem.halfSummoned = 1;
      summonEnemy(c, def.summonAtHalf, events);
    }
    const it = e.intent;
    if (it.kind !== 'special') {
      events.push({ kind: 'enemyAction', tick: 0, step: 0, target: i, note: it.kind, amount: it.amount });
    }
    if (it.kind === 'attack') {
      if (!hitPlayer(c, e, it.amount ?? 0, it.hits ?? 1, events)) return;
      onAttack(i);
      if (e.hp <= 0) continue;
    } else if (it.kind === 'defend') {
      gainShell(c, i, it.amount ?? 0, events);
    } else if (it.kind === 'buff') {
      const allies = c.enemies.map((o, j) => (j !== i && o.hp > 0 ? j : -1)).filter((j) => j >= 0);
      for (const j of allies.length > 0 ? allies : [i]) addStrength(c, j, it.amount ?? 0, events);
    } else if (it.kind === 'debuff') {
      const s = it.status ?? 'corroded';
      c.playerStatuses[s] = Math.max(c.playerStatuses[s] ?? 0, it.amount ?? 0);
      events.push({ kind: 'status', tick: 0, step: 0, target: i, status: s, amount: it.amount ?? 0, note: 'player' });
    } else if (it.kind === 'sabotage') {
      sabotage(c, e, i, events);
      if (it.alsoShell) gainShell(c, i, it.alsoShell, events);
      if (it.alsoAttack) {
        if (!hitPlayer(c, e, it.alsoAttack, 1, events)) return;
        onAttack(i);
        if (e.hp <= 0) continue;
      }
    }
    scald(c, e, i, events);
    e.step += 1;
    if (e.hp > 0) {
      chooseIntent(c, i);
      events.push({ kind: 'intent', tick: 0, step: 0, target: i, note: e.intent.kind, amount: e.intent.amount, cell: e.intent.target });
    }
  }
}

/** Resolve an attack. Returns false when the player died. */
function hitPlayer(c: CombatState, e: EnemyState, amount: number, hits: number, events: GameEvent[]): boolean {
  let amt = amount;
  if ((e.statuses.dazed ?? 0) > 0) amt = Math.floor(amt * 0.75);
  for (let h = 0; h < hits; h++) {
    damagePlayer(c, amt, events);
    if (c.playerHp <= 0) return false;
  }
  return true;
}

function sabotage(c: CombatState, e: EnemyState, i: number, events: GameEvent[]): void {
  const it = e.intent;
  if (it.sabotage === 'rust' || it.sabotage === 'magnetize') {
    const rust = it.sabotage === 'rust';
    for (const t of it.targets ?? (it.target !== undefined ? [it.target] : [])) {
      const part = t >= 0 ? c.board[t] : null;
      if (part) {
        if (rust) part.rusted = 1;
        else part.magnetized = true;
        events.push({ kind: 'sabotage', tick: 0, step: 0, cell: t, target: i, note: it.sabotage });
      } else {
        events.push({ kind: 'sabotage', tick: 0, step: 0, cell: t, target: i, note: 'fizzle' });
      }
    }
  } else if (it.sabotage === 'jam') {
    c.jammed = 1;
    events.push({ kind: 'sabotage', tick: 0, step: 0, target: i, note: 'jam' });
  } else if (it.sabotage === 'drain') {
    const drained = Math.min(c.pressure, it.amount ?? 0);
    c.pressure -= drained;
    if (e.mem.heat !== undefined) e.mem.heat += drained;
    events.push({ kind: 'sabotage', tick: 0, step: 0, target: i, note: 'drain', amount: drained });
    events.push({ kind: 'pressure', tick: 0, step: 0, amount: -drained, note: 'drain' });
  }
}

/** Scald: at the end of the enemy's turn it takes X damage (straight to HP), then X falls by 1. */
function scald(c: CombatState, e: EnemyState, i: number, events: GameEvent[]): void {
  const s = e.statuses.scald ?? 0;
  if (s <= 0) return;
  events.push({ kind: 'statusTick', tick: 0, step: 0, target: i, status: 'scald', amount: s });
  e.statuses.scald = s - 1;
  if (e.statuses.scald <= 0) delete e.statuses.scald;
  damageEnemy(c, i, s, events, NO_BASE, { ignoreShell: true, strikeEvent: false });
}
