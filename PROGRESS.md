# Progress

## Version 2 (started 2026-10-04T22:12Z, owner-approved on the board)
Plan: V0 setup, D3 design and D4 art direction side by side, D5 roadmap, then build phases. Board phases `cs~V0`, `cs~D3`, `cs~D4`, `cs~D5`.
- Done: V0 (6d04086), D3 design (critic R2 PASS 7.67), D4 art direction (owner sign-off, D-034; follow-ups to the owner's clip notes, art-reviewer R4 PASS), D5 roadmap (docs/roadmap-v2.md; art after each wave).
- Done (autonomous): **B7 Enemy machines** closed 00:50Z (critic PASS 7.57; main 9896cb9 pushed). **A1 act 1 cast** closed 00:42Z (art-reviewer waves 1 to 3b; commit 4f60250).
- Done (autonomous): **A2** closed 01:40Z (15 assets; art-reviewer waves 1 to 4; commit 00aba16). Clockmaker death is a marginal pass: should-fix in B9 (lift the head dial, soft glow).
- Now (overnight autonomy, D-039; owner back ~10:30Z; owner: "if you finish your plan, keep going"; commit and push to GitHub regularly; persist then compact when context is high):
  - **B8 The climb**: closed 10:13Z, main ef9c4e8 (critic R1 REVISE 7.43, R2 PASS 7.57).
  - **B9a Wardens**: closed 11:20Z, main 726881e (draft split D-040; gate PASS 7.71; art PASS R3; BV4 medians 8/9/10; tune D-041).
  - **B9b Rarity and achievements**: closed 13:42Z, main ccd575d (draft split by mechanism; gate R1 REVISE 7.43, R2 PASS 7.57).
  - **Next: B10 Bellfoot and difficulty** (acceptance 14, AD4, AD5, BV1, BV2, BV5, BV10; roadmap row): Bellfoot as a walkable street, residents, landmarks, the archivist (moves the memory line), modes and Overwind, applying `profile.rewards`, the 11 Bellfoot achievements, the Scrapper chassis, and the retune to the curve. Draft -> critic -> contract -> lanes -> gate.
  - Carried to B10: the B9b critic's asks (a cue log on __game for e2e; a Climb shortcut on the phone Trophies tab; a drafter that can use Night Watchman, Free Pawl, Cascade Piston); expert route win 11 to 16% (target <5%; autoplay won 3 of 6 real runs in the B9b gate); a Plating route wins 0% (anti-turtle overshoots); bots are burst 99 to 100% (memory constant in sim); reset coreTookThisTurn in beginTurn; B8 critic nits (opening fight can be an elite's next step on seeds 19 and 25; combat first frame shows pips before the painting; bell and lock dialogs need the event card and payout). Carried to B11: warden art should-fixes, phone crowding around wardens.
  - Overnight the API session limit stopped all agents once (about 03:58Z to 10:00Z); they resumed from their worktrees with no loss.
  - Then B10 (Bellfoot, residents, landmarks, modes, Overwind, the curve retune: the expert currently wins ~15% no-meta vs target <5%), A3 (part sprites, act sections and Bellfoot scenes, event art), B11, B12 per docs/roadmap-v2.md.
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
