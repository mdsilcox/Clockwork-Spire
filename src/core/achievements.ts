// B9b.0 CONTRACT: achievement rules (docs/content.md section 7). The progression lane builds `checkAchievements`.
// `finishRun` (meta.ts) calls it only when ACHIEVEMENTS is non-empty, so the stub never runs before then.
import type { Profile, RunRecord, RunState } from './types';

/** Check every available achievement not yet earned against the finished run (and the profile's progress counters). Mutates
 * `profile.achievements`, `achievementProgress`, `rewards` and the pool unlocks in the one finishRun write; returns the newly
 * earned achievement ids. */
export function checkAchievements(_profile: Profile, _run: RunState, _record: RunRecord): string[] {
  throw new Error('B9b: progression');
}
