# Brief: B3 lane `run-sim`

Read `CLAUDE.md`, then `docs/rules.md` section 7, the contract `src/core/run.ts` (signatures; implementations arrive from run-core at merge), `src/core/types.ts` (RunState, Pending, RunConfig), and your B2 code in `src/sim/` (bot.ts, fight.ts, combat-report.ts, cli.ts).

## Goal
The bot plays complete runs with the real rules, and a run-level report measures what the spec's targets need: win rate, how far runs get, and offer-based part impact. Careers and meta-progression come in B4 and build on this.

## You own
`src/sim/**`, `tests/sim/**`, `balance/**`. Nothing else.

## Build
1. `src/sim/runbot.ts`: decisions for every run phase using the run API: map pathing (prefer fights early, elites when HP above 60%, oil when HP below 50%, shops with 100+ Cogs, events otherwise; ties by lane), reward picks (a value score per part from family synergy with the bin and the B2 combat stats; skip if the bin is over 20 parts and nothing scores well; 20% exploration: pick uniformly instead, from its own seeded stream), trinket picks (first listed unless exploring), shop (best value affordable part or trinket, removal of the weakest starter when Cogs allow), forge (upgrade the part that fired most; remove a starter Escapement or Spur when the bin is big), oil (repair below 70% HP else polish), events (a simple per-event preference table with a safe default: the choice with no HP loss).
2. `src/sim/run.ts`: `playRun(cfg: RunConfig, botSeed: number): { won: boolean; act: number; floor: number; record; offers }`, combat via your B2 `chooseTurn`.
3. `src/sim/run-report.ts` and CLI `npm run sim -- --mode runs --runs 300 --seed 1 --date 2026-10-04 [--json path]`: win rate (no meta, `defaultRunConfig`), act reached distribution, death floors, average HP at each boss, average run length in turns and wall time per run, per-encounter death share, and the offer-based impact per part (rules 7: took vs passed, within act; for acts 1-2 offers "win" = beat that act's boss, act 3 = beat the Clockmaker), median and max, flagging parts above 2x the median. Write `balance/<date>-runs-<seed>.md`.
4. **Tests (`tests/sim/`):** the run bot never makes an illegal call (every API call returns true) over 30 runs; determinism (same seed, same report except the date line); a 300-run report finishes in under 120 s; the no-meta win rate is reported (not asserted yet; BS2 is B4).

## Assumptions and decisions
- Until run-core merges, `src/core/run.ts` is stubs that throw; write the code against the signatures and mark run-dependent tests `it.skipIf(stubbed)` where `stubbed` is detected by calling `newRun` in a try/catch. The orchestrator reruns after the merge.
- Bot randomness only from its own seeded stream; the CLI is the only place that reads the clock (for the default date).
- Own git worktree (path in the launch message). Don't commit. Never stash, checkout, reset or restore. American English; no em dashes.

## Done when
`npx vitest run` green in your worktree (run-dependent tests skipped), `tsc` clean. After the merge the orchestrator will ask you for a report run. Report per template.
