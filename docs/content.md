# Clockwork Spire: content catalog (v2)

Built against `docs/rules.md` (v2) and `docs/vision-v2.md`. v1's catalog is in git at tag `v1.0` and was the starting material. Every number is a starting value and carries *(tune)* by default; the simulator moves them. Tooltip text in the game is the "Effect" column, word for word. Words are defined in rules 1.5, 2.3, 2.4 and 3. "Passes" means it passes motion on; "holds" means it stops motion that tick. Every part passes unless it says it holds.

Conventions used in this file:
- **Rarity**: C Common, U Uncommon, R Rare, M Masterwork, L Legendary.
- **Locked**: blank = in the pool from the start. `blueprint` = unlocked by a blueprint (v1). An achievement id = unlocked only by that achievement (section 7). A locked part is never offered, fused into or salvaged; its salvage drops as 6 Scrap and a journal note (rules 2.5).
- **Enemy part rows**: `id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor`. Cadence: *every* (each enemy turn), *odd* or *even* (turns 1, 3, 5 or 2, 4, 6), *1 of 3* (turns 1, 4, 7...), *1,2 of 3*, *1,3 of 3*, *once* (at the start of the fight), *passive* (no intent, a rule while it stands). A part with two actions lists both. **Key** = keystone (yes) or not (no); regular enemies have no sealed core, so their Key is "-".
- **Core action**: when every acting part of a frame is broken, the core Bumps for the number in the enemy's header. A turn where living parts simply rest has no core action (rules 2.1).
- Damage is v1's unless stated. Total enemy HP (core plus parts) stays near v1's; damage per turn stays near v1's average over the cycle.
- Events may hand you a part ("find"); that is not a reward screen. Reward screens do not exist in v2.

## 1. Rarity tiers

| Tier | Where it comes from | Value (rules 4.5) | Upgrade cost (4.4) |
|---|---|---|---|
| Common | Salvage from regular enemies; traders; events | 20 | 15 |
| Uncommon | Salvage from regulars and elites; traders; fuse of two Commons; events | 35 | 25 |
| Rare | Salvage from elites and wardens; traders (more often in acts 2 and 3); fuse of two Uncommons; the Foreman's core; events (never a locked one) | 60 | 40 |
| Masterwork | Warden parts (Foreman, Queen); vaults; fuse of two Rares; the Foreman's and Queen's cores; traders (acts 2 and 3, rarely); parts and trinkets alike | 100 | 60 |
| Legendary | The Boilermaker Queen's core, or the act 3 vault if you hold none (once its achievement is earned), and nothing else; a part or a trinket; never sold, fused or found in events | not sold | 80 *(tune)* |

Lock state: all 13 Rares, all Masterworks (10 parts, 4 trinkets) and all Legendaries (5 parts, 2 trinkets) start locked; of the Uncommons, 7 start locked (v1's). At the very start a run sees the 21 Commons and 14 Uncommons.

**Source rules**
- **Salvage** (rules 2.5): a regular enemy's parts carry Common and Uncommon parts; elite parts Uncommon and Rare; warden parts Rare and Masterwork. The Clockmaker's parts pay Brass instead (section 11). Pure-armor parts (Bulwark and Governor plates) salvage into nothing.
- **Traders** (4.5): 4 parts and 1 trinket rolled on entry from `shop`, only from unlocked parts.
- **Fuse** (4.4, at a workbench): two parts of the same family and the same rarity become one part of the next rarity in that family. You see 2 candidates and pick 1. Candidates are the unlocked parts of the next rarity in the family that share a role tag (Strike, Plate, Boost, Hold, Charge, Pressure, Status) with either input, ties broken by `reward`; if fewer than two match, any unlocked part of that family and rarity fills in. Masterworks and Legendaries are never inputs. If a family has no unlocked part at the next rarity, the fuse is greyed with a hint ("Nothing here is ready yet").
- **Vaults** (4.4): one Masterwork, a part or a trinket (a random unlocked one from `reward`, weighted to the act's families: act 1 Gears and Cams, act 2 Springs and Steam, act 3 Pendulums and Chimes) plus 40 Scrap. If no Masterwork is unlocked: a random unlocked Rare plus 40 Scrap. In act 3, if a Legendary is unlocked and you hold none, the vault gives a Legendary (part or trinket) instead.
- **Warden cores** (4.7): Foreman: a Rare (a Masterwork instead one time in three, if any is unlocked). Queen: a Legendary (part or trinket, your pick of two) if one is unlocked and you hold none; otherwise a Masterwork if any is unlocked, otherwise a Rare. The Clockmaker ends the run, so he drops no part (section 11).
- **Achievements** (5.6): each Masterwork and Legendary is unlocked by exactly one achievement (section 7).

**Trader stock odds** (per part, by act; a tier with nothing unlocked folds into the tier below):

| Act | Common | Uncommon | Rare | Masterwork |
|---|---|---|---|---|
| 1 | 62% | 33% | 5% | 0% |
| 2 | 46% | 38% | 14% | 2% |
| 3 | 36% | 38% | 21% | 5% |

Trader trinket (1 per trader): act 1: C 60%, U 35%, R 5%; act 2: 40/45/15; act 3: 28/44/24 and Masterwork 4%. Legendaries never appear.

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

New words: **Pry X**: Strike X at the unbroken part with the least HP left on the enemy your next Strike would hit (ties: left to right); if that enemy has no parts, Strike X as normal (section 11). **Shatter X**, **Drill X**, **Jam**, **Patch X** as in rules 2.3.

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
| **new** core-drill | Core Drill | R | `m-fuse` | Holds on tick 1. From tick 2: Drill 7 and pass. | Drill 10. | Foreman Rivet Gun (foreman-rivet) |
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
| **new** sapper | Sapper | R | `m-act2-breaker` | Pry 5. If it breaks a part, Plate 5. | Pry 8; Plate 8. | Foreman Wrench Arm (foreman-wrench) |
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
| **new** sunder | Sunder | R | `m-shatter` | Shatter 3 and Cracked 1. | Shatter 4 and Cracked 2. | Queen Sun-Orb Scepter (queen-scepter) |
| conductors-baton | Conductor's Baton | M | `m-status` | Strike 2. Each Cracked, Dazed or Scald applied this turn is also applied to every other enemy. | Strike 3. | Vault (act 3); fuse |

### Legendary: run-defining, one per run (5)
A Legendary joins your bin like any part; you can hold at most one Legendary per run, part or trinket (section 5 has the two trinkets). It comes only from the Boilermaker Queen's core or the act 3 vault (if you hold none), once its achievement is earned. None holds motion. Upgrade at a workbench for 80 Scrap *(tune)*.
| id | Name | R | Locked | Effect | Upgraded (+) | Source |
|---|---|---|---|---|---|---|
| perpetual-engine | Perpetual Engine | L | `h-ow5` | On the last tick, every part that fired this turn fires once more (once each, in the order first reached). | Also Plate 6. | Queen core or act 3 vault |
| bottled-dusk | Bottled Dusk | L | `h-clockwork` | +2 ticks this turn (once per turn). Each tick after the 3rd adds 2 Pressure. | +3 ticks. | Queen core or act 3 vault |
| sun-orb-core | Sun-Orb Core | L | `h-ow10` | You never overpressure. Spend all Pressure above 10: Sweep 2 per Pressure spent. | Sweep 3 per Pressure. | Queen core or act 3 vault |
| apprentices-hands | Apprentice's Hands | L | `h-master` | While powered this turn, your Strikes hit the first two standing entries of your target order; the second takes half (rounded down). | The second takes three quarters. | Queen core or act 3 vault |
| sprockets-blanket | Sprocket's Blanket | L | `h-flawless` | Plate 3. Half your Plating (rounded down, max 12) stays when it would fall away at the start of your turn. | Plate 5; keeps two thirds, max 18. | Queen core or act 3 vault |

### Counts and notes
- Common 21, Uncommon 21, Rare 13, Masterwork 10, Legendary 5: 70 parts. v1's 46 plus 9 new C/U/R (pry-bar, cold-chisel, mending-spool, auger, wedge, soothing-valve, sapper, core-drill, sunder) plus 10 M plus 5 L. Locked at the start: v1's 17, plus sapper, core-drill, sunder, plus all 10 M and 5 L (35 in all). Sapper, Core Drill and Sunder also drop as salvage once their achievement opens them.
- **New parts answer the enemy machines**: Pry Bar for the small part you need broken now, Cold Chisel to chip every part at once, Auger for Bulwark and Governor frames, Wedge to stall a Countdown or Build-up (Jam pauses it), and two Patch parts so healing exists in the parts economy (Mending Spool heals 3 a turn at most; Soothing Valve spends Pressure).
- **Masterworks bend one rule each**: Skewframe (a region of diagonal motion), Twin Mainspring (a second source of motion at a fixed cell), Night Watchman (acts on the enemy's turn), Resonance Rod (Echo for a column), Mirror Gear (copies a neighbor), Cascade Piston (overkill carries), Ballast Lance (Plating becomes damage), Hour Hand (last-tick effects every tick), Free Pawl (springs stop holding), Conductor's Baton (statuses spread).
- Cam Follower and Mending Spool have no enemy salvage source; they come from traders, fuse and events.

## 3. Enemies as machines

Every enemy is a frame: a core with HP and 1 to 3 parts (regulars), 3 to 5 (elites), 4 to 8 across phases (wardens). Total HP matches v1's. **Regular cores hold about 60% of the enemy's HP** (shown as "core N of T" in each header), so racing the core while its parts act costs HP, and a raced core wrecks its parts (1 Scrap each, no salvage); parts stay small (3 to 14 HP) so breaking one takes a turn or two. "Bump N" is the core action when every acting part is broken. Scrap is the enemy's own drop (rules 2.5). "Attack X xN" is N hits of X. Plating absorbs Attack and Siphon; it does not stop Pierce. **Corrode X%** removes X% of your Plating (rounded up) before that turn's attacks (rules 2.4); regulars use 50%, elites 50% to 75%. A part with two actions lists them in order ("Corrode 50%, then Attack 12").

Enemy words (all in rules 2.4): Pierce, Corrode, Siphon, Mend, Ratchet, Countdown, Build-up, Bulwark, Governor, Braced, Summon, Rust, Jam, Magnetize, Drain, Corroded, Buff, Enrage, Purge, Echo. **Ratchet X** grows its enemy's Strength by X at the end of each of your turns while the part stands: it punishes slow builds and ignoring the part; every Ratchet here is 1. Wardens' keystones and last-phase cores are **Braced** (take at most half, or for the core a third, of their max HP per turn).

### 3.0 The Plating answer, in numbers

Rules 7.4 (7): at least 30% of each act's regular expected damage per turn must ignore or strip Plating. Method: expected damage per turn is the average over the part's cadence cycle with every part alive and no Strength growth from Ratchet; a part whose own number escalates (the Spring Imp's tail, the Pendulum Blade) counts at its average over one escalation cycle; each regular weighted equally. **Pierce** ignores Plating. **Siphon** is counted at its attack value (Plating still absorbs the hit, but the enemy heals by what it removed, so the stack buys nothing). **Corrode credit** is the Plating the part strips at the act's reference stack, capped at the Attack it shares a turn with; it is reported separately and **not** in the headline share. The headline share is Pierce plus Siphon; the Pierce-alone share is shown too, and it clears 30% in every act on its own. Reference stacks are the spike's mean peak Plating: 37 (act 1), 50 (act 2), 59 (act 3); p90 is 68 to 109, so 50% Corrode on a p90 stack still leaves a lot, which is why the headline share rests on Pierce and Siphon only.

| Act 1 regular | Damage per turn | Pierce | Siphon | Corrode credit | Notes |
|---|---|---|---|---|---|
| Rust Mite | 3.3 | 3.3 | 0 | 0 | Pierce 5, turns 1 and 2 of 3 |
| Cog Rat | 5.0 | 0 | 0 | 0 | Ratchet grows it |
| Brass Beetle | 6.0 | 0 | 0 | 0 | Attack 12 every other turn |
| Oil Slick | 4.5 | 0 | 0 | 4.5 | Corrode 50% strips 18 of 37, capped at the Attack 9 it feeds |
| Spring Imp | 5.0 | 5.0 | 0 | 0 | Pierce 4, +1 each time it acts (4, 5, 6) |
| **Act 1 total** | **23.8** | **8.3** | 0 | 4.5 | **Share 35% (Pierce alone 35%); with Corrode credit 54%** |

| Act 2 regular | Damage per turn | Pierce | Siphon | Corrode credit | Notes |
|---|---|---|---|---|---|
| Steam Wraith | 6.0 | 0 | 6.0 | 0 | Siphon 12, every other turn |
| Valve Crab | 7.0 | 0 | 0 | 0 | Attack 14, every other turn |
| Furnace Golem | 13.3 | 7.3 | 0 | 0 | Countdown 3: Pierce 22, plus Attack 6 each turn |
| Pipe Snake | 6.0 | 6.0 | 0 | 0 | Pierce 4 x3, every other turn |
| Gauge Gremlin | 3.5 | 3.5 | 0 | 0 | Pierce 7, every other turn |
| **Act 2 total** | **35.8** | **16.8** | 6.0 | 0 | **Share 64% (Pierce alone 47%)** |

| Act 3 regular | Damage per turn | Pierce | Siphon | Corrode credit | Notes |
|---|---|---|---|---|---|
| Bell Ringer | 12.0 | 7.0 | 5.0 | 0 | Clapper Pierce 14 every other turn, Fist Siphon 10 on the others (B7.5) |
| Chime Moth (each) | 4.0 | 4.0 | 0 | 0 | Pierce 4 x2, every other turn |
| Hour Hand Knight | 13.3 | 0 | 0 | 0 | Attack 20, turns 1 and 3 of 3 |
| Echo Sprite | 10.0 | 10.0 | 0 | 0 | Echo Pierce, min 6 max 18, taken as 10 *(tune)* |
| Pendulum Blade | 16.0 | 0 | 0 | 0 | Attack 8, 12, 16, 20, 24; Ratchet grows it |
| **Act 3 total** | **55.3** | **21.0** | 5.0 | 13.3 | **Share 47% (Pierce alone 38%); B7.5 tune** |

Reading it: v1's per-turn damage is kept (act 1 about 23 across the roster against v1's 27, act 2 36 against 38, act 3 55 against 63). Against the spike's turtle (loses 7 percent of max HP in act 1), act 1's Pierce alone is about 3 to 4 HP a turn per enemy that survives, so a pure Plating stack loses HP in every act 1 fight longer than 3 turns. Elites and wardens add Corrode at 50% to 75% on their big hitters (below), which does bite: Corrode 75% on a 59 stack leaves 15, so an Attack 24 lands 9. The sim reports this share, the Pierce and Corrode parts of it, and turtle HP lost per act (rules 7.4 targets 3 and 7).

### 3.1 Act 1: the Gearworks (regulars)

**Rust Mite** (`rust-mite`): core 11 of 18, Scrap 3, Bump 3. Often in pairs.
Punishes: Plating stacking (the Pincers Pierce) and slow builds (Rust). Answer: the Pincers have 4 HP, one Spur; then the 3-HP Gland, with an Oil Can nearby.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| mite-pincers | Pincers | 4 | Pierce 5 | 1,2 of 3 | C | pry-bar | - | the front claws |
| mite-gland | Rust Gland | 3 | Rust 1 part | 3 of 3 | C | oil-can | - | the swollen sac on its back |

**Cog Rat** (`cog-rat`): core 15 of 26, Scrap 3, Bump 3.
Punishes: slow builds and ignoring the Tail (Ratchet 1: its Jaw hits for 5, 6, 7, 8 on successive turns), and burst (the Plate eats the first 6 of a big hit). Answer: the Tail first (3 HP), then the Jaw.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| rat-jaw | Gnawing Jaw | 5 | Attack 5 x2 | odd | C | spur | - | the jaw |
| rat-plate | Tin Plate | 3 | Shell 6 | even | C | escapement | - | the patch of tin on its flank |
| rat-tail | Gear Tail | 3 | Ratchet 1 (passive) | passive | C | idler | - | the cog on its tail |

**Brass Beetle** (`brass-beetle`): core 20 of 34, Scrap 4, Bump 4.
Punishes: burst (the Carapace halves everything the core takes; the Shell Plate soaks more). Answer: Drill it, or break the 4-HP Carapace and hit the core.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| beetle-mandibles | Mandibles | 5 | Attack 12 | odd | U | bevel | - | the mandibles |
| beetle-shell | Shell Plate | 5 | Shell 10 | even | C | leaf | - | the underside plate |
| beetle-carapace | Carapace | 4 | Bulwark (passive) | passive | C | none | - | the domed back |

**Oil Slick** (`oil-slick`): core 17 of 28, Scrap 4, Bump 3.
Punishes: Plating stacking (the Nozzle strips half your Plating just before the Spitter fires). Answer: break the Nozzle (5 HP) first; then Plating is worth something.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| slick-nozzle | Drip Nozzle | 5 | Corrode 50% and Corroded 2 on you | odd | C | toggle | - | the dripping spout |
| slick-spitter | Spitter | 6 | Attack 9 | odd | C | cam | - | the open mouth |

**Spring Imp** (`spring-imp`): core 12 of 20, Scrap 3, Bump 3.
Punishes: Plating stacking (the Tail Pierces, a little more each time) and slow builds (the Key ratchets). Answer: Key (3 HP) and Tail (5 HP) die first.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| imp-tail | Coil Tail | 5 | Pierce 4, +1 each time it acts | every | C | coil | - | the coiled tail |
| imp-key | Wind-up Key | 3 | Ratchet 1 (passive) | passive | U | ratchet | - | the key in its back |

### 3.2 Act 1: elites and the Foreman

**Gearhound** (`gearhound`): core 26 sealed, Scrap 14, Bump 6. Patrols.
Punishes: Plating stacking (the Haunch Pierces on turn 3) and slow builds (Magnetize). Answer: the Haunch first, before turn 3; then the Fangs. Sealed until Fangs and Haunch are broken.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| hound-fangs | Fangs | 14 | Corrode 50%, then Attack 11 x2 | 1 of 3 | U | crown | yes | the open jaws |
| hound-snout | Magnet Snout | 10 | Magnetize a part | 2 of 3 | U | wedge | no | the nose |
| hound-haunch | Haunch Piston | 20 | Pierce 16 | 3 of 3 | R | volute | yes | the hind leg |

**Tinpot General** (`tinpot-general`): core 20 sealed, Scrap 14, Bump 5. Patrols.
Punishes: burst (the Tin Hat caps every Strike at 10; Mites soak splash) and Plating stacking (the Sabre Corrodes half). Answer: Bugle first (it buffs everyone), then the Sabre; Auger ignores the Hat. At the start the Horn summons 2 Rust Mites (full frames).
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| tinpot-horn | Barracks Horn | 9 | Summon 2 Rust Mites | once | U | Spire Key | no | the horn at its hip |
| tinpot-bugle | Bugle | 10 | Buff allies +3 | every | U | recoil | yes | the bugle in its hand |
| tinpot-sabre | Sabre | 14 | Corrode 75%, then Attack 13 | every | U | trap | yes | the sabre arm |
| tinpot-hat | Tin Hat | 12 | Governor 10 (passive) | passive | R | governor | no | the dented hat |

**The Foreman** (`foreman`): core 60 (sealed in phase 1), Scrap 30, Bump 6. Warden, two phases. Sizes (tune): keystones 26 and 22, Braced to 13 and 11 per turn; core 60 Braced to 20 per turn. **Floor: 2 + 3 = 5 turns for any build; expert about 7** (about 3 in phase 1, 4 in phase 2).
Opening line: "Late again. The shift starts at dusk, apprentice."
- **Phase 1: On the line** (mechanic: Corrode, Jam and Shell). Keystones: Wrench Arm, Furnace Grate. Cycle: Wrench Arm odd turns, Furnace Grate and Apron Plate even turns.
- Phase beat: "Fine. FINE. Overtime." Phase action (the enemy turn after phase 1 ends, no attacks): **Summon a Cog Rat**, shown as the intent.
- **Phase 2: The line runs hot** (mechanic: Bulwark). Core exposed behind the Boiler Plate; cadences restart, so the Rivet Gun fires on turns 1, 3, 5 of the phase (its first cycle is visible at once). Break the Plate (24 HP) before the core, or take half damage.
- Defeat: "Tell the inventor... the gears are clean."
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor | Phase |
|---|---|---|---|---|---|---|---|---|---|
| foreman-wrench | Wrench Arm | 26 | Corrode 50%, then Attack 16 | odd | R | sapper | yes | the great wrench in his right hand | 1 |
| foreman-grate | Furnace Grate | 22 | Jam the Mainspring | even | M | free-pawl | yes | the grate in his chest | 1 |
| foreman-apron | Apron Plate | 16 | Shell 14 | even | R | none | no | the leather apron | 1 |
| foreman-bulwark | Boiler Plate | 24 | Bulwark (passive) | passive | R | none | no | the plate bolted over his chest | 2 |
| foreman-rivet | Rivet Gun | 18 | Attack 10 x3 | odd | R | core-drill | no | the rivet gun on his left arm | 2 |
Totals: phase 1 parts 64; phase 2 core 60 plus parts 42; plus the Cog Rat 26: 192, against v1's 196.

### 3.3 Act 2: the Steamworks (regulars)

**Steam Wraith** (`steam-wraith`): core 25 of 42, Scrap 4, Bump 4.
Punishes: Plating stacking (Siphon heals it by the Plating it eats). Answer: break the Claw (11 HP) first; Plating is then free.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| wraith-claw | Hollow Claw | 11 | Siphon 12 | odd | C | whistle | - | the long claw |
| wraith-vent | Chill Vent | 6 | Corroded 2 on you | even | U | kettle | - | the vent in its chest |

**Valve Crab** (`valve-crab`): core 30 of 50, Scrap 5, Bump 4.
Punishes: burst (the Valve's Shell 15 swallows a Coil). Answer: break the Valve (9 HP) or strike on odd turns when it isn't shelling; a Pry Bar finds it.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| crab-pincer | Pincer | 11 | Corrode 50%, then Attack 14 | odd | C | piston | - | the big pincer |
| crab-valve | Shell Valve | 9 | Shell 15 | even | C | safety-valve | - | the brass valve on its back |

**Furnace Golem** (`furnace-golem`): core 36 of 60, Scrap 5, Bump 5.
Punishes: Plating stacking (the Heart is a Countdown that Pierces). Answer: break the Heart (14 HP) inside three turns, or Wedge it (Jam pauses the Countdown). After it is broken the Fist is a feeble Attack 6.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| golem-heart | Furnace Heart | 14 | Countdown 3: Pierce 22 | countdown | U | firebox | - | the glowing door in its chest |
| golem-fist | Slag Fist | 10 | Attack 6 | every | C | boiler | - | the slag fist |

**Pipe Snake** (`pipe-snake`): core 21 of 35, Scrap 4, Bump 3.
Punishes: Pressure (the Coil drains it) and Plating (its fangs Pierce). Answer: the Drain Coil (6 HP) first if you play Steam; otherwise the Fangs (8 HP).
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| snake-fangs | Fangs | 8 | Pierce 4 x3 | odd | C | cold-chisel | - | the forked head |
| snake-coil | Drain Coil | 6 | Drain 5 Pressure | even | U | condenser | - | the coiled tail pipe |

**Gauge Gremlin** (`gauge-gremlin`): core 18 of 30, Scrap 4, Bump 3.
Punishes: slow builds (Rust 2 parts) and Plating (the Spanner Pierces through the gaps). Answer: Wrench Hand first (6 HP, drops a Spire Key), with an Oil Can nearby.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| gremlin-wrench | Wrench Hand | 6 | Rust 2 parts | odd | C | Spire Key | - | the oversized wrench |
| gremlin-spanner | Spanner | 6 | Pierce 7 | even | C | trip-hammer | - | the spanner |

### 3.4 Act 2: elites and the Boilermaker Queen

**Pressure Warden** (`pressure-warden`): core 50 sealed, Scrap 14, Bump 6. Patrols.
Punishes: Pressure (the Dome Shells for half your Pressure), burst, and Plating stacking (the Fist Corrodes). Answer: Dome first (20 HP), or keep Pressure low. Sealed until Dome and Fist are broken.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| pw-dome | Pressure Dome | 20 | Shell equal to half your Pressure | every | U | soothing-valve | yes | the glass dome on its head |
| pw-fist | Piston Fist | 16 | Corrode 75%, then Attack 18 | every | R | steam-hammer | yes | the piston fist |
| pw-valve | Intake Valve | 14 | Drain 6 Pressure | even | U | Spire Key | no | the valve at its side |

**Twin Pistons** (`twin-pistons`): two frames, each core 29, Scrap 9 each, Bump 5. Patrols as a pair. Each frame is its own enemy, 65 HP (65 plus 65, as v1).
Punishes: burst (one shells while the other hits; kill one and the other enrages) and Plating (the right Ram Pierces). Answer: Link first on one twin, then its core. Left twin: Ram odd, Shield even. Right twin: Shield odd, Ram even.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| twinl-ram | Left Ram | 16 | Corrode 50%, then Attack 19 | odd | U | auger | - | the left piston rod |
| twinl-shield | Left Shield | 12 | Shell 10 | even | U | torsion | - | the left cylinder cap |
| twinl-link | Left Linkage | 8 | Enrage 8 (passive: if the right twin's core falls) | passive | U | none | - | the crossbar between them |
| twinr-ram | Right Ram | 16 | Pierce 14 | even | R | flywheel | - | the right piston rod |
| twinr-shield | Right Shield | 12 | Shell 10 | odd | U | verge | - | the right cylinder cap |
| twinr-link | Right Linkage | 8 | Enrage 8 (passive: if the left twin's core falls) | passive | U | none | - | the crossbar between them |

**The Boilermaker Queen** (`boilermaker`): core 78 (sealed in phases 1 and 2), Scrap 30, Bump 6. Warden, three phases. Sizes (tune): phase 1 keystones 22 and 22 (Braced to 11 each), phase 2 keystones 28 and 22 (14 and 11), core 78 (Braced to 26 per turn). **Floor: 2 + 2 + 3 = 7 turns for any build; expert about 8.**
Opening line: "Mind the pressure, little one."
- **Phase 1: Banked Fire** (mechanic: heat and Drain). Keystones: Crown, Sun-Orb Scepter. The Chest Gauge (not a keystone) is a **Build-up 6 to 20**: +6 each enemy turn, +1 for each Pressure the Scepter drains; at 20 it performs Pierce 28 and drops to 0. With 8 Pressure drained it fires at the end of turn 2 (6, then 6 + 6 + 8), so the Gauge (20 HP) is the first thing to break if you play Steam. Breaking it stops the heat; Jam pauses it.
- Phase beat: "Stay a while. It's so warm in here." Phase action (enemy turn after phase 1, no attacks): **Summon a Steam Wraith**.
- **Phase 2: Full Steam** (mechanic: Mend and Siphon). Keystones: Waist Furnace (rebuilds one broken part at half HP on even turns, so it can bring the Gauge back), Clock Staff. Cadences restart; the Gauge's reading carries over.
- Phase beat: if the Gauge is broken, "You've cracked my gauge. Now I'll never know how hot I am."; otherwise "Oh, don't look so sad. It's only a little fire." Phase action: **Mend** (rebuilds the Gauge at half HP if broken, and its reading resets).
- **Phase 3: Last Ember** (mechanic: Bulwark). Core exposed behind the Ember Shell; the Cinder Hand burns every turn.
- Defeat: "It's cold. I'd forgotten cold."
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor | Phase |
|---|---|---|---|---|---|---|---|---|---|
| queen-crown | Crown | 22 | Corrode 50%, then Attack 22 | odd | M | skewframe | yes | the spired crown | 1 |
| queen-scepter | Sun-Orb Scepter | 22 | Drain 8 Pressure | even | R | sunder | yes | the sun-orb in her scepter | 1 |
| queen-gauge | Chest Gauge | 20 | Build-up 6 to 20 (+1 per Pressure drained): Pierce 28 | every | R | none | no | the gauge on her chest | 1, 2 |
| queen-furnace | Waist Furnace | 28 | Mend: rebuild one broken part at half HP | even | M | cascade-piston | yes | the furnace at her waist | 2 |
| queen-staff | Clock Staff | 22 | Siphon 20 | odd | M | twin-mainspring | yes | the clock staff in her other hand | 2 |
| queen-ember | Ember Shell | 24 | Bulwark (passive) | passive | R | none | no | the glowing skirt plates | 3 |
| queen-cinder | Cinder Hand | 18 | Corrode 75%, then Attack 22 | every | R | none | no | the hand she keeps in the fire | 3 |
Totals: phase 1 parts 64, phase 2 parts 50, phase 3 core 78 plus parts 42, plus the Wraith 42: 276, against v1's 302.

### 3.5 Act 3: the Belfry (regulars)

**Bell Ringer** (`bell-ringer`): core 36 of 60, Scrap 5, Bump 5.
Punishes: Plating stacking (the Clapper Pierces) and every plan that needs the Mainspring (the Rope Jams it). Answer: Rope first (8 HP, a Spire Key), then Clapper (10 HP).
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| ringer-clapper | Clapper | 10 | Pierce 14 | odd | C | bell-hammer | - | the iron clapper |
| ringer-fist | Ringer's Fist | 6 | Siphon 10 | even | C | metronome | - | the ringing fist |
| ringer-rope | Bell Rope | 8 | Jam the Mainspring | even | C | Spire Key | - | the rope over its shoulder |

**Chime Moth** (`chime-moth`): core 22 of 36, Scrap 3 each, Bump 3. Comes in pairs.
Punishes: Plating stacking (the chime Pierces) and burst (two bodies split a big Strike; each Shells every other turn). Answer: Sweep or Chisel the pair; Dust Shells first.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| moth-wing | Wing Chime | 8 | Pierce 4 x2 | odd | C | chime | - | the chiming wing |
| moth-dust | Dust Shell | 6 | Shell 8 | even | C | anchor | - | the dust on its back |

**Hour Hand Knight** (`hour-knight`): core 48 of 80, Scrap 6, Bump 6.
Punishes: burst (the Visor caps Strikes at 12; the Shield soaks the middle turn). Answer: Drill the Visor away (12 HP) or hit with several small Strikes.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| knight-sword | Hand Sword | 12 | Corrode 50%, then Attack 20 | 1,3 of 3 | U | pendulum | - | the hour-hand sword |
| knight-shield | Dial Shield | 8 | Shell 14 | 2 of 3 | U | balance-wheel | - | the clock-dial shield |
| knight-visor | Visor | 12 | Governor 12 (passive) | passive | U | none | - | the visored helm |

**Echo Sprite** (`echo-sprite`): core 24 of 40, Scrap 4, Bump 4.
Punishes: burst (the Mouth echoes your biggest single hit last turn as a Pierce, min 6, max 18 *(tune)*) and Plating stacking (it Pierces). Answer: spread damage across many small hits; break the Mouth (10 HP).
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| sprite-mouth | Echo Mouth | 10 | Echo Pierce: your largest single hit last turn (6 to 18) | every | U | tuning-fork | - | the open mouth |
| sprite-fin | Mirror Fin | 6 | Shell 8 | even | U | lever | - | the mirror-bright fin |

**Pendulum Blade** (`pendulum-blade`): core 48 of 80, Scrap 5, Bump 6.
Punishes: slow builds and ignoring the Weight (the Blade swings Attack 8, 12, 16, 20, 24, then resets; the Counterweight's Ratchet 1 adds a point a turn on top). Answer: break the Blade (20 HP) before it passes 16, and the Weight (12 HP) early.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| blade-edge | Swinging Edge | 20 | Attack 8, +4 each time it acts, resets after 24 | every | U | triple-cam | - | the pendulum blade |
| blade-weight | Counterweight | 12 | Ratchet 1 (passive) | passive | U | tappet | - | the brass weight at its base |

### 3.6 Act 3: elites and the Clockmaker

**Minute Warden** (`minute-warden`): core 80 sealed, Scrap 16, Bump 8. Patrols.
Punishes: slow builds, burst (the Dial caps Strikes at 22) and Plating stacking (the Hand Corrodes 75%: a 59 stack leaves 15, so Attack 28 lands 13). Answer: Mender first (26 HP); sealed until Mender and Minute Hand are broken.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| minute-mender | Mender Gear | 26 | Mend 10 (core) | every | R | planetary | yes | the wheel in its chest |
| minute-hand | Minute Hand | 24 | Corrode 75%, then Attack 28 | even | R | chronometer | yes | the long hand |
| minute-needle | Rust Needle | 12 | Rust your strongest part | odd | U | alarm-clock | no | the needle at its wrist |
| minute-dial | Dial | 28 | Governor 22 (passive) | passive | U | none | no | the clock face on its belly |

**Grand Orrery** (`orrery`): core 80 sealed, Scrap 18, Bump 8. Patrols.
Punishes: burst and slow builds (three Moons Shell it for 6 each per turn; the Ring halves core damage) and Plating stacking (the Arm Corrodes 75%). Answer: break the Moons one by one (20 HP each); sealed until all three fall. Ring (40 HP) after.
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor |
|---|---|---|---|---|---|---|---|---|
| orrery-moon1 | Moon of Hush | 20 | Shell 6 (on the Orrery) | every | R | gong | yes | the nearest, palest moon |
| orrery-moon2 | Moon of Embers | 20 | Shell 6 | every | R | lamp | yes | the red moon |
| orrery-moon3 | Moon of Dusk | 20 | Shell 6 | every | R | grandfather | yes | the slow, far moon |
| orrery-arm | Orbit Arm | 30 | Corrode 75%, then Attack 24 | every | R | hairspring | no | the long brass arm |
| orrery-ring | Brass Ring | 40 | Bulwark (passive) | passive | U | none | no | the great ring around the core |
The Orrery is 210 HP, v1's 150 plus 3 moons of 20.

**The Clockmaker** (`clockmaker`): core 78 (exposed only in Midnight), Scrap 0 (Brass instead, 4 per part), Bump 8. Warden, three phases. Sizes (tune): phase 1 keystones 26 and 24 (Braced to 13 and 12), phase 2 keystones 32 and 30 (16 and 15), core 78 (Braced to 26 per turn, and no Strike over 14 while the Governor Frame stands). **Floor: 2 + 2 + 3 = 7 turns for any build; expert about 9.**
Opening line: "Welcome back. It's still evening."
**He remembers** (rules 5.4): he starts the fight with one extra non-keystone part answering your last three runs' main plan (below); with no history yet he has none.
**Rewind** is the action of each phase's Rewind part (rules 4.9): at the start of each of his turns it lifts your strongest combination off the board and he heals half its damage; breaking the part stops Rewind for that phase.
- **Phase 1: Tick** (mechanic: Rewind). Keystones: Hour Hand, Tick Spring.
- Phase beat: "I have all the time there is. I kept it." Phase action (the enemy turn after phase 1, no attacks): **Rewind** (lifts your strongest combination at once, even if the Tick Spring is broken).
- **Phase 2: Tock** (mechanic: Pressure reset). Keystones: Minute Hand, Tock Weight (its Rewind also sets Pressure to 0). Cadences restart.
- Phase beat: "If the hour ends, the inventor ends with it." Phase action: **Jam the Mainspring** for your next turn.
- **Phase 3: Midnight** (mechanic: Governor and two Rewinds). The core is exposed behind the Governor Frame (24 HP; no Strike over 14). Hour Wheel rewinds two combinations; the Midnight Bell strikes on odd turns and, on even turns, Jams the Mainspring with an Attack.
- Defeat: "...Then let it be morning."
| id | Name | HP | Action | Cadence | R | Salvage | Key | Anchor | Phase |
|---|---|---|---|---|---|---|---|---|---|
| clock-hour | Hour Hand | 26 | Corrode 50%, then Attack 20 | every | R | Brass 4 | yes | the hour hand across his chest | 1 |
| clock-tick | Tick Spring | 24 | Rewind 1 combination | every | R | Brass 4 | yes | the mainspring in his side | 1 |
| clock-minute | Minute Hand | 32 | Corrode 75%, then Attack 28 | every | R | Brass 4 | yes | the minute hand he carries like a spear | 2 |
| clock-tock | Tock Weight | 30 | Rewind 1 combination and Pressure to 0 | every | R | Brass 4 | yes | the pendulum weight under his ribs | 2 |
| clock-gov | Governor Frame | 24 | Governor 14 (passive) | passive | R | none | no | the brass frame around his core | 3 |
| clock-wheel | Hour Wheel | 26 | Rewind 2 combinations | every | R | Brass 4 | no | the great wheel behind his head | 3 |
| clock-bell | Midnight Bell | 24 | Corrode 75%, then Attack 32 (odd turns); Jam the Mainspring and Attack 36 (even turns) | odd / even | R | Brass 4 | no | the bell in his chest | 3 |
Totals without the memory part: phase 1 parts 50, phase 2 parts 62, phase 3 core 78 plus parts 74: 264. With the memory part: 288 (v1: 390 over three phases, which the bot reached in 4 turns; Braced is what holds the length now).

**Memory parts** (one per fight, non-keystone, present from phase 1; chosen by your last three runs' main plan):
| Plan | id | Name | HP | Action | Cadence | Anchor |
|---|---|---|---|---|---|---|
| Plating | mem-drill | Pierce Drill | 24 | Pierce 14 | every | the drill on his shoulder |
| Burst | mem-governor | Governor Cap | 24 | Governor 12 (passive) | passive | the cap on his head |
| Pressure | mem-valve | Drain Valve | 22 | Drain 8 Pressure | every | the valve at his collar |
| Statuses | mem-chime | Purge Chime | 22 | Purge (clears every status on his frame) | every | the small chime at his belt |
Each pays Brass 4. The archivist (present from the first run) names the part before the run.

### 3.7 Counterplay tally (rules 2.4)
- **Plating stacking is punished in the numbers** (3.0): act 1 share 35% (54% with Corrode credit), act 2 64% (Pierce alone 47%), act 3 38%. Regulars with a real bypass: Rust Mite, Spring Imp, Oil Slick (Corrode 50%) in act 1; Wraith (Siphon), Golem, Snake, Gremlin in act 2; Ringer, Moth, Sprite in act 3. Ratchet (Cog Rat, Imp, Blade) punishes slow builds and ignoring the part, not Plating alone. Elites and wardens add Pierce (Gearhound Haunch, right Ram, Queen Gauge, Clockmaker drill) and Corrode 50% to 75% on their big hitters (Tinpot Sabre, Pressure Warden Fist, Minute Hand, Orrery Arm, Foreman Wrench, Queen Crown and Cinder Hand, Clockmaker Hour Hand, Minute Hand and Bell).
- **Burst is punished** (Bulwark, Governor, Shell, sealed, split, echo): Cog Rat, Beetle, Crab, Moth pair, Knight, Sprite: 6 of 15 regulars; every elite is sealed or governed; every warden's last phase is behind a Bulwark or Governor and Braced to a third of the core per turn.
- **Pressure**: Pipe Snake, Pressure Warden, the Queen's Scepter and Gauge, the Clockmaker's Tock Weight and Drain Valve. **Statuses**: the Purge Chime; the Minute Warden's Mender outheals slow Scald. **Slow builds**: Rust Mite, Gremlin, Ringer (Jam), Gearhound (Magnetize), Minute Warden (Rust), every Ratchet.
- **The core race**: cores are about 60% of a regular's HP, so racing one takes most of the fight's turns while the Pierce, Countdown and Ratchet parts keep acting; it is not free, and it wrecks the parts (1 Scrap each, no salvage). Breaking a 3 to 6 HP part first costs a placement or two and usually saves more HP than it spends. The sim measures both lines.

## 4. Encounter pools

Fight rooms draw from their act's pool by floor depth (rules 4.1: 5 to 6 floors, 7 to 9 fight rooms per act). Floors count up from the entry floor; with 5 floors the bands are 1 to 2, 3, 4 to 5; with 6 floors, 1 to 2, 3 to 4, 5 to 6. The first fight room next to the entry is always drawn from the easy band. The same encounter is not repeated within 3 fights. Each entry is one encounter (enemy ids).

| Act | Easy band | Middle band | Deep band |
|---|---|---|---|
| 1 | rust-mite x2; cog-rat; spring-imp; oil-slick | brass-beetle; cog-rat + rust-mite; oil-slick + spring-imp; rust-mite x3 | brass-beetle + rust-mite; brass-beetle + cog-rat; cog-rat + spring-imp + rust-mite |
| 2 | steam-wraith; gauge-gremlin; pipe-snake; valve-crab | furnace-golem; pipe-snake + gauge-gremlin; steam-wraith x2; valve-crab + pipe-snake | furnace-golem + gauge-gremlin; valve-crab + steam-wraith; furnace-golem + pipe-snake |
| 3 | bell-ringer; chime-moth x2; echo-sprite; pendulum-blade | hour-knight; echo-sprite + chime-moth; bell-ringer + chime-moth | hour-knight + echo-sprite; pendulum-blade + chime-moth; bell-ringer + hour-knight |

**Hours and fights** (rules 4.1, 4.2; the shortest entry-to-door path is at most 5 moves). On Journeyman (12 hours) a route that climbs straight to the door uses 4 to 5, leaving 7 to 8 spare moves; a normal route spends them on:
- **Act 1**: 5 to 6 fights, the workbench, a trader, maybe one event; it reaches the door around hour 11 or 12 and rings early only if the machine is ready.
- **Act 2**: 5 fights, an oil station (2 hours with the rest) and a trader or the workbench; the Pierce parts make HP the budget, so the rest is often worth its hour.
- **Act 3**: 4 to 5 fights (the deep band is slower to win), the two workbenches, and the Clockmaker's door.
- **The bell**: each hour left pays 6 Scrap and 2 Brass, and every 3 hours left makes you Prepared (+1 placement on your first warden turn, at most +2). A fight hour is worth about 4 Scrap, 3 to 6 Scrap of salvage, 2 to 4 Brass and some HP loss; so ringing with 3 hours left (18 Scrap, 6 Brass and a placement) beats the last two fights only when HP or the machine says so. Missing midnight is a real cost: the warden is Overwound (Strength 3, Shell 10).
- Apprentice has 14 hours, Master 11, Clockwork 10; Overwind 2 takes another hour, the Dusk Lantern gives one back.

**Elite patrols** (rules 4.3: elites never enter the entry room or the warden's door; loops of 3 to 5 rooms, drawn as dotted paths; they step after each of your moves, not after a rest or a lock pick):
- **Act 1**: one elite on patrol, Gearhound or Tinpot General (`map` stream picks). Loop of 4 rooms across floors 2 to 4, passing the workbench's floor so a careless detour meets it. The other elite is not on patrol; if the act has a vault, it is the guardian.
- **Act 2**: both elites patrol. Pressure Warden: a 5-room loop through the pipe floor in the middle of the section. Twin Pistons: a 3-room loop on one floor; the two frames step together and are fought together. Neither is a vault guardian unless the `map` stream rolls a second copy for the vault (below).
- **Act 3**: both elites patrol. Minute Warden: a 4-room loop around the belfry stair, one step per hour. Grand Orrery: a slow 5-room loop on the top floor, it passes the warden's approach (never the door itself).
- A defeated elite drops a trinket from its act's pool, its salvage and a blueprint (v1, rules 4.3).

**Vault guardians** (rules 4.4): a fixed, stationary elite behind a locked door, with one added part, the **Padlock** (`vault-padlock`, HP 12, Bulwark passive, salvage Spire Key, anchor "the padlock on its back"; elite part limit 5, so the Orrery guardian has no Brass Ring). A guardian gives no Scrap of its own; the vault gives a Masterwork (part or trinket) and 40 Scrap, and in act 3 a Legendary instead if one is unlocked and you hold none.
| Act | Guardian | Notes |
|---|---|---|
| 1 | Tinpot General (or Gearhound if Tinpot patrols) | The Horn's mites come out when you open the door. |
| 2 | Pressure Warden (a second copy if it also patrols) | Bring Pressure-light parts. |
| 3 | Grand Orrery without its Ring | The Padlock stands where the Ring was. |
After the first opened vault, its landmark (5.4, `m-vaults`) replaces the guardian with a regular fight from the middle band in every later run.

## 5. Trinkets (42)

v1's 28, with the changes noted, plus 8 new, plus 4 Masterwork and 2 Legendary trinkets that bend rules. Elites drop from their act's pool; traders sell C, U, R and, in act 3, rarely M (rules 4.5); wardens offer a choice of 3 from the Boss pool (v1), and the Foreman and the Queen may replace one slot with an unlocked Masterwork trinket. Masterwork trinkets also come from vaults. Legendary trinkets come only from the Queen's core or the act 3 vault and count as the run's one Legendary (rules 5.6). Values: C 60, U 90, R 120, M 160 Scrap *(tune)*. Masterwork and Legendary trinkets start locked; each is unlocked by one achievement (section 7).

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
| **new** overrun-coupler | Overrun Coupler | M | Once per turn, a Strike that deals more than its target has left carries the excess to the next standing entry of your target order. Unlocked by `m-drill`. | rule-bending |
| **new** foresight-dial | Foresight Dial | M | Intents are shown two enemy turns ahead (the second turn dimmed). Unlocked by `m-three-elites`. | rule-bending |
| **new** two-left-hands | Two Left Hands | M | Two free swaps each turn, and a swap may trade a board part with a part in your hand. Unlocked by `m-bell3`. | rule-bending |
| **new** tow-hook | Tow Hook | M | Once per combat, when a core dies, its best standing part (highest rarity, then leftmost) is salvaged as if you had broken it. Unlocked by `m-wrecker`. | rule-bending |
| **new** inventors-watch | The Inventor's Watch | L | Once per combat, after a Run, wind back: your board, charge, Pressure, HP and every enemy return to how they were before that Run (your hand and draw order stay). Unlocked by `h-master-bare`. | run-defining |
| **new** sprockets-whistle | Sprocket's Whistle | L | At the start of each of your turns, Sprocket fetches: Pry 5 at the first living enemy, free. A part he breaks drops 1 extra Scrap. Unlocked by `h-whole-clock`. | run-defining |

Counts: 15 Common (12 v1, 3 new), 14 Uncommon (10 v1, 4 new), 3 Rare (2 v1, 1 new), 4 Masterwork, 2 Legendary, 4 Boss: 42 trinkets. A run holds at most one Legendary, part or trinket.

## 6. Events

Adapted from v1's 22 plus 6 new (28 total), each tied to a room (rules 4.4: 3 to 4 events per act). Costs: Cogs became **Scrap**; "part rewards" and shops are gone, so events that handed out a random part now say "find" (a part from the event, not a reward screen); a locked part never turns up. Some choices cost or refund **hours** (section 11). **Resident**: the event can send a person to Bellfoot after the run (rules 5.4); taking that choice means giving up the others. **Landmark**: a feat that changes later runs (rules 5.4). Sprocket keeps his three events.

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
| hour-ghost | 1 to 3 | The Hour Ghost | A faint figure winds a clock that isn't there. (1) Help: transform a part into a random unlocked part of the same rarity. (2) Ask about the inventor: lore, gain 10 Brass. (3) Ask him to come down to Bellfoot: he sits beside the archivist and adds lore pages and fuller bestiary entries (the archivist is there from your first run). | Hour Ghost | |
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
| **new** vault-wheel | 1 to 3 | The Vault Wheel | A wheel on a vault door. (1) Turn it with a Spire Key: the vault opens, the guardian is not woken. (2) Pick the lock: 25 Scrap and 1 hour. (3) Walk on. | | An opened vault (stays a known room; achievement `m-vaults`) |

Resident events: oil-merchant, apprentice, hour-ghost, lamplighter, traders-cousin (5, one per resident). Landmark events: lamplighter, beacon, vault-wheel. Lore events (the town stuck at dusk, the inventor gone, the Clockmaker stopping the hour): hour-ghost, journal, stopped-clock, empty-chair, unsent-letter.

Lore thread (what the events tell, in order): the inventor built the Spire to keep Bellfoot's time and built the Clockmaker to tend it; one evening at supper the inventor was gone; the Clockmaker, who could not bear the evening to end, stopped the hour; the machines, with no one to tend them, went feral.

## 7. Achievements (33)

Rules 5.6: rewards scale with difficulty. Easy: journal pages and Sprocket's collars (cosmetic). Medium: Rare and Masterwork parts and trinkets into the pool, landmarks, the fourth chassis. Hard: Legendary parts and trinkets and Overwind levels. Conditions count on Journeyman or harder unless stated; progress shows on the trophy shelf. Every Masterwork (10 parts, 4 trinkets) and Legendary (5 parts, 2 trinkets) is unlocked by exactly one achievement below. **Early, non-win feats open rarity**: `m-act2-breaker` (a Rare), `m-bell3` (a Masterwork trinket) and `m-quick-foreman`, `m-break-all`, `m-burst`, `m-status`, `m-three-elites` (Masterwork parts and a trinket) need no win, so rarity shows within the first few runs.

| id | Name | Condition | Tier | Reward | Hidden |
|---|---|---|---|---|---|
| e-first-win | The Last Evening | Win a run on any mode | easy | Journal page "Dawn, at last" (Overwind opens only after a Journeyman or harder win, rules 5.7; that is a rule, not this reward) | no |
| e-pet | Good Dog | Pet Sprocket 50 times | easy | Red collar (cosmetic) | no |
| e-bell | Early Bird | Ring a warden's bell with at least 4 hours left, once | easy | Journal page "Spare hours"; brass bell collar | no |
| e-resident | New Neighbor | Send a resident to Bellfoot | easy | Journal page "A lamp in the street"; the resident's stall opens | no |
| e-lore | Five Forty-Seven | Hear the Hour Ghost, read the Stopped Clock, the Empty Chair and the Unsent Letter, in any runs | easy | Journal page "Where the evening went"; dusk collar | yes |
| m-act2-breaker | Spare Parts | Reach act 2 having broken 12 or more enemy parts in act 1 (any mode, no win needed) | medium | Unlocks **Sapper** (R) | no |
| m-bell3 | Punctual | Ring a warden's bell with at least 3 hours left, three times in total (any runs) | medium | Unlocks **Two Left Hands** (M trinket) | no |
| m-quick-foreman | Clocked Out Early | Defeat the Foreman in 6 turns or fewer (his floor is 5) | medium | Unlocks **Skewframe** (M) | no |
| m-break-all | Take Them Apart | Break every part of a warden in one fight, including the optional ones | medium | Unlocks **Night Watchman** (M) | no |
| m-residents | Full Street | Have all five residents living in Bellfoot | medium | Unlocks **Mirror Gear** (M) | no |
| m-all-chassis | Every Hand | Win with the Tinker, the Stoker and the Horologist | medium | Unlocks **Twin Mainspring** (M) | no |
| m-calm-steam | Easy on the Valve | Win a run with 3 or more Steam parts in your bin at the end and no overpressure | medium | Unlocks **Free Pawl** (M) | no |
| m-status | Slow Burn | Deal 60 damage with Scald in a single fight | medium | Unlocks **Conductor's Baton** (M) | no |
| m-burst | One Big Day | Deal 100 damage in a single turn | medium | Unlocks **Resonance Rod** (M) | no |
| m-bells | Ahead of Time | Ring the bell with at least 3 hours left in all three acts of one run | medium | Unlocks **Hour Hand** (M) | no |
| m-vaults | Locksmith | Open the vault in every act of one run | medium | Unlocks **Ballast Lance** (M); landmark: an opened vault | no |
| m-no-plating | Bare Metal | Win a run having gained under 150 Plating in total | medium | Unlocks **Cascade Piston** (M) | no |
| m-lift | Going Up | Repair the Lamplighter's lift | medium | Landmark: the repaired lift | no |
| m-beacon | A Light on the Rim | Light the Cold Beacon | medium | Landmark: the lit beacon | no |
| m-salvager | Magpie | Break 100 enemy parts in total | medium | Unlocks the fourth chassis, the **Scrapper** (section 8) | no |
| m-fuse | Better Together | Fuse three times in one run | medium | Unlocks **Core Drill** (R) | no |
| m-drill | Through the Plate | Break a part that a Shell, Bulwark or Governor was protecting, using a Drill | medium | Unlocks **Overrun Coupler** (M trinket) | yes |
| m-shatter | Chip Chip Chip | Break 3 parts of one enemy in a single turn with Shatter | medium | Unlocks **Sunder** (R) | no |
| m-wrecker | Scrap Merchant | Win 25 fights by killing a core with 2 or more of its parts still standing (any runs) | medium | Unlocks **Tow Hook** (M trinket) | no |
| m-three-elites | Hunter | Defeat an elite in each act of one run | medium | Unlocks **Foresight Dial** (M trinket) | no |
| h-master | Master of Hours | Win a run on Master | hard | Unlocks **Apprentice's Hands** (L); Overwind 4 to 5 | no |
| h-clockwork | Clockwork | Win a run on Clockwork | hard | Unlocks **Bottled Dusk** (L); Overwind 6 to 7 | no |
| h-flawless | Not a Scratch | Defeat any warden without taking damage during that fight | hard | Unlocks **Sprocket's Blanket** (L) | no |
| h-ow5 | Wound Tight | Win a run at Overwind 5 | hard | Unlocks **Perpetual Engine** (L); Overwind 8 to 9 | no |
| h-ow8 | Wound Tighter | Win a run at Overwind 8 | hard | Overwind 10 (The Thirteenth Hour) | no |
| h-ow10 | The Thirteenth Hour | Win a run at Overwind 10 | hard | Unlocks **Sun-Orb Core** (L) | yes |
| h-master-bare | Bare and Bold | Win a run on Master gaining under 150 Plating in total | hard | Unlocks **The Inventor's Watch** (L trinket) | no |
| h-whole-clock | Every Last Gear | In your winning fight, break every part of the Clockmaker, the memory part included | hard | Unlocks **Sprocket's Whistle** (L trinket) | yes |

Counts: 5 easy, 20 medium, 8 hard: 33. Hidden: 4 (e-lore, m-drill, h-ow10, h-whole-clock). Unlocked: Masterwork parts 10 and trinkets 4, Legendary parts 5 and trinkets 2 (one achievement each), Rares 3 (sapper, core-drill, sunder), landmarks 3 (lift, beacon, opened vault), chassis 1, Overwind levels 1 to 10 in stages (first Journeyman or harder win: 1 to 3; then as above). Play styles covered: no-Plating, burst, statuses, Steam, part-breaking, wrecking, early bells, the town (residents, pets), chassis variety, speed, hunting elites, flawless wardens, Overwind.

## 8. Fourth chassis: the Scrapper

Unlocked by `m-salvager` (break 100 enemy parts). A tinker who lives off the Spire's leavings.
| Chassis | Parts (8) | Passive |
|---|---|---|
| Scrapper | Pry Bar x2, Spur x2, Cold Chisel, Escapement x2, Mending Spool | The first enemy part you break each combat is salvaged upgraded (+), and you may keep any one wrecked part's salvage per combat. |
Why it fits the v2 systems: Pry Bar and Chisel aim damage at parts, the passive pays for breaking them, and the Mending Spool gives it its first healing. It starts strong at breaking, weak at burst and Plating, which is the point.

## 9. Overwind twists (10)

Unlocked only after a first win on Journeyman or harder (rules 5.7), in stages (section 7). Level N includes every twist below it; +10% Brass per level. Harsher as they go.
| Level | Name | Twist |
|---|---|---|
| 1 | Loose Bolts | Traders charge 15% more. |
| 2 | Short Days | Each act has 1 hour fewer. |
| 3 | Thick Plates | Enemy parts have 20% more HP. |
| 4 | Cold Joints | The first part you place each combat is Rusted until your next turn. |
| 5 | Restless Elites | Roaming elites step twice after your move on every 3rd move. |
| 6 | Thin Oil | Oil stations heal half as much. |
| 7 | Salvage Rot | You may keep only one salvaged part per combat; the rest scrap for 2 Scrap each. |
| 8 | Wound Springs | Every enemy attack deals +2. |
| 9 | The Warden Stirs | Wardens start with one extra part (a Pierce Drill, a Governor Cap, a Drain Valve or a Purge Chime, picked from your plan as the Clockmaker's memory does). |
| 10 | The Thirteenth Hour | The Clockmaker gains a fourth phase after Midnight: his core re-seals behind two keystones, Thirteenth Chime (HP 30, Pierce 18 every turn) and Hourless Dial (HP 30, Rewind 3 combinations), both Braced to 15 a turn, and Plating is lost at the start of each of his turns. The core then reopens with 40 HP, Braced to 13 a turn (3 turns at least), and no Governor. Phase beat: "There is one more hour. I kept it for you." |

## 10. Prices and values *(tune)*

Rules 4.2, 4.4 and 4.5, in one place. Prices are fixed (no variance).
| Item | Number |
|---|---|
| Part value (barter and Workbench rarity): Common | 20 Scrap |
| Uncommon | 35 |
| Rare | 60 |
| Masterwork | 100 |
| Trinket value: Common / Uncommon / Rare / Masterwork | 60 / 90 / 120 / 160 |
| Buy a part with Scrap alone | value + 25% (C 25, U 44, R 75, M 125) |
| Barter | hand over a part worth its value; pay the difference in Scrap |
| Oil from a trader | 15 Scrap, heal 15 |
| Upgrade (Workbench): C / U / R / M / L | 15 / 25 / 40 / 60 / 80 |
| Remove a part (Workbench) | 25 Scrap, +15 per use in a run |
| Fuse (Workbench) | free; two inputs lost, one result kept |
| Pick a lock | 25 Scrap and 1 extra hour |
| Scrap per salvaged part scrapped | 3 (locked salvage: 6; wrecked part: 1) |
| Scrap per fight (core drop) | regular 3 to 6 (header of each enemy), elite 12 to 18, warden 30 |
| Vault | one Masterwork (part or trinket) and 40 Scrap; act 3: a Legendary instead if unlocked and none held |
| Early bell | 6 Scrap and 2 Brass per hour left; Prepared: +1 placement on your first warden turn per 3 hours left, at most +2 |
| Missed midnight | the warden is Overwound: Strength 3 and Shell 10 at the start of the fight |
| Oil station | rest (1 extra hour): heal 30% of max HP; or polish: +4 max HP; once per station |
| After a warden | heal 40% of the HP you've lost |
| Brass per room cleared: act 1 / 2 / 3 | 2 / 3 / 4; elite +10, warden +25, victory +50 |
| Clockmaker's broken parts | 4 Brass each |
| Event costs | listed per event in section 6 |
| Hours | move 1; rest 1 extra; pick a lock 1 extra; Journeyman midnight at hour 12 |

## 11. Rule decisions and open questions

**Resolved in docs/rules.md (D3):**
1. Bump only when every acting part is broken; resting turns are quiet (2.1).
2. Pry X is defined as proposed (2.3).
3. Countdown ticks by 1 and resets; the Queen's heat is its own **Build-up X to Y** (2.4); Jam pauses either (2.3, 2.4).
4. Rewind is the action of a breakable part in each Clockmaker phase (4.9).
5. The Clockmaker's broken parts pay 4 Brass; Legendaries come only from the Queen's core, or the act 3 vault if none is held (4.4, 4.7, 5.6).
6. Ratchet grows its enemy's Strength every turn the part stands, so it punishes slow builds and ignoring the part (2.4); no sealed frame carries one.
7. Legendary upgrade 80; any part can be removed; a held Legendary doesn't block a vault's Masterwork; fuse is greyed with a reason when no target exists; Masterworks never fuse into Legendaries (4.4).
8. Buff, Enrage, Purge, Echo and once-at-start Summon are in 2.4.
9. Event choices may cost or refund hours, shown on the button (4.2).
10. No price variance (4.5); trader odds as section 1.
11. A status applies to the whole frame (3).
12. A Spring Trap release can break the acting part and cancel the rest of its action (2.6).
13. Salvage is optional to keep (2.5); the simulator watches bin size.
14. Phase timing: a Run's remaining damage is lost when the last keystone breaks; the next enemy turn is the phase action only; cadences restart (4.8). Braced makes 2 turns per phase and 3 for the last a floor (2.4).

**Round 2 decisions in this file:** the Plating bypass shares per act (3.0); regular cores at about 60% of HP; every Ratchet is 1; Corrode is a percentage everywhere (regulars 50%, elites and wardens 50% to 75%); wardens re-sized for Braced with floors 5, 7 and 7 turns; Masterwork and Legendary trinkets (section 5); early non-win feats open a Rare, a Masterwork trinket and Masterwork parts (section 7); the archivist is present from the first run and the Hour Ghost adds lore pages and fuller bestiary entries (section 6); warden lines picked from content and lore (the lines are final here; lore.md is synced to them).

**Still open (my reading of the rules):**
1. **Corrode credit has no defined reference stack** in 7.4 (7). This file uses the spike's means (37, 50, 59) and keeps Corrode out of the headline share; the rule should say so, or the test will pick its own.
2. **Echo as Pierce** (Echo Sprite) changes the rules 2.4 line "Attacks for the damage...": the table needs "as Pierce, min 6, max 18".
3. **Foresight Dial** shows intents two turns ahead, but 1.6 rolls intents at the end of the enemy turn for one turn. Pre-rolling the second turn is deterministic but must be written into 1.6, and a Rewound or Jammed turn can change what it showed.
4. **The Inventor's Watch** winds back a Run: 1.6 and 6 (saved after every action) need a rule for which streams rewind (draws are kept, so no re-roll exploit) and what the preview shows afterwards.
5. **Braced and Shatter/Sweep**: the per-part cap applies to the sum of a turn's hits; a Sweep that hits a keystone and a core counts per target. Confirm that the cap resets at the start of your turn, and that a Mend-rebuilt keystone is Braced from its new HP.
6. **Build-up across phases**: this file lets the Queen's Gauge reading carry from phase 1 to 2 and resets it when Mend rebuilds it; the rules should say that cadence restarts but gauges don't.
7. **Vault guardians and Braced**: guardians are elites, not wardens, so they are not Braced. Intended, but the Orrery guardian's sealed core with no Ring then dies faster than the patrolling one.
8. **Spire Key vs Brass**: two things share a word in tooltips ("Spire Key", "Brass"); consider "Iron Key". Not changed here.
