# Boilermaker Queen: rig notes, round 2 (896x1152, front view, inked style D-030)

Round 1 files are kept in `r1/`. `clean.py` removes the painted gray ground streaks under the boots (edits alpha only, reads `cut.orig.png`, writes `cut.png`).

Joints and regions (image pixels):
- Hat 300-595 x 55-270 (brim tips at x 300 and 595), visor mask 380-520 x 240-330, collar and neck pivot (450,350). Eyes (420,263) and (470,263), anchor `eyes` is the visor (445,263).
- Chest gauge: the oval dial in the gold chest plate at (448,478), about 124x96. This is the most gauge-like piece (a recessed dial inside a riveted plate); anchor `gauge`.
- Furnace: the lower boiler of the skirt, the dark chamber with two round dials at y 900-990; anchor `furnace` (448,950). A fainter glow also sits on the waist cylinder (450,790).
- Shoulder pads: left (330,392), right (572,392). A mask keeps them with the torso so the arm weights do not drag them.
- Left arm (viewer's left) holds the sun-gear scepter. Shoulder pivot (325,425), elbow (255,452). Two bones: the elbow bone (forearm, hand, scepter) and the shoulder bone (the whole arm). The pole is free below the hand, hanging to y 720.
- Right arm (viewer's right) holds the clock staff. The hand and staff are one bone (`st`) that swings about the hand (715,540) and also follows the sleeve (shoulder (590,425)). Tear line at x 702 (to 728 at the bottom) separates the staff from the coat for y 568-915; the left tear is x 225, y 505-745.
- Coat and boiler skirt are rigid apart from a slight swell. Base at y 1095.

Moods: idle 4, attack 2.8 (windup to 0.9, slam to 1.06, hold to 1.3, settle to 2.0, recover), hurt 1.8, phase 4 (charge to 0.45, burst, stagger to 1.7, crown plume, rise to 3.3, hold). Phase holds its last pose after 4 s.
- Heat is a live value (0 to 1, mood targets idle 0.2, attack 0.55, hurt 0.3, phase 0.4) scaling furnace and eye glow and steam.
- `state.broken` is a plain object {anchorId: true}; `over()` draws the damage at every broken anchor in any mood.
- Attack steam is low and sideways from the skirt corners, so the head and torso stay clear. Phase jets leave the gauge diagonally outward past either side of the head; the crown plume vents from the hat finial and brim tips.

Round 3 (shared effect look):
- Steam, smoke and rings are flat: lumpy circles with an ink edge (#14100C), two tones (#E8EEF0 body, #9FB4BB shadow), alpha stepped by age (1, 0.65, 0.35), no blur. Shards are flat with a 2 px ink edge. Glows (furnace, eyes, gauge, orb) stay soft but small. Impact bursts are a jagged ink-edged star (#FFB547 and #E8EEF0) at the gauge anchor.
- Hurt: hit flash 0.25 for 3 frames plus the burst at the gauge, then lean back 8 degrees, slide 26 px right, head snap, arms jerk out, settle by 0.7 s. Phase has no body flash (the burst star carries the hit).
- Attack: squash of 3.5% held for 4 frames (1.06 to 1.19 s) at the impact.
- Idle breathing raised (0.028 plus a small vertical swell).
