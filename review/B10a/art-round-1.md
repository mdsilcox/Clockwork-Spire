# B10a.3 Bellfoot street: art review, round 1

Verdict: **REVISE** (no blocker for the game loop, but it reads as a collage, not a place).

Scores: Style match 7, Read 6, Polish 5, Motion n/a (static; parallax/walk fit judged under Fit), Fit 6. Average 6.0, below the bar of 8.

Evidence
- Style match 7: palette (teal, amber, brown, cream) and inked line are in family with art-direction v3, and the sky is the strongest piece. But the cast is drawn with heavy black outlines and flat saturated fills (Sprocket tan/white); the scene is finer-lined and dark-brown dominant, so characters will look "sticker on a different painting". Acceptable, not seamless.
- Read: every place has a distinct silhouette at the true phone view (1423x800 units shown at 667x375): gate arch with lamp, workshop with window and teal door, Sprocket's roofed corner, trophies dome, archivist facade, five stall awnings, clock tower arch. Good. Weak points: the workshop and Sprocket's corner are separated only by the wall (the workshop crop is narrow and its roof is a flat strip), and the painted dog on Sprocket's doorstep will compete with the real Sprocket walking there (two corgis).
- Polish 5: (1) gate, archivist and clock tower are opaque rectangles with straight hard edges and unpainted-looking square corners against the sky (gate x 35-300, archivist x 1330-1630, tower x 2085-2400 in street px); the archivist's top corners and the tower's hard top edge cut across rooftops. (2) A hard horizontal dark line with a thin gold line at y ~395 runs along the whole wall top and is cut by the fronts at different heights. (3) Wall is a tinted stone texture; it tiles in blocks and has a visible seam at x ~1640 (archivist right edge to stalls). (4) The lamp posts and ivy planters have faint rectangle edges (foreground) and their iron fences end abruptly. (5) The cobbles are huge (stones ~200 px, about 90 px on a phone) and are the most saturated, highest-contrast area: they dominate the lower third and fight the characters' feet. (6) The five stalls are one repeated stamp (identical awnings and tables at identical spacing). (7) Sky: a soft vertical blend near x ~700-900 where three skies meet (teal swathe vs. cream clouds); visible, and the parallax shifts it against the street, so it will drift.
- Fit 6: all seven places sit on the contract anchors and have the right character (gate, bench window, corner with dog, trophy case, library door, empty stalls, clock tower with a clock door). The tower door is the brightest, busiest facade and out-pulls the gate as the landmark; empty stalls read as stalls with goods removed (good for "empty"). Dusk mood is right (lamps lit). The town does not yet read as one continuous street: each front has its own lighting and ground contact.

Characters against it: the tinker and Sprocket will read where they cross the dark brown wall and the facade doors (they are light and warm), and poorly in front of the cream archivist and tower facades and the warm gate interior, which are close in value. The cobbles behind their feet are busy. A walk lane (a darker, calmer band at y 600-700) is needed.

Defects
1. Street, fronts at gate/archivist/tower: hard rectangular edges, no ground contact or shadow. Must-fix. Feather the outer 8-12 px of each front's alpha and add a soft dark contact shadow and a baseline shadow strip at y 640; paint (or gradient-overlay) a darker, desaturated vignette band behind each front where it meets the wall/sky.
2. Street, wall: wall-top line cut by fronts, tinted texture seams (x ~1640). Should-fix. Multiply the wall with a vertical dark gradient (darker at the top and behind the fronts), blur-blend seams, run one continuous cornice line at constant height under the fronts.
3. Street, cobbles: too large, too high contrast. Must-fix for readability. Scale the cobble layer down about 0.5x (tile it), desaturate and darken it about 20 percent, and add a darker band at y 640-700 so feet read; keep the bright cogs/leaves sparse.
4. Foreground, lamp bases and fences: rectangle edges. Should-fix. Feather alpha or clean with a one-pixel erode; give the lamps a soft ground shadow.
5. Sky: soft seam near x 700-900 of the 1800 px layer. Should-fix. Re-blend with a wider (200+ px) gradient mask or flip one sky to align the cloud bands; the parallax 0.3 makes any visible seam travel.
6. Tower door (brightest facade): Should-fix. Lower the exposure of the tower front about 15 percent so the gate and the tinker's own workshop remain the foci.
7. Sprocket's corner: the painted dog is a second corgi. Should-fix. Remove or replace it with a doorstep basket (inpaint from a neighbor), since the real Sprocket is drawn there.
8. Stalls: identical repetition. Nice-to-have. Vary the awning tint or add per-stall shading.

Top 3 fixes (all cheap, in build.py, no regeneration)
1. Alpha-feather the fronts and add contact shadows plus a dark band behind them (defect 1, 2): this alone turns the pasted panels into a street.
2. Shrink, darken and desaturate the cobbles and add a calm walk lane (defect 3).
3. Re-blend the sky seam and tame the tower (defects 5, 6); remove the painted dog.

Looked at: art/bellfoot/wide.png full; 7 phone-equivalent crops (1423x800 scaled to 667x375, around each place, as two contact sheets); a 1:1 crop of the gate and workshop; art/sprocket/sprocket_rembg.png for line and value comparison. Not run: in-game recording with the walkers (judged from crops); art/tinker has only candidates.
