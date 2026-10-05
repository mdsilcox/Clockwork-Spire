# Brass Beetle rig notes (A1, act1-bugs)

Painting 1216x832, profile facing left, pad [200, 110], ground y 735. clean.py (alpha only, keeps cut.orig.png) removes the gray ground specks and halo around the claws.

## Joints (image pixels)
- Head pivot (310, 410), weights x < 310, y > 300; antenna pivot (150, 345); jaw (the chin and teal lower rim) hinge (285, 470), open = negative angle.
- Carapace (elytra) pivot (590, 200), weights x > 565 above y 450: a small negative angle lifts the rear.
- Four legs are painted (not six): hips (485,510) (635,505) (835,510) (1060,500), weights follow each leg's polyline; diagonal pairs alternate (front and third, second and rear). The big rear femur plate belongs to the body.
- Eyes (232,420): the round glass lens; core (620,370) is where the hit star bursts.

## Moods
- idle 3 s: heavy breath, head dips, the jaws part slowly and snap shut, antenna flick, the shell lifts a hair and one leg re-plants.
- attack 2.4 s: rear up (head up, jaws wide, carapace raised) 0.45 to 0.7, a 7 frame lunge of 125 px with the head leading, jaws slam shut at 0.96 with sparks and a shake, hold, lumber back.
- hurt 1.6 s: flash 0.2 for 3 frames, 40 px shove in 2 frames, head snaps up, jaws clack, carapace pops and settles, antenna rattles, star at the core.
- death 3 s: shudder, jaws drop open, legs buckle outward, body sinks (0.42), carapace pops open and vents steam, cogs bounce out, one leg twitches.

## Broken looks (state.broken), revised
- A jagged bite is erased from the painting itself (scissored clears on the rig's GL canvas, following the part), so the silhouette changes. Behind it an ink-edged ember cavity, an ember rim along the cut, three ink cracks and (shell, carapace) a swinging flap.
- beetle-mandibles: bite out of the snout top (100,413) r 46. beetle-shell: bite out of the belly plate bottom (730,525) r 62. beetle-carapace: bite out of the dome's top edge (960,165) r 88.
- Attack has a gather beat (0.62 to 0.84 s, about 6 frames): deeper crouch, more backward shift, head and jaws wider, legs push off, then the lunge.

## Decisions
- Only four legs exist in the painting; the gait is two alternating diagonal pairs.
