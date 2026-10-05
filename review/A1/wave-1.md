# A1 wave 1 review: rust mite, brass beetle, oil slick, gearhound

Verdict: **REVISE**. The hurt/death flash on the slick and gearhound is over the owner's 0.25 cap; the mite's gland glow is an airbrushed ball; the broken looks are thin ring decals; the slick and hound pages do not read `?broken=`.

## Scores (1 to 5)
| Asset | Style fit | Rig quality | Readability | Verdict |
|---|---|---|---|---|
| rust-mite | 3 | 4 | 4 | REVISE |
| brass-beetle | 4 | 4 | 4 | PASS (should-fix only) |
| oil-slick | 4 | 3 | 4 | REVISE |
| gearhound | 4 | 4 | 4 | REVISE |

Style note: all four read as one project at 125 px (phone-125px.png). The beetle is the most engraved-vector (near-white blown highlights on the carapace) next to the painterly rat; the mite is the flattest and most orange. Both acceptable. The slick is the darkest and lowest-contrast but readable.

## rust-mite
- Must-fix, attack 8 to 59 (also hurt, idle peaks, death 0): the gland glow is a soft radial-gradient orange ball on the dome, an airbrushed effect against the flat ink-edged effects rule. At the attack peak (frames 16 to 30) it washes the dome into a flat orange disc and hides the rivets and plates, and it never decays in the recover (frames 45 to 59 are still full). Fix: a two-tone, hard-edged glow shape clipped to the dome, smaller, easing back to idle level by about frame 50.
- Should-fix, broken pincers: the snapped notch is tiny (r 36 on a 1216 px canvas); at 125 px it is a speck on the horn. Make it about double size, or cut a chunk out of the horn silhouette.
- Should-fix, broken gland: ring plus radial spokes reads as a spider web or umbrella, not a smashed dome; the ring floats as a flat ellipse. Fewer spokes, jagged edge, no perfect circle.
- Idle: breath and pincer clicks readable. Attack: tripods plant (12 to 30), pincers lead the stab, sparks at the tip, no shear or slide. Death 0 to 77: legs splay, body sinks, steam and cogs, settled final pose. Hurt: flash 0.2 for 3 frames, body opaque, star at the core: OK.
- Cut-out clean (clean.py); no halo or specks seen. Some recorded frames show a 1 px darker rectangle edge (hurt 0, death 22, attack 33 sheet cells); likely the recording canvas edge, check the page canvas.

## brass-beetle
- Passes. Idle 0 to 89: subtle rock, one steam puff at a leg joint, feet plant. Attack 8 to 46: head dips, body lowers and rams forward, orange sparks at the snout, recovers; no shear, no ghost. Hurt: flash 0.2, star at the shell, flinch. Death 0 to 89: body drops, white steam and cogs, legs fold, settled final pose. Clean frames.
- Should-fix, broken looks at game size: mandibles (small cracked wheel at the snout tip) and shell (small wheel under the belly) are nearly invisible at 125 px. Carapace (ring with a brown chunk) reads but is a flat stamped ellipse that ignores the dome curve. Enlarge the first two about 2x and change the silhouette.
- Should-fix: attack windup is shallow (frames 8 to 18 barely move before the lunge); add 3 to 4 gather frames (body back and lower).
- Minor: death steam is white while the mite's is rust-tinted; fine, just inconsistent.

## oil-slick
- Must-fix, hurt 0 to 2 and death 0: the whole body and the puddle go a flat pale gray-beige for 3 frames (tint far over 0.25), then pop back dark at frame 3. This is the ghost flash the owner ruled out. Fix: tint at most 0.25, warm, ease out over 3 to 4 frames, leave the puddle alone.
- Should-fix, death 30 to 89: the four legs shrink to stubs as the tank sinks into the spreading puddle (squash clearly over 25% by 70 to 89). It reads as sinking, not folding; keep the leg length and fold at the knee, or clip the legs under the puddle edge. From frame 75 the steam puffs sit frozen for 15 frames, so the end pose looks paused; let them rise.
- Should-fix, attack 4 to 24: windup is almost static (small lid puff); at the impact (27 to 30) the black spat glob leaves left and reads well. Add a visible rear-back or belly squash 8 to 10 frames before the spit.
- Should-fix, idle (120 frames): oil drips but movement is so subtle it reads as frozen in the sampled sheet; add a visible breath or lid hop once per loop.
- Broken looks (only via `rig.state.broken` or the checkboxes; the `?broken=` param is not read here): nozzle is a ring with spokes over the lid cap, spitter a ring over the muzzle. They read as "marked", not broken, thin lines.
- Cut-out clean; hard dark puddle edge is acceptable.

## gearhound
- Must-fix, hurt 0 to 2 and death 0: same ghost flash as the slick. The whole dog, shadow included, turns pale gray-tan for 3 frames (teal loses its saturation), then pops back darker than idle at hurt 3. Cap at 0.25 and ease.
- Should-fix, attack 19 to 25: all four paws leave the ground while the shadow stays at full size (a 3 to 4 frame pounce); shrink the shadow. Dust at the feet (30 to 40) is cream lumps that read as pebbles or mushrooms; make them small, flat, ink-edged and rust or gray.
- Should-fix: idle steam puffs are white round lumps, slightly cartoon next to the ink style (same as the beetle's).
- Anatomy: three painted legs plus the near forelimb read as four legs at game size; gait cues are limited because legs are not individually tearable. Stalking low head in idle. Acceptable.
- Death: head lowers, forelegs fold, body sinks to a crouch, clear lie-down at 89 with steam. Fine.
- Broken looks (checkbox or `rig.state.broken`; `?broken=` not read): fangs get two rings, snout a ring and a steam puff, haunch a ring on the thigh disc. Haunch and fangs read; the snout ring is small. Same ring-decal criticism.
- Cut-out clean, no halo.

## Cross-asset
1. Hurt/death flash: mite and beetle are right (0.2); slick and hound must match.
2. Broken looks use one stamped template (thin ring plus spokes). At 125 px it is the weakest piece of wave 1 and reads as a target. Make each bolder and part-specific: a chunk missing from the silhouette, an ember glow in the gap, 2 or 3 thick ink cracks.
3. `?broken=id,id` works on the mite and beetle only; the brief promised it for all. The slick and hound rigs work via `rig.state.broken`.
4. No page errors in any of the 8 page loads (pageerror and console error empty).
5. Phone size (125 px tall, phone-125px.png): all four read and the ink silhouettes hold; the slick's dark hull is least legible; the mite glow is a big orange ball at that size.

## Ranked improvements
1. Cap hurt/death tint at 0.25 for the slick and hound; replace the mite's airbrushed gland glow with a flat two-tone ink-edged shape.
2. Rebuild the broken looks as bolder, part-specific damage and make `?broken=` work on every page.
3. Add anticipation to the slick and beetle attacks and stop the slick's legs squashing in death.

## Looked at
Sheets in `review/A1/sheets-w1/`: `<asset>-<mood>.png` (8 evenly spaced frames per mood, 16 sheets), `ghost-hurt0-3.png`, `ghost-beetle-mite.png`, `slick-death-late.png`, `hound-attack-key.png`, `mite-attack-key.png`, `beetle-attack-key.png`, `slick-attack-key.png`, `phone-125px.png` (with the cog rat), `broken-sheet-<asset>.png` (cells: none, all, then each part) plus `broken-<asset>-*.png`, and `brokenmood-<asset>-<mood>.png` (slick and hound, all broken in attack, hurt and death; captured but not examined closely). Also `art/rust-mite/source.png` and `art/cog-rat/frames/idle/000.png`. I did not play the clips live, did not read the beetle, slick or hound `notes.md`, and did not check broken looks during motion for the mite and beetle.
