# B7 Enemy machines, critic round 1

Verdict: PASS (no blockers; all metrics at least 7; average 7.57).

## Scores
| Metric | Score | Evidence |
|---|---|---|
| Fun | 7 | Breaking the Jaw to cancel a 6x2 and seeing the preview show it ("cancelled", -5 on the part, -10 on the core) is a real decision; Tinpot General (sealed core, 4 keystones, Corrode 75% + Attack 13) forced a plan. Hand randomness and v1 map/events/shop around it still dull the loop. |
| Clarity | 8 | Intent icon, number, HP and order badge sit on each part at 1280 and 667x375; tooltips say it in words ("Corrodes 50% of your Plating, then Attacks for 11, 2 times. Acts on turns 1 of every 3. Keystone: break it to open the core. Next: ..."). Glossary has Shatter, Drill, Pry, Patch, Jam, Braced, keystone, sealed cores. No entries for Pierce, Siphon, Ratchet, Countdown by name. |
| Depth | 7 | balance/2026-10-04-v2-fights.md: expert loses 3-6% (normal) and 4-9 HP (elite) while naive turtle/burst lose 2.6x-10x more on elites; BV3, BV6, BV8 targets pass after D-038. Normals are thin: turtle/burst clear the 10% line only narrowly (10.9 to 11.9% act 1). |
| Feel | 7 | Run replays chain, breaks, scrapped marker and per-target Run: numbers; salvage tray has a Keeping state. Placeholder code-drawn enemies, no painted art until B8. |
| Look and sound | 7 | Code-drawn machines read cleanly and consistently (Tinpot, Gearhound, Oil Slick, Cog Rat); not final art by design. No visual defects seen at either size. |
| Stability | 9 | npm test fully green (unit 346 passed/3 skipped/47 todo for later phases; e2e 158 passed; offline 2; career 1, autoplay wins in 15 runs). No console errors in my session. |
| Spec coverage | 8 | Machines, order, new actions, player words, Braced, salvage tray, bots all present; EM/EA/BV acceptance covered in tests (EM8, EM9 e2e on both projects). Wardens stay v1 as planned. |

Average: (7+8+7+7+7+9+8)/7 = 7.57.

## Blockers
None.

## What I tested
- `npm test` myself: all four stages green.
- Dev server on 5342 (stopped by PID). Practice fights ['cog-rat','rust-mite'], ['oil-slick','spring-imp'], ['tinpot-general'], ['gearhound','steam-wraith'], ['valve-crab'], ['foreman'] at 1280x800 and 667x375.
- Targeting: tapped a part to add it to the order (badge 1/2 appear), preview showed breaks and cancelled intents, Run matched (Jaw broke, Cog Rat 15 to 5, no Jaw attack).
- Real run from title: slot, Workshop (Sprocket present), Climb, act map, fights, salvage tray ("Keep it" then "Done", cogs shown), jumped to the act 1 elite (Tinpot General, won in 3 turns losing 13 HP with naive placement).
- Turtle probe: six Escapements gave 54 Plating in preview; Valve Crab's Corrode 50% + Attack 14 cost 0 HP, but it never pressured and Plating does not carry, so this is a stall, not a win. The "stack, then burst" solve is answered by the sim numbers (burst/turtle bots lose heavily to elites), not trivialized.
- v1 Foreman, map, shop and events still load; no regressions seen.

## Top improvements
1. Fix the stale hand-written "Reading the numbers" block in balance/2026-10-04-v2-fights.md (src/sim/strat/notes-v2.md): it says BV8 fails in every act while the Targets table above it says all pass after D-038. Rewrite from the tuned run before B8 builds on it.
2. Add glossary and tooltip entries for Pierce, Siphon, Ratchet and Countdown (only Corrode/Drill/Pry/Patch/Shatter/Jam are named); a new player meets the words on intents first.
3. Strengthen normals for BV3 headroom: turtle/burst lose only 10.9 to 11.9% in act 1 normals, so a naive Cog Rat or Rust Mite fight can be won in one or two turns at near-zero cost. Give one more act 1 normal a part that punishes ignoring it.
