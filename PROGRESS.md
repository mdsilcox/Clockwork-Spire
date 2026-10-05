# Progress

## Version 2 (started 2026-10-04T22:12Z, owner-approved on the board)
Plan: V0 setup, D3 design and D4 art direction side by side, D5 roadmap, then build phases. Board phases `cs~V0`, `cs~D3`, `cs~D4`, `cs~D5`.
- Done: V0 (6d04086), D3 design (critic R2 PASS 7.67), D4 art direction (owner sign-off, D-034; follow-ups to the owner's clip notes, art-reviewer R4 PASS), D5 roadmap (docs/roadmap-v2.md; art after each wave).
- Done (autonomous): **B7 Enemy machines** closed 00:50Z (critic PASS 7.57; main 9896cb9 pushed). **A1 act 1 cast** closed 00:42Z (art-reviewer waves 1 to 3b; commit 4f60250).
- Now (autonomous, D-035; owner: "proceed as far as you can"):
  - **A2** (acts 2 and 3 cast): brief docs/briefs/A2-acts-2-3-cast.md. ComfyUI running (job b9bjixcxy generating; Steam Wraith retry queued after it). Picks so far: valve-crab 1, furnace-golem 1, pipe-snake 1 (cut). Still to pick: gauge-gremlin, the act 3 regulars, the four elites, the Clockmaker, the wraith retry. Then lanes act2-cast, act3-cast, elites-a, elites-b, clockmaker-art (last), art-reviewer waves, gate. Stop ComfyUI by PID when candidates are done.
  - **B8 The climb**: brief draft docs/briefs/B8-the-climb.md (semantics decided). Next: B8.0 contract (additive types for sections, rooms, clock, elites, Scrap, save v2; section.ts and rooms.ts stubs; createCombat options overwound and prepared; testkit sectionFixture; real failing tests for CL1 to CL11, SV3 to SV6, AD4 hours, BV11, AR1, AR2 act 1, AR4), then lanes climb-core, economy-rooms, climb-ui, rig-hub (rig-hub starts on signed-off rigs), bots after core. B8 tune should also widen act 1 normals' margin (critic B7).
  - Keep-awake PID 31080 (until ~03:40Z).

## Version 1

Run started 2026-10-04T16:30Z (autonomous mode). Board: https://claude.ai/artifact/Eqis6DgyZMefwhzFM1KNta (project `clockwork-spire`, prefix `cs~`).

## Now
Done. The final critic passed (8.00) and `npm test` is green at the release commit. See REPORT.md.

## Done
- P0 Setup (commit 9bfa84c).
- D1 Concept and stack: vision, stack decision (D-006/D-007), spike (60 fps, 61k turns/s, deterministic). Critic round 1 PASS 7.67.
- D2 Design: rules, content (46 parts, 24 enemies, 28 trinkets, 22 events), data model, acceptance criteria, roadmap. Critic round 1 PASS 7.67; improvements applied (D-009..D-013).
- B1 Walking skeleton: practice fight end to end. Critic round 1 REVISE 7.43 (Depth 6), round 2 PASS 7.57 (commit 24c4c4b).
- B2 The machine: 46 parts, 24 enemies, statuses, sabotage, tooltips, glossary, tutorial, sandbox with presets, layered boss art, fight bot and report (enemies tuned to HP-loss targets). Critic R1 REVISE 7.43, R2 PASS 7.86 (commit b088127).
- B3 The run: maps, 22 events, shop, forge, oil, 28 trinkets, chassis passives, Rewind, run save/resume, run bot (no-meta win 1%). Critic R1 PASS 7.57 (commit e4a8a6e).
- B4 Workshop, meta and Sprocket: 3 save slots, Workshop hub, bench, chassis, notes, Sprocket (8 poses, barks, events, ending, credits), careers sim: no-meta 1.0%, median first win run 9, impact max 1.17x. Critic R1 PASS 7.86 (commit 50fab83).
- B5 Look, sound and QoL: six synthesized music loops, settings, history and stats, how to play, portrait card, keyboard pass, offline PWA with code-drawn icons. Critic R1 PASS 8.00 (commit f427336).
- B6 Hardening and release: autoplay career e2e from a fresh save to victory, console sweep, graceful save failure, error boundary, perf on phone, critic-note polish, README, REPORT.md. Final critic R1 PASS 8.00 (commit 94a1a4b).

## Next
- Nothing required. Possible later work: gamepad support, harder runs after the win (spec bonus), a phone-friendly History layout.

## Known issues
- Audio quality never judged by ear (critics run under automation); levels and switching are tested.
- Phone History tab: stat tiles push the run list below the fold at 667x375.
- Late in long fights the hand can shrink to one card (placed parts leave the draw pile).
- Autoplay's first win from a fresh save varies by seed (run 18 for seed 1; careers median run 9).
- No real-device phone or PWA install test; no gamepad (spec bonus).

## Refused actions / workarounds
- None.
