// Record a painted enemy's moods as the GAME draws them (the RigHub, the stage, the real effects), for review clips.
//   node art/lib/record-game.mjs <port> <enemy-id> <outdir> [moods=idle,attack,hurt,phase,death] [seconds-per-mood=3] [--rewind]
// A dev server must be running on <port>. Writes <outdir>/<mood>/NNN.png (the enemy's slot, as screenshots at about 12
// frames per second) and prints the measured fps; join them with `python art/lib/clip.py <outdir> clip.webp --fps 12 --step 1`.
// Moods come from `window.__game.rig.force` (the stage plays the rig's mood at the next frame); a forced death stays down.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(process.cwd() + '/package.json');
const { chromium } = require('@playwright/test');

const [port, id, out, moodList = 'idle,attack,hurt,phase,death', secs = '3'] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.addInitScript(() => window.localStorage.setItem('cs.tutorialDone', '1'));
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.__game);

for (const mood of moodList.split(',')) {
  await page.evaluate((e) => { window.__game.setSpeed('1x'); window.__game.cheat.runFight([e]); }, id);
  await page.waitForFunction(() => window.__game.rig.stats().painted.length >= 1, null, { timeout: 20000 });
  await page.waitForTimeout(700);
  const go = page.getByTestId('boss-intro-go');
  if (await go.isVisible().catch(() => false)) await go.click();
  await page.waitForTimeout(500);
  const box = await page.getByTestId('enemy-0').boundingBox();
  const clip = { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 10), width: Math.min(1280, box.width + 80), height: box.height + 20 };
  mkdirSync(`${out}/${mood}`, { recursive: true });
  if (mood !== 'idle') await page.evaluate(([m]) => window.__game.rig.force(0, m), [mood]);
  const t0 = Date.now();
  let n = 0;
  while (Date.now() - t0 < Number(secs) * 1000) {
    await page.screenshot({ path: `${out}/${mood}/${String(n++).padStart(3, '0')}.png`, clip });
  }
  console.log(mood, n, 'frames', (n / ((Date.now() - t0) / 1000)).toFixed(1), 'fps');
}
await browser.close();
