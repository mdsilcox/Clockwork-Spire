// Balance simulator CLI (docs/rules.md section 7). Modes: --mode fights. Others arrive in later phases.
import { mkdirSync, writeFileSync } from 'node:fs';
import { botStats } from './bot';
import { buildReport, loadEncounters } from './combat-report';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

async function main(): Promise<void> {
  if (arg('mode', '') !== 'fights') {
    console.log('Balance simulator: not yet.');
    return;
  }
  const seed = Number(arg('seed', '1'));
  const fights = Number(arg('fights', '2000'));
  const date = arg('date', new Date().toISOString().slice(0, 10)); // the only clock read
  const encounters = await loadEncounters();
  const t0 = performance.now();
  const md = buildReport({ seed, fights, encounters }, date);
  const secs = (performance.now() - t0) / 1000;
  mkdirSync('balance', { recursive: true });
  const file = `balance/${date}-fights-${seed}.md`;
  writeFileSync(file, md + '\n');
  console.log(
    `Wrote ${file}: ${fights} fights in ${secs.toFixed(1)} s (${(fights / secs).toFixed(0)} fights/s, ${(botStats.previews / secs).toFixed(0)} previews/s).`,
  );
}

void main();
