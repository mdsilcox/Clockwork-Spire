# The Clockmaker: rig notes (896x1152, front view, one painting)

`clean.py` removes the stray frame fragments (bottom right, the left chain tip) and peels the gray cut halo (alpha only; keeps `cut.orig.png`). `build.py` inlines `cut.png` and `art/lib/rig.js` into `clockmaker.html`.

Rig: head (neck 445,236), both arms (shoulders 322,395 and 575,395, elbows 262,505 and 640,505) with the pendulum chains swinging from the gloves, the hanging compass gear at the left, coat sway and hem lift, a kneel (legs shorten, body sinks) and a lean. Arm weights are hard at the coat boundary and the mesh is torn there (y 415 to 880) so a raised arm never smears the coat. The body does most of the work; arm swings stay under about 55 degrees.

Code-drawn on the overlay: three dials (head, upper wheel, chest clock) over the painted ones, and the long brass hour hand across the chest (clock-hour; broken it is a stub). Chest clock hands by phase: Tick 10 past 7, Tock, Midnight both straight up. A faint stepped bell-ring around the chest clock appears at Midnight. Light: an SVG color matrix on the painting canvas (colder with the phase, warm in death).

Moods: idle 4 s (breath, head dial ticks eight times, pendulums swing against each other with a 2 s period), attack 2.8 (left hand sweeps; arc of three clock hands plus a tapered ribbon, stepped alpha), hurt 1.8 (flash 0.25 for 3 frames on the body only, star at the core), phase 4 (dials spin, arms flare, coat lifts, two rings and a star at 1.3 s, look shifts; `phaseTo` 2 or 3), rewind 2.5 (six flat strands from the left of the frame to his palm with cogs riding them), death 4 (hands drop to six, pendulums still, bow, kneel, warm light with flat dawn rays; the last pose holds).
Broken: notches (r about 45 to 60 px) with ember rim and 5 px ink cracks baked into the texture; any mood. clock-bell also gets a code crack over its dial.
Not done: no cream dust; the chain wires keep a faint pale edge from the cut; death is a bow and sink, not a true bent knee.

Round 2: pad cut to 230 x 170 (stage aspect 1356 x 1492). Halo: clean.py now drops pale gray fill inside the chain loops and around the hanging gears, and mattes remaining edge pixels toward ink. Death: deep bow (head 48 degrees), lean 16, legs shortened by 52% so he folds down onto his knees, coat hem pools wider, arms hang, dials stop at six; light is a low flat warm wash plus five short ink-edged rays low behind him. Phase looks: Tick is slightly warm, Tock mid blue, Midnight strongly cold (SVG color matrix).


## B9a: in the game (RigHub)
`src/art/clockmaker.ts`: the phase look comes from `view.phase` (0-based; the phase mood shifts it at 1.3 s); the colder light is `P.tint` (a color matrix the hub applies in the shader, replacing the SVG filter). Death polish (A2 review): the head no longer sinks into the shoulder mass (bow 30 degrees, head lowered 6 px instead of 34) and the flat half disc with ink rays is a soft radial glow with three short faint rays. `clip.webp` re-recorded from the game (idle, attack, hurt, phase, rewind, death).

Round 2: death bows about the hip (pivot 448,820, lean 7 degrees, torso weights hold across the waist, only the legs shorten); hurt snaps the head and leans 12 degrees; the attack chain swing is clamped (7 + 8 degrees).

Round 3: death pulls the head back over the chest (head x +26 with the bow, 14 degrees).
