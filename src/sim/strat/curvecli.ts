// B10c.0 curve measurements: npx tsx src/sim/strat/curvecli.ts <command> [--seed 1] [--runs 300] [--json path]
//   rates   --policy expert|greedy|rusher|grinder|plater [--rarity] [--plating 2] [--mode journeyman]   no-meta climbs (BV1, Plating reach)
//           lever probes: [--chassis stoker] [--upgrades frame:5,scrap:3] [--patch '{"handSize":4}'] (a RunConfig patch)
//   careers --route expert|greedy [--careers 100] [--cap 30] [--keep]                                   careers (BV2, BV10); --keep plays on after the first win (BV5)
//   impact  --route expert|greedy [--careers 100]                                                       the offer-based impact table over keep-going careers (BV5)
// Prints one line per result and optionally writes the full JSON. Workers: --workers N (default cores minus 2, at most 20).
import { writeFileSync } from 'node:fs';
import { CurvePool, careersV2, climbRates, impactTable } from './curve';
import type { CareerRoute } from './curve';
import type { RoutePolicy } from './decide';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def;
}
const flag = (name: string): boolean => process.argv.includes(`--${name}`);
const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;

async function main(): Promise<void> {
  const cmd = process.argv[2];
  const seed = Number(arg('seed', '1'));
  const json = arg('json', '');
  const pool = new CurvePool(flag('workers') || process.argv.includes('--workers') ? Number(arg('workers', '8')) : undefined);
  const t0 = performance.now();
  let out: unknown = null;
  try {
    if (cmd === 'rates') {
      const policy = arg('policy', 'expert') as RoutePolicy;
      const runs = Number(arg('runs', '300'));
      const opts = { rarity: flag('rarity'), mode: arg('mode', '') || undefined, platingBias: process.argv.includes('--plating') ? Number(arg('plating', '2')) : undefined, chassis: arg('chassis', '') || undefined, upgrades: arg('upgrades', '') ? Object.fromEntries(arg('upgrades', '').split(',').map((x) => [x.split(':')[0], Number(x.split(':')[1])])) : undefined, patch: arg('patch', '') ? JSON.parse(arg('patch', '{}')) : undefined };
      const { stats, rows } = await climbRates(pool, policy, seed, runs, opts);
      console.log(`rates ${policy} seed ${seed} runs ${runs} ${JSON.stringify(opts)}: win ${pct(stats.winRate)} reach2 ${pct(stats.reach2)} reach3 ${pct(stats.reach3)} meanAct ${stats.meanAct.toFixed(2)}`);
      out = { policy, seed, opts, stats, rows };
    } else if (cmd === 'careers' || cmd === 'impact') {
      const route = arg('route', 'expert') as CareerRoute;
      const n = Number(arg('careers', '100'));
      const cap = Number(arg('cap', '30'));
      const keep = cmd === 'impact' || flag('keep');
      const { stats, careers } = await careersV2(pool, route, seed, n, { maxRuns: cap, continueAfterWin: keep });
      console.log(`careers ${route} seed ${seed} n ${n} cap ${cap}${keep ? ' keep' : ''}: median ${stats.median} (q1 ${stats.q1}, q3 ${stats.q3}), never won ${stats.neverWon}, masterwork parts at win (median) ${stats.masterworkPartsAtWinMedian}, runs ${stats.runsPlayed}`);
      out = { route, seed, stats, careers: keep ? undefined : careers };
      if (cmd === 'impact') {
        const rows = careers.flatMap((c) => c.runs);
        const imp = impactTable(rows);
        console.log(`impact: median ${imp.med?.toFixed(2)}, max ${imp.imps.length ? imp.imps[imp.imps.length - 1].toFixed(2) : 'n/a'}, ${imp.imps.length} measured of ${imp.ids.length}, flagged ${imp.flagged.join(', ') || 'none'}`);
        out = { route, seed, stats, impact: imp.impact, median: imp.med, max: imp.imps.length ? imp.imps[imp.imps.length - 1] : null, flagged: imp.flagged, rows: imp.rowsOut };
      }
    } else {
      console.log('usage: curvecli.ts rates|careers|impact (see the header)');
    }
  } finally {
    await pool.close();
  }
  console.log(`${((performance.now() - t0) / 1000).toFixed(0)} s`);
  if (json && out) writeFileSync(json, JSON.stringify(out));
}

void main();
