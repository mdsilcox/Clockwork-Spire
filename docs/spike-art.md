# Spike: how the game shows rigged painted characters (D4.8)

Throwaway spike, lane `art-spike`. Code and raw results are in `spike/art/` (harness `public/harness.js`, shared-context rig `public/assets/rig-shared.js`, runners `bench.mjs`, `loss.mjs`, `looks.mjs`, `record.mjs`, `pack.py`, raw data `results-*.json`). Nothing here ships.

## Method and limits

- Page: 3 instances of the Foreman (`art/trial/foreman`, 896x1152 cut-out, mesh grid 112x144, 4 moods) on a 2D stage that also draws a gradient floor, a 5x3 grid and four turning gears every frame, the same in all modes.
- Chrome (Playwright 1.63, headless) on this machine: AMD RX 7900 XT through ANGLE/D3D11. Frame limiter and vsync switched off so frame time is the real cost, not 16.7 ms. 10 s measured after 1 s of warm-up; three runs per cell, table shows the median of the three runs' medians and p95s.
- Contexts: desktop 1280x800 at devicePixelRatio 1, rigs 300 css px tall; phone 667x375 at devicePixelRatio 2 with touch, rigs 150 css px tall. Each at CPU throttle 1x and 4x (CDP `Emulation.setCPUThrottlingRate`).
- "Work" is main-thread time in all requestAnimationFrame callbacks per frame, from a wrapper around rAF, so rig.js's own loops count. "Interval" is the time between frames. With a GPU that is not the bottleneck the two match; they match here in A and B. In C the loop runs at thousands of frames per second, so only its work figure means anything.
- Not measured: a real phone (4x throttle is a stand-in), GPU memory (sizes below are computed from texture and canvas dimensions, not read from a driver), a second DPR (desktop at 2x was not run), real combat with different enemies in each slot.

## Result 1: frame time, 3 rigs on screen (ms, median / p95)

| Context | Throttle | A: canvas per rig | B: shared context | C: sprite sheets |
|---|---|---|---|---|
| Desktop 1280x800, 3 x 300 px | 1x | 8.7 / 11.1 | 12.0 / 14.4 | 0.0 / 0.1 |
| Desktop 1280x800, 3 x 300 px | 4x | **51.6 / 54.4** | **51.8 / 56.5** | 0.1 / 0.3 |
| Phone 667x375 @2x, 3 x 150 px | 1x | 8.7 / 9.8 | 8.7 / 10.3 | 0.0 / 0.1 |
| Phone 667x375 @2x, 3 x 150 px | 4x | **51.6 / 55.1** | **51.8 / 55.3** | 0.2 / 0.3 |
| Desktop, software GL (no GPU), 3 x 300 px | 1x | 19.5 / 27.8 | 27.7 / 51.8 | 0.0 / 0.1 |
| Desktop, boss 720 px, 1 rig | 1x | 2.8 / 3.2 | 2.9 / 3.7 | n/a |
| Desktop, boss 720 px, 1 rig | 4x | 17.4 / 18.6 | 12.1 / 14.2 (one run 17.5) | n/a |

The headline is not A against B. In both, about 90 percent of the frame is the JavaScript loop that deforms the mesh: 113 x 145 = 16,385 vertices per rig, each through the character's `deform`, about 2.9 ms per rig per frame at 1x, so about 11.6 ms per rig at 4x. Three rigs at 4x take 52 ms, which is 19 frames per second on a phone-class CPU. The GPU side (a draw call with 32K triangles) and the number of canvases are not visible in these numbers. Texture size does not matter either (4x desktop A: 47.6 ms with the 640 px texture, 45.9 ms with 576 px, one run each, against 51.6 ms at full size).

The mesh grid is the lever that works (single runs, 4x throttle, three rigs):

| Mesh grid | Vertices per rig | A desktop | B desktop | A phone | B phone | Look against full grid |
|---|---|---|---|---|---|---|
| 112x144 (today) | 16,385 | 51.6 | 51.8 | 51.6 | 51.8 | reference |
| 56x72 (half) | 4,161 | 14.1 | 13.0 | 11.4 | 14.6 | mean pixel difference 0.23 of 255, not visible |
| 28x36 (quarter) | 1,073 | 4.1 | 3.9 | 3.8 | 4.2 | mean difference 0.60, slightly lumpy at the shoulder joints and tear edges (`spike/art/looks/contact.jpg`) |

So the budget formula is: ms per frame at throttle T = 2.9 x rigs x (vertices / 16,385) x T. Half grid puts three rigs at 13 to 15 ms on a 4x-throttled CPU, which holds 60 fps with room for the rest of the frame.

## Result 2: memory, download, startup, failure

| | A: canvas per rig | B: shared context | C: sprite sheets |
|---|---|---|---|
| GL contexts for 3 rigs (4 enemies plus Sprocket: 5) | 3 (5) | 1 | 0 |
| Canvases for 3 rigs | 9 (3 each: under, GL, over) | 1 GL canvas the size of the stage, never in the DOM | 0 extra |
| GPU texture per enemy, 896x1152 | 4.1 MB | 4.1 MB | n/a |
| GPU texture per enemy, 498x640 | 1.3 MB | 1.3 MB | n/a |
| Canvas memory (computed) | 3 x 3 x rect x dpr squared x 4 B: about 3 MB desktop 1x; 6 MB for a 720 px boss | stage size x dpr squared x 4 B: 4.1 MB at 1280x800 (4x that if the browser keeps antialias samples) | decoded sheets, see next rows |
| Decoded sprite sheets per enemy type, 4 moods, 161 frames, 291x300 px frames | n/a | n/a | **57.9 MB** |
| Same at 582x600 px frames (what a 300 px enemy needs at devicePixelRatio 2) | n/a | n/a | **231.8 MB** |
| Download per enemy, cut-out PNG, 896x1152 | 1,043 KB | 1,043 KB | n/a |
| Download per enemy, cut-out WebP q85, 896x1152 | **164 KB** | **164 KB** | n/a |
| Download per enemy, WebP q85, 498x640 | 77 KB | 77 KB | n/a |
| Download per enemy, WebP q85, 448x576 | 66 KB | 66 KB | n/a |
| Download per enemy, sprite sheets WebP q85 (1x frames) | n/a | n/a | 2,812 KB (PNG: 11,336 KB) |
| Download per enemy, sprite sheets WebP q85 (2x frames) | n/a | n/a | 8,539 KB (PNG: 39,725 KB) |
| Character code per enemy | about 8 KB | about 8 KB | about 3 KB meta |
| Startup to first frame, desktop, 1x (ms from navigation, localhost) | 203 | 125 | 244 |
| Startup to first frame, desktop, 4x throttle | 418 | 353 | 494 |
| WebGL context loss (`WEBGL_lose_context`) | bodies vanish for good; the 2D effects keep drawing; `restoreContext()` does nothing because rig.js never calls `preventDefault` on the lost event | bodies vanish while the context is lost and come back by themselves after the restore (about 12,000 teal pixels before, 0 during, 11,900 after); rebuild is 12 lines | not affected (2D canvas repaints each frame) |
| Code complexity | rig.js as is; 3 canvases per rig to place, size and keep above the stage in z-order | `rig-shared.js`, 200 lines; one `frame(ctx, now)` call, effects draw into the stage context, anchors come back in stage coordinates | recorder plus packer plus a 10-line player; no runtime GL, but every mood change means re-recording |

Startup is dominated by image decode and texture upload; A decodes and uploads the same 1 MB PNG three times, which probably explains most of its 80 ms extra (not isolated). One run in three of A at phone 4x did not finish within 90 s; cause not investigated.

### Cut-out size and look

| Cut-out | PNG | WebP q85 | Texture in GPU | Mean pixel difference against full size when drawn at 600 px |
|---|---|---|---|---|
| 896x1152 (full) | 1,043 KB | 164 KB | 4.13 MB | reference |
| 498x640 | 363 KB | 77 KB | 1.27 MB | 1.75 of 255 |
| 448x576 | 301 KB | 66 KB | 1.03 MB | 1.94 of 255 |

WebP q85 is 84 percent smaller than PNG for the same pixels. A 600 px-tall rig shows the painting at about 561 px, so 640 px is still 1.14x oversampled and the loss is slight softness in fine rivet detail (see `looks/contact.jpg`, rows 4 and 5). The "largest on-screen size times 2" rule gives about 640 px for a regular enemy (slot 330 x 340 css at devicePixelRatio 2) and about 1,350 px for a 720 px boss, which is more than the 1,152 px we have, so bosses use the full file.

## Result 3: what approach C loses

- Anchors move per recorded frame (10 to 15 per second), not continuously; fine for hit sparks, wrong for anything that tracks a fast limb. The recorder stores the chest anchor per frame as an example.
- Mood changes cut instead of blending (rig.js eases every parameter toward the new mood). Hurt flash, glow tied to HP phase, overheat jitter and any effect driven by game state are baked in.
- The idle loop for the Foreman is 6.7 s (breath and head drift have different periods), so 67 frames; steam puffs are random in the recording and repeat visibly. Three copies of one enemy play in lockstep unless each is given a time offset.
- Screen shake is removed from the recording and must be added by the stage.
- Memory is the killer: 58 MB of decoded frames for one enemy type at 1x, 232 MB at 2x. A fight with three different enemy types would hold 170 to 700 MB. Cutting to 8 frames per mood would still be 12 to 46 MB per type and would look like a flipbook.

## Recommendation

Use B, the shared WebGL context composited into the 2D stage, with WebP q85 textures (498x640 for regular enemies and elites, 896x1152 for bosses) and a mesh grid at half density (56x72) by default. B is not faster than A (the CPU mesh loop costs the same), but it needs one GL context instead of one per rig (Chrome keeps about 16 live contexts and drops the oldest; known limit, not tested here), recovers from context loss, draws effects straight into the stage so z-order with DOM overlays is a non-issue, and hands anchors back in stage coordinates. The frame budget comes from the grid, not from the approach: at half grid three rigs cost about 14 ms at 4x throttle, so keep C only as an optional low-tier fallback if a device cannot hold 30 fps with the half grid.

Unmeasured levers if the half grid is still too heavy: deform at 30 Hz while a rig is idle, skip rigs that are off screen, and move bone transforms into the vertex shader for characters whose deform is plain rotations about joints.

## Loading contract

Sources stay in `art/<asset>/` (cut.png, prompt files, the character script). A build step writes the shipped files; nothing in `src/` is an image.

```
art/<asset>/cut.png                       source of truth (never shipped)
public/art/<asset>/cut.webp               regular tier, 498x640, WebP q85
public/art/<asset>/cut@boss.webp          full tier, only for bosses
src/art/<asset>.ts                        the character: a typed rig definition, pure functions (no DOM)
src/art/manifest.ts                       generated: [{ id, act, files: [{ path, bytes }], source }]
src/render/rig.ts                         the shared-context hub (typed port of rig-shared.js)
scripts/art.mjs                           `npm run art`: PNG to WebP, size check, writes manifest.ts; run from `npm run build`
```

Character module. A character exports one object and nothing else:

```ts
// src/art/foreman.ts
export const foreman: CharacterDef = {
  id: 'foreman', size: [896, 1152], grid: [56, 72], pad: [150, 40],
  texture: { regular: 'art/foreman/cut.webp', boss: 'art/foreman/cut@boss.webp' },
  weights, deform, part, tear, moods, pose, under, over,
  anchors: { chest: [447, 420, 60], mouth: [447, 585, 30], eyeL: [418, 202, 14] },
};
```

`CharacterDef` is the rig.js contract (`size, grid, pad, weights, deform, pose, moods, under, over, anchors`) plus `id` and `texture`. `weights` and `deform` are pure, so Vitest can check that a pose moves an anchor where the rules expect it. The texture URL is joined with `import.meta.env.BASE_URL`.

Stage use. `Stage` owns one `RigHub` (created once, resized with the stage). In the enemy-drawing step it replaces `drawEnemy` with:

```ts
const h = hub.add(def, rectForSlot(slot));   // rect from enemySlots(L, n), fit to the 1196:1232 aspect
h.setMood('attack');                          // from the GameEvent timeline
const [x, y, r] = h.anchor('chest')!;         // stage CSS px, same space as layout.ts rects and the DOM overlays
hub.frame(ctx, now);                          // once per stage frame, after the machine, before text overlays
h.dispose();                                  // frees the texture when the enemy leaves
```

`anchor(id)` reads the last drawn pose, so event replay can ask for the chest, mouth or a breakable part in the same coordinate space the stage already uses. The old code-drawn `drawEnemy` stays as the fallback while a texture loads, when WebGL is missing, and when a texture fails to load (inline error and retry on the node screen).

Lazy loading per act. `manifest.ts` tags each asset with an act (workshop assets are act 0). `loadAct(n)` fetches and decodes that act's textures with `Image.decode()` while the player is on the map; combat entry waits only for the node's own enemies (`preload(ids)`), usually already cached. The service worker precaches the workshop and act 1 files and caches `/art/` with a cache-first runtime rule for the rest, so the first install stays small: at about 80 KB per regular enemy and 170 KB per boss, a whole 24-enemy bestiary is about 2.5 MB. Context loss is handled inside the hub (rebuild textures from the kept images, no game state touched).

## Rescoping test A1 (`tests/core/b1.acceptance.test.ts`, "A1: no image, font or audio files ship")

The test today bans every image, font and audio extension under `src/` and `public/`. Replace it with four checks, so painted art is allowed in one place and nothing else changes:

1. No audio and no font files anywhere under `src/` or `public/` (`.mp3 .ogg .wav .m4a .ttf .otf .woff .woff2`). Sound stays synthesized and text stays on system fonts.
2. Images only as `.webp`, and only under `public/art/`. No image of any kind under `src/`; no `.png .jpg .gif .svg` under `public/`. (The PWA icons are drawn by `scripts/icons*.mjs` into the build output only and are not scanned.)
3. Every file under `public/art/` is listed in `src/art/manifest.ts` with a `source` path that exists under `art/`, and every manifest entry has its file on disk.
4. Size budget: each regular cut-out at most 120 KB, each boss cut-out at most 250 KB, all of `public/art/` at most 6 MB.

The check on `.svg` stays banned because an SVG could carry hand-drawn art outside the manifest.
