// Record the title sample to PNG frames (deterministic stepping through window.title.seq()).
//   node art/title/record.mjs http://127.0.0.1:8774/art/title/title.html art/title/frames live:6 [WxH]
// Run from the repo root (Playwright is resolved from the current folder). Any page error is a failed check.
import { createRequire } from "module";
import { mkdirSync } from "fs";
const require = createRequire(process.cwd() + "/");
const { chromium } = require("playwright");
const [url, out, spec, size = "1280x800"] = process.argv.slice(2);
const [W, H] = size.split("x").map(Number);
const FPS = 30;
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => m.type() === "error" && errors.push(m.text()));
await page.goto(url);
await page.waitForFunction(() => window.title && window.title.ready);
const [name, secs] = spec.split(":");
mkdirSync(`${out}/${name}`, { recursive: true });
await page.evaluate(() => { window.__s = window.title.seq(); });
for (let i = 0; i < Math.round(FPS * Number(secs)); i++) {
  await page.evaluate(dt => window.__s.next(dt), 1 / FPS);
  await page.screenshot({ path: `${out}/${name}/${String(i).padStart(3, "0")}.png` });
}
console.log("errors:", JSON.stringify(errors));
await browser.close();
process.exit(errors.length ? 1 : 0);
