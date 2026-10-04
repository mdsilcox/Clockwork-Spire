# Clockwork Spire: project context

A turn-based roguelite for browser (desktop and phone landscape). The player builds a machine of clockwork parts that runs each combat turn. Full brief: `SPEC.md` (never edit it). Decisions: `DECISIONS.md`. State of the run: `PROGRESS.md`.

## Stack and commands
Vite 8 + TypeScript (strict) + Preact 11 (`@preact/signals`) for DOM UI; Canvas 2D for the machine/combat stage; Vitest 5; Playwright 1.63; `vite-plugin-pwa`; `idb` (IndexedDB); Web Audio for all sound. See DECISIONS.md D-006, D-007.
- `npm install && npm run dev` start the game. `npm test` runs everything (unit, sim targets, e2e).
- `npm run sim -- --careers 200 --seed 1` writes a balance report to `balance/`.
- Scripts: `dev` (Vite, port 5173), `build` (`tsc --noEmit && vite build`), `preview`, `test` (unit then e2e), `test:unit` (`vitest run`, files in `tests/**`), `test:e2e` (Playwright, `e2e/`, web server on port 5320, projects `desktop` 1280x800 and `phone` 667x375 touch, 2 workers), `sim` (placeholder). TypeScript 7 (`tsc --noEmit`); JSX is Preact (`.tsx`).

## Key interfaces (B1 skeleton)
- `src/core/types.ts`: contract types (CombatState, GameEvent, TurnPreview...). Added in B1: `CombatState.handSize`.
- `src/core/defs.ts`: `PartDef`, `EnemyDef`, `TickCtx` (hooks a part uses: `strike`, `sweep`, `plate`, `addPressure`, `spendPressure`, `addTick`, `release`, `boostOut`).
- `src/core/content/parts.ts`: `PARTS`, `partDef(id)`, `partName`, `partText`. Add a part by appending an entry to the list. `content/enemies.ts`: `ENEMIES`, `enemyDef(id)`, `registerEnemy`.
- `src/core/rng.ts`: `initStreams(seed)`, `split`, `next/int/pick/shuffle(rngState, stream, ...)`. State lives in `CombatState.rng`.
- `src/core/board.ts`: `cell('B2')`, `cellName(i)`, `neighbors(i)` (up, right, down, left), `diagonals(i)`.
- `src/core/machine.ts`: `runMachine(c, events)` resolves one turn of ticks (BFS from the Mainspring), overpressure at the end. `src/core/combat.ts`: `createCombat`, `placePart`, `swapParts`, `setTarget`, `previewTurn` (runs the machine on `cloneCombat`), `runTurn` (machine, enemies, next turn start), `chooseIntent`. `src/core/testkit.ts`: `combatWith({board, enemies, hand, pressure, ticks, hp})`.
- `src/render/`: `Stage` (canvas; `play(events, before, after)` replays events, `setState`, `setPreview`, `onView`, `onEvent`), `layout.ts` (shared with the DOM overlays), `replay.ts` (`timeline`, `applyEvent`, `StageView`). The renderer never re-runs rules.
- `src/app/controller.ts`: signals `screen`, `combat`, `replaying`, `view`, `speed`; actions `newFight`, `place`, `swap`, `target`, `run`, `setSpeed`, `preview`. `window.__game` (debug and e2e hooks: `state`, `place`, `run`, `newFight`, `setSpeed`, `preview`, `setEnemyHp`, `debugBoard`, `debugEnemy`). Autosave to IndexedDB slot `practice` (`save.ts`).
- Sound: `src/audio/synth.ts` (Web Audio, muted when `navigator.webdriver`).
- Rules decisions made in B1: Boost goes to every part the boosting part passes motion to (not cumulative); overpressure damage is absorbed by Plating; a rust set by an enemy lasts through the player's next machine run; Shell falls when its owner starts its turn; the machine stops ticking once every enemy is dead.

## Directory layout
- `SPEC.md` the owner's spec, frozen.
- `docs/` vision, data model, rules, acceptance criteria, roadmap.
- `review/<phase>/round-<n>.md` critic verdicts, never overwritten.
- `balance/` balance simulator reports, dated.
- Source layout: see `docs/roadmap.md` ("Source layout"). Rules in `src/core/` (pure, no DOM), sim in `src/sim/`, canvas in `src/render/`, audio in `src/audio/`, Preact screens in `src/ui/`, controller/save/debug in `src/app/`. Tests in `tests/` (Vitest) and `e2e/` (Playwright).
- Design docs: `docs/rules.md` (all rules), `docs/content.md` (every part, enemy, trinket, event), `docs/data-model.md` (state types, invariants), `docs/acceptance.md` (criteria ids), `docs/roadmap.md`.

## Conventions
- American English, no em dashes anywhere (UI text, docs, comments).
- Text is short; tone warm, curious, a little melancholy.
- All art drawn in code; all sound synthesized. No downloaded assets.

## Where plans live
Orchestra board project `clockwork-spire`, prefix `cs~`.
