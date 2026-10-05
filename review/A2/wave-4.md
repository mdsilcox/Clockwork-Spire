# A2 wave 4 review (art-reviewer): confirm the REVISEs of waves 2 and 3

Verdict: pipe-snake PASS, pressure-warden PASS, minute-warden PASS, bell-ringer PASS, chime-moth PASS, hour-knight PASS (should-fixes), clockmaker PASS (should-fixes). Furnace-golem, gauge-gremlin, orrery, echo-sprite, pendulum-blade stay PASS. The whole A2 set (15 assets) can close; the should-fixes below are optional polish.

Method: I read the re-recorded frames (opaque screenshots), built sheets of 12 even frames per mood plus full-size zooms of the extreme frames, and scanned every frame of every mood for non-background pixels on the four canvas edges (what is left is effects only, listed below). I did not open the pages in a browser: no page-error check and no live `?broken=` run. `clockmaker-broken.png` comes from the recorded `frames-broken/idle` frame, scaled to 220 px.

## Scores (1 to 5)
| Asset | Style | Rig | Read | Verdict |
|---|---|---|---|---|
| pipe-snake | 4 | 4 | 4 | PASS |
| pressure-warden | 4 | 4 | 4 | PASS |
| minute-warden | 4 | 4 | 4 | PASS |
| bell-ringer | 4 | 4 | 4 | PASS |
| chime-moth | 4 | 4 | 4 | PASS |
| hour-knight | 4 | 4 | 4 | PASS |
| clockmaker | 4 | 3 | 3 | PASS (marginal) |
| furnace-golem, gauge-gremlin, orrery, echo-sprite, pendulum-blade | 4 | 4 | 4 | PASS (unchanged) |

## Per asset

- **pipe-snake (PASS).** Death 40 to 89: the head now rides the folded neck down onto the coil as one connected chain; no gap at the head, no wedge. A small dark spike remains behind the neck on the coil (89); it reads as a spine fin. Should-fix: none required.
- **pressure-warden (PASS).** Attack 28 to 42: the punch arm swings out from behind the shoulder barrel, rigid, with the fist at the star; no gap at the shoulder (`pw-punch-zoom.png`). The torso lunges and pitches. Death 60 to 89: the buckle reads, arms hang at or above hip height, none below the feet line (`pw-death-zoom.png`). Should-fix: in death the leg parts jumble into a messy cluster between the hips and the feet, and a thin dark spike pokes below the shadow (about x 310, y 430 in the zoom).
- **minute-warden (PASS).** Attack 36 to 40: the spear thrusts up and left with the body leaning in about 50 px and a star at the tip; it reads as a lunge now. Death 60 to 95: he sinks, slumps forward, the wheel dies and goes dark, steam rises; the spear tilts away. Should-fix: the spear shaft looks doubled (a second dark rod beside it) when it leans (36, 40, 95); the thin flat blade smear is odd next to the painted spear.
- **bell-ringer (PASS).** Attack 22 to 36: lean back, lunge left about 60 px, the bell comes down at the body side with the star and smear. Death 49 to 89: the body tilts and sinks, the bell falls on its rope, the lamp goes dark. The baked ground streak is gone (`br-boots.png`). Should-fix: in death the tilted hem drops below the boot line as a dark teal rectangular slab with a rope loop (about frames 80 to 89); the rod and rope draw long thin diagonal lines.
- **chime-moth (PASS).** Death 62 to 89: the wing tip now sits inside the canvas; only one frame (77) has a 20 px flake of effect at the bottom edge.
- **hour-knight (PASS).** Boots are fully visible in every frame, no edge hit (a few shards touch the bottom in death 63 to 68, effects). Attack 30 to 40: a real step and lean, the chop with a star. Death 49 to 89: a clear kneel, the body collapsing behind the shield, the dial dying. Should-fix: (1) the code soles read as flat brown pill-shaped bars under the boots, not as part of the painting; (2) the swing smear (33 to 37) is a heavy flat gold tube arcing over the helmet, thicker and brighter than the painted sword; thin it or tint it toward steel; (3) in the last death pose the sword stands upright out of the pile.
- **clockmaker (PASS, marginal).**
  - Pale streaks and halo on hands and chains are gone in attack, phase and rewind; only thin dark chain lines trail the gloves (`cm-zoom.png`).
  - Padding is tighter than before. At a 220 px frame he is about 165 px tall.
  - Phase looks now differ: Tick warm green, Tock bluish, Midnight cold blue with a white ring (`clockmaker-phases.png`, `clockmaker-phase3.png`).
  - Attack 23 to 45: the arm sweeps with a flat gold hand arc and a ring; low weight but clean.
  - Death 43 to 119: a deep bow with the head sunk into the shoulder gear; low warm rays behind (`cm-death-zoom.png`). It reads as a collapsed, slumped figure, not a true kneel (the legs stay long). Should-fix: (1) the head dial rides on the shoulder blob, so the silhouette reads as hunched and nearly headless at game size; (2) the rays are a flat pale-green half disc with thin spikes, a "badge" shape that does not match the painting; make it a softer glow with fewer, shorter rays; (3) the legs do not bend.
  - Broken look (`clockmaker-broken.png`): `?broken=all` covers the whole chest column, the head crown and both pendulum weights with ember at 220 px, and hides the chest clock hands. That is the all-parts worst case, and the clocks stay readable; I accept it. Should-fix: limit each broken part's notch to about two thirds of the current size so the chest does not turn into one ember block.
  - Edge hits: the rewind strands exit the left edge by design; nothing else.
- **furnace-golem (PASS).** The fist claw hangs naturally in the attack (33); the star and ring land at the foot. No defects.
- **gauge-gremlin (PASS).** The attack needle and star touch the left edge for about 10 frames (effect only; body is inside). Acceptable, but pad the left a little if the stage crops the frame.
- **orrery (PASS).** Death reads as the planets dropping and the sphere dimming. The one top-edge hit in idle (frames 68 to 72) is a steam puff.
- **echo-sprite (PASS).** The ring ellipses in death touch the bottom edge (24 frames, effect only); the body is clear.
- **pendulum-blade (PASS).** The 2 to 4 death frames (61 to 64) touching the bottom edge are the shard sparks; the wheel and base are clear.

## Ranked improvements (all optional)
1. Clockmaker death: lift the head out of the shoulder mass and replace the flat half disc with a soft glow.
2. Hour-knight: paint the soles into the boot art and thin the gold smear.
3. Pressure-warden and bell-ringer death: tidy the leg cluster and the hem slab that drop below the feet line.

## Can A2 close?
Yes. All 15 assets pass, with no must-fix defects. The clockmaker is the weakest and passes on the bow, the cleaned hands and the phase looks; its death is the one to repaint if time allows.

## Looked at
`review/A2/sheets-w4/`: `snake-death.png`, `snake-death-zoom.png`, `snake-death-head.png`, `pressure-warden-attack|death.png`, `pw-punch-zoom.png`, `pw-death-zoom.png`, `minute-warden-attack|death.png`, `mw-zoom.png`, `mw-death-zoom.png`, `bell-ringer-attack|death.png`, `br-zoom.png`, `br-death-zoom.png`, `br-boots.png`, `chime-moth-death.png`, `hour-knight-attack|death.png`, `hk-zoom.png`, `hk-death-zoom.png`, `hk-smear.png`, `clockmaker-attack|death.png`, `cm-zoom.png`, `cm-death-zoom.png`, `clockmaker-phases.png`, `clockmaker-phase3.png`, `clockmaker-broken.png`, `gremlin-attack.png`, `golem-attack.png`, `echo-death.png`, `pend-death.png`, `orrery-death.png`, `orrery-top.png`. `clockmaker-rewind.png` was built but not viewed; the rewind was last judged in wave 3 and the edge scan shows only the by-design left-edge strands.
