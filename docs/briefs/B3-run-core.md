# Brief: B3 lane `run-core`

Read `CLAUDE.md`, then `docs/rules.md` section 4 (and 5.2 for Brass), `docs/content.md` ("Encounter pools", "Prices and values", "Reward rarity by act", "Events", "Trinkets"), `docs/data-model.md` (RunState), and the contract files named below.

## Goal
A complete run as pure rules: three act maps, every node type, rewards, shop, forge, oil, 22 events, act progression to victory or defeat, the run record. No UI.

## You own
`src/core/run.ts` (implement the contract stubs; keep every exported signature), `src/core/map.ts` (contract: `generateActMap(rng, act)`), `src/core/rewards.ts`, `src/core/shop.ts` (new, optional split), `src/core/content/events.ts` (all 22 events; keep the exported `EventDef` shape and `EVENTS` name), `tests/core/run*.test.ts` (new). You may ADD fields to the run types in `src/core/types.ts` (never rename or remove; list additions). Don't edit `combat.ts`, `machine.ts`, `enemy.ts`, `content/parts.ts`, `content/enemies.ts`, `content/trinkets.ts`, `content/chassis.ts` (other lanes or contracts).

## Build
1. **Map** (`map.ts`) per rules 4.1 and acceptance R1: 4 lanes, floors 1-12 with 2-4 nodes, boss on 13, 1-2 links per node to the next floor without crossing paths, floor 1 fights, floor 7 forge, floor 12 oil, no elites before floor 4, the type mix of 4.1, from the `map` stream of the RNG you are given. Node ids `${act}-${floor}-${lane}`.
2. **Run flow** (`run.ts`): every stub in the contract. `newRun` builds the bin from `CHASSIS[cfg.chassis].startingBin` (upgrading `cfg.upgradedStarters` random starters), sets HP, Cogs, trinkets (apply run-level trinket effects on gain), act 1 map, `phase: 'map'`, `floor: 0`. `enterNode` creates the combat with `createCombat({ seed: <from the run's 'enemy' stream>, bin, enemies, hp, maxHp, kind, trinkets, handSize, chassis: cfg.chassis })` (the `chassis` option is added by the combat-hooks lane; pass it anyway), encounters from `ENCOUNTERS` by act and floor (easy pool on floors 1-3, no repeat within the last 3), elites, the act's boss on floor 13. `settleCombat` handles win (Cogs per rules 4.2, part choices by act rarity and unlocked pool, a trinket for elites, a choice of 3 boss trinkets for bosses, blueprint drops: every elite and boss drops one locked part not yet found, plus the extra elite blueprint when `cfg.extraEliteBlueprint`), copies HP back, heals 40% of lost HP after a boss, Second Wind (once per run: survive at 1 HP; mark `flags.secondWindUsed`), loss (phase 'defeat', `killedBy`). After the act 3 boss: phase 'victory'. After acts 1-2 bosses: next act map, floor 0.
3. **Shop** (`makeShop(run)` exported from run.ts and used by `enterNode`): 5 parts (3 common, 1 uncommon, 1 uncommon or rare), 2 trinkets, removal (60, +20 per use this run), oil (30, heal 15), prices from docs/content.md with -10% to +10% from the `shop` stream, Gilded Cog -20%.
4. **Rewards and trinkets at run level:** Lucky Bolt (+20% fight Cogs), Tin Cup (heal 3 after each combat), Blueprint Scrap (+1 Brass per floor), Inventor's Spectacles (+1 part choice), Gilded Cog, Sprocket's Collar Tag (skip a part reward: +12 Cogs; Oil repair +5), Clockwork Heart (+8 max, heal 8 on gain), Brass Heart (+15 max on gain), Mainspring Key (hand size -1 for combats). Combat-time trinket effects are the combat-hooks lane's.
5. **Events** (`content/events.ts`): all 22 from docs/content.md with their titles, one to three short lines each (warm, curious, a little melancholy; no em dashes), and choices with a `label` and a `detail` that states the cost and effect plainly ("Lose 6 HP. Gain Sprocket's Collar Tag."). Choices needing a part set `pending.needsPart` and finish in `eventPickPart`. Choices unavailable (not enough Cogs) have `available(run) => false` and the UI greys them. The Gear Wheel's chance rolls from the `event` stream. Sprocket events: `sprocket: true`; `sprocket-blueprint` gives the `sprocket-wheel` blueprint the first time (else a random locked part not yet found). Events are drawn from the `event` stream, no repeats within a run.
6. **Brass and records:** `brassFor` per rules 5.2 (4/6/8 per floor by act, +10 elite, +25 boss, +50 victory, Blueprint Scrap); `runRecord`; `stats.offers` records every part offered (reward and shop) with taken or not, for the balance sim.
7. **Tests:** make `tests/core/b3.acceptance.test.ts` R1-R6, C3, W9 green (the C6-C9 and R7 cases belong to the combat-hooks lane and may stay red in your worktree). Add run tests: act progression to act 2 and to victory (cheating fights), boss rewards, blueprint drops, Second Wind, shop removal price rising, determinism (same seed and same choices, same run).

## Assumptions and decisions
- Pure and deterministic; RNG streams only; no clock.
- `CHASSIS`, `TRINKETS` and `EVENTS`/`EventDef` shapes are contracts; the run-ui and run-sim lanes code against them and against the `run.ts` signatures in parallel.
- Reward part pool: parts with `locked: false` plus `cfg.unlockedParts` plus blueprints found this run; never the Mainspring; no duplicates within one offer.
- Act HP does not reset between acts; max HP carries.
- Your own git worktree (path in the launch message). Don't commit. Never stash, checkout, reset or restore. American English; no em dashes.

## Done when
`npx vitest run` green in your worktree except the acceptance cases owned by combat-hooks; `npx tsc --noEmit` clean. Report per template.
