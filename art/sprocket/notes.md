# Sprocket notes, round 2 (inked painting; round 1 files are in r1/)
Image pixels, cut.png 1216x832, ground at y 752.
- Joints: head pivot (345,305); ears far (245,165), near (305,205); tail base (1040,340); legs: far front (570,590), near front (505,570), far hind (880,560), near hind (1050,620); wrist/hock pivots at y 655 to 705.
- Eye center (193,240), lid color rgb(222,165,101). Mouth corner (217,334); the open mouth is drawn in code.
- clean.py (reruns from cut.orig.png): trims ground slabs under paws, solidifies the pale belly fur and the shaded far hind leg, removes the scrap that stood in for the far front leg and builds a far front leg from a shifted, grayed copy of the near leg (composited under, with a drawn ink edge).
- Front legs have no tear: a tear left a stair-stepped edge, so they blend with a soft weight band that follows the near leg's right outline (bx(y)). Hind legs are torn apart across the open gap (y > 650).
- Walk: 3 trot cycles in 2 s, diagonal pairs; hip swing 8 to 9 degrees (front, kept small because the far front leg is a copy) and 14 to 15 (hind); wrist/hock flex 9 and 22; paw lift 11 px; bob; dust at paw landings.
- Recording quirk: an empty 2D canvas can show a stale buffer in screenshots (a Z showed on walk frames after sleepy). Fixed with a near-invisible mark drawn each frame (dirty()) and a two-paint wait per frame.
- Still imperfect: far front leg is a cheat (a copy), seen only between the legs; the hind far leg is flat gray.
