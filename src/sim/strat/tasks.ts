// The units of work of the strategy report. Each task is independent and deterministic, so the CLI can run them
// on any number of worker threads and still produce the same numbers. Library code: reads no clock for decisions
// (it times itself with performance.now() only to report runtime).
import { createCombat } from '../../core/combat';
import { defaultRunConfig } from '../../core/run';
import type { RunConfig } from '../../core/types';
import { chooseTurn } from '../bot';
import { burst, expert, turtle } from './combat';
import type { Policy } from './combat';
import { stratStats } from './common';
import { playStratCareer, playStratRun, v1Run } from './drive';
import type { FightSnapshot, RunPolicy } from './drive';
import { playCombatWith } from './fight';
import type { FightStats } from './fight';
import { expertRun } from './runbot';

export type BotName = 'greedy' | 'turtle' | 'burst' | 'expert';
export type RunMode = 'v1' | 'greedy' | 'turtle' | 'burst' | 'expert';

export const COMBAT: Record<BotName, Policy> = { greedy: chooseTurn, turtle, burst, expert };

/** A run mode is a combat policy plus a run policy: v1 is the shipped bot, the rest draft like the expert. */
export function modeOf(mode: RunMode): { combat: Policy; rp: RunPolicy } {
  if (mode === 'v1') return { combat: chooseTurn, rp: v1Run };
  return { combat: COMBAT[mode], rp: expertRun };
}

export type Task =
  | { kind: 'career'; seed: number; mode: RunMode; maxRuns: number; keepSnaps: boolean }
  | { kind: 'run'; seed: number; index: number; mode: RunMode; keepSnaps: boolean }
  | { kind: 'fights'; bot: BotName; bucket: string; snaps: FightSnapshot[]; reps: number };

export interface RunDigest {
  won: boolean;
  act: number;
  parts: string[];
  trinkets: string[];
}

export interface TaskResult {
  cpuMs: number;
  /** career */
  firstWin?: number | null;
  runs?: number;
  /** career and run: finished runs (parts and trinkets at the end). */
  digests?: RunDigest[];
  snaps?: FightSnapshot[];
  /** fights */
  stats?: FightStats[];
  turns?: number;
  previews?: number;
}

/** Keep every elite and boss snapshot and one in four others (bounds the message size). */
function keeper(keepAll: boolean): { keep: (s: FightSnapshot) => boolean } {
  let n = 0;
  return { keep: (s) => keepAll && (s.tier !== 'fight' || n++ % 4 === 0) };
}

export function runTask(t: Task): TaskResult {
  const t0 = performance.now();
  const out: TaskResult = { cpuMs: 0 };
  if (t.kind === 'career') {
    const { combat, rp } = modeOf(t.mode);
    const snaps: FightSnapshot[] = [];
    const digests: RunDigest[] = [];
    const k = keeper(t.keepSnaps);
    const r = playStratCareer({
      seed: t.seed,
      maxRuns: t.maxRuns,
      combat,
      runPolicy: rp,
      hooks: { onFight: (rec) => k.keep(rec.snap) && snaps.push(rec.snap) },
      onRun: (res) => digests.push({ won: res.won, act: res.act, parts: res.record.partsAtEnd, trinkets: res.record.trinkets }),
    });
    out.firstWin = r.firstWin;
    out.runs = r.runs;
    out.digests = digests;
    out.snaps = snaps;
  } else if (t.kind === 'run') {
    const { combat, rp } = modeOf(t.mode);
    const snaps: FightSnapshot[] = [];
    const k = keeper(t.keepSnaps);
    const cfg: RunConfig = defaultRunConfig(t.seed * 100003 + t.index);
    const { result } = playStratRun(cfg, t.seed * 31 + t.index, combat, rp, { onFight: (rec) => k.keep(rec.snap) && snaps.push(rec.snap) });
    out.digests = [{ won: result.won, act: result.act, parts: result.record.partsAtEnd, trinkets: result.record.trinkets }];
    out.snaps = snaps;
  } else {
    const pol = COMBAT[t.bot];
    const stats: FightStats[] = [];
    let turns = 0;
    const p0 = stratStats.previews;
    t.snaps.forEach((s, si) => {
      for (let r = 0; r < t.reps; r++) {
        const c = createCombat({
          seed: 7001 + 131 * si + 17 * r + s.floor,
          bin: s.bin,
          enemies: s.enemies,
          hp: s.hp,
          maxHp: s.maxHp,
          kind: s.tier === 'fight' ? 'fight' : s.tier,
          trinkets: s.trinkets,
          handSize: s.handSize,
          chassis: s.chassis,
        });
        const st = playCombatWith(c, pol);
        turns += st.turns;
        stats.push(st);
      }
    });
    out.stats = stats;
    out.turns = turns;
    out.previews = stratStats.previews - p0;
  }
  out.cpuMs = performance.now() - t0;
  return out;
}
