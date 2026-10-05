# A1 wave 2 review: wave 1 fixes, spring imp, tinker, foreman

Verdict: **REVISE** for the tinker and the foreman; **PASS** (should-fix only) for the spring imp, rust mite, brass beetle and gearhound; **PASS with should-fix** for the oil slick. Wave 1 must-fixes are resolved, except that the foreman repeats the ghost flash and the new broken kit (mite and imp excepted) is weak.

## Scores (1 to 5)
| Asset | Style fit | Rig quality | Readability | Verdict |
|---|---|---|---|---|
| rust-mite (re-check) | 4 | 4 | 4 | PASS |
| brass-beetle (re-check) | 4 | 4 | 4 | PASS |
| oil-slick (re-check) | 4 | 4 | 4 | PASS (should-fix) |
| gearhound (re-check) | 4 | 4 | 4 | PASS |
| spring-imp | 4 | 4 | 4 | PASS (should-fix) |
| tinker | 3 | 3 | 3 | REVISE |
| foreman | 4 | 3 | 4 | REVISE |

## Wave 1 must-fixes
- Mite gland glow: resolved. Hard-edged octagon with a bright core, eases from full at attack 20 to idle level by about 48 (sheet mite-attack.png). Hurt flash 0.2, star at the dome, fine. Broken gland is now a jagged bite out of the dome plus a glowing edge: reads at 400 px (pair-mite-slick.png). Broken pincers: still a very small change on the horn (should-fix: larger bite).
- Beetle windup: resolved. Attack 12 to 26 now lowers the head and rocks the body back before the lunge (beetle-attack.png). Notches show as orange cracked bites on shell and carapace.
- Slick flash: now body only, puddle untouched; value 0.2 in code. Hurt 0 still looks noticeably pale and gray on the dark iron (slick-flash-zoom.png, top left) but it is within the cap and eases out by frame 3. Death legs keep their length and the puddle spreads (slick-hurt-death.png frames 25 to 89). Attack now has a rear-up at 18 to 26 and a visible spit at 30 to 40; idle shows breath and a lid puff (slick-attack-idle.png). Resolved. Should-fix: the broken nozzle erases the lid cap into a spiky crown shape, which reads as a crown rather than a ruptured cap; the spitter notch is fine.
- Hound flash: now 0.14, body only, shadow unaffected (hound-hurt-death.png). Pounce shadow shrinks at 22 to 26, dust is small flat gray lumps, fangs, snout and haunch broken looks are orange jagged shards that read (broken-idle-400.png). Resolved.
- `?broken=id,id` now works on all five rigs. `?broken=all` works only on the foreman; the others ignore "all" (use ids). Not a defect, just so the checker knows.
- No page errors in any of the 7 recordings (empty error arrays).

## spring-imp (PASS, 4/4/4)
- Idle 0 to 119: small tail sway and head twitch; very subtle (sheet imp-idle.png), but there is life in the tail bulb and fin. Attack 0 to 68: coil (8 to 26), lunge left with the head, spark and hit star at the lens at 36 to 40, skitter home 44 to 62 with feet planting (imp-attack-zoom.png). No shear. Hurt: flash is within cap (0.2, 0.12, 0.05), star on the box. Death: eye lens goes dull, bulb goes dark, body sinks, steam lumps at 45 to 89. Final pose settled.
- Cut-out: a small white-gray fragment hangs below the head at the left of the chest in every frame (painted, or a leftover from clean.py). Should-fix: remove it or confirm it is part of the painting.
- Should-fix: the attack and death ground rings are thin 1 px pale ellipses (attack 38 to 62, death 40 to 64), not the flat ink-edged style; the death steam lumps hover detached above the head (45 to 75) rather than rising from the vent. Make the ring a two-tone dust puff.
- Should-fix: `art/spring-imp/rig.json` is missing (the brief requires it: moods, durations, anchors imp-tail, imp-key, core, eyes). The page has the anchors; write the file.
- Broken looks (imp-tail, imp-key): visible at 400 px as glowing notches on the hose and the dial rim with cracks and a spark; at 125 px the imp is about 60 px tall in the stage and the damage is faint.

## tinker (REVISE, 3/3/3)
- Walk, 60 frames. Contact (4, 8, 34, 38) and passing (23, 27, 53) poses: legs plant with the heel, the boot stays flat in stance, the body dips and rises, the crotch stays closed with no shear gap in any of the 16 sampled frames (tinker-walk.png). Backpack lags. Good. Arms swing opposite. Passing frames show a dark crinkled seam on the thigh trouser (23, 27) that looks like a deformation fold; minor.
- **Must-fix, walk 6 to 30, 38 to 50 (every frame), idle 0 to 60 and 115, hurt all frames:** the far (extended) hand is a large flat wedge or paddle with a sharp black ink point on top, not a hand. At the passing frames it grows into a stretched fan shape (walk 23, 27; tinker-walk-zoom.png). It is the leftover of the cart handle cut (clean.py) and the lane's own note says "a masked repaint of a relaxed open hand would be better". It is on screen in every mood, so it is the main read problem. Fix: masked repaint of the hand (ask the orchestrator), or until then crop the stump so the wrist ends in a small rounded fist and stop the weights stretching the hand.
- **Should-fix, cheer 22 to 70 (tinker-idle-cheer.png):** the fist that "shoots up" is a drooping cone or mitten, not a fist; same cause. The crouch (12), hop with tucked legs (22) and landing dust (30 to 55) are good.
- Should-fix, near hand: a block fist (walk 4, 8). Acceptable at game size but flat next to Sprocket.
- Hurt 0 to 8: the hit star is large and covers the chest and belt for 6 frames (hurt 3 to 8). Shrink about 30 percent. Flash within cap. Head snap and arms fling read, recovery overshoots nicely.
- Far sleeve fringe: a few ragged pixels at the shoulder seam of the far sleeve in frames 15 to 30; at 300 px it is a faint white-gray fuzz; should-fix with the hand repaint.
- Idle: weight shift, glance and hand to the chin (85 to 95) read; the hand covers part of the chin as a wedge. Style: warm and simple, matches the brief; ink line slightly heavier than Sprocket's.

## foreman (REVISE, 4/3/4)
- Idle: breath, arm lag, vent steam; fine. Tear sequence (phase 20 to 36, sheets foreman-phase.png, foreman-tear-seq.png, foreman-tear-zoom.png): the apron buckle disappears, the bolted band is revealed, debris plates (flat orange pentagons with ink edge), hit star and vent steam cover the crossfade. Reads as torn off and the crossfade is clean. The roar and rise (45 to 119) is steady.
- **Must-fix, phase 21 to 22 (0.70 to 0.73 s):** the arms snap from folded in front (the grip) to hanging out wide in one frame, with the knee plates appearing at the same time. A visible pop at the start of the tear. Fix: ease the arm opening over about 4 frames (frames 19 to 24) or hide the pop with the first debris burst.
- **Must-fix, hurt 0 to 2 and death 0:** the ghost flash returns. The code says 0.25 but the whole body turns a flat washed gray-teal for 3 frames (foreman-slam-flash-zoom.png bottom left and middle), far past a 0.25 read, like wave 1's slick and hound before the fix. Fix: use a warm tint at a real alpha of 0.15 to 0.2 (check the blend; the other rigs at 0.2 look right), ease out over 3 frames.
- **Must-fix, attack 30:** the wrench arm sweeps horizontally and the hand is clipped by the right canvas edge for about 2 frames (foreman-attack-30.png). Increase the right pad in `rig.json` pad, or lower the arm sweep. This also bites the game stage.
- **Must-fix, attack 16 to 30:** the wrench shaft has stretched into a hairline diagonal sliver that trails from the raised hand, down to the left (attack 22 to 30; also visible in frames 16 and 29 and in the broken frames). Also the forearm cuff becomes a crescent at 27 to 30. Fix: tear the mesh between hand and shaft, or paint the shaft out and attach a short flat stub as an effect.
- Slam (33 to 40): arm down, flat star at the boot, cream dust lumps and a thin white ring. Reads as a hit; the shock ring is a thin 1 px ellipse (same note as the imp). Should-fix: the swing goes from raised (29) to the ground (33) in four frames with no body weight shift; add a short squash of the shoulders at impact.
- Death (sheet foreman-death.png): sinks over 30 to 64 to a hunch on the left side with the eyes dark at 70; the furnace dims. Reads as collapse, not quite a kneel: the legs do not fold, the body just tilts and lowers; acceptable, should-fix to bend one leg. Death 0 flash is the same must-fix as above. Steam puffs rise and drift; end pose settled.
- **Must-fix, broken looks (`?broken=all`, both `?phase=1` and `?phase=2`, 220 px and 600 px; foreman-broken-220.png, foreman-broken-600.png):** each part gets a soft airbrushed orange ball (radial gradient) that floats partly outside the silhouette beside the arms and hips, over a small gold-outlined notch. At 220 px the balls dominate the figure and read as orange balloons attached to the armor, not damage. Hard-edged flat ember shapes are required (same rule as the wave 1 mite glow); keep the ember inside the erased notch only, and do not draw it off the silhouette. The notches and black cracks themselves read well and the parts can be told apart; the same discs appear in every mood (attack, hurt, death). The apron disc is correctly hidden in phase 2.
- Phone size: at 220 px unbroken the figure is readable and strong (foreman-broken-220.png first and fifth cells).

## Cross-asset
1. Painted bits left in the cut-outs and stretched by the mesh (the tinker's hand, the foreman's wrench shaft, the imp's hanging fragment) are the main wave 2 defect; the cure is a repaint or a tear, not a code effect.
2. Soft radial-gradient glows are still appearing (the foreman's broken embers). The mite shows the right pattern now.
3. Thin 1 px white shock rings (imp, foreman) do not match the ink-edged two-tone effects of the cog rat; make them two-tone.
4. All new frames are free of page errors.

## Ranked improvements
1. Tinker hand repaint (or remove the paddle) and fix the cheer fist; then re-check walk 23 and 27.
2. Foreman: wrench shaft sliver, edge clipping at attack 30, pop at phase 21 to 22, flash.
3. Replace the foreman's soft ember balls with hard-edged embers inside the notches; write `art/spring-imp/rig.json`.

## Looked at
Sheets in `review/A1/sheets-w2/`: imp-attack, imp-attack-zoom, imp-idle, imp-hurtdeath; tinker-walk, tinker-walk-zoom, tinker-idle-cheer, tinker-hurt; foreman-phase, foreman-tear-zoom, foreman-tear-seq, foreman-attack, foreman-attack-reach, foreman-attack-30, foreman-death, foreman-idle-hurt, foreman-slam-flash-zoom, foreman-broken-220, foreman-broken-600; mite-attack, mite-hurt-death, beetle-attack, beetle-hurt-death, slick-hurt-death, slick-attack-idle, slick-flash-zoom, hound-attack-idle, hound-hurt-death; broken-idle-400, broken-all-400 (pages that ignore `all`, shown for the record), pair-mite-slick, phone125-broken. All frames recorded fresh with record.mjs (idle, attack, hurt, death, walk, cheer, phase) from the live pages; `?broken=` shots at 125, 220, 400, 600 and 700 px stage height. Not checked: the beetle broken looks during attack and death, the slick and hound broken looks in motion beyond the idle and attack stills, and the Tinpot General. The local server on port 8790 was stopped by PID.
