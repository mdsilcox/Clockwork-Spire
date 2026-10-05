# v2 curve baseline (B10c.0, measurement only)

Date: 2026-10-05. No content number changed. Journeyman at Overwind 0, no tuning. Code: `src/sim/strat/curve.ts` (library), `curvecli.ts` (CLI), `tests/sim/v2-curve.test.ts` (`npm run test:curve`, about 11 minutes on 20 worker threads, excluded from `test:unit`). Raw per-career data: `balance/data/v2curve-*.json`. Every task is deterministic, so the numbers do not depend on the pool size.

## 1. What changed in the bots (frozen for B10c)

- **Greedy route** (`decide.ts`, policy `greedy`): routes like the expert, same combat; takes the highest-rarity part or trinket in every offer (salvage tray, reward, trader paid in Scrap only, the Queen's pick), never refuses an offer, never rests at oil.
- **Drafter** (`runbot.ts value`): Free Pawl is worth +1 with 4 or more Springs in the bin, +0.2 with 2 to 3, -1 with fewer; Cascade Piston is worth +1 with 2 or more Boiler-family parts, 0 with one, -1.2 with none (it never got taken in 900 runs because Strike 3 without Pressure fell under the take bar). Night Watchman keeps 3.2.
- **Combat** (`v2combat.ts ran2`): a powered Night Watchman now fires inside every preview (`beforeEnemyTurn`, as `runTurn` does), so the expert's placement scoring counts its Strike instead of only the finalists' lookahead seeing it. Checked: it fires on 147 of 214 turns of fights that held it.
- **Evidence that this is not a verdict on the items** (rarity pool, expert, 900 runs): overall win 12.6% before, 12.4% after. Night Watchman held-runs still win about 6% (act 3 runs 14% against about 28% for all act 3 runs) even when its drafting value is cut by 2 (40 holders instead of 90, 7.5%), and Free Pawl is as flat. The old "the bot misuses them" reading is mostly selection (the Watchman comes from an act 1 vault; the runs that take it are not the runs that win). I did not find a drafting value that moves BV1.
- **Turn cap** (`drive.ts playCombat`): a fight that hits the 60-turn cap is now played on for three rounds before the run is abandoned, exactly as the in-game autoplay does. The old `break` gave up a stall that resolves after about 160 turns. It moves the expert's no-meta rate from 13.3% to 14.7% (300 runs). BV3, BV4, BV6, BV8, BV11 re-run green; the whole unit suite is green (830 tests).

## 2. Autoplay against the simulator

The in-game autoplay (`src/app/autoplay.ts` through the real controller in a headless browser, `src/sim/strat/autoplay-compare.mjs`) plays the same policy as the simulator: same `decide` routes, same expert combat, same seeds. On 60 careers (base seeds 10007 to 10066) the autoplay's first-win run equals `careersV2`'s in 60 of 60, run by run. Before the turn-cap fix it was 58 of 60: careers 3 and 13 differed because the sim abandoned a Clockmaker stall (hand empty, 6 HP, 160 turns) that the browser played through to a win.

The difference the critic saw is not a bug. The 9 to 18% figure is a **no-meta** win rate; the autoplay plays a **career** (bench upgrades, the three chassis in rotation, achievement unlocks). The same careers in the sim:

| Seeds | Sim `careersV2` first win | In-game autoplay first win |
|---|---|---|
| base 10007 to 10012 | 4, 3, 3, 4, 2, 2 | 4, 3, 3, 4, 2, 2 |
| base 1 (the career e2e's default seed) | run 8 | run 8 |
| 60 careers, median | 3 | 3 |

(Win rate of run 1 of 100 expert careers: 21%; of run 2: 14%; run 3: 22%; run 4: 28%; run 5: 32%.)

## 3. Baselines (seed 1)

| Target | Measured | Target | State |
|---|---|---|---|
| BV1 expert, no meta, 300 runs | **14.7%** (44 wins); reach act 2 97.7%, act 3 49.7%; mean act 2.47 | under 5% | red |
| BV1 greedy, no meta, 300 runs | 0.0%; reach act 2 87.7%, act 3 13.0% | under 2% | green |
| BV2 expert careers, 100, cap 30 | **median first win 4** (q1 2, q3 6, range 1 to 9), never won 0 | 8 to 12 | red |
| BV10 greedy careers, 100, cap 30 | median first win 10 (q1 7, q3 12, max 19), never won 0 | at most 20 | green |
| BV5 offer-based impact, 100 expert careers played on after the first win (3000 runs, 30 offers a side) | median 1.00, max 1.05 (torsion), 46 of 70 parts measured, none flagged | max at most 2x median | green, uninformative |
| Plating viability, 600 runs each | Plating parts in the final bin 3.71 (base) against 7.11 (bias 4); act 2 reached 97.2% against 97.5% (99.7% of base); act 3 45.3% against 47.0% (96%) | at least 60% and 50% | green |

Masterworks unlocked by the first win (median over winners): expert careers 2 parts and 2 trinkets; greedy careers 4 parts and 3 trinkets (greedy needs more runs, so it earns more achievements first).

Other policies, no meta, 300 runs: rusher 3.7%, grinder 0.0%, plater (Plating bias with turtle combat) 0.0% (reaches act 2 in 6.3%). With every achievement earned (rarity pool): expert 11.3% (seed 1), 12.4% over seeds 1 to 3 (900 runs).

Notes on the checks. The Plating-heavy expert plays the expert's combat, so its main plan stays burst (98%) and the bias only changes what it drafts; the bias saturates at about 7.1 Plating parts (biases 4, 8 and 14 give the same bins). The test therefore also asserts the bins hold at least 1.5x the Plating parts of the base, otherwise the reach check would be vacuous. A pure Plating plan (the turtle) still wins 0%. BV5 is flat because an offer barely changes a run next to the meta: all parts sit at 0.88 to 1.05.

## 4. Where the power comes from (lever probes)

Expert, tinker unless noted, 300 runs, seed 1, no meta except the probe:

| Probe | Win rate | Reach act 3 |
|---|---|---|
| nothing (base) | 14.7% | 49.7% |
| Reinforced Frame level 1 (+5 max HP, 40 Brass) | 20.0% | 58.3% |
| Reinforced Frame level 5 (+25 max HP, 400 Brass) | 42.3% | 83.0% |
| Tool Belt (hand size 4, 150 Brass) | **33.0%** | 64.0% |
| Second Wind (200 Brass) | **28.3%** | 70.0% |
| Oiled Bearings 3 (280 Brass) | 18.7% | 55.7% |
| Spare Scrap 3 (150 Brass) | 16.3% | 54.3% |
| Inventor's Notes 2 (240 Brass) | 16.0% | 47.7% |
| Lucky Charm (120 Brass) | 16.3% | 51.0% |
| the whole sensible path (1,540 Brass) | 78.0% | 99.7% |
| chassis Stoker / Scrapper / Horologist | 12.0% / 20.3% / 23.0% | 41.3% / 52.3% / 73.3% |
| every achievement earned | 11.3% | 41.3% |
| Clockmaker memory "burst" | 13.3% | 49.7% |

Brass spent before run n in the expert careers (mean): run 2: 77, run 3: 130, run 4: 269, run 5: 347, run 6: 451, run 7: 581. The median career wins in run 4, right after the 150-Brass Tool Belt lands (40 + 30 + 50 + 150 = 270 on the path), and with the Stoker, Horologist and Scrapper chassis arriving on runs 2 to 4.

## 5. My read: which levers move which target

- **BV1 (14.7% to under 5%)**: attrition is the dominant axis. Act 2 ends 48% of no-meta runs (144 of 300) and act 3 another 35% (105); only 7 die in act 1. HP is worth the most: +5 max HP is +5 points, +25 is +28. Cutting the arrival HP at act 2 and act 3 (D-044: normal and elite attrition, the Oil rest value, Second Wind-like windows) or the Clockmaker and Queen HP and damage is what moves it; Plating bypass changes nothing here because the expert is a burst plan (all 300 runs) and the greedy is already at 0%. Part numbers help only on the burst parts' output (Strike amounts) and the warden core HP. Expect to need about 10 points off, so roughly the effect of 10 max HP or one hand slot.
- **BV2 (median 4 to 8 to 12)**: it follows BV1 and the bench. Today's early meta is strong and cheap: Tool Belt (+18 points for 150 Brass) and Second Wind (+14 for 200) outweigh the six other upgrades together, and three chassis lift a no-meta run by 8 and 6 points. Moving the first win from run 4 to 8 to 12 needs the same ramp to take about twice the Brass: raise the cost of Tool Belt and Second Wind (or move them behind Frame levels), shrink the Frame step (the cheapest point per Brass), and keep the no-meta rate from BV1 low so run 1 to 3 rarely win (they win 21%, 14%, 22% today). The sensible path as the sim buys it (frame, scrap, bearings, toolbelt, notes, secondwind, charm, then frame levels) is the thing to re-order.
- **BV10 (greedy, median 10, limit 20)**: it has a factor 2 of slack today. It will move with BV2's levers (the same upgrades) and with attrition: do not let BV1's cut push the greedy past about 15 before round end.
- **BV5**: flat at 1.0; it should stay green through the retune. If the cut makes runs end earlier, offers per part fall; keep 30 offers a side by playing at least 3,000 runs.
- **Plating viability**: green for a structural reason (the expert always plays burst); the check only fails if a lever stops Plating parts from reaching act 2 or act 3 at all. A real Plating plan needs a combat bot that wants Plating (the turtle wins 0%, reaching act 2 in 6%), which is a separate decision from B10c's levers.
- **Order of checks** (B10b round 2): BV1 and the fight targets after every change (about 25 seconds for BV1); BV2 and BV10 at a round's end (about 40 and 100 seconds); BV5 once (about 7 minutes).

## 6. Timings (20 worker threads)

300 expert climbs 23 s; 300 greedy climbs 16 s; 100 expert careers 42 s (388 runs); 100 greedy careers 100 s (937 runs); 100 keep-going careers 428 s (3,000 runs); 600 climbs 45 s. `npm run test:curve` whole: 666 s. Single thread: about 0.6 s a run.

## 7. Not verified here

The 13.3% to 18.0% gap between this run's base (before the turn-cap fix) and the B9b report's 18.0% for the same seed was not traced; B10b.0 touched `difficulty.ts` hooks only (Journeyman at Overwind 0 is meant to be identical). The Night Watchman, Free Pawl and Cascade Piston values were set by reasoning from the card text and checked only for no regression, not tuned against a held-out win rate.
