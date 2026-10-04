# Progress

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
