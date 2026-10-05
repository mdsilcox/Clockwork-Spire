# The Foreman: rig notes (896x1152, front view)

Two paintings, identical geometry outside the waist: `cut.png` (phase 1, leather apron) and `cut-phase2.png` (bolted band). `foreman.template.html` mounts two rigs stacked; `build.py` inlines both. The phase 2 layer's opacity ramps over 0.4 s at the tear. Effects live only on the top layer.

Joints: neck (450,268); wrench arm (painting's right side) shoulder (692,448), elbow (716,662); rivet arm (left side) shoulder (200,448), elbow (172,664). Arm weights stop at the part boundary (x 621 right, 262 to 274 left) with part/tear so the hips never smear. Arm cut-offs by y keep the boots out.

Moods: idle 4 (breath, lagging arms, twitch-and-hold head turn, vent steam, furnace pulse), attack 2.8 (windup to 0.95, slam 1.07, squash and hold to 1.3, rivet shot at 1.75), hurt 1.8, phase 4 (grip, tear at 0.72, roar from 1.15, rise), death 3 (to one side, eyes dark at 1.75, furnace dies).
The wrench is in the painting's right hand (viewer's right), the rivet gun on the left; the brief said viewer's left for the wrench but the painting shows it on the right.
Broken: notches are erased from a re-uploaded texture (canvas into the existing GL texture), with ink cracks and an ember rim; an ember disc behind it is drawn on the bottom layer's underlay. Works in every mood.

Round 2 (wave 2 review):
- Hit flash is 0.09 easing out over 3 frames (hurt and death), body only.
- Pad is now [300, 230] (stage aspect 1496 x 1612) and the windup swing is 70 + 78 degrees, so the wrench hand stays inside the canvas.
- The wrench is weighted as one piece with the hand (arm weights reach y 1070 for x > 662, boots excluded by x); the elbow blend is tighter, so no hairline shaft.
- Phase arms ease from the grip to wide over 0.58 to 0.95 s (about 11 frames); the tear event stays at 0.72 s.
- Broken embers are baked into the texture: a hard-edged two-tone ember (#C2461A, #FFB547, ink edge) inside the notch, masked by the painting's alpha, so nothing floats off the silhouette. No radial glows.
- Shock rings are ink-edged two-tone dust bands.
- Not done: death is still a lean and sink, not a bent knee (the legs share the boot weights; a knee bend smeared).


## B9a: in the game (RigHub)
`src/art/foreman.ts` is this rig converted (scripts/rig-convert.mjs, then by hand): both paintings ship as WebP (`cut.webp`, `cut-phase2.webp` as the stacked layer `phase2`, crossfaded by `view.layers.phase2`; a fight that starts in phase 2 starts with the layer up). The broken look is `bakeBroken`: notches, ember rim and cracks baked into a copy of each painting by the hub. Effects clear when a new fight restarts the rig clock. `clip.webp` is re-recorded from the game itself (`node art/lib/record-game.mjs`, forced moods, 15 fps).

Round 2 (art review): the Foreman loses the stray rod under his left hand (cut.png and cut-phase2.png, alpha erased below y 898 at x 190 to 240) and dies lower (lift -150, lean -22).

Round 3: the wrench swing leaves a flat ink-edged smear along the path of the wrench head (attack 0.45 to 1.4 s), so the arm reads as a swing.
