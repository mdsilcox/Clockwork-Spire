# Clockwork Spire: content catalog (v2)

Built against `docs/rules.md` (v2) and `docs/vision-v2.md`. v1's catalog is in git at tag `v1.0` and was the starting material. Every number is a starting value and carries *(tune)* by default; the simulator moves them. Tooltip text in the game is the "Effect" column, word for word. Words are defined in rules 1.5, 2.3, 2.4 and 3. "Passes" means it passes motion on; "holds" means it stops motion that tick. Every part passes unless it says it holds.

Conventions used in this file:
- **Rarity**: C Common, U Uncommon, R Rare, M Masterwork, L Legendary.
- **Locked**: blank = in the pool from the start. `blueprint` = unlocked by a blueprint (v1). An achievement id = unlocked only by that achievement (section 7). A locked part is never offered, fused into or salvaged; its salvage drops as 6 Scrap and a journal note (rules 2.5).
- **Enemy part rows**: `id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor`. Cadence: *every* (each enemy turn), *odd* or *even* (turns 1, 3, 5 or 2, 4, 6), *1 of 3* (turns 1, 4, 7...), *1,2 of 3*, *1,3 of 3*, *once* (at the start of the fight), *passive* (no intent, a rule while it stands). A part with two actions lists both. **Key** = keystone (yes) or not (no); regular enemies have no sealed core, so their Key is "-".
- **Core action**: when every acting part of a frame is broken, the core Bumps for the number in the enemy's header. A turn where living parts simply rest has no core action (see Rule questions, 1).
- Damage is v1's unless stated. Total enemy HP (core plus parts) stays near v1's; damage per turn stays near v1's average over the cycle.
- Events may hand you a part ("find"); that is not a reward screen. Rewards screens do not exist in v2.

## 1. Rarity tiers

| Tier | Where it comes from | Value (rules 4.5) | Upgrade cost (4.4) |
|---|---|---|---|
| Common | Salvage from regular enemies; traders; events | 20 | 15 |
| Uncommon | Salvage from regulars and elites; traders; fuse of two Commons; events | 35 | 25 |
| Rare | Salvage from elites and wardens; traders (more often in acts 2 and 3); fuse of two Uncommons; the Foreman's core; events (never a locked one) | 60 | 40 |
| Masterwork | Warden parts (Foreman, Queen); vaults; fuse of two Rares; the Foreman's and Queen's cores; traders (acts 2 and 3, rarely) | 100 | 60 |
| Legendary | The Boilermaker Queen's core only, once its achievement is earned; never sold, fused or found in events | not sold | 80 *(tune; Rule questions, 7)* |

Lock state: all 13 Rares, all 10 Masterworks and all 5 Legendaries start locked; of the Uncommons, 7 start locked (v1's). At the very start a run sees the 21 Commons and 14 Uncommons.

**Source rules**
- **Salvage** (rules 2.5): a regular enemy's parts carry Common and Uncommon parts; elite parts Uncommon and Rare; warden parts Rare and Masterwork. The Clockmaker's parts pay Brass instead (Rule questions, 5). Pure-armor parts (Bulwark and Governor plates) salvage into nothing.
- **Traders** (4.5): 4 parts and 1 trinket rolled on entry from `shop`, only from unlocked parts.
- **Fuse** (4.4, at a workbench): two parts of the same family and the same rarity become one part of the next rarity in that family. You see 2 candidates and pick 1. Candidates are the unlocked parts of the next rarity in the family that share a role tag (Strike, Plate, Boost, Hold, Charge, Pressure, Status) with either input, ties broken by `reward`; if fewer than two match, any unlocked part of that family and rarity fills in. Masterworks and Legendaries are never inputs. If a family has no unlocked part at the next rarity, the fuse is greyed with a hint ("Nothing here is ready yet").
- **Vaults** (4.4): one Masterwork (a random unlocked one from `reward`, weighted to the act's families: act 1 Gears and Cams, act 2 Springs and Steam, act 3 Pendulums and Chimes) plus 40 Scrap. If no Masterwork is unlocked: a random unlocked Rare plus 40 Scrap.
- **Warden cores** (4.7): Foreman: a Rare (a Masterwork instead one time in three, if any is unlocked). Queen: a Legendary if one is unlocked and you hold none; otherwise a Masterwork if any is unlocked, otherwise a Rare. The Clockmaker ends the run, so he drops no part (Rule questions, 5).
- **Achievements** (5.6): each Masterwork and Legendary is unlocked by exactly one achievement (section 7).

**Trader stock odds** (per part, by act; a tier with nothing unlocked folds into the tier below):

| Act | Common | Uncommon | Rare | Masterwork |
|---|---|---|---|---|
| 1 | 62% | 33% | 5% | 0% |
| 2 | 46% | 38% | 14% | 2% |
| 3 | 36% | 38% | 21% | 5% |

Trader trinket (1 per trader): act 1: C 60%, U 35%, R 5%; act 2: 40/45/15; act 3: 30/45/25. Legendary parts never appear.

**Fuse ladder** (`*` = locked at the start)

| Family | Common | Uncommon | Rare | Masterwork |
|---|---|---|---|---|
| Gears | spur, idler | bevel, crown, auger, ratchet*, sprocket-wheel* | flywheel*, planetary*, core-drill* | skewframe*, mirror-gear* |
| Springs | coil, leaf | torsion, trap, recoil* | volute*, hairspring* | twin-mainspring*, free-pawl* |
| Cams and levers | cam, trip-hammer, cam-follower, toggle, pry-bar | triple-cam, lever, tappet, wedge | sapper* | night-watchman*, resonance-rod* |
| Pendulums | escapement, anchor, metronome | pendulum, balance-wheel, verge* | grandfather*, chronometer* | hour-hand*, ballast-lance* |
| Steam | boiler, piston, whistle, safety-valve | firebox, kettle, soothing-valve, condenser* | steam-hammer*, governor* | cascade-piston* |
| Chimes and tools | chime, bell-hammer, oil-can, cold-chisel, mending-spool | tuning-fork*, alarm-clock* | gong*, lamp*, sunder* | conductors-baton* |

Early fuses are thin on purpose: Springs has only torsion and trap at Uncommon, and Chimes has no unlocked Uncommon at all until a blueprint arrives (the fuse is greyed there).

## 2. Player parts

v1's 46 parts keep every number. The only forced changes:
- **Spring Trap**: "release Strike 3 per charge at it" now strikes the attacking part (the part whose attack triggered it); if that part is broken or the attacker has no parts, the attacker's core, or its first keystone while the core is sealed.
- **Tea Kettle**: "heal 3" now reads "Patch 3" (the new word, same number).
- **Cracked, Dazed, Scald** applied by a Strike go to the whole frame of the part you hit (rules 3: core and parts alike). Whistle and Alarm Clock Scald every enemy's core as in v1.
- Overkill is lost (rules 2.3): big Strikes (Coil 10, Volute 20) are worth less against small parts. No numbers change; the simulator checks the Coil family's offer-based impact.

New words: **Pry X**: Strike X at the unbroken part with the least HP left on the enemy your next Strike would hit (ties: left to right); if that enemy has no parts, Strike X as normal (Rule questions, 2). **Shatter X**, **Drill X**, **Jam**, **Patch X** as in rules 2.3.

### Gears: motion and steady damage (10 + 2 M)
| id | Name | R | Locked | Effect | Upgraded (+) | Source |
|---|---|---|---|---|---|---|
| spur | Spur Gear | C | | Strike 3. | Strike 5. | Cog Rat Jaw (rat-jaw) |
| idler | Idler Gear | C | | Boost 2. | Boost 3. | Cog Rat Tail (rat-tail) |
| bevel | Bevel Gear | U | | Strike 2. Also passes motion diagonally. | Strike 4. | Brass Beetle Mandibles (beetle-mandibles) |
| crown | Crown Gear | U | | Sweep 2. | Sweep 3. | Gearhound Fangs (hound-fangs) |
| ratchet | Ratchet | U | blueprint | Gains 1 charge each time it fires. Strike 1 + its charge. | Gains 2 charge. | Spring Imp Wind-up Key (imp-key) |
| flywheel | Flywheel | R | blueprint | Strike half your Momentum (rounded down). | Strike half your Momentum + 3. | Twin Pistons (right) Ram (twinr-ram) |
| planetary | Planetary Gear | R | blueprint | Strike 2 for each adjacent Gear. | Strike 3 for each adjacent Gear. | Minute Warden Mender Gear (minute-mender) |
| sprocket-wheel | Sprocket Wheel | U | Sprocket's blueprint | Strike 2. The first time it fires each turn, draw 1 extra part next turn. "He was named after this. Or was it the other way round?" | Strike 4. | Event: A Familiar Bark |
| **new** auger | Auger | U | | Drill 5. | Drill 7. | Twin Pistons (left) Ram (twinl-ram); trader |
| **new** core-drill | Core Drill | R | blueprint | Holds on tick 1. From tick 2: Drill 7 and pass. | Drill 10. | Foreman Rivet Gun (foreman-rivet) |
| skewframe | Skewframe | M | `m-quick-foreman` | Strike 2. Motion passes to all 8 neighbors, diagonals included. | Strike 4. | Queen Crown (queen-crown); vault (act 1) |
| mirror-gear | Mirror Gear | M | `m-residents` | Fires as a copy of the first adjacent part (up, right, down, left) that isn't a Mirror Gear, using its own charge. | Also Boost 1. | Vault (act 1); fuse |

### Springs: store motion, release it big (7 + 2 M)
| id | Name | R | Locked | Effect | Upgraded (+) | Source |
|---|---|---|---|---|---|---|
| coil | Coil Spring | C | | Holds. +1 charge. At 3: release Strike 10 and pass. | Release Strike 14. | Spring Imp Tail (imp-tail) |
| leaf | Leaf Spring | C | | Holds. +1 charge. At 2: release Plate 10 and pass. | Release Plate 14. | Brass Beetle Shell Plate (beetle-shell) |
| torsion | Torsion Spring | U | | +1 charge. At the start of your next turn, release Strike 4 per charge. | Strike 5 per charge. | Twin Pistons (left) Shield (twinl-shield) |
| trap | Spring Trap | U | | +1 charge (max 5). When an enemy part attacks you, release Strike 3 per charge at that part. | Strike 4 per charge. | Tinpot General Sabre (tinpot-sabre) |
| recoil | Recoil Spring | U | blueprint | Plate 2. When an adjacent part releases, +2 charge. At 4: release Sweep 8. | Release Sweep 12. | Tinpot General Bugle (tinpot-bugle) |
| volute | Volute Spring | R | blueprint | Holds. +1 charge and Plate 2. At 4: release Strike 20 and pass. | Plate 3; release Strike 26. | Gearhound Haunch Piston (hound-haunch) |
| hairspring | Hairspring | R | blueprint | Holds. +1 charge. At 2: release +1 tick this turn (once per turn) and pass. | Also Boost 2 on release. | Grand Orrery Orbit Arm (orrery-arm) |
| twin-mainspring | Twin Mainspring | M | `m-all-chassis` | Place only on D2. Emits its own pulse each tick, right after the Mainspring's. | Its first powered part gets Boost 1. | Queen Clock Staff (queen-staff); vault (act 2) |
| free-pawl | Free Pawl | M | `m-calm-steam` | Springs adjacent to it charge and pass motion instead of holding. | Also Boost 1 on each release. | Foreman Furnace Grate (foreman-grate); vault (act 2) |

### Cams and levers: timing and triggers (10 + 2 M)
| id | Name | R | Locked | Effect | Upgraded (+) | Source |
|---|---|---|---|---|---|---|
| cam | Cam | C | | Every 2nd time it fires: Strike 7. | Strike 10. | Oil Slick Spitter (slick-spitter) |
| triple-cam | Triple Cam | U | | Every 3rd time it fires: Sweep 8. | Sweep 11. | Pendulum Blade Edge (blade-edge) |
| lever | Lever | U | | Parts this Lever powers fire with Echo. | Also Boost 1. | Echo Sprite Fin (sprite-fin) |
| trip-hammer | Trip Hammer | C | | Plate 1. When an adjacent part releases or an adjacent Cam pays off: Strike 6. | Strike 9. | Gauge Gremlin Spanner (gremlin-spanner) |
| tappet | Tappet | U | | Adjacent Cams count one extra firing. | Also Strike 2. | Pendulum Blade Counterweight (blade-weight) |
| cam-follower | Cam Follower | C | | Plate 2. When an adjacent Cam pays off: Plate 5. | Plate 3; Plate 7. | Trader |
| toggle | Toggle Switch | C | | Odd ticks: Strike 4 and pass. Even ticks: Plate 4 and hold. | 6 and 6. | Oil Slick Nozzle (slick-nozzle) |
| **new** pry-bar | Pry Bar | C | | Pry 4. | Pry 6. | Rust Mite Pincers (mite-pincers) |
| **new** wedge | Wedge | U | | Jam. Strike 1. | Jam. Strike 3. | Gearhound Magnet Snout (hound-snout) |
| **new** sapper | Sapper | R | blueprint | Pry 5. If it breaks a part, Plate 5. | Pry 8; Plate 8. | Foreman Wrench Arm (foreman-wrench) |
| night-watchman | Night Watchman | M | `m-break-all` | If powered this turn: before the enemies act, it fires once: Strike 7 at the first part that will act. | Strike 10. | Vault (act 1); fuse |
| resonance-rod | Resonance Rod | M | `m-burst` | Plate 1. The other two cells in its column fire with Echo. | Plate 3. | Vault (act 2); fuse |

### Pendulums and escapements: tempo and ticks (8 + 2 M)
| id | Name | R | Locked | Effect | Upgraded (+) | Source |
|---|---|---|---|---|---|---|
| escapement | Escapement | C | | Plate 3. | Plate 5. | Cog Rat Plate (rat-plate) |
| pendulum | Pendulum | U | | Strike 1. The first time it fires each turn: +1 tick this turn. | Also Plate 4. | Hour Hand Knight Sword (knight-sword) |
| anchor | Anchor Escapement | C | | Holds on tick 1. From tick 2: Plate 2 x the tick number and pass. | Plate 3 x the tick number. | Chime Moth Dust Shell (moth-dust) |
| metronome | Metronome | C | | Holds on tick 1. From tick 2: Strike 2 x the tick number and pass. | Strike 3 x the tick number. | Bell Ringer Fist (ringer-fist) |
| balance-wheel | Balance Wheel | U | | On the last tick: Plate equal to your Momentum. | Momentum + 4. | Hour Hand Knight Shield (knight-shield) |
| verge | Verge | U | blueprint | Holds on tick 1. Later ticks: pass with Boost 3. | Boost 5. | Twin Pistons (right) Shield (twinr-shield) |
| grandfather | Grandfather Weight | R | blueprint | Strike 3. From your 3rd turn of a combat, the first time it fires each turn: +1 tick. | From your 2nd turn. | Grand Orrery Moon of Dusk (orrery-moon3) |
| chronometer | Chronometer | R | blueprint | On the last tick: Strike 3 x the number of ticks this turn. | 4 x. | Minute Warden Minute Hand (minute-hand) |
| hour-hand | Hour Hand | M | `m-bells` | The parts to its left and right treat every tick as the last tick. | Also Plate 2. | Vault (act 3); fuse |
| ballast-lance | Ballast Lance | M | `m-vaults` | On the last tick: Strike equal to half your Plating (rounded up, max 20). Your Plating is kept. | Three quarters, max 24. | Vault (act 3); fuse |

### Steam: pressure, risk and payoff (10 + 1 M)
| id | Name | R | Locked | Effect | Upgraded (+) | Source |
|---|---|---|---|---|---|---|
| boiler | Boiler | C | | +2 Pressure. | +3 Pressure. | Furnace Golem Slag Fist (golem-fist) |
| piston | Piston | C | | Spend 3 Pressure: Strike 9. Without enough Pressure: Strike 2. | Strike 13. | Valve Crab Pincer (crab-pincer) |
| whistle | Steam Whistle | C | | Spend 2 Pressure: Scald 3 to every enemy. | Scald 4. | Steam Wraith Claw (wraith-claw) |
| safety-valve | Safety Valve | C | | Spend up to 4 Pressure: Plate 2 per Pressure spent. | Up to 6. | Valve Crab Valve (crab-valve) |
| firebox | Firebox | U | | Strike 2. +1 Pressure per adjacent Boiler. | Strike 4; +2 per Boiler. | Furnace Golem Heart (golem-heart) |
| kettle | Tea Kettle | U | | +1 Pressure. The first time it fires each combat: Patch 3. | Patch 5. | Steam Wraith Vent (wraith-vent) |
| condenser | Condenser | U | blueprint | Plate equal to half your Pressure (rounded down). | Three quarters of your Pressure. | Pipe Snake Drain Coil (snake-coil) |
| steam-hammer | Steam Hammer | R | blueprint | Holds. On the last tick only: spend all Pressure, Strike 2 per Pressure spent. | Also Cracked 2. | Pressure Warden Piston Fist (pw-fist) |
| governor | Flyball Governor | R | blueprint | If Pressure is above 15: spend 5, Sweep 10. | Sweep 14. | Tinpot General Tin Hat (tinpot-hat) |
| **new** soothing-valve | Soothing Valve | U | | Spend 2 Pressure: Patch 4. Without enough Pressure: Patch 1. | Patch 6; Patch 2. | Pressure Warden Dome (pw-dome) |
| cascade-piston | Cascade Piston | M | `m-no-plating` | Spend 3 Pressure: Strike 12; damage beyond what the target has left carries to the next standing entry in your target order, once. Without Pressure: Strike 3. | Strike 16. | Queen Waist Furnace (queen-furnace); vault (act 2) |

### Chimes and tools: statuses and support (10 + 1 M)
| id | Name | R | Locked | Effect | Upgraded (+) | Source |
|---|---|---|---|---|---|---|
| chime | Chime | C | | Strike 1 and Dazed 1. | Strike 2 and Dazed 2. | Chime Moth Wing (moth-wing) |
| bell-hammer | Bell Hammer | C | | Strike 4 and Cracked 1. | Strike 5 and Cracked 2. | Bell Ringer Clapper (ringer-clapper) |
| oil-can | Oil Can | C | | Clears Rust from adjacent parts. Boost 1. | Boost 2. | Rust Mite Rust Gland (mite-gland) |
| tuning-fork | Tuning Fork | U | blueprint | If a Chime fired earlier this tick: Cracked 2 to every enemy. Otherwise Strike 3. | Cracked 3. | Echo Sprite Mouth (sprite-mouth) |
| alarm-clock | Alarm Clock | U | blueprint | Scald 2. On the last tick: Scald 4 instead. | Scald 3, or 6 on the last tick. | Minute Warden Rust Needle (minute-needle) |
| gong | Gong | R | blueprint | If your Momentum is 8 or more: Sweep 10. | Sweep 14. | Grand Orrery Moon of Hush (orrery-moon1) |
| lamp | Inventor's Lamp | R | blueprint | Scald and Cracked you apply this turn are +1. | +2. | Grand Orrery Moon of Embers (orrery-moon2) |
| **new** cold-chisel | Cold Chisel | C | | Shatter 2. | Shatter 3. | Pipe Snake Fangs (snake-fangs) |
| **new** mending-spool | Mending Spool | C | | The first time it fires each turn: Patch 3. | Patch 5. | Trader |
| **new** sunder | Sunder | R | blueprint | Shatter 3 and Cracked 1. | Shatter 4 and Cracked 2. | Queen Sun-Orb Scepter (queen-scepter) |
| conductors-baton | Conductor's Baton | M | `m-status` | Strike 2. Each Cracked, Dazed or Scald applied this turn is also applied to every other enemy. | Strike 3. | Vault (act 3); fuse |

### Legendary: run-defining, one per run (5)
A Legendary joins your bin like any part; you can hold at most one per run. It comes only from the Boilermaker Queen's core, once its achievement is earned. None holds motion. Upgrade at a workbench for 80 Scrap *(tune)*.
| id | Name | R | Locked | Effect | Upgraded (+) | Source |
|---|---|---|---|---|---|---|
| perpetual-engine | Perpetual Engine | L | `h-ow5` | On the last tick, every part that fired this turn fires once more (once each, in the order first reached). | Also Plate 6. | Queen core |
| bottled-dusk | Bottled Dusk | L | `h-clockwork` | +2 ticks this turn (once per turn). Each tick after the 3rd adds 2 Pressure. | +3 ticks. | Queen core |
| sun-orb-core | Sun-Orb Core | L | `h-ow10` | You never overpressure. Spend all Pressure above 10: Sweep 2 per Pressure spent. | Sweep 3 per Pressure. | Queen core |
| apprentices-hands | Apprentice's Hands | L | `h-master` | While powered this turn, your Strikes hit the first two standing entries of your target order; the second takes half (rounded down). | The second takes three quarters. | Queen core |
| sprockets-blanket | Sprocket's Blanket | L | `h-flawless` | Plate 3. Half your Plating (rounded down, max 12) stays when it would fall away at the start of your turn. | Plate 5; keeps two thirds, max 18. | Queen core |

### Counts and notes
- Common 21, Uncommon 21, Rare 13, Masterwork 10, Legendary 5: 70 parts. v1's 46 plus 9 new C/U/R (pry-bar, cold-chisel, mending-spool, auger, wedge, soothing-valve, sapper, core-drill, sunder) plus 10 M plus 5 L. Locked at the start: v1's 17, plus sapper, core-drill, sunder, plus all 10 M and 5 L (35 in all).
- **New parts answer the enemy machines**: Pry Bar for the small part you need broken now, Cold Chisel to chip every part at once, Auger for Bulwark and Governor frames, Wedge to stall a Countdown (Rule questions, 3), and two Patch parts so healing exists in the parts economy (Mending Spool heals 3 a turn at most; Soothing Valve spends Pressure).
- **Masterworks bend one rule each**: Skewframe (a region of diagonal motion), Twin Mainspring (a second source of motion at a fixed cell), Night Watchman (acts on the enemy's turn), Resonance Rod (Echo for a column), Mirror Gear (copies a neighbor), Cascade Piston (overkill carries), Ballast Lance (Plating becomes damage), Hour Hand (last-tick effects every tick), Free Pawl (springs stop holding), Conductor's Baton (statuses spread).
- Cam Follower and Mending Spool have no enemy salvage source; they come from traders, fuse and events.

## 3. Enemies as machines

Every enemy is a frame: a core with HP and 1 to 3 parts (regulars), 3 to 5 (elites), 4 to 8 across phases (wardens). v1's HP is split between the core and its parts, so total HP matches v1. "Bump N" is the core action when every acting part is broken. Scrap is the enemy's own drop (rules 2.5). "Attack X xN" is N hits of X. Plating absorbs Attack and Siphon; it does not stop Pierce.

New enemy words used here (all in rules 2.4 except the ones flagged in Rule questions): Pierce, Corrode, Siphon, Mend, Ratchet, Countdown, Bulwark, Governor, Summon, Rust, Jam, Magnetize, Drain, Corroded; plus **Buff** (allies +N attack, v1), **Enrage** (passive: +N attack if its twin's core falls), **Rewind** (rules 4.9), **Purge** (removes every status from its frame, Rule questions, 8) and **Echo attack** (v1 Echo Sprite).

### 3.1 Act 1: the Gearworks (regulars)

**Rust Mite** (`rust-mite`): core 8, Scrap 3, Bump 3. Often in pairs.
Punishes: slow builds (the Rust Gland shuts down a part every third turn). Answer: pop the gland (4 HP) with a Pry Bar or one Spur before the third turn.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| mite-pincers | Pincers | 6 | Attack 7 | 1,2 of 3 | C | pry-bar | - | the front claws |
| mite-gland | Rust Gland | 4 | Rust 1 part | 3 of 3 | C | oil-can | - | the swollen sac on its back |

**Cog Rat** (`cog-rat`): core 8, Scrap 3, Bump 3.
Punishes: Plating stacking (the Tail ratchets while you ignore its core) and burst (the Plate eats the first 6 of a big hit). Answer: Tail first (4 HP), then the Jaw.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| rat-jaw | Gnawing Jaw | 8 | Attack 5 x2 | odd | C | spur | - | the jaw |
| rat-plate | Tin Plate | 6 | Shell 6 | even | C | escapement | - | the patch of tin on its flank |
| rat-tail | Gear Tail | 4 | Ratchet 1 (passive) | passive | C | idler | - | the cog on its tail |

**Brass Beetle** (`brass-beetle`): core 12, Scrap 4, Bump 4.
Punishes: burst (the Carapace halves everything the core takes; the Shell Plate soaks more). Answer: Drill it, or break the Carapace (6 HP) and hit the core. v1's alternating Shell is now the Shell Plate.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| beetle-mandibles | Mandibles | 8 | Attack 12 | odd | U | bevel | - | the mandibles |
| beetle-shell | Shell Plate | 8 | Shell 10 | even | C | leaf | - | the underside plate |
| beetle-carapace | Carapace | 6 | Bulwark (passive) | passive | C | none | - | the domed back |

**Oil Slick** (`oil-slick`): core 14, Scrap 4, Bump 3.
Punishes: Plating stacking (the Nozzle strips Plating just before the Spitter fires). Answer: break the Nozzle (7 HP) first; then Plate is worth something.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| slick-nozzle | Drip Nozzle | 7 | Corrode 6 and Corroded 2 on you | odd | C | toggle | - | the dripping spout |
| slick-spitter | Spitter | 7 | Attack 9 | odd | C | cam | - | the open mouth |

**Spring Imp** (`spring-imp`): core 10, Scrap 3, Bump 3.
Punishes: slow builds and Plating (its Tail grows every turn, its Key ratchets while the core is ignored). Answer: Key (4 HP) and Tail (6 HP) die first; the core is a small target.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| imp-tail | Coil Tail | 6 | Attack 4, +3 each time it acts | every | C | coil | - | the coiled tail |
| imp-key | Wind-up Key | 4 | Ratchet 1 (passive) | passive | U | ratchet | - | the key in its back |

### 3.2 Act 1: elites and the Foreman

**Gearhound** (`gearhound`): core 26 sealed, Scrap 14, Bump 6. Patrols.
Punishes: Plating stacking (the Haunch Pierces on turn 3) and slow builds (Magnetize). Answer: the Haunch first, before turn 3; then the Fangs. Sealed until Fangs and Haunch are broken.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| hound-fangs | Fangs | 14 | Attack 11 x2 | 1 of 3 | U | crown | yes | the open jaws |
| hound-snout | Magnet Snout | 10 | Magnetize a part | 2 of 3 | U | wedge | no | the nose |
| hound-haunch | Haunch Piston | 20 | Pierce 16 | 3 of 3 | R | volute | yes | the hind leg |

**Tinpot General** (`tinpot-general`): core 20 sealed, Scrap 14, Bump 5. Patrols.
Punishes: burst (the Tin Hat caps every Strike at 10; Mites soak splash). Answer: Bugle first (it buffs everyone), then the Sabre; Auger ignores the Hat. At the start the Horn summons 2 Rust Mites (full frames, 18 HP each as v1).
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| tinpot-horn | Barracks Horn | 9 | Summon 2 Rust Mites | once | U | Brass Key | no | the horn at its hip |
| tinpot-bugle | Bugle | 10 | Buff allies +3 attack | every | U | recoil | yes | the bugle in its hand |
| tinpot-sabre | Sabre | 14 | Attack 13 | every | U | trap | yes | the sabre arm |
| tinpot-hat | Tin Hat | 12 | Governor 10 (passive) | passive | R | governor | no | the dented hat |

**The Foreman** (`foreman`): core 72 (sealed in phase 1), Scrap 30, Bump 6. Warden, two phases. Target: about 7 turns (3 plus 4) for the expert bot.
Opening line: "Late again. The shift starts at dusk, apprentice."
- **Phase 1: On the line** (mechanic: Jam and Shell). Keystones: Wrench Arm, Furnace Grate.
- Phase beat: "Mind your fingers. Mind the clamps. Mind the time." Phase action: **Summon a Cog Rat** (shown before it happens), the Apron is torn off.
- **Phase 2: The line runs hot** (mechanic: Bulwark). Core exposed behind a Bulwark. No keystones; the Rivet Gun and Cog Rat are optional but dangerous.
Cycle: Wrench Arm Attack 16 (turn 1 of 3), Furnace Grate Jam the Mainspring (turn 2 of 3, with the Apron's Shell 14), Rivet Gun Attack 10 x3 (turn 3 of 3, phase 2).
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor | Phase |
|---|---|---|---|---|---|---|---|---|---|
| foreman-wrench | Wrench Arm | 26 | Attack 16 | 1 of 3 | R | sapper | yes | the great wrench in his right hand | 1 |
| foreman-grate | Furnace Grate | 22 | Jam the Mainspring | 2 of 3 | M | free-pawl | yes | the grate in his chest | 1 |
| foreman-apron | Apron Plate | 16 | Shell 14 | 2 of 3 | R | none | no | the leather apron | 1 |
| foreman-bulwark | Boiler Plate | 24 | Bulwark (passive) | passive | R | none | no | the plate bolted over his chest | 2 |
| foreman-rivet | Rivet Gun | 18 | Attack 10 x3 | 3 of 3 | R | core-drill | no | the rivet gun on his left arm | 2 |
The summoned Cog Rat is a full frame (section 3.1). Totals: phase 1 parts 64, phase 2 core 72 plus parts 42, plus the rat 26: about 204 against v1's 196.

### 3.3 Act 2: the Steamworks (regulars)

**Steam Wraith** (`steam-wraith`): core 20, Scrap 4, Bump 4.
Punishes: Plating stacking (Siphon heals it by the Plating it eats). Answer: break the Claw (14 HP) first; Plating is then free.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| wraith-claw | Hollow Claw | 14 | Siphon 12 | odd | C | whistle | - | the long claw |
| wraith-vent | Chill Vent | 8 | Corroded 2 on you | even | U | kettle | - | the vent in its chest |

**Valve Crab** (`valve-crab`): core 24, Scrap 5, Bump 4.
Punishes: burst (the Valve's Shell 15 swallows a Coil). Answer: Break the Valve (12 HP) or strike on the turns it isn't shelling (odd turns); a Pry Bar finds it.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| crab-pincer | Pincer | 14 | Attack 14 | odd | C | piston | - | the big pincer |
| crab-valve | Shell Valve | 12 | Shell 15 | even | C | safety-valve | - | the brass valve on its back |

**Furnace Golem** (`furnace-golem`): core 28, Scrap 5, Bump 5.
Punishes: Plating stacking (the Heart is a Countdown that Pierces). Answer: break the Heart (22 HP) inside three turns, or Wedge it. After it is broken the Fist is a feeble Attack 6.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| golem-heart | Furnace Heart | 22 | Countdown 3: Pierce 22 | countdown | U | firebox | - | the glowing door in its chest |
| golem-fist | Slag Fist | 10 | Attack 6 | every | C | boiler | - | the slag fist |

**Pipe Snake** (`pipe-snake`): core 16, Scrap 4, Bump 3.
Punishes: Pressure (the Coil drains it) and Plating (its fangs Pierce). Answer: the Drain Coil (9 HP) first if you play Steam; otherwise the Fangs.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| snake-fangs | Fangs | 10 | Pierce 4 x3 | odd | C | cold-chisel | - | the forked head |
| snake-coil | Drain Coil | 9 | Drain 5 Pressure | even | U | condenser | - | the coiled tail pipe |

**Gauge Gremlin** (`gauge-gremlin`): core 14, Scrap 4, Bump 3.
Punishes: slow builds and set-ups (Rust 2 parts then a hit). Answer: Wrench Hand first (8 HP, drops a Brass Key), with an Oil Can nearby.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| gremlin-wrench | Wrench Hand | 8 | Rust 2 parts | odd | C | Brass Key | - | the oversized wrench |
| gremlin-spanner | Spanner | 8 | Attack 9 | even | C | trip-hammer | - | the spanner |

### 3.4 Act 2: elites and the Boilermaker Queen

**Pressure Warden** (`pressure-warden`): core 50 sealed, Scrap 14, Bump 6. Patrols.
Punishes: Pressure (the Dome Shells for half your Pressure) and burst. Answer: Dome first (20 HP), or keep Pressure low. Sealed until Dome and Fist are broken.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| pw-dome | Pressure Dome | 20 | Shell equal to half your Pressure | every | U | soothing-valve | yes | the glass dome on its head |
| pw-fist | Piston Fist | 16 | Attack 18 | every | R | steam-hammer | yes | the piston fist |
| pw-valve | Intake Valve | 14 | Drain 6 Pressure | even | U | Brass Key | no | the valve at its side |

**Twin Pistons** (`twin-pistons`): two frames, each core 29, Scrap 9 each, Bump 5. Patrols as a pair. Each frame is its own enemy, 65 HP, as v1 (65 plus 65).
Punishes: burst (one shells while the other hits; kill one and the other enrages). Answer: Link first on one twin, then its core; break the twin's Shield turns carefully. Left twin: Ram odd, Shield even. Right twin: Shield odd, Ram even.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| twinl-ram | Left Ram | 16 | Attack 19 | odd | U | auger | - | the left piston rod |
| twinl-shield | Left Shield | 12 | Shell 10 | even | U | torsion | - | the left cylinder cap |
| twinl-link | Left Linkage | 8 | Enrage +8 (passive: if the right twin's core falls) | passive | U | none | - | the crossbar between them |
| twinr-ram | Right Ram | 16 | Attack 19 | even | R | flywheel | - | the right piston rod |
| twinr-shield | Right Shield | 12 | Shell 10 | odd | U | verge | - | the right cylinder cap |
| twinr-link | Right Linkage | 8 | Enrage +8 (passive: if the left twin's core falls) | passive | U | none | - | the crossbar between them |

**The Boilermaker Queen** (`boilermaker`): core 84 (sealed in phases 1 and 2), Scrap 30, Bump 6. Warden, three phases, about 8 turns.
Opening line: "You knock at my fire like it was a door."
- **Phase 1: Banked Fire** (mechanic: heat and Drain). Keystones: Crown, Sun-Orb Scepter. The Chest Gauge (not a keystone) builds heat: +6 each of her turns, +1 for each Pressure the Scepter drains; at 20 it releases Pierce 28 and resets. Breaking it defuses heat for good (until the Furnace rebuilds it).
- Phase beat: "Stay a while," the Queen says. "It's so warm in here." Phase action: **Summon a Steam Wraith**.
- **Phase 2: Full Steam** (mechanic: Mend and Siphon). Keystones: Waist Furnace (rebuilds one broken part at half HP on even turns), Clock Staff.
- Phase beat: "Oh, don't look so sad. It's only a little fire." Phase action: **Mend** (rebuilds the Chest Gauge at half HP if broken).
- **Phase 3: Last Ember** (mechanic: Bulwark). Core exposed behind the Ember Shell; her Cinder Hand burns every turn.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor | Phase |
|---|---|---|---|---|---|---|---|---|---|
| queen-crown | Crown | 26 | Attack 22 | odd | M | skewframe | yes | the spired crown | 1 |
| queen-scepter | Sun-Orb Scepter | 26 | Drain 8 Pressure | even | R | sunder | yes | the sun-orb in her scepter | 1 |
| queen-gauge | Chest Gauge | 24 | Heat: Countdown 20, Pierce 28 (see above) | every | R | none | no | the gauge on her chest | 1, 2 |
| queen-furnace | Waist Furnace | 34 | Mend: rebuild one broken part at half HP | even | M | cascade-piston | yes | the furnace at her waist | 2 |
| queen-staff | Clock Staff | 24 | Siphon 20 | odd | M | twin-mainspring | yes | the clock staff in her other hand | 2 |
| queen-ember | Ember Shell | 26 | Bulwark (passive) | passive | R | none | no | the glowing skirt plates | 3 |
| queen-cinder | Cinder Hand | 20 | Attack 22 | every | R | none | no | the hand she keeps in the fire | 3 |
Totals: phase 1 parts 76, phase 2 parts 58, phase 3 core 84 plus parts 46, plus the Wraith 42: about 306 against v1's 302.

### 3.5 Act 3: the Belfry (regulars)

**Bell Ringer** (`bell-ringer`): core 22, Scrap 5, Bump 5.
Punishes: Plating stacking (the Clapper Pierces) and every plan that needs the Mainspring (the Rope Jams it). Answer: Rope first (12 HP, a Brass Key), then Clapper.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| ringer-clapper | Clapper | 16 | Pierce 14 | odd | C | bell-hammer | - | the iron clapper |
| ringer-fist | Ringer's Fist | 10 | Attack 10 | even | C | metronome | - | the ringing fist |
| ringer-rope | Bell Rope | 12 | Jam the Mainspring | even | C | Brass Key | - | the rope over its shoulder |

**Chime Moth** (`chime-moth`): core 22, Scrap 3 each, Bump 3. Comes in pairs.
Punishes: burst (two bodies split a big Strike's worth; each Shells every other turn). Answer: Sweep or Chisel the pair; Dust Shells first.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| moth-wing | Wing Chime | 8 | Attack 6 x2 | odd | C | chime | - | the chiming wing |
| moth-dust | Dust Shell | 6 | Shell 8 | even | C | anchor | - | the dust on its back |

**Hour Hand Knight** (`hour-knight`): core 38, Scrap 6, Bump 6.
Punishes: burst (the Visor caps Strikes at 12; the Shield soaks the middle turn). Answer: Drill the Visor away (14 HP) or hit with several small Strikes.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| knight-sword | Hand Sword | 14 | Attack 20 | 1,3 of 3 | U | pendulum | - | the hour-hand sword |
| knight-shield | Dial Shield | 12 | Shell 14 | 2 of 3 | U | balance-wheel | - | the clock-dial shield |
| knight-visor | Visor | 16 | Governor 12 (passive) | passive | U | none | - | the visored helm |

**Echo Sprite** (`echo-sprite`): core 20, Scrap 4, Bump 4.
Punishes: burst (the Mouth echoes your biggest single hit last turn, min 8, max 24 *(tune)*). Answer: spread damage across many small hits; break the Mouth (12 HP).
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| sprite-mouth | Echo Mouth | 12 | Echo attack: your largest single hit last turn (8 to 24) | every | U | tuning-fork | - | the open mouth |
| sprite-fin | Mirror Fin | 8 | Shell 8 | even | U | lever | - | the mirror-bright fin |

**Pendulum Blade** (`pendulum-blade`): core 36, Scrap 5, Bump 6.
Punishes: Plating stacking (the Blade swings up 8, 12, 16, 20, 24, then resets; the Counterweight ratchets while you ignore the core). Answer: break the Blade (26 HP) before it passes 16, or break it every cycle.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| blade-edge | Swinging Edge | 26 | Attack 8, +4 each time it acts, resets after 24 | every | U | triple-cam | - | the pendulum blade |
| blade-weight | Counterweight | 18 | Ratchet 2 (passive) | passive | U | tappet | - | the brass weight at its base |

### 3.6 Act 3: elites and the Clockmaker

**Minute Warden** (`minute-warden`): core 80 sealed, Scrap 16, Bump 8. Patrols.
Punishes: slow builds and burst (the Mender heals 10 a turn; the Dial caps Strikes at 22). Answer: Mender first (26 HP); sealed until Mender and Minute Hand are broken.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| minute-mender | Mender Gear | 26 | Mend 10 (core) | every | R | planetary | yes | the wheel in its chest |
| minute-hand | Minute Hand | 24 | Attack 28 | even | R | chronometer | yes | the long hand |
| minute-needle | Rust Needle | 12 | Rust your strongest part | odd | U | alarm-clock | no | the needle at its wrist |
| minute-dial | Dial | 28 | Governor 22 (passive) | passive | U | none | no | the clock face on its belly |

**Grand Orrery** (`orrery`): core 80 sealed, Scrap 18, Bump 8. Patrols.
Punishes: burst and slow builds (three Moons Shell it for 6 each per turn; the Ring halves core damage). Answer: break the Moons one by one (20 HP each); sealed until all three fall. Ring (40 HP) after.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| orrery-moon1 | Moon of Hush | 20 | Shell 6 (on the Orrery) | every | R | gong | yes | the nearest, palest moon |
| orrery-moon2 | Moon of Embers | 20 | Shell 6 | every | R | lamp | yes | the red moon |
| orrery-moon3 | Moon of Dusk | 20 | Shell 6 | every | R | grandfather | yes | the slow, far moon |
| orrery-arm | Orbit Arm | 30 | Attack 24 | every | R | hairspring | no | the long brass arm |
| orrery-ring | Brass Ring | 40 | Bulwark (passive) | passive | U | none | no | the great ring around the core |
Orrery is 210 HP against v1's 150 plus 3 moons of 20 (210).

**The Clockmaker** (`clockmaker`): core 84 (exposed only in Midnight), Scrap 0 (Brass instead, 4 per part), Bump 8. Warden, three phases, about 9 turns for the expert bot, at least 2 per phase.
Opening line: "Welcome back. It's still evening."
**He remembers** (rules 5.4): he starts the fight with one extra non-keystone part answering your last three runs' main plan (below).
**Rewind** is the action of each phase's rewinding part (Rule questions, 4): at the start of his turn it lifts your strongest combination off the board. Breaking the part stops that Rewind until the next phase's part arrives.
- **Phase 1: Tick** (mechanic: Rewind). Keystones: Hour Hand, Tick Spring.
- Phase beat: "Tick," says the Clockmaker. "You hear it too? Good. Someone should." Phase action: **Rewind** at once (lifts your strongest combination).
- **Phase 2: Tock** (mechanic: Pressure reset). Keystones: Minute Hand, Tock Weight (which also sets Pressure to 0 on each Rewind).
- Phase beat: "It's almost midnight. It's always almost midnight." Phase action: **Jam the Mainspring** for his next turn.
- **Phase 3: Midnight** (mechanic: Governor and two Rewinds). The core is exposed behind the Governor Frame (no Strike over 14). Hour Wheel rewinds two combinations; the Midnight Bell strikes 32 and, every other turn, Jams the Mainspring with Attack 36.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor | Phase |
|---|---|---|---|---|---|---|---|---|---|
| clock-hour | Hour Hand | 28 | Attack 20 | every | R | Brass 4 | yes | the hour hand across his chest | 1 |
| clock-tick | Tick Spring | 26 | Rewind 1 combination | every | R | Brass 4 | yes | the mainspring in his side | 1 |
| clock-minute | Minute Hand | 34 | Attack 28 | every | R | Brass 4 | yes | the minute hand he carries like a spear | 2 |
| clock-tock | Tock Weight | 32 | Rewind 1 combination and Pressure to 0 | every | R | Brass 4 | yes | the pendulum weight under his ribs | 2 |
| clock-gov | Governor Frame | 24 | Governor 14 (passive) | passive | R | none | no | the brass frame around his core | 3 |
| clock-wheel | Hour Wheel | 28 | Rewind 2 combinations | every | R | Brass 4 | no | the great wheel behind his head | 3 |
| clock-bell | Midnight Bell | 26 | Attack 32 (odd turns); Jam the Mainspring and Attack 36 (even turns) | odd / even | R | Brass 4 | no | the bell in his chest | 3 |
Totals without the memory part: phase 1 parts 54, phase 2 parts 66, phase 3 core 84 plus parts 78: 282. With the memory part: about 306.

**Memory parts** (one per fight, non-keystone, present from phase 1, 22 to 24 HP; chosen by your last three runs' main plan):
| Plan | id | Name | HP | Action | Cadence | Anchor |
|---|---|---|---|---|---|---|
| Plating | mem-drill | Pierce Drill | 24 | Pierce 14 | every | the drill on his shoulder |
| Burst | mem-governor | Governor Cap | 24 | Governor 12 (passive) | passive | the cap on his head |
| Pressure | mem-valve | Drain Valve | 22 | Drain 8 Pressure | every | the valve at his collar |
| Statuses | mem-chime | Purge Chime | 22 | Purge (clears every status on his frame) | every | the small chime at his belt |
Each pays Brass 4. The archivist names the part before the run (rules 5.4); if you have no history yet, there is none.

### 3.7 Counterplay tally (rules 2.4)
- **Plating stacking is punished** (Pierce, Corrode, Siphon, Ratchet or Countdown): Cog Rat, Oil Slick, Spring Imp, Steam Wraith, Furnace Golem, Pipe Snake, Bell Ringer, Pendulum Blade: 8 of 15 regulars; elites Gearhound; wardens Queen (heat Pierce, Siphon), Clockmaker (Pierce drill).
- **Burst is punished** (Bulwark, Governor, Shell, sealed or split): Cog Rat (Shell), Brass Beetle (Bulwark), Valve Crab (Shell), Chime Moth (split plus Shell), Hour Hand Knight (Governor), Echo Sprite (echo back): 6 of 15 regulars; every elite is sealed or governed; every warden's last phase is behind a Bulwark or Governor.
- **Pressure**: Pipe Snake, Pressure Warden, the Queen's Scepter, the Clockmaker's Tock Weight and Drain Valve. **Statuses**: the Clockmaker's Purge Chime; the Minute Warden's Mender (Mend 10) outheals slow Scald.
- **Slow builds**: Rust Mite, Gauge Gremlin, Bell Ringer (Jam), Gearhound (Magnetize), Minute Warden (Rust).
- Every regular has at least one part that punishes one of the two big plans; "Punishes" lines above are the contract.

## 4. Encounter pools

Fight rooms draw from their act's pool by floor depth (rules 4.1: 5 to 6 floors, 7 to 9 fight rooms per act). Floors count up from the entry floor; with 5 floors the bands are 1 to 2, 3, 4 to 5; with 6 floors, 1 to 2, 3 to 4, 5 to 6. The first fight room next to the entry is always drawn from the easy band. The same encounter is not repeated within 3 fights. Each entry is one encounter (enemy ids).

| Act | Easy band | Middle band | Deep band |
|---|---|---|---|
| 1 | rust-mite x2; cog-rat; spring-imp; oil-slick | brass-beetle; cog-rat + rust-mite; oil-slick + spring-imp; rust-mite x3 | brass-beetle + rust-mite; brass-beetle + cog-rat; cog-rat + spring-imp + rust-mite |
| 2 | steam-wraith; gauge-gremlin; pipe-snake; valve-crab | furnace-golem; pipe-snake + gauge-gremlin; steam-wraith x2; valve-crab + pipe-snake | furnace-golem + gauge-gremlin; valve-crab + steam-wraith; furnace-golem + pipe-snake |
| 3 | bell-ringer; chime-moth x2; echo-sprite; pendulum-blade | hour-knight; echo-sprite + chime-moth; bell-ringer + chime-moth | hour-knight + echo-sprite; pendulum-blade + chime-moth; bell-ringer + hour-knight |

**Elite patrols** (rules 4.3: elites never enter the entry room or the warden's door; loops of 3 to 5 rooms, drawn as dotted paths):
- **Act 1**: one elite on patrol, Gearhound or Tinpot General (`map` stream picks). Loop of 4 rooms across floors 2 to 4, passing the workbench's floor so a careless detour meets it. The other elite is not on patrol; if the act has a vault, it is the guardian.
- **Act 2**: both elites patrol. Pressure Warden: a 5-room loop through the pipe floor in the middle of the section. Twin Pistons: a 3-room loop on one floor; the two frames step together and are fought together. Neither is a vault guardian unless the `map` stream rolls a second copy for the vault (below).
- **Act 3**: both elites patrol. Minute Warden: a 4-room loop around the belfry stair, one step per hour. Grand Orrery: a slow 5-room loop on the top floor, it passes the warden's approach (never the door itself).
- A defeated elite drops a trinket from its act's pool, its salvage and a blueprint (v1, rules 4.3).

**Vault guardians** (rules 4.4): a fixed, stationary elite behind a locked door, with one added part, the **Padlock** (`vault-padlock`, HP 12, Bulwark passive, salvage Brass Key, anchor "the padlock on its back"; elite part limit 5, so the Orrery guardian has no Brass Ring). A guardian gives no Scrap of its own; the vault gives a Masterwork and 40 Scrap.
| Act | Guardian | Notes |
|---|---|---|
| 1 | Tinpot General (or Gearhound if Tinpot patrols) | The Horn's mites come out when you open the door. |
| 2 | Pressure Warden (a second copy if it also patrols) | Bring Pressure-light parts. |
| 3 | Grand Orrery without its Ring | The Padlock stands where the Ring was. |
After the first opened vault, its landmark (5.4, `m-vault-open`) replaces the guardian with a regular fight from the middle band in every later run.

## 5. Trinkets (36)

v1's 28, with the changes noted, plus 8 new. Elites drop from their act's pool; traders sell C, U, R (rules 4.5); wardens offer a choice of 3 from the Boss pool (v1). Values: C 60, U 90, R 120 Scrap *(tune)*.

| id | Name | R | Effect | v2 change |
|---|---|---|---|---|
| oilcloth | Oilcloth | C | Start each combat with 4 Plating. | none |
| copper-wire | Copper Wire | C | The first part the Mainspring powers each tick gets Boost 1. | none |
| lucky-bolt | Lucky Bolt | C | +20% Scrap from fights. | Cogs became Scrap |
| whetstone | Whetstone | C | Grit 1: every Strike +1. | none |
| tin-cup | Tin Cup | C | Heal 3 after each combat. | none |
| bellows | Bellows | C | Start each combat with 4 Pressure. | none |
| pressure-gauge | Pressure Gauge | C | You overpressure above 25 instead of 20. | none |
| brass-knuckles | Brass Knuckles | C | Your first Strike each turn deals +4. | none |
| grease-pot | Grease Pot | C | Parts next to the Mainspring can't be Rusted. | none |
| magnet-ward | Magnet Ward | C | The first Magnetize each combat fails. | none |
| feather-duster | Feather Duster | C | Once per combat, at the start of your turn, clear all Rust. | none |
| blueprint-scrap | Blueprint Scrap | C | +1 Brass per room you clear this run. | "per floor" became "per room cleared" (rules 5.2) |
| pocket-watch | Pocket Watch | U | Your first turn of each combat has 1 extra tick. | none |
| spectacles | Inventor's Spectacles | U | Traders stock one more part, and a fuse shows a third candidate. | "part rewards offer one more choice" removed with reward screens |
| extra-pocket | Extra Pocket | U | +1 placement on your first turn of each combat. | none |
| cracked-lens | Cracked Lens | U | Cracked you apply lasts 1 more turn. | none |
| soot-mask | Soot Mask | U | Scald you apply is +1. | none |
| counterweight | Counterweight | U | Whenever a part adds a tick, Plate 3. | none |
| steam-locket | Steam Locket | U | When you overpressure, Sweep 10. | none |
| hourglass | Hourglass | U | From your 5th turn of a combat, +1 placement each turn. | none |
| gilded-cog | Gilded Cog | U | Trader prices -20%. | "shop" became "trader" |
| sprocket-tag | Sprocket's Collar Tag | U | When you scrap a salvaged part, gain 2 extra Scrap (Sprocket fetched it). At each Oil station, heal 5 more. | "skip a part reward, gain 12 Cogs" replaced |
| clockwork-heart | Clockwork Heart | R | +8 max HP and heal 8. | none |
| spare-spring | Spare Spring | R | Every spring's release threshold is 1 lower (minimum 1). | none |
| mainspring-key | Mainspring Key | Boss | +1 tick every turn; hand size -1. | none |
| ember-coal | Ember Coal | Boss | Boilers give +1 Pressure. | none |
| echo-chamber | Echo Chamber | Boss | The first part to fire each turn fires with Echo. | none |
| brass-heart | Brass Heart | Boss | +15 max HP. | none |
| **new** aimed-lens | Aimed Lens | U | Your first Strike each turn deals +3 to a part (not a core). | target order |
| **new** scrap-magnet | Scrap Magnet | C | +1 Scrap for each enemy part you break. | salvage |
| **new** salvage-tongs | Salvage Tongs | U | Wrecked parts (still standing when the core dies) drop 3 Scrap each instead of 1. | salvage |
| **new** dusk-lantern | Dusk Lantern | U | Each act's midnight arrives 1 hour later (13 hours on Journeyman). | the clock |
| **new** pocket-sundial | Pocket Sundial | R | Resting at an oil station takes no extra hour. | the clock |
| **new** bell-cord | Bell Cord | C | Ringing the bell early pays 2 more Scrap per hour left. | the clock |
| **new** breakers-mallet | Breaker's Mallet | U | When you break an enemy part, Plate 4. | breaking parts |
| **new** mending-thread | Mending Thread | C | Patch parts heal 2 more. | healing |

Counts: 15 Common (12 v1, 3 new), 14 Uncommon (10 v1, 4 new), 3 Rare (2 v1, 1 new), 4 Boss: 36 trinkets.

## 6. Events

Adapted from v1's 22 plus 6 new (28 total), each tied to a room (rules 4.4: 3 to 4 events per act). Costs: Cogs became **Scrap**; "part rewards" and shops are gone, so events that handed out a random part now say "find" (a part from the event, not a reward screen); a locked part never turns up. Some choices cost or refund **hours** (Rule questions, 9). **Resident**: the event can send a person to Bellfoot after the run (rules 5.4); taking that choice means giving up the others. **Landmark**: a feat that changes later runs (rules 5.4). Sprocket keeps his three events.

| id | Act | Title | Choices (summary) | Resident | Landmark |
|---|---|---|---|---|---|
| sprocket-blueprint | 1 to 3 | A Familiar Bark | Sprocket followed you up the stairs. (1) Follow his nose: gain a blueprint (the Sprocket Wheel the first time). (2) Send him home with a pat: heal 8. | | |
| sprocket-pipe | 1 to 3 | Stuck Behind the Pipes | Sprocket is wedged behind a hot pipe. (1) Reach in: lose 6 HP, gain Sprocket's Collar Tag. (2) Loosen the pipe with a part: remove a part of your choice, gain the Collar Tag. | | |
| sprocket-nap | 1 to 3 | A Warm Boiler | Sprocket is asleep on a warm boiler. (1) Rest beside him: heal 25% of max HP. (2) Let him sleep and read the journal page under his paw: upgrade a part. | | |
| journal | 1 to 3 | The Inventor's Journal | (1) Read on: upgrade a random part. (2) Tear out the schematic: find a random uncommon part. | | |
| oil-merchant | 1 to 2 | The Oil Merchant | (1) Buy oil: 30 Scrap, heal 20. (2) Sell a part for 25 Scrap. (3) Tell him about Bellfoot: he moves down after the run. | Oil Merchant | |
| automaton | 1 to 2 | A Broken Automaton | (1) Repair it: lose 5 HP, find a random common or uncommon part. (2) Scrap it: gain 30 Scrap. | | |
| gear-gamble | 1 to 3 | The Gear Wheel of Fortune | (1) Spin: 50% gain 60 Scrap, 50% lose 8 HP (odds shown). (2) Walk on. | | |
| steam-bath | 2 | The Steam Bath | (1) Soak: heal 15, lose 10 Scrap. (2) Bottle the steam: gain Bellows. | | |
| rusted-shrine | 1 to 3 | The Rusted Shrine | (1) Pray: remove a part. (2) Polish it: lose 10 Scrap, +5 max HP. | | |
| mirror-clock | 2 to 3 | The Mirror Clock | (1) Duplicate a part, lose 10 HP. (2) Wind the clock back: regain 1 hour (never past hour 0). | | |
| toll-gate | 1 to 2 | The Toll Gate | (1) Pay 40 Scrap. (2) Climb around: lose 7 HP. | | |
| choir | 2 to 3 | The Clockwork Choir | (1) Join in: gain a Chime. (2) Conduct: upgrade a Chimes and tools part, or a random part if you have none. | | |
| collapsed-stair | 1 to 2 | The Collapsed Stair | (1) Jump: lose 8 HP, gain 15 Brass. (2) Take the long way: costs 1 hour. | | |
| apprentice | 1 to 2 | The Apprentice's Bench | (1) Let them tinker: upgrade 2 random parts. (2) Show them how: upgrade 1 part you choose, lose 5 HP. (3) Invite them to Bellfoot: they move down after the run. | Apprentice | |
| lantern | 1 to 3 | A Lantern in the Dark | (1) Take it: gain a random uncommon trinket, lose 8 HP. (2) Leave it lit: heal 5. | | |
| pressure-leak | 2 | The Pressure Leak | (1) Patch it with a part: remove a Steam part (or a random part), gain 40 Scrap. (2) Let it vent: lose 5 HP. | | |
| hour-ghost | 1 to 3 | The Hour Ghost | A faint figure winds a clock that isn't there. (1) Help: transform a part into a random unlocked part of the same rarity. (2) Ask about the inventor: lore, gain 10 Brass. (3) Ask him to come down to Bellfoot: he moves into the archivist's chair. | Hour Ghost | |
| scrap-heap | 1 to 2 | The Scrap Heap | (1) Dig: find a random common part. (2) Dig deeper: find a random unlocked rare part (an uncommon if none), lose 12 HP. | | |
| old-forge | 1 to 3 | The Forgotten Forge | (1) Use it: upgrade a part of your choice. (2) Stoke it: lose 6 HP, upgrade 2 random parts. | | |
| teacup | 1 to 3 | A Teacup, Still Warm | (1) Drink: heal 12. (2) Pocket the cup: gain Tin Cup. | | |
| ticking-box | 2 to 3 | The Ticking Box | (1) Open: find a random unlocked rare part (an uncommon if none), lose 6 max HP. (2) Leave it ticking. | | |
| lamplighter | 1 | The Lamplighter | He is stuck on a broken lift. (1) Buy a blueprint: 60 Scrap. (2) Share his lamp a while: heal 6. (3) Fix the lift: give him a Cams and levers part; the lift runs again, and he moves down after the run. | Lamplighter | The repaired lift (a shortcut in the Gearworks) |
| **new** traders-cousin | 1 to 3 | The Trader's Cousin | A lost trader with a cart of oddities. (1) Buy his map: 20 Scrap, this act's layout is revealed. (2) Tell him about Bellfoot: he moves down after the run. | Trader's cousin | |
| **new** stopped-clock | 1 | Five Forty-Seven | Every clock in the Gearworks reads the same hour, and none are wound. (1) Read the inscription on the biggest: lore, heal 6. (2) Take the cogs from its face: gain 25 Scrap. | | |
| **new** empty-chair | 2 | The Empty Chair | A workshop chair, a half-eaten supper, a coat on the hook. (1) Sit a while: heal 10, lore (the inventor vanished at supper). (2) Search the desk: gain 30 Scrap and a blueprint chance (1 in 3). | | |
| **new** unsent-letter | 3 | The Unsent Letter | A letter addressed to Bellfoot, never sent. (1) Carry it down: lore, gain 15 Brass (a journal page after the run). (2) Read it aloud to Sprocket: heal 12. | | |
| **new** beacon | 3 | The Cold Beacon | The great lamp on the Belfry's rim, unlit since the inventor left. (1) Light it: lose 8 HP and 1 hour. (2) Walk on. | | The lit beacon (act 3 starts at hour 0 with a clearer layout) |
| **new** vault-wheel | 1 to 3 | The Vault Wheel | A wheel on a vault door. (1) Turn it with a Brass Key: the vault opens, the guardian is not woken. (2) Pick the lock: 25 Scrap and 1 hour. (3) Walk on. | | An opened vault (stays a known room) |

Resident events: oil-merchant, apprentice, hour-ghost, lamplighter, traders-cousin (5, one per resident). Landmark events: lamplighter, beacon, vault-wheel. Lore events (the town stuck at dusk, the inventor gone, the Clockmaker stopping the hour): hour-ghost, journal, stopped-clock, empty-chair, unsent-letter.

Lore thread (what the events tell, in order): the inventor built the Spire to keep Bellfoot's time and built the Clockmaker to tend it; one evening at supper the inventor was gone; the Clockmaker, who could not bear the evening to end, stopped the hour; the machines, with no one to tend them, went feral.

## 7. Achievements (30)

Rules 5.6: rewards scale with difficulty. Easy: journal pages and Sprocket's collars (cosmetic). Medium: Rare and Masterwork parts into the pool, landmarks, the fourth chassis. Hard: Legendary parts and Overwind levels. Conditions count on Journeyman or harder unless stated; progress shows on the trophy shelf. Every Masterwork (10) and Legendary (5) is unlocked by exactly one achievement below.

| id | Name | Condition | Tier | Reward | Hidden |
|---|---|---|---|---|---|
| e-first-win | The Last Evening | Win a run, on any mode (also opens Overwind 1 to 3) | easy | Journal page "Dawn, at last"; Overwind 1 to 3 | no |
| e-pet | Good Dog | Pet Sprocket 50 times | easy | Red collar (cosmetic) | no |
| e-bell | Early Bird | Ring a warden's bell with at least 4 hours left, once | easy | Journal page "Spare hours"; brass bell collar | no |
| e-salvage | Something Useful | Keep your first salvaged part | easy | Journal page "Taken apart" | no |
| e-resident | New Neighbor | Send a resident to Bellfoot | easy | Journal page "A lamp in the street"; the resident's stall opens | no |
| e-lore | Five Forty-Seven | Read the Hour Ghost, the Stopped Clock and the Empty Chair, in any runs | easy | Journal page "Where the evening went"; dusk collar | yes |
| e-letter | Return to Sender | Carry the Unsent Letter down to Bellfoot | easy | Journal page "The letter" | yes |
| m-quick-foreman | Clocked Out Early | Defeat the Foreman in 5 turns or fewer | medium | Unlocks **Skewframe** (M) | no |
| m-no-plating | Bare Metal | Win a run having gained under 150 Plating in total | medium | Unlocks **Cascade Piston** (M) | no |
| m-break-all | Take Them Apart | Break every part of a warden in one fight, including the optional ones | medium | Unlocks **Night Watchman** (M) | no |
| m-bells | Ahead of Time | Ring the bell with at least 3 hours left in all three acts of one run | medium | Unlocks **Hour Hand** (M) | no |
| m-residents | Full Street | Have all five residents living in Bellfoot | medium | Unlocks **Mirror Gear** (M) | no |
| m-all-chassis | Every Hand | Win with the Tinker, the Stoker and the Horologist | medium | Unlocks **Twin Mainspring** (M) | no |
| m-calm-steam | Easy on the Valve | Win a run with 3 or more Steam parts in your bin at the end and no overpressure | medium | Unlocks **Free Pawl** (M) | no |
| m-status | Slow Burn | Deal 60 damage with Scald in a single fight | medium | Unlocks **Conductor's Baton** (M) | no |
| m-burst | One Big Day | Deal 100 damage in a single turn | medium | Unlocks **Resonance Rod** (M) | no |
| m-vaults | Locksmith | Open the vault in every act of one run | medium | Unlocks **Ballast Lance** (M) | no |
| m-lift | Going Up | Repair the Lamplighter's lift | medium | Landmark: the repaired lift | no |
| m-beacon | A Light on the Rim | Light the Cold Beacon | medium | Landmark: the lit beacon | no |
| m-vault-open | Open Sesame | Open any vault | medium | Landmark: an opened vault | no |
| m-salvager | Magpie | Break 100 enemy parts in total | medium | Unlocks the fourth chassis, the **Scrapper** (section 8) | no |
| m-fuse | Better Together | Fuse three times in one run | medium | Unlocks **Sapper** (R) | no |
| m-drill | Through the Plate | Break a part that a Shell, Bulwark or Governor was protecting, using a Drill | medium | Unlocks **Core Drill** (R) | yes |
| m-shatter | Chip Chip Chip | Break 3 parts of one enemy in a single turn with Shatter | medium | Unlocks **Sunder** (R) | no |
| h-master | Master of Hours | Win a run on Master | hard | Unlocks **Apprentice's Hands** (L); Overwind 4 to 5 | no |
| h-clockwork | Clockwork | Win a run on Clockwork | hard | Unlocks **Bottled Dusk** (L); Overwind 6 to 7 | no |
| h-flawless | Not a Scratch | Defeat any warden without taking damage during that fight | hard | Unlocks **Sprocket's Blanket** (L) | no |
| h-ow5 | Wound Tight | Win a run at Overwind 5 | hard | Unlocks **Perpetual Engine** (L); Overwind 8 to 9 | no |
| h-ow8 | Wound Tighter | Win a run at Overwind 8 | hard | Overwind 10 (The Thirteenth Hour) | no |
| h-ow10 | The Thirteenth Hour | Win a run at Overwind 10 | hard | Unlocks **Sun-Orb Core** (L) | yes |

Counts: 7 easy, 17 medium, 6 hard: 30. Hidden: 4 (e-lore, e-letter, m-drill, h-ow10). Masterworks unlocked: 10 (one each); Legendaries: 5 (one each); Rares: 3 (sapper, core-drill, sunder); landmarks 3; chassis 1; Overwind levels 1 to 10 in stages. Play styles covered: no-Plating, burst, statuses, Steam, part-breaking, early bells, the town (residents, pets), chassis variety, speed, flawless wardens, Overwind.

## 8. Fourth chassis: the Scrapper

Unlocked by `m-salvager` (break 100 enemy parts). A tinker who lives off the Spire's leavings.
| Chassis | Parts (8) | Passive |
|---|---|---|
| Scrapper | Pry Bar x2, Spur x2, Cold Chisel, Escapement x2, Mending Spool | The first enemy part you break each combat is salvaged upgraded (+), and you may keep any one wrecked part's salvage per combat. |
Why it fits the v2 systems: Pry Bar and Chisel aim damage at parts, the passive pays for breaking them, and the Mending Spool gives it its first healing. It starts strong at breaking, weak at burst and Plating, which is the point.

## 9. Overwind twists (10)

Unlocked after a first win (rules 5.7), in stages by achievement (section 7). Level N includes every twist below it; +10% Brass per level. Harsher as they go.
| Level | Name | Twist |
|---|---|---|
| 1 | Loose Bolts | Traders charge 15% more. |
| 2 | Short Days | Each act has 1 hour fewer. |
| 3 | Thick Plates | Enemy parts have 20% more HP. |
| 4 | Cold Joints | The first part you place each combat is Rusted until your next turn. |
| 5 | Restless Elites | Roaming elites step twice after your move on every 3rd hour. |
| 6 | Thin Oil | Oil stations heal half as much. |
| 7 | Salvage Rot | You may keep only one salvaged part per combat; the rest scrap for 2 Scrap each. |
| 8 | Wound Springs | Every enemy attack deals +2. |
| 9 | The Warden Stirs | Wardens start with one extra part (a Pierce Drill, a Governor Cap, a Drain Valve or a Purge Chime, picked from your plan as the Clockmaker's memory does). |
| 10 | The Thirteenth Hour | The Clockmaker gains a fourth phase after Midnight: his core re-seals behind two keystones, Thirteenth Chime (HP 30, Pierce 18 every turn) and Hourless Dial (HP 30, Rewind 3 combinations), and Plating is lost at the start of each of his turns. The core then reopens with 40 HP and no Governor. Phase beat: "There is one more hour. I kept it for you." |

## 10. Prices and values *(tune)*

Rules 4.4 and 4.5, in one place. v1's price variance of -10% to +10% is not in the rules; this catalog assumes it is dropped (Rule questions, 10).
| Item | Number |
|---|---|
| Part value (barter and Workbench rarity): Common | 20 Scrap |
| Uncommon | 35 |
| Rare | 60 |
| Masterwork | 100 |
| Trinket value: Common / Uncommon / Rare | 60 / 90 / 120 |
| Buy a part with Scrap alone | value + 25% (C 25, U 44, R 75, M 125) |
| Barter | hand over a part worth its value; pay the difference in Scrap |
| Oil from a trader | 15 Scrap, heal 15 |
| Upgrade (Workbench): C / U / R / M | 15 / 25 / 40 / 60; Legendary 80 |
| Remove a part (Workbench) | 25 Scrap, +15 per use in a run |
| Fuse (Workbench) | free; two inputs lost, one result kept |
| Pick a lock | 25 Scrap and 1 extra hour |
| Scrap per salvaged part scrapped | 3 (locked salvage: 6; wrecked part: 1) |
| Scrap per fight (core drop) | regular 3 to 6 (header of each enemy), elite 12 to 18, warden 30 |
| Vault | one Masterwork and 40 Scrap |
| Early bell | 4 Scrap and 2 Brass per hour left |
| Oil station | rest (1 extra hour): heal 30% of max HP; or polish: +4 max HP; once per station |
| After a warden | heal 40% of the HP you've lost |
| Brass per room cleared: act 1 / 2 / 3 | 2 / 3 / 4; elite +10, warden +25, victory +50 |
| Event costs | listed per event in section 6 |
| Hours | move 1; rest 1 extra; pick a lock 1 extra; Journeyman midnight at hour 12 |

## 11. Rule questions (resolved in docs/rules.md, D3)
1. Bump only when every acting part is broken; resting turns are quiet (rules 2.1).
2. Pry X is defined as proposed (rules 2.3).
3. Countdown may rise by a listed amount plus bonuses (the Queen's heat); Jam pauses it (rules 2.4).
4. Rewind is the action of a breakable part in each Clockmaker phase (rules 4.9).
5. The Clockmaker's broken parts pay 4 Brass; Legendaries come from the Queen's core or, in act 3, the vault if none is held (rules 4.4, 4.7).
6. Ratchet counts damage to a keystone while the core is sealed (rules 2.4).
7. Legendary upgrade 80; any part can be removed; a held Legendary doesn't block a vault's Masterwork; fuse is greyed with a reason when no target exists; Masterworks never fuse into Legendaries (rules 4.4).
8. Buff, Enrage, Purge, Echo and once-at-start Summon are in rules 2.4.
9. Event choices may cost or refund hours, shown on the button (rules 4.2).
10. No price variance (rules 4.5); trader odds as section 1.
11. A status applies to the whole frame (rules 3).
12. A Spring Trap release can break the acting part and cancel the rest of its action (rules 2.6).
13. Salvage is optional to keep, so the bin grows only by choice (rules 2.5); the simulator watches bin size.
