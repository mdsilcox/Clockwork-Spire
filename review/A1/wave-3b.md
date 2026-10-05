# A1 wave 3b: tinpot-general attack confirm

Verdict: **PASS** (should-fix only). No must-fixes.

Looked at: attack frames 10, 12, 14 to 20, 22, 26, 32 (sheets `review/A1/sheets-w3b/atk1.png`, `atk2.png`; frame 018 full size), death 0 to 89 (`death.png`), hurt 0, 4, 10, 20 and buff 10 to 40 (`hb.png`), `broken-125px.png`. Frames were read from the lane's recorded `frames/` folders; I did not re-record, so page errors were not re-checked (wave 3 had none).

## Attack
- Slash now reads: from 17 to 19 the blade drops from raised-at-head to a diagonal across the body toward the player, with a cream arc that sweeps down the left side and fades by 22 (about 4 frames). It no longer looks like a salute, and it stays visible in the 125 px broken sheet (the arc is clear there).
- Windup: 10 to 16 lifts the blade from forward to vertical over about 7 frames, then 17 snaps it back over the head. Readable, though the lift is slow and uniform; the hold at the top is short. At 17 the blade crosses the face.
- Squash and hold: 18 to 22 body squashes, feet stomp with dust and sparks, 26 and 32 recover with the blade held across the body. Weight is good.
- The blade sprite sits above the hat and has no detachment, seam or pop between 16 and 19.

## Death, hurt, buff
- Death: hat pops and rolls, he topples, boots splay out to the sides instead of standing under him, spring and rivets fly. Reads as collapsed (frames 40 to 89). Fixed.
- Hurt: flash 0 to 4 stays light, askew hat, star on the porthole, settles by 20. Fine.
- Buff: off arm lifts, ink rings over the hat, blade stays held upright and attached. Blade sprite did not break either.

## Should-fix (not blocking)
- Smear 18 to 20: a hard dark segment line cuts across the arc near the hat brim (about x 260, y 153 in frame 018) and another near the bottom at 019 and 020. Looks like a seam between smear pieces. Blend or drop the ink edge on the join.
- Smear at 17 floats above and to the right of the blade (the swept area of the raised position), so for one frame the arc and blade do not touch. Start the band at the blade tip.
- Static guard-hook remnant on the barrel's right edge (about x 375, y 230 in frame 018) is still visible when the blade is gone from it; small at game size. Paint it out or leave it, it reads as a rivet bracket.
- Windup could use a 2 to 3 frame hold at the top (frame 16 to 17) for stronger anticipation.

## Scores (1 to 10)
Style match 8, Read 8, Polish 7, Motion 8, Fit 8. Average 7.8 on the 1 to 10 scale; no score below 7, no must-fix.

Can A1 close: yes, the tinpot-general attack is no longer blocking; carry the should-fixes as polish, and all wave 3 assets are otherwise PASS.
