// Achievement rules (docs/content.md section 7; docs/briefs/B9b-rarity.md). `finishRun` (meta.ts) calls `checkAchievements` once,
// in its fixed sequence, so a feat met mid-run unlocks at the run's end. Item unlocks are derived from `profile.achievements`
// (pool.ts `achievementUnlocks`, `runConfigFor`); rewards with no system yet are recorded in `profile.rewards`.
import { ACHIEVEMENTS } from './content/achievements';
import { COLLARS } from './content/collars';
import { journalIdFor } from './content/story';
import { PARTS } from './content/parts';
import type { AchievementDef } from './defs';
import type { Profile, RunRecord, RunState } from './types';

const CHASSIS_WINS = ['tinker', 'stoker', 'horologist'];
/** The landmark each achievement reward names (display name to landmark id). */
const LANDMARK_FOR: Record<string, string> = { 'Opened vault': 'vault-1', 'Repaired lift': 'lift', 'Lit beacon': 'beacon' };

/** Check every available achievement not yet earned against the finished run (and the profile's progress counters). Mutates
 * `profile.achievements`, `achievementProgress` and `rewards` in the one finishRun write; returns the newly earned ids. The 11
 * achievements that open with Bellfoot (B10) are never earned here. */
export function checkAchievements(profile: Profile, run: RunState, record: RunRecord): string[] {
  const s = run.stats;
  const prog = (profile.achievementProgress ??= {});
  const won = record.result === 'win';

  // counters across runs
  prog.partsBroken = (prog.partsBroken ?? 0) + (s.partsBroken ?? 0);
  prog.wreckWins = (prog.wreckWins ?? 0) + (s.wreckWins ?? 0);
  prog.bells3 = (prog.bells3 ?? 0) + (s.bells ?? []).filter((b) => b.hoursLeft >= 3).length;
  if (won) prog[`win:${run.config.chassis}`] = 1;

  const wardens = s.wardenFights ?? [];
  const everyAct = (v: [number, number, number] | undefined): boolean => !!v && v.every((n) => n >= 1);
  const bellAct = (act: number): boolean => (s.bells ?? []).some((b) => b.act === act && b.hoursLeft >= 3);
  const steam = run.bin.filter((p) => PARTS[p.defId]?.family === 'steam').length;
  const plating = s.plan?.plating ?? 0;
  const mode = record.mode ?? run.config.mode ?? 'journeyman';
  const level = record.overwind ?? run.config.overwind ?? 0;

  const met: Record<string, boolean> = {
    'e-first-win': won,
    'e-pet': (prog.pets ?? 0) >= 50,
    'e-bell': (s.bells ?? []).some((b) => b.hoursLeft >= 4),
    'm-act2-breaker': run.act >= 2 && (s.partsBrokenAct1 ?? 0) >= 12,
    'm-bell3': prog.bells3 >= 3,
    'm-quick-foreman': wardens.some((w) => w.enemy === 'foreman' && w.won && w.turns <= 6),
    'm-break-all': wardens.some((w) => w.won && w.allBroken),
    'm-all-chassis': CHASSIS_WINS.every((c) => prog[`win:${c}`]),
    'm-calm-steam': won && steam >= 3 && !s.overpressured,
    'm-status': (s.scaldBest ?? 0) >= 60,
    'm-burst': s.biggestTurn >= 100,
    'm-bells': [1, 2, 3].every(bellAct),
    'm-vaults': everyAct(s.vaultsByAct),
    'm-no-plating': won && plating < 150,
    'm-salvager': prog.partsBroken >= 100,
    'm-fuse': (s.fuses ?? 0) >= 3,
    'm-drill': !!s.drillThrough,
    'm-shatter': !!s.shatterTriple,
    'm-wrecker': prog.wreckWins >= 25,
    'm-three-elites': everyAct(s.elitesByAct),
    'h-flawless': wardens.some((w) => w.won && w.hpLost === 0),
    // B10a: Bellfoot's five (finishRun adds the resident, the landmarks and the lore progress before this check)
    'e-resident': !!run.resident && profile.residents.includes(run.resident),
    'e-lore': ['hour-ghost', 'stopped-clock', 'empty-chair', 'unsent-letter'].every((m) => prog[`lore-${m}`]),
    'm-residents': profile.residents.length >= 5,
    'm-lift': profile.landmarks.includes('lift'),
    'm-beacon': profile.landmarks.includes('beacon'),
    // B10b: the six hard ones (the mode and level the run was played on)
    'h-master': won && mode === 'master',
    'h-clockwork': won && mode === 'clockwork',
    'h-ow5': won && level >= 5,
    'h-ow8': won && level >= 8,
    'h-ow10': won && level >= 10,
    'h-master-bare': won && mode === 'master' && plating < 150,
    'h-whole-clock': wardens.some((w) => w.enemy === 'clockmaker' && w.won && w.allBroken),
  };

  const got: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!a.available || profile.achievements[a.id] || !met[a.id]) continue;
    grant(profile, a, record.endedAt);
    got.push(a.id);
  }
  return got;
}

/** Record an earned achievement: its time and its rewards with no system yet (journal, collars, landmarks, chassis, Overwind).
 * Part and trinket rewards need no record: the pool reads them from `profile.achievements`. */
function grant(profile: Profile, a: AchievementDef, at: string): void {
  profile.achievements[a.id] = at;
  const rw = (profile.rewards ??= { journal: [], collars: [], landmarks: [], overwind: 0, chassis: [] });
  const add = (list: string[], v: string | undefined): void => {
    if (v && !list.includes(v)) list.push(v);
  };
  add(rw.journal, a.reward.journal);
  add(rw.collars, a.reward.collar);
  add(rw.landmarks, a.reward.landmark);
  add(rw.chassis, a.reward.chassis);
  // B10a: the rewards kept since B9b now apply: journal pages, collars, landmarks and the Scrapper go where Bellfoot reads them
  if (a.reward.journal) add((profile.journal ??= []), journalIdFor(a.reward.journal));
  const collar = COLLARS.find((c) => c.name === a.reward.collar);
  if (collar) add((profile.collars ??= []), collar.id);
  if (a.reward.landmark && LANDMARK_FOR[a.reward.landmark]) add((profile.landmarks ??= []), LANDMARK_FOR[a.reward.landmark]);
  if (a.reward.chassis) add(profile.chassisUnlocked, a.reward.chassis);
  rw.overwind = Math.max(rw.overwind, a.reward.overwind ?? 0);
}

/** Earn one achievement now (the owner's and the tests' `cheat.unlock`): the same writes finishRun's check makes. False when it
 * is unknown, not available yet, or already earned. */
export function earnAchievement(profile: Profile, id: string, at: string): boolean {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a || !a.available || profile.achievements[id]) return false;
  grant(profile, a, at);
  return true;
}
