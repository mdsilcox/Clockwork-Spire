# v2 curve, rounds 2 and 3 (B10c.3 and B10c.4): bench price and settle

Date: 2026-10-05. Seed 1 unless noted; Journeyman; code at the round 1 constants (`content/balance.ts`, D-047) plus Tool Belt 250 Brass (`content/upgrades.ts`, D-049). Data: `balance/data/v2curve-*-r3.json`.

| Target | Round 1 end | Final | Goal |
|---|---|---|---|
| BV1 expert, no meta, 300 runs (seeds 1, 2, 3) | 3.7, 1.3, 3.0% | 3.7, 1.3, 3.0% | at most 5% |
| BV1 greedy | 0.0% | 0.0% | at most 2% |
| BV2 expert careers (100, cap 30) median first win | 8 | **9** (q1 7, q3 11) | 8 to 12 |
| Expert careers never winning by run 30 | 0 | 0 of 100 | at most 5 |
| BV10 greedy careers median first win | 15 | **18** (q1 14, q3 22; 11 never win) | at most 20 |
| BV5 offer impact (3,000 runs) | n/a | median 0.98, max 1.07, none flagged | max at most 2x median |
| BV3, BV4, BV6, BV8, BV9, BV11 | green | green | green |
| Ladder (tests/sim/v2-ladder.test.ts) | green | green | green |
| Career e2e, fresh save, seed 1 | run 7 | run 13 | first win no earlier than run 5 |
| Unit suite | green | 831 passed, 3 skipped, 20 todo | green |

Round 2 tried one lever: Tool Belt 150 to 250 Brass moved BV2 from 8 to 9 and BV10 from 15 to 18. No other price changed. The warn floor is not needed.

Open (unchanged from round 1): Plating plan viability is unproven (the expert always plays burst; the turtle wins 0%); the +110% regular attack in acts 2 and 3 is a bot-calibrated number a human who does not break parts first will feel harder; the owner's playtest and B12 are the judge.
