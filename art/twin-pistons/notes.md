# Twin Pistons: rig notes (896x1152, painting faces right, mirrored by the page to face left)

One painting serves both twins. `clean.py` writes `cut.clean.png` from `cut.png` (clears the gray backdrop in gaps and the sketchy ground scribbles under the feet; the rig draws flat shadows). Build: `sh art/twin-pistons/build.sh`. The page mirrors the painting with CSS (`#flip`), so by default the twin faces left like every enemy; `?noflip=1` shows the painting's own facing (ram to the right) for the other twin. `rig.anchor(id)` follows the mirror.

## Joints (image pixels, unmirrored: forward is +x)
- Lance arm (the sword-like limb) pivots at the shoulder (305,418); the thin arm on the far side at (652,420); the antenna at (376,125); the whole body at the pelvis (450,660). Leg pivots (345,1040), (600,1068).
- Ram barrel: x above 535 and y above 312 slides along +x (the grey collar at x 535 to 598 is the blend zone, a piston stretch). Legs: the two feet overlap in x, so the L/R boundary steps from x 505 to x 380 between y 1030 and 1050.
- Lens (the eye): the lit end-cap disc at (748,162).

## Anchors
`twinl-ram` (650,190,100) the barrel; `twinl-shield` (752,160,80) the end cap; `twinl-link` (304,416,46) the crossbar stub at the shoulder; `core` (430,300,110); `eyes` (748,162,55). `twinr-*` answer to the same ones.

## Moods
- idle 4: heavy shuffle (each foot lifts about 22 px and plants with a dust ring and thud, the body rolls over the standing leg), the lance and antenna lag, the barrel hums and coughs once (a 16 px pop and a steam puff from the dome vent), lens pulse and blink.
- attack 2.6: gather to 0.8 (rocks back, barrel draws in 48 px, braced legs, two vents), fire at 0.9 (barrel slams 78 px forward, body lunges 40 px and pitches, lance swings back as a counterweight), muzzle star at the end cap, three flat ink-edged blast arcs, sparks, dust rings, shake; recover by 1.9.
- hurt 1.5: flash 0.25, 0.16, 0.07, hit star at the core, recoil, barrel jolts back, lance and antenna flail, lens flares.
- death 3: hit and stagger, the legs give (compress 34 percent) and the body pitches forward 15 degrees, the barrel droops, the lens flickers and goes dark (hard-edged dark ellipse), steam keeps leaking. Holds the last pose.

## Broken looks (`?broken=twinl-ram,twinl-shield,twinl-link` or `all`)
Same baked method as the Pressure Warden: erased jagged notch, ink, ember and hot rim, thick ink cracks, all clipped to the painting. Ram: bite out of the barrel's top edge; shield: the end cap's outer rim chewed away; link: the crossbar stub snapped. Broken parts leak steam. `broken-125px.png` shows all three broken in attack, death, hurt and idle at a 125 px frame (3x nearest).

## Still bothers me
- The link break is small at 125 px (the stub is thin).
- The ram's collar stretches visibly at full extension.
- Death leans and sags; there is no fall to the ground.

## Round 2 (review wave 1)
- Pad is now [520, 120]; blast arcs are short (life 0.3 s, radius 34 to 144), attached to the muzzle and gone by frame 60; sparks travel less far.
- Death: legs compress 50 percent, body pitches 21 degrees and lunges 60 px, the barrel droops 50 px.
- Dust rings are small flat gray ink-edged shapes.
- Broken looks: cut polygons scaled 1.5 to 1.6 times, ink cracks 30 px (about 3 px at 125), ember inside the notch.
