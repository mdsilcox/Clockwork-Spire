# Brief: B4 lane `meta-balance`

Read `CLAUDE.md`, then `docs/rules.md` sections 5 (Workshop, earning, upgrades, chassis, Sprocket moods, the curve) and 7 (the simulator and its targets), `docs/acceptance.md` rows W1-W4 and BS2-BS4, and the contract files `src/core/meta.ts` (stubs), `src/core/content/upgrades.ts`, the Profile types in `src/core/types.ts`. Your B3 code in `src/sim/` is the base (if you are a new agent, read `src/sim/run.ts` and `src/sim/runbot.ts`).

## Goal
Every run makes the player permanently stronger, and the curve matches the spec, proven by the simulator's tests: no-meta win rate under 3%; median first win on a sensible upgrade path between run 8 and run 12; no part's offer-based impact above 2x the median.

## You own
`src/core/meta.ts` (implement the stubs; keep signatures), `src/core/content/upgrades.ts` (numbers may change; ids fixed), `src/core/content/story.ts` (new: Workshop notes), `src/sim/**`, `tests/sim/**`, `tests/core/meta.test.ts`, `balance/**`. For tuning you may also change numbers (never shapes or ids) in `src/core/content/enemies.ts`, `src/core/rewards.ts` and the Brass constants in `src/core/run.ts` (`brassFor`), but prefer meta knobs (Brass, upgrade costs and effects) first; every number you change goes into your report and into `docs/content.md` / `docs/rules.md` tables (you may edit those tables). Not `src/ui/**`, `src/app/**`, `src/render/**`.

## Build
1. **Meta rules** (`meta.ts`): `newProfile`, `upgradeCost`, `buyUpgrade`, `runConfigFor(profile, seed, chassis)` (Reinforced Frame +5 max HP per level, Spare Cogs +25, Oiled Bearings upgraded starters, Tool Belt hand 4, Inventor's Notes 4 reward choices / extra elite blueprint, Lucky Charm a random common trinket from the seed, Second Wind; `unlockedParts` = profile blueprints), `finishRun(profile, run, endedAt)` (W1: in one mutation adds Brass from `brassFor`, blueprints found, the RunRecord (newest first, capped at 100), runsStarted, wins, bestFloor (absolute), chassis unlocks (Stoker: reached act 2; Horologist: beat the act 2 boss), story flags, returns `{ record, mood, newUnlocks }`), `buyChassis(profile, id)` (the Brass alternative: Stoker 150, Horologist 300), `sprocketMood(record, bestFloorBefore)` per rules 5.5, `workshopNotes(profile)` returning the unlocked note lines in order.
2. **Story notes** (`content/story.ts`): about 8 short notes pinned on the Workshop wall, one per milestone (first run, first death in act 1, first act 2, first boss, first elite blueprint, each chassis unlock, first Clockmaker sighting, victory): the inventor's voice, warm, curious, a little melancholy, one or two sentences each, mentioning Sprocket in at least two. No em dashes.
3. **Careers** (`src/sim/career.ts`): `playCareer({ seed, maxRuns: 30, path })` from `newProfile`, plays runs with your run bot using `runConfigFor`, applies `finishRun`, buys upgrades on the sensible path from rules 7 (Reinforced Frame, Spare Cogs, Oiled Bearings, Tool Belt, Inventor's Notes, Second Wind, Lucky Charm, then remaining levels) and unlocks chassis when earned (the bot then rotates chassis), until the first win. CLI `npm run sim -- --mode careers --careers 100 --seed 1 --date <d>` writes `balance/<date>-careers-<seed>.md`: win rate by meta band (Brass spent bands), runs-to-first-win distribution (median, quartiles, never-won count counted as 31), and the offer-based part impact table (rules 7) over all runs.
4. **Targets as tests** (`tests/sim/targets.test.ts`): BS2 (no meta, 300 runs, win rate under 3%), BS3 (100 careers, median first win 8 to 12 inclusive), BS4 (no part's impact above 2x the median). Use fixed seeds. Keep the suite under about 3 minutes total; if needed run BS3 with 100 careers in a worker or mark it as the `test:sim` script included in `npm test`.
5. **Tune** until all three pass with margin (median first win near 10; no-meta under 2%). Log every iteration's key numbers in your report and write the final reports to `balance/`.

## Assumptions and decisions
- The "sensible upgrade path" is the rules 7 order; the bot buys the next affordable item on it after each run.
- A competent human beats the bot; the spec's curve is about the bot.
- `finishRun` is the only place Brass and blueprints are added; it must be idempotent-safe: the app calls it once per finished run (guard with the run's seed and `stats` in the record).
- Parallel lanes: `workshop-ui` (screens, slots, flow) and `sprocket` (art, barks, ending). They call your `meta.ts` API by its signatures.
- Own git worktree (path in the launch message). Don't commit. Never stash, checkout, reset or restore. American English; no em dashes.

## Done when
`npx vitest run` green including the targets; `tsc` clean; careers and no-meta reports in `balance/`. Report the final numbers and every changed constant.

## From the B3 critic
- 19 of 46 parts had too few offers to measure and 57% of no-meta bot runs die in act 1, so the report says little about acts 2 and 3. Careers (with meta) reach later acts: compute the offer-based impact table over all career runs so every part gets measured (report any still under 30 offers per group), and add a "strong bot" check (for example 4-choice rewards and better pathing) only if needed to measure.
