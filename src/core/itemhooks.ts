// B9b item hook points (docs/briefs/B9b-rarity.md). Called from combat.ts at the marked spots (`// B9b hook (items-engine)`).
// The machine-side hooks (routeStrike, spreadStatus, overpressureCheck, isLastTick) live in machine.ts next to the code they
// wrap. Items filled here: Night Watchman, Sprocket's Blanket, Sprocket's Whistle, the Twin Mainspring's placement rule.
import { cell } from './board';
import { damageEnemy, damageTarget } from './enemy';
import type { EventBase } from './enemy';
import { frameOf } from './framelib';
import { isStanding, parseRef, refOf } from './frames';
import { hasTrinket, tagItem } from './machine';
import type { CombatState, GameEvent, PlacedPart } from './types';

const BASE = { tick: 0, step: 0 };

/** One plain hit outside the machine (frame enemies through the damage pipeline, legacy enemies as v1). */
function hit(c: CombatState, events: GameEvent[], idx: number, partId: string, raw: number, word: string, base: EventBase = BASE): void {
  const e = c.enemies[idx];
  if (frameOf(e)) damageTarget(c, idx, partId, raw, events, base, { word });
  else damageEnemy(c, idx, (e.statuses.cracked ?? 0) > 0 ? Math.floor(raw * 1.5) : raw, events, base);
}

/** Start of the player's turn, after Torsion Springs and magnetized parts and before the draw (Sprocket's Whistle fetches here). */
export function onTurnStart(c: CombatState, events: GameEvent[]): void {
  if (!hasTrinket(c, 'sprockets-whistle')) return;
  const idx = c.enemies.findIndex((e) => e.hp > 0);
  if (idx < 0) return;
  const e = c.enemies[idx];
  let weakest = 'core';
  let least = Infinity;
  for (const p of e.parts) {
    if (!p.broken && p.hp < least) {
      least = p.hp;
      weakest = p.id;
    }
  }
  const from = events.length;
  hit(c, events, idx, weakest, 5, 'pry');
  for (let i = from; i < events.length; i++) if (events[i].kind === 'partBroken') events[i].by = 'sprocket';
}

/** After the player's machine ran and before the enemies act (Night Watchman fires here, at the first part that will act). */
export function beforeEnemyTurn(c: CombatState, events: GameEvent[]): void {
  const watch = c.board.findIndex((p) => p && p.defId === 'night-watchman' && p.firedThisTurn > 0);
  if (watch < 0) return;
  const p = c.board[watch] as PlacedPart;
  for (let i = 0; i < c.enemies.length; i++) {
    const e = c.enemies[i];
    if (e.hp <= 0) continue;
    for (const it of e.intents) {
      const ref = refOf(i, it.partId);
      if (!isStanding(c, ref)) continue;
      const t = parseRef(ref);
      const grit = c.playerStatuses.grit ?? 0;
      const from = events.length;
      hit(c, events, t.enemy, t.part, (p.plus ? 10 : 7) + grit, 'strike', { tick: 0, step: 0, cell: watch });
      tagItem(events, from, 'night-watchman');
      return;
    }
  }
}

/** Plating is about to fall away at the start of the player's turn. Returns the Plating that stays (Sprocket's Blanket); 0 = all falls. */
export function onPlatingFall(c: CombatState, amount: number): number {
  const blanket = c.board.reduce<PlacedPart | null>((best, x) => (x && x.defId === 'sprockets-blanket' && (!best || x.plus) ? x : best), null);
  if (!blanket || amount <= 0) return 0;
  const keep = blanket.plus ? Math.min(18, Math.floor((amount * 2) / 3)) : Math.min(12, Math.floor(amount / 2));
  return Math.min(amount, keep);
}

/** May this part be placed on this cell? (Twin Mainspring: D2 only.) */
export function canPlaceAt(_c: CombatState, defId: string, at: number): boolean {
  return defId !== 'twin-mainspring' || at === cell('D2');
}
