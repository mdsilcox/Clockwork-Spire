# Clockwork Spire v2: roadmap

Built on the approved D3 design (`docs/vision-v2.md`, `docs/rules.md`, `docs/content.md`, `docs/acceptance.md` sections 9 to 17) and the D4 art direction (`docs/art-direction.md`, D-033). Gameplay and art run as separate tracks, so their lanes work in parallel; they meet in the integration phase. Every phase ends playable, with main green and the owner trying it. Only the next phase is planned in detail (on the board); later phases are coarse until their turn.

## Order

```
Gameplay:  B7 Enemy machines ──> B8 The climb ──> B9 Wardens and rarity ──> B10a Bellfoot, B10b Modes and Overwind, B10c The curve ─┐
Art:       A1 Fixes + act 1 cast ──> A2 Acts 2 and 3 cast ──> A3 Parts, scenes, events ──────────────────┤
                                                                                                         v
                                                                       B11 Art integration ──> B12 Hardening and release
```
A1 starts with B7. Art phases need only the approved style; gameplay phases need nothing from art (they keep v1's code-drawn enemies as placeholders, which also remain the fallback, D-033).

## Phases

| Phase | Track | Delivers (playable at the gate) | Acceptance (owns) |
|---|---|---|---|
| **B7 Enemy machines** | gameplay | v2 combat inside the v1 run: enemy frames and parts, target order, broken parts and cancelled intents, the new actions and keywords, Braced phase engine, salvage tray instead of part rewards; v2 strategy bots and the Plating go/no-go before anything builds on it | 9, 10, WP1, WP8, SV1, SV2, BV3 (normals and elites), BV6, BV8, BV9 |
| **B8 The climb** | gameplay | the roaming act: generated sections, the Spire clock, roaming elites, workbench (fuse), traders (barter), oil, locked doors and keys, vaults, Overwound and the bell; save version 2 and migration; route bots | 12, 13 (rest), AD4 hours, BV11 |
| **B9 Wardens and rarity** | gameplay | the three wardens with phases, Rewind parts, the Clockmaker's memory; Masterwork and Legendary parts and trinkets; achievements and the trophy list | 11, 15 (AD1 to AD3, AD6, AD7), BV4 |
| **B10a Bellfoot** | gameplay | Bellfoot as a walkable street with its places, residents and landmarks, the archivist, collars, the Scrapper; the Bellfoot street scene (pulled forward from A3: painted layered scene with a code-drawn fallback) | 14 (BF1 to BF3, BF5; BF6's Bellfoot half) |
| **B10b Modes and Overwind** | gameplay | the four modes, the clock tower door, the ten Overwind twists (including the Clockmaker's Thirteenth Hour), the six hard achievements | AD4, AD5 |
| **B10c The curve** | gameplay | measure first (baselines, autoplay against the simulator), the retune to the curve (levers in the order of the B10b brief), the `coreTookThisTurn` reset, Plating viability, heavy sims behind `test:curve` | BV1, BV2, BV5, BV10, BV4 kept |
| **A1 Art: fixes and act 1 cast** | art | owner's D4 notes (Sprocket's happy, the rat's motion, the title at 2x); the tinker; act 1's 5 regulars, 2 elites and the Foreman (two phase paintings if needed), each rigged with anchors for its content.md parts | AR2 (act 1), AR5 |
| **A2 Art: acts 2 and 3 cast** | art | the remaining 10 regulars, 4 elites, the Clockmaker (phase paintings), summons | AR2, AR5 |
| **A3 Art: parts, scenes and events** | art | painted sprites for the 70 parts; the three act cross-sections as layered scenes (2x; Bellfoot's street moved to B10a); key event and journal illustrations; trinket icons | AR5, AR6 (scenes) |
| **B11 Art integration** | both | RigHub in the stage, the art manifest and build script, A1 rescoped to AR1, rigs replacing code-drawn enemies with part UI on anchors, painted parts on the board, painted scenes, the title screen, ambient sound beds; phone performance; BF6's Spire half (Sprocket walking with the tinker between rooms in the Spire) | AR1, AR3, AR4, AR6, BF6 |
| **B12 Hardening and release** | both | full suite, a v2 career autoplayed through the real UI to a victory, console and performance sweep, README, REPORT-v2.md, final critic | P2, P5 (v2), all |

## Rules every build phase follows
- **Contract step first.** The orchestrator writes the phase's interfaces (types, stubs that throw, testkit additions) and turns every criterion the phase owns from `it.todo` into a real failing test before any lane starts. Lanes may adapt a test to the code but never weaken a criterion (D-032).
- **Lanes by coupling**, each with strict file ownership; the orchestrator pre-creates shared entry points.
- **Superseded v1 tests** (acceptance header) are rewritten or retired in the phase that replaces their rule, never deleted silently.
- **Balance** reports are dated in `balance/`; every retune is logged in DECISIONS.md.
- **Art** hand-backs get an art-reviewer pass and the orchestrator's look at extreme frames; the owner sees one clip per asset at each art gate.
- **Gate**: full suite green on main, browser check at 667x375 and 1280x800, metrics on the board, the owner tries it.

## Could wait (owner's call at each gate)
Overwind levels 6 to 10, the fourth chassis (the Scrapper), two of the five residents, event illustrations beyond the key ones. Cutting any of them doesn't break the design.
