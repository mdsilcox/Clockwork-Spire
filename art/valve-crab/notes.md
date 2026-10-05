# Valve Crab: rig notes (1216x832, front view, pad [140, 220])

Build: `python art/valve-crab/build.py valve-crab` (template + shared `kit.js` + rig.js + `cut.clean.png`). `clean.py` clears the gray background patches and floor smudges from the cut-out and writes `cut.clean.png`. `kit.js` is the act 2 shared kit (flat ink effects, notched broken looks, chain weights); the other act 2 rigs build with `python art/valve-crab/build.py <asset>`.

## Anchors (image pixels: x, y, radius)
- `crab-pincer` (118, 540, 75): the left claw tip (the striking arm; the crab is front-on, so "left" is the player's side). `crab-valve` (640, 110, 62): the brass stack on the dome. `core` (640, 345, 95), `eyes` (640, 385, 42): the cyan lens.

## Rig
- Weights: body (dome, underframe, valve; legs fade to planted below y 640), two teal arms by distance to a shoulder-to-claw chain (rotate about the shoulders (420, 290) and (815, 285)), four brass leg bands (hip rotation and foot lift), valve cap (hops), antenna (sways). Hit flash is the shader flash, capped at 0.18 for three frames.
- idle 4: breath bob, arms sway opposite, a claw twitch, the valve hops and hisses once, one foot lifts and plants per loop (alternating far legs, with a dust ring).
- attack 2.4: sink and raise both arms with three valve puffs, hold, then the left claw slams down and in (smear follows the claw's real path), spark star, dust rings, screen shake.
- hurt 1.5: jolt right, arms flinch, star on the lens. death 3: lens flickers and goes dark, arms and legs sag, body sinks 70 px, steam vents to the end.
- Broken: pincer has a jagged bite out of the claw with embers and cracks up the teal arm; valve is snapped off at a slant with an ember stump and cracks. Frame at 125 px with both broken: `broken-125.png`.

## Still bothers me
- Raising the left arm drags the brass leg beside it a little (they overlap in the painting).
- Cracks are thin at the 125 px read; the notches and embers carry the look.

## Round 2 (review wave 1)
- Attack: sinks low, raises the left claw high over the body (28 degrees), then slams it down onto the ground (body drop 30 px, star, sparks, rust and gray dust chips, two ground rings, shake); the smear follows the claw's real path. The claw arm weight is tight so the neighboring brass leg stays put.
- Broken looks are now a big notch (1.4 to 1.9 times the old chunk) with a thick ink rim, a two-tone ember blob inside the hole only, and ink cracks 24 px wide at painting size with a bright core. Cream pebble dust was replaced by small flat ink-edged chips (`spawnDust` in `art/valve-crab/kit.js`); `broken-125.png` shows idle and attack frames with every part broken at 125 px.
