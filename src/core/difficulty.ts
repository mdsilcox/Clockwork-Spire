// B10b application points (docs/briefs/B10b-curve.md "Round 2"). B10b.0 CONTRACT: every body is a pass-through, so Journeyman at
// Overwind 0 plays exactly as before. modes-overwind (B10b.1) fills them from `run.config.mode` / `overwind` (RunConfig) and
// `CombatState.mode` / `overwind`. Each is called from the place its rule lives, marked `// B10b hook (modes-overwind)`.
//
// Order of operations the lane implements (content.md 9, rules 5.7):
//   enemy HP: mode HP % times (Overwind 3: 1.2 on parts), multiplied, rounded half up once, every part and core (also summons);
//   a hit the player takes: base amount times mode damage %, rounded half up; then Strength; then Overwind 8's +2; then the
//     player's reductions (Dazed and the like); then Plating. The mode % never touches Shell, Mend, Bulwark, Governor or Drain;
//   hours per act: the mode's hours, minus 1 (Overwind 2), plus 1 in act 3 with the beacon, never below 6;
//   oil: base times mode oil % times 0.5 at Overwind 6, round half up (stations, trader oil and Oil Flasks alike);
//   Brass: mode % times (1 + 0.1 times the Overwind level), once, at finishRun.
import type { CombatState, EnemyState, RunState } from './types';

/** Combat start and every summon: scale the enemy's HP (parts and core). */
export function scaleEnemy(_c: CombatState, _e: EnemyState): void {
  // pass-through
}

/** The amount of one enemy attack the player takes before reductions: base plus Strength today. */
export function enemyAmount(_c: CombatState, base: number, strength: number): number {
  return base + strength;
}

/** Hours in this act (startAct). */
export function hoursFor(_run: RunState, base: number): number {
  return base;
}

/** An oil heal (stations, trader oil, Oil Flasks). */
export function oilHealFor(_run: RunState, base: number): number {
  return base;
}

/** A trader price (Overwind 1: +15%). */
export function traderPrice(_run: RunState, price: number): number {
  return price;
}

/** How many salvaged parts may be kept from one tray (Overwind 7: 1; the Scrapper's and the Tow Hook's extra offers don't count). */
export function salvageKeepLimit(_run: RunState): number {
  return Infinity;
}

/** How many steps every elite takes when an hour passes (Overwind 5: 2 on every third hour spent). */
export function eliteSteps(_run: RunState): number {
  return 1;
}

/** A part was placed on `cell` (Overwind 4: the first one placed each combat is Rusted until the next turn). */
export function afterPlacement(_c: CombatState, _cell: number): void {
  // pass-through
}

/** Combat start: wardens gain the extra part chosen by the player's plan (Overwind 9: the Foreman and the Queen). */
export function wardenExtraPart(_c: CombatState): void {
  // pass-through
}

/** Brass at the end of a run (finishRun): the mode % times the Overwind bonus. */
export function scaleBrass(_run: RunState, brass: number): number {
  return brass;
}
