// `npm run art`: ships the painted art (D-033, docs/spike-art.md). Reads each passed asset's cut-outs from art/<asset>/
// (PNG, the source of truth, never shipped), writes WebP q85 under public/art/<asset>/, checks the size budget and
// regenerates src/art/manifest.ts (MANIFEST, act-tagged). Runs before `npm run build`.
// WebP encoding needs Python with PIL (Node has no encoder): set ART_PYTHON, or it tries E:/AI/rembg/.venv, then `python`.
// With no PIL available it only checks that every output exists and is up to date, so a build elsewhere still works.
// Flags: --force (re-encode everything).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');

// Regular enemies and elites ship at 0.5557 of the toolkit's size (498x640 for a portrait, 676x462 for a landscape);
// wardens also ship the full-size `cut@boss.webp` (`boss: true`). Act 0 = Bellfoot and the player. `extra` are more
// paintings of the same asset (Sprocket's happy muzzle, the Tinpot General's hat and blade): name -> source PNG.
// Add an asset here when it passes review.
const REGULAR = 0.5557;
const ASSETS = [
  { id: 'cog-rat', act: 1 },
  { id: 'rust-mite', act: 1 },
  { id: 'brass-beetle', act: 1 },
  { id: 'oil-slick', act: 1 },
  { id: 'spring-imp', act: 1 },
  { id: 'gearhound', act: 1 },
  { id: 'tinpot-general', act: 1, extra: { hat: 'hat', blade: 'blade' } },
  // wardens (B9a): one file per painting at 0.78 (699x899), a 250 KB budget each; the Foreman's second painting is a stacked layer
  { id: 'foreman', act: 1, warden: true, scale: 0.78, extra: { 'cut-phase2': 'cut-phase2' } },
  { id: 'boilermaker', act: 2, warden: true, scale: 0.78 },
  { id: 'clockmaker', act: 3, warden: true, scale: 0.78 },
  { id: 'tinker', act: 0, scale: 0.7 },
  { id: 'sprocket', act: 0, scale: 0.7, extra: { 'cut-happy': 'cut-happy' } },
];
// Scenes (B10a.3): a layered painting assembled from pieces into art/<id>/layers/<name>.png (art/<id>/build.py), shipped as one
// WebP per layer. `scale` is the layer's size against its source, `quality` the WebP quality. A scene gets 600 KB in all
// (src/art/scenes/<id>.ts lists the layers and their parallax; keep the two in step). A scene whose layers are not built yet is skipped.
const SCENES = [
  {
    id: 'bellfoot',
    act: 0,
    layers: [
      { name: 'sky', scale: 1, quality: 82 },
      { name: 'street', scale: 1, quality: 88 },
      { name: 'foreground', scale: 1, quality: 86 },
    ],
  },
];
const SCENE_MAX = 600 * 1024;
const REGULAR_MAX = 120 * 1024;
const WARDEN_MAX = 250 * 1024;
const TOTAL_MAX = 6 * 1024 * 1024;

const jobs = [];
for (const a of ASSETS) {
  const scale = a.scale ?? REGULAR;
  const files = [{ name: 'cut', src: 'cut', scale }];
  if (a.boss) files.push({ name: 'cut@boss', src: 'cut', scale: 1 });
  for (const [name, src] of Object.entries(a.extra ?? {})) files.push({ name, src, scale });
  a.files = files.map((f) => ({ ...f, srcPath: `art/${a.id}/${f.src}.png`, dst: `art/${a.id}/${f.name}.webp` }));
  for (const f of a.files) {
    if (!existsSync(join(root, f.srcPath))) throw new Error(`art: missing source ${f.srcPath}`);
    const out = join(root, 'public', f.dst);
    const stale = force || !existsSync(out) || statSync(out).mtimeMs < statSync(join(root, f.srcPath)).mtimeMs;
    if (stale) jobs.push({ src: join(root, f.srcPath), dst: out, scale: f.scale, quality: 85 });
  }
}

const sceneEntries = [];
for (const sc of SCENES) {
  const files = sc.layers.map((l) => ({ ...l, srcPath: `art/${sc.id}/layers/${l.name}.png`, dst: `art/${sc.id}/${l.name}.webp` }));
  if (files.some((l) => !existsSync(join(root, l.srcPath)))) {
    console.log(`art: scene ${sc.id} skipped (layers not built: node/python art/${sc.id}/build.py)`);
    continue;
  }
  for (const l of files) {
    const out = join(root, 'public', l.dst);
    const stale = force || !existsSync(out) || statSync(out).mtimeMs < statSync(join(root, l.srcPath)).mtimeMs;
    if (stale) jobs.push({ src: join(root, l.srcPath), dst: out, scale: l.scale, quality: l.quality });
  }
  sceneEntries.push({ ...sc, files });
}

function findPython() {
  const candidates = [process.env.ART_PYTHON, 'E:/AI/rembg/.venv/Scripts/python.exe', 'python', 'python3'].filter(Boolean);
  for (const py of candidates) {
    if ((py.includes('/') || py.includes('\\')) && !existsSync(py)) continue;
    const r = spawnSync(py, ['-c', 'import PIL'], { encoding: 'utf8' });
    if (r.status === 0) return py;
  }
  return null;
}

if (jobs.length > 0) {
  const py = findPython();
  if (!py) {
    console.error(`art: ${jobs.length} WebP file(s) are missing or stale and no Python with PIL was found (set ART_PYTHON).`);
    process.exit(1);
  }
  const r = spawnSync(py, [join(root, 'scripts/art_webp.py')], { input: JSON.stringify(jobs), encoding: 'utf8', cwd: root });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
  process.stdout.write(r.stdout);
} else {
  console.log('art: every WebP is up to date');
}

// manifest and size budget
let total = 0;
const entries = [];
for (const a of ASSETS) {
  const files = a.files.map((f) => {
    const bytes = statSync(join(root, 'public', f.dst)).size;
    const max = a.warden ? WARDEN_MAX : REGULAR_MAX;
    if (bytes > max) throw new Error(`art: ${f.dst} is ${bytes} bytes, over the ${max} budget`);
    total += bytes;
    return { path: f.dst, bytes };
  });
  entries.push({ id: a.id, act: a.act, files, source: `art/${a.id}` });
}
for (const sc of sceneEntries) {
  const files = sc.files.map((l) => ({ path: l.dst, bytes: statSync(join(root, 'public', l.dst)).size }));
  const sum = files.reduce((n, x) => n + x.bytes, 0);
  if (sum > SCENE_MAX) throw new Error(`art: scene ${sc.id} is ${sum} bytes, over the ${SCENE_MAX} budget`);
  total += sum;
  entries.push({ id: sc.id, act: sc.act, files, source: `art/${sc.id}` });
}
if (total > TOTAL_MAX) throw new Error(`art: ${total} bytes shipped, over the ${TOTAL_MAX} budget`);

const lines = [
  '// GENERATED by `npm run art` (scripts/art.mjs). Do not edit: add an asset to the list in that script.',
  '// Every `files[].path` is relative to `public/` and `bytes` is the file size on disk; `source` is the art/<asset> folder.',
  "import type { ManifestEntry } from './types';",
  '',
  'export const MANIFEST: ManifestEntry[] = [',
];
for (const e of entries) {
  lines.push('  {');
  lines.push(`    id: '${e.id}',`);
  lines.push(`    act: ${e.act},`);
  lines.push('    files: [');
  for (const f of e.files) lines.push(`      { path: '${f.path}', bytes: ${f.bytes} },`);
  lines.push('    ],');
  lines.push(`    source: '${e.source}',`);
  lines.push('  },');
}
lines.push('];', '');
const out = join(root, 'src/art/manifest.ts');
mkdirSync(dirname(out), { recursive: true });
const text = lines.join('\n');
if (!existsSync(out) || readFileSync(out, 'utf8') !== text) writeFileSync(out, text);
console.log(`art: ${entries.length} assets, ${(total / 1024).toFixed(0)} KB in all`);
