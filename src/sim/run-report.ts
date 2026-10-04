// Run-level report: the bot plays complete runs (no meta) and we measure win rate, progress and offer-based part impact.
// Library code: never reads the clock. The date and the optional wall time are passed in.
import { defaultRunConfig } from '../core/run';
import { PARTS } from '../core/content/parts';
import { playRun } from './run';
import type { RunResult } from './run';

export interface RunsOpts {
  seed: number;
  runs: number;
  /** Offers needed on each side (took and passed) to report a part's impact. Rules 7 says 30. */
  minOffers?: number;
}

export interface RunsSummary {
  seed: number;
  runs: number;
  winRate: number;
  illegalCalls: number;
  actReached: Record<string, number>;
  deathFloors: Record<string, number>;
  avgHpAtBoss: (number | null)[];
  avgTurns: number;
  deaths: Record<string, number>;
  impact: Record<string, { tookOffers: number; passedOffers: number; impact: number | null }>;
  medianImpact: number | null;
  maxImpact: number | null;
  flagged: string[];
}

const f1 = (x: number): string => x.toFixed(1);
const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Did the run win the fight that decides an offer made in `act`? Acts 1-2: that act's boss; act 3: the Clockmaker. */
function offerWon(r: RunResult, act: number): boolean {
  return act >= 3 ? r.won : r.bossesBeaten >= act;
}

export function playRuns(o: RunsOpts): RunResult[] {
  const out: RunResult[] = [];
  for (let i = 0; i < o.runs; i++) out.push(playRun(defaultRunConfig(o.seed * 100003 + i), o.seed * 31 + i));
  return out;
}

export function buildRunReport(o: RunsOpts, date: string, wallSeconds?: number): { markdown: string; summary: RunsSummary } {
  const results = playRuns(o);
  const n = results.length;
  const minOffers = o.minOffers ?? 30;
  const wins = results.filter((r) => r.won).length;
  const summary: RunsSummary = {
    seed: o.seed,
    runs: n,
    winRate: wins / Math.max(1, n),
    illegalCalls: results.reduce((a, r) => a + r.illegal.length, 0),
    actReached: {},
    deathFloors: {},
    avgHpAtBoss: [],
    avgTurns: avg(results.map((r) => r.turns)),
    deaths: {},
    impact: {},
    medianImpact: null,
    maxImpact: null,
    flagged: [],
  };
  const out: string[] = [];
  out.push(`# Run balance report (seed ${o.seed}, ${n} runs)`);
  out.push('');
  out.push(`Date: ${date}`);
  out.push('');
  out.push('## How to read this');
  out.push('');
  out.push(
    'The bot plays complete runs from a fresh profile (no meta progression, Tinker chassis). Win rate and progress show how hard the climb is. Part impact is offer-based: each time a part is offered (reward or shop) the run joins the "took it" or "passed" group within the same act; impact is the win rate of took divided by passed, pooled across acts and weighted by offers (1.00 means no effect). For acts 1 and 2 a win means beating that act\'s boss; for act 3, beating the Clockmaker. The bot explores 20% of the time so both groups fill.',
  );
  out.push('');
  out.push('## Overall');
  out.push('');
  out.push(`- Win rate: ${pct(summary.winRate)} (${wins} of ${n})`);
  out.push(`- Average run length: ${f1(summary.avgTurns)} combat turns`);
  if (wallSeconds !== undefined) out.push(`- Wall time: ${f1(wallSeconds)} s total, ${(wallSeconds / Math.max(1, n)).toFixed(3)} s per run`);
  out.push(`- Illegal API calls by the bot: ${summary.illegalCalls}`);
  out.push('');

  out.push('## Act reached');
  out.push('');
  out.push('| Act reached | Runs | Share |');
  out.push('|---|---|---|');
  for (const a of [1, 2, 3]) {
    const k = results.filter((r) => r.act === a).length;
    summary.actReached[`act${a}`] = k;
    out.push(`| Act ${a} | ${k} | ${pct(k / Math.max(1, n))} |`);
  }
  out.push('');

  out.push('## Where runs end');
  out.push('');
  const losses = results.filter((r) => !r.won);
  const byFloor = new Map<string, number>();
  for (const r of losses) {
    const k = `Act ${r.act} floor ${String(r.floor).padStart(2, '0')}`;
    byFloor.set(k, (byFloor.get(k) ?? 0) + 1);
  }
  out.push('| Death floor | Runs |');
  out.push('|---|---|');
  for (const k of [...byFloor.keys()].sort()) {
    summary.deathFloors[k] = byFloor.get(k) as number;
    out.push(`| ${k} | ${byFloor.get(k)} |`);
  }
  if (byFloor.size === 0) out.push('| none | 0 |');
  out.push('');

  out.push('## HP when entering each boss');
  out.push('');
  out.push('| Boss | Runs that got there | Average HP |');
  out.push('|---|---|---|');
  for (let a = 0; a < 3; a++) {
    const xs = results.map((r) => r.hpAtBoss[a]).filter((x): x is number => x !== null);
    summary.avgHpAtBoss.push(xs.length ? avg(xs) : null);
    out.push(`| Act ${a + 1} boss | ${xs.length} | ${xs.length ? f1(avg(xs)) : 'n/a'} |`);
  }
  out.push('');

  out.push('## Deaths by encounter');
  out.push('');
  const deaths = new Map<string, number>();
  for (const r of losses) {
    const k = r.killedBy ?? 'unknown';
    deaths.set(k, (deaths.get(k) ?? 0) + 1);
  }
  out.push('| Encounter | Deaths | Share of deaths |');
  out.push('|---|---|---|');
  const dk = [...deaths.keys()].sort((a, b) => (deaths.get(b) as number) - (deaths.get(a) as number) || a.localeCompare(b));
  for (const k of dk) {
    summary.deaths[k] = deaths.get(k) as number;
    out.push(`| ${k} | ${deaths.get(k)} | ${pct((deaths.get(k) as number) / Math.max(1, losses.length))} |`);
  }
  if (dk.length === 0) out.push('| none | 0 | n/a |');
  out.push('');

  // Offer-based impact, within act.
  type G = { took: number; tookWin: number; passed: number; passedWin: number };
  const perPart = new Map<string, Map<number, G>>();
  for (const r of results) {
    for (const of_ of r.offers) {
      let acts = perPart.get(of_.partId);
      if (!acts) perPart.set(of_.partId, (acts = new Map()));
      let g = acts.get(of_.act);
      if (!g) acts.set(of_.act, (g = { took: 0, tookWin: 0, passed: 0, passedWin: 0 }));
      const w = offerWon(r, of_.act) ? 1 : 0;
      if (of_.taken) {
        g.took += 1;
        g.tookWin += w;
      } else {
        g.passed += 1;
        g.passedWin += w;
      }
    }
  }
  const ids = [...new Set([...Object.keys(PARTS), ...perPart.keys()])].sort();
  const rowsOut: { id: string; line: string; impact: number | null }[] = [];
  for (const id of ids) {
    const acts = perPart.get(id) ?? new Map<number, G>();
    let took = 0;
    let passed = 0;
    let wSum = 0;
    let tw = 0;
    let pw = 0;
    for (const g of acts.values()) {
      took += g.took;
      passed += g.passed;
      if (g.took === 0 || g.passed === 0) continue;
      const w = g.took + g.passed;
      wSum += w;
      tw += w * (g.tookWin / g.took);
      pw += w * (g.passedWin / g.passed);
    }
    const ok = took >= minOffers && passed >= minOffers && wSum > 0 && pw > 0;
    const impact = ok ? tw / pw : null;
    summary.impact[id] = { tookOffers: took, passedOffers: passed, impact };
    rowsOut.push({
      id,
      impact,
      line: `| ${PARTS[id]?.name ?? id} (${id}) | ${took} | ${passed} | ${impact === null ? 'n/a' : impact.toFixed(2)} |`,
    });
  }
  rowsOut.sort((a, b) => (b.impact ?? -1) - (a.impact ?? -1) || a.id.localeCompare(b.id));
  const imps = rowsOut.map((r) => r.impact).filter((x): x is number => x !== null).sort((a, b) => a - b);
  const med = imps.length ? imps[Math.floor(imps.length / 2)] : null;
  summary.medianImpact = med;
  summary.maxImpact = imps.length ? imps[imps.length - 1] : null;
  summary.flagged = med === null ? [] : rowsOut.filter((r) => r.impact !== null && r.impact > 2 * med).map((r) => r.id);

  out.push('## Part impact (offer-based)');
  out.push('');
  out.push(`Parts with fewer than ${minOffers} offers on either side show n/a and are left out of the median.`);
  out.push('');
  out.push('| Part | Took | Passed | Impact |');
  out.push('|---|---|---|---|');
  for (const r of rowsOut) out.push(r.line);
  out.push('');
  if (med !== null) {
    out.push(`Impact: median ${med.toFixed(2)}, max ${(summary.maxImpact as number).toFixed(2)} (${imps.length} parts measured of ${ids.length}).`);
    out.push('');
    out.push(
      summary.flagged.length
        ? `Flagged above 2x the median (${(2 * med).toFixed(2)}): ${summary.flagged.join(', ')}.`
        : 'No part is above 2x the median.',
    );
  } else {
    out.push('Not enough offers to measure any part. Play more runs.');
  }
  out.push('');
  return { markdown: out.join('\n'), summary };
}
