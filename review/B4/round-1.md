# B4 "Workshop, meta and Sprocket" review, round 1

Verdict: PASS (no blockers, every metric at least 7, average 7.86; threshold 7.5)

Commit 50fab83 (cs-review-B4).

## Scores
| Metric | Score | Evidence |
|---|---|---|
| Fun | 8 | Loop of climb, die, Brass, upgrade or chassis unlock, climb again works; the first upgrade (40 Brass) is reachable in about 2 short runs and Reinforced Frame showed up as 55 max HP next run. Careers report: win rate rises from 0% at 0 Brass spent to 19.8% at 500+. |
| Clarity | 7 | Workshop tabs (bench, chassis, notes, blueprints, history) are labelled, buttons say "Needs 10 more Brass" and unlock conditions are stated ("Reach act 2, or 150 Brass"). A floor-9 loss paid only 24 Brass, a low number that is not explained anywhere I saw, and a loss that beat the previous best floor greets with "happy" rather than comfort. |
| Depth | 8 | Careers report: median first win at run 9 (quartiles 7 to 12; none unwon in 30 runs), no-meta win 1.0%, part impact max 1.17 vs median 0.97. Targets test passes. Win rate climbs steeply with Brass spent, so meta power does matter. |
| Feel | 8 | Sprocket moves between idle, happy, comfort, pet, sleepy; the Workshop line text changes with the pose; ending scenes have their own timing, with a Skip button. |
| Look and sound | 8 | Sprocket is clearly a corgi at both sizes: big pink-lined ears, short legs, white chest, collar tag, fluffy rear; sleepy pose with Zs is charming, and the Pipes event shows him wedged behind the pipes. Workshop room and the ending scenes (stairs, sleeping on the rug by the door) are cohesive. Audio muted under automation, not judged (barks exist in code; music is B5). |
| Stability | 8 | `npm test`: 276 unit passed; 91 e2e passed, 1 skipped. No console errors across slots, Workshop, run, event and ending at both sizes. Slots and profile survive reload (the reinforced frame applied after reload and Use slot). |
| Spec coverage | 8 | Three slots, Workshop hub, upgrade bench, chassis rack (Tinker, Stoker, Horologist, unlock by Brass or progress), notes, blueprints, history, Brass paid on every run, Sprocket greeting by mood, sleepy after 20 s idle, petting, three Sprocket events (checked the Pipes one), a Sprocket trinket, and the victory ending with credits that credit "Sprocket as himself". |

Average: (8+7+8+8+8+8+8)/7 = 7.86. Sprocket requirement (spec 2.4): met.

## Blockers
None.

## Improvements (ranked)
1. Clarity: explain Brass income on the defeat screen (for example "4 Brass per floor in act 1, plus bonuses") and make the first-time greeting for a very early loss comforting; today a floor-5 loss on a fresh profile greets "happy".
2. Look, Sprocket: the fluffy rear is a scalloped blob that reads more like a cookie or flower than a corgi butt, especially in the large sleeping ending pose; smoothing the silhouette would make the drawing as charming as the face.
3. Ending polish: at 667x375 the first two caption bubbles ("The hands slow, and slow, and stop." and the quote) sit side by side and squeeze each other; stack or sequence them.

## What I tested
- `npm test` with PW_PORT=5362 (run in the review copy), Vite on port 5363 (stopped by PID afterwards).
- Both sizes (1280x800 and 667x375 touch, deviceScaleFactor 2): title, slots dialog, creating two slots, Workshop with Sprocket, climbing via the real UI, a defeat and its summary, Sprocket greeting (happy after floor 9, comfort after floor 3), idle to sleepy (cheat.idle), tap to pet, upgrade purchase through the UI, chassis unlock through the UI (Stoker), Notes, Blueprints and History tabs, reload and resume of the slot, the Sprocket pipe event and its outcome, and the full victory ending through credits.
- Read the careers report and targets test result. Not tested: audio and barks (muted), the other two Sprocket events and trinket (only the Pipes event), playing a true win through all three bosses (used cheat.finishRun).
