// B9b item hook points (docs/briefs/B9b-rarity.md). B9b.0 CONTRACT: every body here is a pass-through, so the game plays
// exactly as before. The items-engine lane fills them for its 17 items (Night Watchman, Sprocket's Blanket, the Whistle,
// Bottled Dusk and so on); turn-tools fills the Watch's snapshot in combat.ts. Called from combat.ts at the marked spots
// (`// B9b hook (items-engine)`). The machine-side hooks (routeStrike, spreadStatus, overpressureCheck, isLastTick) live in
// machine.ts next to the code they wrap.
import type { CombatState, GameEvent } from './types';

/** Start of the player's turn, after Torsion Springs and magnetized parts and before the draw (Sprocket's Whistle fetches here). */
export function onTurnStart(_c: CombatState, _events: GameEvent[]): void {
  // pass-through
}

/** After the player's machine ran and before the enemies act (Night Watchman fires here, at the first part that will act). */
export function beforeEnemyTurn(_c: CombatState, _events: GameEvent[]): void {
  // pass-through
}

/** Plating is about to fall away at the start of the player's turn. Returns the Plating that stays (Sprocket's Blanket); 0 = all falls. */
export function onPlatingFall(_c: CombatState, _amount: number): number {
  return 0;
}

/** May this part be placed on this cell? (Twin Mainspring: D2 only.) Pass-through: always. */
export function canPlaceAt(_c: CombatState, _defId: string, _cell: number): boolean {
  return true;
}
