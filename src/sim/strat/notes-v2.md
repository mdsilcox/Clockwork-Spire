## Reading the numbers

Hand-written notes, appended by the CLI from `src/sim/strat/notes-v2.md`; they quote the seed 1 run.

**What dominates now.** The expert, by a wide margin: it loses 3 to 6% of max HP in normal fights and 6 to 11% in elites, where turtle and burst lose 2.6x to 10x as much on elites (the part-aware order breaks the parts that punish a plan, and breaks cancel intents at once). Naive core-first play pays for it on elites (turtle 27 to 58% of max HP, burst 34 to 61%). Normals are the soft spot: turtle and burst clear the 10% line only narrowly in act 1 (11.2% and 10.3%) and act 2 (14.2% and 11.1%), and the greedy v1 bot with a simple order loses only 3% in act 2 normals.

**Failing target.** BV8 (the turtle's Plating absorbs at most 40% of enemy turns) fails in every act: act 1 normal 18% and elite 40.2%, act 2 normal 44% and elite 83%, act 3 normal 77% and elite 38%. This is content, not a weak bot: the turtle's whole plan is Plating, and these fights still send mostly plain Attacks at it. What would fix it is more Pierce, Siphon and Corrode in the act 2 and 3 regular and elite frames (rules 7.4 target 7 asks for 30% of expected damage), and for act 1 a Pierce part on the elites. Acts 2 elites (Pressure Warden, Twin Pistons) and act 3 normals need it most.

**Caveats.** Wardens are still v1 and are not measured. Fights replay from the snapshot's HP. The bins come from v2 expert careers, so they are survivors of earlier fights.
