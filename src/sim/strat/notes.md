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
