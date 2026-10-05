// Salvage (docs/rules.md 2.5). B7: the 'salvage' Pending replaces the part reward after fights and elites;
// Scrap in the climb (run.scrap); v1 runs without it still pay Cogs.
import { PARTS } from './content/parts';
import { salvageKeepLimit, scrapPerScrapped } from './difficulty';
import { partOpen } from './pool';
import { addScrap, newPart, recordOffers, markOfferTaken } from './rewards';
import type { CombatState, RunState, SalvageItem } from './types';

export const SCRAP_PER_SCRAPPED = 3; // a salvage item you don't keep
export const SCRAP_PER_LOCKED = 6; // a salvage whose part isn't unlocked yet
export const SCRAP_PER_WRECKED = 1; // a part left standing when its core died

/** Is this part in the run's pool (not locked, or unlocked by a blueprint)? The Spire key is always usable. */
export function isPartUnlocked(run: RunState, partId: string): boolean {
  if (partId === 'spire-key') return true;
  const def = PARTS[partId];
  if (!def) return false;
  return partOpen(run, partId);
}

/** The salvage items of a won combat, with `locked` set from the run's pool. */
export function salvageItems(c: CombatState, isUnlocked: (partId: string) => boolean): SalvageItem[] {
  // the Scrapper's wrecked-part offer is never locked: his bench keeps what he tears out
  return c.broken.map((b) => ({ ...b, locked: !b.scrapper && !isUnlocked(b.salvage) }));
}

/** Keep the items at `keep` (indices into items, locked ones can't be kept); everything else pays Scrap. */
export function salvagePayout(items: SalvageItem[], keep: number[], wrecked: number, scrapEach = SCRAP_PER_SCRAPPED): { kept: string[]; scrap: number } {
  const keepSet = new Set(keep);
  const kept: string[] = [];
  let scrap = Math.max(0, wrecked) * SCRAP_PER_WRECKED;
  items.forEach((it, i) => {
    if (it.locked) scrap += SCRAP_PER_LOCKED;
    else if (keepSet.has(i)) kept.push(it.salvage);
    else scrap += scrapEach;
  });
  return { kept, scrap };
}

/** Run action: settle the pending salvage tray (kept parts join the bin, Scrap is paid). */
export function takeSalvage(run: RunState, keep: number[]): boolean {
  const p = run.pending;
  if (run.phase !== 'reward' || !p || p.kind !== 'salvage' || p.done) return false;
  if (keep.some((k) => !Number.isInteger(k) || k < 0 || k >= p.items.length)) return false;
  if (keep.filter((k) => !p.items[k].scrapper).length > salvageKeepLimit(run)) return false; // B10b hook (modes-overwind): Overwind 7 (the Scrapper's and the Tow Hook's offers don't count)
  const { kept, scrap } = salvagePayout(p.items, keep, p.wrecked ?? 0, scrapPerScrapped(run, SCRAP_PER_SCRAPPED));
  const keepSet = new Set(keep);
  p.items.forEach((it, i) => {
    if (it.locked || !keepSet.has(i)) return;
    if (it.salvage === 'spire-key') run.flags.spireKey = true;
    else newPart(run, it.salvage, !!it.plus); // the Scrapper's first salvage arrives upgraded
  });
  addScrap(run, scrap);
  // the impact metric: every unlocked salvage item was an offer; the ones kept were taken
  const offered = p.items.filter((it) => !it.locked && it.salvage !== 'spire-key');
  recordOffers(run, offered.map((it) => it.salvage), 'salvage');
  for (const id of kept) if (id !== 'spire-key') markOfferTaken(run, id, 'salvage');
  p.done = true;
  return true;
}
