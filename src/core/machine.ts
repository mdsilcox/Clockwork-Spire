// The machine: one turn of ticks resolved exactly per docs/rules.md 1.4-1.5.
// Pure and deterministic: no randomness, no clock. Mutates the CombatState it is given;
// previewTurn (combat.ts) runs this on a copy.
import { diagonals, neighbors } from './board';
import { partDef } from './content/parts';
import type { ReleaseInfo, TickCtx } from './defs';
import { damageEnemy, damagePlayer } from './enemy';
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

export function anyAlive(c: CombatState): boolean {
  return c.enemies.some((e) => e.hp > 0);
}

/** The enemy a Strike goes to: the chosen target while it lives, else the leftmost living one; -1 if none. */
export function liveTarget(c: CombatState): number {
  if (c.enemies[c.targetIdx] && c.enemies[c.targetIdx].hp > 0) return c.targetIdx;
  return c.enemies.findIndex((e) => e.hp > 0);
}

interface Acc {
  damage: number[];
  plating: number;
  firing: Record<number, number>;
  statuses: { target: number; status: string; amount: number }[];
  statusBonus: number; // Inventor's Lamp
  once: Set<string>; // oncePerTurn keys
}

interface Rt {
  c: CombatState;
  events: GameEvent[];
  acc: Acc;
  firedIds: Set<string>; // part def ids that fired earlier this tick
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
});

export function runMachine(c: CombatState, events: GameEvent[]): TurnPreview {
  c.momentum = 0;
  c.lastTurnContrib = {};
  for (const p of c.board) if (p) p.firedThisTurn = 0;
  const acc = newAcc(c);
  const rt: Rt = { c, events, acc, firedIds: new Set() };

  for (let tick = 1; tick <= c.ticksThisTurn && anyAlive(c); tick++) runTick(rt, tick);

  let overpressure = false;
  if (anyAlive(c) && c.pressure > overpressureAbove(c)) {
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
export function runEnemyAttackHooks(c: CombatState, enemyIdx: number, events: GameEvent[]): void {
  const rt: Rt = { c, events, acc: newAcc(c), firedIds: new Set() };
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

  const hit = (idx: number, raw: number): void => {
    const e = c.enemies[idx];
    let dmg = raw;
    if ((e.statuses.cracked ?? 0) > 0) dmg = Math.floor(dmg * 1.5);
    const lost = damageEnemy(c, idx, dmg, events, base);
    acc.damage[idx] = (acc.damage[idx] ?? 0) + lost;
    contribute(dmg, lost);
  };
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
    isLastTick: () => tick >= c.ticksThisTurn,
    isFirstFire: () => p.firedThisTurn === 1 && !ctx.isEcho,
    oncePerTurn(key) {
      if (acc.once.has(key)) return false;
      acc.once.add(key);
      return true;
    },
    firedEarlier: (defId) => rt.firedIds.has(defId),
    strike(amount) {
      const idx = liveTarget(c);
      if (idx < 0) return;
      hit(idx, amount + ctx.boostIn + grit() + knuckles());
    },
    strikeAt(idx, amount) {
      if (!c.enemies[idx] || c.enemies[idx].hp <= 0) return;
      hit(idx, amount + ctx.boostIn + grit() + knuckles());
    },
    sweep(amount) {
      for (let i = 0; i < c.enemies.length; i++) {
        if (c.enemies[i].hp > 0) hit(i, amount + ctx.boostIn);
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
