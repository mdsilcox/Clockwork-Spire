// The machine: one turn of ticks resolved exactly per docs/rules.md 1.4-1.5.
// Pure and deterministic: no randomness, no clock. Mutates the CombatState it is given;
// previewTurn (combat.ts) runs this on a copy.
import { diagonals, neighbors } from './board';
import { partDef } from './content/parts';
import type { ReleaseInfo, TickCtx } from './defs';
import { damageEnemy, damagePlayer, damageTarget, jamPart } from './enemy';
import type { HitOpts, HitResult } from './enemy';
import { canTarget, currentTarget, frontOf, parseRef } from './frames';
import { frameOf } from './framelib';
import { MAINSPRING } from './types';
import type { CombatState, GameEvent, PlacedPart, TurnPreview } from './types';

export { damagePlayer };

export const MAX_TICKS = 8;
export const PRESSURE_CAP = 30;
export const OVERPRESSURE_ABOVE = 20;
export const OVERPRESSURE_DAMAGE = 6;
export const OVERPRESSURE_RESET = 10;
const MAX_RELEASE_DEPTH = 4;

export const hasTrinket = (c: CombatState, id: string): boolean => c.trinkets.includes(id);

/** Pressure above this at the end of the turn overpressures (Pressure Gauge raises it to 25). */
export const overpressureAbove = (c: CombatState): number => (hasTrinket(c, 'pressure-gauge') ? 25 : OVERPRESSURE_ABOVE);

/** B9b hook (items-engine): does this turn end in overpressure? (Sun-Orb Core: never.) */
export function overpressureCheck(c: CombatState): boolean {
  return c.pressure > overpressureAbove(c);
}

/** B9b hook (items-engine): is this tick the last tick? (Hour Hand: its neighbors treat every tick as the last.) */
export function isLastTick(c: CombatState, tick: number, _cell: number): boolean {
  return tick >= c.ticksThisTurn;
}

/** B9b hook (items-engine): a status was applied to enemy `idx`; Conductor's Baton applies it to every other enemy. */
function spreadStatus(_rt: Rt, _idx: number, _status: string, _amount: number): void {
  // pass-through
}

export function anyAlive(c: CombatState): boolean {
  return c.enemies.some((e) => e.hp > 0);
}

/** The enemy the next Strike goes to (the enemy of the current target); -1 if none. */
export function liveTarget(c: CombatState): number {
  const t = currentTarget(c);
  return t ? parseRef(t).enemy : -1;
}

interface Acc {
  damage: number[];
  plating: number;
  firing: Record<number, number>;
  statuses: { target: number; status: string; amount: number }[];
  statusBonus: number; // Inventor's Lamp
  once: Set<string>; // oncePerTurn keys
  byTarget: TurnPreview['byTarget'];
  cancelled: TurnPreview['cancelled'];
}

interface Rt {
  c: CombatState;
  events: GameEvent[];
  acc: Acc;
  firedIds: Set<string>; // part def ids that fired earlier this tick
  /** During an enemy's attack: the part that attacked (Spring Trap strikes it). */
  attacker?: { enemy: number; part: string };
}

interface QItem {
  cell: number;
  from: number;
  step: number;
  boost: number;
  echo: boolean;
}

interface Ctx extends TickCtx {
  pending: ReleaseInfo[];
}

const newAcc = (c: CombatState): Acc => ({
  damage: c.enemies.map(() => 0),
  plating: 0,
  firing: {},
  statuses: [],
  statusBonus: 0,
  once: new Set(),
  byTarget: {},
  cancelled: [],
});

export function runMachine(c: CombatState, events: GameEvent[]): TurnPreview {
  c.momentum = 0;
  c.lastTurnContrib = {};
  for (const p of c.board) if (p) p.firedThisTurn = 0;
  for (const e of c.enemies) {
    e.coreTookThisTurn = 0; // Braced counts per player turn
    for (const p of e.parts) p.tookThisTurn = 0;
  }
  const acc = newAcc(c);
  for (const r of c.order) if (canTarget(c, r)) acc.byTarget[r] = { damage: 0, breaks: false };
  const rt: Rt = { c, events, acc, firedIds: new Set() };

  for (let tick = 1; tick <= c.ticksThisTurn && anyAlive(c); tick++) runTick(rt, tick);

  let overpressure = false;
  if (anyAlive(c) && overpressureCheck(c)) {
    overpressure = true;
    events.push({ kind: 'overpressure', tick: 0, step: 0, amount: OVERPRESSURE_DAMAGE });
    if (hasTrinket(c, 'steam-locket')) {
      for (let i = 0; i < c.enemies.length; i++) {
        const e = c.enemies[i];
        if (e.hp <= 0) continue;
        const raw = (e.statuses.cracked ?? 0) > 0 ? 15 : 10;
        acc.damage[i] = (acc.damage[i] ?? 0) + damageEnemy(c, i, raw, events, { tick: 0, step: 0 });
      }
    }
    damagePlayer(c, OVERPRESSURE_DAMAGE, events);
    c.pressure = OVERPRESSURE_RESET;
    events.push({ kind: 'pressure', tick: 0, step: 0, amount: c.pressure, note: 'set' });
  }

  return {
    byTarget: acc.byTarget,
    cancelled: acc.cancelled,
    damageByEnemy: acc.damage,
    plating: acc.plating,
    pressureAfter: c.pressure,
    ticks: c.ticksThisTurn,
    momentum: c.momentum,
    firing: acc.firing,
    statuses: acc.statuses,
    overpressure,
  };
}

/** Start of the player's turn: parts that release now (Torsion Spring). */
export function runTurnStartHooks(c: CombatState, events: GameEvent[]): void {
  const rt: Rt = { c, events, acc: newAcc(c), firedIds: new Set() };
  for (let cell = 0; cell < c.board.length; cell++) {
    const p = c.board[cell];
    if (!p) continue;
    const def = partDef(p.defId);
    if (!def.onTurnStart) continue;
    const ctx = makeCtx(rt, 0, 0, cell, p, 0, null);
    def.onTurnStart(ctx, p);
    resolveReleases(rt, ctx.pending, cell, 0, 0, 0);
  }
}

/** After enemy `enemyIdx` attacked the player: Spring Trap releases at it. */
export function runEnemyAttackHooks(c: CombatState, enemyIdx: number, events: GameEvent[], partId = 'core'): void {
  const rt: Rt = { c, events, acc: newAcc(c), firedIds: new Set(), attacker: { enemy: enemyIdx, part: partId } };
  for (let cell = 0; cell < c.board.length; cell++) {
    const p = c.board[cell];
    if (!p || c.enemies[enemyIdx].hp <= 0) continue;
    const def = partDef(p.defId);
    if (!def.onEnemyAttack) continue;
    const ctx = makeCtx(rt, 0, 0, cell, p, 0, null);
    def.onEnemyAttack(ctx, p, enemyIdx);
    resolveReleases(rt, ctx.pending, cell, 0, 0, 0);
  }
}

function runTick(rt: Rt, tick: number): void {
  const { c, events, acc } = rt;
  events.push({ kind: 'tick', tick, step: 0 });
  rt.firedIds = new Set();
  const visited = new Set<number>([MAINSPRING]);
  const queue: QItem[] = [];
  const enqueue = (from: number, cells: number[], step: number, boost: number, echo: boolean): void => {
    for (const n of cells) {
      if (visited.has(n) || !c.board[n]) continue;
      visited.add(n);
      queue.push({ cell: n, from, step, boost, echo });
    }
  };
  enqueue(MAINSPRING, neighbors(MAINSPRING), 1, 0, false);
  if (queue.length > 0 && hasTrinket(c, 'copper-wire')) queue[0].boost = 1; // the first part the Mainspring powers

  for (let head = 0; head < queue.length; head++) {
    const q = queue[head];
    const p = c.board[q.cell] as PlacedPart;
    const def = partDef(p.defId);
    events.push({ kind: 'pulse', tick, step: q.step, from: q.from, cell: q.cell });

    if (p.rusted > 0) {
      events.push({ kind: 'hold', tick, step: q.step, cell: q.cell, uid: p.uid, note: 'rust' });
      continue;
    }

    const firstOfTurn = c.momentum === 0;
    p.firedThisTurn += 1;
    c.momentum += 1;
    events.push({ kind: 'power', tick, step: q.step, cell: q.cell, uid: p.uid, amount: c.momentum });

    const fedBy = q.from === MAINSPRING ? null : (c.board[q.from]?.uid ?? null);
    const ctx = makeCtx(rt, tick, q.step, q.cell, p, q.boost, fedBy);
    const resolve = (): void => {
      acc.firing[q.cell] = (acc.firing[q.cell] ?? 0) + 1;
      const chargeBefore = p.charge;
      def.onFire(ctx, p);
      if (p.defId === 'boiler' && hasTrinket(c, 'ember-coal')) ctx.addPressure(1);
      if (p.charge > chargeBefore) {
        events.push({ kind: 'charge', tick, step: q.step, cell: q.cell, uid: p.uid, amount: p.charge });
      }
      resolveReleases(rt, ctx.pending, q.cell, tick, q.step, 0);
    };
    resolve();
    if ((q.echo || (firstOfTurn && hasTrinket(c, 'echo-chamber'))) && anyAlive(c)) {
      events.push({ kind: 'echo', tick, step: q.step, cell: q.cell, uid: p.uid });
      ctx.isEcho = true;
      resolve();
    }
    rt.firedIds.add(p.defId);

    if (def.holds && def.holds(ctx, p)) {
      events.push({ kind: 'hold', tick, step: q.step, cell: q.cell, uid: p.uid });
      continue;
    }
    enqueue(
      q.cell,
      def.diagonal ? [...neighbors(q.cell), ...diagonals(q.cell)] : neighbors(q.cell),
      q.step + 1,
      ctx.boostOut,
      ctx.echoOut,
    );
  }
}

/** Adjacent parts that listen for releases react, right after the release (same tick, step + 1). */
function resolveReleases(rt: Rt, pending: ReleaseInfo[], srcCell: number, tick: number, step: number, depth: number): void {
  const { c, events } = rt;
  const list = pending.splice(0, pending.length);
  for (const info of list) {
    for (const n of neighbors(srcCell)) {
      const part = c.board[n];
      if (!part || part.rusted > 0) continue;
      const def = partDef(part.defId);
      if (!def.onNeighborRelease) continue;
      const ctx = makeCtx(rt, tick, step + 1, n, part, 0, null);
      const chargeBefore = part.charge;
      def.onNeighborRelease(ctx, part, info);
      if (part.charge > chargeBefore) {
        events.push({ kind: 'charge', tick, step: step + 1, cell: n, uid: part.uid, amount: part.charge });
      }
      if (depth < MAX_RELEASE_DEPTH) resolveReleases(rt, ctx.pending, n, tick, step + 1, depth + 1);
    }
  }
}

function makeCtx(rt: Rt, tick: number, step: number, cell: number, p: PlacedPart, boostIn: number, fedBy: number | null): Ctx {
  const { c, events, acc } = rt;
  const base = { tick, step, cell, uid: p.uid };
  const contribute = (value: number, dmg = 0): void => {
    const cur = c.lastTurnContrib[p.uid];
    if (cur) {
      cur.value += value;
      cur.dmg = (cur.dmg ?? 0) + dmg;
    } else c.lastTurnContrib[p.uid] = { value, fedBy, dmg };
  };

  const record = (idx: number, partId: string, r: HitResult): void => {
    const key = `e${idx}.${partId}`;
    const t = (acc.byTarget[key] ??= { damage: 0, breaks: false });
    t.damage += r.lost;
    if (r.broke) t.breaks = true;
    if (r.cancelled) acc.cancelled.push({ enemy: idx, partId });
    if (partId === 'core') acc.damage[idx] = (acc.damage[idx] ?? 0) + r.lost;
  };
  /** One hit on a part or core, through the damage pipeline (legacy enemies: Cracked and Shell as v1). */
  const hitAt = (idx: number, partId: string, raw: number, opts: HitOpts = {}): HitResult => {
    const e = c.enemies[idx];
    const cracked = (e.statuses.cracked ?? 0) > 0 ? Math.floor(raw * 1.5) : raw;
    let r: HitResult;
    if (frameOf(e)) r = damageTarget(c, idx, partId, raw, events, base, opts);
    else {
      const lost = damageEnemy(c, idx, cracked, events, base, { ignoreShell: opts.drill });
      r = { lost, broke: e.hp <= 0 && lost > 0, died: e.hp <= 0 && lost > 0, cancelled: false };
    }
    record(idx, partId, r);
    contribute(cracked, r.lost);
    return r;
  };
  const hitRef = (ref: string, raw: number, opts: HitOpts = {}): HitResult => {
    const t = parseRef(ref);
    return hitAt(t.enemy, t.part, raw, opts);
  };
  /** B9b hook (items-engine): a Strike at `ref`. Cascade Piston, Overrun Coupler and Apprentice's Hands carry or add second
   * targets here (invariant 8 as amended). Pass-through: the plain single-target hit. */
  const routeStrike = (ref: string, raw: number, opts: HitOpts = {}): HitResult => hitRef(ref, raw, opts);
  const knuckles = (): number => (hasTrinket(c, 'brass-knuckles') && ctx.oncePerTurn('brass-knuckles') ? 4 : 0);
  const grit = (): number => c.playerStatuses.grit ?? 0;

  const ctx: Ctx = {
    c,
    tick,
    step,
    cell,
    boostIn,
    boostOut: 0,
    echoOut: false,
    released: false,
    isEcho: false,
    pending: [],
    isLastTick: () => isLastTick(c, tick, cell),
    isFirstFire: () => p.firedThisTurn === 1 && !ctx.isEcho,
    oncePerTurn(key) {
      if (acc.once.has(key)) return false;
      acc.once.add(key);
      return true;
    },
    firedEarlier: (defId) => rt.firedIds.has(defId),
    strike(amount) {
      const ref = currentTarget(c);
      if (!ref) return;
      routeStrike(ref, amount + ctx.boostIn + grit() + knuckles(), { word: 'strike' });
    },
    strikeAt(idx, amount) {
      const e = c.enemies[idx];
      if (!e || e.hp <= 0) return;
      const raw = amount + ctx.boostIn + grit() + knuckles();
      const a = rt.attacker;
      if (a && a.enemy === idx && a.part !== 'core') {
        const ps = e.parts.find((p) => p.id === a.part);
        if (ps && !ps.broken) {
          hitAt(idx, a.part, raw); // Spring Trap hits the part that attacked
          return;
        }
      }
      const ref = frontOf(c, idx);
      if (ref) routeStrike(ref, raw, { word: 'strike' });
    },
    sweep(amount) {
      for (let i = 0; i < c.enemies.length; i++) {
        if (c.enemies[i].hp <= 0) continue;
        const ref = frontOf(c, i);
        if (ref) hitRef(ref, amount + ctx.boostIn, { word: 'sweep' });
      }
    },
    plate(amount) {
      let gain = amount + ctx.boostIn;
      if ((c.playerStatuses.corroded ?? 0) > 0) gain = Math.floor(gain * 0.75);
      c.plating += gain;
      acc.plating += gain;
      contribute(gain);
      events.push({ kind: 'plate', ...base, amount: gain });
    },
    addPressure(amount) {
      const before = c.pressure;
      c.pressure = Math.min(PRESSURE_CAP, c.pressure + amount);
      events.push({ kind: 'pressure', ...base, amount: c.pressure - before });
    },
    spendPressure(amount) {
      if (c.pressure < amount) return false;
      c.pressure -= amount;
      events.push({ kind: 'pressure', ...base, amount: -amount });
      return true;
    },
    addTick() {
      if (c.ticksThisTurn >= MAX_TICKS) return false;
      c.ticksThisTurn += 1;
      events.push({ kind: 'tickAdded', ...base, amount: c.ticksThisTurn });
      if (hasTrinket(c, 'counterweight')) {
        c.plating += 3; // Counterweight: Plate 3 whenever a part adds a tick
        acc.plating += 3;
        contribute(3);
        events.push({ kind: 'plate', ...base, amount: 3, note: 'counterweight' });
      }
      return true;
    },
    release() {
      ctx.released = true;
      ctx.pending.push({ cam: false, from: cell });
      events.push({ kind: 'release', ...base });
    },
    camPayoff() {
      ctx.pending.push({ cam: true, from: cell });
      events.push({ kind: 'release', ...base, note: 'cam' });
    },
    applyStatus(who, status, amount) {
      const targets =
        who === 'all' ? c.enemies.map((_, i) => i).filter((i) => c.enemies[i].hp > 0) : [who === 'target' ? liveTarget(c) : who];
      let n = amount + (status === 'scald' || status === 'cracked' ? acc.statusBonus : 0);
      if (status === 'scald' && hasTrinket(c, 'soot-mask')) n += 1;
      if (status === 'cracked' && hasTrinket(c, 'cracked-lens')) n += 1;
      for (const idx of targets) {
        const e = c.enemies[idx];
        if (!e || e.hp <= 0) continue;
        const cur = e.statuses[status] ?? 0;
        e.statuses[status] = status === 'scald' ? cur + n : Math.max(cur, n);
        acc.statuses.push({ target: idx, status, amount: n });
        events.push({ kind: 'status', ...base, target: idx, status, amount: n });
        spreadStatus(rt, idx, status, n); // B9b hook (items-engine)
      }
    },
    heal(amount) {
      const gain = Math.min(amount, c.playerMaxHp - c.playerHp);
      if (gain <= 0) return;
      c.playerHp += gain;
      events.push({ kind: 'heal', ...base, amount: gain });
    },
    drawNextTurn(n) {
      c.extraDraw = (c.extraDraw ?? 0) + n;
    },
    // v2 player words (docs/rules.md 2.3). Boost, Grit and Brass Knuckles apply as for strike().
    shatter(amount) {
      const ref = currentTarget(c);
      if (!ref) return;
      const idx = parseRef(ref).enemy;
      const raw = amount + ctx.boostIn + grit() + knuckles();
      for (const p of c.enemies[idx].parts.slice()) if (!p.broken) hitAt(idx, p.id, raw, { word: 'shatter' });
    },
    drill(amount) {
      const ref = currentTarget(c);
      if (!ref) return;
      routeStrike(ref, amount + ctx.boostIn + grit() + knuckles(), { drill: true, word: 'drill' });
    },
    jam() {
      const ref = currentTarget(c);
      if (!ref) return;
      const t = parseRef(ref);
      if (t.part !== 'core') jamPart(c, t.enemy, t.part);
    },
    pry(amount) {
      const ref = currentTarget(c);
      if (!ref) return false;
      const idx = parseRef(ref).enemy;
      const raw = amount + ctx.boostIn + grit() + knuckles();
      let weakest: string | null = null;
      let least = Infinity;
      for (const p of c.enemies[idx].parts) {
        if (!p.broken && p.hp < least) {
          least = p.hp;
          weakest = p.id;
        }
      }
      const r = weakest ? hitAt(idx, weakest, raw, { word: 'pry' }) : hitRef(ref, raw, { word: 'pry' });
      return r.broke;
    },
    patch(amount) {
      ctx.heal(amount);
    },
    addStatusBonus(n) {
      acc.statusBonus += n;
    },
    clearRust(at) {
      const part = c.board[at];
      if (part && part.rusted > 0) {
        part.rusted = 0;
        events.push({ kind: 'sabotage', ...base, cell: at, note: 'clear' });
      }
    },
  };
  return ctx;
}
