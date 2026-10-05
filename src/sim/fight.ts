// Plays one whole combat with the bot and the real rules.
import { createCombat, runTurn, placePart, swapParts } from '../core/combat';
import type { PartInstance } from '../core/types';
import { applyAim, chooseTurn } from './bot';

export const TURN_CAP = 30;

export interface FightOpts {
  seed: number;
  bin: PartInstance[];
  enemies: string[];
  hp: number;
}

export interface FightResult {
  won: boolean;
  turns: number;
  hpLeft: number;
  biggestTurn: number;
  /** Times each part id was powered. */
  partsFired: Record<string, number>;
  /** Damage plus Plating each part id produced (from the turn contributions). */
  output: Record<string, number>;
}

export function playFight(o: FightOpts): FightResult {
  const c = createCombat({ seed: o.seed, bin: o.bin, enemies: o.enemies, hp: o.hp, maxHp: o.hp });
  const partsFired: Record<string, number> = {};
  const output: Record<string, number> = {};
  let biggest = 0;
  let turns = 0;
  while (c.outcome === 'ongoing' && turns < TURN_CAP) {
    const t = chooseTurn(c);
    for (const p of t.placements) placePart(c, p.hand, p.cell);
    if (t.swap) swapParts(c, t.swap[0], t.swap[1]);
    applyAim(c, t);
    const res = runTurn(c);
    turns += 1;
    for (const e of res.events) {
      if (e.kind === 'power' && e.uid !== undefined) {
        const id = c.parts[e.uid]?.defId;
        if (id) partsFired[id] = (partsFired[id] ?? 0) + 1;
      }
    }
    for (const uid in c.lastTurnContrib) {
      const id = c.parts[Number(uid)]?.defId;
      if (id) output[id] = (output[id] ?? 0) + c.lastTurnContrib[uid].value;
    }
    const dealt = res.preview.damageByEnemy.reduce((a, b) => a + b, 0);
    if (dealt > biggest) biggest = dealt;
  }
  return { won: c.outcome === 'won', turns, hpLeft: Math.max(0, c.playerHp), biggestTurn: biggest, partsFired, output };
}
