# A2 wave 1 review: valve crab, furnace golem, pipe snake, gauge gremlin, steam wraith, pressure warden, twin pistons

Verdict: **REVISE** (all seven; golem, wraith, snake and the two elites have must-fixes, crab and gremlin are mostly thin attacks and weak broken looks).

## Scores (1 to 5)
| Asset | Style fit | Rig quality | Readability | Verdict |
|---|---|---|---|---|
| valve-crab | 4 | 3 | 4 | REVISE (attack weak, broken looks unreadable) |
| furnace-golem | 4 | 2 | 4 | REVISE (sliver in windup, stretched slam) |
| pipe-snake | 4 | 3 | 4 | REVISE (death pile is a jumble, strike small) |
| gauge-gremlin | 3 | 3 | 4 | REVISE (attack barely moves) |
| steam-wraith | 4 | 3 | 4 | REVISE (jets clip at canvas edge, death squash) |
| pressure-warden | 4 | 3 | 4 | REVISE (arm clipping and stretch, weak death) |
| twin-pistons | 4 | 3 | 4 | REVISE (blast arcs clip and float, broken ram clips) |

Style: all seven sit with the approved set (ink outline, teal/brass/rust, key light upper left). Gremlin is the outlier: a soft, cute, detailed face (reads Gizmo/Grogu-like) against the flatter inked machines; acceptable but the least consistent. Hit flash is within the cap everywhere (mean frame brightness rises about 8 percent for 2 to 3 frames then settles; body-only, easing over 3 frames, no puddle or shadow ghosting). The cream "pebble" dust lumps seen in A1 (gearhound) come back on the golem and crab.

## Must-fix
- **furnace-golem, attack 12 to 30**: a dark gray spike/sliver stretches from the wound-up left fist down to the leg (arm drags the leg band). Tear the arm from the leg weights, or limit the left-leg weight band near the arm. This is the same arm-drags-leg fault as the crab, much worse.
- **furnace-golem, attack 36 to 46 (slam)**: the arm lengthens roughly 30 percent and the forearm texture smears; the fist lands at the foot with the arm visibly rubbery. Lean the torso and drop the shoulder instead of stretching; cap stretch at about 10 percent.
- **steam-wraith, attack 38 to 52**: the five teal steam jets are cut off by the canvas left edge (bars with a flat left side at x 0). Increase left pad or shorten and fade the jets before the edge.
- **pressure-warden, attack 34 to 52 and broken-125px frame 1**: the punch arm and its sparks reach the left canvas edge and clip at the peak; the forearm is a long thin stretch at full extension (the notes admit it). Add pad on the left, cap the extension at about 20 percent, and thicken the forearm slightly.
- **twin-pistons, attack 40 to 78**: blast arcs sit alone in the dark as thin gray parentheses (frames 56 to 78 they linger detached from the ram) and are clipped by the left edge at 40 to 48; the broken-125px attack cell clips the barrel at the left edge. Pad the left, attach the arcs to the muzzle star, give them the 2-tone ink-edge look, fade by frame 60.
- **All five act 2 regulars, broken looks**: at 125 px (see `broken-full-act2.png` and the `*-broken3x.png` sheets) the damage reads as small orange ember crowns with hairline cracks; the silhouette notch the spec asks for is not visible on the crab claw, valve, golem fist, gremlin wrench, snake coil or wraith claw. Cut a bigger jagged chunk out of the alpha (about 2x), make the ink cracks 3 to 4 px, and keep the ember inside the notch rather than floating on the edge. The warden's and twins' broken looks (`*-broken-125px.png`) have the same issue: the dome "break" is an ember squiggle, not glass; the link stub is nearly invisible.

## Should-fix
- **valve-crab, attack 20 to 50**: the arm raise is shallow and the slam is a small spark at the claw tip; windup and impact are hard to read at game size. Raise the claw higher, sink the body in the windup, add a ground hit and a stronger body drop on impact. The raised left arm still pulls the neighboring brass leg slightly (known); tear it.
- **gauge-gremlin, attack 15 to 45**: the lunge is nearly invisible at the sampled frames; only a tiny spark shows at the spike tip. Bigger duck-and-lunge (body moves 30 px or more), smear on the spike path.
- **pipe-snake, death 55 to 89**: the neck fold leaves a jumble of pipes and a dark triangular wedge standing up behind the coil; the head disappears. Show the head resting on the coil, remove or clip the wedge. Attack: the head snap is small; add a larger rear-back (head higher, coil swells more).
- **steam-wraith, death 60 to 89**: uniform vertical squash flattens the head and body into a mound with cream mushroom puffs; reads as deflating, which is fine, but the puffs are cream lumps (not ink-edged enough). Gold cloud has dark cut-out holes (gray-cleaned patches) visible at all moods; fill them or lighten edges.
- **furnace-golem, death 60 to 89**: legs splay and the lower leg texture ragged (cream pebbles, flat disks). **pressure-warden and twin-pistons death**: they barely change pose (sink only) so death reads as a pause; add a knee bend or lean past 15 degrees and let steam rise.
- Dust and debris: cream pebble lumps (golem, crab at attack 40 to 60, warden) read as stones or mushrooms; make them small, flat, ink-edged rust or gray shapes (the A1 gearhound fault repeats).
- Idle (golem, snake, gremlin, wraith): motion is subtle but present; no freeze seen in the 12 sampled frames per asset.

## Checks that passed
- Hit flash: within 0.25 and easing over 3 frames on all seven (hurt and death 0 to 4).
- Cut-outs: no halo or gray backdrop specks seen on the crab, golem, snake, gremlin, wraith; elites clean except wraith cloud holes.
- No mesh smears or seams on the snake, gremlin, wraith, warden, twins beyond what is listed.
- Anchor and rig.json files present for all seven (contents not checked in code).

## Ranked improvements
1. Rebuild the broken looks bolder (bigger notch, thick ink cracks, ember inside the cut) so they read at 125 px on all seven.
2. Fix the golem sliver and stretched slam, then pad the left edge for the wraith jets, warden fist and twin blast arcs.
3. Make attack impacts readable at game size on the crab and gremlin, and give the warden and twins a real death collapse.

## Looked at
`review/A2/sheets-w1/`: `<asset>-attack.png`, `-death.png` (8 even frames), `<asset>-attackkey.png`, `-hurtkey.png`, `-deathkey.png`, `-idlekey.png`, `<asset>-broken3x.png` (3x nearest of the lane's broken 125 px frame), `broken-full-act2.png` (frame 0 of `frames-broken/idle` for the five regulars at 500 px), `golem-attack-sliver.png`, `snake-death-late.png`. I viewed the attack, hurt and death sheets for all seven and death/hurt for each, but only the valve crab death and attack in the first (coarse) sheet pair. I did not open the pages in a browser, so page errors, `?broken=` parsing and live clips were not checked, and I did not view the idle key sheets or the `clip.webp` files.
