# Cog Rat rig notes (round 2, inked painting; round 1 files are in r1/)

Painting 1216x832, profile facing left, pad [190, 100] for the pounce and steam. Ground line y 758.

## Joints (image pixels)
- Jaw hinge (290, 248); lower snout weighted below the mouth line y = 217 + 0.1 (x - 120). Snout tip (118, 216).
- Head and neck pivot (430, 262), fading out by x 450 and y 330.
- Ear pivot (500, 175): the big brass ear, weight limited to y < 250 so the plate is untouched.
- Eye (310, 162), r about 36: green glass. Mint glow when lit; dimmed gray-teal glass with a faded highlight when dead.
- Plate (teal back plate) center (690, 420): anchor only.
- Legs: three bands along polyline centerlines (LEGS in the template), hips near (487, 575), (546, 585), (700, 600).
- Tail: socket pivot (880, 370), tip pivot (1050, 520); the black cable from the plate to the tail end follows the tail at 0.9 weight.

## Decisions and tricky parts
- clean.py (alpha only, keeps cut.raw.png) removes the claw ground shadows, white patches and tiny whisker islands.
- Attack: crouch back with the body sheared over planted feet (dxb), nose up, ear back; then a pounce where the whole body incl. feet moves 170 px left with a hop (dx), jaw snaps shut at 0.72 s, sparks, hold, recover.
- Death: shudder, eye flickers then dims, legs fold (compress plus small splay), body sinks and tilts nose down, ear and tail go limp, steam from the plate vents, ink-style cogs bounce and rest. Holds the last pose after 3 s.
- Large leg rotations or deep crouches turn the thin cabled legs into wires, so the angles are kept small.
- Cogs and spring are drawn with a heavy dark outline and two-tone brass to match the painting.

## Round 3
- Hurt: hit flash is 0.25 strength for 3 frames; an ink-edged two-tone star bursts at the plate anchor for 0.3 s (stepped sizes). Recoil: dx jolt 55 px back (right) plus a 25 px body shear, head snaps up 18 degrees, ear flaps, hop 38 px, settles by 0.65 s.
- Shared effect look: steam is lumpy flat circles (ink edge, two tones, stepped size and alpha, no blur); sparks are ink-edged two-tone diamonds that shrink in steps; the cog and spring have a 2.5 px ink edge. Colors: ink #14100C, steam #E8EEF0 and #B9C6C9, brass and furnace tones.
- Attack windup: crouch 0.42 (body lowered over the feet; leg angles and shear cut to near zero).
- Death: a soft dark belly shadow fades in under the body; the steam and cogs start at 1.1 s so the pose is still by 3 s.
- A 3.5 px ink line at 55 percent alpha is drawn along each leg's path on the overlay for the 100 px read.
