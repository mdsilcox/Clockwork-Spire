import { chromium } from "../../../node_modules/playwright/index.mjs";
import { mkdirSync } from "fs";
const FPS = 30, SECS = { idle: 4, attack: 2.7, hurt: 1.8, overheat: 3 };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 560, height: 820 } });
const errors = []; page.on("pageerror", e => errors.push(e.message)); page.on("console", m => m.type() === "error" && errors.push(m.text()));
await page.goto("http://127.0.0.1:8766/foreman.html");
await page.waitForFunction(() => window.rig && window.rig.ready);
const stage = page.locator(".stage");
for (const [mood, secs] of Object.entries(SECS)) {
  mkdirSync(`frames/${mood}`, { recursive: true });
  await page.evaluate(m => { window.s = window.rig.seq(m); }, mood);
  for (let i = 0; i < Math.round(FPS * secs); i++) {
    await page.evaluate(dt => window.s.next(dt), 1 / FPS);
    await page.locator("body").screenshot({ path: `frames/${mood}/${String(i).padStart(3, "0")}.png`, clip: await stage.boundingBox().then(b => ({ x: b.x - 30, y: b.y - 30, width: b.width + 60, height: b.height + 40 })) });
  }
}
console.log("errors:", JSON.stringify(errors));
await browser.close();
