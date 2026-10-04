// Meta-progression: profiles, the upgrade bench, chassis unlocks, run settlement, Sprocket's mood.
// B4 CONTRACT: signatures fixed; the meta-balance lane implements them. Pure: no DOM, no clock (times are passed in).
import type { Profile, RunConfig, RunRecord, RunState, SprocketMood } from './types';

export const PROFILE_VERSION = 1;

/** A fresh profile: no Brass, Tinker unlocked. */
export function newProfile(_name: string, _createdAt: string): Profile {
  throw new Error('B4: not implemented');
}

/** Brass cost of the next level of an upgrade, or null when maxed. */
export function upgradeCost(_profile: Profile, _upgradeId: string): number | null {
  throw new Error('B4: not implemented');
}

/** Buy the next level if affordable; returns whether it was bought. */
export function buyUpgrade(_profile: Profile, _upgradeId: string): boolean {
  throw new Error('B4: not implemented');
}

/** The RunConfig a new run starts from, given the profile's upgrades and blueprints. */
export function runConfigFor(_profile: Profile, _seed: number, _chassis: string): RunConfig {
  throw new Error('B4: not implemented');
}

/**
 * Settle a finished run (victory, defeat or abandoned) into the profile in one mutation: Brass, blueprints,
 * the RunRecord (n and endedAt filled here), counters, best floor, chassis unlocks, story flags, mood.
 * Calling it twice for the same run changes nothing the second time.
 */
export function finishRun(
  _profile: Profile,
  _run: RunState,
  _endedAt: string,
): { record: RunRecord; mood: SprocketMood; brass: number; newUnlocks: string[]; newNotes: string[] } {
  throw new Error('B4: not implemented');
}

/** Chassis the player may pick now. */
export function chassisAvailable(_profile: Profile): string[] {
  throw new Error('B4: not implemented');
}

/** The Brass alternative to unlocking a chassis (Stoker 150, Horologist 300). */
export function buyChassis(_profile: Profile, _chassisId: string): boolean {
  throw new Error('B4: not implemented');
}

/** Brass price to unlock a chassis now, or null if unlocked or not for sale. */
export function chassisPrice(_profile: Profile, _chassisId: string): number | null {
  throw new Error('B4: not implemented');
}

/** Sprocket's greeting mood for a finished run (rules 5.5). */
export function sprocketMood(_record: RunRecord, _bestFloorBefore: number): SprocketMood {
  throw new Error('B4: not implemented');
}

/** The Workshop notes unlocked so far, oldest first. */
export function workshopNotes(_profile: Profile): { id: string; title: string; text: string }[] {
  throw new Error('B4: not implemented');
}
