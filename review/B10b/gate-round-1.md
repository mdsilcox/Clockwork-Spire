# B10b Modes and Overwind, gate review round 1 (167ff6c)

Verdict: PASS (no blockers; every metric at least 7; average 7.57).

## Scores
| Metric | Score | Evidence |
|---|---|---|
| Fun | 7 | The owner's ask (harder runs, difficulty modes) is delivered: Clockmaker 62 / 78 / 90 / 101 HP and Attack 15 / 20 / 23 / 25 on Apprentice / Journeyman / Master / Clockwork; Overwind 8 adds exactly +2 (25 to 27); the Thirteenth Hour is a real fourth phase. I did not play a full run to a win. |
| Clarity | 8 | The door lists each mode's multipliers, each applied twist by name and rule, and a lock reason on every locked mode and level (gate-shots/r1-desk-door-locked.jpg, r1-desk-door-master-ow7.jpg, r1-phone-door-ow10.jpg). The choice shows on the gate ("Apprentice, Overwind 4", data attributes right) and the run bar ("Master, Overwind 7"). The door layout and salvage defects from browser-check.md are fixed in 167ff6c. |
| Depth | 8 | Ladder test (300 expert runs per mode) passes here (4 of 4, 301 s): win rate does not rise, mean act strictly falls, Apprentice at least 0.5 act above Clockwork. Ten distinct twists (economy, rust, elites, oil, salvage, damage, wardens, a boss phase), not only numbers. The curve and BV targets belong to B10c and are not judged. |
| Feel | 7 | Door buttons are 40 px or more; the phase beat plays; panel scrolls inside on the phone with the header pinned. Overwind 9 and phase 4 are crowded on the phone (deferred to B11). |
| Look and sound | 7 | The door matches the street's style at both sizes. Overwind 9's extra Foreman part is a 28 px marker half hidden by an intent badge on the phone (r1-phone-foreman-ow9.jpg), without a label saying where it came from; phase-4 parts reuse old anchors. Audio not judged. |
| Stability | 8 | No sideways scroll (scrollWidth equals the viewport) on the door, gate, run and fights at 667x375 and 1280x800. tests/v2/b10b-modes.test.ts 119 of 119 and the ladder 4 of 4 pass when run here. I did not rerun the whole suite; the e2e perf and flaky specs are pending on the coordinator's side and not counted. |
| Spec coverage | 8 | Four modes, ten twists, door with lock reasons, mode and level saved and shown on the run (reload via useSlot kept them), hours per mode and Overwind 2 (Master with Overwind 7 gave 10 hours), Overwind 9 marker present at the fallback position inside the viewport, the Thirteenth Hour with a real-engine test, ladder, cheats. |

Average: (7+8+8+7+7+8+8)/7 = 53/7 = 7.57.

## Blockers
None.

## Improvements (ranked, none blocking)
1. Explain Overwind 9's extra part where it appears: a label or first-sight line ("The Warden Stirs: he remembers your plan") and move the marker clear of the intent badge on the phone (with B11's `memory` anchor). Same for Cold Joints' rusted first part, which has no on-screen reason.
2. Make the Plating loss in phase 4 visible before the hits land (browser-check item 4; the pill stays at its old value while HP falls), and enlarge the 28 px warden markers' hit area on the phone.
3. Lay the door's levels out in one column or column-first order on the phone (zigzag reading) and show the chosen level's twist next to the buttons; B10c should re-run the ladder after its retune.

## What I tested
Vite dev server on 5388 (stopped by PID 4512), the in-app browser at 1280x800 and 667x375. Fresh profile: door with all locks, then cheats (unlock, setMode, setOverwind) for Master with Overwind 7 and Clockwork with Overwind 10; Spire gate and run bar tags; climb with Master and Overwind 7 (10 hours); cheat.runFight on the Clockmaker at four modes and at Journeyman 3 and Clockwork 8 (HP and attack numbers above); Overwind 9 Foreman with a plan history (mem-drill present, on screen); the Clockmaker at Overwind 10 broken through phases 1 and 2 (the Midnight to Thirteenth Hour step could not be reached from the harness without a damaging machine: setting the core to 0 HP skips the phase change and ends the fight, which the earlier browser-check also noted; I relied on the 119-test engine suite and browser-check.md for phase 4, including the Plating loss). Not checked by me: Overwind 1, 3, 5, 6 in play, the Overwind 4 and 7 effects (covered by the unit tests and browser-check.md), audio, balance targets.
