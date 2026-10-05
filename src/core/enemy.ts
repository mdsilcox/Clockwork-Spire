// Enemy mechanics: creating enemies, picking intents, damage (Shell, phases), summons, strength, the enemy turn.
// Pure and deterministic. combat.ts calls enemyTurn; machine.ts calls damageEnemy.
import { neighbors } from './board';
import { CELLS, MAINSPRING } from './types';
import type { ActionDef, CombatState, EnemyPartState, EnemyState, GameEvent, Intent, PartIntent } from './types';
import type { EnemyPartDef, FrameDef } from './defs';
import { enemyDef } from './content/enemies';
import { setOrder } from './frames';
import {
  actionLabel,
  actionsFor,
  actsOnTurn,
  escalationBonus,
  frameOf,
  initPart,
  isBuildUp,
  isCountdown,
  listIntentKind,
  partDefOf,
  partState,
  standingActing,
  standingPassive,
} from './framelib';
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
  const f = def.frame;
  const first = f ? (f.phases ? f.phases[0].parts : f.parts) : [];
  return {
    defId,
    hp: f ? f.core : def.hp,
    maxHp: f ? f.core : def.hp,
    shell: 0,
    statuses: {},
    intent: { kind: 'special', label: '' },
    step: 0,
    phase: 0,
    mem: { ...mem },
    parts: first.map(initPart),
    sealed: f ? (f.phases ? !f.phases[0].coreExposed : !!f.sealed) : false,
    intents: [],
    turnsActed: 0,
    phaseActionPending: false,
    coreTookThisTurn: 0,
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
  if (frameOf(e)) refreshIntents(c, idx);
  else if (e.intent.kind === 'attack') {
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
  if (frameOf(e)) {
    const r = damageTarget(c, idx, 'core', dmg, events, base, { status: !!opts.ignoreShell, noCracked: true, strikeEvent: opts.strikeEvent });
    return r.lost;
  }
  if (e.mem.phaseShield) return 0; // a new boss phase starts after the player's turn is over
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
      e.mem.phaseShield = 1;
      e.mem.phaseChanged = 1;
      events.push({ kind: 'phase', ...base, target: idx, amount: e.phase, note: ph.line });
      chooseIntent(c, idx);
      events.push({ kind: 'intent', tick: 0, step: 0, target: idx, note: e.intent.kind, amount: e.intent.amount, cell: e.intent.target });
    } else {
      events.push({ kind: 'enemyDied', ...base, target: idx });
    }
  }
  return lost;
}

// ---------- v2: damage to a part or core of a frame enemy (rules 2.3, 2.4, 4.8) ----------

export interface HitOpts {
  /** Drill: ignores Shell, Bulwark and Governor (still Braced). */
  drill?: boolean;
  /** Status damage (Scald): straight to HP; no Governor, Bulwark, Shell or Braced. */
  status?: boolean;
  /** The caller already applied Cracked. */
  noCracked?: boolean;
  strikeEvent?: boolean;
  /** B9b: the player word behind this hit, copied onto a 'partBroken' event ('strike' | 'drill' | 'shatter' | 'pry' | 'sweep'). */
  word?: string;
}

export interface HitResult {
  lost: number; // HP the target actually lost
  broke: boolean; // a part broke or the core died
  died: boolean;
  cancelled: boolean; // the broken part had an intent
}

const NO_HIT: HitResult = { lost: 0, broke: false, died: false, cancelled: false };

function lostEvent(events: GameEvent[], base: EventBase, idx: number, part: string, amount: number, kind: 'lost' | 'braced' = 'lost'): void {
  if (amount > 0) events.push({ kind, ...base, target: idx, part, amount });
}

/** B9b: what stood protecting the enemy at a hit (Shell above 0 before the hit, a standing Bulwark or Governor), for achievement facts. */
function protectionsOf(e: EnemyState, shellBefore: number): string[] {
  const out: string[] = [];
  if (shellBefore > 0) out.push('shell');
  if (standingPassive(e, 'bulwark')) out.push('bulwark');
  if (standingPassive(e, 'governor')) out.push('governor');
  return out;
}

/**
 * Damage one part or the core of a frame enemy, in the rules' order: Cracked, Governor, Bulwark (core), Shell,
 * Braced, HP. Whatever is cut off or overkills is lost and emitted as 'lost' or 'braced'.
 */
export function damageTarget(
  c: CombatState,
  idx: number,
  partId: string,
  raw: number,
  events: GameEvent[],
  base: EventBase = NO_BASE,
  opts: HitOpts = {},
): HitResult {
  const e = c.enemies[idx];
  const f = frameOf(e);
  if (!f || e.hp <= 0) return NO_HIT;
  const isCore = partId === 'core';
  const part = isCore ? null : (partState(e, partId) ?? null);
  if (!isCore && (!part || part.broken)) return NO_HIT;
  let amt = raw;
  if (!opts.status && !opts.noCracked && (e.statuses.cracked ?? 0) > 0) amt = Math.floor(amt * 1.5);
  if (amt <= 0) return NO_HIT;
  if (e.mem.phaseLocked || (isCore && e.sealed)) {
    lostEvent(events, base, idx, partId, amt); // the rest of the Run after the phase's last keystone, or a sealed core
    return NO_HIT;
  }
  if (!opts.status && !opts.drill) {
    const gov = standingPassive(e, 'governor');
    if (gov && amt > gov.cap) {
      lostEvent(events, base, idx, partId, amt - gov.cap);
      amt = gov.cap;
    }
    if (isCore && standingPassive(e, 'bulwark')) amt = Math.floor(amt / 2);
  }
  const shellBefore = e.shell;
  let absorbed = 0;
  if (!opts.status && !opts.drill) {
    absorbed = Math.min(e.shell, amt);
    e.shell -= absorbed;
    amt -= absorbed;
  }
  if (f.braced && !opts.status) {
    let cap = -1;
    let took = 0;
    if (isCore) {
      if (f.phases && e.phase === f.phases.length - 1 && !e.sealed) {
        cap = Math.ceil(e.maxHp / 3);
        took = e.coreTookThisTurn;
      }
    } else if (part && partDefOf(e, partId)?.keystone) {
      cap = Math.ceil(part.maxHp / 2);
      took = part.tookThisTurn;
    }
    if (cap >= 0) {
      const room = Math.max(0, cap - took);
      if (amt > room) {
        lostEvent(events, base, idx, partId, amt - room, 'braced');
        amt = room;
      }
    }
  }
  const hp = isCore ? e.hp : (part as EnemyPartState).hp;
  const lost = Math.min(hp, amt);
  lostEvent(events, base, idx, partId, amt - lost);
  const note = absorbed > 0 ? `absorbed:${absorbed}` : undefined;
  if (isCore) {
    e.hp -= lost;
    e.coreTookThisTurn += lost;
    if (opts.strikeEvent !== false) events.push({ kind: 'strike', ...base, target: idx, part: 'core', amount: lost, note });
    if (e.hp <= 0 && lost > 0) {
      c.wrecked += e.parts.filter((p) => !p.broken).length;
      events.push({ kind: 'enemyDied', ...base, target: idx });
      for (let j = 0; j < c.enemies.length; j++) {
        if (j === idx || c.enemies[j].hp <= 0) continue;
        const en = standingPassive(c.enemies[j], 'enrage');
        if (en) addStrength(c, j, en.x, events);
      }
      return { lost, broke: true, died: true, cancelled: false };
    }
    return { lost, broke: false, died: false, cancelled: false };
  }
  const p = part as EnemyPartState;
  const protectedBy = protectionsOf(e, shellBefore);
  p.hp -= lost;
  p.tookThisTurn += lost;
  if (opts.strikeEvent !== false) events.push({ kind: 'partHit', ...base, target: idx, part: partId, amount: lost, note });
  if (p.hp <= 0) {
    const word = opts.word ?? (opts.status ? 'status' : opts.drill ? 'drill' : 'strike');
    const cancelled = breakPartState(c, idx, p, events, base, { word, ...(protectedBy.length ? { protectedBy } : {}) });
    return { lost, broke: true, died: false, cancelled };
  }
  return { lost, broke: false, died: false, cancelled: false };
}

/** A part reaches 0 HP: it never acts again, its intent is cancelled at once, its salvage is queued. Returns whether it had an intent. */
export function breakPartState(c: CombatState, idx: number, part: EnemyPartState, events: GameEvent[], base: EventBase = NO_BASE, extra: Pick<GameEvent, 'word' | 'protectedBy' | 'by'> = {}): boolean {
  const e = c.enemies[idx];
  const f = frameOf(e) as FrameDef;
  const d = partDefOf(e, part.id);
  part.broken = true;
  part.hp = 0;
  if (d?.salvage) c.broken.push({ enemy: idx, partId: part.id, salvage: d.salvage, rarity: d.rarity, locked: false });
  events.push({ kind: 'partBroken', ...base, target: idx, part: part.id, ...extra });
  const had = e.intents.some((i) => i.partId === part.id);
  const ph = f.phases?.[e.phase];
  if (ph) {
    if (ph.keystones.includes(part.id) && ph.keystones.every((k) => partState(e, k)?.broken)) {
      if (e.phase < (f.phases?.length ?? 0) - 1) {
        e.mem.phaseLocked = 1; // the rest of this Run is lost; the phase changes after the machine (rules 4.8)
        setIntents(e, []);
        return had;
      }
      e.sealed = false;
    }
  } else if (d?.keystone && e.sealed && !e.parts.some((p) => !p.broken && partDefOf(e, p.id)?.keystone)) {
    e.sealed = false;
  }
  dropIntent(c, idx, part.id);
  return had;
}

/** Break a part by id (what a hit does at 0 HP: salvage queued, intent cancelled, keystone logic). Returns whether it had an intent. */
export function breakPart(c: CombatState, idx: number, partId: string, events: GameEvent[], base: EventBase = NO_BASE): boolean {
  const e = c.enemies[idx];
  const p = e ? partState(e, partId) : undefined;
  return p && !p.broken ? breakPartState(c, idx, p, events, base) : false;
}

/** A standing part's intent goes away (broken or jammed); an enemy with no standing acting part shows its core action. */
export function dropIntent(c: CombatState, idx: number, partId: string): void {
  const e = c.enemies[idx];
  const rest = e.intents.filter((i) => i.partId !== partId);
  if (rest.length === 0 && !e.mem.phaseLocked && !e.phaseActionPending && standingActing(e).length === 0) {
    const f = frameOf(e);
    if (f) rest.push(makeIntent(c, e, 'core', [f.coreAction], undefined, undefined));
  }
  setIntents(e, rest);
}

/** Jam: the part skips its next action; its intent is cancelled now. */
export function jamPart(c: CombatState, idx: number, partId: string): void {
  const p = partState(c.enemies[idx], partId);
  if (!p || p.broken) return;
  p.jammed = true;
  dropIntent(c, idx, partId);
}

// ---------- v2: intents ----------

/** Echo: your strongest part's last turn, clamped to 6..18 (content.md). */
function echoAmount(c: CombatState): number {
  return Math.min(18, Math.max(6, strongestContribution(c)));
}

/** Shell as a percentage of the player's Pressure (Pressure Dome). */
function pctShell(c: CombatState, a: ActionDef): number {
  return Math.floor((c.pressure * (a.pct ?? 0)) / 100);
}

/** A PartIntent for `actions` (effective numbers: Strength and escalation included), rolling Rust and Magnetize cells once. */
function makeIntent(c: CombatState, e: EnemyState, partId: string, actions: ActionDef[], bonus: number | undefined, suffix: string | undefined, old?: PartIntent): PartIntent {
  const strength = e.statuses.strength ?? 0;
  const eff = actions.map((a, k): ActionDef => {
    const amt = a.amount ?? 0;
    if (a.kind === 'echo') return { ...a, amount: echoAmount(c) };
    if (a.kind === 'shell' && a.pct !== undefined) return { ...a, amount: pctShell(c, a) };
    if (a.kind === 'attack' || a.kind === 'pierce' || a.kind === 'siphon') return { ...a, amount: amt + strength + (k === 0 ? (bonus ?? 0) : 0) };
    if (k === 0 && bonus) return { ...a, amount: amt + bonus };
    return { ...a };
  });
  let label = eff.map((a) => actionLabel(a)).join(', ');
  if (suffix) label += suffix;
  const it: PartIntent = { partId, actions: eff, kind: listIntentKind(eff), label };
  const sab = eff.find((a) => a.kind === 'rust' || a.kind === 'magnetize');
  if (sab) {
    if (old?.targets && old.targets.length > 0) {
      it.targets = old.targets.slice();
    } else {
      const n = sab.kind === 'rust' ? Math.max(1, sab.count ?? sab.amount ?? 1) : 1;
      const strongest = partId === 'minute-needle' ? strongestCell(c) : -1; // the Minute Needle rusts your strongest part
      it.targets = strongest >= 0 ? [strongest] : pickCells(c, n);
    }
    it.target = it.targets[0];
  }
  return it;
}

/** What the enemy will do on its next turn (rules 2.2), without touching any state. */
export function computeIntents(c: CombatState, idx: number, keep: PartIntent[] = []): PartIntent[] {
  const e = c.enemies[idx];
  const f = frameOf(e);
  if (!f || e.hp <= 0) return [];
  const old = (id: string) => keep.find((i) => i.partId === id);
  if (e.mem.phaseLocked) return [];
  if (e.phaseActionPending) {
    const a = f.phases?.[e.phase]?.action;
    return a ? [makeIntent(c, e, 'core', [a], undefined, undefined, old('core'))] : [];
  }
  if (standingActing(e).length === 0) return [makeIntent(c, e, 'core', [f.coreAction], undefined, undefined, old('core'))];
  const turn = e.turnsActed + 1;
  const out: PartIntent[] = [];
  for (const p of e.parts) {
    const d = partDefOf(e, p.id);
    if (p.broken || p.jammed || !d || d.actions.length === 0 || d.cadence === 'passive') continue;
    const cad = d.cadence;
    const bonus = escalationBonus(d, p.acted);
    if (isCountdown(cad)) {
      const left = p.countdown ?? cad.countdown;
      const it = makeIntent(c, e, p.id, actionsFor(d, turn), bonus, ` in ${left}`, old(p.id));
      if (left > 1) it.kind = 'charge'; // the clock icon until it acts next turn
      out.push(it);
    } else if (isBuildUp(cad)) {
      const g = p.gauge ?? 0;
      if (g + cad.buildUp >= cad.to) out.push(makeIntent(c, e, p.id, actionsFor(d, turn), bonus, undefined, old(p.id)));
      else {
        const it = makeIntent(c, e, p.id, actionsFor(d, turn), bonus, ` at ${cad.to} (${g})`, old(p.id));
        it.kind = 'charge';
        out.push(it);
      }
    } else if (actsOnTurn(cad, turn)) out.push(makeIntent(c, e, p.id, actionsFor(d, turn), bonus, undefined, old(p.id)));
  }
  return out;
}

const SABOTAGES = ['rust', 'jam', 'magnetize', 'drain'] as const;

/** v1 summary of an intent list: the first intent, or a quiet one. */
function legacyIntent(it: PartIntent | undefined): Intent {
  if (!it) return { kind: 'special', label: '' };
  const a = it.actions.find((x) => x.kind === 'attack' || x.kind === 'pierce' || x.kind === 'siphon' || x.kind === 'echo') ?? it.actions[0];
  const sab = it.actions.find((x) => (SABOTAGES as readonly string[]).includes(x.kind));
  return {
    kind: it.kind,
    amount: a?.amount,
    hits: a?.hits,
    target: it.target,
    targets: it.targets,
    sabotage: sab ? (sab.kind as Intent['sabotage']) : undefined,
    status: it.actions.find((x) => x.kind === 'status')?.status,
    label: it.label,
  };
}

/** Set `e.intents` and keep the v1 `intent` summary in step. */
export function setIntents(e: EnemyState, intents: PartIntent[]): void {
  e.intents = intents;
  e.intent = legacyIntent(intents[0]);
}

/** Recompute a frame enemy's intents keeping any Rust or Magnetize cells already rolled (Strength changed, a part rebuilt). */
export function refreshIntents(c: CombatState, idx: number): void {
  const e = c.enemies[idx];
  setIntents(e, computeIntents(c, idx, e.intents));
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
  if (def.frame) {
    setIntents(e, computeIntents(c, idx));
    return;
  }
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
  // v2 view of a legacy enemy: a core-only machine with one core intent.
  e.intents = [{ partId: 'core', actions: [], kind: intent.kind, label: intent.label, target: intent.target, targets: intent.targets }];
}

// ---------- The enemy turn ----------

/** Every enemy performs its intent left to right, then picks and shows the next one. `onAttack` runs after each attack. */
export function enemyTurn(c: CombatState, events: GameEvent[], onAttack: (enemyIdx: number, partId?: string) => void): void {
  const n = c.enemies.length; // enemies summoned this turn do not act until the next one
  for (let i = 0; i < n; i++) {
    const e = c.enemies[i];
    if (e.hp <= 0) continue;
    const def = enemyDef(e.defId);
    if (def.frame) {
      if (!frameTurn(c, i, events, onAttack)) return;
      continue;
    }
    e.shell = 0;
    delete e.mem.phaseShield;
    delete e.mem.phaseChanged;
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

function sabotage(c: CombatState, e: EnemyState, i: number, events: GameEvent[], it: Pick<Intent, 'sabotage' | 'targets' | 'target' | 'amount'> = e.intent): void {
  if (it.sabotage === 'rust' || it.sabotage === 'magnetize') {
    const rust = it.sabotage === 'rust';
    let wardDone = false;
    for (const t of it.targets ?? (it.target !== undefined ? [it.target] : [])) {
      const part = t >= 0 ? c.board[t] : null;
      const flags = (c.flags ??= {});
      if (part && !rust && c.trinkets.includes('magnet-ward') && !flags.magnetWard && !wardDone) {
        flags.magnetWard = 1; // Magnet Ward: the first Magnetize each combat fails
        wardDone = true;
        events.push({ kind: 'sabotage', tick: 0, step: 0, cell: t, target: i, note: 'ward' });
      } else if (part && rust && c.trinkets.includes('grease-pot') && neighbors(MAINSPRING).includes(t)) {
        events.push({ kind: 'sabotage', tick: 0, step: 0, cell: t, target: i, note: 'grease' });
      } else if (part) {
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
    e.mem.drained = (e.mem.drained ?? 0) + drained; // build-up parts count what was drained this turn
    events.push({ kind: 'sabotage', tick: 0, step: 0, target: i, note: 'drain', amount: drained });
    events.push({ kind: 'pressure', tick: 0, step: 0, amount: -drained, note: 'drain' });
  }
}

/** Scald: at the end of the enemy's turn it takes X damage (straight to HP), then X falls by 1. */
function scald(c: CombatState, e: EnemyState, i: number, events: GameEvent[]): void {
  const s = e.statuses.scald ?? 0;
  if (s <= 0 || (frameOf(e) && e.sealed)) return; // a sealed core is immune; the Scald waits
  events.push({ kind: 'statusTick', tick: 0, step: 0, target: i, status: 'scald', amount: s });
  e.statuses.scald = s - 1;
  if (e.statuses.scald <= 0) delete e.statuses.scald;
  damageEnemy(c, i, s, events, NO_BASE, { ignoreShell: true, strikeEvent: false });
}

// ---------- Rewind (rules 4.9): a part action, `{ kind: 'rewind', amount }` ----------

/** Cell holding the part with this uid, or -1. */
function cellOfUid(c: CombatState, uid: number): number {
  return c.board.findIndex((p) => p !== null && p.uid === uid);
}

/** Lift the `combos` strongest combinations off the board and heal the enemy by half the damage they dealt. */
function liftCombos(c: CombatState, idx: number, events: GameEvent[], combos: number): void {
  const lifted: number[] = []; // cells
  let healed = 0;
  for (let k = 0; k < combos; k++) {
    let best = -1;
    let bestVal = 0;
    for (let i = 0; i < CELLS; i++) {
      const p = c.board[i];
      if (!p || lifted.includes(i)) continue;
      const v = c.lastTurnContrib[p.uid]?.value ?? 0;
      if (v > bestVal) {
        bestVal = v;
        best = i;
      }
    }
    if (best < 0) break;
    const part = c.board[best]!;
    const contrib = c.lastTurnContrib[part.uid];
    healed += contrib.dmg ?? 0;
    lifted.push(best);
    if (contrib.fedBy !== null) {
      const f = cellOfUid(c, contrib.fedBy);
      if (f >= 0 && !lifted.includes(f)) {
        healed += c.lastTurnContrib[contrib.fedBy]?.dmg ?? 0;
        lifted.push(f);
      }
    }
  }
  const uids: number[] = [];
  for (const cellIdx of lifted) {
    const p = c.board[cellIdx]!;
    uids.push(p.uid);
    events.push({ kind: 'rewind', tick: 0, step: 0, cell: cellIdx, uid: p.uid });
    c.board[cellIdx] = null;
  }
  uids.sort((a, b) => a - b);
  c.draw.push(...uids); // the top of the draw pile: they come back soon, charge lost
  if (healed > 0) healEnemy(c, idx, Math.floor(healed / 2), events);
}

// ---------- v2: the enemy turn of a frame (rules 2.2, 2.4, 4.8) ----------

type AttackHook = (enemyIdx: number, partId?: string) => void;

/** Take a phase change after the machine ran (rules 4.8): new parts unfold, the next enemy turn is the phase action. */
function advancePhase(c: CombatState, idx: number, events: GameEvent[]): void {
  const e = c.enemies[idx];
  const f = frameOf(e) as FrameDef;
  const phases = f.phases ?? [];
  delete e.mem.phaseLocked;
  e.phase += 1;
  const ph = phases[e.phase];
  // parts that last only until this phase retract: removed, not broken, no salvage (a broken one stays broken)
  e.parts = e.parts.filter((p) => {
    const last = partDefOf(e, p.id)?.lastPhase;
    return p.broken || last === undefined || last >= e.phase + 1;
  });
  for (const d of ph.parts) if (!partState(e, d.id)) e.parts.push(initPart(d));
  e.sealed = !ph.coreExposed;
  e.phaseActionPending = true;
  e.coreTookThisTurn = 0;
  const beat = typeof ph.beat === 'string' ? ph.beat : partState(e, ph.beat.ifBroken)?.broken ? ph.beat.text : ph.beat.otherwise;
  events.push({ kind: 'phase', tick: 0, step: 0, target: idx, amount: e.phase, note: beat });
  setIntents(e, computeIntents(c, idx));
}

/** After the player's machine ran, before the enemies act: Ratchet grows Strength, warden phases change, the order drops dead entries. */
export function afterPlayerTurn(c: CombatState, events: GameEvent[]): void {
  for (let i = 0; i < c.enemies.length; i++) {
    const e = c.enemies[i];
    if (e.hp <= 0 || !frameOf(e)) continue;
    for (const p of e.parts) {
      if (p.broken) continue;
      const pas = partDefOf(e, p.id)?.passive;
      if (pas?.kind === 'ratchet') addStrength(c, i, pas.x, events);
    }
    if (e.mem.phaseLocked) advancePhase(c, i, events);
  }
  setOrder(c, c.order.slice());
}

/** Does this part act on enemy turn `turn`? Handles Jam, countdowns and build-up gauges (and their events). */
function partActs(c: CombatState, idx: number, p: EnemyPartState, turn: number, events: GameEvent[]): boolean {
  const e = c.enemies[idx];
  const d = partDefOf(e, p.id) as EnemyPartDef;
  const cad = d.cadence;
  if (isCountdown(cad)) {
    if (p.jammed) {
      p.jammed = false;
      return false;
    }
    const left = (p.countdown ?? cad.countdown) - 1;
    if (left <= 0) {
      p.countdown = cad.countdown;
      events.push({ kind: 'gauge', tick: 0, step: 0, target: idx, part: p.id, amount: p.countdown });
      return true;
    }
    p.countdown = left;
    events.push({ kind: 'gauge', tick: 0, step: 0, target: idx, part: p.id, amount: left });
    return false;
  }
  if (isBuildUp(cad)) {
    if (p.jammed) {
      p.jammed = false;
      return false;
    }
    const g = (p.gauge ?? 0) + cad.buildUp + (cad.bonus === 'drained' ? (e.mem.drained ?? 0) : 0);
    if (g >= cad.to) {
      p.gauge = 0;
      events.push({ kind: 'gauge', tick: 0, step: 0, target: idx, part: p.id, amount: 0 });
      return true;
    }
    p.gauge = g;
    events.push({ kind: 'gauge', tick: 0, step: 0, target: idx, part: p.id, amount: g });
    return false;
  }
  if (!actsOnTurn(cad, turn)) return false;
  if (p.jammed) {
    p.jammed = false;
    return false;
  }
  return true;
}

/** One frame enemy's turn. Returns false when the player died. */
function frameTurn(c: CombatState, i: number, events: GameEvent[], onAttack: AttackHook): boolean {
  const e = c.enemies[i];
  const f = frameOf(e) as FrameDef;
  e.shell = 0;
  e.mem.drained = 0;
  if (e.phaseActionPending) {
    e.phaseActionPending = false;
    const a = f.phases?.[e.phase]?.action;
    if (a) {
      events.push({ kind: 'phaseAction', tick: 0, step: 0, target: i, note: a.kind });
      if (!performAction(c, i, 'core', a, 0, events, onAttack, e.intents[0])) return false;
    }
    e.turnsActed = 0; // the turn after the phase action is turn 1 of the new phase
  } else {
    const turn = e.turnsActed + 1;
    if (standingActing(e).length === 0) {
      events.push({ kind: 'enemyAction', tick: 0, step: 0, target: i, note: f.coreAction.kind, amount: f.coreAction.amount, part: 'core' });
      if (!performAction(c, i, 'core', f.coreAction, 0, events, onAttack, e.intents.find((x) => x.partId === 'core'))) return false;
    } else {
      for (const p of e.parts.slice()) {
        const d = partDefOf(e, p.id);
        if (p.broken || !d || d.actions.length === 0 || d.cadence === 'passive') continue;
        if (!partActs(c, i, p, turn, events)) continue;
        const bonus = escalationBonus(d, p.acted);
        const intent = e.intents.find((x) => x.partId === p.id);
        const list = actionsFor(d, turn);
        events.push({ kind: 'enemyAction', tick: 0, step: 0, target: i, note: list[0]?.kind, amount: (list[0]?.amount ?? 0) + bonus, part: p.id });
        p.acted += 1;
        for (let k = 0; k < list.length; k++) {
          if (!performAction(c, i, p.id, list[k], k === 0 ? bonus : 0, events, onAttack, intent)) return false;
          if (p.broken || e.hp <= 0) break; // Spring Trap broke the part: the rest of its action is cancelled
        }
        if (e.hp <= 0) break;
      }
    }
    e.turnsActed = turn;
  }
  scald(c, e, i, events);
  if (e.hp > 0) {
    chooseIntent(c, i);
    for (const it of e.intents) events.push({ kind: 'intent', tick: 0, step: 0, target: i, part: it.partId, note: it.kind, amount: it.actions[0]?.amount, cell: it.target });
    if (e.intents.length === 0) events.push({ kind: 'intent', tick: 0, step: 0, target: i, note: 'special' });
  }
  return true;
}

/** Perform one action of part `partId` (or 'core'). Returns false when the player died. */
function performAction(
  c: CombatState,
  i: number,
  partId: string,
  a: ActionDef,
  bonus: number,
  events: GameEvent[],
  onAttack: AttackHook,
  intent: PartIntent | undefined,
): boolean {
  const e = c.enemies[i];
  const strength = e.statuses.strength ?? 0;
  const amt = (a.amount ?? 0) + bonus;
  const dazed = (e.statuses.dazed ?? 0) > 0;
  const hitCount = a.hits && a.hits > 1 ? a.hits : 1;
  switch (a.kind) {
    case 'attack':
    case 'siphon': {
      let dmg = amt + strength;
      if (dazed) dmg = Math.floor(dmg * 0.75);
      let drained = 0;
      for (let h = 0; h < hitCount; h++) {
        drained += Math.min(c.plating, dmg);
        damagePlayer(c, dmg, events);
        if (c.playerHp <= 0) return false;
      }
      if (a.kind === 'siphon' && drained > 0) {
        const heal = Math.min(drained, amt * hitCount);
        events.push({ kind: 'siphon', tick: 0, step: 0, target: i, part: partId, amount: heal });
        healEnemy(c, i, heal, events);
      }
      onAttack(i, partId);
      return true;
    }
    case 'pierce':
    case 'echo': {
      let dmg = (a.kind === 'echo' ? echoAmount(c) : amt) + strength; // the Echo Mouth echoes as a Pierce
      if (dazed) dmg = Math.floor(dmg * 0.75);
      for (let h = 0; h < hitCount; h++) {
        const lost = Math.min(c.playerHp, dmg);
        c.playerHp -= lost;
        events.push({ kind: 'pierce', tick: 0, step: 0, target: i, part: partId, amount: lost });
        events.push({ kind: 'playerHit', tick: 0, step: 0, amount: lost, note: 'pierce' });
        if (c.playerHp <= 0) return false;
      }
      onAttack(i, partId);
      return true;
    }
    case 'corrode': {
      const take = Math.min(c.plating, Math.ceil(((a.pct ?? 0) / 100) * c.plating));
      if (take > 0) {
        c.plating -= take;
        events.push({ kind: 'corrode', tick: 0, step: 0, target: i, part: partId, amount: take });
      }
      return true;
    }
    case 'shell':
      gainShell(c, i, a.pct !== undefined ? pctShell(c, a) : amt, events);
      return true;
    case 'mend': {
      const who = a.target === 'allies' ? c.enemies.map((o, j) => (j !== i && o.hp > 0 ? j : -1)).filter((j) => j >= 0) : [i];
      for (const j of who.length > 0 ? who : [i]) healEnemy(c, j, amt, events);
      return true;
    }
    case 'rebuild': {
      const brokenIds = e.parts.filter((p) => p.broken).map((p) => p.id);
      const id = a.part ? (brokenIds.includes(a.part) ? a.part : undefined) : brokenIds[0];
      const p = id ? partState(e, id) : undefined;
      if (!p) return true;
      p.broken = false;
      p.hp = Math.ceil(p.maxHp / 2);
      p.jammed = false;
      p.tookThisTurn = 0;
      const d = partDefOf(e, p.id);
      if (d && isCountdown(d.cadence)) p.countdown = d.cadence.countdown;
      if (d && isBuildUp(d.cadence)) p.gauge = 0;
      c.broken = c.broken.filter((b) => !(b.enemy === i && b.partId === p.id));
      events.push({ kind: 'partRebuilt', tick: 0, step: 0, target: i, part: p.id, amount: p.hp });
      return true;
    }
    case 'rust':
    case 'magnetize': {
      const targets = intent?.targets ?? pickCells(c, a.kind === 'rust' ? Math.max(1, a.count ?? a.amount ?? 1) : 1);
      sabotage(c, e, i, events, { sabotage: a.kind, targets, target: targets[0], amount: amt });
      return true;
    }
    case 'jam':
    case 'drain':
      sabotage(c, e, i, events, { sabotage: a.kind, amount: amt });
      return true;
    case 'reset-pressure':
      if (c.pressure !== 0) events.push({ kind: 'pressure', tick: 0, step: 0, amount: -c.pressure, note: 'reset' });
      c.pressure = 0;
      return true;
    case 'status': {
      const s = a.status ?? 'corroded';
      c.playerStatuses[s] = Math.max(c.playerStatuses[s] ?? 0, amt);
      events.push({ kind: 'status', tick: 0, step: 0, target: i, status: s, amount: amt, note: 'player' });
      return true;
    }
    case 'summon':
      for (let k = 0; k < (a.count ?? 1); k++) if (a.summon) summonEnemy(c, a.summon, events);
      return true;
    case 'buff': {
      const allies = a.target === 'self' ? [] : c.enemies.map((o, j) => (j !== i && o.hp > 0 ? j : -1)).filter((j) => j >= 0);
      for (const j of allies.length > 0 ? allies : [i]) addStrength(c, j, amt, events);
      return true;
    }
    case 'purge': {
      const keep = e.statuses.strength;
      e.statuses = keep ? { strength: keep } : {};
      events.push({ kind: 'status', tick: 0, step: 0, target: i, status: 'purge', amount: 0, note: 'purge' });
      return true;
    }
    case 'rewind':
      liftCombos(c, i, events, Math.max(1, a.amount ?? 1));
      return true;
  }
  return true;
}
