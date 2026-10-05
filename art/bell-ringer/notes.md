# Bell Ringer: rig notes (896x1152, front view, pad [180, 120])
Build: `python art/bell-ringer/clean.py` (erases the baked ground-shadow streaks right of the boots; they would flash), then `python art/bell-ringer/build.py bell-ringer` (template + the asset's `kit.js` + rig.js + cut.clean.png). `kit.js` is a copy of the shared effects kit (ink effects, broken-look kit, sound waves, grit shards).
## Anchors (x, y, r)
ringer-clapper (190, 215, 70) the hand bell on its rod; ringer-fist (612, 685, 62) the gauntlet on the hip; ringer-rope (183, 420, 50) the hanging rope; core (380, 510, 90) the lit lamp; eyes (430, 330, 45): no face, two small embers in the dark under the helmet.
## Rig
Weights: bell+rod (pivot (322, 205)), rope (sway lags the bell), right arm (pivot (690, 430)), body lean/squash about the hem (390, 905); boots never move.
## Moods
idle 4: sway, bell tolls once with sound rings, lamp pulse, blink. attack 2.4: lean back with the bell raised, lunge left and slam the bell down (smear along its path, star, three rings, sparks). hurt 1.5: flash 0.18 for 3 frames, 34 px knock right, bell flings. death 3: shudder, lamp and eyes die, the body sinks and tips, the bell drops, rings and shards at the hem.
## Broken looks
Large jagged notches erased from the alpha: bell mouth bitten, gauntlet blown out, rope snapped with a long gap; ember edge and embers only inside the notch, thick ink cracks; leaks sparks.
