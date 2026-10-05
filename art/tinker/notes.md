# Tinker rig notes

Painting 1216x832 faces LEFT; the page mirrors it with CSS (`#flip`, scaleX(-1)) so the player faces right. The PNG is untouched. Pad [70, 70], grid 152x104. Frame = crop x 440..1070, y -45..805 of the painting (630x850).

## Clean-up (clean.py, alpha only)
Removes the toy cart, string and handle (cut along the lower edge of the finger outline so the fist keeps a closed ink line), ground squiggles and specks. Round 2: source.png is the masked repaint `hand/seed5.png` (relaxed open hand, round 1 is `source-r1.png`, `cut-r1.png`); cut with rembg + keymask --tol 30, then clean.py (the round 1 fist cut is gone; the cart/string removal stays).

## Joints (painting px)
Hips (764,478) and (776,478) (near a common pelvis); knees (722,604) and (818,602); ankles (708,712) and (850,706). Painted leg angles: -10 (front-painted) and +18. Far arm shoulder (702,348), elbow (650,358); the hand is rigid with the forearm (elbow weight 1 for x < 630); near arm shoulder (866,345), elbow (857,405). Neck (745,250). Pack hinge (830,320). Legs are torn apart below y 534 at x 775 (`part`/`tear`); above it the side weights blend over a width that narrows with y, so the crotch does not shear.

## Walk (2 s)
Hip angle phi = 4 - 16 cos(p) (about 20 degrees at most from vertical), knee flexion 40 in swing, toe-off, hang and toe-up at heel strike, boot kept flat in stance. The pelvis height comes from the lowest foot (groundDy), so feet plant and the body dips at contact and rises at passing. Arms swing opposite, the far arm held forward with a bent elbow; the pack follows the bob 0.32 rad late; small flat dust puffs at each heel strike.

## Moods
- idle 4 s: 8 px weight shift with the unloaded knee easing, breathing, a glance up (1.0 to 1.8 s), then the open hand rises to the glasses and taps (2.9 to 3.3 s).
- cheer 3 s: crouch, hop with tucked legs and the open hand raised, waving (1.0 to 2.5 s, no fist; sparkles at takeoff), landing dust, a second small hop, lowers.
- hurt 1.5 s: flash 0.2 for 3 frames, ink-edged two-tone star at `core` (radius 32 to 46 px, half of round 1), head snaps back first, torso lean and sway, arms fling, pack trails, recover with a small overshoot.

## Anchors
hand (the free open hand), head, satchel (the pack), core (chest), eyes (glasses).

## Known weak spots
The far sleeve weight edge was tightened (x 686 to 712); a faint fringe can remain at the largest arm angles.
