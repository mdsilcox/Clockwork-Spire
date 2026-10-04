// A career: one fresh profile plays run after run with the bot, spending Brass on a fixed upgrade path
// (docs/rules.md section 7), until the first win or the run cap.
import { CHASSIS } from '../core/content/chassis';
import { UPGRADES } from '../core/content/upgrades';
import { buyUpgrade, chassisAvailable, finishRun, newProfile, runConfigFor, upgradeCost } from '../core/meta';
import type { Profile } from '../core/types';
import { playRunState } from './run';
import type { RunResult } from './run';

/** The sensible path: each entry buys the next level of that upgrade. Rules 7 order, then the remaining levels. */
export const SENSIBLE_PATH: string[] = [
  'frame',
  'cogs',
  'bearings',
  'toolbelt',
  'notes',
  'secondwind',
  'charm',
  // remaining levels
  'frame',
  'cogs',
  'bearings',
  'notes',
  'frame',
  'cogs',
  'bearings',
  'frame',
  'frame',
];

export interface CareerOpts {
  seed: number;
  maxRuns: number;
  path?: string[];
  /** Keep playing after the first win (more offers for the impact table). Default false. */
  continueAfterWin?: boolean;
}

export interface CareerRun {
  n: number;
  result: RunResult;
  /** Brass spent on upgrades before this run started. */
  brassSpent: number;
  chassis: string;
}

export interface CareerResult {
  /** 1-based run number of the first win, or null if none within the cap. */
  firstWin: number | null;
  runs: CareerRun[];
  profile: Profile;
}

function spent(p: Profile): number {
  return p.brassEarnedTotal - p.brass;
}

export function playCareer(o: CareerOpts): CareerResult {
  const profile = newProfile('sim', '1970-01-01T00:00:00Z');
  const path = o.path ?? SENSIBLE_PATH;
  let cursor = 0;
  const runs: CareerRun[] = [];
  let firstWin: number | null = null;
  for (let i = 0; i < o.maxRuns; i++) {
    const avail = chassisAvailable(profile).filter((id) => CHASSIS[id]);
    const chassis = avail[i % avail.length];
    const seed = o.seed * 1000003 + i * 7 + 1;
    const cfg = runConfigFor(profile, seed, chassis);
    const { result, run } = playRunState(cfg, o.seed * 977 + i);
    runs.push({ n: i + 1, result, brassSpent: spent(profile), chassis });
    finishRun(profile, run, '1970-01-01T00:00:00Z');
    if (result.won && firstWin === null) {
      firstWin = i + 1;
      if (!o.continueAfterWin) break;
    }
    // Buy along the path while the next item is affordable.
    while (cursor < path.length) {
      const id = path[cursor];
      if (!UPGRADES[id] || upgradeCost(profile, id) === null) {
        cursor += 1;
        continue;
      }
      if (!buyUpgrade(profile, id)) break;
      cursor += 1;
    }
  }
  return { firstWin, runs, profile };
}
