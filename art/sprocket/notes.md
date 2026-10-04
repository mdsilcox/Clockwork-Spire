# Sprocket notes, round 2 (inked painting; round 1 files are in r1/)
Image pixels, cut.png 1216x832, ground at y 752.
- Joints: head pivot (345,305); ears far (245,165), near (305,205); tail base (1040,340); legs: far front (570,590), near front (505,570), far hind (880,560), near hind (1050,620); wrist/hock pivots at y 655 to 705.
- Eye center (193,240), lid color rgb(222,165,101). Mouth corner (217,334); the open mouth is drawn in code.
- clean.py (reruns from cut.orig.png): trims ground slabs under paws, solidifies the pale belly fur and the shaded far hind leg, removes the scrap that stood in for the far front leg and builds a far front leg from a shifted, grayed copy of the near leg (composited under, with a drawn ink edge).
- Front legs have no tear: a tear left a stair-stepped edge, so they blend with a soft weight band that follows the near leg's right outline (bx(y)). Hind legs are torn apart across the open gap (y > 650).
- Walk: 3 trot cycles in 2 s, diagonal pairs; hip swing 8 to 9 degrees (front, kept small because the far front leg is a copy) and 14 to 15 (hind); wrist/hock flex 9 and 22; paw lift 11 px; bob; dust at paw landings.
- Recording quirk: an empty 2D canvas can show a stale buffer in screenshots (a Z showed on walk frames after sleepy). Fixed with a near-invisible mark drawn each frame (dirty()) and a two-paint wait per frame.
- Still imperfect: far front leg is a cheat (a copy), seen only between the legs; the hind far leg is flat gray.

## Round 3: happy mood
- Two rigs from one character, stacked (build with `python art/sprocket/build.py`, not inline.py): neutral `cut.png` below, `cut-happy.png` (SDXL muzzle repaint from happy/seed5.png, open relaxed mouth with tongue) above. The happy rig copies the neutral rig's pose every frame, its opacity follows the mood (about 0.2 s fade), and the neutral layer hides at full mix so no ghost lines show. Only the visible layer draws effects. seq() steps both rigs.
- cut-happy.png = cut.png with the muzzle box (x 70-320, y 200-420) taken from the key mask of seed5 (the masks match exactly outside that box); clean.py writes it when cut-happy.orig.png exists.
- Happy body: tail wag 6 Hz at 28 degrees is the main signal, rear sways 3 px at 3 Hz, one play-bow dip at 0.8 to 1.9 s (front sinks 9 px, head dips 4 degrees), head up 5, ears back 7, pants at 4 Hz moving the jaw region 1.4 px. No hop.
- Idle, sleepy and walk frames are pixel-identical to round 2.
