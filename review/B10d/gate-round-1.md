# B10d The front door, gate review round 1 (423544f)

Verdict: PASS (no blockers; every metric at least 7; average 7.57). I did not rerun `npm test` (coordinator reports unit 846, e2e 297, offline, career green); I played the build myself.

## Scores
| Metric | Score | Evidence |
|---|---|---|
| Fun | 7 | The six-step script is short and ends on a real payoff: two Spur Gears chain to "18 damage (6 to parts)", the Strut breaks and its attack goes with it, then keep-or-scrap. It is a lesson more than a game; fine for a front door. |
| Clarity | 8 | A new player is told, in order: motion starts at the Mainspring (callout "it turns first"), motion passes along, tap the Strut to aim, the preview says what will happen, a broken part loses its attack, broken parts can be salvaged (tray: keep goes to the bin, scrap gives +3 Scrap, the "Scrap" coin is explained). A wrong tap on the Plate gives "Tap the Strut, the arm with 6 HP." It teaches v2 (frames, targeting parts, salvage), nothing from v1. Gaps: the Escapement/Plating is never used or explained; "Run: -14 (scrapped)" is unexplained jargon in step 3. |
| Depth | 7 | Not a depth phase. The scripted fight has one real decision (aim at the Strut vs the core) and the rig can't beat the player. No balance code touched. |
| Feel | 7 | Run animation and the break read well; Sprocket thumps his tail at the close. The stage is blank for about a second when step 1 opens (the first screenshot showed an empty dark area, then the board faded in). The painted title re-decodes with a one-frame flash of the plain text title when returning from the tutorial (skip). |
| Look and sound | 8 | The painted title is strong at 667x375: tower clear on the right, steam and lamps animated, buttons all left of the tower (AR3). At 1280x800 the DOM puts the painting at 1280x876, buttons at x 24 to 384, tower unobstructed, plus a tagline. Weak spots: the closing card uses the old code-drawn Sprocket, not the painted one, next to a painted title and Bellfoot; the slot screen is v1 plain (empty middle, slots pinned to the bottom). Audio not judged. |
| Stability | 8 | No sideways scroll (scrollWidth 667 and 1280), no app console errors (only a stale Vite HMR websocket message), no stuck state across fresh start, skip, replay, name prompt. `cs.tutorialDone` and `cs.tutorialV2Seen` are both set after the tutorial. Offline art: painting 202 KB, under the 600 KB title cap; the biggest file in `public` is 262 KB; no images in `src/`. |
| Spec coverage | 8 | Round 2 contract met: title first on a fresh profile, Climb runs the tutorial, then "Who is climbing?" with the name field focused and selected, then Bellfoot with the new name. Returning player (`cs.tutorialDone` only) sees "There's a new tutorial for the new Spire." and it disappears after Skip. Tutorial button replays, Skip works at step 1 and mid-script. Round 2 clarity fixes (Strut label and pulse, wrong-tap note, Run asleep until step 4, tray lines, Sprocket close) all seen working. |

Average: (7+8+7+7+8+8+8)/7 = 53/7 = 7.57.

## Does the front door read as the new game?
Yes. First screen is the painted tower with the new tagline, the first climb is a v2 tutorial against a "Tutorial Rig" with parts, and it lands in Bellfoot. The seam is the middle: after the tutorial the player lands on v1's bare "Choose a save" page ("Name your tinker to start your first climb") before the name dialog, which looks unlike everything around it.

## Blockers
None.

## Must-fix
None.

## Improvements (ranked, none blocking)
1. Give the slot screen the title's treatment (the painting dimmed behind, slot cards centered) or skip it for a brand-new profile: open the name dialog straight over the title and put the new save in slot 1. It is the one v1-looking screen left in the front door.
2. Use the painted Sprocket in the tutorial's closing card, and drop "(scrapped)" from the step 3 run label (or explain it); also fade the stage in from step 1 without the empty beat.
3. Add one sentence in the tutorial on Plating, or use the leftover Escapement in the closing ("the Escapement would have given Plating next turn"), so the first-time player knows what the unused card in hand was.

## What I tested
Vite dev server on 5391 in the clean checkout (stopped by PID 35316), in-app browser.
- 667x375 touch viewport, cleared localStorage and IndexedDB: painted title; Climb the Spire; steps 1 to 6 by real taps (Spur Gear, Spur Gear, wrong tap on the Plate then the Strut, Run, "Got it", tray Keep it, Done); Sprocket's closing; slot screen; name prompt typed "Mira", Enter; Bellfoot with name "Mira". Checked localStorage keys and scrollWidth.
- Returning player: removed `cs.tutorialV2Seen`, reloaded: banner shown inside the card, clear of the tower. Tutorial button, Skip at step 1: back to the title, banner gone.
- 1280x800: fresh profile, title DOM boxes (painting 1280x876, buttons at x 24 to 384), Climb opened the tutorial, step 1 layout fine. The browser screenshots at this size are cropped by the tool, so I judged layout from DOM boxes; I did not walk every desktop step or the name prompt (covered by the coordinator's e2e on both projects).
- Not tested: audio, offline reload, a returning player with a saved run, the practice-fight stash.
- Screenshots: `review/B10d/gate-shots/` (01 to 10).
