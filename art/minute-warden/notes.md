# Minute Warden: rig notes (896x1152, front view, pad [160, 80])
Build: `python art/valve-crab/build.py minute-warden` (template + shared act 2 kit + `cut.clean.png`; `clean.py` removes floor scribble). The page carries a local `drawBroken` with a crack length option.
## Anchors (image px: x, y, r)
- `minute-mender` (395, 388, 60): the glowing chest wheel; a code gear (12 teeth, ink-edged brass) draws over it and spins when he mends, ticks three clicks in idle. `minute-hand` (205, 205, 55): the spear's ornate head. `minute-needle` (558, 548, 34): the small cream spike at the wrist bracer on the viewer's right. `minute-dial` (410, 490, 46): the round medallion on the belly plate. `core` (410, 435), `eyes` (393, 165): the visor lens.
## Rig
- Weights: spear (leans about the hand), right arm and spear (rotate about the shoulder), left arm, head (about the neck), tabard (sways), chest (breath), body (ramps from the planted feet). The spear is a separate mesh part (`part`/`tear`) so lean never smears the armor.
- Moods: idle 4 (breath, head glance and hold, tick of the wheel, needle glint), attack 2.8 (lift and wind the spear, lunge with the spear leaning forward, star, sparks, rings, smear along the tip's path), mend 2.2 (wheel spins up, three ink rings), hurt 1.8, death 3.2 (sinks to his knees, slumps forward, wheel stops and goes dark, steam).
- Broken: bitten notches in the wheel and belly plate, a bracer notch at the needle, the spear head snapped off; ember inside, short ink cracks. `broken-125.png` shows all four at 125 px.
## Still bothers me
- The spear butt overlaps the left boot toe and smears a little in attack; a thin dark gap between the spear and forearm when leaning.
- The painting's visor has no real eye: the lens is an ember disc in code.
