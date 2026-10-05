# B10a Bellfoot, gate review round 1 (47ad763)

Verdict: REVISE (no blockers and every metric at least 7, but the average is 7.43, under the 7.5 rule).

## Scores
| Metric | Score | Evidence |
|---|---|---|
| Fun | 7 | A real out-of-battle loop now exists: walk the street, open places, meet a resident in the Spire, send him down, find his stall, get 2 Oil Flasks next run (flask heals 15, hp 20 to 35, no hour). Still mostly panels, though. |
| Clarity | 8 | Places menu lists every place and scrolls on phone (phone-05-menu.png); disabled event choices give reasons ("You have no cam or lever to give him."); map shows landmarks with text; bestiary has an empty-state line. |
| Depth | 7 | Residents and landmarks give modest, distinct effects; the Lamplighter's fix is gated on a cam or lever. Balance reports exist; D-044 defers the act 2 retune to B10b. Not a depth-heavy phase. |
| Feel | 7 | Tinker walks to a tapped place with Sprocket following, second tap opens at once, arrow keys work; Sprocket reaction after a loss was `happy` (Sprocket moods tested in e2e). Painted rigs read well. Place panels are black full-screen sheets (desk-oil-stall.png), so the street vanishes. |
| Look and sound | 7 | The painted street is atmospheric and cohesive in the teal, copper and lamplight palette (desk-01-town.png). Visible seams between layers (sky blocks, hard-edged ground band) and five empty painted stalls with no resident (desk-04-all.png). Audio not judged by ear; `bellfoot` track exists. |
| Stability | 8 | `vitest` 700 passed (3 skipped, 21 todo) when I ran it; coordinator reports e2e 231, offline and career green. My driven runs at both sizes: no console errors, no page sideways scroll (scrollWidth equals the viewport at every panel). Server on 5386 stopped. |
| Spec coverage | 8 | BF1 to BF3 and BF5 verified by tests and by play; archivist four tabs, collars empty state, Scrapper, landmarks, oil flask all present. BF6 town half present; Spire half is B11 by D-043. |

Average: (7+8+7+7+7+8+8)/7 = 7.43.

## Blockers
None (no crash, no save loss, no phone break, no required B10a feature missing).

## Improvements (must be done to pass; small, no rule changes)
1. Make the resident stalls feel inhabited, which lifts Look and Fun: draw each resident (or at least a silhouette plus a lit lamp) at its stall, and keep unoccupied stalls closed or shuttered instead of five painted-empty awnings. A resident moving down should be visible on the street (desk-04-all.png shows five blank counters). Already on B11's list, but a minimal version is needed here.
2. Fix the place panels: they are full-screen near-black sheets (desk-oil-stall.png, one line of text, nothing below), so the street vanishes. Make them a bounded card over a dimmed street, and give stall panels content (what the resident gives you next climb, e.g. "Oil Flasks: 2 per climb", and where you stand with him) instead of a one-line blurb.
3. Hide the layer seams in the painted street (hard-edged ground band, mismatched sky blocks between fronts, ivy boxes) with a soft blend or overlap pass; art-round-3 passed it at 8.0 but it is visible in desk-01-town.png and phone-01-town.png.

## What I tested
- `npx vitest run`: 700 passed, 3 skipped, 21 todo. I did not rerun e2e, offline or career (coordinator reports green).
- Dev server on 5386 (stopped by PID), headless Playwright at 667x375 touch and 1280x800: title, fresh save into Bellfoot, walked to and opened every place (gate, workshop, Sprocket's corner, trophies, archivist, clock tower), second-tap opening, Places menu with all five residents and three landmarks (scrolls on phone), the archivist's four tabs (journal empty state, bestiary with silhouettes, note, map with lift, vault and beacon), a real Oil Merchant event ("Tell him about Bellfoot") then a lost run, the end screen to Bellfoot with Sprocket `happy`, the stall appearing, the next run showing "Oil Flask x2" and the flask healing 15 HP (20 to 35) at both sizes. Lamplighter "Fix the lift" is disabled with a reason for the Tinker's starting bin. Console errors: none. Page scrollWidth equal to the viewport everywhere. Earlier phases: climb map, event screens and end screen still work.
- Not tested: the collar band close up (art round and browser check cover it), audio by ear, a full lift run, Hour Ghost lore effects in the bestiary beyond the browser-check evidence, e2e.
- Scripts and screenshots: `review/B10a/gate-shots/` (drive.mjs, loop.mjs, loop2.mjs).
