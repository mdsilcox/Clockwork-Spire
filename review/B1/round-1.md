# B1 Walking skeleton, review round 1

**Verdict: REVISE** (commit c603a19). Depth 6 is below the floor of 7 and the average 7.43 is below 7.5.

| Metric | Score | Evidence |
|---|---|---|
| Fun | 7 | Place-two-parts, see exact preview, Run loop is immediately readable; but only 8 parts and a 2-turn win against two 14 HP mites (my skip-speed run won in turn 2) gives little to decide yet. |
| Clarity | 8 | Preview chips ("9 damage, 9 Plating"), per-cell x3 badges, "Run: -9" on the enemy, "Incoming 10", shape-coded intent icons; part text is terse ("Plate 3.") and no tooltips/glossary yet (due later). |
| Depth | 6 | Neighbor order, Boost, Pressure exist and hand-draw varies, but with this bin and enemies a line of gears is always right; simulator is a placeholder (not due in B1). Scored on what exists. |
| Feel | 7 | Gears turn, coil compresses, pulses along links, chain counter, popups, 1x/2x/skip; swap/drag/keyboard all work. Run animation is brisk; no screen-shake or big payoff moments yet. |
| Look and sound | 7 | Cohesive brass/copper canvas art, readable at both sizes, drawn rust-mites; enemy panels a bit empty and the board is sparse. Audio is muted under webdriver so could not be heard; code present (tick/chime/thud). |
| Stability | 9 | npm test green: 45 unit + 12 Playwright (desktop and phone). No console errors or page errors at either size over full fights; reload restores the fight; no sideways scroll. |
| Spec coverage | 8 | M1-M4, M6, M11, M13, M14, M16, M17, C1, C2, A1, P1-P3 covered by the acceptance test and e2e; all 8 parts, 2 enemies, preview equals actual damage, autosave, `__game` hook. |

**Average: 7.4**

Pass rule: no blockers, but Depth is 6 (needs 7) and 52/7 = 7.43 (needs 7.5). Result: REVISE.

## Blockers
None (no crash, no save loss, no phone breakage, no missing B1 feature; Sprocket is not due in B1 as no Workshop/events/parts touch it).

## Improvements (ranked)
1. Raise Depth and Fun in the practice fight: make the practice encounter require choices (e.g. rust-mite sabotage plus a cog-rat, higher HP so a fight lasts 4 to 6 turns, a bin with a coil/cam/boiler/piston/pendulum in the opening hands) so that placing and ordering matters; the current fight is won in 2 turns by any gear line.
2. Add a visible "what this part does" on hover/long-press for cards and placed parts (full rules text, e.g. Escapement: Plate 3 on each tick it fires), and show per-enemy preview damage on both mites, not only the targeted one.
3. Reset the stale "Chain xN" counter and win panel state cleanly on reload/new fight, and give win/lose a payoff beat (steam burst, sound sting) so the end of a machine run feels earned.

## What I tested
npm test (all green); Vite on port 5330 (stopped by PID); Playwright at 1280x800 and 667x375 touch, DPR 2: title, fight, place via `__game`, preview, run, skip speed, full fight to a win, reload persistence; screenshots viewed; console clean at both sizes. Simulator report not applicable in B1 (placeholder). Sound could not be heard.
