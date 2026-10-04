// Balance simulator CLI (docs/rules.md section 7). Modes: --mode fights. Others arrive in later phases.
import { mkdirSync, writeFileSync } from 'node:fs';
import { botStats } from './bot';
import { buildReportWithSummary, loadEncounters } from './combat-report';
import { buildCareerReport } from './career-report';
import { buildRunReport } from './run-report';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

async function main(): Promise<void> {
  const mode = arg('mode', '');
  if (mode === 'careers') {
    const seed = Number(arg('seed', '1'));
    const careers = Number(arg('careers', '100'));
    const date = arg('date', new Date().toISOString().slice(0, 10)); // the only clock read
    const full = process.argv.includes('--full');
    const t0 = performance.now();
    const { markdown, summary } = buildCareerReport({ seed, careers, continueAfterWin: full }, date);
    const secs = (performance.now() - t0) / 1000;
    mkdirSync('balance', { recursive: true });
    const file = `balance/${date}-careers-${seed}.md`;
    writeFileSync(file, markdown + '\n');
    const json = arg('json', '');
    if (json) writeFileSync(json, JSON.stringify(summary, null, 1) + '\n');
    console.log(`Wrote ${file}: ${careers} careers (${summary.runsPlayed} runs) in ${secs.toFixed(1)} s, median first win ${summary.medianFirstWin}, never won ${summary.neverWon}.`);
    return;
  }
  if (mode === 'runs') {
    const seed = Number(arg('seed', '1'));
    const runs = Number(arg('runs', '300'));
    const date = arg('date', new Date().toISOString().slice(0, 10)); // the only clock read
    const t0 = performance.now();
    const { markdown, summary } = buildRunReport({ seed, runs }, date);
    const secs = (performance.now() - t0) / 1000;
    mkdirSync('balance', { recursive: true });
    const file = `balance/${date}-runs-${seed}.md`;
    // The wall time is only known after the run, so patch it into the report text.
    writeFileSync(file, markdown.replace(/^- Wall time: .*\n/m, '') .replace('- Illegal API calls', `- Wall time: ${secs.toFixed(1)} s total, ${(secs / Math.max(1, runs)).toFixed(3)} s per run\n- Illegal API calls`) + '\n');
    const json = arg('json', '');
    if (json) writeFileSync(json, JSON.stringify(summary, null, 1) + '\n');
    console.log(`Wrote ${file}: ${runs} runs in ${secs.toFixed(1)} s, win rate ${(summary.winRate * 100).toFixed(1)}%.`);
    return;
  }
  if (mode !== 'fights') {
    console.log('Balance simulator: not yet.');
    return;
  }
  const seed = Number(arg('seed', '1'));
  const fights = Number(arg('fights', '4000'));
  const date = arg('date', new Date().toISOString().slice(0, 10)); // the only clock read
  const encounters = await loadEncounters();
  const t0 = performance.now();
  const { markdown: md, summary } = buildReportWithSummary({ seed, fights, encounters }, date);
  const secs = (performance.now() - t0) / 1000;
  mkdirSync('balance', { recursive: true });
  const file = `balance/${date}-fights-${seed}.md`;
  writeFileSync(file, md + '\n');
  const json = arg('json', '');
  if (json) writeFileSync(json, JSON.stringify(summary, null, 1) + '\n');
  console.log(
    `Wrote ${file}: ${fights} fights in ${secs.toFixed(1)} s (${(fights / secs).toFixed(0)} fights/s, ${(botStats.previews / secs).toFixed(0)} previews/s).`,
  );
}

void main();
