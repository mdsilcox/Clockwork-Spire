# Oil Slick: rig notes (1216x832, side view facing left, pad [300, 100])

`clean.py` clears the gray background left in three small holes (rag, frame gap) and writes `cut.clean.png`; the page is built from that (cut.png stays the orchestrator's). Build: `python art/lib/inline.py art/oil-slick/oil-slick.template.html art/oil-slick/oil-slick.html art/oil-slick/cut.clean.png`.

## Anchors (image pixels: x, y, radius)
- `slick-nozzle` (620, 150, 85): the big brass stack on the tank top (the filler cap). The small spout at (797, 175) is not used. Oil drips from the cap rim in idle and spurts up from the finial (620, 65) in attack, hurt and death.
- `slick-spitter` (288, 388, 60): the open front mouth.
- `core` (620, 340, 90): middle of the tank. `eyes` (288, 388, 40): there is no porthole, so the eye is two small amber embers deep in the mouth's dark interior ((277, 383) and (298, 394)), drawn as small code glows. They flicker in idle (with a quick dim "blink" at 2.95 s), flare in the attack and hurt, and go out in death.
- Broken look: the shared crack pattern (ink cracks, missing chunks with an ember interior, loose facets) at the anchor, in every mood; a broken part also leaks oil (spitter: drops from the snout lip, nozzle: drops from the cap rim).

## Rig
- Iron stays rigid. Weights: body (y < 570, fading to 0 at 650 so the puddle and planted feet never move), four leg bands (hip rotation, foot lift), the hanging rag (pivot (1000, 285)), and the oil strand under the mouth (stretches with the body, fades out by y 640).
- The puddle never deforms. It ripples in code: flat ink-edged rings with a cool sheen, stepped alpha, at drip landings and footfalls.
- The rag lags the body through an exponential follow (overlapping action) plus a slow sway.

## Moods
- idle 4: iron almost still (1.4 px breath), one twitch at 1.6 s (0.45 degrees, 2 px, decays), one foot lifts and plants per cycle (alternating far rear and far front, with a ripple at the plant), oil drops from the lip, the rag tip and the cap rim.
- attack 2.4: gather to 0.75 (nose up 3.6 degrees, rocks back on the rear legs, nozzle quivers and spurts), spit at 0.95 s (nose down, 22 px recoil right, a lumpy ink-edged glob with a smear trail and nine small drops leave left, a flat spit star at the mouth, screen shake), recover by 1.5 s. Feet stay planted; both front feet ripple.
- hurt 1.5: flash 0.25 for 3 frames, hit star at the core, 36 px jolt right in 2 frames, nose up 3 degrees, legs brace, nozzle spurts, drips and ripple, settles by 0.7 s.
- death 3: hit then shudder (0.3 to 0.9), eyes flicker and die, the legs splay and buckle (body sinks 40 px, nose down 6.5 degrees), oil gushes from the mouth, the puddle spreads in code (flat lumpy lobes under the painting), nozzle vents four smoke puffs. Holds the last pose.

## Still bothers me
- The sinking body compresses the thin legs a little (about 25 percent at the end of death).
- The nozzle drops are small at the 100 px read.

## Round 2 (review wave 1)
- Flash: the slick draws its own body-only flash (the painting's silhouette tinted warm, 0.2, 0.12, 0.05 over frames 0 to 2, fading out down the underframe); the shader flash is unused, so the puddle and feet are never tinted.
- Death: legs keep their length. The feet move down with the body into the oil and flat puddle-colored lobes cover the foot bottoms; the puddle lobes match the painted puddle color; steam keeps rising to the last frame.
- Attack gather: dip, rock back 5 to 8 degrees with a belly swell, three nozzle puffs with a lid hop, oil slops from the lip. Idle: a breathing swell, a lid hop with a puff once per loop, mouth burbles, more drips.
- Broken look: `?broken=slick-nozzle,slick-spitter` (or `rig.state.broken`). A jagged notch is erased from the painting's silhouette (the texture is re-uploaded when the flags change): the nozzle stack is snapped off at a slant and oil fountains out of the stump; the mouth rim is bitten and cracked with oil gushing. Glowing amber broken edges and thick ink cracks.
