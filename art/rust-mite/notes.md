# Rust Mite rig notes (A1, act1-bugs)

Painting 1216x832, three-quarter profile facing left, pad [200, 110], ground y 750. clean.py (alpha only, keeps cut.orig.png) removes the soft brown halo and gray specks around the thin legs.

## Joints (image pixels)
- Pincers: the big curved horn, pivot at its root (352, 452), path (305,432) (255,436) (215,468) (198,530); weights follow the path (distance to polyline, width 28). Open = raised (positive angle), stab = negative angle plus a forward shift (hhx).
- Six legs, hips (305,480) (420,545) (555,505) (668,510) (820,500) (890,455); weights follow each leg's polyline, ramped in below the hip so the body is untouched. Tripod A = legs 1, 4, 5; tripod B = legs 2, 3, 6.
- Gait: angle is positive forward; a stance foot sweeps back while planted, a swing foot lifts (lift moves only the part below the hip). Amplitude follows body speed, so a still body means planted feet.
- Gland: the back dome, anchor (725,255) r 150; its glow is clipped to the dome outline (DOME polygon, deformed with the body) and pulses at 0.8 Hz (idle), brightens in the attack windup, gutters when broken, dies in death. A small vent glow sits on the top cap (625,100).
- Eyes: the glowing orb (418,488); extra glow, dims to gray-brown in death. Core (610,410): where the hit star bursts.

## Moods
- idle 2.4 s: low breath, two pincer clicks, one front-left leg re-planted, a rear leg shifts, one rust puff.
- attack 2.0 s: rear back with raised pincers (0.3 to 0.5), 7 frame tripod dash 176 px with the pincers leading and a downward stab at 0.72, sparks at the tip and a small shake, hold, scuttle back.
- hurt 1.5 s: flash 0.2 for 3 frames, 48 px flinch in 2 frames, hop, rattling pincers, tripod scuttle back, star at the core.
- death 2.6 s: shudder, glow gutters, legs splay outward (left legs positive, right negative), body sinks to 0.44 crouch, pincers drop, rust steam and cogs at 1.1 s, one leg twitches after settling.

## Broken looks (state.broken), revised
- A jagged bite is erased from the painting itself (scissored clears on the rig's GL canvas, following the part), so the silhouette changes. Behind it an ink-edged ember cavity (under layer, pulled inside the painting's alpha), plus an ember rim along the cut, three ink cracks and, on the gland, a swinging flap.
- mite-pincers: bite across the horn at (230,436), r 30. mite-gland: bite out of the dome's right edge at (816,222), r 78.
- The gland glow is now a hard-edged, two-tone, ink-outlined shape clipped inside the dome, swelling in steps (smaller than before); attack eases it back by 1.5 s.
- Pin anchors are unchanged.

## Decisions
- Effects follow the shared style. Steam is rust-tinted. Only one horn is painted, so "pincers" is that piece.
