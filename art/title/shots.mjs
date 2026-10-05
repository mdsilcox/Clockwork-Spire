// Screenshots of the shipped title at both sizes (and with a delayed painting): node art/title/shots.mjs (a dev or preview server on PORT, default 5411)
import { mkdirSync } from 'fs';
import { chromium } from '@playwright/test';
const port = process.env.PORT || 5411;
mkdirSync('art/title/shots', { recursive: true });
const b = await chromium.launch();
for (const [name, w, h, touch] of [['desktop', 1280, 800, false], ['phone', 667, 375, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch });
  const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('cs.tutorialDone', '1'));
  await p.goto(`http://localhost:${port}/`);
  await p.waitForSelector('[data-testid="title-art"][data-loaded="true"]');
  for (const t of [0, 3000, 5000]) {
    await p.waitForTimeout(t ? 2500 : 500);
    await p.screenshot({ path: `art/title/shots/${name}-${t}.png` });
  }
  await ctx.close();
}
const ctx = await b.newContext({ viewport: { width: 667, height: 375 } });
const p = await ctx.newPage();
await p.addInitScript(() => localStorage.setItem('cs.tutorialDone', '1'));
await p.route('**/art/title/**', async (r) => {
  await new Promise((x) => setTimeout(x, 4000));
  await r.continue();
});
await p.goto(`http://localhost:${port}/`);
await p.waitForTimeout(800);
await p.screenshot({ path: 'art/title/shots/phone-delayed.png' });
await b.close();
