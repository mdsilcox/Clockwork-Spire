# Furnace Golem: rig notes (896x1152, front view, pad [150, 230])

`clean.py` removes the cream halo and the ground rubble (the cut-out now ends flat at y 1090) and writes `cut.clean.png`. Build: `python art/valve-crab/build.py furnace-golem` (shared `art/valve-crab/kit.js`).

## Anchors (image pixels: x, y, radius)
- `golem-heart` (445, 430, 70): the glowing chest door. `golem-fist` (175, 790, 90): the left Slag Fist (the striking arm, the one on the player's side). `core` (445, 330, 100). `eyes` (492, 190, 34): the dark slit in the dome (a small ember flares there in attack).

## Rig
- Weights: body (everything above the thighs, fading to planted at the feet, so the legs never slide), two arm columns (rotation about the shoulders plus foreshorten/stretch: the arm shortens and rises toward the viewer in the wind-up, then lengthens and drops in the slam), two leg bands (small foot lift), the painted chimney flame (flickers). Hit flash is the shader flash, 0.18 for three frames.
- Code effects are flat and ink-edged: chimney smoke (gray), shoulder vents (steam), dust rings and puffs at the feet, spark streaks, hit star, a smear that follows the fist's real path, hard-edged ember disks on the fist ports, chest heart and dome slit.
- idle 4: slow breath, arms swing opposite, flame flicker, one leg lifts and plants with a dust ring, a small shudder, smoke and a spark now and then. attack 2.6: lean back, left fist winds up with three vents, ports flare, then a slam with star, sparks, rings, dust and shake. hurt 1.5: jolt right, star on the chest. death 3: ports and heart flicker and die (dark discs), the body sags 84 px, arms drop, smoke keeps rising.
- Broken: the heart door is smashed into a jagged hole with an ember cluster and cracks fanning across the plate; the fist has a bite out of its outer edge with embers and cracks. `broken-125.png` is the 125 px frame with both broken.

## Still bothers me
- The slam stretches the arm about 30 percent for three frames (the painting has no ground contact pose).
- The feet are cut flat where the cleaned rubble ended.

## Round 2 (review wave 1)
- Arms and legs are separate objects below the pelvis (`part`/`tear`), and the arm weight no longer fades near the fingers, so a raised arm never drags a leg band. The slam leans the torso and drops the shoulder; the arm stretches 10 percent at most. Death sinks 50 px (legs compress about 12 percent). Dust is small ink-edged chips.
- Broken looks are now a big notch (1.4 to 1.9 times the old chunk) with a thick ink rim, a two-tone ember blob inside the hole only, and ink cracks 24 px wide at painting size with a bright core. Cream pebble dust was replaced by small flat ink-edged chips (`spawnDust` in `art/valve-crab/kit.js`); `broken-125.png` shows idle and attack frames with every part broken at 125 px.

## Round 2, wave 2
- Wind-up foreshortening is now 8 percent (was 24), so the painted claw under the raised fist is less squashed (a small dark claw shape remains).
