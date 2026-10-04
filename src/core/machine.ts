// The machine: one turn of ticks resolved exactly per docs/rules.md 1.4-1.5.
// Pure and deterministic: no randomness, no clock. Mutates the CombatState it is given;
// previewTurn (combat.ts) runs this on a copy.
import { diagonals, neighbors } from './board';
import { partDef } from './content/parts';
import type { TickCtx } from './defs';
import { MAINSPRING } from './types';
import type { CombatState, GameEvent, PlacedPart, TurnPreview } from './types';

export const MAX_TICKS = 8;
export const PRESSURE_CAP = 30;
export const OVERPRESSURE_ABOVE = 20;
export const OVERPRESSURE_DAMAGE = 6;
export const OVERPRESSURE_RESET = 10;

export function anyAlive(c: CombatState): boolean {
  return c.enemies.some((e) => e.hp > 0);
}

/** The enemy a Strike goes to: the chosen target while it lives, else the leftmost living one; -1 if none. */
export function liveTarget(c: CombatState): number {
  if (c.enemies[c.targetIdx] && c.enemies[c.targetIdx].hp > 0) return c.targetIdx;
  return c.enemies.findIndex((e) => e.hp > 0);
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

interface Acc {
  damage: number[];
  plating: number;
  firing: Record<number, number>;
  statuses: { target: number; status: string; amount: number }[];
}

interface QItem {
  cell: number;
  from: number;
  step: number;
  boost: number;
}

export function runMachine(c: CombatState, events: GameEvent[]): TurnPreview {
  c.momentum = 0;
  c.lastTurnContrib = {};
  for (const p of c.board) if (p) p.firedThisTurn = 0;
  const acc: Acc = { damage: c.enemies.map(() => 0), plating: 0, firing: {}, statuses: [] };

  for (let tick = 1; tick <= c.ticksThisTurn && anyAlive(c); tick++) runTick(c, tick, events, acc);

  let overpressure = false;
  if (anyAlive(c) && c.pressure > OVERPRESSURE_ABOVE) {
    overpressure = true;
    events.push({ kind: 'overpressure', tick: 0, step: 0, amount: OVERPRESSURE_DAMAGE });
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

function runTick(c: CombatState, tick: number, events: GameEvent[], acc: Acc): void {
  events.push({ kind: 'tick', tick, step: 0 });
  const visited = new Set<number>([MAINSPRING]);
  const queue: QItem[] = [];
  const enqueue = (from: number, cells: number[], step: number, boost: number): void => {
    for (const n of cells) {
      if (visited.has(n) || !c.board[n]) continue;
      visited.add(n);
      queue.push({ cell: n, from, step, boost });
    }
  };
  enqueue(MAINSPRING, neighbors(MAINSPRING), 1, 0);

  for (let head = 0; head < queue.length; head++) {
    const q = queue[head];
    const p = c.board[q.cell] as PlacedPart;
    const def = partDef(p.defId);
    events.push({ kind: 'pulse', tick, step: q.step, from: q.from, cell: q.cell });

    if (p.rusted > 0) {
      events.push({ kind: 'hold', tick, step: q.step, cell: q.cell, uid: p.uid, note: 'rust' });
      continue;
    }

    p.firedThisTurn += 1;
    c.momentum += 1;
    acc.firing[q.cell] = (acc.firing[q.cell] ?? 0) + 1;
    events.push({ kind: 'power', tick, step: q.step, cell: q.cell, uid: p.uid, amount: c.momentum });

    const fedBy = q.from === MAINSPRING ? null : (c.board[q.from]?.uid ?? null);
    const ctx = makeCtx(c, tick, q, p, fedBy, events, acc);
    const chargeBefore = p.charge;
    def.onFire(ctx, p);
    if (p.charge > chargeBefore) {
      events.push({ kind: 'charge', tick, step: q.step, cell: q.cell, uid: p.uid, amount: p.charge });
    }

    if (def.holds && def.holds(ctx, p)) {
      events.push({ kind: 'hold', tick, step: q.step, cell: q.cell, uid: p.uid });
      continue;
    }
    enqueue(q.cell, def.diagonal ? [...neighbors(q.cell), ...diagonals(q.cell)] : neighbors(q.cell), q.step + 1, ctx.boostOut);
  }
}

function makeCtx(
  c: CombatState,
  tick: number,
  q: QItem,
  p: PlacedPart,
  fedBy: number | null,
  events: GameEvent[],
  acc: Acc,
): TickCtx {
  const base = { tick, step: q.step, cell: q.cell, uid: p.uid };
  const contribute = (value: number): void => {
    const cur = c.lastTurnContrib[p.uid];
    if (cur) cur.value += value;
    else c.lastTurnContrib[p.uid] = { value, fedBy };
  };

  const hit = (idx: number, raw: number): void => {
    const e = c.enemies[idx];
    let dmg = raw;
    if ((e.statuses.cracked ?? 0) > 0) dmg = Math.floor(dmg * 1.5);
    const absorbed = Math.min(e.shell, dmg);
    e.shell -= absorbed;
    const lost = Math.min(e.hp, dmg - absorbed);
    e.hp -= lost;
    acc.damage[idx] += lost;
    contribute(dmg);
    events.push({
      kind: 'strike',
      ...base,
      target: idx,
      amount: lost,
      note: absorbed > 0 ? `absorbed:${absorbed}` : undefined,
    });
    if (e.hp <= 0 && lost > 0) events.push({ kind: 'enemyDied', ...base, target: idx });
  };

  const ctx: TickCtx = {
    c,
    tick,
    step: q.step,
    cell: q.cell,
    boostIn: q.boost,
    boostOut: 0,
    released: false,
    isLastTick: () => tick >= c.ticksThisTurn,
    strike(amount) {
      const idx = liveTarget(c);
      if (idx < 0) return;
      hit(idx, amount + ctx.boostIn);
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
      return true;
    },
    release() {
      ctx.released = true;
      events.push({ kind: 'release', ...base });
    },
  };
  return ctx;
}
