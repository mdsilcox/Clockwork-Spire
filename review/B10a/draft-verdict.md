# Draft verdict: B10a Bellfoot and the Spire's memory

Reviewer: critic, in place of the owner's draft approval (D-035). Read: docs/briefs/B10a-bellfoot.md (a8d3cde), rules 4.2, 5.1 to 5.5, content.md 6, 7, 8, data-model "Version 2", acceptance 14 and AR6, roadmap-v2. Spot-checked the tree: `content/events.ts`, `types.ts` (`Profile`), `meta.ts`, `run.ts` (oil), `src/art/sprocket.ts` anchors, `public/art` size (1.1 MB). The game was not run.

## Verdict: FAIL on the average (7.25 against 7.5); no blockers. Revise with the 9 must-fix items and resubmit; a short second pass should do.

| Metric | Score | Evidence |
|---|---|---|
| Plan quality | 8 | The B10 split mirrors B9's, lanes follow data ownership (memory-core: rules and data; bellfoot-ui: screens; bellfoot-scene: art), the contract pre-places the place list and scene anchors (`town.ts`, scene shape), the painted street is non-blocking with a code-drawn fallback, per-lane CSS files, a phase the owner can try (a town to walk, a resident to send, a landmark next run). |
| Spec fit | 7 | Place list, residents, archivist tabs and Scrapper match rules 5.1 to 5.4 and content 8. Mismatches: the beacon's "hour 0", the oil flask numbers, the vault landmark scope, the lift destination, six events that do not exist yet. |
| Risk handling | 7 | Scene fallback, skippable walking, scroll inside the frame, tests that must not be weakened. Unaddressed: CL1/CL8 invariants under new generation patches, the lift shortcut trivializing the bell, autoplay and career tests after the routing change, AR6's sound bed. |
| Testability | 7 | BF1 to BF3, BF5, BF6 have named files; each resident and landmark effect has a test line. Gaps: no per-effect test list for the new generation patches, and e-lore, bestiary and journal have no stated facts or tests. |

Average 7.25. Pass rule (no blockers, each at least 7, average at least 7.5): not met by 0.25.

## Lane split by coupling
memory-core and bellfoot-ui share: the profile fields (`residents`, `landmarks`, `rewards`, `collar`, `journal`, `bestiary`), `ResidentDef` and `LandmarkDef` (names, stall text, map entries), and the place list. The contract covers all three (types, data with no effects, `town.ts`), which is right. bellfoot-ui and bellfoot-scene share only the scene shape and the anchors, also contracted. The one real seam is data nobody owns (see M4 and M5). The split is sound.

## Must-fix
M1. **The six new events do not exist.** `content/events.ts` has oil-merchant, apprentice, hour-ghost and lamplighter; traders-cousin, stopped-clock, empty-chair, unsent-letter, beacon and vault-wheel are absent (grep). e-lore, m-lift (via lamplighter's lift), m-beacon and the Trader's cousin all need them. memory-core's ownership says only "resident and landmark choices". Name all six events, their effects and their lore text, and add a test per event choice.

M2. **The beacon landmark contradicts the hour rule.** Rules 4.2 say every act starts at hour 0, so "act 3 starts at hour 0 with a clearer layout" (rules 5.4, content 6) gives nothing. The brief copies it as "hour 0 with its layout revealed". Decide what the beacon does (reveal act 3's layout; or the act's hours +N), amend rules 5.4 and content 6, and make "clearer layout" differ from the Lamplighter's "fully revealed" (state both, or merge). Test it.

M3. **Landmarks' scope and the lift.** (a) The opened vault: which act's vault? vault-wheel appears in acts 1 to 3 and m-vaults also grants "an opened vault"; the brief says "that act's vault" and "or any vault opened when the m-vaults reward arrives", which is two sources with no defined landmark id. Use per-act ids (`vault-1..3`) or one, and say what m-vaults grants. The guardian "replaced by a regular fight": define it (a normal encounter of the act). (b) The lift passage "from the entry to a room on the top floor" can end next to the warden's door and make the bell trivial (one or two moves, 10 or more hours left, +60 Scrap). Specify the endpoints (a room one floor below the door or the middle floors), and require CL1 (200 seeds, at most 5 moves entry to door, 16 to 20 rooms) to hold with every patch combination (lift, known vault, beacon, extra trader, reveal). (c) "Give him a Cams and levers part": say what happens when the bin has none (choice disabled, hint) and that the part leaves the bin.

M4. **Unowned data: journal text, bestiary recording, collars.** `content/story.ts` (journal pages "Dawn, at last", "Spare hours", "A lamp in the street", "Where the evening went" and the lore lines) is in no lane. Nothing records `profile.bestiary` (when is an enemy "met"? who writes it: `recordFight`?) and `Profile` has no `bestiary` or `collar` field (types show `journal` and `collars` only). Collar ids, names and colors (red, brass bell, dusk) have no definition; the Sprocket rig's anchor is named `collar` (not "neck"; the brief should say `collar`). Assign each to memory-core with a test (a met enemy appears, an unmet one shows a silhouette; the Hour Ghost unlocks fuller text).

M5. **Resident effects against the docs.** Oil Merchant: rules say "start each run with 2 oil", the brief invents "oil flask usable at any room, heal 20% each"; the repo's oil is a trader item (heal 15, 15 Scrap) and an oil station (30%). Pick one number and one use (a `run.oil` count used from the section screen or between fights, heal 15 as the trader sells it), state when it can be used (not in combat?) and test it. Trader's cousin: "one extra trader per act placed by generation" must keep room counts and CL1 (convert a fight room, do not add one); Apprentice (a random starting part upgraded) needs its seed stream named (`run` stream, so a reload stays equal, invariant 4).

M6. **e-lore and the facts that open the five achievements.** e-lore needs persisted flags for hearing the Hour Ghost and reading the Stopped Clock, Empty Chair and Unsent Letter across runs, which are not listed (`achievementProgress`). e-resident, m-residents, m-lift and m-beacon need a stated trigger point (the lift is "repaired" when the choice is taken, but the achievement lands at the run's end, B9b's rule). Add these facts and one test per achievement, including the shelf dropping "Opens with Bellfoot".

M7. **AR6 and BF6 are only partly covered.** AR6 requires a painted backdrop with code ambience (steam, lamps) and an ambient sound bed; no lane builds the code ambience or the audio bed (`src/audio/music.ts` has a workshop loop only). BF6 says Sprocket is painted "in Bellfoot and in the Spire" and walks with the tinker between rooms; the brief delivers Bellfoot only (roadmap gives BF6 to B11). Assign the ambience and bed (scene lane or a small audio step), and either keep the Spire half in B11 explicitly (update roadmap-v2 and D-043) or include it. The roadmap currently has A3 owning scenes and B11 AR6; D-043 must move them.

M8. **Routing change vs existing tests.** Controller routing moves the end of a run and Continue into Bellfoot. `e2e/helpers.ts`, `workshop.spec.ts`, `career.spec.ts`, `src/app/autoplay.ts` and `window.__game` state names (`phase: 'workshop'`) all depend on the Workshop being the home. The brief names only workshop.spec and helpers. Add `autoplay.ts`, `career.spec.ts` and the hooks to bellfoot-ui, and require the career test green (as B8's career break showed it fails when forgotten).

M9. **Scrapper details.** Passive: "salvaged upgraded" (a PartInstance with `plus`) and "keep one wrecked part's salvage" need the exact salvage-path behavior (the first part broken each combat; a wrecked part with a salvage id offered once per combat) and a test; the chassis rack must show the Scrapper only when `rewards.chassis` or `chassisUnlocked` has it (B9b should-fix), and `m-all-chassis` must still count only Tinker, Stoker and Horologist.

## Should-fix
- Walking: say the arrow-key and Enter handling does not trap focus, that tapping during a walk opens at once, and that e2e checks the street's `scrollWidth` stays inside its frame while `document.scrollWidth` does not grow at 667x375.
- Scene budget: 600 KB per scene on top of a 1.1 MB art folder fits AR1's 6 MB, but state the cap in `art.mjs` tests.
- The code-drawn street the UI lane draws and the painted one must share anchors; add a test that each place anchor lies inside the scene.
- Orphans from the B10a/B10b split: none critical. B10b owns modes, the clock tower door content, Overwind (`rewards.overwind`), the six `h-*` achievements, AD4, AD5, BV1, BV2, BV5, BV10. Confirm the B10b draft takes the `lastMode` and `modesUnlocked` fields and the Brass scaling, and that B10a leaves the door as a read-only panel.
- Sprocket (spec 2.4): his corner, collar and pet counter (e-pet) are in scope and his v1 reactions (`sprocketMood`) must keep working after the move; add a Bellfoot test for happy, sleepy and the collar drawn on the `collar` anchor.

## What was tested
Document and code read only: no `npm test`, no server. Confirmed by grep: six events missing in `events.ts`, no `bestiary` or `collar` in `Profile`, `rewards` exists in `meta.ts`, Sprocket's rig has a `collar` anchor, `public/art` is about 1.1 MB.

## Resubmit when
M1 to M9 are applied; I expect plan 8, spec fit 8, risk 7, testability 8.
