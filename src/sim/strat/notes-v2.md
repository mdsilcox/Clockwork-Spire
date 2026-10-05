## Reading the numbers

Hand-written notes, appended by the CLI from `src/sim/strat/notes-v2.md`; they quote the seed 1 run.

**What dominates now.** The expert, by a wide margin: it loses 3 to 6% of max HP in normal fights and 6 to 11% in elites, where turtle and burst lose 2.6x to 10x as much on elites (the part-aware order breaks the parts that punish a plan, and breaks cancel intents at once). Naive core-first play pays for it on elites (turtle 27 to 58% of max HP, burst 34 to 61%). Normals are the soft spot: turtle and burst clear the 10% line only narrowly in act 1 (11.2% and 10.3%) and act 2 (14.2% and 11.1%), and the greedy v1 bot with a simple order loses only 3% in act 2 normals.

**Targets after the B7.5 tune (D-038).** Every v2 fight target passes (BV3, BV6, BV8). Before the tune, BV8 failed in act 2 (normal 44%, elite 83%) and act 3 normals (77%) because those fights sent mostly plain Attacks; Corrode on the plain big hits and a Siphon on the Bell Ringer fixed it. Act 1 normals pass narrowly (turtle and burst lose about 11% of max HP); B8's tune should widen that margin.

**Caveats.** Wardens are still v1 and are not measured. Fights replay from the snapshot's HP. The bins come from v2 expert careers, so they are survivors of earlier fights.
