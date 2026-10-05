# B10a.3 Bellfoot street: art review, round 2

Verdict: **REVISE (minor)**. No must-fix defects; every score is at least 7, but the average (7.75) is just under the 8 bar. One cheap pass on the should-fix items below should clear it.

Scores: Style match 8, Read 8, Polish 7, Motion n/a (static; walkers judged under Fit), Fit 8.

Evidence
- Style match 8: the darker, desaturated cobbles and the dark wall band pull the scene toward the cast's warmth-on-dark look; the painted tinker and Sprocket sit in it without looking like stickers (phone-street.png, phone-street-walk.png).
- Read 8: all seven places are distinct at phone scale; the painted dog is gone so the real Sprocket is the only corgi; both walkers read clearly against the dark wall band and doors. Stall awnings now vary (teal, ochre, purple, green).
- Polish 7: round 1 defects 1 (contact shadows, baseline), 3 (cobbles, walk lane), 4 (lamps), 5 (sky seam) and 6 (tower) are resolved or much improved; the street now reads as one place. Remaining: (a) gate, archivist and tower still show crisp rectangular outlines against the sky (gate top and left edge, archivist top corners, tower top edge); the feather hides the sides but not the tops. (b) The wall-texture seam near x 1640 is still visible as a lighter vertical break right of the archivist (acknowledged by the lane). (c) The workshop's pale grey brick band is the brightest horizontal strip and visually detaches from the wall. (d) The cobble layer is still fairly busy and bright-edged where lamps stand; the leaf/cog props are fine. (e) The faint lamp-base rectangles are gone in game view.
- Fit 8: anchors and places are right, dusk mood holds, the tinker and Sprocket walk the lane in front of the doors with feet on the shadowed base; the tower is no longer the loudest facade. Sprocket's corner is now an empty roofed doorstep, which suits the story (the panel text says Sprocket is nearby).

Defects (all should-fix, cheap)
1. Street, gate/archivist/tower tops: hard straight top edges. Feather the top 10-14 px of each front's alpha too and lay a soft dark gradient over the sky just behind the top edge.
2. Street, wall x ~1640: lighter seam. Blend the two wall tiles with a 120 px mask or darken the wall region with a gradient (it is mostly hidden by the awnings in game).
3. Street, workshop brick band (y ~300-325 in 2400 px units): tone it down about 15 percent so it sits with the wall.
4. Optional: reduce cobble contrast another ~10 percent near the lamp bases.

Looked at: art/bellfoot/wide.png full; in-game phone-street.png, phone-street-walk.png, phone-corner.png (it shows only the place panel, not the street, so no art value); I did not open the lane's crops folder.
