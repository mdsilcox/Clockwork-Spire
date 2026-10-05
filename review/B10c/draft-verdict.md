# Draft verdict: B10c The curve

Reviewer: critic, in place of the owner's draft approval (D-035). Read: docs/briefs/B10c-curve.md (7b3494f), balance/2026-10-05-v2-curve-baseline.md, docs/briefs/B10b-curve.md "Round 2" (the warn floor, check order, `coreTookThisTurn` step), rules 5.8 and 7.4, acceptance BV1 to BV10. The game was not run and no sim was rerun; I judged the plan against the baseline's numbers.

## Verdict: PASS (borderline), with 3 must-fix edits

| Metric | Score | Evidence |
|---|---|---|
| Plan quality | 8 | One sequential lane (right: each round's numbers decide the next; the levers all touch the same few files), a measured baseline, a cheap-first check order, one round per agent session with numbers reported before the next, heavy sims run alone, each round logged (D-046 onward) with content.md updated in the same commit. |
| Spec fit | 8 | Targets and levers match rules 5.8 and 7.4 (BV1 under 5% and greedy under 2%, BV2 8 to 12, BV10 at most 20, BV5 at most 2x). The levers follow the data: attrition in acts 2 and 3 for BV1 (act 2 ends 48% of no-meta runs, act 3 35%, act 1 2%) and the bench for BV2 (Tool Belt +18 points and Second Wind +14 outweigh the other six upgrades together). |
| Risk handling | 7 | Smallest-step discipline, the warn floor and a stay-open rule. Gaps: the floor does not constrain BV2, greedy's BV10 slack can be spent by the price rise, the killers behind the act 2 and 3 deaths are not broken out, and the career e2e could lose its seed-1 win. |
| Testability | 7 | Every target has a sim test behind `test:curve`; BV1 takes about 25 s so iteration is cheap; BV2, BV10 and BV5 run at a round's end. BV5 is flat at 1.0 and can only guard against regressions (the baseline says so). |

Average 7.5. No blockers. The pass rule (no blockers, each at least 7, average at least 7.5) is met exactly. Apply M1 to M3.

## Can the levers in this order plausibly reach BV1 and BV2?
- **BV1 (14.7% to under 5%).** About 10 points are needed. The probes say 1 max HP is worth about 1.1 points of win rate, so a cut worth roughly 9 to 10 HP over acts 2 and 3 does it. Two or three steps of +10% attack amounts in acts 2 and 3 plausibly cost an expert 4 to 5 HP per act, which is about that size; the oil rest cut to 25% adds a few more. The first three levers are the right ones and the baseline's reading (HP and attrition, not Plating bypass) is supported by the probes. Risk: win rate is steep near the Queen (arrival HP 0.57 of max already gives the expert 45% against her, D-044), so a step can overshoot; the brief's "smallest step first, check after each change" handles this.
- **BV2 (median run 4 to 8 to 12).** The ramp needs about twice the Brass. Raising Tool Belt to about 350 and Second Wind to about 400, and the Frame ladder to 40, 70, 110, 160, 220 (about 600 against 400 for five levels) roughly doubles the cost of the three biggest levers, and the attrition cut lowers every probe's win rate by the same few points. A median near 8 is plausible after one economy round; 10 to 12 may take a second pass inside the three rounds. The chassis (Stoker, Horologist, Scrapper lift a no-meta run by 8, 6 and 9 points and "arrive on runs 2 to 4") are a bench-like lever that is not in the list.
- **Collateral.** BV9 (Pierce and Siphon share of damage) holds if Attack, Pierce and Siphon payloads scale uniformly. BV8 (turtle absorbs at most 40% of enemy turns) only gets easier with more damage. BV3 (turtle and burst bots lose at least 1.5x the expert's HP) can erode if the expert's HP loss rises faster than theirs: it is in the per-change fast set, which is right. BV4 (warden medians over won fights) changes only with the Governor step and arrival HP; D-044 covers the metric. The ladder (non-increasing win rate, strictly decreasing mean act) is re-run in round 3.

## Plating viability: is the honest handling acceptable?
Yes for this phase. The baseline shows the check passes for a structural reason (the expert always plays burst, the Plating bias only changes drafting and saturates at about 7 Plating parts, the turtle wins 0%), and the brief records the real gap as a known open design issue for the owner's playtest and B12 rather than presenting the green check as proof that "no plan is dead" (D-029). That is the right call: making Plating winnable needs a Plating-wanting combat bot and probably rule changes, which is not a curve retune. One condition: the attrition lever scales Pierce and Siphon payloads together with Attack, which are the very hits Plating cannot absorb, so round 1 makes the gap slightly worse; the gate's verdict and PROGRESS must restate the gap and the new numbers (reach rates after the retune), and the reach-rate test must stay in `test:curve`.

## Is one lane right?
Yes. Rounds are sequential, each depends on the last round's numbers, and all levers share `enemies.ts`, `content/upgrades.ts`, `meta.ts`, `rooms.ts` constants, the sim's sensible path and content.md. Splitting would reintroduce the merge risk B10b removed. The orchestrator reading the numbers between rounds is the right control.

## Must-fix
M1. **The warn floor does not constrain BV2.** "The career e2e's first win is no earlier than run 5" is already true (seed 1 wins in run 8), and the expert's 100-career median is 4 today. A gate could close on a `warn` with BV2 unchanged. Add to the floor: BV2's median first win at least 6 (that is, the retune must have moved it by 2), BV10's median at most 20, and "never won by run 30" at most 5 of 100 careers.

M2. **BV10 has no guard in the brief.** Greedy's median is 10 with a 2x margin to 20; raising prices and attrition both push it. The baseline recommends keeping it under about 15 at the end of round 1; the brief only says "BV1 unchanged" for round 2. Write the guard in: after round 1 greedy median at most 15 (BV10 is measured at the end of each round), after round 2 at most 20.

M3. **Find who is killing the expert before choosing the first lever.** The baseline gives deaths by act (act 2: 144 of 300, act 3: 105) but not by enemy tier or warden. The Queen alone may account for most act 2 deaths (D-044: 45% win against her at the current arrival HP), in which case a +10% normal and elite damage step is a blunt tool and warden numbers (barred except for BV4) or the oil rest would be the lever. Add a round 1 step 0: a report of expert deaths by act and killer (normals, elites, each warden) from the 300 no-meta runs (a minute of compute), and pick the first lever from it; state in the round's log which killer each change targets.

## Should-fix
- **Add chassis prices (or their unlock effects) to the round 2 levers**; they are as strong as the cheaper upgrades and arrive on runs 2 to 4.
- **Career e2e tail.** The e2e needs a first win within 30 runs on the default seed; BV2's retune will push seed 1 later than run 8 and possibly past 30. State the check after round 2 (run the e2e) and, if seed 1 no longer wins in time, pick its seed by a rule fixed in advance (the first seed in a list whose first win is between 8 and 15), never by fishing for a win after the fact.
- **Where the +10% lives.** Editing every act 2 and 3 enemy row by hand is error-prone and hard to roll back; apply the factor through one per-act constant in `content/balance.ts` (recorded in content.md 3.0 and the changed table), and make sure BV9's from-the-defs computation and the bestiary and tooltips read the same numbers.
- **Round 0 (`coreTookThisTurn`)**: confirm the reset changes no WP1 or WP8 expectation (B7 tests), and that moving the Governor cap back to 14 is not taken if the Clockmaker's BV4 median leaves 8 to 12; say which of the two wins when BV4 is borderline (BV4 wins: the cap stays).
- **BV5** is flat (1.00 median, 1.05 max, 46 of 70 parts measured): report it, and say it is a regression guard only. Do not spend a tuning round on it.
- **Mode check in round 3** ("Apprentice wins clearly more than Journeyman") duplicates the ladder; keep one.

## What was tested
Documents read only: the brief, the baseline, B10b round 2 and the targets. No `npm test`, no sim and no browser.

## Resubmit
Not required: apply M1 to M3 in the brief and the round plan, then start round 0.
