# D4 art samples, review round 1

Overall: REVISE (Sprocket, Boilermaker, Cog Rat); title PASS with two small fixes. Scores are 1 to 5 (style fit / rig quality / readability).

Sheets in `review/D4/sheets/`: sprocket_idle_happy, sprocket_sleepy_walk, sprocket_walk_legs_zoom (frames 15, 38, 23, 8 at 2x), sprocket_edge_ref, boiler_idle_attack, boiler_hurt_phase, boiler_zoom_chest_hand (phase 100 and attack 30), rat_a (idle, attack), rat_b (hurt, death), title_live, title_tagline_zoom. Frames also viewed at phone size (sheet cells are 300 to 420 px tall; the boss cells are about 220 px equivalent when downscaled). Note: boilermaker/cog-rat frames are 0-indexed.

## Cross-asset style (the owner's main sign-off question)
- The four do NOT yet read as one artist. Sprocket is a flat, thick-inked cartoon (close to the trial references). The Boilermaker and Cog Rat are rendered, airbrushed brass with thin, mostly dark-brown internal lines, no heavy silhouette ink, gradient specular highlights (near photo-real brass). Palette is shared (brass, teal, amber) and light is roughly upper left on all, but line weight and shading are two different languages. The title is closest to Sprocket (inked clouds, flat bands) and is the best match to the "storybook" target.
- Must-fix at style level: pick one. Either regenerate boss and rat with the Sprocket/title line recipe (heavier ink outline on the silhouette, flatter fills), or accept the rendered look and re-do Sprocket. Recommend the first, since the owner liked the inked trial art.

## 1. Sprocket (style 4, rig 3, readability 3) REVISE
Must-fix:
- Walk, frames 8 to 45 (leg zoom sheet): the far front leg is gone; only a floating paw/short stub remains, with a hard vertical edge visible at the cut (x about 150 to 165 in the 608 px frame, frame 15 and 38). The near front leg stretches into a pointed white wedge (frames 15, 38) that loses its paw shape. This is the known edge, and it is clearly visible at game size. Fix: paint/inpaint the hidden far leg into the source, or limit swing and keep the far leg planted.
- Hind paws (all moods, most visible in walk 15, 38): a black horizontal slab sticks out beneath each hind paw (leftover ground line, about 20 x 4 px at 608 px). clean.py removed the ground line between paws but not these.
- Leg ghosts in every mood, including idle: the far hind and far front legs are thin gray-outlined, nearly transparent slivers (idle frame 1, x 310 to 350, y 215 to 280), with a pale gray-blue smudge near the far hock. Reads as erased, not shadowed.
- Walk frame 1 still shows the sleepy "Z" glyphs at upper left (walk frame 1, near x 55, y 420 in sheet): effect state leaks across mood change.
Should-fix:
- Anatomy reads as a long-legged collie/shepherd more than a corgi (legs not short, ears modest). Brief asks for short legs, big ears, fluffy rear; the fluffy rear and tail are good. Consider a corgi-specific regeneration, or shorten legs with a warp.
- Idle/happy/sleepy differ only in face (tongue, closed eyes, Z); body motion is very low. Idle breathing is not visible across frames 1, 30, 60, 90 beyond a blink. Sleepy needs a visible head droop or sink.
- Harness is a flat gray plate that differs from the trial's brass-and-leather look the owner liked.

## 2. Boilermaker Queen (style 3, rig 2, readability 4) REVISE
Must-fix:
- Attack (frames 0 to 83): the body barely moves (about 7 degree swing is not perceptible at phone size). Windup at 15 to 30 is a glow only; there is no anticipation pose and no impact weight. The steam burst at frames 50 to 70 covers her torso and head, so the impact moment hides the character. Fix: larger arm/scepter raise and slam (at least 20 to 30 degrees on the scepter arm, body lean/squash at impact 40), and keep steam behind or to the sides.
- Phase (frames 20 to 119): the broken gauge is a flat black disc with orange spokes (zoom sheet, left), inconsistent with the dimensional painted dial it replaces; it is also off-center top-edge at x about 245 to 300 vs. the plate. It stays broken correctly. Fix: paint a cracked/shattered-glass overlay with a dark interior and a bright rim, or use a second painting of the plate.
- Phase 40 to 60: the shrapnel triangles are flat white and scattered far (to the frame edge at y 700+); the steam jet at 60 to 80 rises through the crown and head. Shrapnel should be brass, short-lived and near the gauge.
Should-fix:
- Hurt frame 0 is a full-body white wash (only 1 frame, but it covers the whole figure at once). Prefer a short additive flash plus a visible recoil; frames 10 to 53 show almost no recoil.
- Sliver at lowered hand (x about 745): not objectionable at 220 px; at 1.5x zoom the gray hand has a slightly clipped right edge. Low priority.
- Idle has a tiny drift; breathing needs more chest or shoulder motion to avoid feeling frozen. Wisp particles are fine.
- Line weight: no thick silhouette ink (see style note).

## 3. Cog Rat (style 3, rig 3, readability 3) REVISE
Must-fix:
- Attack (frames 12 to 40): lunge is a slight forward shear; at 22 the head tilts and a small glint appears, but the windup (0 to 12) and recover read the same as idle. No weight at impact. Increase crouch and lunge distance, add a clear anticipation.
- Death final pose (frame 89) and 45 to 60: legs become thin tangled wires on the ground at the rear, the tail wheel is flattened into a thin sliver, and the body has no belly contact shading. Reads as a broken mesh, not a collapsed machine (confirms the known risk). Fix: a dedicated collapsed painting, or fold legs with less compression and add a shadow.
Should-fix:
- Species read: the head and body read as a pig/tapir with a bullet snout; the tiny ears and tail are missing, so "rat" depends on the name. Consider a regenerate with a pointed snout, round ears, and a ratty tail.
- Hurt frame 0 full white wash; frames 8 to 44 show little recoil.
- Legs in idle are thin (about 4 to 6 px at 330 px tall) and nearly disappear at 100 px height; the body mass reads, the legs do not.
- Cut-out edges are clean (no halo found); the cog bounce particles in death are flat yellow and fine.

## 4. Title (style 5, rig 4, readability 4) PASS with fixes
- Strong, on style, cohesive palette, clear focal tower, subtle motion (cloud drift, steam, sparks; frame diff grows steadily, no hitch between 178 and 179). The loop is a drift, not a seamless loop: confirm the clouds wrap or the animation clamps over long idle.
- Should-fix: tagline (desktop, x 55 to 340, y 165 to 178) is about 11 px small caps on cream clouds with a thin dark outline; legible only when zoomed. Raise to 14 px or more, or add a soft dark plate under it.
- Should-fix: on phone (667x375) the tagline is missing and the title is pressed to the top-left edge (about 12 px margin) with the buttons directly under it; tighten with a safe margin of 16 px or more. Buttons are at 40 px+ and readable.
- Nice-to-have: menu buttons are dark teal slabs on orange sky; fine, matches the palette.

## Ranked improvements
1. Unify the line language: re-run the boss and rat through the inked style (thick silhouette outline), so the cast matches Sprocket and the title.
2. Fix Sprocket's far front leg and the black paw slabs, then re-check walk 8 to 45, and clear the leaked Z.
3. Make the attack mood actually read (Boilermaker and Cog Rat: bigger windup and slam, steam off the face, a proper collapsed death pose).
