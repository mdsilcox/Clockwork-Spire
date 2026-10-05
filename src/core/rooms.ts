// The climb's rooms: workbench (upgrade, remove, fuse), traders (barter), oil stations, vaults; Scrap
// (docs/rules.md 4.4, 4.5; prices in docs/content.md section 10). B8 CONTRACT: signatures fixed; the
// economy-rooms lane implements the bodies. Every action is allowed once per visit where rules 4.4 says so.
import type { RunState, TradeItem } from './types';

export const UPGRADE_SCRAP: Record<string, number> = { common: 15, uncommon: 25, rare: 40, masterwork: 60, legendary: 80 };
export const REMOVE_SCRAP_BASE = 25;
export const REMOVE_SCRAP_STEP = 15;
export const PART_VALUE: Record<string, number> = { common: 20, uncommon: 35, rare: 60, masterwork: 100, legendary: 160 };
export const BUY_MARKUP = 1.25; // buying with Scrap alone costs value + 25%
export const OIL_SCRAP = 15;
export const OIL_HEAL = 15;

// Workbench
export function workbenchUpgrade(run: RunState, uid: number): boolean {
  void run;
  void uid;
  throw new Error('B8: workbenchUpgrade not implemented');
}
export function workbenchRemove(run: RunState, uid: number): boolean {
  void run;
  void uid;
  throw new Error('B8: workbenchRemove not implemented');
}
/** Two parts of the same family and rarity: the two candidate results (next rarity, same family; rolled from `reward`),
 * or null with the reason when fusing isn't possible. */
export function fuseCandidates(run: RunState, a: number, b: number): { candidates: string[] } | { reason: string } {
  void run;
  void a;
  void b;
  throw new Error('B8: fuseCandidates not implemented');
}
export function fuse(run: RunState, a: number, b: number, pick: number): boolean {
  void run;
  void a;
  void b;
  void pick;
  throw new Error('B8: fuse not implemented');
}

// Traders
export function traderStock(run: RunState): TradeItem[] {
  void run;
  throw new Error('B8: traderStock not implemented');
}
/** Buy stock item `index`, handing over part `offerUid` (worth its value) plus Scrap for the difference, or Scrap alone
 * (value + 25%) when offerUid is null. */
export function barter(run: RunState, index: number, offerUid: number | null): boolean {
  void run;
  void index;
  void offerUid;
  throw new Error('B8: barter not implemented');
}

// Oil stations
/** Rest: heal 30% of max HP (rounded down), 1 extra hour (elites step). Once per station. */
export function rest(run: RunState): boolean {
  void run;
  throw new Error('B8: rest not implemented');
}
/** Polish: +4 max HP, no extra hour. Once per station (rest or polish). */
export function polish(run: RunState): boolean {
  void run;
  throw new Error('B8: polish not implemented');
}
