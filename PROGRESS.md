# Progress

## Version 2 (started 2026-10-04T22:12Z, owner-approved on the board)
Plan: V0 setup, D3 design and D4 art direction side by side, D5 roadmap, then build phases. Board phases `cs~V0`, `cs~D3`, `cs~D4`, `cs~D5`.
- Done: V0 (6d04086), D3 design (critic R2 PASS 7.67), D4 art direction (owner sign-off, D-034; follow-ups to the owner's clip notes, art-reviewer R4 PASS), D5 roadmap (docs/roadmap-v2.md; art after each wave).
- Done (autonomous): **B7 Enemy machines** closed 00:50Z (critic PASS 7.57; main 9896cb9 pushed). **A1 act 1 cast** closed 00:42Z (art-reviewer waves 1 to 3b; commit 4f60250).
- Done (autonomous): **A2** closed 01:40Z (15 assets; art-reviewer waves 1 to 4; commit 00aba16). Clockmaker death is a marginal pass: should-fix in B9 (lift the head dial, soft glow).
- Now (overnight autonomy, D-039; owner back ~10:30Z; owner: "if you finish your plan, keep going"; commit and push to GitHub regularly; persist then compact when context is high):
  - **B8 The climb**: all lanes merged on branch claude/clockwork-spire-v2-plan-0389b9 (e6d0175 bots; 28763bc phone layout). npm test: unit 473 pass, e2e 181 pass, offline pass, career FAILS (autoplay still plays v1; strategy-bots agent a8bff490fb0733805 is fixing src/app/autoplay.ts). Next: career green -> browser-checker over B8 (climb, rooms, painted combat at 667x375 and 1280x800) -> fixes -> fresh critic gate (pass rule: no blockers, each metric >= 7, avg >= 7.5) -> phase_tokens.py --since 2026-10-05T00:52:00Z -> merge to main (`git -C <main checkout> merge --ff-only claude/clockwork-spire-v2-plan-0389b9`) and push -> board close.
  - **B9 Wardens and rarity** (next): draft on the board: the Foreman, Boilermaker Queen and Clockmaker as frame wardens with phases (content.md 3.2/3.4/3.6, Braced, Rewind parts, the Clockmaker's memory), their rigs in the game (Foreman two layers, Queen, Clockmaker; Clockmaker death should-fix: lift head dial, soft glow), Masterwork and Legendary parts and trinkets, achievements and the trophy list (acceptance 11, 15 AD1 to AD3, AD6, AD7, BV4). Critic draft review, then contract + tests, lanes (max 3 parallel, D-039), gate.
  - Then B10 (Bellfoot, residents, landmarks, modes, Overwind, the curve retune: the expert currently wins ~18% no-meta vs target <5%), A3 (part sprites, act sections and Bellfoot scenes, event art), B11, B12 per docs/roadmap-v2.md.
  - Keep-awake PID 36672 (until ~12:00Z).

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
