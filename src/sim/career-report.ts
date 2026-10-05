// Career report: win rate by meta band, runs to first win, offer-based part impact over every career run.
// Library code: never reads the clock.
import { playCareer } from './career';
import type { CareerResult } from './career';
import { impactOf } from './run-report';
import type { ImpactResult } from './run-report';

export interface CareersOpts {
  seed: number;
  careers: number;
  maxRuns?: number;
  continueAfterWin?: boolean;
  minOffers?: number;
}

export interface CareersSummary {
  seed: number;
  careers: number;
  runsPlayed: number;
  medianFirstWin: number;
  q1FirstWin: number;
  q3FirstWin: number;
  neverWon: number;
  bands: { band: string; runs: number; winRate: number }[];
  medianImpact: number | null;
  maxImpact: number | null;
  flagged: string[];
  unmeasured: string[];
  impact: ImpactResult['impact'];
}

export const BANDS: { label: string; lo: number; hi: number }[] = [
  { label: '0', lo: 0, hi: 0 },
  { label: '1-99', lo: 1, hi: 99 },
  { label: '100-249', lo: 100, hi: 249 },
  { label: '250-499', lo: 250, hi: 499 },
  { label: '500+', lo: 500, hi: Infinity },
];

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function playCareers(o: CareersOpts): CareerResult[] {
  const out: CareerResult[] = [];
  for (let i = 0; i < o.careers; i++) {
    out.push(playCareer({ seed: o.seed * 10007 + i, maxRuns: o.maxRuns ?? 30, continueAfterWin: o.continueAfterWin }));
  }
  return out;
}

export function summarizeCareers(o: CareersOpts, careers: CareerResult[]): CareersSummary {
  const maxRuns = o.maxRuns ?? 30;
  const firsts = careers.map((c) => c.firstWin ?? maxRuns + 1).sort((a, b) => a - b);
  const allRuns = careers.flatMap((c) => c.runs);
  const imp = impactOf(
    allRuns.map((r) => r.result),
    o.minOffers ?? 30,
  );
  return {
    seed: o.seed,
    careers: careers.length,
    runsPlayed: allRuns.length,
    medianFirstWin: quantile(firsts, 0.5),
    q1FirstWin: quantile(firsts, 0.25),
    q3FirstWin: quantile(firsts, 0.75),
    neverWon: careers.filter((c) => c.firstWin === null).length,
    bands: BANDS.map((b) => {
      const rs = allRuns.filter((r) => r.brassSpent >= b.lo && r.brassSpent <= b.hi);
      return { band: b.label, runs: rs.length, winRate: rs.filter((r) => r.result.won).length / Math.max(1, rs.length) };
    }),
    medianImpact: imp.med,
    maxImpact: imp.imps.length ? imp.imps[imp.imps.length - 1] : null,
    flagged: imp.flagged,
    unmeasured: imp.unmeasured,
    impact: imp.impact,
  };
}

export function buildCareerReport(o: CareersOpts, date: string): { markdown: string; summary: CareersSummary } {
  const careers = playCareers(o);
  const summary = summarizeCareers(o, careers);
  const maxRuns = o.maxRuns ?? 30;
  const minOffers = o.minOffers ?? 30;
  const allRuns = careers.flatMap((c) => c.runs);
  const imp = impactOf(
    allRuns.map((r) => r.result),
    minOffers,
  );
  const out: string[] = [];
  out.push(`# Career balance report (seed ${o.seed}, ${o.careers} careers)`);
  out.push('');
  out.push(`Date: ${date}`);
  out.push('');
  out.push('## How to read this');
  out.push('');
  out.push(
    `Each career starts a fresh profile and plays up to ${maxRuns} runs with the bot, buying upgrades in the sensible order (Reinforced Frame, Spare Scrap, Oiled Bearings, Tool Belt, Inventor's Notes, Second Wind, Lucky Charm, then the remaining levels) and rotating chassis as they unlock. ${o.continueAfterWin ? 'Careers keep playing after the first win.' : 'A career stops at its first win.'} A career with no win counts as ${maxRuns + 1} runs. Brass spent is what the profile had spent on upgrades before the run. Part impact is offer-based over every career run (took vs passed within act; acts 1 and 2 count a win as beating that act's boss, act 3 the Clockmaker).`,
  );
  out.push('');
  out.push('## Runs to first win');
  out.push('');
  out.push(`- Median: ${summary.medianFirstWin.toFixed(1)}`);
  out.push(`- Quartiles: ${summary.q1FirstWin.toFixed(1)} to ${summary.q3FirstWin.toFixed(1)}`);
  out.push(`- Careers with no win in ${maxRuns} runs: ${summary.neverWon} of ${o.careers}`);
  out.push(`- Runs played: ${summary.runsPlayed}`);
  out.push('');
  const firsts = careers.map((c) => c.firstWin ?? maxRuns + 1);
  out.push('| Runs to first win | Careers |');
  out.push('|---|---|');
  const groups: [string, (n: number) => boolean][] = [
    ['1-4', (n) => n <= 4],
    ['5-7', (n) => n >= 5 && n <= 7],
    ['8-12', (n) => n >= 8 && n <= 12],
    ['13-20', (n) => n >= 13 && n <= 20],
    [`21-${maxRuns}`, (n) => n >= 21 && n <= maxRuns],
    ['never', (n) => n > maxRuns],
  ];
  for (const [label, f] of groups) out.push(`| ${label} | ${firsts.filter(f).length} |`);
  out.push('');
  out.push('## Win rate by Brass spent');
  out.push('');
  out.push('| Brass spent before the run | Runs | Win rate |');
  out.push('|---|---|---|');
  for (const b of summary.bands) out.push(`| ${b.band} | ${b.runs} | ${pct(b.winRate)} |`);
  out.push('');
  out.push('## Part impact (offer-based, all career runs)');
  out.push('');
  out.push(`Parts with fewer than ${minOffers} offers on either side show n/a and are left out of the median.`);
  out.push('');
  out.push('| Part | Took | Passed | Impact |');
  out.push('|---|---|---|---|');
  for (const r of imp.rowsOut) out.push(r.line);
  out.push('');
  if (imp.med !== null) {
    out.push(`Impact: median ${imp.med.toFixed(2)}, max ${(summary.maxImpact as number).toFixed(2)} (${imp.imps.length} parts measured of ${imp.ids.length}).`);
    out.push('');
    out.push(imp.flagged.length ? `Flagged above 2x the median (${(2 * imp.med).toFixed(2)}): ${imp.flagged.join(', ')}.` : 'No part is above 2x the median.');
    if (imp.unmeasured.length) {
      out.push('');
      out.push(`Still under ${minOffers} offers on a side: ${imp.unmeasured.join(', ')}.`);
    }
  } else out.push('Not enough offers to measure any part.');
  out.push('');
  return { markdown: out.join('\n'), summary };
}
