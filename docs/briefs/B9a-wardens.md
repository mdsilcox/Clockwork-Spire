# B9a Wardens: shared brief (round 2, after review/B9/draft-verdict.md)

The draft critic failed the joint B9 plan (5.75) and recommended a split (S1). B9 is now two phases (D-040): **B9a Wardens** (this brief) and **B9b Rarity and achievements** (Masterwork and Legendary items with their engine hooks, the pool, the 33 achievements, the trophy shelf; drafted when B9a gates, answering the verdict's B1, B2, M4 (rarity half), M6, M7 and S3, S5). Splitting puts `recordFight`, `finishRun` and `combat.ts` under one lane per phase, which removes B2.

B9a makes the Foreman, the Boilermaker Queen and the Clockmaker frame machines with visible phases, Rewind parts and the Clockmaker's memory, with their painted rigs in the game. Rules: `docs/rules.md` 4.7 to 4.9, 5.4; data: `docs/content.md` 3.2, 3.4, 3.6; shapes: `docs/data-model.md` "Version 2". Owns acceptance WP2 to WP7 (WP1 and WP8 are green since B7), BV4, BF4 (core half) and AR2 for the three wardens' `phase` mood.

## Semantics (decided; don't re-decide)
- **Engine**: the B7 Braced phase engine (`enemy.ts`: `phaseActionPending`, `phaseTurn`, keystones, sealed core) stays and is already green on WP1 and WP8. Wardens move from the B8 legacy intents to `frame.phases` (`WardenPhaseDef` in `src/core/defs.ts`). Parts of earlier phases that still stand stay into later phases (the existing rule). Cadences restart each phase (`phaseTurn`); the Queen's Gauge reading carries over.
- **Phase actions** (the warden's whole next turn, shown first as its intent, no attacks):
  - Foreman 1 to 2: Summon a Cog Rat.
  - Queen 1 to 2: Summon a Steam Wraith. Queen 2 to 3: Mend: rebuild the Chest Gauge at half HP if it is broken, and its reading resets to 0.
  - Clockmaker 1 to 2: Rewind 1 combination (even if the Tick Spring is broken). Clockmaker 2 to 3: Jam the Mainspring for the player's next turn.
- **The Gauge spans phases** (D-040, fixing the verdict's M2): content.md 3.4 lists it for phases 1 and 2, but the 2 to 3 Mend rebuilds it, so it stays while it stands into phase 3 too. content.md's table is corrected in the contract commit. The B9a tune may lower its Pierce in phase 3 if BV4 needs it.
- **Conditional beats**: `WardenPhaseDef.beat` widens to `string | { ifBroken: string; text: string; otherwise: string }`: the Queen's 2 to 3 line depends on the Gauge (content.md 3.4).
- **Rewind** (rules 4.9, v1 C6 to C9 kept): at the start of each Clockmaker turn, while the phase's Rewind part stands, the player's strongest combination is lifted back to the draw pile with charge 0, and he heals half its damage. **Combination**: a placed part plus every part it passed motion to during the last machine run (one BFS chain from a feeder), scored by the damage that chain dealt last turn; ties: the chain containing the lowest board index. Hour Wheel lifts the two best. Tock Weight also sets Pressure to 0. Breaking the part ends Rewind for that phase.
- **Midnight Bell**: on odd phase turns Corrode 75%, then Attack 32; on even phase turns Jam the Mainspring and Attack 36 (two actions on one part, as B7 allows).
- **Plan stats** (fixing B3): `RunStats.plan: { plating; burst; pressure; statuses }`, added in the contract, accumulated per player turn from the GameEvent timeline in the run's settle path by `recordFight(run, combat)` (new, owned by wardens-core in B9a; B9b extends it in sequence, not in parallel):
  - plating: Plating the player gained;
  - pressure: damage dealt by Steam-family parts plus overpressure damage to enemies;
  - statuses: damage dealt by statuses the player applied, plus 3 per status stack applied;
  - burst: in any turn whose total damage is 30 or more, that turn's damage not already counted as pressure or statuses.
  The run's main plan is the largest; ties go plating, burst, pressure, statuses in that order; a run with all four at 0 records nothing. `finishRun` appends it to `profile.planHistory` (in the same save write, invariant 10).
- **Memory** (rules 5.4, WP6, BF4): the Clockmaker adds `memoryParts[plan]` for the most frequent plan of the last three `planHistory` entries (a tie goes to the latest run's plan); none with no history. The memory part is present from phase 1, not a keystone, and pays Brass 4.
- **The archivist's note** (WP6 E, fixing M3): rules say the archivist names the part before the run. Until Bellfoot exists (B10, which moves it into the archivist's place), the note is one line on the start-run panel in the Workshop: "The archivist says: he remembers your Plating. He has a drill now." (the plan and the part name vary). With no history, no line.
- **Warden cores in B9a**: the Foreman's and the Queen's cores give a Rare (through the existing salvage reward roll); B9b replaces this with the pool's Masterwork and Legendary rules. The Clockmaker gives no part; each of his broken parts pays Brass 4.
- **Phase line on screen** (WP2, the verdict's M4): the stage shows the beat line over the warden for 2.5 s (skippable, faster on `skip` speed) and the rig plays its `phase` mood; broken parts stay broken (notches kept) across the mood (WP7). The intent chip shows the phase action before it happens.
- **Fallback**: a warden rig that fails art review is not blocking: the code-drawn warden stays (D-033), logged at the gate.

## Steps and lanes (max three at once, D-039)
| Step | Owner | Owns | Turns green |
|---|---|---|---|
| **B9a.0 Contract** | orchestrator + test-porter | types (`beat` union, `RunStats.plan`, `Profile.planHistory`, `recordFight` stub with its call site), content.md Gauge fix, D-040; real failing tests: `tests/v2/b9-wardens.test.ts` (WP2 to WP6 U, BF4, plan stats), `e2e/v2-wardens.spec.ts` (WP2, WP6, WP7 E), BV4 in `tests/sim/v2-fights.test.ts`, AR2 `phase` mood in `tests/v2/b8-art.test.ts` | the suite runs; new tests red for the right reason |
| **B9a.1 wardens-core** | Sonnet | warden entries and `memoryParts` in `content/enemies.ts`, phase actions and Rewind in `enemy.ts`, `combat.ts` hooks they need, `recordFight` and the plan stats, `planHistory` in `meta.ts` `finishRun` and the memory choice, the warden-core reward in `salvage.ts`, the archivist line in `src/ui/Workshop.tsx`, `tests/v2/b9-wardens.test.ts` | WP2 to WP6 (U), BF4, WP6 (E) |
| **B9a.2 warden-rigs** (the rig-hub agent) | Sonnet | `art/foreman/**` (convert both paintings as `layers`), `art/clockmaker/**` (death polish: lift the head dial, soft glow), `src/art/foreman.ts`, `boilermaker.ts`, `clockmaker.ts`, `manifest.ts`, `public/art/**` for those three, `scripts/art.mjs`, the phase-mood and beat-line wiring in `src/render/stage.ts` and `rig.ts`, `e2e/v2-wardens.spec.ts` | AR2 (wardens), WP2 and WP7 (E) |
| **B9a.3 warden-bots** (the strategy-bots agent, after B9a.1 merges) | Sonnet | `src/sim/**`, `tests/sim/**`, `balance/` | BV4 |
| **B9a.4 tune** | the same agent | warden part HP, Braced caps and phase-action numbers only; one time-boxed round, logged in DECISIONS.md. If BV4 still misses, a `warn` check with the numbers, carried to B10's retune (not a blocker). | BV4 |
| **B9a.5 review** | browser-checker, art-reviewer | the three warden fights at 667x375 and 1280x800; the phase moods' extreme frames (review/B9a/) | |
| **B9a.6 gate** | orchestrator + a fresh critic | full suite, fixes from B9a.5, `review/B9a/gate-verdict.md` (pass: no blockers, each metric at least 7, average at least 7.5), merge to main | |
- Art size budget (AR1): at most 250 KB per warden including the Foreman's second layer; 6 MB in all.
- Known flag for B10: the expert's no-meta route win rate is about 15% against a target under 5%; the bots lane reports the figure after B9a's wardens.

## Rules for every lane
As B8's brief: never stash, checkout, reset or restore outside your worktree; commit only in your worktree; ports: wardens 5361, rigs 5363, bots 5364; deterministic core; American English, no em dashes; `data-testid`, 40 px taps, 12 px text, no sideways scroll at 667x375. Report what's green, what isn't, contract changes and what other lanes must know.
