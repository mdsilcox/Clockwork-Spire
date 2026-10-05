// Save version 2 (docs/rules.md 6). The app's save loader (src/app/save.ts) calls it. Pure.
import { finishRun } from './meta';
import type { RunState, SaveSlot } from './types';

export const SAVE_VERSION = 2;
export const MIGRATION_NOTICE = 'The Spire has changed while you were away.';

export interface MigrationResult {
  slot: SaveSlot;
  /** Shown once: "The Spire has changed while you were away." when a v1 run in progress was closed. */
  notice: string | null;
}

/** Migrate a stored slot of any earlier version to version 2: profile kept (Brass, upgrades with Spare Cogs renamed Spare
 * Scrap, blueprints, chassis, history and stats), Cogs dropped, a v1 run in progress closed as a loss at its floor and
 * credited its Brass (in the same write). A version 2 slot is returned unchanged. */
export function migrateSlot(stored: unknown): MigrationResult {
  const input = stored as SaveSlot;
  if ((input.version ?? 1) >= SAVE_VERSION) return { slot: input, notice: null };
  const slot = structuredClone(input);
  const profile = slot.profile;
  // Spare Cogs became Spare Scrap: same level, same Brass spent
  if (profile.upgrades.cogs !== undefined) {
    profile.upgrades.scrap = (profile.upgrades.scrap ?? 0) + profile.upgrades.cogs;
    delete profile.upgrades.cogs;
  }
  let notice: string | null = null;
  const run = slot.run as RunState | null;
  if (run) {
    // closed as a loss at its floor (the history record and the Brass land in this same write)
    if (run.phase !== 'defeat' && run.phase !== 'victory') run.phase = 'defeat';
    finishRun(profile, run, slot.updatedAt);
    notice = MIGRATION_NOTICE;
  }
  slot.run = null;
  slot.version = SAVE_VERSION;
  profile.version = SAVE_VERSION;
  return { slot, notice };
}
