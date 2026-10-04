// Salvage (docs/rules.md 2.5). B7 CONTRACT: signatures fixed; the enemy-engine lane implements the bodies and
// wires them into run.ts (the 'salvage' Pending replaces the part reward after fights; Cogs stand in for Scrap until B8).
import type { CombatState, RunState, SalvageItem } from './types';

export const SCRAP_PER_SCRAPPED = 3; // a salvage item you don't keep
export const SCRAP_PER_LOCKED = 6; // a salvage whose part isn't unlocked yet
export const SCRAP_PER_WRECKED = 1; // a part left standing when its core died

/** The salvage items of a won combat, with `locked` set from the run's pool. */
export function salvageItems(c: CombatState, isUnlocked: (partId: string) => boolean): SalvageItem[] {
  void c;
  void isUnlocked;
  throw new Error('B7: salvageItems not implemented');
}

/** Keep the items at `keep` (indices into items, locked ones can't be kept); everything else pays Scrap. */
export function salvagePayout(items: SalvageItem[], keep: number[], wrecked: number): { kept: string[]; scrap: number } {
  void items;
  void keep;
  void wrecked;
  throw new Error('B7: salvagePayout not implemented');
}

/** Run action: settle the pending salvage tray (kept parts join the bin, Scrap is paid as Cogs in B7). */
export function takeSalvage(run: RunState, keep: number[]): boolean {
  void run;
  void keep;
  throw new Error('B7: takeSalvage not implemented');
}
