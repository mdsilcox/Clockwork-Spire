# B9b Rarity and achievements, gate review round 2 (c84fcb1)

Verdict: PASS (no blockers; every metric at least 7; average 7.57).

## Scores
| Metric | Score | Evidence |
|---|---|---|
| Fun | 8 | Unchanged from round 1: feats earned in real autoplay runs, Queen's pick, Twin Mainspring on D2 with a preview that matched the run. |
| Clarity | 8 | Phone Trophies shelf now shows about six rows at 667x375 (2 columns, one-line text), with the rewards note "Journal pages, collars and landmarks wait here until Bellfoot opens..." (r2-trophies-phone.png). Desktop unchanged. Cost: the Climb button is hidden on that tab on the phone, so the player switches tab to start a run; acceptable. |
| Depth | 7 | Same balance report (expert 9 to 12%, plater 0%, no must-pick); Cascade Piston and Hour Hand untested by bots, deferred to B10. |
| Feel | 7 | A floating "Mirrored" cue appears over the Mirror Gear's cell on both sizes while it fires (r2-mirror-gear-phone-3.png). I did not capture the Skewframe, Night Watchman or Resonance Rod cues in my timed frames (the Watchman fires on the enemy turn; frames missed it), and did not check Carried, Shared, Again or +2 ticks. Code maps the item field to labels in `src/render/stage.ts`; one cue seen is real evidence, the rest is not. |
| Look and sound | 7 | Cues are legible, small and do not cover the board. New parts still use family fallback art. Audio not judged. |
| Stability | 8 | Full test run reported green by the coordinator; I reran unit and the two B9b e2e specs in round 1. This round: driven scenarios at both sizes, no console errors, no sideways scroll (667 and 1280 wide). Dev server on 5384 stopped by PID. |
| Spec coverage | 8 | Both round-1 must-fixes delivered (compact phone shelf plus note; cues driven by an `item` event field). |

Average: (8+8+7+7+7+8+8)/7 = 7.57.

## Blockers
None.

## Improvements (for B10 or a later pass)
1. Add an e2e that checks each cue label appears (the stage replays are canvas; expose the last cue list on `__game` so a test can assert "Watchman!", "Diagonal", "Echo", "Carried N").
2. B10 balance: drafter for Night Watchman, Free Pawl, Cascade Piston; check why the autoplay bot wins 3 of 6 early seeds versus the simulator's 9 to 12%.
3. Phone: offer a Climb shortcut on the Trophies tab (a small button in the header) since the sticky one is hidden.

## What I tested
- Dev server on 5384 (stopped by PID), headless Playwright at 667x375 touch and 1280x800: Trophies tab (screens in `review/B9b/gate-shots/r2-*`), item runs for Skewframe, Night Watchman, Mirror Gear and Resonance Rod, 8 frames each at normal speed. Only the Mirrored cue was caught in frames.
