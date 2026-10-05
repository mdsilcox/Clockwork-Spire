# Steam Wraith: rig notes (1216x832, side view facing left, pad [120, 200])

Painting: retry seed 14 (`source.png`). `clean.py` removes gray background patches and the gray floor smear (the rig draws its own flat shadow) and writes `cut.clean.png`. Build: `python art/valve-crab/build.py steam-wraith` (shared `art/valve-crab/kit.js`).

## Anchors (image pixels: x, y, radius)
- `wraith-claw` (385, 362, 62): the reaching hand. `wraith-vent` (585, 328, 62): the chest. `core` (590, 300, 95). `eyes` (478, 170, 32): the green goggle.

## Rig
- It floats: the whole figure bobs (a flat ink shadow under it shrinks as it rises); feet never plant.
- Bones: head (pivot at the neck), reaching arm (pivot at the shoulder, with an extend/retract), and three cloth-like steam fields driven by one running phase: the teal plume (wisps travel away from the hand and it stretches or shrinks along the arm's line), the golden cloud (breathing scale plus traveling billow), and the coat tails and left hem (traveling ripple). The wisp phase never resets between moods, so the steam never snaps. Hit flash is the shader flash, 0.18 for three frames.
- Code steam is flat, ink-edged and two-tone (teal from the hand, gold from the vent), stepped alpha.
- idle 4: slow float, head leads, arm drifts, cloud breathes, teal puffs from the hand and a gold puff from the vent. attack 2.2: draws back (plume compresses, cloud swells), then thrusts: arm shoots out, plume bursts, five teal steam jets fly left with a star and sparks, a smear on the hand's path. hurt 1.5: jolt right, cloud puffs out, star on the chest. death 3: goggle goes dark, the figure sinks and deflates (squash 42 percent, cloud and plume shrink), steam pours out of the vent and hand until the last frame.
- Broken: the claw has its fingers torn away (notch, embers, cracks up the forearm); the vent is a ragged hole through the chest with embers and cracks. `broken-125.png` has both at 125 px.

## Still bothers me
- The death squash is a uniform vertical compression, so the coat's pattern flattens; it reads as the steam leaving the frame.
- Gray-cleaned holes in the lower plume stay as wisp gaps.

## Round 2 (review wave 1)
- Pad is now 300 px on the left and the teal attack jets are short (0.55 s) and fade inside the canvas. `clean.py` fills the dark holes in the golden cloud. Death keeps the body whole while the cloud and plume shrink away (no squash into a mound). Puff tones are less cream; dust is flat ink-edged chips.
- Broken looks are a big notch with a thick ink rim, a two-tone ember blob inside the hole only and ink cracks 24 px wide with a bright core; `broken-125.png` shows idle and attack at 125 px with both parts broken.
