// Salvage (docs/rules.md 2.5). B7: the 'salvage' Pending replaces the part reward after fights and elites;
// Cogs stand in for Scrap until B8.
import { PARTS } from './content/parts';
import { newPart } from './rewards';
import type { CombatState, RunState, SalvageItem } from './types';

export const SCRAP_PER_SCRAPPED = 3; // a salvage item you don't keep
export const SCRAP_PER_LOCKED = 6; // a salvage whose part isn't unlocked yet
export const SCRAP_PER_WRECKED = 1; // a part left standing when its core died

/** Is this part in the run's pool (not locked, or unlocked by a blueprint)? The Spire key is always usable. */
export function isPartUnlocked(run: RunState, partId: string): boolean {
  if (partId === 'spire-key') return true;
  const def = PARTS[partId];
  if (!def) return false;
  return !def.locked || run.config.unlockedParts.includes(partId) || run.stats.blueprintsFound.includes(partId);
}

/** The salvage items of a won combat, with `locked` set from the run's pool. */
export function salvageItems(c: CombatState, isUnlocked: (partId: string) => boolean): SalvageItem[] {
  return c.broken.map((b) => ({ ...b, locked: !isUnlocked(b.salvage) }));
}

/** Keep the items at `keep` (indices into items, locked ones can't be kept); everything else pays Scrap. */
export function salvagePayout(items: SalvageItem[], keep: number[], wrecked: number): { kept: string[]; scrap: number } {
  const keepSet = new Set(keep);
  const kept: string[] = [];
  let scrap = Math.max(0, wrecked) * SCRAP_PER_WRECKED;
  items.forEach((it, i) => {
    if (it.locked) scrap += SCRAP_PER_LOCKED;
    else if (keepSet.has(i)) kept.push(it.salvage);
    else scrap += SCRAP_PER_SCRAPPED;
  });
  return { kept, scrap };
}

/** Run action: settle the pending salvage tray (kept parts join the bin, Scrap is paid as Cogs in B7). */
export function takeSalvage(run: RunState, keep: number[]): boolean {
  const p = run.pending;
  if (run.phase !== 'reward' || !p || p.kind !== 'salvage' || p.done) return false;
  if (keep.some((k) => !Number.isInteger(k) || k < 0 || k >= p.items.length)) return false;
  const { kept, scrap } = salvagePayout(p.items, keep, p.wrecked ?? 0);
  for (const id of kept) {
    if (id === 'spire-key') run.flags.spireKey = true;
    else newPart(run, id);
  }
  run.cogs += scrap;
  p.done = true;
  return true;
}
