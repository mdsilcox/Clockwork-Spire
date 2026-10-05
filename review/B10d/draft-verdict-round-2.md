# Draft verdict, round 2: B10d The front door

Reviewer: critic, in place of the owner's draft approval (D-035). Read: docs/briefs/B10d-front-door.md at 5c35901 ("Round 2" section), review/B10d/draft-verdict.md, and re-checked `Slots.tsx` ("Who is climbing?" exists) and the boot branch in `controller.ts`. The game was not run.

## Verdict: PASS, with 2 small must-fix lines

| Metric | Score | Evidence |
|---|---|---|
| Plan quality | 8 | Interfaces frozen in the contract (`startTutorial()`, `tutorialDone()`, the test ids, the first-launch block); each lane owns its files; parallel-safe with B10c. |
| Spec fit | 8 | AR3 is met (painted title, animated steam and lamps, tower never covered, existing controls around the same ids); the first-launch order now shows the title first, then the tutorial on the first climb, then the existing name prompt, then Bellfoot. |
| Risk handling | 7 | The five-place `cs.tutorialDone` key, the `tutorial-automaton` fixture and the `summonOnly` `tutorial-rig` are handled; the salvage step has a no-writes test; the WebP total and loading behavior are specified. Remaining: the v1-done banner logic and its effect on the other specs. |
| Testability | 8 | `tutorial.spec.ts` coverage is listed, a box-intersection test makes "tower not covered" mechanical at both sizes, the script is fixed (seed, forced hands, rig parts), the tray and the fabricated pending are tested. |

Average 7.75. No blockers. Pass rule (no blockers, each at least 7, average at least 7.5) is met.

## Round-1 findings, checked
M1 (ids and the slot screen kept), M2 (`tutorial-automaton` kept), M3 (`tutorial-rig`, `summonOnly`, excluded from EM1, EA11, BV9 share, B10c's hooks, the bestiary), M4 (key kept, a banner for v1-done profiles), M5 (title first; the name prompt exists, `Slots.tsx` "Who is climbing?"), M6 (fabricated tray, no writes), M7 (600 KB total with layers, text title until decode, precache, art-reviewer pass): all resolved.

## Must-fix
M1. **The banner needs a defined trigger.** The v2 tutorial sets the same key `cs.tutorialDone`, so "finished v1's tutorial" and "finished v2's tutorial" look the same. Say that completing or skipping the v2 tutorial also sets `cs.tutorialV2Seen`, and that the banner shows only when `cs.tutorialDone` is set and `cs.tutorialV2Seen` is not. Add the unit or e2e case: a profile that finishes the v2 tutorial never sees the banner.

M2. **The banner must not disturb the 21 specs that set only `cs.tutorialDone`.** With the helper unchanged, the banner appears on the title in all of them. Require that it is a non-interactive line inside the title card, outside the button group and the tower box, and test at 667x375 and 1280x800 (no overlap with any button, no sideways scroll). Also state the boot change: `boot` currently starts the tutorial when `tutorialDone()` is false; that branch becomes "show the title" (the tutorial now starts from `climb`), and the 21 specs keep working because they set the key.

## Should-fix
- Give the rig's numbers so the script is deterministic and teachable: the Strut's HP must be breakable in one Run with the forced hand (so "break a part to cancel its intent" always lands), and the Plate must not be a keystone. Keep v1's `gentle` safeguard (the tutorial never knocks the player out) or say why it goes.
- Decide whether tapping `tutorial` on the title while a practice fight is in progress still stashes and restores it (as `startTutorial` does today); one test.
- The title's text fallback and the painted title must share the same button DOM so ids and focus order are identical before and after decode; test it by delaying the image.
- Record the AR3 [C] verdict path (art-reviewer on the steam and lamp extremes) in `review/B10d/`.

## What was tested
Documents read and `Slots.tsx` and the boot branch checked; no `npm test`, no browser.
