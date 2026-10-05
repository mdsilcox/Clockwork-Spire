# B8 The climb, gate review round 1

Verdict: REVISE (narrow). No blockers and every metric at least 7, but the average is 7.43 against the 7.5 line.

## Scores
| Metric | Score | Evidence |
|---|---|---|
| Fun | 7 | The act is now a map you read against a clock: elite patrol with "next room" ring, locks, hidden rooms, a barter trader (hand over a part, price drops from 25 to 0), the bell with Prepared +1. This is clearly not a Slay the Spire node pick. But I spent 7 of 12 hours with 0 Scrap and no fight (oil, event, trader, dead-end walk), because the opening rooms give nothing to spend or fight. Early pacing feels slack. |
| Clarity | 8 | Side panel says "Hour 8 of 12, 4 hours left" and names the elite and its next room; tooltips on unknown rooms; lock dialog states key/pick/leave and why disabled; salvage reads "+19 Scrap" and "Scrapping the rest adds +3 Scrap"; bell explains Prepared and asks for confirmation; workbench says "Fusing needs two parts picked." Weaknesses: fight and workbench glyphs look alike at a glance; act 2 header still says "Floor 1 of 6"; confirm button for the bell is below the fold on the phone sidebar. |
| Depth | 7 | Real route choices (lock vs detour, rest vs push, trade parts vs Scrap, ring early or build). balance/2026-10-05-v2-climb.md: expert 15%, rusher 8%, grinder 1%; bell makes the rusher nearly as good as the expert (9%), hours and prices barely move results. Expert win rate is above the 5% target but is explicitly handed to B10 after B9 reworks the wardens; BV3, BV6, BV8 pass (act 1 normals 12.8/13.6%, elites 5x, turtle share at most 22%). |
| Feel | 7 | Painted Cog Rat, Brass Beetle and Spring Imp with part pips, per-part preview ("-5", "-3", "Run: -3"), chain label and run replay work at both sizes. Room entry has a tooltip/walker animation. Foreman is still the small code-drawn figure (B9 by plan). Combat on desktop uses about 60% of width for the grid with modest enemies. |
| Look and sound | 7 | Painted enemies are a big step up and read cleanly on the phone; map, room screens and Sprocket in the Workshop are cohesive. Foreman and act 2 and 3 enemies are still code shapes next to painted ones (planned). Lock dialog and trader are plain text on dark with no panel. I did not evaluate audio by ear (muted under webdriver). |
| Stability | 8 | npm run test:unit myself: 478 passed, 55 failed, all in the declared B9a files (b9-wardens 47, AR2 B9a 7 in b8-art, BV4 1); nothing else red. No console errors across a full session at both sizes; a reload mid-fight resumed correctly. Dev server stopped by PID. Minor: a stale mouse tooltip over a room blocked taps until I moved the pointer (hover artifact, touch likely fine). |
| Spec coverage | 8 | Roaming section, clock and hours, elites with patrol, locked passages and keys, workbench (upgrade, remove, fuse), trader with barter, oil (rest, polish), vault, bell and midnight/Prepared, Scrap economy, act 2 generation with two elites, painted act 1 cast all present and working. v1 fields (`map`, `floor`, `cogs`) still on RunState by design until gate merge cleanup. Lamplighter and warden frames belong to B9. |

Average: (7+8+7+7+7+8+8)/7 = 7.43.

The gap is closable in one small round (opening-hours pacing and the clarity fixes below); re-review after that.

## Blockers
None.

## Improvements (ranked)
1. Opening pacing: the first 6 hours gave 0 Scrap and no fight, so a new player burns half the clock on rooms they cannot use (trader and lock with 0 Scrap). Start with some Scrap from the Spare Scrap base (for example 20) or guarantee a fight or salvage adjacent to the entry, and mark unaffordable rooms. This is the biggest lever on Fun.
2. Clarity pass: distinct glyph for workbench vs fight; replace "Floor 1 of 6" in the act 2 and 3 header with the hour; make the bell's "Yes, ring it" visible without scrolling on 667x375; enlarge the fuse choice cards and remove the stray Back; lock icon on the map is 16x19 (tap target well under 40 px; the room tap works, so make the icon non-interactive or enlarge it).
3. Polish from the earlier browser check that remain: trader grid is one column on the left with the last row under the footer (667x375); oil station shows the old "Smooth and quiet" result when re-entered; stale tooltip stays over a room.

## What I tested
- npm run test:unit (full log read; failures all in B9a files). Did not rerun e2e, offline, career; trusted the stated green.
- Vite on 5380 at 667x375 and 1280x800 (stopped by PID 33652): new save, Workshop with Sprocket, Climb; oil (Polish), Hour Ghost event, trader barter and buy, locked passage dialog, walk, fight with painted Cog Rat (place, preview, run), salvage, workbench (fuse), bell with confirm and Prepared (3 placements), Foreman intro and fight, boss spoils and trinket, act 2 section (two elites), act 1 painted fight at desktop, reload mid-fight resume.
- Not exercised by hand: vault, midnight forced, trader with enough Scrap on both parts, third act.
