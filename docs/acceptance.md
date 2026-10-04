# Clockwork Spire: acceptance criteria

**Version 2.** Sections 1 to 8 are v1's (all green at `v1.0`). v2 adds sections 9 to 17. Where v2 replaces a v1 rule, the v1 criterion is **superseded**: its test is rewritten or retired in the build phase that builds the replacement. Every other v1 criterion stays green. The Phase column of sections 9 to 17 is filled in at D5 (roadmap).

Superseded by v2: C2 (the reward becomes the salvage tray: SV1), C4 (enemy defs become frames: EM1), C6 to C9 (kept as WP4 and WP5, phases as keystones: WP1), R1 (node map: CL1), R2 (part reward: SV1), R5 (shop: SV4), R9 (map screen: CL7), A1 (no image files: AR1), BS2 and BS3 (the curve moves to the expert bot: BV1, BV2).

Every feature, as Given / When / Then with exact numbers where rules decide them. Each criterion has an id, a test kind (**U** unit or rules test in Vitest, **S** balance simulator test, **E** Playwright end-to-end at 1280x800 and 667x375, **C** critic or browser check) and the build phase that turns it green (see `docs/roadmap.md`). The U and S criteria become test files in the phase's contract step before any lane starts, and never get weaker.

Test harness contract (built in B1): `src/core/testkit.ts` exports `combatWith({ board: { B2: 'spur', C2: 'coil+' }, enemies: ['dummy'], hand: ['spur'], pressure?, ticks? })`, which builds a `CombatState` with the given parts placed; `dummy` is an enemy with 999 HP and no attack. Board cells use the A1 to E3 names; `+` marks an upgraded part.

## 1. The machine (rules: docs/rules.md section 1)
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| M1 | Spur at B2, dummy | run the turn | dummy takes 9 (3 ticks x Strike 3); momentum 3 | U | B1 |
| M2 | Spur at C2, B2 empty | run | dummy takes 0; Spur is not powered (not connected) | U | B1 |
| M3 | Coil Spring B2, Spur C2 | run | ticks 1 and 2 charge the coil and stop motion; tick 3 releases Strike 10 and powers the Spur once: dummy takes 13; coil charge 0 | U | B1 |
| M4 | Idler B2, Spur C2 | run | Spur deals 5 per tick: dummy takes 15 | U | B1 |
| M5 | Pendulum B2, Spur C2 | run | 4 ticks; dummy takes 4 (pendulum) + 12 (spur) = 16 | U | B2 |
| M6 | any board | preview, then run | preview totals equal the run's totals exactly, and preview leaves the state unchanged (deep equal before and after) | U | B1 |
| M7 | Spur B2 Rusted, Spur C2 | run | neither fires; dummy takes 0; next turn rust is gone | U | B2 |
| M8 | Boilers pushing Pressure to 22 by end of turn | turn ends | player takes 6; Pressure is 10 | U | B2 |
| M9 | Lever B2, Spur C2 | run | Spur fires with Echo: dummy takes 18 | U | B2 |
| M10 | Cam B2 | run two turns | turn 1 deals 7 (2nd firing), turn 2 deals 14 (4th and 6th) | U | B2 |
| M11 | same seed, same choices | play a full combat twice | identical event lists | U | B1 |
| M12 | every part in the catalog | build its def | has name, family, rarity, text, textPlus; its upgraded form differs in at least one number; 46 parts, 6 families, at least 40 and at least 5 | U | B2 |
| M13 | hand has a part, cell occupied | place onto it | old part goes to discard with its charge cleared; placements left drops by 1 | U | B1 |
| M14 | Mainspring cell A2 | try to place on it | refused, state unchanged | U | B1 |
| M15 | the board on screen | hover or long-press any part, status or intent | a tooltip names it and explains it in one or two lines | E | B2 |
| M16 | a turn on screen | change the board | the preview badges and totals update before Run, and match what Run then does | E | B1 |
| M17 | Run pressed | the turn animates | gears turn, pulses travel cell to cell in the rules' order, numbers pop; skip speed resolves instantly | C, E | B1 |

## 2. Combat and enemies
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| C1 | an enemy with intent Attack 8 and the player with 5 Plating | enemy acts | player loses 3 HP; Plating is gone at the start of the next turn | U | B1 |
| C2 | all enemies at 0 HP | the turn resolves | combat ends in victory with a reward pending | U | B1 |
| C3 | player at 0 HP | enemy acts | the run ends in defeat; a RunRecord is written | U | B3 |
| C4 | every enemy def (15 normal, 6 elite, 3 boss) | simulate 10 turns against a fixed board | no exception (in B2 the Clockmaker runs without Rewind, which C6-C9 cover in B3); intents always have a label and an icon kind; each def's intent sequence differs from every other def's | U | B2 |
| C5 | Gauge Gremlin intends Rust | its intent shows | the targeted cell is highlighted before the player builds | E | B2 |
| C6 | the Clockmaker, phase 1, last turn the Coil (fed by the Idler) dealt the most | his turn starts | Coil and Idler return to the draw pile with charge 0; he heals half the damage they dealt | U | B3 |
| C7 | the Clockmaker at 0 HP in phase 1 and 2 | the phase ends | the next phase starts with its own HP bar; at phase 3's end the run is won | U | B3 |
| C8 | Clockmaker phase 2 | his turn starts | Pressure resets to 0 in addition to the rewind | U | B3 |
| C9 | Clockmaker phase 3 | his turn starts | the two strongest combinations are rewound; the Mainspring is Jammed on alternate turns | U | B3 |

## 3. The run
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| R1 | a seed | generate act maps | 3 acts, each 12 floors plus a boss floor; floor 1 all fights; floor 7 forge; floor 12 oil; no elite before floor 4; every node reachable from floor 1 and reaches the boss | U | B3 |
| R2 | a fight won | the reward shows | Cogs added; 3 part choices (4 with Inventor's Notes); skipping is allowed | U, E | B3 |
| R3 | a Forge | choose upgrade or remove | exactly one part upgraded or removed | U | B3 |
| R4 | an Oil station | repair | heals 30% of max HP (rounded down), not above max; or polish gives +4 max HP | U | B3 |
| R5 | a Shop | buy with enough Cogs | item added, Cogs deducted; can't buy without enough Cogs | U, E | B3 |
| R6 | every event (22) | each choice applied to a sample run | no exception; outcome text matches the effect; at least 3 events are Sprocket events | U | B3 |
| R7 | every trinket (28) | its hooks run in a sample combat | no exception; each has text; at least 25 | U | B3 |
| R8 | a run in progress | reload the page mid-combat | the same combat resumes with the same hand, board and intents | E | B3 |
| R9 | the map on screen at 667x375 | scroll and tap a reachable node | it enters that node; unreachable nodes can't be chosen | E | B3 |

## 4. Workshop, meta and Sprocket
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| W1 | a run ends (win or loss) | the result screen closes | Brass and blueprints are in the profile, in the same save write as the RunRecord | U | B4 |
| W2 | 40 Brass | buy Reinforced Frame I | Brass 0; next run max HP 55 | U, E | B4 |
| W3 | conditions for Stoker or Horologist met | return to the Workshop | the chassis is unlocked and selectable; each has its own starting bin and passive | U, E | B4 |
| W4 | a victory, a good climb, a bad run | return to the Workshop | Sprocket celebrates, wiggles, or nudges respectively (state visible via `window.__game`) and barks | U, E | B4 |
| W5 | idle 20 s in the Workshop | wait | Sprocket goes sleepy | E | B4 |
| W6 | Sprocket | look at him | he reads as a corgi: short legs, big upright ears, fluffy rear; idle, happy and sleepy poses | C | B4 |
| W7 | three save slots | create, play, reload, delete | each slot keeps its own profile; reload restores all three; delete asks to confirm | E | B4 |
| W9 | the Sprocket Wheel part and Sprocket's Collar Tag | look them up and reach them in play | both exist, are reachable (blueprint event, pipe event) and have tooltips | U | B3 |
| W8 | the Clockmaker defeated | the ending plays | victory ending with Sprocket, then credits; afterwards the Workshop, with the profile marked won | E | B4 |

## 5. Onboarding, settings and quality of life
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| O1 | a brand-new profile | the first run starts | a guided first fight teaches place, preview, run, intents in short steps; it can't be lost | E | B2 |
| O2 | any screen | open the glossary | every term in docs/rules.md sections 1 to 5 marked bold has an entry (reads docs/rules.md again since B7) | U, E | B2 |
| O3 | how to play | open it | a short page explains a turn with a diagram | E | B5 |
| Q1 | settings | change music, effects volume, mute | audio levels change and persist across reload | E | B5 |
| Q2 | animation speed set to skip | run a turn | the result appears with no animation delay | E | B5 |
| Q3 | color-blind icons on | look at intents | every intent shows a distinct shape and a text label, not color alone | E | B2 |
| Q4 | finished runs | open history and statistics | each run listed with chassis, result, floor reached, killed by; totals and best turn | E | B5 |
| Q5 | normal play through a full run | watch the console | no errors | E | B6 |
| Q7 | a full board running at 1x | sample frame times for 5 s | average at least 55 fps at 1280x800; no frame over 50 ms | E | B2, B6 |
| Q6 | offline | load the installed app with the network off | it starts and plays | E | B5 |

## 6. Look and sound
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| A1 | the game | inspect the build | no image, font-as-picture or audio files; all art is drawn in code | U (a test scans `public/` and `src/` for media files) | B1 |
| A2 | each act, the Workshop and the Clockmaker | play there | a distinct synthesized music loop plays | C, E (`__game.audio.track`) | B5 |
| A3 | parts firing, impacts, steam, Sprocket | play | synthesized sounds for each | C | B5 |
| A4 | 1280x800 and 667x375 | every screen | no sideways scroll; text at least 12 px on phone; tap targets at least 40 px | E | every phase |

## 7. Balance simulator (ids BS, so they don't clash with build phase names)
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| BS1 | the sim, seed fixed | run twice | identical reports | S | B2 |
| BS2 | no meta progression | 300 runs | win rate under 3% | S | B4 |
| BS3 | 100 careers on the sensible upgrade path | play until first win (cap 30 runs) | median first win between run 8 and run 12 inclusive | S | B4 |
| BS4 | the per-part table | compute offer-based impact ratios (rules 7) | the highest is at most 2x the median | S | B4 (tracked from B2) |
| BS5 | any content or balance change | gate | a dated report exists in `balance/` | C | every phase from B2 |

## 8. Platform
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| P1 | a fresh clone | `npm install && npm run dev` | the game opens at the printed URL | C | B1 |
| P2 | `npm test` | run | unit, sim and e2e suites run, green | C | every phase |
| P3 | `window.__game` | in the browser | exposes `state()`, `place(hand, cell)`, `run()`, `choose(i)`, `go(nodeId)`, `newRun(chassis)`, `seed(n)`, `setSpeed(s)`, `cheat.*` for tests | E | B1, grows each phase |
| P5 | a fresh save | the bot plays a full career through `window.__game` at skip speed | the Clockmaker is defeated and the victory ending shows; README explains how to run and play | E | B6 |
| P4 | the manifest and service worker | Lighthouse-style check | installable, offline after first load | E | B5 |

## 9. Enemy machines and targeting (rules 2.1 to 2.3)
Test harness addition: `combatWith` accepts `enemies: [{ core: 40, parts: [{ id: 'jaw', hp: 8, action: 'attack 5x2', cadence: 'odd', salvage: 'spur' }], sealed: true, keystones: ['jaw'] }]` as well as enemy ids, and `order: ['e0.jaw', 'e0.core']` for the target order.
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| EM1 | every enemy def (15 regular, 6 elite, 3 wardens) | build it | it has a core with HP and 1 to 8 parts; every part has hp, action, cadence; every salvage id is a part def or `spire-key`; an anchor is named for each part | U | |
| EM2 | an enemy whose Jaw (8 HP) shows Attack 5x2 | a Strike 9 at the Jaw | the Jaw breaks, its intent is cancelled, the enemy turn deals 0 from it; the 1 overkill is lost (core unchanged) | U | |
| EM3 | order [Jaw, core], Spur at B2 (Strike 3, 3 ticks), Jaw 5 HP, core 20 | run | tick 1: Jaw 2 left; tick 2: Jaw breaks (1 lost); tick 3: core 17 | U | |
| EM4 | empty order, two enemies | Strike | it hits the leftmost living enemy's front (core, or first keystone if sealed) | U | |
| EM5 | a sealed core | try to add it to the order; Sweep 5 | refused; the Sweep hits its first unbroken keystone instead | U | |
| EM6 | an enemy with every acting part broken | its turn | it performs its core action only | U | |
| EM7 | any board and order | preview, then Run | per-target damage, breaks, deaths and cancelled intents in the preview equal the run's exactly; preview leaves state unchanged | U | |
| EM8 | the combat screen at 1280x800 and 667x375 | tap two parts and a core | they show 1, 2, 3 badges on the painting's anchors; tapping again removes one; the order persists next turn with broken entries removed | E | |
| EM9 | a part shows an intent | look at it | the intent icon, number and HP pips sit on the part's anchor and follow it as the rig moves; the tooltip names the part and its action | E | |
| EM10 | Shatter 4 with order [e0.core], e0 has 3 parts | run | each unbroken part of e0 takes 4; the core takes 0 from Shatter | U | |
| EM11 | Drill 10 against Shell 6 and a standing Bulwark | run | the core takes 10 | U | |

## 10. Enemy actions: counters to turtling and burst (rules 2.4, 3)
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| EA1 | player Plating 20; enemy Pierce 7 | enemy acts | player loses 7 HP; Plating 20 untouched | U | |
| EA2 | Plating 12; Corrode 50% then Attack 9 | enemy acts | Plating 6 after Corrode; the attack takes it to 0 and deals 3; with Plating 40, Corrode 50% strips 20 | U | |
| EA3 | Plating 10; Siphon 8; core 30 of 40 | enemy acts | player loses 0 HP; Plating 2; core 38 | U | |
| EA4 | Ratchet 2 standing for two of your turns, then broken | turns end | Strength 2, then 4, then no more growth; its attacks deal +4 | U | |
| EA5 | Countdown 2: Pierce 25 | two enemy turns pass / the part breaks first / it is Jammed once | Pierce 25 lands on the second, then it resets to 2 / nothing happens / it lands one turn later | U | |
| EA12 | Build-up 6 to 20: Attack 40, with a bonus of the Pressure it drains | three enemy turns with 0, 4, 0 drained | gauge 6, 16, 22: the Attack 40 lands on the third turn and the gauge drops to 0 | U | |
| EA6 | Bulwark standing; Strike 9 at the core | run | core takes 4; after the Bulwark breaks, 9 | U | |
| EA7 | Governor 8; a Strike 20 | run | the target takes 8 | U | |
| EA8 | Mend (rebuild) on a broken Jaw | enemy acts | the Jaw returns at half HP with its action; its salvage no longer counts as broken | U | |
| EA9 | Jam on a part | next enemy turn | that part skips; the turn after it acts normally | U | |
| EA10 | Patch 5 at 30 of 50 HP; Patch 5 at 48 of 50 | run | 35; 50 | U | |
| EA11 | every regular enemy | read its def | at least one part has an action or passive that answers Plating (Pierce, Corrode, Siphon, Ratchet, Countdown) or burst (Bulwark, Governor, Shell); at least half the regulars carry a Plating answer and at least a third a burst answer, checked from the actions, not from tags | U | |

## 11. Wardens and phases (rules 4.7 to 4.9)
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| WP1 | a warden in phase 1 with keystones A and B | break A, then B on tick 2 of a Run with 30 damage left over and tick 3 still to come | phase 2 begins at the end of the Run; the 30 and all of tick 3's damage to the warden are lost; phase 1's remaining intents are cancelled; the warden's next turn is its phase action only; then the new phase's cadences start at turn 1 | U | |
| WP8 | a keystone of max HP 40 and a last-phase core of 90 (Braced) | a Run that would deal 100 to each | the keystone takes 20, the core 30; the rest is lost; so any build needs at least 2 turns per phase and 3 for the last | U | |
| WP2 | the last keystone of a phase breaks | the turn resolves | the phase action (summon, heal or Rewind) happens once and was shown first; the phase line and phase mood play | U, E | |
| WP3 | each warden | read its def | Foreman 2+ phases, Queen 2+, Clockmaker 3; each phase adds a mechanic the previous one lacks | U | |
| WP4 | the Clockmaker with the Tick Spring standing; last turn the Coil (fed by the Idler) dealt the most; then the Tick Spring broken | his turn starts | Coil and Idler return to the draw pile, charge 0; he heals half their damage (v1 C6, kept); after the Spring breaks, no Rewind for the rest of the phase | U | |
| WP5 | Tock / Midnight | his turn starts | Pressure resets / two combinations rewound and the Mainspring Jammed on alternate turns (v1 C8, C9, kept) | U | |
| WP6 | the profile's last three runs mainly Plating | the Clockmaker fight starts | he has the Pierce drill part; the archivist's note before the run named it | U, E | |
| WP7 | the Queen's phase change on screen | it plays | the `phase` mood runs on her rig and the broken gauge stays shown broken | E, C | |

## 12. The climb (rules 4.1 to 4.6)
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| CL1 | 200 seeds | generate each act | 16 to 20 rooms on 5 to 6 floors; connected; at least two loops; entry at the bottom, warden's door at the top; shortest entry-to-door path at most 5 moves; room counts per rules 4.4; patrols are loops of 3 to 5 rooms avoiding entry and door | U | |
| CL2 | hour 3, a connected room | move | hour 4; elites step one room along their patrols | U | |
| CL3 | an elite steps into the player's room / the player steps into an elite's | resolve | a fight with that elite starts there | U | |
| CL4 | hour 11, one move | move, then resolve the room | the warden fight starts at midnight after the room resolves, and the warden is Overwound (Strength 3, Shell 10) | U | |
| CL5 | at the warden's door at hour 6 (Journeyman, 6 hours left) | ring the bell | +36 Scrap, +12 Brass, Prepared 2 (two extra placements on the first warden turn); the warden fight starts, not Overwound | U | |
| CL6 | a cleared room | move through it again | no encounter; 1 hour passes | U | |
| CL7 | the act screen at 667x375 and 1280x800 | look | the whole section, the clock, hours left and each elite's next room visible with no sideways scroll; tapping a connected room walks there (tinker and Sprocket animate, skippable) | E | |
| CL8 | visibility | enter a room | it and its neighbors show their kind; others show silhouettes; a Lamplighter resident reveals all | U, E | |
| CL9 | a locked door | use a Spire Key / pick the lock | it opens / it opens for 25 Scrap and 1 extra hour | U | |
| CL10 | an oil station | rest / polish | heal 30% of max HP and 1 extra hour / +4 max HP, no extra hour; once per station | U | |
| CL11 | a run in progress in an act | reload | same room, hour, elite positions, layout and revealed rooms | E | |

## 13. Salvage, Scrap, workbench, traders (rules 2.5, 4.4, 4.5)
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| SV1 | a fight won after breaking the Cog Rat's jaw (salvage spur) with its plate left standing | the salvage tray shows | a Spur Gear offered (keep, or scrap for 3); the wrecked Plate gave 1 Scrap; enemy Scrap added; no pick-1-of-3 screen | U, E | |
| SV2 | a broken part whose salvage is locked | the tray shows | 6 Scrap instead and a journal note | U | |
| SV3 | two Common Gears and a workbench | fuse | both leave the bin; two Uncommon Gear candidates show; the picked one joins the bin | U | |
| SV4 | a trader with a Rare (value 60); the player offers a Common (20) and 40 Scrap | barter | the Rare joins the bin, the Common leaves, Scrap -40; buying with Scrap alone costs 75 | U | |
| SV5 | the workbench | upgrade a Rare / remove twice | -40 Scrap / -25 then -40 Scrap | U | |
| SV6 | the offer-based impact metric | a run's offers | trader stock, fuse candidates and salvage kept versus scrapped all count as offers | S | |

## 14. Bellfoot and the Spire's memory (rules 5.1 to 5.5)
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| BF1 | a run ends | return | Bellfoot shows; Sprocket reacts per v1 W4; every place reachable by walking and by the town menu, at both sizes | E | |
| BF2 | the Lamplighter's lift fixed in a run that is then lost | next run | his stall is in Bellfoot; act layouts are fully revealed; the Gearworks has the lift shortcut | U, E | |
| BF3 | each resident | read content | each has an event that sends it and a stall effect applied the next run | U | |
| BF4 | runs whose main plan was Plating, Plating, burst | compute memory | Plating; the Clockmaker's extra part is the drill | U | |
| BF5 | a v1 profile with Spare Cogs II | migrate | Spare Scrap II, same Brass spent | U | |
| BF6 | Sprocket in Bellfoot and in the Spire | look | painted rig with idle, happy, sleepy and walk; he walks with the tinker between rooms | C, E | |

## 15. Achievements, rarity, difficulty (rules 5.6, 5.7; content)
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| AD1 | the catalog | read | about 30 achievements, each with id, condition, tier, reward; every Masterwork and Legendary part unlocked by exactly one achievement | U | |
| AD2 | an achievement's condition met mid-run | the run ends | it unlocks in the same save write as the RunRecord, shows on the trophy shelf, its reward is in the pool next run | U, E | |
| AD3 | a run | gain parts and trinkets | never more than one Legendary in total (part or trinket); locked items never appear; Legendaries come only from the Queen's core or, holding none, the act 3 vault | U | |
| AD4 | each mode | start a run | enemy HP and damage, hours per act, oil heal and Brass match rules 5.7 | U | |
| AD5 | no win yet / an Apprentice win / a Journeyman win | open the clock tower door | Overwind locked / still locked / Overwind 1 available; level N applies twists 1 to N | U, E | |
| AD7 | the catalog | read | trinkets have Masterwork and Legendary tiers too; at least one Rare and one Masterwork item is unlocked by an achievement that needs no win | U | |
| AD6 | parts of each tier | look | each tier distinct by color and by a shape mark, not color alone | E, C | |

## 16. Art and atmosphere (D-026, docs/art-direction.md)
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| AR1 | the build | scan `src/` and `public/` | no audio or font files; images only as WebP under `public/art/`, none in `src/`, no SVG; each listed in `src/art/manifest.ts` with an existing source under `art/`, and every manifest entry has its file; at most 120 KB per regular cut-out, 250 KB per warden, 6 MB in all (rescoped A1, D-033) | U | |
| AR2 | every enemy, warden and Sprocket in the manifest | load its rig | idle, attack, hurt (wardens also phase; Sprocket happy, sleepy, walk) and an anchor for every part in its def | U | |
| AR3 | the title screen at both sizes | open the game | the painted title with animated steam and lamps; Continue, New run, Settings; the tower not covered | E, C | |
| AR4 | combat with 3 rigged enemies at 667x375 with 4x CPU throttling | 10 s | rig work per frame median at most 16 ms and p95 at most 22 ms (half-density meshes, D-033); after a simulated WebGL context loss and restore, the enemies draw again | E | |
| AR5 | each art gate | the owner reviews | one clip per asset; an art-reviewer verdict in `review/<phase>/` | C | |
| AR6 | each act and Bellfoot | play there | a painted backdrop with code ambience (steam, lamps) and an ambient sound bed | C, E | |

## 17. Balance v2 (rules 7.4)
| id | Given | When | Then | Kind | Phase |
|---|---|---|---|---|---|
| BV1 | expert bot, no meta, Journeyman | 300 runs | win rate under 5%; greedy under 2% | S | |
| BV2 | 100 expert careers on the sensible path | until first win (cap 30) | median first win between run 8 and 12 | S | |
| BV3 | every elite and warden, and each act's normal fights, bins from expert runs | turtle and burst bots play them | each loses at least 1.5x the expert's mean HP on every elite and warden, and at least 10% of max HP on average in each act's normal fights | S | |
| BV4 | the expert, and the max-burst bot, against each warden | 100 fights each | expert median turns Foreman 6 to 9, Queen 7 to 10, Clockmaker 8 to 12; for both bots every phase at least 2 turns and the last at least 3 | S | |
| BV5 | the per-part table | offer-based impact | highest at most 2x the median | S | |
| BV6 | the expert bot | a career | under 50 ms per turn on average | S | |
| BV7 | a fixed seed | run any sim mode twice | identical reports (v1 BS1, kept) | S | |
| BV8 | the turtle bot, per act | count enemy turns | its Plating fully absorbs at most 40% of them | S | |
| BV9 | each act's regular pool in content | compute from the defs (rules 7.4 target 7) | at least 30% of expected damage per turn is Pierce or Siphon; Corrode credit reported, not counted | U | |
| BV10 | 100 greedy careers | until first win | median first win at most run 20 | S | |
| BV11 | rusher, grinder and expert route policies, same combat bot | 300 runs each | the expert wins more often than both | S | |
