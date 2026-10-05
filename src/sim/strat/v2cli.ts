// v2 fight report: npx tsx src/sim/strat/v2cli.ts --seed 1 --date 2026-10-04 [--fights 40]
// Writes balance/<date>-v2-fights.md. The only clock reads are for timing (and the --date default).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { collectBins, statsFromBins } from './v2';
import type { V2Bot, V2FightStats } from './v2';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const seed = Number(arg('seed', '1'));
const date = arg('date', new Date().toISOString().slice(0, 10));
const fights = Number(arg('fights', '40'));
const bots: V2Bot[] = ['greedy', 'turtle', 'burst', 'expert', 'maxburst'];
const label: Record<V2Bot, string> = { greedy: 'greedy (v1 bot)', turtle: 'turtle', burst: 'burst', expert: 'expert', maxburst: 'max-burst' };
const pct = (x: number, d = 0): string => `${(x * 100).toFixed(d)}%`;

const t0 = performance.now();
const bins = collectBins(seed, fights, [1, 2, 3]);
const tBins = (performance.now() - t0) / 1000;
const t1 = performance.now();
const { stats } = statsFromBins({ seed, fightsPerTier: fights, bots }, bins);
const tFights = (performance.now() - t1) / 1000;
const get = (b: V2Bot, a: number, t: string): V2FightStats => stats.find((s) => s.bot === b && s.act === a && s.tier === t) as V2FightStats;

const md: string[] = [`# v2 fights by strategy (seed ${seed})`, '', `Date: ${date}`, ''];
md.push(
  '## What this measures',
  '',
  `v2 combat (enemy machines, target orders, salvage) played by five bots on the same bins: snapshots of what v2 expert runs (expert combat and drafting, careers on the sensible path) held on arrival at each normal and elite fight (${bins.length} collected, ${fights} used per act and tier, evenly spaced). Every bot replays each snapshot once from the snapshot's HP, with the same shuffle. Turtle and burst aim at the cores first (the naive plans). Greedy is v1's bot with a simple order (its worst acting part, then the core). The expert chooses a part-aware order searched together with its placements and looks one turn ahead through the real enemy turn. Max-burst is the expert with damage weighted far above safety. Bosses are still v1 wardens until B9 and are not measured here.`,
  '',
  '## Per bot, act and tier',
  '',
  '| Act | Tier | Bot | Fights | Win rate | HP lost, mean | % of max HP | Turns | Turns absorbed by Plating | ms per turn |',
  '|---|---|---|---|---|---|---|---|---|---|',
);
for (const a of [1, 2, 3]) for (const t of ['normal', 'elite']) for (const b of bots) {
  const s = get(b, a, t);
  md.push(`| ${a} | ${t} | ${label[b]} | ${s.fights} | ${pct(s.winRate)} | ${s.hpLostMean.toFixed(1)} | ${pct(s.hpLostPctMean, 1)} | ${s.turnsMean.toFixed(1)} | ${pct(s.absorbedTurnShare)} | ${s.msPerTurn.toFixed(1)} |`);
}
md.push('', '"Turns absorbed by Plating" is the share of enemy turns that tried to damage you in which Plating took all of it (no HP lost).', '', '## Targets (rules 7.4)', '', '| Target | Act | Result | Pass |', '|---|---|---|---|');
for (const a of [1, 2, 3]) {
  const ex = get('expert', a, 'elite').hpLostMean;
  const tu = get('turtle', a, 'elite').hpLostMean;
  const bu = get('burst', a, 'elite').hpLostMean;
  md.push(`| BV3 elites: turtle and burst lose at least 1.5x the expert's HP | ${a} | expert ${ex.toFixed(1)}, turtle ${tu.toFixed(1)} (${(tu / Math.max(0.01, ex)).toFixed(1)}x), burst ${bu.toFixed(1)} (${(bu / Math.max(0.01, ex)).toFixed(1)}x) | ${tu >= 1.5 * ex && bu >= 1.5 * ex ? 'yes' : 'NO'} |`);
  const tn = get('turtle', a, 'normal').hpLostPctMean;
  const bn = get('burst', a, 'normal').hpLostPctMean;
  md.push(`| BV3 normals: turtle and burst lose at least 10% of max HP | ${a} | turtle ${pct(tn, 1)}, burst ${pct(bn, 1)} | ${tn >= 0.1 && bn >= 0.1 ? 'yes' : 'NO'} |`);
  const an = get('turtle', a, 'normal').absorbedTurnShare;
  const ae = get('turtle', a, 'elite').absorbedTurnShare;
  md.push(`| BV8 the turtle's Plating absorbs at most 40% of enemy turns | ${a} | normal ${pct(an)}, elite ${pct(ae)} | ${an <= 0.4 && ae <= 0.4 ? 'yes' : 'NO'} |`);
}
const maxMs = Math.max(...[1, 2, 3].flatMap((a) => ['normal', 'elite'].map((t) => get('expert', a, t).msPerTurn)));
md.push(`| BV6 the expert decides in under 50 ms per turn | all | worst cell ${maxMs.toFixed(1)} ms | ${maxMs < 50 ? 'yes' : 'NO'} |`, '');
md.push('## Runtime', '', `Collecting ${bins.length} bins from expert careers: ${tBins.toFixed(0)} s. Replaying ${bots.length} bots on ${fights} bins per cell: ${tFights.toFixed(0)} s. Single thread.`, '');
try {
  md.push(readFileSync(new URL('./notes-v2.md', import.meta.url), 'utf8').trimEnd(), '');
} catch {
  // no notes: data only
}
mkdirSync('balance', { recursive: true });
writeFileSync(`balance/${date}-v2-fights.md`, md.join('\n'));
console.log(`Wrote balance/${date}-v2-fights.md`);
