// `npx tsx scripts/bench-deform.ts [id...]`: the CPU cost of one mesh deform per character (no browser, no GPU).
// The RigHub does this for every live rig every frame; D-033's budget is about 14 ms for three rigs at a 4x slowdown.
import type { CharacterDef } from '../src/art/types';

const ids = process.argv.length > 2 ? process.argv.slice(2) : ['cog-rat', 'rust-mite', 'brass-beetle', 'oil-slick', 'spring-imp', 'gearhound', 'tinpot-general', 'tinker', 'sprocket'];
for (const id of ids) {
  const def = ((await import(`../src/art/${id}.ts`)) as { default: CharacterDef }).default;
  const [GX, GY] = def.grid;
  const rest: number[] = [];
  const wts: Record<string, number>[] = [];
  for (let j = 0; j <= GY; j++) {
    for (let i = 0; i <= GX; i++) {
      const x = (i / GX) * def.size[0];
      const y = (j / GY) * def.size[1];
      rest.push(x, y);
      wts.push(def.weights(x, y));
    }
  }
  const live: Record<string, number> = { ...def.moods.idle };
  const state: Record<string, unknown> = {};
  let sink = 0;
  const frames = 300;
  const t0 = performance.now();
  for (let f = 0; f < frames; f++) {
    const P = def.pose(live, f / 60, 1 / 60, state, 'idle');
    for (let k = 0; k < wts.length; k++) {
      const r = def.deform(rest[2 * k], rest[2 * k + 1], wts[k], P);
      sink += r[0] + r[1];
    }
  }
  const ms = (performance.now() - t0) / frames;
  console.log(`${id.padEnd(15)} ${wts.length} vertices  ${ms.toFixed(2)} ms per frame (pose and deform)  ${sink > 0 ? '' : ' '}`);
}
