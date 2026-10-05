# Echo Sprite: rig notes (1216x832, pad [320, 330])
The painting faces right; the page mirrors it with CSS (`#flip`). `clean.py` removes the stray figure, the ground line and puddle streaks (cut.clean.png). It floats: no feet. Build: `python art/bell-ringer/build.py echo-sprite`.
## Anchors (painting pixels)
sprite-mouth (1040, 240, 95) the brass nose; sprite-fin (105, 425, 70) the tail fin; core (520, 470, 95); eyes (627, 292, 40) the porthole.
## Rig
Nose cone (hinge (770, 250)), tail fin wag, right and left dangling cables (lag), whole-hull float and tilt.
## Moods
idle 4: float, cables lag, fin wags, the nose rings an echo once per loop. attack 2.4: draws back, tips up, thrusts forward 125 px with a shout of three rings and a smear. hurt: flash, knocked back. death 3: loses lift, tilts and sinks about 300 px, cables flop, rings and shards on landing.
## Broken looks
Nose tip blown off in a jagged bite; fin snapped to a stump.
