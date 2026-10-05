# Gearhound notes (A1, gearhound-art)
Image pixels, cut.png 1216x832, ground at y 772 (rig.json feet). Faces left. Stage pad 250 left, 110 top and bottom, 150 right (the lunge goes 135 px left).
- clean.py (reruns from cut.orig.png): removes the pale ground smears under the paws, the white background showing through holes (leg and tail gaps, the engine top; teeth box x<330, y 150..345 is protected) and specks under 120 px. Alpha only.
- Joints: jaw hinge (300,255), neck (340,260), tail base (1000,240), outer tail (1090,430). Legs (hip, knee, ankle): near front (520,465), (548,535), (455,690); far front (710,455), (745,530), (690,690); hind (960,295), (940,468), (1062,625). Eye (160,125); engine pipe vent (728,66).
- Anchors: hound-fangs (125,235,r95) both tooth rows; hound-snout (62,162,r36) the nose; hound-haunch (938,468,r72) the brass knee disc of the hind leg; core (600,255); eyes (160,125).
- Lower jaw is a weight below a polyline (jawEdge) that ends at the cheek plate; it rotates about the hinge, the head about the neck, the head weight is a soft x band so the neck bends. No tear on the jaws: the gap is transparent.
- Legs: weight bands along each leg's center line, children deformed first (foot about ankle, shin about knee, thigh about hip). Squat is a vertical scale about the ground line, so crouches never stretch the legs; pitch rotates the body about the hind foot.
- Tail: the upper two thirds swing (two bones, the outer one lags). The tail tip touches the hind hock, so the weight fades out by y 612 and a tear separates tail and leg above y 430; swings are kept small (3 to 8 degrees, up to 18 in the death droop) or the tip sweeps through the leg.
- idle 4 s: low stalking stance, weight sways 5 px, head leads the sway, tail trails it, jaw twitches and holds (two twitches), engine shudder, the far front paw lifts and replants in the same spot (dust on landing), breath steam from the mouth, a magnet shimmer at the snout.
- attack 2.4 s: crouch (squat 0.095, head back and low, jaw wide), leap (all feet lift, body 105 px forward, stretched), bite at 0.97 s (jaw closes, hit star at the fangs, sparks, dust at all four feet, shake), hold, bound back with lifted feet, settle.
- hurt 1.6 s: flash 0.25 for 3 frames, head snaps up, jaw yawns, tail whips, short skid with lifted feet and dust, hit star at the core.
- death 3 s: flash, recoil, front legs buckle first, body sinks (squat 0.3), head drops to the ground with the jaw slack, tail droops, eye glow flickers and goes out, steam and a few sparks from the engine; the last frame holds.
- Broken looks: crack() overlays (as Boilermaker) sized to each anchor; the fangs patch is drawn twice, on the upper and lower tooth rows, so each follows its jaw. Small at game scale: they read as rings of cracks; the haunch ring is the clearest.
- Still imperfect: the hind ankle's thin ring and hock bracket shear a little under a large ankle bend (kept at 12 degrees); the far hind leg is not painted (three legs show, like the painting); dust puffs are small at 0.5 scale.

## Round 2 (wave 1 review)
- Flash: hurt and death use 0.14 easing to 0 over 0.1 s (3 frames), body opaque, shadow untouched (it is on a separate canvas).
- Broken looks replaced: bold voids drawn over the part (jagged dark polygon, orange ember gap, ember rim, ink cracks running out), scaled up to read at 125 px. Fangs: a void in each tooth row plus snapped cream stubs. Snout: a wide zigzag split from brow to lip plus a small void and a vent puff. Haunch: a chunk gone from the piston disc, a gash across it, and steam leaking out of it. They follow the pose (each vertex is deformed). Limit: rig.js cannot erase the painting's alpha, so the "missing chunk" is a drawn void, not a changed silhouette.
- `?broken=hound-fangs,hound-snout,hound-haunch` is read from the page URL (and the checkboxes still work).
- Shadow shrinks (to 70%) and fades (to 35%) with the height of the body and paws.
- Dust: small flat ink-edged puffs, squashed low, rust-gray (like the steam style), no cream lumps.
