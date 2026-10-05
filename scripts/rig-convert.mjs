// First pass of turning a rig template (art/<asset>/<asset>.template.html) into a CharacterDef module
// (src/art/<asset>.ts, D-033). Mechanical only: it keeps the template's script up to `Rig.mount(`, swaps the helper
// import, gives pose() the typed mood and the view, halves the mesh grid and appends the typed export. What it
// cannot do: DOM and image code (alpha, hit flashes, notch erasing, sprites), the
// part-id anchors and `notches`. Fix those by hand, then run `npx tsc --noEmit`.
// Usage: node scripts/rig-convert.mjs <asset> [--grid 76,52] [--out src/art/<asset>.ts]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const id = args[0];
if (!id) throw new Error('usage: node scripts/rig-convert.mjs <asset> [--grid gx,gy] [--out file]');
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const html = readFileSync(join(root, `art/${id}/${id}.template.html`), 'utf8');
const rigJson = JSON.parse(readFileSync(join(root, `art/${id}/rig.json`), 'utf8'));
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((s) => !s.includes('__RIGJS__'));
let js = scripts[0];
const mount = js.match(/^(?:const|let) \w+ = Rig\.mount\(.*?,\s*(\w+),/m);
if (!mount) throw new Error('no Rig.mount( found');
const name = mount[1];
js = js.slice(0, js.indexOf(mount[0]));
js = js.replace(/^const \{[^}]*\} = Rig;\s*$/m, '');
js = js.replace(/pose\(L, t, dt, S, api\) \{/, `pose(L, t, dt, S, mood, api = makeView(${name}, mood, S)) {`);
const gridM = js.match(/grid:\s*\[(\d+),\s*(\d+)\]/);
// D-033: about 4000 vertices per rig (56x72 for a portrait, 76x52 for a landscape); a template already below that keeps its grid.
const f = Math.min(1, Math.sqrt(4200 / (gridM[1] * gridM[2])));
const grid = opt('--grid') ? opt('--grid').split(',').map(Number) : [Math.round(gridM[1] * f), Math.round(gridM[2] * f)];

const out = `// @ts-nocheck
// ${id}: converted from art/${id}/${id}.template.html by scripts/rig-convert.mjs, then fixed by hand (D-033).
// The rig code is the template's own (loose types on purpose: it is animation code, checked by looking at it);
// the typed surface is the CharacterDef export at the bottom. Mesh grid is half the template's.
import { band, finishDef, makeView, rad, rot, smooth } from './kit';
import type { CharacterDef } from './types';
${js.trimEnd()}

const def: CharacterDef = {
  ...${name},
  id: '${id}',
  grid: [${grid[0]}, ${grid[1]}],
  facing: '${rigJson.facing ?? 'left'}',
  durations: ${JSON.stringify(rigJson.durations ?? {})},
  texture: { regular: 'art/${id}/cut.webp' },
};
export default finishDef(def);
`;
writeFileSync(opt('--out') ?? join(root, `src/art/${id}.ts`), out);
console.log(`${id}: ${out.split('\n').length} lines, rig object '${name}', grid ${grid.join('x')}`);

