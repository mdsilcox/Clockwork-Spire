// Part registry. B1 ships 8 parts; add more by appending entries (docs/content.md has all 46).
import type { PartDef } from '../defs';
import type { PlacedPart } from '../types';

const v = (p: PlacedPart, base: number, plus: number): number => (p.plus ? plus : base);

const list: PartDef[] = [
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
      if (p.charge >= 3) {
        ctx.release();
        ctx.strike(v(p, 10, 14));
        p.charge = 0;
      }
    },
  },
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
    id: 'cam',
    name: 'Cam',
    family: 'cam',
    rarity: 'common',
    locked: false,
    text: 'Every 2nd time it fires: Strike 7.',
    textPlus: 'Every 2nd time it fires: Strike 10.',
    threshold: 2,
    thresholdPlus: 2,
    onFire: (ctx, p) => {
      p.counter += 1;
      if (p.counter % 2 === 0) ctx.strike(v(p, 7, 10));
    },
  },
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
      // firedThisTurn is already incremented for this firing when onFire runs.
      if (p.firedThisTurn === 1) ctx.addTick();
    },
  },
];

export const PARTS: Record<string, PartDef> = Object.fromEntries(list.map((d) => [d.id, d]));

export function partDef(id: string): PartDef {
  const d = PARTS[id];
  if (!d) throw new Error(`Unknown part: ${id}`);
  return d;
}

export function partName(id: string, plus: boolean): string {
  return partDef(id).name + (plus ? '+' : '');
}

export function partText(id: string, plus: boolean): string {
  const d = partDef(id);
  return plus ? d.textPlus : d.text;
}
