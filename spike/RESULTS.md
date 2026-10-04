# Machine spike results

Stack: Vite + strict TypeScript, Canvas 2D, no engine. Sim is `src/sim.ts` (pure), renderer `src/render.ts` (event-driven only).

## Benchmark (`npx tsx bench.ts`, Node 24, full 14-part board)
- 100,000 turns in 1.63 s: about 61,000 turns/sec (single thread), about 175 events per turn.
- Full-run sims/sec at ~200 turns per run (40 combats x 5 turns): about 300 per second per core. 10,000 runs take about 33 s on one core, less with workers.
- Determinism: same seed (42) twice gives identical FNV hash of all 100k event lists (3b93816a) and identical first 1000 event lists; seed 43 gives a different hash.
- Headroom: the sim allocates an event object per event and clones state per turn; an easy 2-3x is available if needed.

## FPS (`node measure.mjs`, Playwright headless Chromium, DPR 2, full board, 1x speed, turns back to back, 5 s of rAF deltas)
| Viewport | avg frame | fps | 1% worst | max |
|---|---|---|---|---|
| 1280x800 | 16.67 ms | 60.0 | 16.8 ms | 16.8 ms |
| 667x375 | 16.67 ms | 60.0 | 16.8 ms | 16.8 ms |

No frame missed vsync, zero page errors. Caveat: headless software rendering on this PC, so it shows the work fits in a 16.7 ms frame, not the headroom. Not tested on a real phone. Screenshots in `shots/`.
