# B8 The climb, gate review round 2

Verdict: PASS (no blockers; every metric at least 7; average 7.57).

## Scores
| Metric | Score | Evidence |
|---|---|---|
| Fun | 8 | Round 1's slack opening is fixed: from a fresh climb the entry has fights beside it (seed 1: two fights and an event next to the entry), the first fight at hour 1 paid 13 Scrap, and the player can then use the trader, workbench and lock with money. Over 60 seeds every one had a fight next to the entry. The elite/roaming/clock loop remains clearly unlike a node pick. |
| Clarity | 8 | Fight is now a shield with blades, workbench an anvil hexagon, oil a can; act header reads "Act 1: the Gearworks" and "Hour N of M" with no floor count; the bell confirm is a full-screen dialog with "Yes, ring it" and "Not yet" visible at 667x375; used oil says "Already used. The oil here is spent."; fuse cards are large with no stray Back; lock icons are 40x40 buttons. |
| Depth | 7 | Unchanged from round 1: real route, trade and bell choices; balance report expert about 15%, rusher 8%, grinder 1%, flagged for B10 after B9 reworks wardens. |
| Feel | 7 | Painted Tinpot General, Spring Imp and Brass Beetle with part pips and previews work; combat screen shows the grid and painting a moment after the fight opens (brief pips-only frame, then full), noticeable but short. |
| Look and sound | 7 | Painted act 1 cast is strong; Foreman and acts 2 and 3 are code shapes until B9. Room glyphs are now distinct and cohesive. Audio not judged by ear. |
| Stability | 8 | Round 1's unit run stands (only B9a files red); no console errors this session; quick seed sweeps (60 climbs) ran without errors; tooltips no longer block taps. Did not rerun e2e; trusted the stated 180/181 and the fix. |
| Spec coverage | 8 | Everything in B8 present; round 1's must-fixes all verified fixed. |

Average: (8+8+7+7+7+8+8)/7 = 7.57.

## Blockers
None.

## Improvements (for B9 or B10)
1. Over 60 seeds, 2 (seeds 19 and 25) have the only adjacent fight sitting in the elite's next room, so a first move can meet Tinpot General at hour 1 (I hit it once on a random seed: elite fight at 20 HP, hour 1). Make the guaranteed opening fight avoid the elite's first step.
2. Combat first frame: the grid and painting appear a beat after the pips; preload or hold the fight screen until the rig is ready.
3. The bell dialog and lock dialog are plain text on a dark background with no panel; give them the same card as events, and show the Scrap/Brass/Prepared payout inside the bell dialog.

## What I tested
- Dev server on 5380 (stopped by PID 23900) at 667x375 and 1280x800: fresh climb openings on several seeds, walking into an adjacent fight (painted Spring Imp and Tinpot General), salvage payout, trader at two columns (scrolls to its last row), oil used message, bell confirm, workbench fuse choice, lock button size, desktop map with distinct glyphs. Seed sweep of 60 openings by script.
