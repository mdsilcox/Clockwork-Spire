# A2 wave 3 review (art-reviewer): act 3 regulars and the Clockmaker

Verdict: bell-ringer REVISE, chime-moth REVISE (small), hour-knight REVISE, echo-sprite PASS, pendulum-blade PASS, clockmaker REVISE.
Method: recorded frames (12 even frames per mood, plus zooms). Frames are opaque screenshots, so edge clipping was judged by eye. I did not open the pages in a browser (no `?broken=` or page-error check) and did not view clip.webp.

## Scores (1 to 5)
| Asset | Style | Rig | Read | Verdict |
|---|---|---|---|---|
| bell-ringer | 4 | 3 | 4 | REVISE |
| chime-moth | 4 | 4 | 4 | REVISE (edge clip) |
| hour-knight | 4 | 3 | 4 | REVISE |
| echo-sprite | 4 | 4 | 4 | PASS |
| pendulum-blade | 4 | 4 | 4 | PASS |
| clockmaker | 4 | 3 | 3 | REVISE |

## bell-ringer
- Style fits (patinated brass bell-armor, lamp, ink edge). Idle toll with rings reads well.
- Must-fix, attack 20-60: the notes promise lean back, lunge left, slam the bell down. Frames show the body nearly planted; the bell goes up and stays up (36-60 it is still above the shoulder), with rings and a small star at the bell. No downward slam, no body lunge, so the hit has no weight. Add a lean-back and a 40+ px lunge, and bring the bell down to the target side with the star at the bell.
- Should-fix, death 30-89: only a slight tilt and a dimming lamp; the bell stays on its rod near the shoulder, not dropped. Add a sink or knee bend and let the bell fall.
- Should-fix: a thin pale ground streak remains by the right boot in most frames (the baked shadow the notes say was erased); faint but visible at 2x.

## chime-moth
- Style fits (gear-etched brass wings, teal body). Idle wing beat and attack (dive, ring pulses, shard) read.
- Must-fix, death 62-89: the lowest wing tip is cut by the bottom edge of the canvas in every frame from about 62 to the last (`sheets-w3/moth-bottom.png`). Add bottom pad, or fold the wing less far down.
- Death read is OK (wings fold, body drops, eye dims); the final pose is close to idle with the wing down; acceptable.

## hour-knight
- Style fits (teal plate, brass, clock shield); the best-looking of the cast.
- Must-fix: the boots are cut by the bottom of the canvas in every frame, idle included (`knight-legs.png`: the feet end at the crop edge). Add bottom pad or re-cut so the feet have room.
- Tan cloud remnants (asked): pale gray-white and tan fragments remain at the left hip and pauldron (cloth patches by the sword hand, flecks under the hilt and between the thigh plates). They read as cloth and are small: should-fix, clean the loose white flecks. Between the legs it is mostly clean.
- Must-fix, attack 30-50: the swing is the sword only, with a flat gray wedge smear (about frame 40) and no body motion; the knight does not step in. Add a lean-back and a lunge, and thin or recolor the wedge.
- Should-fix, death 30-89: the knight shifts a few px and the chest clock dims; no knee bend or topple (same fault as earlier waves).

## echo-sprite (mirrored)
PASS. Style fits (teal drum body, brass beak, brass innards). Idle shimmer reads. Attack 20-45: the head and beak thrust left with echo rings growing from the beak and a star; it reads as a sonic ping, suiting it (should-fix: the lunge is only about 25 px, add some lean). Death: the body sinks onto its base, the eye goes dark, rings spread, parts droop; reads as power-down. No detached parts, no edge hits.

## pendulum-blade
PASS. Style fits (brass wheel, teal blade ribbon). Attack 20-50: the blade swings to the lower right with a star at the base; weight is modest but readable (should-fix: a bigger arc and a body kick). Death: the wheel tilts, sags, the blade slumps across the base and the center goes dark; reads clearly as a collapse. No gaps or edge hits.

## clockmaker (idle, attack, hurt, phase2, phase3, rewind, death)
Overall REVISE. Style fits the Foreman bar (teal coat, brass gears, ink edge); three dials read.
- Padding and size: the figure is about 40 percent of the frame width and 75 percent of its height. At 220 px frame height he is about 165 px tall and 85 px wide; the head dial and chest clock are readable but small. Idle reads fine. Should-fix: crop the empty side padding if the game draws the frame at 220 px so he gets bigger on screen (art direction: bosses 360 / 220 px).
- Pale streaks: confirmed. In attack (14-60), phase2/3 (28-80) and rewind, the hands are trailed by pale gray-white slivers and flat white-gray blade shapes near the gloves and chain tips (`clockmaker-attack-zoom.png`); the chains also have a pale rim. They look like cut halo and cloth, not light, and a white wedge at the wrist stretches well past 20 percent at attack 30-40. Must-fix: restrict those pixels to the chain/glove weights or clean the halo on the chains (`clean.py` should peel it). At game size they read as a dirty smear.
- Attack 20-60: the left arm sweeps out with a code arc of clock hands. The gold hands are flat and blocky against the painting, the body does not lean, so weight is low. Should-fix: lean into the swing, put the star at the end of the hand.
- Phase2/3: dial spin, coat lift, two rings and a star at the head; the look shift is subtle and hard to tell from idle. Should-fix: stronger tint or a visible part change.
- Rewind: six strands from the left to the palm with cogs, clean and readable; the best mood. Strands exit the left edge by design.
- Must-fix, death 0-119: does not read as a death. The poses at 60 and 119 are a standing figure with hanging arms, only a small sink and head tilt, plus warm light and big flat translucent gray rays. No bow or kneel as the notes promise; the rays are large flat wedges that look like a sunburst badge behind the head. Add a clear bow and knee bend (sink 60+ px, head drop), and shrink or soften the rays.
- Broken look (`frames-broken`): not viewed; notes say `?broken=all` covers much of the body with ember. Not scored; check at 220 px that ember covers one or two parts only.
- Edge hits: none besides the rewind strands. Idle: chains swing without gaps.

## Ranked improvements
1. Real deaths and lunges: clockmaker bow and kneel, bell-ringer slam and lunge, hour-knight lunge and sink (the recurring fault of waves 1 and 2).
2. Edge pad: chime-moth death wing tip and hour-knight boots touch the bottom of the canvas.
3. Clean the pale halo and streaks on the clockmaker hands and chains, the white flecks on the hour-knight, and the bell-ringer ground streak.

## Looked at
`review/A2/sheets-w3/`: `<asset>-idle|attack|hurt|death.png` for the five regulars, `clockmaker-idle|attack|hurt|phase2|phase3|rewind|death.png`, `clockmaker-attack-zoom.png`, `clockmaker-death-end.png`, `moth-bottom.png`, `knight-legs.png`. I viewed in detail: bell-ringer attack and death, chime-moth attack and death, hour-knight attack and death, echo-sprite attack and death, pendulum-blade attack and death, clockmaker attack, death, phase3, rewind. Idle and hurt sheets are built but I skimmed them (hurt for the regulars not assessed).
