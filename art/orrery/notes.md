# The Orrery: rig notes (896x1152, front view, pad [160, 100])
Build: `python art/orrery/build.py` (template + shared act 2 kit + `cut.clean.png`; `clean.py` removes the floor smudge).
## Anchors
- Moons `orrery-moon1` Hush (pale), `orrery-moon2` Embers (red), `orrery-moon3` Dusk (dark, slow) are live getters: they follow the orbit (and the fall in death). `orrery-arm` (110, 468, 58): the left tip of the long brass equator band. `orrery-ring` (118, 335, 66): the great ring, left side. `core` (452, 430, 120) the globe; `eyes` (452, 430): the globe's center, a small flat ember lens in code that flares in attack and hurt.
## Rig
- Weights: equator band (the arm; rotates about the center), great ring and meridian arcs (counter-rotate), globe (breathes), whole upper assembly sways about the pedestal top. The pedestal is static.
- Moons: code sprites, flat two-tone discs with an ink edge, on three tilted ellipses at different speeds. The back half of each orbit is drawn in the under layer (hidden by the globe), the front half over the painting; size grows slightly in front.
- Moods: idle 5 (slow ring drift, tick with an ink ring at the equator, steam from the top pipe), attack 3 (rings and moons spin up, band lashes down-left, star, sparks, floor rings, smear), hurt 1.8, death 3.4 (assembly sags and sinks, globe goes dark, moons fall and bounce to rest on the pedestal).
- Broken: notches in the arm tip and the great ring; each moon gets a bitten notch with an ember, cracks, wobbles and sheds sparks. `broken-125.png`.
## Still bothers me
- In death the band's ends show a small black smear under the left tip.
- Rotations are capped small (band 6 degrees) to avoid stretching the ring panels.
