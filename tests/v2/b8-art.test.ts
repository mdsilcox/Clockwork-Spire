// B8 acceptance: painted art ships as WebP under public/art/ with a manifest, and every act 1 character is a rig
// (docs/acceptance.md AR1, AR2; D-033's rescope of v1's A1; docs/spike-art.md). Act 1 assets only: the Foreman's phase
// layer waits for B9, acts 2 and 3 come in A2. Written by the orchestrator's test-porter in the B8.0 contract step.
//
// CONTRACT for the rig-hub lane:
//   src/art/manifest.ts   exports `MANIFEST: ManifestEntry[]` (src/art/types.ts); each `files[].path` is relative to
//                         `public/` (e.g. 'art/cog-rat/cut.webp'), `bytes` is the file's size on disk, `source` is
//                         'art/<asset>' (a folder that exists), `act` 1 for the enemies, 0 for sprocket and tinker.
//   src/art/<id>.ts       one module per asset; its default export is the CharacterDef (id equal to the asset id).
import { existsSync, readdirSync, statSync } from 'fs';
import { extname, join } from 'path';
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/core/content/enemies';
import { MANIFEST } from '../../src/art/manifest';
import type { CharacterDef } from '../../src/art/types';

const ACT1_ENEMIES = ['cog-rat', 'rust-mite', 'brass-beetle', 'oil-slick', 'spring-imp', 'gearhound', 'tinpot-general'];
const ACT1_ASSETS = [...ACT1_ENEMIES, 'tinker', 'sprocket'];

const KB = 1024;
const REGULAR_MAX = 120 * KB;
const WARDEN_MAX = 250 * KB;
const TOTAL_MAX = 6 * KB * KB;
const SCENE_MAX = 600 * KB; // a painted scene (Bellfoot) is budgeted as a whole, not per file
const SCENES = ['bellfoot'];

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
const norm = (p: string): string => p.replace(/\\/g, '/');
const isWarden = (id: string): boolean => ENEMIES[id]?.tier === 'boss';

describe('AR1: painted art ships as WebP under public/art/, listed in the manifest (D-033)', () => {
  it('no audio or font files anywhere in src/ or public/, and no SVG', () => {
    const banned = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.flac', '.aac', '.opus', '.ttf', '.otf', '.woff', '.woff2', '.eot', '.svg']);
    const found = [...walk('src'), ...walk('public')].filter((p) => banned.has(extname(p).toLowerCase()));
    expect(found.map(norm)).toEqual([]);
  });

  it('images are only WebP files under public/art/; none in src/', () => {
    const images = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp', '.ico']);
    const inSrc = walk('src').filter((p) => images.has(extname(p).toLowerCase()));
    expect(inSrc.map(norm)).toEqual([]);
    const stray = walk('public')
      .filter((p) => images.has(extname(p).toLowerCase()))
      .filter((p) => !(norm(p).startsWith('public/art/') && extname(p).toLowerCase() === '.webp'));
    expect(stray.map(norm)).toEqual([]);
  });

  it('the manifest lists every act 1 asset (the seven enemies, the tinker, Sprocket) with ids unique', () => {
    const ids = MANIFEST.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ACT1_ASSETS) expect(ids, id).toContain(id);
  });

  it('every manifest entry has its files on disk (WebP under art/), the stated size, and a source folder under art/', () => {
    expect(MANIFEST.length).toBeGreaterThanOrEqual(ACT1_ASSETS.length);
    for (const e of MANIFEST) {
      expect(e.files.length, e.id).toBeGreaterThan(0);
      for (const f of e.files) {
        expect(f.path.startsWith('art/'), `${e.id} ${f.path}`).toBe(true);
        expect(extname(f.path).toLowerCase(), `${e.id} ${f.path}`).toBe('.webp');
        const abs = join('public', f.path);
        expect(existsSync(abs), `${e.id}: ${abs} exists`).toBe(true);
        expect(statSync(abs).size, `${e.id}: ${f.path} bytes`).toBe(f.bytes);
      }
      expect(e.source.replace(/\/$/, '').startsWith('art/'), `${e.id} source`).toBe(true);
      expect(existsSync(e.source), `${e.id}: source ${e.source} exists`).toBe(true);
    }
  });

  it('every WebP under public/art/ is listed in the manifest (nothing ships unlisted)', () => {
    const listed = new Set(MANIFEST.flatMap((e) => e.files.map((f) => `public/${f.path}`)));
    const onDisk = walk('public/art').map(norm).filter((p) => p.toLowerCase().endsWith('.webp'));
    expect(onDisk.length).toBeGreaterThan(0);
    for (const p of onDisk) expect(listed.has(p), p).toBe(true);
  });

  it('size budgets: at most 120 KB per regular cut-out, 250 KB per warden, 600 KB per scene in all, 6 MB in all', () => {
    expect(MANIFEST.length).toBeGreaterThan(0);
    let total = 0;
for (const e of MANIFEST) {      if (SCENES.includes(e.id)) {        const sum = e.files.reduce((n, f) => n + f.bytes, 0);        expect(sum, `scene ${e.id}`).toBeLessThanOrEqual(SCENE_MAX);        total += sum;        continue;      }      for (const f of e.files) {        const max = isWarden(e.id) ? WARDEN_MAX : REGULAR_MAX;        expect(f.bytes, `${e.id} ${f.path}`).toBeLessThanOrEqual(max);        total += f.bytes;      }    }
    expect(total).toBeLessThanOrEqual(TOTAL_MAX);
  });
});

// ---------- AR2: every act 1 asset is a rig ----------

const MOODS: Record<string, string[]> = {
  sprocket: ['idle', 'happy', 'sleepy', 'walk'],
  tinker: ['idle', 'walk', 'cheer', 'hurt'],
};
const moodsFor = (id: string): string[] => MOODS[id] ?? ['idle', 'attack', 'hurt', 'death'];

/** Anchors a def must have: one per part of the enemy's frame, plus 'core' and 'eyes' (Sprocket and the tinker: core and eyes). */
const anchorsFor = (id: string): string[] => [...(ENEMIES[id]?.frame?.parts.map((p) => p.id) ?? []), 'core', 'eyes'];

async function load(id: string): Promise<CharacterDef> {
  const file = `src/art/${id}.ts`;
  expect(existsSync(file), `${file} exists`).toBe(true);
  const mod = (await import(`../../src/art/${id}.ts`)) as { default?: CharacterDef };
  expect(mod.default, `${file} has a default export`).toBeTruthy();
  return mod.default as CharacterDef;
}

describe('AR2: each act 1 character loads as a rig with its moods and an anchor for every part', () => {
  it('every act 1 enemy def is a frame with parts to anchor (the test reads them from content)', () => {
    for (const id of ACT1_ENEMIES) expect(ENEMIES[id]?.frame?.parts.length, id).toBeGreaterThan(0);
  });

  it('the manifest says where each lives: enemies in act 1, Sprocket and the tinker in act 0', () => {
    for (const id of ACT1_ASSETS) {
      const e = MANIFEST.find((x) => x.id === id);
      expect(e, id).toBeTruthy();
      expect(e?.act, id).toBe(id === 'sprocket' || id === 'tinker' ? 0 : 1);
    }
  });

  for (const id of ACT1_ASSETS) {
    describe(id, () => {
      it('is a CharacterDef module with the right id, geometry and a texture the manifest ships', async () => {
        const def = await load(id);
        expect(def.id).toBe(id);
        expect(def.size[0]).toBeGreaterThan(0);
        expect(def.size[1]).toBeGreaterThan(0);
        expect(def.grid[0]).toBeGreaterThan(0);
        expect(def.grid[1]).toBeGreaterThan(0);
        expect(def.grid[0]).toBeLessThanOrEqual(def.size[0]);
        expect(def.grid[1]).toBeLessThanOrEqual(def.size[1]);
        expect(['left', 'right']).toContain(def.facing);
        const shipped = new Set(MANIFEST.find((e) => e.id === id)?.files.map((f) => f.path));
        expect(shipped.has(def.texture.regular), `${def.texture.regular} is in the manifest`).toBe(true);
        for (const t of Object.values(def.texture.layers ?? {})) expect(shipped.has(t), t).toBe(true);
      });

      it(`has the moods ${moodsFor(id).join(', ')}, each different from idle, and pose() runs`, async () => {
        const def = await load(id);
        for (const m of moodsFor(id)) expect(def.moods[m], `mood ${m}`).toBeTruthy();
        for (const m of moodsFor(id).filter((x) => x !== 'idle')) {
          expect(JSON.stringify(def.moods[m]), `${m} differs from idle`).not.toBe(JSON.stringify(def.moods.idle));
        }
        const live: Record<string, number> = {};
        const state: Record<string, unknown> = {};
        for (const m of moodsFor(id)) {
          const P = def.pose(live, 0.5, 1 / 60, state, m);
          expect(typeof P, m).toBe('object');
        }
      });

      it(`has an anchor for ${anchorsFor(id).join(', ')} inside the painting, and the mesh functions are finite there`, async () => {
        const def = await load(id);
        for (const a of anchorsFor(id)) {
          const v = def.anchors[a];
          expect(v, `anchor ${a}`).toBeTruthy();
          expect(v[0], `${a} x`).toBeGreaterThanOrEqual(0);
          expect(v[0], `${a} x`).toBeLessThanOrEqual(def.size[0]);
          expect(v[1], `${a} y`).toBeGreaterThanOrEqual(0);
          expect(v[1], `${a} y`).toBeLessThanOrEqual(def.size[1]);
          expect(v[2], `${a} radius`).toBeGreaterThan(0);
        }
        const [x, y] = def.anchors.core;
        const w = def.weights(x, y);
        const P = def.pose({}, 0.5, 1 / 60, {}, 'idle');
        const out = def.deform(x, y, w, P);
        expect(Number.isFinite(out[0]) && Number.isFinite(out[1])).toBe(true);
      });
    });
  }
});

// ---------- AR2 (B9a): the three wardens also have a `phase` mood ----------
// Contract for the warden-rigs lane: src/art/foreman.ts, boilermaker.ts, clockmaker.ts, listed in the manifest (act 1, 2, 3),
// moods idle, attack, hurt, death AND phase; an anchor for every part of every phase (and the Clockmaker's four memory parts);
// the Foreman's texture.layers has `phase2` (the second painting, crossfaded at the phase change).
const WARDEN_IDS = ['foreman', 'boilermaker', 'clockmaker'];
const MEMORY_IDS = ['mem-drill', 'mem-governor', 'mem-valve', 'mem-chime'];

describe('AR2 (B9a): the wardens load as rigs with a phase mood and an anchor for every part of every phase', () => {
  for (const id of WARDEN_IDS) {
    describe(id, () => {
      it('is in the manifest and has the moods idle, attack, hurt, death and phase, each different from idle, and pose() runs', async () => {
        expect(MANIFEST.find((e) => e.id === id), `${id} in the manifest`).toBeTruthy();
        const def = await load(id);
        expect(def.id).toBe(id);
        for (const m of ['idle', 'attack', 'hurt', 'death', 'phase']) expect(def.moods[m], `mood ${m}`).toBeTruthy();
        expect(JSON.stringify(def.moods.phase), 'phase differs from idle').not.toBe(JSON.stringify(def.moods.idle));
        expect(typeof def.pose({}, 0.5, 1 / 60, {}, 'phase')).toBe('object');
      });

      it('has an anchor inside the painting for every part of every phase, the core and the eyes', async () => {
        const def = await load(id);
        const phases = ENEMIES[id]?.frame?.phases;
        expect(phases?.length, `${id} has frame.phases`).toBeGreaterThan(0);
        const ids = [...(phases ?? []).flatMap((p) => p.parts.map((d) => d.id)), ...(id === 'clockmaker' ? MEMORY_IDS : []), 'core', 'eyes'];
        for (const a of ids) {
          const v = def.anchors[a];
          expect(v, `anchor ${a}`).toBeTruthy();
          expect(v[0], `${a} x`).toBeGreaterThanOrEqual(0);
          expect(v[0], `${a} x`).toBeLessThanOrEqual(def.size[0]);
          expect(v[1], `${a} y`).toBeGreaterThanOrEqual(0);
          expect(v[1], `${a} y`).toBeLessThanOrEqual(def.size[1]);
          expect(v[2], `${a} radius`).toBeGreaterThan(0);
        }
      });
    });
  }

  it('the Foreman has a stacked layer for phase 2 that the manifest ships', async () => {
    const def = await load('foreman');
    const layer = def.texture.layers?.phase2;
    expect(layer, 'texture.layers.phase2').toBeTruthy();
    expect(MANIFEST.find((e) => e.id === 'foreman')?.files.map((f) => f.path)).toContain(layer);
  });
});
