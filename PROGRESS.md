# Progress

Run started 2026-10-04T16:30Z (autonomous mode). Board: https://claude.ai/artifact/Eqis6DgyZMefwhzFM1KNta (project `clockwork-spire`, prefix `cs~`).

## Now
B3 The run: four lanes in worktrees (run-core, combat-hooks, run-ui, run-sim); briefs in docs/briefs/B3-*.md; contracts committed (d3a029b).

## Done
- P0 Setup (commit 9bfa84c).
- D1 Concept and stack: vision, stack decision (D-006/D-007), spike (60 fps, 61k turns/s, deterministic). Critic round 1 PASS 7.67.
- D2 Design: rules, content (46 parts, 24 enemies, 28 trinkets, 22 events), data model, acceptance criteria, roadmap. Critic round 1 PASS 7.67; improvements applied (D-009..D-013).
- B1 Walking skeleton: practice fight end to end. Critic round 1 REVISE 7.43 (Depth 6), round 2 PASS 7.57 (commit 24c4c4b).
- B2 The machine: 46 parts, 24 enemies, statuses, sabotage, tooltips, glossary, tutorial, sandbox with presets, layered boss art, fight bot and report (enemies tuned to HP-loss targets). Critic R1 REVISE 7.43, R2 PASS 7.86 (commit b088127).

## Next
- B3 gate: merge core lanes first (run-core, combat-hooks), then sim and ui; run report in balance/; critic.
- B4 Workshop, meta and Sprocket.

## Known issues
- Late in a long fight the hand can shrink to one card (placed parts leave the draw pile). Watch in B3 runs; consider a rule tweak if the run sim or critic shows it hurts choice.
- Phone tooltip can linger when a new sandbox fight starts via practice() (B3 run-ui fixes).

## Refused actions / workarounds
- None.
