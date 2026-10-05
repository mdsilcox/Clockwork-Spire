# Chime Moth: rig notes (1216x832, pad [260, 260])
The painting faces right; the page mirrors it with CSS (`#flip`, scaleX(-1)); effects are drawn in painting space and mirror with it. Build: `python art/bell-ringer/build.py chime-moth`.
## Anchors (painting pixels)
moth-wing (420, 200, 120) the big gold wing; moth-dust (700, 245, 70) the back; core (610, 355, 80); eyes (830, 160, 45) the two black eyes (embers flare in attack and hurt).
## Rig
Left wing pair (hinge (720, 235)), long right wing (hinge (810, 255)), lower teal wing, abdomen (lags), feelers; the whole body bobs and tilts. Wings beat 2.5 times a second in idle.
## Moods
idle 4: hover, drifting gold dust flakes from the back, a chime ring once per loop. attack 2.4: rears back with wings high, darts forward and down with a smear and rings. hurt: flash, knocked back, wings snap. death 3: wings fold, falls about 240 px tilting, grit flakes and rings on landing.
## Broken looks
Wing: a bite out of the leading edge; dust gland: thorax shell blown open. Ember edge, embers inside, ink cracks; leaks dust or sparks.
