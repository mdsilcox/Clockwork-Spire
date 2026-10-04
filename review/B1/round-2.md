# B1 Walking skeleton, review round 2

**Verdict: PASS** (commit 24c4c4b)

| Metric | Score | Evidence |
|---|---|---|
| Fun | 7 | 12-part bin vs cog-rat 22 HP + 2 rust-mites: even my naive fill-the-board bot took 23 damage and needed 3 turns; pendulum, piston and boiler chains make the preview worth studying. |
| Clarity | 8 | Tooltips with full rules text appear on hover/long-press (Piston: "Spend 3 Pressure: Strike 9. Without enough Pressure: Strike 2."); preview now lists damage per enemy ("Run: -14 (scrapped)"), "Incoming 18", pressure "14 to 18". |
| Depth | 7 | Hand draws, Pressure spending, cam timing and sabotage targets give real placement choices; still only 8 parts, 3 enemies and a bot that fills cells won, and the simulator is a placeholder (not due in B1). |
| Feel | 7 | Gears, coil, pendulum and piston animate, chain counter, Victory panel and payoff beat; stale chain counter fixed. Short fights and no screen shake keep it from higher. Audio not audible under test. |
| Look and sound | 7 | Cohesive brass/copper art, new cog-rat and parts read well at both sizes; board still sparse early. |
| Stability | 9 | npm test green: 45 unit + 16 Playwright. No console errors at 1280x800 or 667x375 over full fights; reload restores the fight (and the Victory panel) with no stale counter. |
| Spec coverage | 8 | All B1 acceptance ids still pass; 8 parts, 2 act-1 enemies, practice fight, preview, autosave, `__game` hook all present. |

**Average: 7.57** (53/7). No blockers, every metric at least 7: PASS.

## Blockers
None.

## Improvements (ranked)
1. On phone the tooltip covers part of the board and stays after placing a part (Piston tooltip over row 3 in my screenshot); dismiss it on tap-away/placement and anchor it above the hand.
2. The practice fight is still winnable in 3 turns by placing anything; make the cog-rat or a mite punish sloppy builds (e.g. sabotage on an early cell, higher attack) so Depth moves toward 8 in B2.
3. Add a stronger run-payoff (screen shake or brief slow-down on the biggest hit, distinct chime for a long chain) and verify audio manually, since tests mute it.

## What I tested
Re-ran `npm test` (green). Vite on port 5330 (stopped by PID). Played at 1280x800 and 667x375 touch with DPR 2: start state (3 enemies, 12 parts), hover tooltip, skip-speed full fight to Victory, mid-fight preview, reload persistence; screenshots viewed; console clean. Round 1 points rechecked: harder fight, tooltips, per-enemy preview and counter fix all confirmed.
