# v2 curve, round 1 (B10c.2): attrition

Date: 2026-10-05. Constants in `src/core/content/balance.ts`, decisions and every sweep step in `DECISIONS.md` D-046 and D-047, content.md section 3.0 (constants table). Seeds 1 to 3, Journeyman, no meta, 300 runs each unless noted. Death data: `balance/data/v2curve-deaths-before.json` and `-after.json`; career data `v2curve-bv10-greedy-r1.json`, `v2curve-bv2-expert-r1.json`.

## Results

| Target | Before | After | Goal |
|---|---|---|---|
| BV1 expert, no meta | 14.7% (seed 1) | 3.7% (seed 1), 1.3% (seed 2), 3.0% (seed 3) | at most 5% |
| BV1 greedy | 0.0% | 0.0% | at most 2% |
| BV10 greedy careers median first win | 10 | 15 (q1 11, q3 21; 9 of 100 never win) | at most 15 after round 1 |
| BV2 expert careers median first win | 4 | 8 (q1 6, q3 11; 0 never win) | 8 to 12 (round 2) |
| Career e2e, seed 1, first win | run 8 | run 7 | at least run 5 |
| BV3, BV8, BV9, BV6, BV11 | green | green | green |
| BV4 expert medians Foreman, Queen, Clockmaker | 8, 10, 12 | 8, 9.5, 12 | 6 to 9, 7 to 10, 8 to 12 |
| BV4 won fights (expert / max-burst) Queen, Clockmaker | 45 / 40, 43 / 47 | 48 / 40, 47 / 46 | at least 30 |
| Ladder (tests/sim/v2-ladder.test.ts) | green | green | green |
| Rusher no meta | 3.7% | 1.0% | n/a |

## Deaths, expert no meta (300 runs)

| Killer | Before | After |
|---|---|---|
| act 1 Foreman (and one Brass Beetle after) | 7 (2.3%) | 10 (3.3%) |
| act 2 Boilermaker Queen | 120 (40.0%) | 77 (25.7%) |
| act 2 elites (Pressure Warden, Twin Pistons) | 8 (2.7%) | 67 (22.3%) |
| act 2 regulars | 16 (5.3%) | 77 (25.7%) |
| act 3 Clockmaker | 38 (12.7%) | 14 (4.7%) |
| act 3 Orrery, Echo Sprite and the rest | 67 (22.3%) | 44 (14.7%) |
| wins | 44 (14.7%) | 11 (3.7%) |

## What the constants are

Regular and elite attack percent 110 (act 1), 210 and 210 (acts 2 and 3); warden attack percent 100, 105, 115; regular core HP 100 everywhere (the expert breaks parts, not cores: +30% moved BV1 by under 1 point); oil rest 30 (25 was worth about 2 points but B10b's tests pin Journeyman at 30). The percents apply to climb combats only. Timings: BV1 expert 300 runs about 20 s on 20 workers; the BV4 bins take about 3 minutes single threaded.

## Open

- Regulars at +110% is a large number for a lever that exists to lower the expert's arrival HP; a human who does not break parts first will feel it far harder than the bot. The owner's playtest is the judge; BV10's greedy median at exactly the round-1 limit says casual play is near the edge.
- D-046: the `coreTookThisTurn` reset breaks BV4 and is not applied.
