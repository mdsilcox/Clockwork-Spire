# Clockwork Spire: acceptance criteria

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
| O2 | any screen | open the glossary | every term in docs/rules.md marked bold has an entry | U, E | B2 |
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
