# B2 "The machine" review, round 2 (commit b088127)

Verdict: PASS

## Scores
- Fun 7: sandbox presets (Gear train, Spring loaded, Full steam, Clockwork tempo, Bells and statuses, Mixed) scaled by act let a player try synergies at once; still sandbox-only.
- Clarity 8: tutorial, preview line, intent chips, tooltips and glossary unchanged and passing; 48 px minimum enemy slots on phone.
- Depth 7: report now measures 46 of 46 parts, median defense impact 0.98, max 1.28, none above 2x; Clockmaker baseline recorded. Bot win rate is still 98.6% at combat level, so it cannot rank parts by wins.
- Feel 8: bosses are layered machines with idle motion, wind-ups, hit reactions, Clockmaker per-phase face with orbiting gears; boss hit, intro sting and phase gong sounds added.
- Look and sound 8: Clockmaker (open case with gears, glow) and Boilermaker Queen (steaming boiler with face) are clearly improved and cohesive with the brass palette at both sizes. Audio not heard, only present in code.
- Stability 9: `npm test` 39 passed, 1 skipped (phone perf spec); no console errors or warnings in title, sandbox picker and Clockmaker and Boilermaker fights at both sizes.
- Spec coverage 8: all due ids still covered by passing tests, plus new phone-size and preset specs; full 46-part catalog measured; Rewind is B3's.

Average: (7+8+7+8+8+9+8)/7 = 7.86, above 7.5.

## Blockers
None.

## Improvements (ranked)
1. Minor stale-tooltip bug: after starting a new sandbox fight through `practice()` while a tooltip was up, the phone screen showed a "The Clockmaker" tooltip over a Boilermaker fight and overlapped the Run area. Dismiss tooltips on fight start.
2. Depth: the bot wins nearly every fight, so impact is measured only in HP lost. A weaker or capped bot (or tighter enemy tuning) would make win-rate impact meaningful; B3/B4 should confirm Rewind penalizes one-trick builds against the baseline.
3. Hand size: sandbox hands still often leave one card on later turns, which limits per-turn choice; check the draw rules against the B3 run loop.

## What I tested
- `npm test` (PW_PORT=5362): 39 passed, 1 skipped, desktop and phone.
- Vite on 5363, stopped by PID. Playwright at 1280x800 and 667x375 (deviceScaleFactor 2): title, sandbox picker on phone, Clockmaker and Boilermaker fights over several turns with screenshots; console clean.
- Read the updated balance/2026-10-04-fights-1.md (verdict line, 46 parts, Clockmaker baseline). I did not re-hand-play every part family.
