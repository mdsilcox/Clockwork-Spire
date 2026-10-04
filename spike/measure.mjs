// Samples requestAnimationFrame deltas for 5 s while a full board replays turns back to back at 1x.
import { chromium } from 'playwright';
const sizes = [[1280, 800, 'desktop'], [667, 375, 'phone']];
const browser = await chromium.launch();
for (const [w, h, name] of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://localhost:5310/');
  await page.evaluate(() => { window.__spike.fill(); window.__spike.setSpeed(1); });
  const res = await page.evaluate(async () => {
    const deltas = [];
    let stop = false, last = performance.now();
    const tick = t => { deltas.push(t - last); last = t; if (!stop) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const t0 = performance.now();
    let turns = 0;
    while (performance.now() - t0 < 5000) { await window.__spike.run(); turns++; }
    stop = true;
    deltas.shift();
    const s = [...deltas].sort((a, b) => a - b);
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const worst1 = s.slice(Math.floor(s.length * 0.99));
    return { frames: deltas.length, avgMs: avg, fps: 1000 / avg, p99Ms: s[Math.floor(s.length * 0.99)], maxMs: s[s.length - 1], worst1pctAvgMs: worst1.reduce((a, b) => a + b, 0) / worst1.length, turns };
  });
  console.log(name, w + 'x' + h, JSON.stringify(res), 'errors:', errors.length);
  // screenshot mid-replay
  await page.evaluate(() => { window.__spike.run(); });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `shots/${name}-${w}x${h}.png` });
  await page.close();
}
await browser.close();
