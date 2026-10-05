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
  if (input.profile && !input.profile.planHistory) input.profile.planHistory = []; // B9a: any version
  if (input.profile) {
    // B9b: any version
    input.profile.achievements ??= {};
    input.profile.achievementProgress ??= {};
    const r = (input.profile.rewards ??= { journal: [], collars: [], landmarks: [], overwind: 0, chassis: [] });
    r.journal ??= [];
    r.collars ??= [];
    r.landmarks ??= [];
    r.overwind ??= 0;
    r.chassis ??= [];
  }
  if (input.run && input.run.legendary === undefined) input.run.legendary = null; // B9b: an old run holds no Legendary
  if (input.profile) {
    // B10a: any version
    const p = input.profile;
    p.residents ??= [];
    p.landmarks ??= [];
    p.journal ??= [];
    p.bestiary ??= [];
    p.collars ??= [];
    p.collar ??= null;
    // B10b: any version
    p.modesUnlocked ??= ['apprentice', 'journeyman'];
    p.lastMode ??= 'journeyman';
    p.lastOverwind ??= 0;
  }
  if (input.run) {
    const r = input.run;
    r.oilFlasks ??= 0;
    r.resident ??= null;
    r.met ??= [];
    r.lore ??= [];
  }
  if ((input.version ?? 1) >= SAVE_VERSION) return { slot: fillB9b(input), notice: null };
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
  fillB9b(slot);
  slot.version = SAVE_VERSION;
  profile.version = SAVE_VERSION;
  return { slot, notice };
}

/** B9b fields added after version 2 shipped: achievements, progress and rewards on the profile, `legendary` on a run in progress.
 * Fills what is missing and leaves everything else alone (a slot that already has them is returned as it is). */
function fillB9b(slot: SaveSlot): SaveSlot {
  const p = slot.profile;
  if (!p.achievements || !p.achievementProgress || !p.rewards || (slot.run && slot.run.legendary === undefined)) {
    slot = { ...slot, profile: { ...p } };
    const q = slot.profile;
    q.achievements ??= {};
    q.achievementProgress ??= {};
    q.rewards ??= { journal: [], collars: [], landmarks: [], overwind: 0, chassis: [] };
    if (slot.run && slot.run.legendary === undefined) slot.run = { ...slot.run, legendary: null };
  }
  return slot;
}
