// Save version 2 (docs/rules.md 6). B8 CONTRACT: signature fixed; the climb-core lane implements it and the app's
// save loader (src/app/save.ts) calls it. Pure.
import type { SaveSlot } from './types';

export const SAVE_VERSION = 2;

export interface MigrationResult {
  slot: SaveSlot;
  /** Shown once: "The Spire has changed while you were away." when a v1 run in progress was closed. */
  notice: string | null;
}

/** Migrate a stored slot of any earlier version to version 2: profile kept (Brass, upgrades with Spare Cogs renamed Spare
 * Scrap, blueprints, chassis, history and stats), Cogs dropped, a v1 run in progress closed as a loss at its floor and
 * credited its Brass (in the same write). A version 2 slot is returned unchanged. */
export function migrateSlot(stored: unknown): MigrationResult {
  void stored;
  throw new Error('B8: migrateSlot not implemented');
}
