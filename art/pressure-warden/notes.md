# Pressure Warden: rig notes (896x1152, front view, symmetric)

`clean.py` writes `cut.clean.png` from `cut.png`: clears the gray backdrop left in gaps (around the dome rods, between the arms) and the painted ground smudge outside the two foot discs (the rig draws its own flat shadow). Build: `sh art/pressure-warden/build.sh` (the page is built from `cut.clean.png`; `cut.png` stays the orchestrator's).

## Joints (image pixels)
- Shoulders (arm pivots) L (192,562), R (713,562); elbows (185,806), (718,812). Arms float beside the body; `part` and `tear` separate them from the legs and torso.
- Head assembly (everything above y 238) pivots at (448,262); the dome lid (x 396 to 502, above y 200) hops separately. Pelvis pivot (448,790). Foot pivots (336,1098), (562,1098); the foot discs are wider than the legs, so the leg weight band widens at y 1020 to 1060. Arm weights stop at y 985 to 1010 so they never grab a foot disc.
- Glass in the dome: (421,134) to (479,204); steam swirls in code inside it (clipped to the deformed glass quad).
- Lamp (the eye): (447,582): a painted orange bulb; code adds a hard-edged flare ring, a blink lid and a dead dark disc.

## Anchors
`pw-dome` (449,168,62) the glass dome; `pw-fist` (185,880,70) the viewer-left forearm piston; `pw-valve` (322,872,40) the round brass valve on the viewer-left leg (the clearest round valve; the hip ones are oval); `core` (448,432,100) the chest gear; `eyes` (447,582,40).

## Moods
- idle 4: weight shift (left foot lifts and plants, then right, each with a dust ring and a small thud), chest swell, arms lag, a head twitch that holds, the dome hops once with a steam puff, the valve vents steam, lamp pulse and a blink, steam swirl inside the glass.
- attack 2.6 (the punch): wind-up to 0.8 (left arm draws up and back, the forearm retracts, body coils, valve and dome vent), strike at 0.84 to 0.9 (arm swings 56 degrees, the piston forearm extends 34 percent and grows 20 percent toward the viewer, body lunges 40 px, left foot stamps), hit star at the fist, dust rings, sparks, shake, a two-tone ribbon trail along the fist path, recover by 1.9.
- hurt 1.5: flash 0.25, 0.16, 0.07 (body only), hit star at the core, recoil 28 px, arms flung, dome lid pops, lamp flares then blinks, valve and dome puff.
- death 3: hit, shudder, dome lid pops and settles askew, legs buckle (compress 35 percent, body sinks about 100 px), arms drop outward, lamp flickers and dies, valve and dome keep leaking steam. Holds the last pose.

## Broken looks (`?broken=pw-dome,pw-fist,pw-valve` or `all`)
Baked into the texture (re-uploaded through the page's own WebGL context when the flags change): a jagged notch is erased from the silhouette, the painting around it becomes a hard-edged three-band rim (ink, ember #C2461A, hot #FFB547), and thick ink cracks with an ember seam run out of it. All clipped to the painting's own alpha, so nothing floats. Dome: the right side of the glass is blown out; fist: the outer side of the piston is bitten; valve: half the ring is chewed. A broken part leaks a flat steam puff every 0.75 s (not in death). `broken-125px.png` shows all three broken in attack, death, hurt and idle at a 125 px frame (3x nearest).

## Effects
Flat, ink-edged (#14100C), two-tone shapes with stepped alpha: steam puffs, dust rings, four-point sparks, jagged hit stars, the fist trail. Flash is the shader flash only (body, never effects or shadows): 0.25, 0.16, 0.07 over 3 frames.

## Still bothers me
- The dome break reads as a bright ember cluster rather than as broken glass at 125 px.
- The attack arm is a rotation plus a stretch; the forearm texture stretches a little at full extension.
- Death is a sink and sag, not a bent knee (the legs share the weights).

## Round 2 (review wave 1)
- Pad is now [480, 130]; the punch extension is capped at 19 percent (growth 22 percent keeps the forearm thick) and the body leans into the strike (pitch 8, lunge 64 px); sparks travel less far.
- Death: legs compress 50 percent, body pitches 15 degrees, head drops 22 degrees, lunges forward 56 px.
- Dust rings are small flat gray ink-edged shapes (no cream pebbles).
- Broken looks: the cut polygon is scaled 1.8 times (a bigger jagged chunk), ember and hot rims fill the notch, ink cracks are 30 px (about 3 px at 125). The dome is cracked glass: a dark ink hole with cream ink-edged facet cracks, steam escaping from the broken dome.

## Round 3
- The arm stays attached: it swings 32 degrees about the shoulder, stays rigid (no forearm stretch) and grows 34 percent about the shoulder (toward the viewer); the torso lunges 70 px and pitches 10. Death arms bend in (retract) and sink less, so they stay above the feet line.
