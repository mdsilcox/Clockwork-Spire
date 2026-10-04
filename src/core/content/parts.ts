// Part registry: all 46 parts of docs/content.md. Tooltip `text` is the catalog's Effect column word for word;
// `textPlus` spells out the whole upgraded effect (the catalog's "Upgraded" column applied to the base text).
import { neighbors } from '../board';
import type { PartDef, TickCtx } from '../defs';
import type { CombatState, PlacedPart } from '../types';

const v = (p: PlacedPart, base: number, plus: number): number => (p.plus ? plus : base);

/** B3 check point: Spare Spring lowers every spring threshold by 1 (minimum 1). No trinket is implemented yet. */
export function springThreshold(_c: CombatState, base: number): number {
  return base;
}

/** Placed parts next to `ctx.cell` (edges only). */
function adjacent(ctx: TickCtx): { cell: number; part: PlacedPart }[] {
  const out: { cell: number; part: PlacedPart }[] = [];
  for (const n of neighbors(ctx.cell)) {
    const part = ctx.c.board[n];
    if (part) out.push({ cell: n, part });
  }
  return out;
}

const countAdjacent = (ctx: TickCtx, pred: (p: PlacedPart) => boolean): number => adjacent(ctx).filter((a) => pred(a.part)).length;

/** Cam family counting: adjacent Tappets add a firing; every `every`th firing pays off (at most once per fire). */
function camFire(ctx: TickCtx, p: PlacedPart, every: number, payoff: () => void): void {
  const tappets = countAdjacent(ctx, (q) => q.defId === 'tappet' && q.rusted === 0);
  const before = Math.floor(p.counter / every);
  p.counter += 1 + tappets;
  if (Math.floor(p.counter / every) > before) {
    ctx.camPayoff();
    payoff();
  }
}

const list: PartDef[] = [
  // ---------- Gears ----------
  {
    id: 'spur',
    name: 'Spur Gear',
    family: 'gear',
    rarity: 'common',
    locked: false,
    text: 'Strike 3.',
    textPlus: 'Strike 5.',
    onFire: (ctx, p) => ctx.strike(v(p, 3, 5)),
  },
  {
    id: 'idler',
    name: 'Idler Gear',
    family: 'gear',
    rarity: 'common',
    locked: false,
    text: 'Boost 2.',
    textPlus: 'Boost 3.',
    onFire: (ctx, p) => {
      ctx.boostOut = v(p, 2, 3);
    },
  },
  {
    id: 'bevel',
    name: 'Bevel Gear',
    family: 'gear',
    rarity: 'uncommon',
    locked: false,
    text: 'Strike 2. Also passes motion diagonally.',
    textPlus: 'Strike 4. Also passes motion diagonally.',
    diagonal: true,
    onFire: (ctx, p) => ctx.strike(v(p, 2, 4)),
  },
  {
    id: 'crown',
    name: 'Crown Gear',
    family: 'gear',
    rarity: 'uncommon',
    locked: false,
    text: 'Sweep 2.',
    textPlus: 'Sweep 3.',
    onFire: (ctx, p) => ctx.sweep(v(p, 2, 3)),
  },
  {
    id: 'ratchet',
    name: 'Ratchet',
    family: 'gear',
    rarity: 'uncommon',
    locked: true,
    text: 'Gains 1 charge each time it fires. Strike 1 + its charge.',
    textPlus: 'Gains 2 charge each time it fires. Strike 1 + its charge.',
    onFire: (ctx, p) => {
      p.charge += v(p, 1, 2);
      ctx.strike(1 + p.charge);
    },
  },
  {
    id: 'flywheel',
    name: 'Flywheel',
    family: 'gear',
    rarity: 'rare',
    locked: true,
    text: 'Strike half your Momentum (rounded down).',
    textPlus: 'Strike half your Momentum (rounded down) + 3.',
    onFire: (ctx, p) => ctx.strike(Math.floor(ctx.c.momentum / 2) + v(p, 0, 3)),
  },
  {
    id: 'planetary',
    name: 'Planetary Gear',
    family: 'gear',
    rarity: 'rare',
    locked: true,
    text: 'Strike 2 for each adjacent Gear.',
    textPlus: 'Strike 3 for each adjacent Gear.',
    onFire: (ctx, p) => {
      const n = countAdjacent(ctx, (q) => partOf(q).family === 'gear');
      if (n > 0) ctx.strike(v(p, 2, 3) * n);
    },
  },
  {
    id: 'sprocket-wheel',
    name: 'Sprocket Wheel',
    family: 'gear',
    rarity: 'uncommon',
    locked: true,
    text: 'Strike 2. The first time it fires each turn, draw 1 extra part next turn.',
    textPlus: 'Strike 4. The first time it fires each turn, draw 1 extra part next turn.',
    flavor: '"He was named after this. Or was it the other way round?"',
    onFire: (ctx, p) => {
      ctx.strike(v(p, 2, 4));
      if (ctx.isFirstFire()) ctx.drawNextTurn(1);
    },
  },

  // ---------- Springs ----------
  {
    id: 'coil',
    name: 'Coil Spring',
    family: 'spring',
    rarity: 'common',
    locked: false,
    text: 'Holds. +1 charge. At 3: release Strike 10 and pass.',
    textPlus: 'Holds. +1 charge. At 3: release Strike 14 and pass.',
    threshold: 3,
    thresholdPlus: 3,
    holds: (ctx) => !ctx.released,
    onFire: (ctx, p) => {
      p.charge += 1;
      if (p.charge >= springThreshold(ctx.c, 3)) {
        ctx.release();
        ctx.strike(v(p, 10, 14));
        p.charge = 0;
      }
    },
  },
  {
    id: 'leaf',
    name: 'Leaf Spring',
    family: 'spring',
    rarity: 'common',
    locked: false,
    text: 'Holds. +1 charge. At 2: release Plate 10 and pass.',
    textPlus: 'Holds. +1 charge. At 2: release Plate 14 and pass.',
    threshold: 2,
    thresholdPlus: 2,
    holds: (ctx) => !ctx.released,
    onFire: (ctx, p) => {
      p.charge += 1;
      if (p.charge >= springThreshold(ctx.c, 2)) {
        ctx.release();
        ctx.plate(v(p, 10, 14));
        p.charge = 0;
      }
    },
  },
  {
    id: 'torsion',
    name: 'Torsion Spring',
    family: 'spring',
    rarity: 'uncommon',
    locked: false,
    text: '+1 charge. At the start of your next turn, release Strike 4 per charge.',
    textPlus: '+1 charge. At the start of your next turn, release Strike 5 per charge.',
    onFire: (_ctx, p) => {
      p.charge += 1;
    },
    onTurnStart: (ctx, p) => {
      if (p.charge <= 0) return;
      const n = p.charge;
      p.charge = 0;
      ctx.release();
      ctx.strike(v(p, 4, 5) * n);
    },
  },
  {
    id: 'trap',
    name: 'Spring Trap',
    family: 'spring',
    rarity: 'uncommon',
    locked: false,
    text: '+1 charge (max 5). When an enemy attacks you, release Strike 3 per charge at it.',
    textPlus: '+1 charge (max 5). When an enemy attacks you, release Strike 4 per charge at it.',
    onFire: (_ctx, p) => {
      p.charge = Math.min(5, p.charge + 1);
    },
    onEnemyAttack: (ctx, p, idx) => {
      if (p.charge <= 0) return;
      const n = p.charge;
      p.charge = 0;
      ctx.release();
      ctx.strikeAt(idx, v(p, 3, 4) * n);
    },
  },
  {
    id: 'recoil',
    name: 'Recoil Spring',
    family: 'spring',
    rarity: 'uncommon',
    locked: true,
    text: 'Plate 2. When an adjacent part releases, +2 charge. At 4: release Sweep 8.',
    textPlus: 'Plate 2. When an adjacent part releases, +2 charge. At 4: release Sweep 12.',
    threshold: 4,
    thresholdPlus: 4,
    onFire: (ctx) => ctx.plate(2),
    onNeighborRelease: (ctx, p) => {
      p.charge += 2;
      if (p.charge >= springThreshold(ctx.c, 4)) {
        p.charge = 0;
        ctx.release();
        ctx.sweep(v(p, 8, 12));
      }
    },
  },
  {
    id: 'volute',
    name: 'Volute Spring',
    family: 'spring',
    rarity: 'rare',
    locked: true,
    text: 'Holds. +1 charge and Plate 2. At 4: release Strike 20 and pass.',
    textPlus: 'Holds. +1 charge and Plate 3. At 4: release Strike 26 and pass.',
    threshold: 4,
    thresholdPlus: 4,
    holds: (ctx) => !ctx.released,
    onFire: (ctx, p) => {
      p.charge += 1;
      ctx.plate(v(p, 2, 3));
      if (p.charge >= springThreshold(ctx.c, 4)) {
        ctx.release();
        ctx.strike(v(p, 20, 26));
        p.charge = 0;
      }
    },
  },
  {
    id: 'hairspring',
    name: 'Hairspring',
    family: 'spring',
    rarity: 'rare',
    locked: true,
    text: 'Holds. +1 charge. At 2: release +1 tick this turn (once per turn) and pass.',
    textPlus: 'Holds. +1 charge. At 2: release +1 tick this turn (once per turn) and pass, with Boost 2.',
    threshold: 2,
    thresholdPlus: 2,
    holds: (ctx) => !ctx.released,
    onFire: (ctx, p) => {
      p.charge += 1;
      if (p.charge >= springThreshold(ctx.c, 2)) {
        p.charge = 0;
        ctx.release();
        if (ctx.oncePerTurn(`hairspring:${p.uid}`)) ctx.addTick();
        if (p.plus) ctx.boostOut = 2;
      }
    },
  },

  // ---------- Cams and levers ----------
  {
    id: 'cam',
    name: 'Cam',
    family: 'cam',
    rarity: 'common',
    locked: false,
    text: 'Every 2nd time it fires: Strike 7.',
    textPlus: 'Every 2nd time it fires: Strike 10.',
    threshold: 2,
    thresholdPlus: 2,
    onFire: (ctx, p) => camFire(ctx, p, 2, () => ctx.strike(v(p, 7, 10))),
  },
  {
    id: 'triple-cam',
    name: 'Triple Cam',
    family: 'cam',
    rarity: 'uncommon',
    locked: false,
    text: 'Every 3rd time it fires: Sweep 8.',
    textPlus: 'Every 3rd time it fires: Sweep 11.',
    threshold: 3,
    thresholdPlus: 3,
    onFire: (ctx, p) => camFire(ctx, p, 3, () => ctx.sweep(v(p, 8, 11))),
  },
  {
    id: 'lever',
    name: 'Lever',
    family: 'cam',
    rarity: 'uncommon',
    locked: false,
    text: 'Parts this Lever powers fire with Echo.',
    textPlus: 'Parts this Lever powers fire with Echo and Boost 1.',
    onFire: (ctx, p) => {
      ctx.echoOut = true;
      if (p.plus) ctx.boostOut = 1;
    },
  },
  {
    id: 'trip-hammer',
    name: 'Trip Hammer',
    family: 'cam',
    rarity: 'common',
    locked: false,
    text: 'Plate 1. When an adjacent part releases or an adjacent Cam pays off: Strike 6.',
    textPlus: 'Plate 1. When an adjacent part releases or an adjacent Cam pays off: Strike 9.',
    onFire: (ctx) => ctx.plate(1),
    onNeighborRelease: (ctx, p) => ctx.strike(v(p, 6, 9)),
  },
  {
    id: 'tappet',
    name: 'Tappet',
    family: 'cam',
    rarity: 'uncommon',
    locked: false,
    text: 'Adjacent Cams count one extra firing.',
    textPlus: 'Adjacent Cams count one extra firing. Strike 2.',
    onFire: (ctx, p) => {
      if (p.plus) ctx.strike(2);
    },
  },
  {
    id: 'cam-follower',
    name: 'Cam Follower',
    family: 'cam',
    rarity: 'common',
    locked: false,
    text: 'Plate 2. When an adjacent Cam pays off: Plate 5.',
    textPlus: 'Plate 3. When an adjacent Cam pays off: Plate 7.',
    onFire: (ctx, p) => ctx.plate(v(p, 2, 3)),
    onNeighborRelease: (ctx, p, info) => {
      if (info.cam) ctx.plate(v(p, 5, 7));
    },
  },
  {
    id: 'toggle',
    name: 'Toggle Switch',
    family: 'cam',
    rarity: 'common',
    locked: false,
    text: 'Odd ticks: Strike 4 and pass. Even ticks: Plate 4 and hold.',
    textPlus: 'Odd ticks: Strike 6 and pass. Even ticks: Plate 6 and hold.',
    holds: (ctx) => ctx.tick % 2 === 0,
    onFire: (ctx, p) => {
      if (ctx.tick % 2 === 1) ctx.strike(v(p, 4, 6));
      else ctx.plate(v(p, 4, 6));
    },
  },

  // ---------- Pendulums and escapements ----------
  {
    id: 'escapement',
    name: 'Escapement',
    family: 'tempo',
    rarity: 'common',
    locked: false,
    text: 'Plate 3.',
    textPlus: 'Plate 5.',
    onFire: (ctx, p) => ctx.plate(v(p, 3, 5)),
  },
  {
    id: 'pendulum',
    name: 'Pendulum',
    family: 'tempo',
    rarity: 'uncommon',
    locked: false,
    text: 'Strike 1. The first time it fires each turn: +1 tick this turn.',
    textPlus: 'Strike 1 and Plate 4. The first time it fires each turn: +1 tick this turn.',
    onFire: (ctx, p) => {
      ctx.strike(1);
      if (p.plus) ctx.plate(4);
      if (ctx.isFirstFire()) ctx.addTick();
    },
  },
  {
    id: 'anchor',
    name: 'Anchor Escapement',
    family: 'tempo',
    rarity: 'common',
    locked: false,
    text: 'Holds on tick 1. From tick 2: Plate 2 x the tick number and pass.',
    textPlus: 'Holds on tick 1. From tick 2: Plate 3 x the tick number and pass.',
    holds: (ctx) => ctx.tick === 1,
    onFire: (ctx, p) => {
      if (ctx.tick >= 2) ctx.plate(v(p, 2, 3) * ctx.tick);
    },
  },
  {
    id: 'metronome',
    name: 'Metronome',
    family: 'tempo',
    rarity: 'common',
    locked: false,
    text: 'Holds on tick 1. From tick 2: Strike 2 x the tick number and pass.',
    textPlus: 'Holds on tick 1. From tick 2: Strike 3 x the tick number and pass.',
    holds: (ctx) => ctx.tick === 1,
    onFire: (ctx, p) => {
      if (ctx.tick >= 2) ctx.strike(v(p, 2, 3) * ctx.tick);
    },
  },
  {
    id: 'balance-wheel',
    name: 'Balance Wheel',
    family: 'tempo',
    rarity: 'uncommon',
    locked: false,
    text: 'On the last tick: Plate equal to your Momentum.',
    textPlus: 'On the last tick: Plate equal to your Momentum + 4.',
    onFire: (ctx, p) => {
      if (ctx.isLastTick()) ctx.plate(ctx.c.momentum + v(p, 0, 4));
    },
  },
  {
    id: 'verge',
    name: 'Verge',
    family: 'tempo',
    rarity: 'uncommon',
    locked: true,
    text: 'Holds on tick 1. Later ticks: pass with Boost 3.',
    textPlus: 'Holds on tick 1. Later ticks: pass with Boost 5.',
    holds: (ctx) => ctx.tick === 1,
    onFire: (ctx, p) => {
      if (ctx.tick >= 2) ctx.boostOut = v(p, 3, 5);
    },
  },
  {
    id: 'grandfather',
    name: 'Grandfather Weight',
    family: 'tempo',
    rarity: 'rare',
    locked: true,
    text: 'Strike 3. From your 3rd turn of a combat, the first time it fires each turn: +1 tick.',
    textPlus: 'Strike 3. From your 2nd turn of a combat, the first time it fires each turn: +1 tick.',
    onFire: (ctx, p) => {
      ctx.strike(3);
      if (ctx.c.turn >= v(p, 3, 2) && ctx.isFirstFire()) ctx.addTick();
    },
  },
  {
    id: 'chronometer',
    name: 'Chronometer',
    family: 'tempo',
    rarity: 'rare',
    locked: true,
    text: 'On the last tick: Strike 3 x the number of ticks this turn.',
    textPlus: 'On the last tick: Strike 4 x the number of ticks this turn.',
    onFire: (ctx, p) => {
      if (ctx.isLastTick()) ctx.strike(v(p, 3, 4) * ctx.c.ticksThisTurn);
    },
  },

  // ---------- Steam ----------
  {
    id: 'boiler',
    name: 'Boiler',
    family: 'steam',
    rarity: 'common',
    locked: false,
    text: '+2 Pressure.',
    textPlus: '+3 Pressure.',
    onFire: (ctx, p) => ctx.addPressure(v(p, 2, 3)),
  },
  {
    id: 'piston',
    name: 'Piston',
    family: 'steam',
    rarity: 'common',
    locked: false,
    text: 'Spend 3 Pressure: Strike 9. Without enough Pressure: Strike 2.',
    textPlus: 'Spend 3 Pressure: Strike 13. Without enough Pressure: Strike 2.',
    onFire: (ctx, p) => {
      if (ctx.spendPressure(3)) ctx.strike(v(p, 9, 13));
      else ctx.strike(2);
    },
  },
  {
    id: 'whistle',
    name: 'Steam Whistle',
    family: 'steam',
    rarity: 'common',
    locked: false,
    text: 'Spend 2 Pressure: Scald 3 to every enemy.',
    textPlus: 'Spend 2 Pressure: Scald 4 to every enemy.',
    onFire: (ctx, p) => {
      if (ctx.spendPressure(2)) ctx.applyStatus('all', 'scald', v(p, 3, 4));
    },
  },
  {
    id: 'safety-valve',
    name: 'Safety Valve',
    family: 'steam',
    rarity: 'common',
    locked: false,
    text: 'Spend up to 4 Pressure: Plate 2 per Pressure spent.',
    textPlus: 'Spend up to 6 Pressure: Plate 2 per Pressure spent.',
    onFire: (ctx, p) => {
      const n = Math.min(ctx.c.pressure, v(p, 4, 6));
      if (n > 0 && ctx.spendPressure(n)) ctx.plate(2 * n);
    },
  },
  {
    id: 'firebox',
    name: 'Firebox',
    family: 'steam',
    rarity: 'uncommon',
    locked: false,
    text: 'Strike 2. +1 Pressure per adjacent Boiler.',
    textPlus: 'Strike 4. +2 Pressure per adjacent Boiler.',
    onFire: (ctx, p) => {
      ctx.strike(v(p, 2, 4));
      const n = countAdjacent(ctx, (q) => q.defId === 'boiler');
      if (n > 0) ctx.addPressure(v(p, 1, 2) * n);
    },
  },
  {
    id: 'kettle',
    name: 'Tea Kettle',
    family: 'steam',
    rarity: 'uncommon',
    locked: false,
    text: '+1 Pressure. The first time it fires each combat: heal 3.',
    textPlus: '+1 Pressure. The first time it fires each combat: heal 5.',
    onFire: (ctx, p) => {
      ctx.addPressure(1);
      if (p.counter === 0) {
        p.counter = 1; // counter doubles as the once-per-combat flag
        ctx.heal(v(p, 3, 5));
      }
    },
  },
  {
    id: 'condenser',
    name: 'Condenser',
    family: 'steam',
    rarity: 'uncommon',
    locked: true,
    text: 'Plate equal to half your Pressure (rounded down).',
    textPlus: 'Plate equal to three quarters of your Pressure (rounded down).',
    onFire: (ctx, p) => {
      const n = p.plus ? Math.floor((ctx.c.pressure * 3) / 4) : Math.floor(ctx.c.pressure / 2);
      if (n > 0) ctx.plate(n);
    },
  },
  {
    id: 'steam-hammer',
    name: 'Steam Hammer',
    family: 'steam',
    rarity: 'rare',
    locked: true,
    text: 'Holds. On the last tick only: spend all Pressure, Strike 2 per Pressure spent.',
    textPlus: 'Holds. On the last tick only: spend all Pressure, Strike 2 per Pressure spent and Cracked 2.',
    holds: () => true,
    onFire: (ctx, p) => {
      if (!ctx.isLastTick()) return;
      const n = ctx.c.pressure;
      if (n > 0 && ctx.spendPressure(n)) ctx.strike(2 * n);
      if (p.plus) ctx.applyStatus('target', 'cracked', 2);
    },
  },
  {
    id: 'governor',
    name: 'Flyball Governor',
    family: 'steam',
    rarity: 'rare',
    locked: true,
    text: 'If Pressure is above 15: spend 5, Sweep 10.',
    textPlus: 'If Pressure is above 15: spend 5, Sweep 14.',
    onFire: (ctx, p) => {
      if (ctx.c.pressure > 15 && ctx.spendPressure(5)) ctx.sweep(v(p, 10, 14));
    },
  },

  // ---------- Chimes and tools ----------
  {
    id: 'chime',
    name: 'Chime',
    family: 'chime',
    rarity: 'common',
    locked: false,
    text: 'Strike 1 and Dazed 1.',
    textPlus: 'Strike 2 and Dazed 2.',
    onFire: (ctx, p) => {
      ctx.strike(v(p, 1, 2));
      ctx.applyStatus('target', 'dazed', v(p, 1, 2));
    },
  },
  {
    id: 'bell-hammer',
    name: 'Bell Hammer',
    family: 'chime',
    rarity: 'common',
    locked: false,
    text: 'Strike 4 and Cracked 1.',
    textPlus: 'Strike 5 and Cracked 2.',
    onFire: (ctx, p) => {
      ctx.strike(v(p, 4, 5));
      ctx.applyStatus('target', 'cracked', v(p, 1, 2));
    },
  },
  {
    id: 'oil-can',
    name: 'Oil Can',
    family: 'chime',
    rarity: 'common',
    locked: false,
    text: 'Clears Rust from adjacent parts. Boost 1.',
    textPlus: 'Clears Rust from adjacent parts. Boost 2.',
    onFire: (ctx, p) => {
      for (const a of adjacent(ctx)) ctx.clearRust(a.cell);
      ctx.boostOut = v(p, 1, 2);
    },
  },
  {
    id: 'tuning-fork',
    name: 'Tuning Fork',
    family: 'chime',
    rarity: 'uncommon',
    locked: true,
    text: 'If a Chime fired earlier this tick: Cracked 2 to every enemy. Otherwise Strike 3.',
    textPlus: 'If a Chime fired earlier this tick: Cracked 3 to every enemy. Otherwise Strike 3.',
    onFire: (ctx, p) => {
      if (ctx.firedEarlier('chime')) ctx.applyStatus('all', 'cracked', v(p, 2, 3));
      else ctx.strike(3);
    },
  },
  {
    id: 'alarm-clock',
    name: 'Alarm Clock',
    family: 'chime',
    rarity: 'uncommon',
    locked: true,
    text: 'Scald 2. On the last tick: Scald 4 instead.',
    textPlus: 'Scald 3. On the last tick: Scald 6 instead.',
    onFire: (ctx, p) => ctx.applyStatus('target', 'scald', ctx.isLastTick() ? v(p, 4, 6) : v(p, 2, 3)),
  },
  {
    id: 'gong',
    name: 'Gong',
    family: 'chime',
    rarity: 'rare',
    locked: true,
    text: 'If your Momentum is 8 or more: Sweep 10.',
    textPlus: 'If your Momentum is 8 or more: Sweep 14.',
    onFire: (ctx, p) => {
      if (ctx.c.momentum >= 8) ctx.sweep(v(p, 10, 14));
    },
  },
  {
    id: 'lamp',
    name: "Inventor's Lamp",
    family: 'chime',
    rarity: 'rare',
    locked: true,
    text: 'Scald and Cracked you apply this turn are +1.',
    textPlus: 'Scald and Cracked you apply this turn are +2.',
    onFire: (ctx, p) => {
      if (ctx.oncePerTurn(`lamp:${p.uid}`)) ctx.addStatusBonus(v(p, 1, 2)); // a bonus for the turn, not one per tick
    },
  },
];

export const PARTS: Record<string, PartDef> = Object.fromEntries(list.map((d) => [d.id, d]));

export function partDef(id: string): PartDef {
  const d = PARTS[id];
  if (!d) throw new Error(`Unknown part: ${id}`);
  return d;
}

/** Def of a placed part (used by hooks that count neighbors by family). */
function partOf(p: PlacedPart): PartDef {
  return partDef(p.defId);
}

export function partName(id: string, plus: boolean): string {
  return partDef(id).name + (plus ? '+' : '');
}

export function partText(id: string, plus: boolean): string {
  const d = partDef(id);
  return plus ? d.textPlus : d.text;
}
