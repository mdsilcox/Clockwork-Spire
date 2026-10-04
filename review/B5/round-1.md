# B5 "Look, sound and quality of life" review, round 1

Verdict: PASS (no blockers, every metric at least 7, average 8.00; threshold 7.5)

Commit f427336 (cs-review-B5).

## Scores
| Metric | Score | Evidence |
|---|---|---|
| Fun | 8 | Earlier flows replayed cleanly (slots, climb, defeat, Workshop, victory, ending, history); result screens now show where Brass came from, which makes each run feel paid. |
| Clarity | 8 | How to play has a drawn 5x3 diagram (Mainspring, spreading motion, a holding spring, badges) with linked glossary terms and a numbered text; Settings labels are plain; the portrait card says "Turn your phone sideways" and that the climb is waiting. |
| Depth | 8 | Unchanged by this phase; B4 careers report stands (median first win run 9, impact spread narrow). Run history now shows runs, wins (33%), best floor, favorite part and most common killer, which gives the player something to reason about. |
| Feel | 8 | Music switched by context as the game ran: workshop on title and Workshop, act1 on map and fight, clockmaker at the final boss, ending during the victory scenes (via `__game.audio.track`). Settings (reduced effects, color-blind, mute) persisted across reload. |
| Look and sound | 8 | Settings, history, how to play and the portrait card all match the brass-and-brown style at both sizes. Sound: I confirmed track selection, volumes and mute state, but I could not hear the music, so its quality is unjudged; no console errors with `?sound=1`. |
| Stability | 8 | `npm test` with PW_PORT=5362: 296 unit passed, 117 e2e passed (1 skipped earlier phases), offline spec 2 of 2 passed against the production preview. Console clean on all pages at 1280x800, 667x375 and 375x667. |
| Spec coverage | 8 | Settings (master, music, effects, mute, speed 1x/2x/skip, color-blind, reduced effects), history and statistics, How to play, portrait card, six music tracks, Brass breakdown, installable offline PWA (manifest and icons respond; game plays with network off), and the ending now reaches credits then the result screen then the Workshop. |

Average: (8+8+8+8+8+8+8)/7 = 8.00.

## Blockers
None.

## Improvements (ranked)
1. Defeat screen arithmetic: after a cheated loss it showed "Floors climbed 20" in the stat tile but "Floors climbed (19)" in the Brass breakdown. It may be a cheat artifact, but the same number should come from one source; also check the stat tiles' "Fights won 0 / Turns 0" on real runs, which looked suspicious only because of the cheat.
2. Settings: the speed buttons expose no pressed or checked state to assistive tech (no `aria-pressed`), and I could not confirm by eye that 2x or Skip persists across reload; add the state and assert it in the e2e.
3. How to play diagram: the Spur gear is a plain hollow ring with no label, and the diagram text and numbering (4 before 3) read a little out of order; label each part and fix the order.

## What I tested
- `npm test` with PW_PORT=5362, all green (unit, e2e, offline preview on 5432). Vite on port 5363 with `?sound=1` (stopped by PID afterwards).
- 1280x800 and 667x375 touch (deviceScaleFactor 2): title, How to play, Settings (all controls), Workshop with History and statistics after three runs (two losses, one win), the defeat screen's Brass breakdown, the victory ending through credits and the result screen, music track per context (title, Workshop, map, fight, Clockmaker, ending), reload persistence of settings; 375x667 portrait card.
- Not tested: how the music and effects actually sound (muted or unavailable to me); Clockmaker music intensity per phase beyond the track id; installing the PWA on a device.
