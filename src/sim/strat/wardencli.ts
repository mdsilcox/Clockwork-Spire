// BV4 numbers: npx tsx src/sim/strat/wardencli.ts [--seed 1] [--fights 100]. Prints each bot's turns and phase minimums per warden.
import { wardenStatsV2 } from './v2';

const arg = (n: string, d: string): string => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const rows = wardenStatsV2({ seed: Number(arg('seed', '1')), fights: Number(arg('fights', '100')), bots: ['expert', 'maxburst'] });
for (const r of rows) console.log(`${r.bot} vs ${r.warden}: fights ${r.fights} wins ${r.wins} median ${r.turnsMedian} phaseMin ${JSON.stringify(r.phaseTurnsMin)} lastPhaseShort ${r.lastPhaseShort}`);
