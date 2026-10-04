# Clockwork Spire: roadmap

Six build phases. Each ends at a gate where the game runs, `npm test` is green, the critic plays it, and the work is committed and pushed. Each phase is something you can try. Only the next phase is planned in detail; later ones are refined at their turn. Acceptance ids refer to `docs/acceptance.md`.

## Source layout (the contract every phase builds into)
```
src/core/      pure rules, no DOM: rng, types, board, machine (ticks), combat (turn flow, enemies),
               statuses, run (state machine), map, rewards, shop, meta (profile), save-schema (migrations)
src/core/content/  parts, enemies, trinkets, events, chassis, upgrades, glossary (data + hooks)
src/core/testkit.ts  combatWith(...) and other builders for tests
src/sim/       bot, career, report, cli (npm run sim)
src/render/    stage (canvas, timeline replay), draw/ (parts, enemies, sprocket), fx (particles, popups)
src/audio/     synth engine, sfx, music loops
src/ui/        Preact screens and components (DOM over the canvas)
src/app/       controller (state signal, actions, autosave), save (idb), debug (window.__game)
tests/         Vitest: core/, sim/, content/
e2e/           Playwright specs, run at 1280x800 and 667x375
```

## B1 Walking skeleton (sequential)
**You can try:** open the game, start a practice fight, place parts from your hand, see the preview, press Run, watch the machine animate, beat a Rust Mite or lose.
- Scaffold: Vite, TS strict, Preact, Vitest, Playwright, PWA plugin stub, scripts (`dev`, `build`, `test`, `test:unit`, `test:e2e`, `sim`).
- Core: rng streams, board, ticks, combat turn flow with 8 parts (spur, idler, coil, escapement, cam, boiler, piston, pendulum), the dummy and two act 1 enemies.
- Stage: canvas replay of the event timeline for those parts; pulses; damage popups; speed 1x, 2x, skip.
- UI: combat screen (hand, board, preview totals and badges, intents, HP, Run), a title screen with "Practice fight".
- `window.__game` (state, place, run, newFight, setSpeed). Autosave of one slot (IndexedDB) for the fight.
- Tests: M1-M4, M6, M11, M13, M14, M16, C1, C2, A1, P1-P3; one e2e fight at both sizes.
- One synthesized tick and chime so the machine is heard from day one.

## B2 The machine (lanes)
**You can try:** fight any enemy of any act with any parts, with tooltips, a glossary and a guided first fight.
- All 46 parts with upgrades and drawn art; statuses; sabotage (rust, jam, magnetize, drain); all 24 enemy behaviors at combat level; color-blind-safe intent icons; tooltips; glossary; guided first fight; impact sounds and steam.
- A combat-level simulator: the bot plays fights so the critic can see part impact early.
- Acceptance: M5, M7-M10, M12, M15, M17, C4, C5, O1, O2, Q3, Q7, BS1, BS5.

## B3 The run (lanes)
**You can try:** a full three-act run: map, fights, elites, events, forge, oil, shop, trinkets, the Foreman, the Boilermaker Queen and the Clockmaker; win or lose; reload resumes.
- Map generation and screen; run state machine; rewards; forge; oil; shop; 22 events (3 with Sprocket); 28 trinkets; bosses with phases and Rewind; run saving and resume; defeat and victory records.
- Acceptance: C3, C6-C9, R1-R9, W9.

## B4 Workshop, meta and Sprocket (lanes)
**You can try:** many runs in a row: earn Brass and blueprints, buy upgrades, unlock chassis, meet Sprocket after every run, three save slots, the victory ending and credits.
- Profile and slots; Workshop hub; upgrade bench; blueprints into the pool; chassis; Sprocket drawn, animated and barking with moods; ending and credits; the full balance simulator with careers, tuned to the targets.
- Acceptance: W1-W8, BS2-BS4.

## B5 Look, sound and quality of life (lanes)
**You can try:** the finished feel: music per act, Workshop and final boss; effects everywhere; settings; run history and statistics; how to play; installable and offline.
- Acceptance: O3, Q1, Q2, Q4, Q6, A2, A3, P4.

## B6 Hardening and release (sequential)
**You can try:** the release candidate.
- Performance pass on the stage; console error sweep; a full scripted victory from a fresh save (via `window.__game`, bot-driven, at skip speed); accessibility and phone polish; README how to run and play; final balance report; REPORT.md.
- Acceptance: Q5, Q7, P5 and everything still green. The final critic needs an average of at least 8.

## Why this order
- The machine is the riskiest and most important system, so it is proven first (B1) and completed second (B2), before anything depends on its numbers.
- The run (B3) needs every part and enemy to exist; meta and balance (B4) need complete runs to measure.
- Look and sound grow in every phase (each lane draws and sounds what it builds); B5 adds music, settings and the screens that only make sense once the game is whole.
- Parallel lanes start in B2, after the skeleton and the core contracts exist.
