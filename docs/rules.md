# Clockwork Spire: rules (v2)

Version 2 (D3, owner choices D-029). Section 1 is v1's machine with targeting moved to 2.3; sections 2 to 7 are new. v1's rules are in git history (tag `v1.0`).

The complete game rules. Numbers marked *(tune)* are starting values the balance simulator may move; any change is logged in `balance/` and DECISIONS.md. Part, enemy, event and trinket lists are in `docs/content.md`. Terms in **bold** are glossary entries in the game.

## 1. The machine

### 1.1 The board
- A grid of **5 columns by 3 rows** (15 cells). Cells are named by column letter and row number: A1 (top left) to E3 (bottom right).
- The **Mainspring** sits fixed in A2. It cannot be replaced or moved. It is the source of all **motion**.
- Every other cell holds at most one **part**. Parts never rotate. Two parts are **adjacent** when they share an edge (up, right, down, left). Diagonals are not adjacent unless a part says so.

### 1.2 Parts you own
- Your **bin** is the set of parts you own this run (like a deck). It starts with your chassis' parts.
- In combat the bin is shuffled into a **draw pile**. Placed parts stay on the board; parts you don't place go to the **discard pile**. When the draw pile is empty, the discard is shuffled into it.
- The board starts empty (except the Mainspring) at the start of every combat, and is cleared back into the bin when the combat ends. Parts placed on the board stay there across turns of the same combat.

### 1.3 A turn
1. **Start of turn.** Your **Plating** (block) from last turn falls away. Statuses tick (section 3). Draw parts until your **hand** holds 3 (the hand-size upgrade makes it 4).
2. **Build.** You have **2 placements** (some trinkets add one). Each placement puts one part from your hand on the board:
   - on an empty cell, or
   - on top of a part already there (**replace**): the old part goes to the discard pile and loses any stored charge.
   You may also, once per turn and for free, **swap** two parts already on the board (positions only; stored charge moves with the part). Tapping a part in hand then a cell places it; dragging works too; keyboard: number key picks a hand slot, arrow keys move a cursor, Enter places.
3. **Preview.** At every moment the preview shows what **Run** would do now: total damage to each enemy, Plating you'd gain, statuses applied, and on the board, a numbered badge on every part that will fire with how many times. Parts that won't fire are dimmed. The preview is the real simulation run on a copy, so it is exact (randomness inside a turn is not allowed; see 1.6).
4. **Run.** The machine runs for **3 ticks** (base). Each tick is resolved as in 1.4. After the last tick, end-of-turn effects resolve, unplaced hand parts are discarded, and the enemies act.
5. **Enemy turn.** Each enemy performs its shown intent, left to right, then picks its next intent and shows it.

### 1.4 A tick
1. The Mainspring emits one **pulse** of motion.
2. Motion spreads **breadth first** from the Mainspring through adjacent parts. Order among neighbors is fixed: up, right, down, left. A part is **powered** at most once per tick, so motion never loops.
3. When a part is powered, its **effect** resolves immediately (in the order parts are reached). Then, if it **passes** motion (most parts do), its not-yet-powered neighbors join the queue.
4. Some parts **hold** motion instead of passing it (springs while charging). Motion stops there for that tick.
5. **Momentum** is the number of times any part has fired this turn (the chain counter on screen). It resets at the start of each turn. Some parts read it.
6. A part that is **Rusted** (an enemy status on parts) neither fires nor passes motion until its rust clears.

The order of a tick is therefore deterministic and visible: the animation shows the pulse leaving the Mainspring and flowing cell to cell in exactly this order.

### 1.5 Effects, words and numbers
- **Strike X**: deal X damage to the first standing entry of your **target order** (an enemy part or core; rules 2.3). Damage beyond what that target has left is lost.
- **Sweep X**: deal X damage to the front of every enemy (its core, or its first keystone while the core is sealed; 2.3).
- **Plate X**: gain X Plating. Plating absorbs damage you take and falls away at the start of your next turn.
- **Charge**: a counter on a part. It persists across turns within a combat, and is lost when the part is replaced, rewound or the combat ends.
- **Release**: what a part does when its charge reaches its threshold; the charge resets to 0.
- **Boost X**: the next part powered by this part's motion this tick adds X to every Strike, Sweep and Plate it deals.
- **Echo**: the part fires its effect one more time (it is still powered once).
- **Pressure**: a shared steam gauge for the whole machine, shown beside the board. It persists across turns within a combat, starts at 0 (chassis may change this), and is capped at 30. At the end of your turn, if Pressure is above 20 the machine **overpressures**: you take 6 damage and Pressure drops to 10.
- **Fires**: a part fires when its effect resolves. Parts that hold motion still fire (they gain charge).

### 1.6 No randomness inside a turn
Nothing between pressing Run and the end of your machine's ticks is random, so the preview is exact. Every random element is resolved at a fixed moment, from its own seeded stream, before the player sees it:
- **Draws** (`draw` stream): at the start of your turn, before you build. Extra draws from the Sprocket Wheel happen at the next turn's start.
- **Enemy intents** (`enemy` stream): chosen at the end of the enemy turn and shown immediately, including the target cell of a sabotage. Random choices for the turn after next are rolled one turn early, so an effect that shows two turns ahead (the Foresight Dial) is exact.
- **Rewinding a turn** (the Inventor's Watch): restores the whole combat state at the start of your turn, every random stream's state included, so the same draws and intents follow.
- **Enemy actions** execute the shown intent with no further randomness.
- **Act layout, trader stock, events, fuse results** (`map`, `shop`, `event`, `reward` streams): rolled when the act starts or the room is entered, and saved, so a reload shows the same offer.
- **Event choices with a chance** (the Gear Wheel of Fortune) roll from the `event` stream when chosen; the odds are shown on the button.
- **No part has a random effect.** Any future random part must roll at the start of the turn and show its result before the player builds.
A unit test (M11, extended in B2) plays a full combat including draws, a sabotage and a reshuffle twice from the same seed and checks identical event lists and previews.

### 1.7 Upgrades
Every part has an upgraded form, shown with a **+** (for example Spur Gear+). Upgrades improve numbers or lower thresholds as listed in `docs/content.md`. Upgrade at the **Forge**, through some events and trinkets.

## 2. Combat: machine against machine

### 2.1 Enemy machines
- Every enemy is a **frame** holding a **core** and **parts**. The core has the enemy's HP; when it reaches 0 the enemy is destroyed. Each part has its own small HP, one **action**, a **cadence** (the turns it acts on) and, usually, a **salvage** (the player part it becomes when broken). Regular enemies have 1 to 3 parts, elites 3 to 5, wardens (bosses) 4 to 8 across their phases.
- Parts are drawn on the enemy's painting, pinned to anchors: each shows its HP pips, its status icons and, when it will act next turn, its intent.
- A part at 0 HP is **broken**: it never acts again this combat, and any intent it shows is cancelled at once. Breaking a part never damages the core.
- Some parts are **passive**: they have no intent and change a rule while they stand (a Bulwark halves damage to the core; a Governor caps damage per Strike). Their effect ends when they break.
- **Core actions**: only an enemy whose acting parts are **all broken** falls back to its core action (usually a weak Bump, attack 3 to 6 *(tune)*). A turn where living parts simply rest by cadence is a quiet turn, not a Bump.
- **Sealed cores**: elites and wardens may have a sealed core. A sealed core can't be targeted or damaged until every **keystone** part of its current phase is broken. Sealed is shown as a lock on the core.

### 2.2 Intents
- At the end of the enemy turn, each enemy reveals its next actions: every part whose cadence includes the next turn shows its intent on itself. The enemy's intents are performed in a fixed order (left to right on its frame; the core action only as 2.1 says).
- Intent icons and kinds are v1's (attack, shell, sabotage, buff, debuff, charge, special) plus the new actions in 2.4. Each carries its number and a tooltip, and color-blind labels as in v1.
- Enemy actions have no randomness: cadences are fixed patterns; where an enemy chooses (a target cell for Rust), the choice is rolled from the `enemy` stream when the intent is revealed and shown before you build.

### 2.3 Targeting: the target order
- Before Run, you build a **target order**: tap enemy parts and cores to number them 1, 2, 3... (up to 6). Tap again to remove one. A sealed core can't be added. The order is kept between turns (broken and dead entries drop out) and defaults to: the leftmost enemy's acting parts in intent order, then its core.
- **Strike X** hits the first entry of the order that is still standing. Damage beyond what that target has left is **lost**: it never carries over to another target, a core or a later phase. The next Strike goes to the next standing entry.
- If the order is empty or every entry is down, Strikes hit the **front** of the leftmost living enemy: its core, or, while the core is sealed, its first unbroken keystone.
- **Sweep X** hits the front of every living enemy.
- New player words (parts in `docs/content.md`): **Shatter X** (X to every unbroken part of the enemy your next Strike would hit), **Drill X** (a Strike that ignores Shell, Bulwark and Governor), **Jam** (the part your next Strike would hit skips its next action, and a Countdown on it doesn't tick), **Pry X** (a Strike X at the weakest unbroken part, by HP left, of the enemy your next Strike would hit; ties left to right), **Patch X** (heal X HP).
- The preview shows, for every target in the order, the damage it will take and whether it breaks or dies, and the cancelled intents. Because the order is fixed before Run, the preview stays exact (1.6).

### 2.4 Enemy actions
| Action | Effect |
|---|---|
| Attack X (x N) | X damage to you, N times; Plating absorbs it. |
| Pierce X | X damage that ignores Plating. |
| Corrode X% | Remove X% of your Plating (rounded up), before the enemy's attacks this turn. It scales with stacking: the more Plating you hold, the more it strips. |
| Siphon X | Attack X; the enemy's core heals by the Plating this attack removed (up to X). |
| Shell X | The enemy gains Shell X (absorbs damage to its core and parts; falls away at the start of its next turn). |
| Mend X | Heal X to its core, or rebuild one of its broken parts at half HP (the part says which). |
| Ratchet X (passive) | At the end of each of your turns while this part stands, the enemy gains Strength X for the rest of the combat. Only breaking the part stops it. |
| Countdown N: action | Ticks down by 1 each enemy turn; at 0 performs the action (usually a big Pierce) and resets to N. Breaking the part defuses it; Jam pauses it for a turn. |
| Build-up X to Y: action | A gauge on the part rises by X each enemy turn plus any bonus the part lists (the Queen's heat also rises by the Pressure she drains); at Y or more it performs the action and drops to 0. Breaking the part stops it; Jam pauses it for a turn. |
| Bulwark (passive) | While it stands, the core takes half damage (rounded down) from Strikes and Sweeps. |
| Governor X (passive) | While it stands, no single Strike deals more than X to this enemy. |
| Braced (wardens) | A warden's keystone takes at most half its max HP (rounded up) per player turn, and its exposed core in the last phase at most a third of its max HP per turn. Damage past the cap is lost. So every phase lasts at least 2 turns and the last at least 3, whatever the build. Elites are never Braced, on patrol or guarding a vault. |
| Rust, Jam, Magnetize, Drain | v1's sabotage of your machine. |
| Corroded X, Dazed X on you | v1 statuses, now also from parts. |
| Summon | A new enemy joins at the right, with its intents shown (some enemies summon once at the start of combat). |
| Buff X | Its allies (or itself) gain Strength X. |
| Enrage X (passive) | When a linked ally is destroyed, this enemy gains Strength X. |
| Purge | Clears every status on its own frame (v1's statuses on enemies). |
| Echo | Attacks (or Pierces, if the part says) for the damage your strongest part dealt last turn (v1's Echo Sprite), minimum as listed. |

**Counterplay by design.** Plating stacking meets Pierce, Corrode (a share of your Plating, so it grows with the stack), Siphon, Ratchet and Countdown: you must break those parts, which means aiming damage at parts instead of piling Plating. Each act's regular pool must carry a real share of damage that ignores or strips Plating (content.md states the share per act; rules 7.4 target 7). Regular cores hold most of an enemy's HP, so racing the core while its parts act costs HP, and a raced core wrecks its parts (no salvage). Burst meets Bulwark, Governor, sealed cores and lost overkill: one giant Strike is worth less than several aimed ones. Every regular enemy has at least one part that punishes one of the two plans (content.md lists "punishes" per enemy).

### 2.5 Winning, losing and salvage
- You win the combat when every enemy is destroyed; you lose the run at 0 HP. Summoned enemies count.
- **Salvage**: every part you broke with a salvage id goes to the salvage tray at the end of the combat. You keep any of them (each joins your bin) and scrap the rest for 3 Scrap each *(tune)*. Keeping is optional, so the bin grows only by choice. Parts still standing when their core died are **wrecked**: 1 Scrap each. Each enemy also drops Scrap: 3 to 6 regular, 12 to 18 elite, 30 warden *(tune)*.
- Salvage rarity is the enemy part's rarity: regular enemies carry Common and Uncommon parts, elites Uncommon and Rare, wardens Rare and Masterwork.
- A part whose salvage is locked (not yet unlocked by a blueprint or achievement) drops as 6 Scrap and a note in the journal ("You could almost see how it worked").

### 2.6 Healing
- **Patch X** (parts) heals during combat; the Tea Kettle and new Patch parts carry it.
- Oil stations heal outside combat (4.4). After a warden you heal 40% of the HP you've lost.
- Enemies heal by Mend and Siphon; the answer is to break the part that does it.
- Your parts' reactions during the enemy turn (Spring Trap) strike the part that attacked; if that breaks it, the rest of its action is cancelled.

## 3. Statuses

On enemies (a status always applies to the whole frame, core and parts alike, whichever part was hit):
- **Scald X**: at the end of the enemy's turn its core takes X damage, then X falls by 1 (a sealed core is immune; the Scald waits).
- **Cracked X**: the enemy's core and parts take 50% more damage from Strike and Sweep for X turns.
- **Dazed X**: its attacks deal 25% less for X turns.
- **Shell X**: block for the whole enemy.
- **Jammed** (a part): skips its next action, then clears.
- **Strength X**: its attacks deal +X (from Ratchet and buffs).

On you: **Plating X**, **Corroded X**, **Grit X** (v1). On your parts: **Rusted**, **Magnetized** (v1).

## 4. The climb

### 4.1 Acts as places
- Three acts: the Gearworks, the Steamworks, the Belfry. Each act is one **section** of the Spire, drawn as a cut-away: 5 to 6 **floors** of 3 to 4 **rooms**, 16 to 20 rooms in all *(tune)*.
- Rooms connect by **passages**: along a floor to the next room, and by stairs, ducts and lifts between floors. The section is generated from the run seed (`map` stream): a connected graph with at least two loops, every room reachable, the **entry** at the bottom and the **warden's door** at the top. The shortest path from entry to door is at most 5 moves, so even the fewest hours any mode and Overwind allow (8) leave at least 3 spare hours. Some passages are **locked doors** (4.6).
- The whole layout is visible. A room you have visited, or one next to it, shows its kind; other rooms show a silhouette only. Rooms you cleared stay cleared and can be crossed again.

### 4.2 The Spire clock
- Each act starts at dusk, hour 0. Moving to a connected room takes **1 hour**. Resting at an oil station takes 1 more hour. Fights, events, trading and the workbench take no extra time.
- At **midnight** (hour 12 on Journeyman; modes in 5.7), when the current room is resolved, the warden comes: the warden fight starts where you stand, and the warden is **Overwound**: Strength 3 and Shell 10 at the start of the fight *(tune)*. Running out of time is a real cost.
- You may walk to the warden's door and **ring the bell** early. Each hour left pays 6 Scrap and 2 Brass, and for every 3 hours left you are **Prepared**: +1 placement on your first warden turn (at most +2) *(tune)*. The bell is worth more than the fights you skip only when your machine is ready; that is the choice.
- Some event choices cost or give back hours; the button says so ("Take the long way: +1 hour").
- The clock, hours left and each roaming elite's next room are always on screen.

### 4.3 Roaming elites
- Each act has 1 or 2 elites (2 from act 2) with a **patrol**: a loop of 3 to 5 rooms drawn as a dotted path. After each of your moves, every elite steps one room along its patrol.
- If you step into an elite's room, or it steps into yours, you fight it there. A defeated elite drops a trinket (from its act's pool), its salvage and a blueprint (as v1).
- Elites never enter the entry room or the warden's door.

### 4.4 Rooms
| Room | Per act *(tune)* | Does |
|---|---|---|
| Fight | 7 to 9 | An encounter from the act's pool; deeper floors draw harder encounters. |
| Workbench | 1 (2 in act 3) | Upgrade a part (C 15, U 25, R 40, M 60, L 80 Scrap); remove any part (25 Scrap, +15 per use in a run); **fuse** two parts of the same family and rarity into a part of the next rarity in that family (you see two candidate results and pick one; shown greyed with the reason when no unlocked part of the next rarity exists in that family; Masterworks never fuse into Legendaries). Each action once per visit; revisits allowed. |
| Oil station | 1 to 2 | Rest (1 extra hour): heal 30% of max HP; or polish: +4 max HP. Once per station. |
| Trader | 1 to 2 | Barter (4.5). |
| Event | 3 to 4 | A person or a place (content.md); some send a resident to Bellfoot (5.4). |
| Vault | 0 to 1 | Behind a locked door, guarded by a fixed elite; a Masterwork part and 40 Scrap. In act 3, if you hold no Legendary and one is unlocked, a Legendary instead. |
| Entry | 1 | Safe. The first act's entry has Sprocket's ball (pet him: nothing, but he wiggles). |
| Warden's door | 1 | Ring the bell (4.2). |

### 4.5 Traders and Scrap
- **Scrap** replaces Cogs. Earned from fights (2.5), early bells, events.
- A trader stocks 4 parts and 1 trinket rolled on entry (`shop` stream; rarity by act as content.md). Prices are fixed (no variance). Each item has a **value** (part C 20, U 35, R 60, M 100; trinket 60 to 120 Scrap *(tune)*).
- **Barter**: hand over one of your parts (it's worth its value) plus Scrap for the difference; or buy with Scrap alone at value + 25%. Traders also sell oil (heal 15, 15 Scrap).

### 4.6 Locked doors and keys
- A locked door opens with a **key**: a key salvage (some enemy parts drop a Spire Key instead of a part) or picking the lock (25 Scrap and 1 extra hour). Behind locked doors: shortcuts (passages that save hours) and vaults.

### 4.7 Wardens
- Act 1: **the Foreman**; act 2: **the Boilermaker Queen**; act 3: **the Clockmaker**. Every warden has phases (4.8); content.md has each phase's parts.
- Winning: the warden's core breaks open: a Rare or Masterwork part (the act 2 warden: a Legendary, if any is unlocked and you hold none), its salvage, a boss trinket choice (as v1), heal 40% of HP lost. The next act starts at dusk. The Clockmaker's defeat ends the run, so his broken parts pay 4 Brass each instead of salvage.

### 4.8 Phases you see
- A warden's phase is a set of parts. Its core is sealed until every keystone of the current phase is broken. Keystones and the last phase's core are **Braced** (2.4). When the last keystone breaks:
  1. the rest of that Run's damage to the warden is lost (later ticks don't touch the next phase), and its remaining intents are cancelled;
  2. the **phase beat** plays (a line, the arena changes, the painting's phase mood);
  3. the next phase's parts unfold; the warden's next turn is its **phase action** only (a summon, a heal, a Rewind), shown as its intent, with no attacks;
  4. cadences restart: the turn after the phase action is turn 1 of the new phase. Parts that stay from one phase to the next keep their HP, gauges and countdowns.
- In the last phase the core is exposed, usually behind a Bulwark or Governor. Target length on Journeyman: Foreman about 7 turns, Queen about 8, the Clockmaker about 9 for the expert bot; Braced makes 2 turns per phase (3 for the last) a hard floor for any build.

### 4.9 The Clockmaker
- Three phases (Tick, Tock, Midnight), each with its own keystones; his core is exposed only in Midnight.
- **Rewind** (v1 rule 4.4, kept, now a part): each phase has a Rewind part (the Tick Spring, the Tock Weight, the Hour Wheel). While it stands, at the start of each of his turns he lifts your strongest combination off the board and heals half its damage; break it to stop Rewind for the rest of that phase. Tock's also resets Pressure; Midnight's rewinds two combinations, and the Midnight Bell Jams the Mainspring on alternate turns.
- **He remembers** (5.4): he starts the fight with one extra part chosen against your last three runs' main plan.
- Defeating Midnight ends the run in victory (v1's ending and credits).

## 5. Between runs: Bellfoot

### 5.1 The town
Every run ends in **Bellfoot**, the town at the Spire's foot (replaces v1's Workshop screen). It is a short street you walk along (tap a place, or arrow keys); every place is also one tap from the town menu. Places: the Workshop (upgrade bench, chassis rack, inventor's notes), Sprocket's corner, the trophy shelf (achievements), the archivist (journal, bestiary, the Clockmaker's note; present from the first run; the Hour Ghost later adds lore pages and fuller bestiary entries), the clock tower door (mode and Overwind), the Spire gate (start a run), and residents' stalls (5.4). Sprocket greets you as in v1 (5.5).

### 5.2 Earning
- **Brass** per run: v1's table (4 per floor climbed becomes 2 per room cleared, act 2 rooms 3, act 3 rooms 4), plus 10 per elite, 25 per warden, 50 for a victory, plus early bells (4.2). Scaled by mode (5.7).
- **Blueprints**: as v1 (elites, wardens, some events, Sprocket's events); each unlocks one Rare part.

### 5.3 The bench and chassis
v1's upgrade bench (Reinforced Frame, Oiled Bearings, Tool Belt, Spare Cogs renamed Spare Scrap, Inventor's Notes level 1 becomes "traders stock one more part", Lucky Charm, Second Wind) and v1's three chassis, plus a fourth chassis unlocked by an achievement (content.md).

### 5.4 The Spire remembers
- **Residents**: some events end with a person moving to Bellfoot after the run (whether the run is won or lost). Each opens a stall for every later run: the Oil Merchant (start each run with 2 oil), the Apprentice (start with one part upgraded), the Lamplighter (each act's layout fully revealed), the Hour Ghost (the archivist's lore and bestiary), the Trader's cousin (one extra trader per act). Residents are listed with their event in content.md.
- **Landmarks**: feats that change the Spire in later runs: the repaired lift (a shortcut in the Gearworks), an opened vault (stays a known room, its guardian replaced by a regular fight), the lit beacon (act 3 starts at hour 0 with a clearer layout). Each is shown on the archivist's map.
- **The Clockmaker's memory**: the profile keeps the main plan of the last three runs (by the share of damage and Plating from each source: Plating, burst Strikes, Pressure, statuses). The Clockmaker's extra part answers the most common one (Plating: a Pierce drill; burst: a Governor; Pressure: a Drain valve; statuses: a Purge chime). The archivist's note names it before each run.

### 5.5 Sprocket
v1's reactions, now in Bellfoot (painted and rigged: idle, happy, sleepy, walk). He walks the Spire with you between rooms.

### 5.6 Achievements and unlocks
- About 30 achievements (content.md: id, condition, reward, hidden or not). Progress is shown on the trophy shelf.
- Rewards scale with difficulty: easy feats unlock journal pages and Sprocket's collars; medium feats unlock Rare and Masterwork parts into the pool, landmarks and the fourth chassis; hard feats (wins on Master or Clockwork, high Overwind) unlock Legendary parts and Overwind levels.
- **Masterwork and Legendary parts and trinkets all start locked**; achievements are their only unlock. **One Legendary per run**, part or trinket. Legendary sources: the Queen's core, or the act 3 vault if you hold none (4.4, 4.7).

### 5.7 Difficulty
| Mode | Enemy HP | Enemy damage | Hours per act | Oil heal | Brass | Unlocked |
|---|---|---|---|---|---|---|
| Apprentice | 80% | 75% | 14 | 40% | 75% | from the start |
| Journeyman | 100% | 100% | 12 | 30% | 100% | from the start (default) |
| Master | 115% | 115% | 11 | 25% | 125% | after a Journeyman win |
| Clockwork | 130% | 125% | 10 | 20% | 150% | after a Master win |
All *(tune)*. The curve (5.8) is set on Journeyman. **Overwind** unlocks after your first win on Journeyman or harder (an Apprentice win doesn't open it): a dial of 10 levels on top of the mode, each adding one named twist (content.md); level N includes all twists below it; +10% Brass per level.

### 5.8 The curve (enforced by the simulator, 7.4)
- With no meta progression, the expert bot wins under 5% of Journeyman runs (the greedy bot under 2%).
- Following the sensible upgrade path, the expert bot's median first win on Journeyman is between run 8 and run 12.
- Every run earns Brass enough to buy something within one or two runs (v1).

## 6. Saves
- Three slots, settings global (v1). The run is saved after every action (placements, Run, moves, choices).
- **Version 2**: v1 saves migrate on load: Brass, bench upgrades, blueprints, chassis, history and statistics carry over; Cogs are dropped; a v1 run in progress is closed as a loss at its floor and credited its Brass, with a one-line notice ("The Spire has changed while you were away.").

## 7. The balance simulator

### 7.1 Bots
- **Greedy** (v1's bot, ported): one placement at a time by the preview; the casual-player proxy.
- **Turtle**: maximizes Plating each turn, then damage; targets the core.
- **Burst**: maximizes damage each turn, Plating only as a tie-break; targets the core.
- **Expert**: beam search over the turn (placements, swap, target order) with a one-turn lookahead (next intents, charge, Pressure, Ratchet, Countdown), and part-aware targeting (break what punishes its plan first). Under 50 ms per turn on average.
- **Max-burst**: the expert's search with damage weighted far above safety; the proxy for the owner's 4-turn Clockmaker kill.
- Run policies: greedy (v1-like), **expert** (drafts toward a plan, removes weak starters, plans routes against the clock, values salvage, rings early when ready), **rusher** (straight to the door, rings the bell) and **grinder** (fights every reachable room until midnight).
- Career policy: bots unlock achievements as they happen in play; the expert takes event choices that send residents and set landmarks when offered; Brass follows the sensible upgrade path (v1).

### 7.2 Reports
`npm run sim -- --mode fights|runs|careers|strategies` writes dated reports to `balance/`: per-tier win rate, HP lost (mean, p10, p90) and turns for every bot; turns per warden phase; peak Plating; careers' first-win distribution; offer-based part impact (offers are now trader stock, fuse results and salvage taken versus scrapped).

### 7.3 v1 evidence
`balance/2026-10-04-v1-strategies.md` (the D3 spike, `src/sim/strat/`) measures v1 with these bots:
- The expert's median first win is **run 2** (quartiles 1 to 3) against the v1 bot's 9; with no meta it wins 36% of runs (v1 bot 1%). The owner's run-4 win sits inside this range: v1 was far too easy for a good player.
- What dominates is **Plating that covers the shown incoming**, with the rest of the output spent on damage: the expert's mean peak Plating is 37, 50 and 59 by act, and it absorbs every attack for 3 turns running in 54 to 87% of fights. The turtle bot alone wins 32% with no meta. Pure burst wins 0%.
- The Clockmaker lasts 8.8 turns on average for the expert, but phase 1 takes 5 and phases 2 and 3 about 2 each: the late phases collapse.
These set the v2 targets below: Plating is the line the v2 enemy parts must answer (2.4), the turtle bot is the main thing to beat in target 3, and target 4 asks for even phases. Target 3 also applies to act normal fights for the turtle bot (the spike found it losing under 10% of max HP in acts 1 and 3).

### 7.4 Targets, checked by tests (`tests/sim/`)
1. Expert, no meta progression, Journeyman: win rate under 5% (300 runs); greedy under 2%.
2. Expert careers on the sensible path: median first win between run 8 and 12 (at least 100 careers; no win by run 30 counts as 31).
3. **No trivial strategy**: on the same bins, the turtle and burst bots each lose at least 1.5x the expert's mean HP on every elite and warden, and at least 10% of max HP on average in each act's normal fights.
4. **Phases seen**: wardens' turns for the expert: Foreman 6 to 9, Queen 7 to 10, Clockmaker 8 to 12 (median). For every bot including max-burst, every phase lasts at least 2 turns and the last at least 3 (guaranteed by Braced; checked).
5. No part's offer-based impact is more than double the median part's (v1 target 3, kept).
6. Expert per-turn time under 50 ms on average (so careers finish in minutes).
7. **Plating answered**: the turtle bot's Plating fully absorbs an enemy turn in at most 40% of enemy turns, per act; and in content, at least 30% of each act's regular expected damage per turn is Pierce or Siphon, computed from the defs (average over each part's cadence cycle; escalating numbers at their cycle average; Ratchet growth not counted). Siphon counts because the Plating it removes heals the enemy, so the stack buys nothing. Corrode is reported separately as credit against the act's reference stack (the spike's mean peak Plating: 37, 50, 59) and is not in the share.
8. **Approachable**: greedy careers' median first win at most run 20 (a casual player still wins).
9. **Clock**: the rusher and grinder route bots both win less often than the expert (the clock rewards judgment, not one route rule).
