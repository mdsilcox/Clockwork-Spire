# Clockwork Spire: content catalog

Starting numbers; *(tune)* applies everywhere. Words like Strike, Plate, Boost, Echo, Charge, Release, Pressure, Momentum are defined in `docs/rules.md` 1.5. "Passes" means it passes motion on; "holds" means it stops motion that tick. Every part passes unless it says it holds.

Rarity: C common, U uncommon, R rare. **Locked** parts start outside the run pool and are unlocked by blueprints. Tooltip text in the game is the "Effect" column, word for word.

## Parts (46, 6 families)

### Gears: motion and steady damage
| id | Name | R | Locked | Effect | Upgraded (+) |
|---|---|---|---|---|---|
| spur | Spur Gear | C | | Strike 3. | Strike 5. |
| idler | Idler Gear | C | | Boost 2. | Boost 3. |
| bevel | Bevel Gear | U | | Strike 2. Also passes motion diagonally. | Strike 4. |
| crown | Crown Gear | U | | Sweep 2. | Sweep 3. |
| ratchet | Ratchet | U | yes | Gains 1 charge each time it fires. Strike 1 + its charge. | Gains 2 charge. |
| flywheel | Flywheel | R | yes | Strike half your Momentum (rounded down). | Strike half your Momentum + 3. |
| planetary | Planetary Gear | R | yes | Strike 2 for each adjacent Gear. | Strike 3 for each adjacent Gear. |
| sprocket-wheel | Sprocket Wheel | U | yes (Sprocket's blueprint) | Strike 2. The first time it fires each turn, draw 1 extra part next turn. "He was named after this. Or was it the other way round?" | Strike 4. |

### Springs: store motion, release it big
| id | Name | R | Locked | Effect | Upgraded (+) |
|---|---|---|---|---|---|
| coil | Coil Spring | C | | Holds. +1 charge. At 3: release Strike 10 and pass. | Release Strike 14. |
| leaf | Leaf Spring | C | | Holds. +1 charge. At 2: release Plate 10 and pass. | Release Plate 14. |
| torsion | Torsion Spring | U | | +1 charge. At the start of your next turn, release Strike 4 per charge. | Strike 5 per charge. |
| trap | Spring Trap | U | | +1 charge (max 5). When an enemy attacks you, release Strike 3 per charge at it. | Strike 4 per charge. |
| recoil | Recoil Spring | U | yes | Plate 2. When an adjacent part releases, +2 charge. At 4: release Sweep 8. | Release Sweep 12. |
| volute | Volute Spring | R | yes | Holds. +1 charge and Plate 2. At 4: release Strike 20 and pass. | Plate 3; release Strike 26. |
| hairspring | Hairspring | R | yes | Holds. +1 charge. At 2: release +1 tick this turn (once per turn) and pass. | Also Boost 2 on release. |

### Cams and levers: timing and triggers
| id | Name | R | Locked | Effect | Upgraded (+) |
|---|---|---|---|---|---|
| cam | Cam | C | | Every 2nd time it fires: Strike 7. | Strike 10. |
| triple-cam | Triple Cam | U | | Every 3rd time it fires: Sweep 8. | Sweep 11. |
| lever | Lever | U | | Parts this Lever powers fire with Echo. | Also Boost 1. |
| trip-hammer | Trip Hammer | C | | Plate 1. When an adjacent part releases or an adjacent Cam pays off: Strike 6. | Strike 9. |
| tappet | Tappet | U | | Adjacent Cams count one extra firing. | Also Strike 2. |
| cam-follower | Cam Follower | C | | Plate 2. When an adjacent Cam pays off: Plate 5. | Plate 3; Plate 7. |
| toggle | Toggle Switch | C | | Odd ticks: Strike 4 and pass. Even ticks: Plate 4 and hold. | 6 and 6. |

### Pendulums and escapements: tempo and ticks
| id | Name | R | Locked | Effect | Upgraded (+) |
|---|---|---|---|---|---|
| escapement | Escapement | C | | Plate 3. | Plate 5. |
| pendulum | Pendulum | U | | Strike 1. The first time it fires each turn: +1 tick this turn. | Also Plate 4. |
| anchor | Anchor Escapement | C | | Holds on tick 1. From tick 2: Plate 2 x the tick number and pass. | Plate 3 x the tick number. |
| metronome | Metronome | C | | Holds on tick 1. From tick 2: Strike 2 x the tick number and pass. | Strike 3 x the tick number. |
| balance-wheel | Balance Wheel | U | | On the last tick: Plate equal to your Momentum. | Momentum + 4. |
| verge | Verge | U | yes | Holds on tick 1. Later ticks: pass with Boost 3. | Boost 5. |
| grandfather | Grandfather Weight | R | yes | Strike 3. From your 3rd turn of a combat, the first time it fires each turn: +1 tick. | From your 2nd turn. |
| chronometer | Chronometer | R | yes | On the last tick: Strike 3 x the number of ticks this turn. | 4 x. |

### Steam: pressure, risk and payoff
| id | Name | R | Locked | Effect | Upgraded (+) |
|---|---|---|---|---|---|
| boiler | Boiler | C | | +2 Pressure. | +3 Pressure. |
| piston | Piston | C | | Spend 3 Pressure: Strike 9. Without enough Pressure: Strike 2. | Strike 13. |
| whistle | Steam Whistle | C | | Spend 2 Pressure: Scald 3 to every enemy. | Scald 4. |
| safety-valve | Safety Valve | C | | Spend up to 4 Pressure: Plate 2 per Pressure spent. | Up to 6. |
| firebox | Firebox | U | | Strike 2. +1 Pressure per adjacent Boiler. | Strike 4; +2 per Boiler. |
| kettle | Tea Kettle | U | | +1 Pressure. The first time it fires each combat: heal 3. | Heal 5. |
| condenser | Condenser | U | yes | Plate equal to half your Pressure (rounded down). | Three quarters of your Pressure. |
| steam-hammer | Steam Hammer | R | yes | Holds. On the last tick only: spend all Pressure, Strike 2 per Pressure spent. | Also Cracked 2. |
| governor | Flyball Governor | R | yes | If Pressure is above 15: spend 5, Sweep 10. | Sweep 14. |

### Chimes and tools: statuses and support
| id | Name | R | Locked | Effect | Upgraded (+) |
|---|---|---|---|---|---|
| chime | Chime | C | | Strike 1 and Dazed 1. | Strike 2 and Dazed 2. |
| bell-hammer | Bell Hammer | C | | Strike 4 and Cracked 1. | Strike 5 and Cracked 2. |
| oil-can | Oil Can | C | | Clears Rust from adjacent parts. Boost 1. | Boost 2. |
| tuning-fork | Tuning Fork | U | yes | If a Chime fired earlier this tick: Cracked 2 to every enemy. Otherwise Strike 3. | Cracked 3. |
| alarm-clock | Alarm Clock | U | yes | Scald 2. On the last tick: Scald 4 instead. | Scald 3, or 6 on the last tick. |
| gong | Gong | R | yes | If your Momentum is 8 or more: Sweep 10. | Sweep 14. |
| lamp | Inventor's Lamp | R | yes | Scald and Cracked you apply this turn are +1. | +2. |

Families: 8 + 7 + 7 + 8 + 9 + 7 = 46 parts. Locked: 17.

### Why no common dominates
Commons trade against each other on the same 3-tick turn: Spur 9 damage and Escapement 9 Plating are steady and pass every tick; Metronome (10) and Anchor (10) pay a little more but hold on tick 1, starving everything behind them that tick, and only pull ahead with extra ticks; Cam (7, then 14) is lumpy; Toggle splits damage and Plating and stops what is behind it on even ticks; springs are bigger but hold. Placement cost is the same for all, so the board position and the turn number decide which is right. The balance simulator checks this with the offer-based impact metric (rules 7).

## Chassis starting bins
| Chassis | Parts (8) | Passive |
|---|---|---|
| Tinker | Spur x3, Escapement x3, Idler, Coil Spring | First replace each combat refunds the placement. |
| Stoker | Boiler x2, Piston x2, Escapement x2, Safety Valve, Spur | Start every combat with 6 Pressure. |
| Horologist | Cam x2, Pendulum, Escapement x2, Metronome, Spur, Anchor Escapement | First turn of each combat has 1 extra tick. |

## Enemies

Intents are patterns; "Rust", "Jam", "Magnetize" and "Drain" are sabotage (rules section 2). HP values *(tune)*.

### Act 1: the Gearworks
| id | Name | HP | Behavior |
|---|---|---|---|
| rust-mite | Rust Mite | 18 | Attack 7, Attack 7, then Rusts a part. Often in pairs. |
| cog-rat | Cog Rat | 26 | Attack 5 x2, then Shell 6, repeat. |
| brass-beetle | Brass Beetle | 34 | Alternates Attack 12 and Shell 10. |
| oil-slick | Oil Slick | 28 | Attack 9, then Corroded 2 on you, repeat. |
| spring-imp | Spring Imp | 20 | Attack 4, growing by 3 each turn. |
| **Elite** gearhound | Gearhound | 70 | Attack 11 x2, then Magnetize a part, then Attack 20. |
| **Elite** tinpot-general | Tinpot General | 65 | Summons 2 Rust Mites at start; buffs allies +3 attack; Attack 13. |
| **Boss** foreman | The Foreman | 170 | Attack 16; Jam the Mainspring + Shell 14; Attack 10 x3. At half HP summons a Cog Rat. |

### Act 2: the Steamworks
| id | Name | HP | Behavior |
|---|---|---|---|
| steam-wraith | Steam Wraith | 42 | Attack 12; Corroded 2. |
| valve-crab | Valve Crab | 50 | Alternates Attack 14 and Shell 15. |
| furnace-golem | Furnace Golem | 60 | Charges up (clock icon), then Attack 26. |
| pipe-snake | Pipe Snake | 35 | Attack 5 x3; Drains 5 Pressure. |
| gauge-gremlin | Gauge Gremlin | 30 | Rusts 2 parts, then Attack 9. |
| **Elite** pressure-warden | Pressure Warden | 100 | Gains Shell equal to half your Pressure each turn; Attack 18. |
| **Elite** twin-pistons | Twin Pistons | 65 + 65 | One attacks (19) while the other shells (10); if one falls, the other enrages (+8 attack). |
| **Boss** boilermaker | The Boilermaker Queen | 260 | Attack 22, Drain 8 Pressure, Attack 20. Builds 6 heat each turn (Drain feeds it); at 20 heat unleashes Attack 40; summons a Steam Wraith at half HP. |

### Act 3: the Belfry
| id | Name | HP | Behavior |
|---|---|---|---|
| bell-ringer | Bell Ringer | 60 | Attack 18, then Jam the Mainspring + Attack 10. |
| chime-moth | Chime Moth | 36 | Attack 6 x2, then Shell 8. Comes in pairs. |
| hour-knight | Hour Hand Knight | 80 | Attack 16, Shell 14, Attack 24, repeat. |
| echo-sprite | Echo Sprite | 40 | Copies the damage your strongest part dealt last turn as its attack (min 8). |
| pendulum-blade | Pendulum Blade | 80 | Attack 8, swinging up by 4 each turn, resets after 24. |
| **Elite** minute-warden | Minute Warden | 170 | Heals 10 each turn; alternates Rusting your strongest part and Attack 28. |
| **Elite** orrery | Grand Orrery | 150 + 3 moons of 20 | Moons give it Shell 6 each per turn; Attack 24. |
| **Boss** clockmaker | The Clockmaker | 110 / 130 / 150 | Three phases with Rewind (rules 4.4). Attacks 20/24, 26/30, then 32 and Jam + Attack 36, rising each phase. |

Totals: 15 regular, 6 elites, 3 bosses.

## Encounter pools
Fights draw from their act's pool by floor; each entry is one encounter (enemy ids).
- **Act 1, floors 1-3 (easy):** rust-mite x2; cog-rat; spring-imp; oil-slick.
- **Act 1, floors 4-12:** brass-beetle; cog-rat + rust-mite; oil-slick + spring-imp; rust-mite x3; brass-beetle + rust-mite. Elites: gearhound; tinpot-general.
- **Act 2:** steam-wraith; valve-crab; furnace-golem; pipe-snake + gauge-gremlin; steam-wraith x2; valve-crab + pipe-snake. Elites: pressure-warden; twin-pistons.
- **Act 3:** bell-ringer; chime-moth x2; hour-knight; echo-sprite + chime-moth; pendulum-blade; hour-knight + echo-sprite. Elites: minute-warden; orrery.
- The same encounter is not repeated within 3 fights.

## Prices and values *(tune)*
| Item | Price |
|---|---|
| Common part | 45 Cogs |
| Uncommon part | 70 Cogs |
| Rare part | 110 Cogs |
| Common trinket | 120 Cogs |
| Uncommon trinket | 160 Cogs |
| Part removal | 60 Cogs, rising by 20 each use in a run |
| Oil (heal 15) | 30 Cogs |
| Selling a part (Oil Merchant event) | 25 Cogs |

A shop stocks 5 parts (3 common, 1 uncommon, 1 uncommon or rare), 2 trinkets, removal and oil. Prices vary by -10% to +10% from the `shop` stream.

## Reward rarity by act
| Act | Common | Uncommon | Rare |
|---|---|---|---|
| 1 | 70% | 25% | 5% |
| 2 | 55% | 35% | 10% |
| 3 | 45% | 38% | 17% |

Elite rewards shift 15 points from common to uncommon and rare. Boss rewards are all rare. Locked parts never appear until their blueprint is found.

## Trinkets (28)
| id | Name | R | Effect |
|---|---|---|---|
| oilcloth | Oilcloth | C | Start each combat with 4 Plating. |
| copper-wire | Copper Wire | C | The first part the Mainspring powers each tick gets Boost 1. |
| lucky-bolt | Lucky Bolt | C | +20% Cogs from fights. |
| whetstone | Whetstone | C | Grit 1: every Strike +1. |
| tin-cup | Tin Cup | C | Heal 3 after each combat. |
| bellows | Bellows | C | Start each combat with 4 Pressure. |
| pressure-gauge | Pressure Gauge | C | You overpressure above 25 instead of 20. |
| brass-knuckles | Brass Knuckles | C | Your first Strike each turn deals +4. |
| grease-pot | Grease Pot | C | Parts next to the Mainspring can't be Rusted. |
| magnet-ward | Magnet Ward | C | The first Magnetize each combat fails. |
| feather-duster | Feather Duster | C | Once per combat, at the start of your turn, clear all Rust. |
| blueprint-scrap | Blueprint Scrap | C | +1 Brass per floor this run. |
| pocket-watch | Pocket Watch | U | Your first turn of each combat has 1 extra tick. |
| spectacles | Inventor's Spectacles | U | Part rewards offer one more choice. |
| extra-pocket | Extra Pocket | U | +1 placement on your first turn of each combat. |
| cracked-lens | Cracked Lens | U | Cracked you apply lasts 1 more turn. |
| soot-mask | Soot Mask | U | Scald you apply is +1. |
| counterweight | Counterweight | U | Whenever a part adds a tick, Plate 3. |
| steam-locket | Steam Locket | U | When you overpressure, Sweep 10. |
| hourglass | Hourglass | U | From your 5th turn of a combat, +1 placement each turn. |
| gilded-cog | Gilded Cog | U | Shop prices -20%. |
| sprocket-tag | Sprocket's Collar Tag | U | When you skip a part reward, gain 12 Cogs (Sprocket fetched them). At each Oil station, heal 5 more. |
| clockwork-heart | Clockwork Heart | R | +8 max HP and heal 8. |
| spare-spring | Spare Spring | R | Every spring's release threshold is 1 lower (minimum 1). |
| mainspring-key | Mainspring Key | Boss | +1 tick every turn; hand size -1. |
| ember-coal | Ember Coal | Boss | Boilers give +1 Pressure. |
| echo-chamber | Echo Chamber | Boss | The first part to fire each turn fires with Echo. |
| brass-heart | Brass Heart | Boss | +15 max HP. |

## Events (22; Sprocket in 3)
Each event: a title, one to three short lines, two or three choices with clear costs. Effects are explicit before choosing.
| id | Title | Choices (summary) |
|---|---|---|
| sprocket-blueprint | A Familiar Bark | Sprocket followed you up the stairs. (1) Follow his nose: gain a blueprint (the Sprocket Wheel the first time). (2) Send him home with a pat: heal 8. |
| sprocket-pipe | Stuck Behind the Pipes | Sprocket is wedged behind a hot pipe. (1) Reach in: lose 6 HP, gain Sprocket's Collar Tag. (2) Loosen the pipe with a part: remove a part of your choice, gain the Collar Tag. |
| sprocket-nap | A Warm Boiler | Sprocket is asleep on a warm boiler. (1) Rest beside him: heal 25% of max HP. (2) Let him sleep and read the journal page under his paw: upgrade a part. |
| journal | The Inventor's Journal | (1) Read on: upgrade a random part. (2) Tear out the schematic: gain a random uncommon part. |
| oil-merchant | The Oil Merchant | (1) Buy oil: 30 Cogs, heal 20. (2) Sell a part for 25 Cogs. (3) Leave. |
| automaton | A Broken Automaton | (1) Repair it: lose 5 HP, gain a random part. (2) Scrap it: gain 30 Cogs. |
| gear-gamble | The Gear Wheel of Fortune | (1) Spin: 50% gain 60 Cogs, 50% lose 8 HP. (2) Walk on. |
| steam-bath | The Steam Bath | (1) Soak: heal 15, lose 10 Cogs. (2) Bottle the steam: gain Bellows. |
| rusted-shrine | The Rusted Shrine | (1) Pray: remove a part. (2) Polish it: lose 10 Cogs, +5 max HP. |
| mirror-clock | The Mirror Clock | (1) Duplicate a part, lose 10 HP. (2) Leave. |
| toll-gate | The Toll Gate | (1) Pay 40 Cogs. (2) Climb around: lose 7 HP. |
| choir | The Clockwork Choir | (1) Join in: gain a Chime. (2) Conduct: upgrade a Chimes and tools part, or a random part if you have none. |
| collapsed-stair | The Collapsed Stair | (1) Jump: lose 8 HP, gain 15 Brass. (2) Take the long way: lose 10 Cogs. |
| apprentice | The Apprentice's Bench | (1) Let them tinker: upgrade 2 random parts. (2) Show them how: upgrade 1 part you choose, lose 5 HP. |
| lantern | A Lantern in the Dark | (1) Take it: gain a random uncommon trinket, lose 8 HP. (2) Leave it lit: heal 5. |
| pressure-leak | The Pressure Leak | (1) Patch it with a part: remove a Steam part (or a random part), gain 40 Cogs. (2) Let it vent: lose 5 HP. |
| hour-ghost | The Hour Ghost | A faint figure winds a clock that isn't there. (1) Help: transform a part into a random part of the same rarity. (2) Ask about the inventor: lore, gain 10 Brass. |
| scrap-heap | The Scrap Heap | (1) Dig: gain a random common part. (2) Dig deeper: gain a random rare part, lose 12 HP. |
| old-forge | The Forgotten Forge | (1) Use it: upgrade a part of your choice. (2) Stoke it: lose 6 HP, upgrade 2 random parts. |
| teacup | A Teacup, Still Warm | (1) Drink: heal 12. (2) Pocket the cup: gain Tin Cup. |
| ticking-box | The Ticking Box | (1) Open: gain a random rare part, lose 6 max HP. (2) Leave it ticking. |
| lamplighter | The Lamplighter | (1) Buy a blueprint for 60 Cogs. (2) Share his lamp a while: heal 6. |

## Story beats (light)
- **Workshop:** the inventor's bench, half-finished; notes pinned to the wall reveal one line of story per run milestone (first run, first act 2, first boss, first chassis, victory).
- **Events:** the journal, the hour ghost and the lamplighter carry the inventor's story; Sprocket's three events carry the heart.
- **Clockmaker:** one short line per phase. He was built to keep time for the inventor; he would not let the hour end.
- **Ending:** the Clockmaker stops; the inventor's last note; dawn through the Spire's clock face; Sprocket runs up the final stair and the ending closes on him asleep in the sun on the Workshop doorstep. Credits.
