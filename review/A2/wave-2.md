# A2 wave 2 review (art-reviewer)

Overall: crab, golem, gremlin, wraith, twin-pistons, orrery PASS (with should-fixes). REVISE: pipe-snake, pressure-warden, minute-warden.

## Scores (1 to 5)
| Asset | Style | Rig | Read | Verdict |
|---|---|---|---|---|
| valve-crab | 4 | 4 | 4 | PASS |
| furnace-golem | 4 | 3 | 4 | PASS (should-fixes) |
| pipe-snake | 4 | 3 | 4 | REVISE |
| gauge-gremlin | 3 | 4 | 4 | PASS (should-fixes) |
| steam-wraith | 4 | 4 | 4 | PASS |
| pressure-warden | 4 | 3 | 3 | REVISE |
| twin-pistons | 4 | 4 | 4 | PASS |
| minute-warden | 4 | 3 | 3 | REVISE |
| orrery | 4 | 4 | 4 | PASS (should-fixes) |

## Wave 1 must-fixes
- crab: resolved. Attack 20-50: claw rises high, body sinks, slam at about 36-44 with star, rings, chips. No leg drag seen. Death sinks; reads as power-down (eye goes dark).
- golem: sliver is resolved as a leg-band drag (arms and legs separate now); slam 36-46 no longer rubbery, fist lands at the foot, stretch is modest. Remaining (should-fix): attack 20-32 a dark gray curved wedge hangs below the raised fist/forearm (the lane's "dark claw"); it is short and attached to the fist, reads as a blade claw, but is the same gray as the old sliver. Cut its weight or hide it. Death 60-89 only sinks a little; the read comes from the dead eye and steam (should-fix: add a lean or knee bend).
- pipe-snake: attack improved (bigger rear-back, snap, ring at 36-50). Death NOT resolved: at 50 to 62 the head floats detached above the neck stump with a visible gap, and a dark zigzag wedge still stands behind the head (see `sheets-w2/snake-death-zoom.png`, frames 50, 62, 75, 89). Must-fix: attach the head (reduce head offset or keep the neck weight continuous) and remove the wedge.
- gauge-gremlin: attack lunge now readable (body shifts, spike thrown, ground rings, chips at 36-45). Should-fix: spike tip touches the left canvas edge at attack 24-36 and a detached dash-shaped shard floats at about frame 32 (`gremlin-leftedge.png`); add a little left pad or shorten the smear.
- steam-wraith: resolved. Jets fit inside the canvas at 38-52 (no edge hits in any frame), cloud has no dark holes, death keeps the body whole while cloud shrinks.
- pressure-warden: clipping resolved (no edge hits) and death now reads (lean, knee bend, arms drooping). Attack NOT resolved: at 34-52 the forearm and fist float away from the torso with an empty shoulder and a visible gap, and the forearm is a thin stretched wedge (`warden-punch-zoom.png`, frames 38 and 44). Must-fix: keep the upper arm in the chain (tear weights so the arm stretches 20 percent at most from the shoulder), thicken the forearm. Also at death 70-89 the hanging arms reach below the feet line (should-fix).
- twin-pistons: resolved. No edge hits, blast star is attached to the muzzle at 40-50 and gone by 60, death droops the barrel and pitches the body (reads as a collapse).

## Broken looks at 125 px
Better but only partly meeting the spec. Cracks are now bold ink-and-orange zigzags and are visible at 125 px on all seven (crab, golem, snake, gremlin, wraith: `broken-regulars-2x.png`; warden and twins: their `broken-125px.png`), so each reads as damaged. The silhouette notch is still not obvious on the five regulars; the ember is small on crab, snake and gremlin. Acceptable for now because the cracks carry it (should-fix: a bigger visible alpha bite on one part per asset). Warden: the dome break is hard to see at this size; the cracks on the legs read. Warden's first broken-125 cell has the fist at the left edge of the crop.

## New: minute-warden (idle, attack, mend, hurt, death)
REVISE.
- Style fits (armor, teal tabard, ink edge). Code gear on the chest wheel is flat, ink-edged brass and matches; it spins in mend and goes dark in death, which reads well.
- Must-fix, attack 24-52: the whole attack is a spear lean and a thin gray smear arc with a star floating in the air above the spear head (frame 38); the body does not lunge or wind up, so the hit has no weight at game size. Add a lean-back anticipation, a body lunge of 40+ px and put the star at the spear tip on the target side.
- Must-fix, death 20-95: notes promise "sinks to his knees"; frames show only a shallow slump with the spear tilting. Add a knee bend or topple so it does not read as a pause (same fault as wave 1 warden/twins).
- Should-fix: spear butt overlaps the left boot toe and smears (attack 20-35); mend is only the wheel (no body motion, arguably fine for a buff); hurt is flash and star only, almost no recoil; the visor eye is a tiny ember.
- Edge hits: none.

## New: orrery (idle, attack, hurt, death)
PASS.
- Style fits. Moons are flat two-tone discs with an ink edge (Hush pale, Embers red, Dusk dark), correctly passing behind and in front of the globe. Idle reads clearly (orbit, tick, steam). Death: globe dims, assembly sags, moons fall and rest on the pedestal, a good read.
- Should-fix: attack 40-60 is weak; the band lash is 6 degrees and only a small star at the left tip, so the read is "moons spin faster". Hurt has little recoil. Small dark smear under the left band tip in death (the lane notes it). Orbit moons are all similar size at game size; fine.
- Edge hits: only smoke puffs at the top in idle 68-72 (trivial).

## Page and clip checks
I did not open the pages in a browser (no `?broken=` or page-error check) and did not view clip.webp. I used recorded frames in `frames/`; border-pixel scan found only ground rings and dust at the bottom edge and the gremlin spike on the left.

## Ranked improvements
1. Fix the two detached-part rig faults: pipe-snake death head gap and wedge; pressure-warden punch arm gap.
2. Give the minute-warden a real lunge and a real death collapse (and the orrery a bigger band lash).
3. Make one visible silhouette notch per regular for the broken looks; clean the golem fist wedge and gremlin edge shard.

## Looked at
`review/A2/sheets-w2/`: `<asset>-attack|death|hurt|idle.png` (12 or 8 even frames) for all nine plus `minute-warden-mend.png`, `golem-zoom.png`, `snake-death-zoom.png`, `gremlin-leftedge.png`, `orrery-topedge.png`, `warden-punch-zoom.png`, `minute-attack-zoom.png`, `broken-regulars-2x.png`, and the two elites' broken-125px images. I did not view the crab, snake, wraith, twins or golem hurt/idle sheets in detail.
