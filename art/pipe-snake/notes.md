# Pipe Snake: rig notes (1216x832, side view facing left, pad [150, 240])

Build: `python art/valve-crab/build.py pipe-snake` (shared `art/valve-crab/kit.js`; no cleaning needed, built from `cut.png`).

## Anchors (image pixels: x, y, radius)
- `snake-fangs` (610, 190, 62): the open mouth with the forked fangs. `snake-coil` (200, 590, 85): the tail pipe's corrugated coil on the left. `core` (690, 520, 100): the coil body. `eyes` (630, 130, 26).

## Rig
- Bones: neck (pivot at its base (700, 440)), head and upper neck (pivot (745, 265), children deform before the neck), tail pipe (pivot (440, 575)), two hoses (pivots (380, 470) and (960, 430)), and a coil with a slow traveling ripple and a breath swell. Hit flash is the shader flash, 0.18 for three frames.
- idle 4: neck sways, the head leads and the neck follows a beat later, the coil breathes with a ripple, the tail drifts and flicks once, hoses sway, a blink, a steam hiss from the coil and a tail puff once per loop.
- attack 2.2: rears back and trembles (head high, neck leans right, coil swells, vents puff), then the head snaps down and left (smear along the fang's real path, star and sparks at the fangs, dust ring, shake), recovers.
- hurt 1.5: head snaps back, star at the head. death 3: eye flickers and goes dark, the neck folds over the coil, the head drops onto the coil, the coil flattens, steam vents to the end.
- Broken: the snout and fangs are bitten away (jagged notch, ember cluster, cracks); the tail coil is sheared through (notch, embers, cracks). `broken-125.png` has both broken at 125 px.

## Still bothers me
- The death fold shows the neck's inside where it crosses the coil (a darker slice of paint); it reads as a slump.
- The forked tongue stays rigid (painted).

## Round 2 (review wave 1)
- Attack: bigger rear-back (head 26 degrees, neck 14, coil swell 8 percent), then a snap down and left with a dust ring and chips. Death: the neck folds 42 degrees and the head rests on the coil (head offset 66 px down, kept visible); the neck weight band is narrowed (x 610 to 830) to keep the wedge small.
- Broken looks are now a big notch (1.4 to 1.9 times the old chunk) with a thick ink rim, a two-tone ember blob inside the hole only, and ink cracks 24 px wide at painting size with a bright core. Cream pebble dust was replaced by small flat ink-edged chips (`spawnDust` in `art/valve-crab/kit.js`); `broken-125.png` shows idle and attack frames with every part broken at 125 px.

## Round 2, wave 2
- Death: the neck weight band is now x 500 to 806 with its base at (700, 415) and a narrow ramp (y 394 to 406), the head offset is 12 px, and the neck bends 58 degrees with the head 22: head and neck move as one connected chain and the head lies on the coil (no gap). A small dark spike behind the neck remains.
