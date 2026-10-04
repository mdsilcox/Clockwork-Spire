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

## 2026-10-04 · B3 and B4

**D-018 Rare parts all start locked.** Every rare is behind a blueprint, so early reward offers step down to uncommon; blueprints (elites, bosses, Sprocket's events) are what open rares. This makes meta-progression visible in the run pool.

**D-019 The curve met the spec with the designed numbers.** 100 bot careers on the sensible path: no-meta win 1.0%, median first win run 9 (quartiles 7-12), offer-based part impact max 1.17 vs median 0.97 (balance/2026-10-04-careers-1.md). No constants changed in B4.

**D-020 Sprocket's "good climb"** is act 2 or beyond, or a new best of floor 8 or higher; an early act 1 loss always gets the comforting nudge (B4 critic: a floor-5 first loss greeting "happy" felt wrong).

## 2026-10-04 · B5 and B6

**D-021 Service worker in prompt mode.** `autoUpdate` would reload the page mid-fight; prompt mode shows a quiet "A new version is ready" toast only outside fights. Icons are drawn by a pure-JS rasterizer at build time and live only in `dist/`, so no image file is ever committed (A1).

**D-022 Tooltips open on hover, long-press and keyboard focus only, not on tap focus.** A tap focusing a button opened its tooltip over the board on phones.

**D-023 "Winnable from a fresh save" is proven by autoplay through the real UI.** `window.__game.autoplay` drives the same controller actions a player uses (no cheats) with the simulator's bots; the career e2e wins from a fresh save (seed 1, run 18). The spec's "typical first win at runs 8 to 12" is the bot careers' median (run 9), checked by BS3.

**D-024 E2E console checks ignore only the Vite dev server's hot-reload socket messages.** Under load the dev server's HMR socket can log a refused connection; the game opens no sockets, so this is test-environment noise. Everything else still fails the test.

**D-025 Known small issues left at release** (logged in PROGRESS.md): the phone History layout, the hand shrinking late in long fights. Both were judged non-blocking by the final critic (every metric 8).

## 2026-10-04 · Version 2: V0 setup

**D-026 Generated paintings for characters, enemies and illustrations (the owner's decision).** For v2 the owner replaces SPEC.md section 3's "all generated in code, no downloaded art" rule for characters, enemies and illustrations: they are paintings generated locally with SDXL (CreativeML OpenRAIL++-M, commercial use allowed) through the toolkit in `~/.claude/tools/art/`, cut out and rigged with `rig.js`. Code stays the tool for effects, UI and motion; all sound stays synthesized. SPEC.md itself is unchanged; this entry is the override. Test A1 (no media files in `src/` and `public/`) is rescoped when the first art lands in the game (the D4 integration spike decides how). The approved starting point is the art trial, kept in `art/trial/`.

**D-027 v2 is owner-approved.** Unlike v1 (D-002, autonomous), the owner approves every phase on the Orchestra board or in chat. A critic still reviews design documents before they reach the owner, and an `art-reviewer` pass plus the orchestrator's own look at the extreme frames precede every art review. Pushes to the public GitHub repo continue at every gate (owner, V0).

**D-028 v2 track: Medium.** V0 setup; D3 design and D4 art direction side by side; D5 roadmap; then build phases with gameplay and art in separate phases where they don't depend on each other. The stack, data layer, tests and simulator are proven, so there is no stack phase.

**D-029 The owner's v2 design choices (board, 2026-10-04).** Combat: machine against machine (enemies are machines with visible part grids; strikes aim at parts; boss phases are parts broken in order). World: both a walkable Spire and a town at its foot. Next target after a kill: a target order set before Run. Plating: no cap, countered by enemies only. Final boss: about 9 turns for a strong run. Curve: the strongest bot's median first win at run 8 to 12. Achievements: an unlock's power scales with the achievement's difficulty. Art: the trial's look refined; painted part sprites turned by code; the sample boss is the Boilermaker Queen. Open: the out-of-battle loop (D3.1b; the owner says combat is already distinct and the map, shops, events, elites and boss loop is what copies Slay the Spire), rarity tiers and difficulty shape.

## 2026-10-04 · D4 art direction

**D-030 Style v2: bold ink and cel shading for every asset.** The first D4 art review (`review/D4/round-1.md`) found the set split in two: Sprocket and the title read as inked picture-book art, the Boilermaker Queen and the Cog Rat as airbrushed, near photo-real brass with thin lines. The core style in `art/style.json` now asks for bold thick ink outlines and flat cel shading, and the negative excludes airbrushed and glossy 3D looks. The Queen, the rat and Sprocket are regenerated with it (Sprocket also for shorter corgi legs and four visible legs, which the walk needs); the title passes as is.

## 2026-10-04 · D3 critic round 1

**D-031 Changes from the D3 critic (REVISE 6.67, `review/D3/round-1.md`).** The critic found the anti-Plating design was mostly labels, the phase floor unenforced, a target that could not hold, and trinkets left out of the new tiers. Changes: Corrode is a percentage of your Plating (it grows with the stack); Ratchet grows every turn its part stands; regular cores hold most of the HP so racing the core costs HP; each act's regular pool must carry at least 30% of its damage as Pierce, Corrode or Siphon (BV9); wardens' keystones and last-phase cores are **Braced** (at most half, or a third, of max HP per turn), so every phase lasts at least 2 turns (3 for the last) for any build, including a max-burst bot; a phase change discards the rest of the Run and the warden's next turn is its phase action, with cadences restarting; Build-up (counts up) is separate from Countdown; midnight brings an Overwound warden and the bell grants Prepared, so the clock has a cost and the bell a real value; the shortest entry-to-door path is at most 5 moves; trinkets get Masterwork and Legendary tiers, one Legendary per run in total; early non-win achievements open a Rare and a Masterwork; the impossible "beat by 15 points" target became an HP-lost ratio, plus a cap on fully absorbed enemy turns, a greedy-career bound and route-bot checks.

**D-032 Acceptance tests are pending until the first build phase's contract step.** The 78 v2 criteria in `docs/acceptance.md` sections 9 to 17 carry exact numbers and are registered as pending tests in `tests/v2/` (generated by `scripts/v2-acceptance-todos.mjs`, so the list can't drift from the doc). Executable assertions need the v2 interfaces (enemy frames, target order, section map, testkit), which depend on the art integration spike and the roadmap's slicing; writing them against guessed signatures would mean rewriting them. The first build phase's contract step writes the interfaces and turns each owned criterion into a real failing test before any lane starts; criteria never get weaker.

## 2026-10-04 · D4 integration spike

**D-033 How the game shows painted characters (`docs/spike-art.md`).** One shared WebGL context (a `RigHub` owned by the `Stage`) draws every rig and is composited into the Canvas 2D stage each frame; textures are WebP q85 at 498x640 for regular enemies and 896x1152 for wardens; meshes at half the toolkit's density (56x72), which looks the same (mean pixel difference 0.23 of 255) and cuts three rigs at 4x CPU throttle from about 52 ms to about 14 ms per frame. Rejected: a WebGL canvas per rig (same cost, one context each, and the bodies vanish for good on context loss) and pre-rendered sprite sheets (58 to 232 MB decoded per enemy type, and anchors only per frame), kept only as a possible low-tier fallback. Sources stay in `art/<asset>/`; a build script writes `public/art/<asset>/cut.webp` and a generated `src/art/manifest.ts`; characters are typed `CharacterDef` modules; loading is lazy per act; the code-drawn enemies remain the fallback. Test A1 is rescoped to: no audio or font files; images only as WebP under `public/art/`, each listed in the manifest with a source under `art/`; size budget 120 KB per regular cut-out, 250 KB per warden, 6 MB in all. Not yet proven on a real phone (headless Chrome with throttling stood in).

**D-034 Owner sign-off on D3 and D4 (2026-10-04, in chat).** Design and art style approved. Detail density: keep the contrast (friends simple and warm, the Spire's machines intricate; written into docs/art-direction.md). Owner's notes on the clips, fixed in a follow-up art round before production: Sprocket's happy mood (the code-drawn mouth doesn't read as a dog's, the body motion is strange: use a painted open-mouth head and calmer, natural motion), the Cog Rat's motion (a bit unnatural: a natural skitter), the title (blurry: the 1216 px painting is stretched to full screen; a high-resolution repaint). Idle and sleepy Sprocket and the Queen are good as they are.
