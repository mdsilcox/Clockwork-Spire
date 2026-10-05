# Clockwork Spire: project context

A turn-based roguelite for browser (desktop and phone landscape). The player builds a machine of clockwork parts on a 5x3 grid that runs each combat turn; runs climb a 3-act Spire; the Workshop between runs holds meta-progression and Sprocket the corgi. Full brief: `SPEC.md` (never edit it). Decisions: `DECISIONS.md`. State of the run: `PROGRESS.md`. Build report: `REPORT.md`.

## Stack and commands
Vite 8 + TypeScript 7 (strict, `tsc --noEmit`) + Preact 11 (`@preact/signals`, `.tsx`) for DOM UI; Canvas 2D for the machine/combat stage; Web Audio for every sound and music loop; Vitest 5; Playwright 1.63; `vite-plugin-pwa` (prompt-mode service worker); `idb` (IndexedDB). See DECISIONS.md D-006, D-007.
- `npm install && npm run dev` (port 5173). `npm run build` type-checks and builds `dist/`; `npm run preview` serves it.
- `npm test` = `test:unit` (Vitest, `tests/**`, includes the balance targets, about 30 s) + `test:e2e` (Playwright `e2e/`, projects `desktop` 1280x800 and `phone` 667x375 touch, port from `PW_PORT`, default 5320) + `test:offline` (production preview on 5432) (+ `test:career`, added in B6).
- `npm run sim -- --mode fights|runs|careers --seed 1 --date YYYY-MM-DD [--json path]` writes reports to `balance/`.
- Run parallel e2e with distinct `PW_PORT`s; stop dev servers by PID only.

## Key modules and interfaces
- `src/core/` pure rules: no DOM, no clock, seeded RNG streams (`rng.ts`: `initStreams`, `int/pick/shuffle(state, stream, ...)`).
  - `board.ts` `cell('B2')`, `neighbors(i)` (up, right, down, left). The Mainspring is A2 = index 5.
  - `machine.ts` `runMachine(c, events)`: BFS ticks, Boost, Echo, Pressure and overpressure, trinket hooks. `combat.ts` `createCombat({ seed, bin, enemies, hp, maxHp, kind, trinkets, handSize, chassis, noShuffle, pressure })`, `placePart`, `swapParts`, `setTarget`, `previewTurn` (machine on `cloneCombat`), `runTurn` (machine, enemy turn, next turn start). `enemy.ts` intents, sabotage, boss phases, Clockmaker Rewind.
  - `run.ts` run API: `newRun`, `availableNodes`, `enterNode`, `settleCombat`, `takeRewardPart/Trinket`, `chooseEvent`, `eventPickPart`, `makeShop`, `shopBuy`, `shopRemove`, `forgeUpgrade/Remove`, `oilRepair/Polish`, `leaveNode`, `abandonRun`, `brassFor`, `runRecord`. `map.ts` `generateActMap`; `rewards.ts`; `shop.ts`; `eventfx.ts` (event effects by id).
  - `meta.ts`: `newProfile`, `upgradeCost`, `buyUpgrade`, `runConfigFor`, `finishRun` (atomic, idempotent by seed), `chassisAvailable`, `buyChassis`, `sprocketMood`, `workshopNotes`.
  - `content/`: `parts` (46; `PARTS`, `partDef`), `enemies` (24 + summons + tutorial), `encounters`, `trinkets` (28), `events` (22), `chassis` (3), `upgrades`, `story`, `glossary`.
  - `types.ts` all state types (CombatState, GameEvent, RunState, Profile, SaveSlot, Settings); `defs.ts` (`PartDef`, `EnemyDef`, `TickCtx`); `testkit.ts` `combatWith({ board, enemies, hand, pressure, ticks, hp })`.
- `src/sim/`: `bot.ts` `chooseTurn`, `fight.ts`, `runbot.ts`, `run.ts` `playRun`, `career.ts` `playCareer`, `*-report.ts`, `cli.ts`.
- `src/render/`: `stage.ts` replays `GameEvent` timelines (never re-runs rules), `layout.ts` (shared with DOM overlays), `replay.ts`, `parts.ts`, `enemies.ts`, `bosses.ts`, `sprocket.ts` (`drawSprocket`, `SprocketView`), `kit.ts`, `palette.ts` (single color source).
- `src/audio/`: `synth.ts` (graph, limiter, channels, effects; muted under webdriver unless `?sound=1`), `music.ts` (`music`, `trackFor`, `audioDebug`; loops workshop, act1-3, clockmaker, ending), `sprocket.ts` (barks).
- `src/ui/`: Title, Slots, Workshop (+ WorkshopArt), Map, Nodes (+ NodeArt), Combat, End, Ending, Settings, HowTo, Glossary, Practice, Coach (tutorial), Tooltip/useTip, Sprocket, PortraitCard.
- `src/app/`: `controller.ts` (signals, actions, autosave, `window.__game` hooks and `cheat.*`), `save.ts` (IndexedDB slots and settings), `prefs.ts`, `sw-register.ts`.
- `tests/` Vitest (`core/` incl. `b1..b4.acceptance.test.ts`, `sim/targets.test.ts`, `ui/`, `audio/`, `build/`); `e2e/` Playwright (`helpers.ts` skips the first-launch tutorial); `scripts/icons*.mjs` code-drawn PWA icons written to build output only.
- `docs/` vision, rules, content, data model, acceptance, roadmap, `briefs/`. `review/<phase>/round-<n>.md` critic verdicts. `balance/` dated reports.

## Rules decisions worth knowing
Boost goes to every part the booster passes motion to (not cumulative); overpressure damage is absorbed by Plating; enemy rust lasts through the player's next machine run; Shell falls when its owner starts its turn; the machine stops ticking once every enemy is dead; all rare parts start locked (blueprints unlock them). More in DECISIONS.md.

## Version 2 (in progress)
v2 is owner-approved (D-027; choices D-029). Docs: `docs/vision-v2.md`, `docs/rules.md` and `docs/content.md` (v2; v1 frozen in `docs/v1/`), `docs/data-model.md` "Version 2", `docs/acceptance.md` sections 9 to 17, `docs/roadmap-v2.md`, lane briefs `docs/briefs/B7..B9a`. Phases done: B7 enemy machines, B8 the climb (main ef9c4e8), A1, A2 art; B9a wardens at its gate; next B9b rarity and achievements, B10 Bellfoot and difficulty.
- **Combat (B7)**: enemies are frames (`frame` on `EnemyDef`, `src/core/frames.ts`, `framelib.ts`): a core plus parts with cadences and actions; the target order (`TargetRef` 'e0.part'); Braced wardens with keystones and phases (`enemy.ts` `advancePhase`, `phaseActionPending`, `lastPhase` retraction); Rewind is a part action (`liftCombos`). Salvage tray after fights (`salvage.ts`).
- **Climb (B8)**: `src/core/section.ts` (generateSection, moveTo, hoursLeft, ringBell, useKey, pickLock, afterRoom), `rooms.ts` (workbench, trader barter, oil, vault), Scrap replaces Cogs, save version 2 (`migrate.ts`). `RunConfig.legacyMap` keeps v1 tests on the old map flow. UI `src/ui/Climb.tsx`.
- **Memory (B9a)**: `src/core/record.ts` (`recordFight` at every fight end, `mainPlan`, `memoryPlan`); `profile.planHistory` (last three); the Clockmaker's `memoryParts`.
- **Art (D-026, D-033)**: generated paintings rigged with `rig.js`; `art/<asset>/` sources, `npm run art` builds WebP into `public/art/` and `src/art/manifest.ts`; `src/art/<id>.ts` CharacterDefs; `src/render/rig.ts` RigHub (one WebGL layer between two stage canvases). One ComfyUI server at a time; stop it by PID.
- **Sim (v2)**: `src/sim/strat/` (`v2.ts` fights and `wardenStatsV2`, `climb.ts` executor, `decide.ts` route actions shared with `src/app/autoplay.ts`, `v2routes.ts`). Balance reports in `balance/`.
- Test hooks: `window.__game.cheat.*` (runFight, breakPart, breakPhase, winFight, startClimb, setPlanHistory, ...) and `__game.rig.*`; each e2e spec's header lists the ids and hooks it uses.

## Conventions
- American English, no em dashes anywhere (UI text, docs, comments). Short text; warm, curious, a little melancholy.
- Sound synthesized; no audio or font files. Images only as WebP under `public/art/`, each listed in `src/art/manifest.ts` with its source under `art/` (AR1: at most 120 KB per regular, 250 KB per warden, 6 MB in all); none in `src/`, no SVG.
- Rules change only in `src/core/` with a unit test; numbers come from `docs/content.md`; balance changes are logged in `balance/` and DECISIONS.md.
- UI: DOM over the canvas; `data-testid` on interactive elements; tap targets 40 px+, text 12 px+ at 667x375, no sideways scroll.
- Files to copy: a part `content/parts.ts` (spur, coil), an enemy `content/enemies.ts`, a screen `src/ui/Nodes.tsx`, an e2e `e2e/run.spec.ts`.

## Where plans live
Orchestra board project `clockwork-spire`, prefix `cs~` (https://claude.ai/artifact/Eqis6DgyZMefwhzFM1KNta). Lane briefs in `docs/briefs/`.
