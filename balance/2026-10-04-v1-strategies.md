# v1 strategy report (seed 1)

Date: 2026-10-04

## What this measures

v1 rules (docs/rules.md, unchanged) played by four combat bots: greedy (the shipped v1 bot), turtle (Plating first until it covers the shown incoming, then damage), burst (damage first) and expert (beam search over placements, swaps and targets, then a one-turn lookahead through the real enemy turn with a hidden draw pile). The owner won v1 on the fourth run with a Plating stack plus burst line; this report asks how much of that the v1 bot under-measures, to ground the v2 design and its balance targets.

Run decisions: "v1" uses the shipped run bot (20% exploration). "Expert drafting" commits by act 1 floor 4 to one package (spring, steam or cam) around a Plating engine and the top damage parts, skips weak picks, removes weak parts at shops and forges, and paths for elites when HP is above 65%. Careers use the same seeds and the same Brass path as v1 careers (balance/2026-10-04-careers-1.md).

Bins for the fight section are snapshots of what an expert run actually held on arrival at each fight (careers and no-meta runs pooled). Each fight is replayed 3 times with different shuffles by all four bots, from the snapshot's HP, trinkets, hand size and chassis. Second Wind is off in replays.

| Act | Tier | Snapshots available | Bins used |
|---|---|---|---|
| 1 | normal | 941 | 40 |
| 1 | elite | 524 | 40 |
| 1 | boss | 475 | 40 |
| 2 | normal | 594 | 40 |
| 2 | elite | 342 | 40 |
| 2 | boss | 292 | 40 |
| 3 | normal | 396 | 40 |
| 3 | elite | 233 | 40 |
| 3 | boss | 216 | 40 |

## Flags

- turtle on act 1 normal fights loses only 7.3% of max HP on average (3.7 HP, win 98%).
- turtle on act 3 normal fights loses only 5.8% of max HP on average (4.0 HP, win 96%).

## Fights by act and tier

| Act | Tier | Bins | Bot | Win rate | HP lost, mean (% of max) | p10 | p90 | Turns |
|---|---|---|---|---|---|---|---|---|
| 1 | normal | 36 | greedy (v1) | 98% | 5.8 (11%) | 0.0 | 12.0 | 2.6 |
| 1 | normal | 36 | turtle | 98% | 3.7 (7%) | 0.0 | 10.0 | 2.9 |
| 1 | normal | 36 | burst | 97% | 7.5 (15%) | 0.0 | 13.0 | 2.5 |
| 1 | normal | 36 | expert | 98% | 3.8 (7%) | 0.0 | 10.2 | 2.8 |
| 1 | elite | 40 | greedy (v1) | 73% | 24.4 (47%) | 7.0 | 36.0 | 3.7 |
| 1 | elite | 40 | turtle | 77% | 22.1 (43%) | 5.7 | 36.0 | 4.2 |
| 1 | elite | 40 | burst | 57% | 30.3 (58%) | 14.8 | 43.0 | 3.1 |
| 1 | elite | 40 | expert | 79% | 20.0 (39%) | 3.0 | 34.0 | 4.0 |
| 1 | boss | 40 | greedy (v1) | 93% | 17.6 (33%) | 2.9 | 31.1 | 6.5 |
| 1 | boss | 40 | turtle | 97% | 12.6 (24%) | 0.0 | 26.0 | 7.0 |
| 1 | boss | 40 | burst | 53% | 29.4 (56%) | 12.0 | 43.0 | 5.6 |
| 1 | boss | 40 | expert | 98% | 9.7 (18%) | 0.0 | 23.1 | 6.6 |
| 2 | normal | 40 | greedy (v1) | 86% | 7.5 (14%) | 0.0 | 22.0 | 2.7 |
| 2 | normal | 40 | turtle | 88% | 6.3 (12%) | 0.0 | 19.0 | 3.0 |
| 2 | normal | 40 | burst | 77% | 11.8 (22%) | 0.0 | 26.0 | 2.5 |
| 2 | normal | 40 | expert | 89% | 6.0 (11%) | 0.0 | 19.0 | 2.8 |
| 2 | elite | 40 | greedy (v1) | 69% | 16.3 (28%) | 0.0 | 39.0 | 4.0 |
| 2 | elite | 40 | turtle | 73% | 14.6 (24%) | 0.0 | 39.0 | 4.3 |
| 2 | elite | 40 | burst | 54% | 23.6 (40%) | 0.0 | 47.3 | 3.2 |
| 2 | elite | 40 | expert | 79% | 13.5 (23%) | 0.0 | 38.1 | 4.5 |
| 2 | boss | 40 | greedy (v1) | 89% | 13.5 (23%) | 0.0 | 28.0 | 5.5 |
| 2 | boss | 40 | turtle | 95% | 9.4 (16%) | 0.0 | 22.0 | 5.9 |
| 2 | boss | 40 | burst | 60% | 30.2 (51%) | 13.0 | 48.1 | 4.9 |
| 2 | boss | 40 | expert | 95% | 9.5 (16%) | 0.0 | 22.0 | 5.6 |
| 3 | normal | 40 | greedy (v1) | 95% | 5.5 (8%) | 0.0 | 14.1 | 3.1 |
| 3 | normal | 40 | turtle | 96% | 4.0 (6%) | 0.0 | 12.0 | 3.4 |
| 3 | normal | 40 | burst | 89% | 12.0 (17%) | 0.0 | 24.0 | 2.9 |
| 3 | normal | 40 | expert | 97% | 3.9 (6%) | 0.0 | 12.0 | 3.3 |
| 3 | elite | 40 | greedy (v1) | 86% | 12.1 (17%) | 0.0 | 28.0 | 4.5 |
| 3 | elite | 40 | turtle | 89% | 8.9 (13%) | 0.0 | 24.0 | 5.0 |
| 3 | elite | 40 | burst | 63% | 23.7 (33%) | 3.8 | 46.2 | 3.9 |
| 3 | elite | 40 | expert | 92% | 8.1 (11%) | 0.0 | 24.0 | 4.7 |
| 3 | boss | 40 | greedy (v1) | 79% | 18.1 (25%) | 0.0 | 47.0 | 8.9 |
| 3 | boss | 40 | turtle | 92% | 10.0 (14%) | 0.0 | 32.1 | 10.4 |
| 3 | boss | 40 | burst | 33% | 43.9 (60%) | 17.9 | 66.0 | 5.8 |
| 3 | boss | 40 | expert | 96% | 8.4 (12%) | 0.0 | 24.0 | 8.8 |

## Bosses

| Boss | Bot | Fights | Win rate | Turns to kill, mean | median | min | Kills in 4 turns or fewer |
|---|---|---|---|---|---|---|---|
| Foreman | greedy (v1) | 120 | 93% | 6.7 | 7.0 | 4 | 3 of 112 wins (3%) |
| Foreman | turtle | 120 | 97% | 7.1 | 7.0 | 5 | 0 of 116 wins (0%) |
| Foreman | burst | 120 | 53% | 6.8 | 7.0 | 4 | 3 of 64 wins (5%) |
| Foreman | expert | 120 | 98% | 6.6 | 7.0 | 5 | 0 of 118 wins (0%) |
| Boilermaker | greedy (v1) | 120 | 89% | 5.8 | 6.0 | 4 | 6 of 107 wins (6%) |
| Boilermaker | turtle | 120 | 95% | 6.1 | 6.0 | 4 | 5 of 114 wins (4%) |
| Boilermaker | burst | 120 | 60% | 5.7 | 6.0 | 3 | 8 of 72 wins (11%) |
| Boilermaker | expert | 120 | 95% | 5.8 | 6.0 | 4 | 6 of 114 wins (5%) |
| Clockmaker | greedy (v1) | 120 | 79% | 9.2 | 9.0 | 5 | 0 of 95 wins (0%) |
| Clockmaker | turtle | 120 | 92% | 10.3 | 10.0 | 6 | 0 of 110 wins (0%) |
| Clockmaker | burst | 120 | 33% | 8.3 | 8.0 | 6 | 0 of 40 wins (0%) |
| Clockmaker | expert | 120 | 96% | 8.8 | 8.0 | 6 | 0 of 115 wins (0%) |

### Clockmaker phases

Phase turns are the turns a phase lasted. A fight that dies in phase 1 only counts toward "reached phase 2" if it got there.

| Bot | Fights | Reached phase 2 | Reached phase 3 | Phase 1 turns | Phase 2 turns | Phase 3 turns (wins) |
|---|---|---|---|---|---|---|
| greedy (v1) | 120 | 94% | 89% | 4.9 | 2.3 | 2.1 |
| turtle | 120 | 97% | 97% | 5.7 | 2.3 | 2.3 |
| burst | 120 | 64% | 42% | 4.4 | 2.1 | 1.8 |
| expert | 120 | 98% | 98% | 5.0 | 2.1 | 1.8 |

## Peak Plating

Highest Plating the machine produced in one turn, over every replayed fight. "Absorbed 3 turns running" counts fights with at least 3 enemy attack turns in which Plating covered every attack for 3 consecutive attack turns (no HP lost).

| Act | Bot | Fights | Peak Plating, mean | median | p90 | Fights with every attack absorbed 3 turns running |
|---|---|---|---|---|---|---|
| 1 | greedy (v1) | 360 | 35.2 | 30.0 | 74.0 | 83 of 224 (37%) |
| 1 | turtle | 360 | 41.5 | 36.0 | 78.0 | 117 of 252 (46%) |
| 1 | burst | 360 | 16.1 | 13.0 | 34.0 | 37 of 184 (20%) |
| 1 | expert | 360 | 37.3 | 34.0 | 68.0 | 132 of 244 (54%) |
| 2 | greedy (v1) | 360 | 48.5 | 37.5 | 108.0 | 147 of 215 (68%) |
| 2 | turtle | 360 | 58.0 | 49.5 | 121.2 | 193 of 231 (84%) |
| 2 | burst | 360 | 21.4 | 17.0 | 52.1 | 54 of 192 (28%) |
| 2 | expert | 360 | 50.0 | 42.0 | 108.1 | 188 of 232 (81%) |
| 3 | greedy (v1) | 360 | 58.1 | 52.0 | 113.1 | 189 of 249 (76%) |
| 3 | turtle | 360 | 72.2 | 60.0 | 136.3 | 236 of 278 (85%) |
| 3 | burst | 360 | 23.5 | 20.0 | 48.1 | 67 of 223 (30%) |
| 3 | expert | 360 | 59.1 | 51.0 | 109.1 | 232 of 267 (87%) |

## Careers

100 careers from a fresh profile (SENSIBLE_PATH, up to 30 runs, a career with no win counts as 31).

| Bot | Careers | First win, median | Quartiles | Mean | No win in 30 runs |
|---|---|---|---|---|---|
| v1 bot (greedy combat, v1 drafting) | 100 | 9.0 | 7.0 to 12.0 | 9.8 | 0 |
| greedy combat + expert drafting | 100 | 5.0 | 3.0 to 7.0 | 4.8 | 0 |
| turtle combat + expert drafting | 100 | 3.0 | 1.0 to 3.0 | 2.6 | 0 |
| burst combat + expert drafting | 100 | 21.0 | 17.0 to 27.0 | 21.3 | 10 |
| expert (beam + lookahead combat, expert drafting) | 100 | 2.0 | 1.0 to 3.0 | 2.4 | 0 |

Expert first win: median 2.0 (quartiles 1.0 to 3.0) against v1's 9.0 on the same seeds (the shipped report says 9).

## No-meta runs

300 runs per bot with no meta progression (Tinker chassis, no upgrades).

| Bot | Runs | Win rate | Reached act 2 | Reached act 3 |
|---|---|---|---|---|
| v1 bot (greedy combat, v1 drafting) | 300 | 1.0% | 43% | 8% |
| greedy combat + expert drafting | 300 | 11.7% | 62% | 23% |
| turtle combat + expert drafting | 300 | 31.7% | 81% | 45% |
| burst combat + expert drafting | 300 | 0.0% | 18% | 2% |
| expert (beam + lookahead combat, expert drafting) | 300 | 36.0% | 86% | 52% |

Expert no-meta win rate: 36.0% over 300 runs.

## What the expert wins with

Pick rate among the 208 winning expert runs (careers and no-meta pooled) of the parts in the bin at the end, one count per run. The last column is the same rate over all 535 expert runs, so a big gap marks a part that goes with winning.

### Parts

| Rank | Id | In winning runs | In all expert runs |
|---|---|---|---|
| 1 | escapement | 100% | 100% |
| 2 | coil | 92% | 92% |
| 3 | leaf | 88% | 67% |
| 4 | anchor | 79% | 56% |
| 5 | pendulum | 79% | 59% |
| 6 | cam-follower | 78% | 57% |
| 7 | torsion | 76% | 67% |
| 8 | trip-hammer | 74% | 53% |
| 9 | trap | 73% | 60% |
| 10 | metronome | 66% | 59% |

### Parts, starting-bin parts left out

| Rank | Id | In winning runs | In all expert runs |
|---|---|---|---|
| 1 | leaf | 88% | 67% |
| 2 | cam-follower | 78% | 57% |
| 3 | torsion | 76% | 67% |
| 4 | trip-hammer | 74% | 53% |
| 5 | trap | 73% | 60% |
| 6 | volute | 39% | 20% |
| 7 | hairspring | 37% | 19% |
| 8 | chronometer | 30% | 18% |
| 9 | lever | 27% | 29% |
| 10 | grandfather | 21% | 15% |

### Trinkets

| Rank | Id | In winning runs | In all expert runs |
|---|---|---|---|
| 1 | brass-heart | 100% | 61% |
| 2 | echo-chamber | 100% | 77% |
| 3 | mainspring-key | 84% | 33% |
| 4 | bellows | 33% | 23% |
| 5 | sprocket-tag | 31% | 21% |
| 6 | oilcloth | 25% | 12% |
| 7 | spare-spring | 23% | 12% |
| 8 | clockwork-heart | 21% | 11% |
| 9 | tin-cup | 18% | 9% |
| 10 | brass-knuckles | 17% | 12% |

## Runtime

| Section | Tasks | Wall time | CPU time (all workers) |
|---|---|---|---|
| Careers, expert | 100 | 26.7 s | 475.4 s |
| No-meta runs, expert | 300 | 32.6 s | 609.3 s |
| Fights, 4 bots | 288 | 21.0 s | 324.8 s |
| Careers, other bots | 400 | 27.9 s | 535.4 s |
| No-meta runs, other bots | 1200 | 9.1 s | 178.1 s |

Run on 20 worker threads. Per-turn cost in the fight replays (CPU time of the whole replay including combat setup, divided by turns played):

| Bot | Fights | Turns | ms per turn | Machine previews per turn |
|---|---|---|---|---|
| greedy (v1) | 1080 | 4972 | 6.1 | 0 |
| turtle | 1080 | 5532 | 6.3 | 81 |
| burst | 1080 | 4130 | 4.7 | 81 |
| expert | 1080 | 5170 | 46.4 | 593 |

Expert average: 46.4 ms per turn on the shared worker threads. Alone on one thread (36 bins across every act and tier, 164 turns): 27.9 ms per turn, 610 previews per turn.

## Reading the numbers

Hand-written notes, appended by the CLI from `src/sim/strat/notes.md`. The figures above are regenerated; these notes quote the seed 1 run.

**What dominates.** Plating is cheap and Plating alone is enough to coast. The expert's machine makes a mean peak of 37 (act 1), 50 (act 2) and 59 (act 3) Plating in one turn, with p90 of 68 to 109, against enemy attacks that mostly sit between 5 and 36. In 54% (act 1) to 87% (act 3) of expert fights every attack was absorbed for 3 turns running, and even the v1 greedy bot manages it in 37% to 76%. Turtle, which only chases Plating until the incoming is covered and then spends the rest on damage, wins 32% of no-meta runs (greedy combat with the same drafting: 12%, v1 as shipped: 1%) and loses under 10% of max HP in act 1 and act 3 normal fights. Burst alone does not work (0% no-meta wins, 33% on the Clockmaker, 60% HP lost on that fight). The winning line is the owner's: cover the incoming first, then put everything else into damage. The expert is turtle plus better placement and a lookahead, and it cuts HP lost against v1 greedy by about half on bosses (act 3: 8.4 HP against 18.1) and takes the first win from run 9 to run 2.

**Drafting counts as much as combat.** On the same seeds, drafting alone (v1 combat, expert drafting) moves the median first win from 9 to 5; the expert combat on top moves it to 2. The parts that go with winning are Plating engines (Leaf Spring, Anchor Escapement, Cam Follower) and the springs and cams that feed bursts (Torsion, Trap, Trip Hammer, Volute, Hairspring). Trinket pick rates among winners are inflated by selection: boss trinkets are only offered after a boss falls, so Brass Heart and Echo Chamber at 100% mostly say "won".

**What the bots do not find.** The owner killed the Clockmaker in 4 turns. No bot did: the fastest Clockmaker kill in the replays is 6 turns, the mean is 8.8 for expert, and phases 1, 2 and 3 last about 5.0, 2.1 and 1.8 turns. No boss was killed in 4 turns on average by any bot (the Foreman never under 5 for turtle and expert, the Boilermaker is the only boss with a regular 4-turn kill, 5% of expert wins). So the bots under-measure peak burst by roughly a factor of two, and v2 targets for kill speed should come from the owner's line, not from these bots. HP loss is the better-measured side: it comes out lower for the expert than for any single strategy.

**Caveats.**
- The expert's drafting is hand-tuned (part values in `runbot.ts`, committed to one package by act 1 floor 4); another designer would choose differently. It never explores.
- Fights replay from the snapshot's HP, so low-HP arrivals count as losses; win rates are for the bins an expert run actually reaches, which are survivors of earlier fights.
- The lookahead plays the real enemy turn on a copy with the draw pile reshuffled, so it does not peek at the next hand.
- Careers draw on Brass, Blueprints and Second Wind exactly as the v1 careers do (same seeds, same SENSIBLE_PATH); the v1 row reproduces the shipped median of 9.
- Bin counts under "Bins" are distinct bins among the 40 sampled; two snapshots from different runs can be identical early in act 1.
