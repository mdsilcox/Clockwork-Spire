// Strategy report CLI: npx tsx src/sim/strat/cli.ts --seed 1 --date 2026-10-04 [--careers 100] [--runs 300] [--workers 20]
// Writes balance/<date>-v1-strategies.md. The only clock reads are for timing the sections and the --date default.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { CHASSIS } from '../../core/content/chassis';
import type { FightSnapshot } from './drive';
import { BOT_LABEL, BOTS, BOSS_OF, TIERS, TIER_LABEL, bossTable, careerStats, careerTable, clockmakerPhases, fightTable, mean, noMetaTable, pickTable, platingTable, sampleEven } from './report';
import type { FightRow, ModeRow } from './report';
import { runTask } from './tasks';
import type { BotName, RunDigest, RunMode, Task, TaskResult } from './tasks';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

class Pool {
  private workers: Worker[] = [];
  constructor(n: number) {
    for (let i = 0; i < n; i++) this.workers.push(new Worker(new URL('./worker.ts', import.meta.url), { execArgv: process.execArgv }));
  }
  run(tasks: Task[]): Promise<TaskResult[]> {
    return new Promise((resolve, reject) => {
      const results: TaskResult[] = new Array(tasks.length);
      let next = 0;
      let done = 0;
      if (tasks.length === 0) return resolve(results);
      const feed = (w: Worker): void => {
        if (next >= tasks.length) return;
        const id = next++;
        w.postMessage({ id, task: tasks[id] });
      };
      for (const w of this.workers) {
        const onMsg = (m: { id: number; result: TaskResult }): void => {
          results[m.id] = m.result;
          done += 1;
          if (done === tasks.length) {
            for (const x of this.workers) {
              x.removeAllListeners('message');
              x.removeAllListeners('error');
            }
            resolve(results);
          } else feed(w);
        };
        w.on('message', onMsg);
        w.on('error', reject);
        feed(w);
      }
    });
  }
  close(): Promise<number[]> {
    return Promise.all(this.workers.map((w) => w.terminate()));
  }
}

interface Timing {
  section: string;
  tasks: number;
  wallS: number;
  cpuS: number;
}

async function main(): Promise<void> {
  const seed = Number(arg('seed', '1'));
  const date = arg('date', new Date().toISOString().slice(0, 10));
  const careersN = Number(arg('careers', '100'));
  const runsN = Number(arg('runs', '300'));
  const maxRuns = 30;
  const reps = Number(arg('reps', '3'));
  const perBucket = Number(arg('bins', '40'));
  const nWorkers = Number(arg('workers', String(Math.max(1, Math.min(20, availableParallelism() - 2)))));
  const pool = new Pool(nWorkers);
  const timings: Timing[] = [];
  const timed = async (section: string, tasks: Task[]): Promise<TaskResult[]> => {
    const t0 = performance.now();
    const res = await pool.run(tasks);
    timings.push({ section, tasks: tasks.length, wallS: (performance.now() - t0) / 1000, cpuS: res.reduce((a, r) => a + r.cpuMs, 0) / 1000 });
    console.log(`${section}: ${tasks.length} tasks in ${timings[timings.length - 1].wallS.toFixed(1)} s wall`);
    return res;
  };

  // 1. Expert careers and no-meta runs: also the source of the realistic bins.
  const careerTasks = (mode: RunMode, keepSnaps: boolean): Task[] =>
    Array.from({ length: careersN }, (_, i): Task => ({ kind: 'career', seed: seed * 10007 + i, mode, maxRuns, keepSnaps }));
  const runTasks = (mode: RunMode, keepSnaps: boolean): Task[] =>
    Array.from({ length: runsN }, (_, i): Task => ({ kind: 'run', seed, index: i, mode, keepSnaps }));

  const expCareers = await timed('Careers, expert', careerTasks('expert', true));
  const expRuns = await timed('No-meta runs, expert', runTasks('expert', true));

  // 2. Fights: realistic bins held by the expert on arrival, replayed by every bot.
  const allSnaps: FightSnapshot[] = [...expCareers.flatMap((r) => r.snaps ?? []), ...expRuns.flatMap((r) => r.snaps ?? [])];
  const fightTasks: Task[] = [];
  const bucketSizes: string[] = [];
  const keyOf = (s: FightSnapshot): string => `${s.act}|${s.tier}`;
  const chosen: Record<string, FightSnapshot[]> = {};
  for (const act of [1, 2, 3]) {
    for (const tier of TIERS) {
      const all = allSnaps.filter((s) => s.act === act && s.tier === tier);
      const sel = sampleEven(all, perBucket);
      chosen[`${act}|${tier}`] = sel;
      bucketSizes.push(`| ${act} | ${TIER_LABEL[tier]} | ${all.length} | ${sel.length} |`);
      for (let i = 0; i < sel.length; i += 5) for (const bot of BOTS) fightTasks.push({ kind: 'fights', bot, bucket: `${act}|${tier}`, snaps: sel.slice(i, i + 5), reps });
    }
  }
  const fightRes = await timed('Fights, 4 bots', fightTasks);
  const rows: FightRow[] = [];
  const perBot: Record<string, { cpuMs: number; turns: number; previews: number; fights: number }> = {};
  fightTasks.forEach((t, i) => {
    if (t.kind !== 'fights') return;
    const r = fightRes[i];
    const b = (perBot[t.bot] ??= { cpuMs: 0, turns: 0, previews: 0, fights: 0 });
    b.cpuMs += r.cpuMs;
    b.turns += r.turns ?? 0;
    b.previews += r.previews ?? 0;
    b.fights += r.stats?.length ?? 0;
    (r.stats ?? []).forEach((st, k) => rows.push({ bot: t.bot, snap: t.snaps[Math.floor(k / t.reps)], stats: st }));
  });
  void keyOf;

  // 3. The other bots' careers and no-meta runs, for comparison (cheap).
  const others: RunMode[] = ['v1', 'greedy', 'turtle', 'burst'];
  const modeRows: ModeRow[] = [];
  const expDigests: RunDigest[] = [...expCareers.flatMap((r) => r.digests ?? []), ...expRuns.flatMap((r) => r.digests ?? [])];
  const otherCareers = await timed('Careers, other bots', others.flatMap((m) => careerTasks(m, false)));
  const otherRuns = await timed('No-meta runs, other bots', others.flatMap((m) => runTasks(m, false)));
  others.forEach((m, mi) => {
    modeRows.push({
      mode: m,
      careers: careersN,
      firsts: otherCareers.slice(mi * careersN, (mi + 1) * careersN).map((r) => r.firstWin ?? null),
      noMeta: otherRuns.slice(mi * runsN, (mi + 1) * runsN).flatMap((r) => r.digests ?? []),
    });
  });
  modeRows.push({ mode: 'expert', careers: careersN, firsts: expCareers.map((r) => r.firstWin ?? null), noMeta: expRuns.flatMap((r) => r.digests ?? []) });
  await pool.close();

  // Single-thread per-turn timing for the expert (the workers share cores, so their figures run high):
  // 4 bins from every act and tier, one replay each, on the main thread with the pool closed.
  const timingSnaps = Object.values(chosen).flatMap((s) => s.slice(0, 4));
  const tt0 = performance.now();
  const tr = runTask({ kind: 'fights', bot: 'expert', bucket: 'timing', snaps: timingSnaps, reps: 1 });
  const soloMs = (performance.now() - tt0) / Math.max(1, tr.turns ?? 1);
  const soloPrev = (tr.previews ?? 0) / Math.max(1, tr.turns ?? 1);

  // ---------- Report ----------
  const ft = fightTable(rows);
  const bt = bossTable(rows);
  const flags = [...ft.flags, ...bt.flags];
  const exp = careerStats(expCareers.map((r) => r.firstWin ?? null), maxRuns);
  const v1Row = modeRows.find((m) => m.mode === 'v1');
  const v1 = v1Row ? careerStats(v1Row.firsts, maxRuns) : null;
  const expNoMeta = modeRows.find((m) => m.mode === 'expert')?.noMeta ?? [];
  const starters = new Set(Object.values(CHASSIS).flatMap((c) => c.startingBin));
  const picks = pickTable(expDigests, starters);
  const expertTurns = perBot.expert ? perBot.expert.cpuMs / Math.max(1, perBot.expert.turns) : 0;
  const md: string[] = [];
  md.push(`# v1 strategy report (seed ${seed})`, '', `Date: ${date}`, '');
  md.push('## What this measures', '');
  md.push(
    'v1 rules (docs/rules.md, unchanged) played by four combat bots: greedy (the shipped v1 bot), turtle (Plating first until it covers the shown incoming, then damage), burst (damage first) and expert (beam search over placements, swaps and targets, then a one-turn lookahead through the real enemy turn with a hidden draw pile). The owner won v1 on the fourth run with a Plating stack plus burst line; this report asks how much of that the v1 bot under-measures, to ground the v2 design and its balance targets.',
    '',
    'Run decisions: "v1" uses the shipped run bot (20% exploration). "Expert drafting" commits by act 1 floor 4 to one package (spring, steam or cam) around a Plating engine and the top damage parts, skips weak picks, removes weak parts at shops and forges, and paths for elites when HP is above 65%. Careers use the same seeds and the same Brass path as v1 careers (balance/2026-10-04-careers-1.md).',
    '',
    `Bins for the fight section are snapshots of what an expert run actually held on arrival at each fight (careers and no-meta runs pooled). Each fight is replayed ${reps} times with different shuffles by all four bots, from the snapshot's HP, trinkets, hand size and chassis. Second Wind is off in replays.`,
    '',
    '| Act | Tier | Snapshots available | Bins used |',
    '|---|---|---|---|',
    ...bucketSizes,
    '',
  );
  md.push('## Flags', '');
  md.push(flags.length ? flags.map((f) => `- ${f}`).join('\n') : '- No tier where turtle or burst loses under 10% of max HP on average, and no boss killed in 4 turns or fewer on average.', '');
  md.push('## Fights by act and tier', '', ft.md, '');
  md.push('## Bosses', '', bt.md, '', '### Clockmaker phases', '', 'Phase turns are the turns a phase lasted. A fight that dies in phase 1 only counts toward "reached phase 2" if it got there.', '', clockmakerPhases(rows), '');
  md.push('## Peak Plating', '', 'Highest Plating the machine produced in one turn, over every replayed fight. "Absorbed 3 turns running" counts fights with at least 3 enemy attack turns in which Plating covered every attack for 3 consecutive attack turns (no HP lost).', '', platingTable(rows), '');
  md.push('## Careers', '', `${careersN} careers from a fresh profile (SENSIBLE_PATH, up to ${maxRuns} runs, a career with no win counts as ${maxRuns + 1}).`, '', careerTable([...modeRows.filter((m) => m.mode === 'v1'), ...modeRows.filter((m) => m.mode !== 'v1')], maxRuns), '');
  md.push(`Expert first win: median ${exp.median.toFixed(1)} (quartiles ${exp.q1.toFixed(1)} to ${exp.q3.toFixed(1)}) against v1's ${v1 ? v1.median.toFixed(1) : 'n/a'} on the same seeds (the shipped report says 9).`, '');
  md.push('## No-meta runs', '', `${runsN} runs per bot with no meta progression (Tinker chassis, no upgrades).`, '', noMetaTable([...modeRows.filter((m) => m.mode === 'v1'), ...modeRows.filter((m) => m.mode !== 'v1')]), '');
  md.push(`Expert no-meta win rate: ${((expNoMeta.filter((d) => d.won).length / Math.max(1, expNoMeta.length)) * 100).toFixed(1)}% over ${expNoMeta.length} runs.`, '');
  md.push(
    '## What the expert wins with',
    '',
    `Pick rate among the ${picks.wins} winning expert runs (careers and no-meta pooled) of the parts in the bin at the end, one count per run. The last column is the same rate over all ${expDigests.length} expert runs, so a big gap marks a part that goes with winning.`,
    '',
    '### Parts',
    '',
    picks.parts,
    '',
    '### Parts, starting-bin parts left out',
    '',
    picks.partsNoStarters,
    '',
    '### Trinkets',
    '',
    picks.trinkets,
    '',
  );
  md.push('## Runtime', '');
  md.push('| Section | Tasks | Wall time | CPU time (all workers) |', '|---|---|---|---|');
  for (const t of timings) md.push(`| ${t.section} | ${t.tasks} | ${t.wallS.toFixed(1)} s | ${t.cpuS.toFixed(1)} s |`);
  md.push('', `Run on ${nWorkers} worker threads. Per-turn cost in the fight replays (CPU time of the whole replay including combat setup, divided by turns played):`, '');
  md.push('| Bot | Fights | Turns | ms per turn | Machine previews per turn |', '|---|---|---|---|---|');
  for (const bot of BOTS as BotName[]) {
    const b = perBot[bot];
    if (!b) continue;
    md.push(`| ${BOT_LABEL[bot]} | ${b.fights} | ${b.turns} | ${(b.cpuMs / Math.max(1, b.turns)).toFixed(1)} | ${b.turns ? (b.previews / b.turns).toFixed(0) : 'n/a'} |`);
  }
  md.push('', `Expert average: ${expertTurns.toFixed(1)} ms per turn on the shared worker threads. Alone on one thread (${timingSnaps.length} bins across every act and tier, ${tr.turns} turns): ${soloMs.toFixed(1)} ms per turn, ${soloPrev.toFixed(0)} previews per turn.`, '');
  const notes = new URL('./notes.md', import.meta.url);
  try {
    if (existsSync(notes)) md.push(readFileSync(notes, 'utf8').trimEnd(), '');
  } catch {
    // no notes file: the report is data only
  }
  mkdirSync('balance', { recursive: true });
  const file = `balance/${date}-v1-strategies.md`;
  writeFileSync(file, md.join('\n'));
  console.log(`Wrote ${file}. Expert ${expertTurns.toFixed(1)} ms/turn (${soloMs.toFixed(1)} alone). Careers median ${exp.median}. Fights ${rows.length}. Mean expert career runs ${mean(expCareers.map((r) => r.runs ?? 0)).toFixed(1)}.`);
  void BOSS_OF;
}

void main();
