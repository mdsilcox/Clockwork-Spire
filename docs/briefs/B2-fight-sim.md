# Brief: B2 lane `fight-sim`

Read `CLAUDE.md`, then `docs/rules.md` section 7 (the balance simulator), and `src/core/combat.ts` exports (`createCombat`, `placePart`, `swapParts`, `previewTurn`, `runTurn`, `cloneCombat`, `setTarget`).

## Goal
The first half of the balance simulator: a headless bot that plays **combats** well with the real rules, and a combat-level report on parts, so the B2 critic can judge Depth. Full runs and careers come in B3/B4 and will build on your bot.

## You own
`src/sim/**`, `tests/sim/**`, `balance/` (new dated reports). Nothing else.

## Build
1. `src/sim/bot.ts`: `chooseTurn(c: CombatState): { placements: { hand: number; cell: number }[]; swap?: [number, number]; target: number }`. Greedy with the preview: for each placement (up to `placementsLeft`), try every hand card in every legal cell (empty or replace, never A2) and keep the best by `score(preview)`: total damage (kills weighted up: an enemy finished is worth its remaining HP + 10), plus Plating valued up to the incoming attack total (from intents) and at a fifth beyond it, plus 1.5 per stored charge and 0.3 per Pressure under 18, minus 15 if overpressure, minus a small penalty for replacing a part with charge. Target the enemy that can be killed this turn, else the one with the highest incoming attack. Optionally try the free swap among the 6 best pairs. Deterministic: ties broken by lowest hand index then lowest cell. Keep it fast: use `cloneCombat` and `previewTurn`; budget about 200 previews per turn.
2. `src/sim/fight.ts`: `playFight({ seed, bin, enemies, hp }): { won: boolean; turns: number; hpLeft: number; biggestTurn: number; partsFired: Record<string, number> }`, capped at 30 turns (a cap counts as a loss).
3. `src/sim/combat-report.ts` and the CLI: `npm run sim -- --mode fights --fights 2000 --seed 1` plays fights from every act's encounter pool with random bins: a chassis start (Tinker) plus 4 to 10 random parts drawn by act rarity (docs/content.md), act-appropriate HP (50, 65, 80). Reports per part: pick count, fight win rate with vs without (bins containing it vs not, same encounter), average damage share, and the combat impact ratio (win rate with / without); per encounter: win rate and average turns; overall. Write Markdown to `balance/YYYY-MM-DD-fights-<seed>.md` using the date passed in `--date` (default: today from the system clock in the CLI only; the library code never reads the clock). Keep the old `cli.ts` behavior for unknown modes.
4. Content may grow while you work (the core lane adds the remaining 38 parts and 21 enemies in parallel): read `PARTS`, `ENEMIES` and `ENCOUNTERS` (`src/core/content/encounters.ts`, may not exist yet in your worktree: fall back to a built-in list of the B1 enemies when the import is missing) dynamically; never hardcode the part list.
5. **Tests (`tests/sim/`):** BS1: same seed, same report (byte-identical Markdown except the date line). The bot never makes an illegal move and never places on A2 (property test over 200 random combats). The bot beats a practice dummy setup and wins most act 1 easy fights with the Tinker start (a sanity check, not a balance target). A full 2000-fight report finishes in under 60 s.

## Assumptions and decisions
- Bot randomness (exploration, random bins) uses its own seeded RNG from `src/core/rng.ts`, never `Math.random`.
- The combat-level impact ratio is a B2 indicator for the critic, not the spec's run-level target (that is BS4 in B4, offer-based per rules 7).
- Own git worktree (path in your launch message). Don't commit. Never stash, checkout, reset or restore.
- American English; no em dashes.

## Done when
`npx vitest run` green in your worktree including `tests/sim/`; one report generated (it will be regenerated at the gate with all content merged). Report the bot's speed (previews per second, fights per second).
