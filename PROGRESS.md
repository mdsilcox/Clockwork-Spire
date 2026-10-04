# Progress

Run started 2026-10-04T16:30Z (autonomous mode). Board: https://claude.ai/artifact/Eqis6DgyZMefwhzFM1KNta (project `clockwork-spire`, prefix `cs~`).

## Now
B6 Hardening and release: lanes hardening (autoplay career e2e, console sweep, graceful failure, perf) and polish (critic notes, feel); then README, REPORT.md, final critic (avg 8 needed).

## Done
- P0 Setup (commit 9bfa84c).
- D1 Concept and stack: vision, stack decision (D-006/D-007), spike (60 fps, 61k turns/s, deterministic). Critic round 1 PASS 7.67.
- D2 Design: rules, content (46 parts, 24 enemies, 28 trinkets, 22 events), data model, acceptance criteria, roadmap. Critic round 1 PASS 7.67; improvements applied (D-009..D-013).
- B1 Walking skeleton: practice fight end to end. Critic round 1 REVISE 7.43 (Depth 6), round 2 PASS 7.57 (commit 24c4c4b).
- B2 The machine: 46 parts, 24 enemies, statuses, sabotage, tooltips, glossary, tutorial, sandbox with presets, layered boss art, fight bot and report (enemies tuned to HP-loss targets). Critic R1 REVISE 7.43, R2 PASS 7.86 (commit b088127).
- B3 The run: maps, 22 events, shop, forge, oil, 28 trinkets, chassis passives, Rewind, run save/resume, run bot (no-meta win 1%). Critic R1 PASS 7.57 (commit e4a8a6e).
- B4 Workshop, meta and Sprocket: 3 save slots, Workshop hub, bench, chassis, notes, Sprocket (8 poses, barks, events, ending, credits), careers sim: no-meta 1.0%, median first win run 9, impact max 1.17x. Critic R1 PASS 7.86 (commit 50fab83).
- B5 Look, sound and QoL: six synthesized music loops, settings, history and stats, how to play, portrait card, keyboard pass, offline PWA with code-drawn icons. Critic R1 PASS 8.00 (commit f427336).

## Next
- Final critic; REPORT.md; vault retro.

## Known issues
- Late in a long fight the hand can shrink to one card (placed parts leave the draw pile). Watch in B3 runs; consider a rule tweak if the run sim or critic shows it hurts choice.
- Phone tooltip can linger when a new sandbox fight starts via practice() (B3 run-ui fixes).

## Refused actions / workarounds
- None.
