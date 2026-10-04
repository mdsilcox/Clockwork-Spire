# Clockwork Spire v2: vision

Version 2 is built from the owner's playtest of v1 (DECISIONS.md D-029) and a graphics overhaul (D-026). v1's vision (`docs/vision.md`) still holds where this page doesn't replace it. Rules detail is in `docs/rules.md`, numbers in `docs/content.md`, story in `docs/lore.md`.

## What the playtest said, and the answer

| Playtest point | v2 answer | Where |
|---|---|---|
| Won on run 4 | An expert bot that plays the dominant lines sets the curve (median first win at run 8 to 12); strategy bots prove no single line wins trivially | rules 7 |
| Stack Plating, then burst | Enemies are machines whose parts answer both: drills pierce Plating, ratchets grow while ignored, bulwarks guard the core, cores are sealed on elites and bosses | rules 2 |
| Healing and debuffs | Patch and Mend for you, menders on enemies, part statuses (Jammed, Brittle) both ways | rules 2, 3 |
| Saw only 4 turns of the final boss | Boss phases are sets of parts; damage never carries past a part; each phase change is a beat with its own mechanic; the Clockmaker takes about 9 turns | rules 4.4 |
| Pick the next target after a kill | A target order (1, 2, 3...) of enemy parts and cores, set before Run | rules 2.3 |
| More rarity tiers | Common, Uncommon, Rare, Masterwork, Legendary | content |
| Achievements gate unlocks | About 30 achievements; the harder the feat, the stronger the unlock | content |
| Difficulty modes | Apprentice, Journeyman, Master, Clockwork, and the Overwind dial after a first win | rules 5.7 |
| Atmosphere, a world, title screen, lore | A painted title screen; a town at the Spire's foot you walk through; each act a tower section you walk; lore told through people, places and the journal | below, lore.md |
| Too much like Slay the Spire outside battle | No branching path, no pick-1-of-3, no shop: roam each act against the Spire clock, live on salvage, a Spire that remembers | below |
| Graphics overhaul | Painted, rigged characters and enemies; painted scenes and part sprites; code for effects, UI and motion | art-direction.md |

## The game in one breath (v2)
You are the inventor's apprentice in Bellfoot, a town stuck at dusk under a clockwork Spire. Each run you climb the Spire with Sprocket and a machine you build part by part on a 5 by 3 grid. Every enemy is a machine too: you see its parts, read what each will do, and take it apart, and what you break is what you bring home to build with. Each section of the Spire has a clock; you roam its rooms as you like, but at midnight its warden comes for you. Between runs the town grows as the people you helped move in.

## Pillars (v1's four, plus two)
1. **The machine is the toy.** Unchanged.
2. **See it before you run it.** Unchanged: the preview stays exact, including the target order.
3. **Every run moves you forward.** Unchanged; now also the town and the Spire's memory.
4. **Warm, curious, a little sad.** Unchanged.
5. **Take them apart.** Every enemy is a readable machine. The best answer is usually to break the right part, not to hit hardest or hide behind the most Plating.
6. **Time is the map.** You choose where to spend hours, not which fork to take.

## Combat: machine against machine
Your side is v1's machine (draw 3, place 2, one free swap, 3 ticks, Pressure, preview). The enemy side changes:
- Each enemy is a **frame** with a **core** (its HP) and 1 to 4 **parts** shown on it (bosses up to 8, in phases). Each part has its own small HP and one **action** (attack, shell, heal, sabotage, buff). The enemy's intent each turn comes from its parts, shown on the part that will act, so you can see which piece to break.
- A **broken** part stops acting and drops as **salvage**. A destroyed core ends the enemy; any unbroken parts are wrecked and drop only Scrap.
- **Strikes** hit the first living entry in your **target order**; damage past that target is lost (no carry). **Sweeps** hit every exposed core. New player parts aim at parts (Shatter, Pry) or ignore Shell.
- So each fight asks a real question: break the drill before it pierces your Plating, the mender before it heals, the ratchet before it grows, or race the core for speed and lose the salvage.

## The climb: roam against the clock
Replaces v1's branching node map, part rewards and shop.
- **An act is one place**: a painted cross-section of a Spire section (the Gearworks, the Steamworks, the Belfry), about 16 to 20 rooms joined by stairs, ducts and lifts, with loops. You see the whole layout; rooms next to where you've been show what they hold, farther rooms show a silhouette.
- **The Spire clock**: walking to a connected room takes one hour. The act starts at dusk (hour 0); at **midnight** (hour 12 on Journeyman) the act's **warden** (boss) comes for you wherever you are. You may climb to the warden's door early and ring the bell: each unspent hour pays Scrap and Brass.
- **Rooms**: machines to fight; **roaming elites** that walk one room each hour along a patrol you can see and fight you if you meet; a **workbench** (combine and upgrade salvage, remove a part); an **oil station** (rest: heal, costs an extra hour); **traders** (barter salvage for their stock); **events** (people and places); **locked doors** (open with a key part or salvage; shortcuts and caches); **vaults** (Masterwork caches behind a guardian machine).
- Cleared rooms stay cleared; you can cross them again, so the choice is how to spend hours: more fights mean more salvage but less time to heal, trade or reach a cache.

## Salvage, not rewards
- What you break is what you get. Each enemy part maps to a player part (a Cog Rat's Jaw becomes a Gnasher Gear). Breaking it in a fight drops that part as **salvage**; it joins your bin straight away.
- **Scrap** (replaces Cogs) comes from every fight, wrecked parts and early bells; it pays for upgrades, removals and barter.
- At a **workbench**: upgrade a part (Scrap), remove a part (Scrap), or **fuse** two parts of the same family and rarity into one part of the next rarity, which can reach Masterwork.
- **Traders** swap a part from their stock for one of yours plus Scrap; their stock is where Rare parts and trinkets usually show up.
- **Trinkets** come from elites, vaults, traders and events; never a 1-of-3 screen.

## The Spire remembers (between runs)
- **Residents**: some events end with a person moving down to Bellfoot (the lamplighter, the apprentice, the oil merchant, the hour ghost). Each resident opens a service in town for every later run (a trader, a mechanic who starts you with a part, the archivist who keeps lore and the bestiary).
- **Landmarks**: a few one-time feats change the Spire for later runs: a repaired lift becomes a permanent shortcut room, an opened vault stays a known room, a lit lamp reveals an act's layout from the start.
- **The Clockmaker watches**: the town archivist tracks which plan your last three runs leaned on (Plating, burst, Pressure, statuses). The Clockmaker opens with a part that answers it, named in the archivist's note before the run.

## The world: Bellfoot and the Spire
- **Title screen**: a painted Spire at dusk, steam and lamps animated in code, Sprocket trotting into frame; Continue, New run, Settings.
- **Bellfoot** (replaces the Workshop screen): a short street you walk along with taps or arrow keys: the Workshop (upgrade bench, chassis rack), Sprocket's corner, the trophy shelf (achievements), the archivist (journal, bestiary, the Clockmaker's note), the clock tower door (difficulty and Overwind), the Spire gate, and residents' stalls as they arrive. It stays fast: every stop is also one tap from a menu.
- **The Spire**: each act's map is its painted cross-section; your tinker and Sprocket walk the rooms (a short walk per hour, skippable).
- **Ambient sound** per place (Bellfoot's dusk, each act), built on v1's synthesized music.

## Meta at a glance
- **Rarity**: Common, Uncommon, Rare, Masterwork (rule-bending: diagonal motion, a second Mainspring, parts that fire on the enemy's turn), Legendary (run-defining; at most one per run; from a boss's core in acts 2 and 3).
- **Achievements**: about 30 across play styles; each unlocks something, scaled to how hard it is (a chassis, Masterwork and Legendary parts into the pool, landmarks, Overwind levels, journal pages, Sprocket's collars).
- **Difficulty**: Apprentice (story), Journeyman (default, the curve's mode), Master, Clockwork; after a first win, the **Overwind** dial adds named twists one turn of the key at a time (up to 10).
- **Brass and blueprints**: as v1 (the upgrade bench), plus Brass from early bells.

## What v2 cuts from v1
The branching node map, part reward screens, the shop as a store, Cogs (renamed and reworked as Scrap), the abstract Workshop screen (now Bellfoot). v1 saves migrate: Brass, upgrades, blueprints, chassis, history and stats carry over; a run in progress is closed and credited as a loss at its floor.

## A paper walkthrough (act 1, Journeyman)
1. Dusk, hour 0. The Gearworks section is drawn as a cut-away tower: 18 rooms. The entry room is safe. Two rooms up the stair: a fight (silhouette of a rat) and a trader's lamp. A gearhound's patrol is drawn as a dotted loop through the middle floors.
2. Hour 1: fight a Cog Rat and a Rust Mite. The rat's Jaw (attack 5 x2) glows this turn; its Plate (Shell 6) acts next turn. Target order: Jaw, then the mite's core. Two Spurs and a Coil break the Jaw (8 HP) and kill the mite. Next turn the rat can only Shell; you finish its core. Salvage: Gnasher Gear (from the Jaw). Scrap 9.
3. Hour 2: the trader wants a Gear for a Rare Bellows; you trade your starter Spur and 20 Scrap.
4. Hours 3 to 5: two more fights; you skip a third because the gearhound will pass through it at hour 6.
5. Hour 7: the workbench: fuse two common Gears into an uncommon Flywheel; remove a starter part.
6. Hour 8: an event: the lamplighter is stuck on a broken lift. Fix the lift with a Lever part: he moves to Bellfoot after the run, and the lift becomes a shortcut in future runs.
7. Hour 10: you are at the warden's door with 2 hours spare. Ring the bell early: +2 hours' Scrap and Brass. The Foreman: phase 1 is his Wrench Arm and Furnace Grate (the core is sealed). Break both (4 turns), the phase beat (he tears off his apron, a Cog Rat drops in), phase 2 opens his core behind a Bulwark plate; 4 more turns. 8 turns, every phase seen.

## Success criteria (v2)
- Every acceptance criterion in `docs/acceptance.md` sections 9 to 16 has a test or a browser check, and `npm test` is green.
- The expert bot's median first win on Journeyman is between runs 8 and 12; no single-strategy bot (turtle, burst) trivializes elites or bosses (rules 7.4).
- The Clockmaker lasts about 9 turns for the expert bot (8 to 12 median), every phase at least 2 turns in 90% of fights.
- The owner signs off the art style (D4) and sees a clip of every rigged asset at each art gate.
- The owner plays a full run on phone and desktop and says it no longer feels like Slay the Spire outside battle.
