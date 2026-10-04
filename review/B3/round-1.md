# B3 "The run" review, round 1

Verdict: PASS (no blockers, every metric at least 7, average 7.57; threshold 7.5, so a narrow pass)

Commit e4a8a6e (cs-review-B3).

## Scores
| Metric | Score | Evidence |
|---|---|---|
| Fun | 7 | A first hand-played Act 1 fight cost 21 to 36 HP, so Repair/Forge/Oil choices matter; the loop of map, fight, reward, event is complete. Reward screens offer only 3 parts and boss trinkets feel like the real hooks. |
| Clarity | 8 | The map legend, node icons and tooltips are clear, boss intro explains the Clockmaker ("He remembers your last turn. He will take it back."), the rewind banner names the part being undone, and the Continue button waits on the trinket choice. |
| Depth | 7 | Runs bot: 1.0% win rate (under 3%), impact 0.58 to 1.43 (median 0.90) over 27 measured parts, none above 2x the median. Caveats: 19 of 46 parts are n/a for sample size, and 57% of runs end in Act 1 (Foreman 17% of deaths) while the fight bot wins 98.6%, so the bot is a weak proxy for a human run. |
| Feel | 8 | Machine runs with chain counters, glow, arcs and damage floaters; Rewind has a distinct teal clock-sweep effect and a banner; boss intro dialog. Rewind fired every turn at 1x when I played. |
| Look and sound | 7 | Consistent dark-brass style, good enemy and part art, nice map. Events, shop, forge and oil are plain text cards, with large empty areas at 1280x800; no audio yet (due in B5). |
| Stability | 8 | `npm test` green: 242 unit tests, 61 e2e passed, 1 skipped. No console errors across fights, all node types, three acts at both sizes, reload mid-combat (resumed correctly at Turn 3 with the Clockmaker at 106/110 and the machine intact). |
| Spec coverage | 8 | Branching map, fights, elites, 3 events in each act, forge, oil, shop, trinkets, 3 bosses incl. Clockmaker with Rewind, run resume and the defeat and victory screens all work and are covered by e2e. Sprocket events: art deferred to B4 as planned. |

Average: (7+8+7+8+7+8+8)/7 = 7.57

## Blockers
None.

## Improvements (ranked)
1. Depth/Fun evidence: the run bot dies in Act 1 (57%) and mostly to the Foreman, so the report says little about Act 2 and 3 balance or part impact (19 parts n/a). In B4, improve the bot (use forge, shop, oil sensibly) or add a "strong bot" mode, and rerun with enough offers for every part.
2. Look: give event, shop, forge and oil screens an illustration or at least a header image and centered, bounded layout; at 1280x800 the event screen is a thin text column with an empty page below.
3. Polish: on the phone, a tooltip from tapping a reward card stays pinned over the "Spoils" header and card list until tapped away; Repair is offered at full HP (50/50) with no hint it is wasted; the rewind banner overlaps the Chain label at 667x375.

## What I tested
- `npm test` with PW_PORT=5362: all green. Vite on port 5363 (stopped by PID).
- Title, "Climb the Spire", map at 1280x800 and 667x375 touch (deviceScaleFactor 2): legible, no sideways scroll.
- Real-interface fight by hand at both sizes through to the reward screen; reward flow.
- Via `window.__game`: event (acts 1, 2, 3), shop, forge, oil, elite, all three bosses; boss rewards (part, trinket, blueprint) then act transitions to Acts 2 and 3; Clockmaker played at 1x at both sizes with Rewind firing; reload mid-combat resumed exactly.
- Read the run and fight balance reports. Did not play the Clockmaker's later phases to the end, nor the victory ending (B4); the victory e2e passes.
