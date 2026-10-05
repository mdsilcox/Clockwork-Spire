# Progress

## Version 2 (started 2026-10-04T22:12Z, owner-approved on the board)
Plan: V0 setup, D3 design and D4 art direction side by side, D5 roadmap, then build phases. Board phases `cs~V0`, `cs~D3`, `cs~D4`, `cs~D5`.
- Done: V0 (6d04086), D3 design (critic R2 PASS 7.67), D4 art direction (owner sign-off, D-034; follow-ups to the owner's clip notes, art-reviewer R4 PASS), D5 roadmap (docs/roadmap-v2.md; art after each wave).
- Now (autonomous, D-035; owner: "proceed as far as you can"; time 2026-10-05 ~00:35Z):
  - **B7 Enemy machines** (branch claude/clockwork-spire-v2-plan-0389b9, last commit f8f6693): engine, content, UI, bots merged; B7.5 tune done (D-038); full npm test green at f8f6693 (346 unit, 142 e2e, offline, career). Browser check found 2 phone blockers and 9 should-fixes: returned to the combat-ui agent (a592ffcb50efa7ef1), working in this shared tree. Next: re-check its round 2 (e2e + spot-check), then a fresh critic (pass rule: no blockers, every metric >= 7, average >= 7.5) replaces the owner's gate; on PASS: phase_tokens.py metrics, merge to main (ff from this worktree: `git -C <main checkout> merge --ff-only claude/clockwork-spire-v2-plan-0389b9`), push, board closed.
  - **A1 act 1 cast**: PASS in wave 2: spring-imp, rust-mite, brass-beetle, oil-slick, gearhound. Returned: tinker (painted open hand art/tinker/hand/seed5.png, cheer, star; agent aad18449858a67bb5), foreman (round 2 done, needs wave 3 confirm: flash 0.09, embers; agent ad81963a2d06e9344). Rigging: tinpot-general (seed 23; agent ae80e75c13c80b2da). Next: wave 3 art-reviewer on foreman, tinker, tinpot; then A1 gate (art-reviewer PASS replaces the owner), commit art, board closed.
  - **B8 and A2**: drafts reviewed by a critic, PASS WITH CHANGES accepted (D-037). Brief draft docs/briefs/B8-the-climb.md. B8.0 contract starts after the B7 gate; A2 after the A1 gate. ComfyUI is stopped (restart for A2 candidates).
  - Keep-awake PID 31080 (4 h from 23:40Z).

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
