# B6 "Hardening and release" review, round 1 (FINAL)

Verdict: PASS (no blockers, every metric at least 7, average 8.00; the final phase needs 8.0)

Commit 94a1a4b (cs-review-B6).

## Scores
| Metric | Score | Evidence |
|---|---|---|
| Fun | 8 | Machine chains read well (Chain x6 and x12 counters, +3 pops); the real UI autoplay reached the Clockmaker and victory in 18 runs, and the Workshop pays out visibly after each run. |
| Clarity | 8 | First launch coach (1/8 with a glowing target cell), How to play with a numbered 5x3 diagram, preview badges, a Clockmaker intro card ("He remembers your last turn"), and a toast "The Clockmaker rewinds your Escapement." make the boss rule legible. |
| Depth | 8 | Careers report: median first win run 9 (quartiles 7 to 12), no-meta win 1.0%, win rate rising with Brass (0% to 19.8%), part impact 0.9 to 1.17; run reports show 3 acts reached. All BS targets pass in `npm test`. |
| Feel | 8 | Pulses travel along the drive shafts, numbers pop, Plating and momentum update per tick; the Rewind plays at 1x with a visible reversal; the endings, boss intro and Sprocket confetti on the first win land well. |
| Look and sound | 8 | Cohesive brass-and-brown look at both sizes; Sprocket reads unmistakably as a corgi (idle, sleepy with Zs, celebrate, happy). Sound: I ran `?sound=1` with no audio errors, but I could not hear anything, so music and effects quality is unjudged. |
| Stability | 8 | `npm test` exit 0: 300 unit, 142 e2e (desktop and phone), 2 offline, 1 career (autoplay from a fresh save to a victory). Console error log was empty throughout every flow at 1280x800, 667x375 and 375x667; no sideways scroll on any screen I checked. |
| Spec coverage | 8 | Sections 1 to 5 all present and working (slots, tutorial, three chassis incl. Stoker unlock, shop/forge/oil/events, three bosses with Rewind, Sprocket in Workshop, events and ending with credits, settings, history, offline PWA, simulator reports). Small gaps in housekeeping noted below. |

Average: (8+8+8+8+8+8+8)/7 = 8.00, which meets the final threshold of 8.

## Blockers
None.

## Improvements (ranked)
1. Housekeeping the spec's "Done means" and the roadmap name: `REPORT.md` is listed in README and the B6 roadmap but does not exist in the tree; PROGRESS.md "Now" and "Next" still read as B6 in progress (no B6 or release entry in Done); DECISIONS.md has no B5 or B6 entries after D-020. Add or remove them so the documents match the release.
2. Autoplay from a fresh save takes 18 runs to first win (seed 1), versus the spec's typical 8 to 12 and the careers median of 9. The bot is not a competent player, so this is not a defect, but a second seed in the career e2e or a note in the README would show the curve is not seed luck.
3. Phone, Workshop History tab: the run row's date ("today") is cut at the bottom of the visible list and the stats tiles take most of the 375 px height, so the list needs a scroll to show even one row; shrink the stat tiles on short screens.

## What I tested
- `npm test` with PW_PORT=5362: all green (unit 300, e2e 142, offline 2, career 1).
- Vite dev server on port 5363 with `?sound=1` (stopped by PID afterwards). Playwright at 1280x800 and 667x375 touch, deviceScaleFactor 2, plus 375x667 portrait.
- First launch tutorial played through the real UI to the result and title; save slots, a named slot into the Workshop; Workshop with Sprocket idle and sleepy (via `cheat.idle`), celebrate and happy greetings after a win and a loss, notes on the wall, bench, chassis tab and History tab; Sprocket pet not exercised by click.
- A real run by hand: map (legend, nodes), fight with placements and preview badges, reward screen; shop, forge, oil and event screens (including a Sprocket-free event) at both sizes via `cheat.gotoFloor`; boss intro and the Clockmaker fight at 1x with the Rewind message and chain counters.
- `autoplay({maxRuns:40, speed:'skip'})` from a fresh profile: won on run 18 in about 4 seconds; victory scene, credits (Sprocket in the credits), result screen with Brass breakdown, return to the Workshop with the first-victory note.
- Settings, How to play, Glossary, portrait card ("Turn your phone sideways").
- Balance reports read: fights (98.6% bot win, part impact max 1.28 vs median 0.98), runs (1.0% no-meta win), careers (median run 9).
- Not tested: audio quality, a real device install of the PWA, gamepad, long-press tooltips by hand on a physical phone.
