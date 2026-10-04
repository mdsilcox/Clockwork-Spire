# Decisions

Every choice the spec leaves open, with its reason. Newest last. The spec (`SPEC.md`) is never edited; interpretations live here.

## 2026-10-04 · Phase 0

**D-001 Track: Medium.** The spec settles the concept, audience and content list, so a separate ideation phase would only restate it. What is genuinely open is the engine (needs a spike), the machine rules, the data model, acceptance tests and the roadmap. Medium track: D1 "Concept and stack" (vision page drawn from the spec, engine options, a spike of the machine simulation and its animation); D2 "Design" (data model, full rules, content catalog plan, acceptance tests, roadmap folded in). Then build phases. Rejected Large (five separately reviewed discovery phases cost five critic rounds for documents the spec already half-writes) and Small (too much content and too many systems for one combined brief).

**D-002 Autonomous mode.** The owner is unavailable. The critic (`.claude/agents/critic.md`) replaces every approval; I never write to the board's `approvals` or `inputs`. Critic verdicts live in `review/<phase>/round-<n>.md`.

**D-003 Git remote is public.** The owner's kickoff names `https://github.com/mdsilcox/Clockwork-Spire` explicitly as the push target. `gh` reports it as PUBLIC. The lifecycle skill says to push only to a private remote, but the owner's explicit instruction for this project names this repo, so I push there at every gate. Nothing secret is ever committed (no keys, no accounts, no services).

**D-004 Keep-awake.** The desktop app's keep-awake setting is not reachable from this session, so a background PowerShell process holds `SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)` and is restarted every two hours. It changes no system setting and ends with the process.

**D-005 Usage guard.** Plan usage is checked at every gate with `get_usage`; at about 85% of the weekly limit the run finishes its current step, commits, writes REPORT.md and stops.

## 2026-10-04 · D1 Concept and stack

**D-006 Rendering and UI: pure TypeScript simulation + Canvas 2D stage + Preact DOM UI, built with Vite.**
- *Chosen:* the game rules live in `src/core/` as pure, deterministic TypeScript (no DOM, seeded RNG), so the same code runs the game, the preview, the unit tests and the headless balance simulator. Combat produces an **event timeline**; the renderer only replays it, never re-runs rules. The machine and combat stage are drawn on one Canvas 2D element (device pixels, pixel ratio capped at 2). Every menu, tooltip, map, shop, event and the Workshop is Preact DOM over the canvas, styled with CSS.
- *Rejected:* **Phaser 3** (a scene, input and asset system we would mostly fight, since menus are DOM and art is generated; heavy for a phone PWA). **PixiJS v8** (WebGL buys filters and big particle counts we do not need for a 5 by 3 board; adds a renderer abstraction and a WebGL context loss path to test). **SVG for the stage** (crisp, but animating dozens of toothed gears plus steam particles through the DOM is slower on phones than one canvas).
- *Why:* the riskiest piece is the machine simulation and its readable, satisfying replay; a pure sim plus a timeline-driven canvas keeps the two from drifting, keeps the balance simulator honest (same rules, no rendering), and keeps Playwright able to drive every control by `data-testid`. The owner's knowledge vault records the same finding from an earlier game build ("Build menus and text as DOM overlays on the game canvas"), and the spike confirmed it: canvas labels were hard to read at 667 by 375.
- *Proof:* the spike in `spike/` (results in `docs/spike.md`).

**D-007 Tooling.** Vite 8, TypeScript (strict), Preact 11 with `@preact/signals` for UI state, Vitest 5 for unit, rules and simulator tests, Playwright 1.63 for end-to-end tests at 1280x800 and 667x375, `vite-plugin-pwa` for the offline service worker and manifest, `idb` for IndexedDB saves (`fake-indexeddb` in unit tests), `tsx` to run the balance simulator from the command line. All synthesized audio uses the Web Audio API directly (no library). Versions are pinned at install time. *Alternatives considered:* webpack or Parcel instead of Vite (slower dev loop, no gain); React, Svelte or Solid instead of Preact (React is three times the bundle for the same API; Svelte and Solid add a compiler step and are less familiar to the build agents; Preact keeps JSX and hooks at about 4 kB); Jest instead of Vitest (needs separate TypeScript and ESM transforms that Vite already provides); Cypress instead of Playwright (no WebKit, weaker multi-viewport runs).

**D-008 One run, one seed.** Every run has a seed; map generation, draws, enemy choices, events and rewards each use their own RNG stream split from it, so a balance simulator run and a replayed bug reproduce exactly.

## 2026-10-04 · D2 Design

**D-009 Machine rules.** 5x3 grid, Mainspring fixed at A2, breadth-first motion (up, right, down, left), each part powered once per tick, 3 ticks per turn, hand 3, 2 placements per turn, one free swap, the board persists through a combat and clears after. Chosen for readability (one visible flow from one source) and because placement position is the core choice every turn. Rejected: part rotation (doubles the decision space and hurts phone readability) and energy costs per part (a second budget on top of placements).

**D-010 The Clockmaker's "strongest combination"** is read as the part that contributed the most last turn plus the part that first powered it. Phase 1 rewinds one combination, phase 2 also resets Pressure, phase 3 rewinds two and Jams the Mainspring on alternate turns.

**D-011 Win-rate impact (spec 5)** is measured offer-based (took it vs passed, same meta band and act) to remove survivorship bias, with 20% bot exploration. The critic noted rare parts come from bosses only strong runs reach. "No part's impact more than double the median part's" is checked on this ratio.

**D-012 Dominated commons fixed.** Metronome and Anchor Escapement hold on tick 1 (they starve the parts behind them that tick), so they trade against Spur and Escapement instead of beating them.

**D-013 Sprocket is "he"** (a fictional dog; the spec leaves it open).

## 2026-10-04 · B1 and B2

**D-014 Practice fight.** Tinker start plus cam, boiler, piston, pendulum against cog-rat and two rust-mites (B1), then brass-beetle plus spring-imp (B2) once those existed: the bot wins with 40 HP left while random placement wins 1%. The B1 critic found the first version needed no choices.

**D-015 Enemy strength is tuned on HP lost per fight, not win rate.** A greedy bot wins about 99% of single fights whatever the parts, so win-rate impact said nothing. Targets per tier (bot average HP lost): act 1 normal 6-9, elite 16-22, Foreman 24-32; act 2 normal 9-13, elite 20-27, Queen 28-36; act 3 normal 12-17, elite 25-33, Clockmaker 36-48. All met after raising enemy attacks 25-60% and HP 10-15% (balance/2026-10-04-fights-1.md). Run-level difficulty is set in B4 against the spec's targets.

**D-016 Combat-level part report measures all 46 parts** by varying the starting set (three chassis or random commons) and including locked parts; the run pool still excludes locked parts until their blueprint is found.

**D-017 Worktrees per lane, merged in dependency order** (core first), with a frozen review worktree per critic round; the Playwright port comes from PW_PORT so lanes run e2e side by side.
