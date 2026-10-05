# Gauge Gremlin: rig notes (1216x832, three-quarter view facing left, pad [120, 160])

`clean.py` drops tiny background islands and writes `cut.clean.png`. Build: `python art/valve-crab/build.py gauge-gremlin` (shared `art/valve-crab/kit.js`).

## Anchors (image pixels: x, y, radius)
- `gremlin-wrench` (1030, 400, 95): the oversized two-pronged wrench in the right hand (head near (1085, 335)). `gremlin-spanner` (200, 585, 80): the long spike spanner in the left hand (tip at (75, 590)). `core` (680, 520, 100): the gear chest. `eyes` (685, 205, 70): the goggles.

## Rig
- Bones: head (pivot at the neck (680, 335); hx/hy lets it duck and lunge), left and right ears (pivots at their roots; they follow a beat after the head), wrench (pivot at the grip (885, 520)), spanner arm (pivot (455, 565) plus a thrust translate), a spinning gear wheel (ticks forward), body bob and roll (feet and legs planted). Hit flash is the shader flash, 0.18 for three frames.
- idle 4: breath, head leads and ears trail, one flick per ear, the wrench taps, the spanner twitches, the gear ticks every second with a small spark, a steam puff, goggle glints hop between lenses.
- attack 2.0: duck and lean back with the spanner pulled in and the wrench raised, then a lunge left with the spike thrust (smear follows the tip's real path, star and sparks at the tip, dust ring, shake), recover.
- hurt 1.5: jolt right, ears fly up, star on the chest. death 3: goggle lights go out (dark discs), the head, ears and wrench droop, the body sinks 56 px and rolls, the gear spins down.
- Broken: the wrench jaws are bitten away (notch, embers, cracks down the handle); the spike is snapped off at the grip (stub with an ember and cracks over the hand). `broken-125.png` has both broken at 125 px.

## Still bothers me
- The gremlin has no mouth movement (none painted); expressions come from the ears and head.
- The dark death discs over the goggles are flat; fine at game size.

## Round 2 (review wave 1)
- Attack: a deep duck and coil, then a lunge that moves the body 110 px left with the spike thrown 230 px out; smear, star, sparks, dust chips and two ground rings at the feet. Spanner break is a chunk out of the grip (the spike hangs snapped off).
- Broken looks are now a big notch (1.4 to 1.9 times the old chunk) with a thick ink rim, a two-tone ember blob inside the hole only, and ink cracks 24 px wide at painting size with a bright core. Cream pebble dust was replaced by small flat ink-edged chips (`spawnDust` in `art/valve-crab/kit.js`); `broken-125.png` shows idle and attack frames with every part broken at 125 px.

## Round 2, wave 2
- Left pad is 260 px (was 120) so the spike tip and its smear stay inside the canvas at the lunge.
