# Clockwork Spire: rules

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
- **Strike X**: deal X damage to the **target** enemy (the one you tapped; by default the leftmost living one). If the target dies mid-turn, later strikes go to the next living enemy.
- **Sweep X**: deal X damage to every enemy.
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
- **Enemy intents** (`enemy` stream): chosen at the end of the enemy turn and shown immediately, including the target cell of a sabotage.
- **Enemy actions** execute the shown intent with no further randomness.
- **Rewards, shop stock, events, map** (`reward`, `shop`, `event`, `map` streams): rolled when the node is entered and saved, so a reload shows the same offer.
- **Event choices with a chance** (the Gear Wheel of Fortune) roll from the `event` stream when chosen; the odds are shown on the button.
- **No part has a random effect.** Any future random part must roll at the start of the turn and show its result before the player builds.
A unit test (M11, extended in B2) plays a full combat including draws, a sabotage and a reshuffle twice from the same seed and checks identical event lists and previews.

### 1.7 Upgrades
Every part has an upgraded form, shown with a **+** (for example Spur Gear+). Upgrades improve numbers or lower thresholds as listed in `docs/content.md`. Upgrade at the **Forge**, through some events and trinkets.

## 2. Combat

- You fight one to three enemies. Each enemy shows its **intent** for its next action as an icon plus a number. Intent icons use shape as well as color (sword for attack, shield for defend, wrench for sabotage, up arrow for buff, down arrow for debuff, clock for charging up, spiral for special) and carry a text label in their tooltip.
- You win when every enemy is at 0 HP. You lose the run at 0 HP.
- Enemies may: attack (single or multi-hit), defend (gain **Shell**, their block, which falls away at the start of their next turn), buff themselves, apply statuses to you, and **sabotage** the machine:
  - **Rust** a part (it can't fire or pass motion for your next turn),
  - **Jam** the Mainspring (your next turn has 1 fewer tick, minimum 1),
  - **Magnetize** a part (it is pulled off the board back into your hand at the start of your next turn),
  - **Drain** Pressure.
- A sabotage intent names its target part on the board before it happens (a highlighted cell), so the player can respond by building around it.

## 3. Statuses

On enemies:
- **Scald X**: at the end of the enemy's turn it takes X damage, then X falls by 1.
- **Cracked X**: takes 50% more damage from Strike and Sweep for X turns.
- **Dazed X**: deals 25% less attack damage for X turns.
- **Shell X**: block; absorbs damage; falls away at the start of its next turn.

On you:
- **Plating X**: block (see 1.5).
- **Corroded X**: you gain 25% less Plating for X turns.
- **Grit X**: every Strike you deal gains +X this combat (from trinkets or parts).

On parts: **Rusted**, **Magnetized** (see section 2).

Every status has an icon, a number, a tooltip and a glossary entry.

## 4. The run

### 4.1 Structure
- Three **acts**. Each act is a map of **12 floors** plus the **boss** floor (13). Act 1: the Gearworks; act 2: the Steamworks; act 3: the Belfry. The Clockmaker waits at the top of act 3.
- The map is a branching graph: 4 lanes wide, generated from the run seed, each floor having 2 to 4 nodes, each node linking to 1 to 2 nodes on the next floor, paths may cross lanes but not each other.
- Node types and rules:
  - **Fight** (regular enemies). Floor 1 is always a fight.
  - **Elite** (harder; drops a trinket). Not before floor 4.
  - **Event** (a short story with choices).
  - **Forge**: upgrade one part, or remove one part from your bin.
  - **Oil station**: repair 30% of max HP, or **polish**: +4 max HP.
  - **Shop**: buy parts, trinkets, a part removal, and oil (heal 15 HP).
  - Floor 12 is always an Oil station. Floor 7 is always a Forge. *(tune)*
- Mix per act *(tune)*: about 45% fights, 15% elites, 22% events, 8% shops, the fixed forge and oil floors, plus random forges and oil stations at about 10%.

### 4.2 Rewards
- After a fight: **Cogs** (gold, 12 to 20 *(tune)*) and a choice of 1 part from 3 (or skip). Rarity: common 70%, uncommon 25%, rare 5%, shifting toward rare in later acts.
- After an elite: more Cogs (25 to 35), a part choice and a trinket.
- After a boss: a rare part choice, a trinket choice of 1 from 3, and you heal 40% of the HP you've lost.
- **Brass** (the meta material) is earned throughout: see 5.2.

### 4.3 The bosses
- Act 1 boss: the **Foreman**, act 2: the **Boilermaker Queen**, act 3: the **Clockmaker**. Details in `docs/content.md`.

### 4.4 The Clockmaker (final boss)
- Three phases, each with its own HP bar (*(tune)* 110, 130, 150). Reaching 0 in a phase ends that phase at once: the board is kept, enemy statuses clear, and he speaks one short line.
- **Rewind.** At the start of each of his turns he rewinds your **strongest combination** from your previous turn: the part that contributed the most (damage dealt plus Plating gained, after all modifiers) together with the part that powered it that turn. Both are lifted off the board back into your draw pile with their charge lost, and he heals half the damage that combination dealt last turn. The cells flash and run backwards on screen. If no part fired, nothing is rewound.
  - Phase 1, **Tick**: rewinds the strongest combination.
  - Phase 2, **Tock**: rewinds the strongest combination and resets Pressure to 0.
  - Phase 3, **Midnight**: rewinds the two strongest combinations, and each turn **Jams** the Mainspring on alternate turns.
- So no single trick wins: the player keeps two or three engines going and rebuilds what he takes.
- Defeating phase 3 ends the run in victory: the victory ending, then credits.

## 5. Between runs: the Workshop

### 5.1 The hub
Every run, win or lose, ends in the **Workshop**. Sprocket greets you and reacts to the run (see 5.5). The Workshop shows: Brass and blueprints, the upgrade bench, the chassis rack, run history, and the door back up the Spire.

### 5.2 Earning
- **Brass** per run *(tune)*: 4 per floor climbed (act 2 floors count 6, act 3 floors 8), plus 10 per elite, 25 per boss, plus 50 for a victory.
- **Blueprints** are found in the Spire: every boss and elite drops one, a few events offer one, and Sprocket sniffs one out in his events. Each blueprint unlocks one specific locked part into the run pool. A run that dies still keeps its blueprints.
- About 16 of the 44 parts start locked.

### 5.3 Permanent upgrades (the upgrade bench) *(tune)*
| Upgrade | Levels | Cost per level | Effect |
|---|---|---|---|
| Reinforced Frame | 5 | 40, 60, 80, 100, 120 | +5 max HP each |
| Oiled Bearings | 3 | 50, 90, 140 | start each run with 1 random starting part upgraded per level |
| Tool Belt | 1 | 150 | hand size 4 |
| Spare Cogs | 3 | 30, 50, 70 | +25 starting Cogs each |
| Inventor's Notes | 2 | 80, 160 | part rewards offer 4 choices (level 1); the first elite each act drops an extra blueprint (level 2) |
| Lucky Charm | 1 | 120 | start each run with a random common trinket |
| Second Wind | 1 | 200 | once per run, survive a killing blow at 1 HP |

### 5.4 Chassis
A chassis is the starting archetype: its starting parts, a passive and a look for the machine frame.
- **Tinker** (unlocked at the start): balanced gears and escapements. Passive: the first time each combat you replace a part, refund the placement.
- **Stoker** (unlock: reach act 2, or 150 Brass): boilers and pistons. Passive: start every combat with 6 Pressure.
- **Horologist** (unlock: defeat the act 2 boss, or 300 Brass): cams and pendulums. Passive: your first turn of each combat has 1 extra tick.
Starting parts are in `docs/content.md`.

### 5.5 Sprocket
Sprocket greets you every time you return. His reaction depends on the run:
- **Celebration** (victory): spins, jumps, joyful barks, confetti of tiny gears.
- **Happy wiggle** (a good climb: reached act 2 or beyond, or set a new best floor).
- **Comforting nudge** (a bad run: died in act 1 without a new best): he trots over, leans on you, a soft "boof".
- **Sleepy** when you idle in the Workshop for a while.
Petting him (tap) plays a happy bark and a wiggle. His Spire appearances are in events (see content).

### 5.6 The curve (enforced by the balance simulator, see section 7)
- A first run almost never wins: with no upgrades the bot wins under 3% of runs.
- Every run earns Brass, so every run buys at least something within one or two runs.
- Following a sensible upgrade path, the bot's median first win falls between run 8 and run 12.

## 6. Saves

- Three save slots, each a whole profile (meta progress, history, an optional run in progress). Settings are global (not per slot).
- The run in progress is saved after every player action that changes state (placement, run, choice, node entered), so a reload resumes exactly where you were, mid-combat included.
- Saves carry a version number and are migrated on load.

## 7. The balance simulator

- `npm run sim -- --careers 200 --seed 1` plays complete runs headless with the real rules (`src/core`) and a bot player. Output is a Markdown report written to `balance/YYYY-MM-DD-<label>.md`.
- **Bot:** builds greedily using the preview (for each placement, it tries every hand part in every legal cell and keeps the best score: expected damage plus the value of Plating against the shown incoming attack, plus a small bonus for stored charge and pressure). It picks rewards with a simple synergy score (family counts in its bin), takes the shop's best affordable value, upgrades the most-used part at the Forge, rests when below 50% HP. Map pathing prefers fights early, elites when healthy, oil when hurt.
- **Careers:** a career starts from a fresh profile and plays runs one after another, spending Brass on a fixed sensible upgrade path (Reinforced Frame, Spare Cogs, Oiled Bearings, Tool Belt, Inventor's Notes, Second Wind, Lucky Charm, then remaining levels), and unlocking chassis as earned.
- **Report:** win rate by meta-progression level (Brass spent bands), runs-to-first-win distribution (median, quartiles), per-part pick rate and win-rate impact.
- **Win-rate impact** of a part = win rate of runs that ended with the part in the bin, divided by the overall win rate in the same meta band (a ratio; 1.0 means no effect). Parts seen in fewer than 30 runs are excluded and listed.
- **Targets, checked by tests (`tests/sim/`):**
  1. With no meta progression, win rate under 3% (at least 300 runs).
  2. Median first win between run 8 and run 12 inclusive (at least 100 careers).
  3. No part's win-rate impact is more than double the median part's impact.
