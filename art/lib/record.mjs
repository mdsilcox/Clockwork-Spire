// Record a rig page's moods to PNG frames, plus key-frame sheets for review.
// Run from a project that has Playwright installed (it is resolved from the current folder):
//   node ~/.claude/tools/art/record.mjs http://127.0.0.1:8766/foreman.html frames idle:4 attack:2.7 hurt:1.8
// The page must expose window.rig from Rig.mount (rig.seq(mood) steps frames deterministically).
// Prints page errors; any error is a failed check.
import { createRequire } from "module";
import { mkdirSync } from "fs";
const require = createRequire(process.cwd() + "/");
const { chromium } = require("playwright");
const [url, out, ...specs] = process.argv.slice(2);
const FPS = 30;
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 640, height: 900 } });
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => m.type() === "error" && errors.push(m.text()));
await page.goto(url);
await page.waitForFunction(() => window.rig && window.rig.ready);
const box = await page.locator(".stage").boundingBox();
for (const spec of specs) {
  const [mood, secs] = spec.split(":");
  mkdirSync(`${out}/${mood}`, { recursive: true });
  await page.evaluate(m => { window.__s = window.rig.seq(m); }, mood);
  for (let i = 0; i < Math.round(FPS * Number(secs)); i++) {
    await page.evaluate(dt => window.__s.next(dt), 1 / FPS);
    await page.screenshot({ path: `${out}/${mood}/${String(i).padStart(3, "0")}.png`, clip: box });
  }
}
console.log("errors:", JSON.stringify(errors));
await browser.close();
process.exit(errors.length ? 1 : 0);
