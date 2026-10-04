// Record each mood to PNG frames with the Clockwork Spire repo's Playwright.
import { chromium } from "../../../node_modules/playwright/index.mjs";
import { mkdirSync } from "fs";
const FPS = 30, SECS = 4;
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 800, height: 760 } });
await page.goto("http://127.0.0.1:8765/sprocket.html");
await page.waitForFunction(() => window.ready);
const stage = page.locator("#stage");
for (const mood of ["idle", "happy", "sleepy"]) {
  mkdirSync(`frames/${mood}`, { recursive: true });
  await page.evaluate(m => { window.seq = window.renderSeq(m); }, mood);
  for (let i = 0; i < FPS * SECS; i++) {
    await page.evaluate(dt => window.seq.next(dt), 1 / FPS);
    await stage.screenshot({ path: `frames/${mood}/${String(i).padStart(3, "0")}.png` });
  }
  console.log(mood, "done");
}
await browser.close();
