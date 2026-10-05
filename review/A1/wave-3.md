# A1 wave 3 review: foreman and tinker round 2, tinpot general, imp and slick confirm

Verdict: **PASS** foreman (should-fix only), **PASS** tinker (should-fix only), **REVISE** tinpot-general (attack slash and smear), **PASS** spring-imp and oil-slick (should-fix only). No page errors in any recording (foreman, tinker, tinpot, imp, slick, broken variants).

## Scores (1 to 5)
| Asset | Style fit | Rig quality | Readability | Verdict |
|---|---|---|---|---|
| foreman | 4 | 4 | 4 | PASS |
| tinker | 4 | 4 | 4 | PASS |
| tinpot-general | 4 | 3 | 3 | REVISE |
| spring-imp | 4 | 4 | 4 | PASS |
| oil-slick | 4 | 4 | 4 | PASS |

## foreman: wave 2 must-fixes
- Flash (hurt 0 to 2, death 0): resolved. At 0.09 the body barely lightens; no ghost gray (fm-flash.png). Hit star on the dial reads.
- Wrench hand at the canvas edge (attack ~30): resolved. The hand stays well inside the frame through 24 to 32 (fm-attack.png, fm-wrench.png).
- Wrench shaft sliver (attack 16 to 30): resolved. No hairline shaft; the hand is a solid gauntlet. Remaining: the forearm armor still stretches into a crescent with a pointed tail on its underside at 24 to 29 (fm-wrench.png, frames 2 to 4). Should-fix: tighten the elbow blend or widen the forearm weight.
- Arms at the tear (phase 19 to 26): resolved. They open over about 8 frames with no pop; debris and the star cover the apron swap (fm-phase.png).
- Broken embers (`?broken=all`, phase 1 and 2): resolved. Hard-edged orange two-tone shards inside the notches with ink cracks, nothing floats outside the silhouette (fm-broken1.png). Should-fix: the chest shard is large and hides the dial at 220 px; shrink it by about a third. The slam dust lumps and shock ring are ink-edged; the ring is still thin.
- Death still leans and sinks without a bent knee (known, accepted).

## tinker: wave 2 must-fixes
- Painted open hand: resolved. Walk contact and passing (4, 8, 23, 27, 34, 53), idle and hurt all show a small relaxed open hand, no wedge or fan (tk-walk.png, tk-hand-zoom.png). Style matches the character.
- Cheer: resolved. Open-hand wave at 39 to 70 plus sparkles, crouch, hop, landing dust (tk-cheer.png). The hand tap on the chin (idle 90 to 100) is clean.
- Hurt star: resolved. Noticeably smaller, still readable, no longer swallows the chest (tk-hurt-idle.png).
- Far sleeve fringe: not visible at 0.6 scale. Should-fix: pale gray-white wisps sit on the top of the hair at every frame (cut-out halo from the painting); clean those pixels.

## tinpot-general (REVISE, 4/3/3)
- Style and read: strong. The barrel body, top hat, sabre and tin-soldier silhouette read at once; matches the cast. Idle marching, buff (off arm lifts, ink rings) and hurt (eyes squint, hat knocked askew, flash within cap, star on the porthole) are good (tp-idle-hurt-buff.png, tp-flash.png).
- **Must-fix, attack 19 to 31 (tp-slash.png):** the slash does not read. The sabre goes from forward (8 to 17) to behind and over the hat and stays raised; no downward or sideways cut is visible, so the action looks like a salute. Fix: carry the blade through a visible arc in front of the body (about 22 to 28) before it recovers.
- **Must-fix, attack 19 to 25:** the tapered ink smear is a free-floating comma arcing up and to the right of the hat, away from where the blade is. It is detached from the weapon. Fix: anchor it at the blade tip path, or remove it.
- Hat sprite: the blade passing behind the hat (19 to 31) is not a defect on its own (it reads as depth), but combined with the missing swing it hides the action. Should-fix after the slash is changed: keep the blade in front of the hat for the swing.
- Death (tp-death.png): hat pops off, rolls, the body tips and flattens, a spring pops, rivets fly; the last pose (hat beside the lying barrel, sabre pointing out) reads as knocked down and settled. It is a squash, not a true topple, but acceptable. Should-fix: the legs stay standing as stubs under the flattened body (death 50 to 88); fold or fade them.
- Broken looks (tp-broken.png, 125 px sheet): cracked and bitten hat, ink cracks and orange zigzags at hip and arm, a cut sabre. Reads and is bold. Should-fix: the gray smoke lumps hover far from the body in attack (26 to 36), about 150 px off to the right.
- Flashes: hurt 0 to 1 pale but body only and under the cap.

## spring-imp (PASS)
Rig.json present with moods and anchors. The stray fragment under the head is gone (imp-slick.png). Idle, attack, and death read as before. Should-fix: the attack ground ring (attack 38 to 60) is still a thin 1 px white ellipse, not the ink-edged two-tone puff the brief asks for. Broken looks not re-recorded; unchanged from wave 2.

## oil-slick (PASS)
`?broken=slick-nozzle` gives a jagged zigzag cap on the lid: readable as torn, but still a crown shape (slick-nozzle.png). Should-fix only. The hit star and the spit blobs in attack are fine.

## Ranked improvements
1. Tinpot attack: add a visible slash arc in front and attach or remove the floating smear.
2. Thin 1 px white shock rings on the imp (and the foreman's slam ring): make them ink-edged two-tone dust.
3. Small cleanup: hair-top gray wisps on the tinker, foreman forearm tail, detached smoke on the tinpot attack, standing legs in the tinpot death.

## A1 phase
Not yet ready to close: the tinpot general's attack needs one more round (two must-fixes, one lane, small). Everything else (foreman, tinker, rust-mite, brass-beetle, oil-slick, gearhound, spring-imp) can be accepted with the should-fix list above carried as polish.

## Looked at
Sheets in `review/A1/sheets-w3/`: fm-attack, fm-wrench, fm-flash, fm-phase, fm-broken1; tk-walk, tk-cheer, tk-hurt-idle, tk-hand-zoom; tp-attack, tp-slash, tp-death, tp-idle-hurt-buff, tp-flash, tp-broken; imp-slick, slick-nozzle. Recorded fresh with record.mjs (foreman attack, hurt, death, phase, broken in both phases; tinker idle, walk, cheer, hurt; tinpot idle, attack, hurt, death, buff, broken; imp idle, attack, death; slick broken idle and attack). Not checked: the foreman broken looks at a true 220 px in the stage (judged from 0.5-scale frames of a 624 px render), `broken-125px.png` itself, the imp broken looks. The server on 8790 was stopped by PID.
