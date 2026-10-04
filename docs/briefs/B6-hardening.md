# Brief: B6 lane `hardening`

Read `CLAUDE.md`, SPEC.md section 6 ("Done means"), `docs/acceptance.md` rows Q5, Q7, P5, and `src/app/controller.ts`, `src/sim/runbot.ts`, `src/sim/bot.ts`.

## Goal
Prove the release: the game can be won from a fresh save by normal play, there are no console errors anywhere in normal play, it holds its frame rate, and it fails gracefully.

## You own
`src/app/autoplay.ts` (new), `src/app/controller.ts` (only to register the autoplay hook and error handling), `src/app/save.ts` (error handling only), `e2e/career.spec.ts` (new), `e2e/sweep.spec.ts` (new), `e2e/perf.spec.ts`, `playwright.career.config.ts` (new), `package.json` scripts only, `tests/app/**` (new). Ask before touching anything else; the `polish` lane owns `src/ui/**`, `src/render/**`, `src/audio/**` this phase.

## Build
1. **Autoplay (P5):** `window.__game.autoplay({ maxRuns: 30, speed: 'skip' })` drives the REAL controller (the same actions a player takes: slot, Workshop purchases on the sensible path from rules 7, chassis choice, map nodes, placements and Run through `place`/`run`, rewards, events, shop, forge, oil) using the sim bots' decision functions (`chooseTurn`, the run bot's choices, the career's buying order), until the Clockmaker falls and the victory ending shows. Returns `{ runs, won, firstWinRun }`. No cheats inside autoplay.
2. **Career e2e:** `e2e/career.spec.ts` in its own config (`playwright.career.config.ts`, one worker, desktop only, generous timeout): fresh profile, `autoplay`, assert a win within 30 runs, the Ending shows, then the Workshop with the profile marked won and Sprocket celebrating, and zero console errors. Add `test:career` and include it in `npm test` last. Keep it under about 10 minutes; if it is slower, speed up the controller's skip path (no artificial waits at skip speed) rather than cutting the check.
3. **Console sweep (Q5):** `e2e/sweep.spec.ts` at both sizes visits every screen (title, slots, Workshop and each tab, settings, how to play, glossary, tutorial, sandbox with a boss, a run's map, every node type, reward, defeat, victory, ending, portrait card) and fails on any console error or warning, any unhandled rejection, and any horizontal scroll.
4. **Graceful failure:** IndexedDB unavailable (private mode) or quota errors: the game still plays with an in-memory save and shows a small notice "Progress won't be saved in this window"; a render or audio exception never blanks the screen (an error boundary shows "Something slipped a gear" with Reload). Unit tests for the save fallbacks.
5. **Performance (Q7):** keep `e2e/perf.spec.ts` green at 1280x800; add a phone-size run (667x375) with the same thresholds if it passes reliably, otherwise report its numbers.

## Assumptions and decisions
- Autoplay is a debug hook like `cheat.*`; it ships in the build (tests and the critic use it) but nothing in the UI exposes it.
- Own git worktree (path in the launch message). Don't commit. Never stash, checkout, reset or restore. e2e with `PW_PORT=5442`.

## Done when
Unit, e2e, offline and career suites green; report the career run's numbers and wall time.
