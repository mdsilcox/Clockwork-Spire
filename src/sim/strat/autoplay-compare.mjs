// Plays the in-game autoplay (src/app/autoplay.ts, through the real controller in a headless browser) on the same career
// seeds the simulator's `careersV2` uses, so the two can be compared run for run.
//   node src/sim/strat/autoplay-compare.mjs --port 5392 --seeds 1,2,3 [--cap 30] [--parallel 6] [--json out.json]
// Needs a dev server on --port (npx vite --port 5392 --strictPort). Career i uses base seed 1 * 10007 + i (`--base`, default 1),
// the same as `careersV2(pool, route, 1, n)`. Prints `career <i> base <seed>: first win run <n> after <runs> runs`.
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const port = Number(arg('port', '5392'));
const cap = Number(arg('cap', '30'));
const base = Number(arg('base', '1'));
const careers = arg('seeds', '0,1,2,3,4,5').split(',').map(Number);
const parallel = Number(arg('parallel', '6'));
const json = arg('json', '');

const browser = await chromium.launch();
const out = [];

async function one(i) {
  const seed = base * 10007 + i;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  // skip the first-launch tutorial, as e2e/helpers.ts does
  await page.addInitScript(() => {
    try {
      localStorage.setItem('cs.tutorialDone', '1');
    } catch {
      /* ignore */
    }
  });
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 60000 });
  const t0 = Date.now();
  const r = await page.evaluate((o) => window.__game.autoplay(o), { maxRuns: cap, speed: 'skip', seed });
  const secs = (Date.now() - t0) / 1000;
  // per-run results from the profile's history (newest first), oldest first here
  const history = await page.evaluate(() => window.__game.profile().history.map((h) => ({ n: h.n, result: h.result, act: h.act, floor: h.floor, chassis: h.chassis, turns: h.turns, big: h.biggestTurn, parts: h.partsAtEnd.join(","), tr: h.trinkets })).reverse());
  console.log(`career ${i} base ${seed}: ${r.won ? `first win run ${r.firstWinRun}` : 'no win'} after ${r.runs} runs (${secs.toFixed(0)} s)`);
  out.push({ career: i, seed, ...r, secs, history });
  await ctx.close();
}

const queue = [...careers];
await Promise.all(
  Array.from({ length: parallel }, async () => {
    while (queue.length) await one(queue.shift());
  }),
);
await browser.close();
out.sort((a, b) => a.career - b.career);
if (json) writeFileSync(json, JSON.stringify(out));
