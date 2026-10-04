// What the player sees while a turn replays: displayed numbers move event by event.
// This only applies deltas the events carry; it never re-runs rules.
import type { CombatState, GameEvent } from '../core/types';

export interface StageView {
  enemyHp: number[];
  enemyShell: number[];
  playerHp: number;
  plating: number;
  pressure: number;
  ticks: number;
  tick: number; // current tick while replaying, 0 otherwise
  chain: number; // Momentum so far this turn
}

export function viewFromState(c: CombatState): StageView {
  return {
    enemyHp: c.enemies.map((e) => e.hp),
    enemyShell: c.enemies.map((e) => e.shell),
    playerHp: c.playerHp,
    plating: c.plating,
    pressure: c.pressure,
    ticks: c.ticksThisTurn,
    tick: 0,
    chain: 0, // Momentum only shows while a turn replays
  };
}

function absorbed(ev: GameEvent): number {
  const m = /absorbed:(\d+)/.exec(ev.note ?? '');
  return m ? Number(m[1]) : 0;
}

export function applyEvent(v: StageView, ev: GameEvent): void {
  switch (ev.kind) {
    case 'tick':
      v.tick = ev.tick;
      break;
    case 'power':
      v.chain = ev.amount ?? v.chain + 1;
      break;
    case 'strike':
      if (ev.target !== undefined) {
        v.enemyShell[ev.target] = Math.max(0, v.enemyShell[ev.target] - absorbed(ev));
        v.enemyHp[ev.target] = Math.max(0, v.enemyHp[ev.target] - (ev.amount ?? 0));
      }
      break;
    case 'plate':
      v.plating += ev.amount ?? 0;
      break;
    case 'pressure':
      v.pressure = ev.note === 'set' ? (ev.amount ?? 0) : Math.max(0, Math.min(30, v.pressure + (ev.amount ?? 0)));
      break;
    case 'tickAdded':
      v.ticks = ev.amount ?? v.ticks + 1;
      break;
    case 'playerHit':
      v.plating = Math.max(0, v.plating - absorbed(ev));
      v.playerHp = Math.max(0, v.playerHp - (ev.amount ?? 0));
      break;
    case 'enemyAction':
      if (ev.target !== undefined) {
        v.enemyShell[ev.target] = 0;
        if (ev.note === 'defend') v.enemyShell[ev.target] = ev.amount ?? 0;
      }
      break;
    default:
      break;
  }
}

export interface Timed {
  events: GameEvent[];
  times: number[]; // seconds at 1x
  duration: number;
}

/** Event times at 1x: ticks run one after another, steps within a tick are spaced, outside events follow in order. */
export function timeline(events: GameEvent[]): Timed {
  const STEP = 0.16;
  const TICK_PAD = 0.28;
  const maxStep: Record<number, number> = {};
  let lastTick = 0;
  for (const e of events) {
    if (e.tick > 0) {
      maxStep[e.tick] = Math.max(maxStep[e.tick] ?? 0, e.step);
      lastTick = Math.max(lastTick, e.tick);
    }
  }
  const base: number[] = [0, 0];
  for (let t = 1; t <= lastTick; t++) base[t + 1] = base[t] + ((maxStep[t] ?? 0) + 1) * STEP + TICK_PAD;
  let cursor = base[lastTick + 1] ?? 0;
  const times: number[] = [];
  for (const e of events) {
    if (e.tick > 0) {
      times.push(base[e.tick] + e.step * STEP);
    } else {
      times.push(cursor);
      cursor += e.kind === 'enemyAction' ? 0.55 : e.kind === 'draw' ? 0.06 : e.kind === 'playerHit' ? 0.3 : 0.12;
    }
  }
  return { events, times, duration: cursor + 0.35 };
}
