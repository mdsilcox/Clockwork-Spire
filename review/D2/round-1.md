# D2 Design, review round 1

**Verdict: PASS** (no blockers; Clarity 8, Depth 7, Spec coverage 8; average 7.67)

| Metric | Score | Evidence |
|---|---|---|
| Clarity | 8 | Rules are deterministic and previewable (BFS tick order fixed, no in-turn randomness, 1.6); the acceptance numbers I hand-checked (M1 9, M3 13, M4 15, M5 16, M9 18, M10 7 then 14, M8, walkthrough brass 4x12+10=58) all follow from the rules. Dented by the id collision (balance criteria B1-B5 vs build phases B1-B6) and by stray "? No:" self-corrections in the data-model walkthrough. |
| Depth (of the design) | 7 | Real axes each turn: 3-card hand vs 2 placements, replace vs empty cell, routing around Rust/Magnetize, spring timing, Pressure risk (overpressure at 20), 3 chassis, Clockmaker Rewind forcing 2-3 engines. But Metronome (Strike 2 x tick = 12/turn) and Anchor (Plate 2 x tick = 12) strictly beat Spur (9) and Escapement (9) at the same rarity and placement cost, and no acceptance test targets "no always-right pick" except the sim ratio. |
| Spec coverage | 8 | Every content minimum is met and counted correctly: 46 parts in 6 families (8+7+7+8+9+7), 15 regular / 6 elite / 3 boss, 22 events (3 Sprocket), 28 trinkets, 3 chassis (bins sum to 8 each), Sprocket Wheel part plus Collar Tag trinket, Clockmaker 3 phases with Rewind. Spec sections 1-6 each map to criteria and a phase. Gaps: no criterion for the Sprocket part/trinket, the 60 fps goal, or the README / full-win "done means" items (only roadmap prose in B6). |

## Blockers
None.

## Improvements (ranked)
1. **Fix the dominated commons and make "no dominant strategy" testable.** Spur and Escapement lose to Metronome and Anchor on every board. Give Metronome/Anchor a real cost or make the starter parts good in a different way (e.g. Spur Strike 3 plus Boost-friendly, Metronome holds on tick 1), and add a design-level check (a U test or B4 sub-criterion) that no common is strictly dominated. Also the win-rate-impact metric (rules 7, spec 5) is confounded: rare parts arrive by beating bosses, so runs holding them win far more often by survivorship, and the 2x-median target may be unreachable for rares. Define it per meta band and per act reached, or by forced-offer experiments, before B4.
2. **Specify the missing economy and encounter tables.** There are no shop prices (parts by rarity, trinkets, removal, oil), no part sell values, no encounter pools or group compositions per act/floor (which fights, which elite/boss appears where, how rarity shifts by act), and no Cog totals to balance against. Builders in B3 will have to guess. Also fix the stale "about 16 of the 44 parts" in rules 5.2 (content says 46 and 17 locked).
3. **Tidy ids and close the small coverage gaps.** Rename the balance criteria (S1-S5) so they do not collide with phases B1-B6; add criteria for the Sprocket part/trinket (e.g. R6b: sprocket-wheel and sprocket-tag exist and work), the 60 fps/perf target, and the README / scripted-victory done-means item. Clarify that C4 (B2) cannot test Clockmaker phase/Rewind behavior that lands in B3, and say how careers that never win within the 30-run cap count in B3.

## What I checked
Read SPEC.md and Appendix A, then rules.md, content.md, data-model.md, acceptance.md, roadmap.md in full. Counted every content table against the spec minimums (parts per family, locked count 17, trinkets by rarity, events, enemies by tier). Hand-computed acceptance rows M1, M3, M4, M5, M8, M9, M10, the Coil+Spur release, bin sizes for all chassis, the walkthrough's damage/Plating/HP and brass figures, and compared Spur/Metronome and Escapement/Anchor values. Cross-checked spec sections 1-6 to criteria ids and roadmap phases, and grepped for shop prices and encounter tables (absent). Did not run the game (discovery phase).
