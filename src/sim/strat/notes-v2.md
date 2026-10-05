## Reading the numbers

Hand-written notes, appended by the CLI from `src/sim/strat/notes-v2.md`; they quote the seed 1 run (seeds 2 and 3 agree within a few points).

**What dominates.** The expert, by a wide margin: it loses 4 to 15% of max HP in normal and elite fights, where turtle and burst lose 4x to 7x as much on elites and 14 to 28% on normals. Breaking the parts that punish a plan cancels their intents at once, and the naive core-first plans never do it. The turtle's Plating still soaks whole turns of plain Attacks, but only 0 to 13% of enemy turns end fully absorbed, because Pierce and Siphon get through.

**What changed since the first B7.4 run.** Two sim bugs, both mine. The turtle credited Plating only against intents that survive the machine run, so killing an enemy erased its credit and the turtle stalled for 40 turns at 2 core HP rather than finish a fight (that inflated BV8 to 40 to 83%). Bins were collected with the v1 career driver, which cannot play the climb, so they came from nothing like a real climb (that broke BV3 normals when the climb merged). Bins now come from expert climbs (the expert route with the climb driver), and the legacy wardens' intents are read from their v1 summary instead of looking empty.

**Caveats.** Wardens are still v1 and are not measured here. Fights replay from the snapshot's HP. The bins are survivors of earlier fights in expert climbs.
