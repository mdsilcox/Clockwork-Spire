# Brief: B3 lane `combat-hooks`

Read `CLAUDE.md`, then `docs/rules.md` 4.4 (the Clockmaker), 5.4 (chassis passives), `docs/content.md` "Trinkets", and `src/core/defs.ts`, `src/core/combat.ts`, `src/core/enemy.ts`, `src/core/machine.ts` (you wrote much of this code's shape in B2 if you are the same agent; otherwise read it).

## Goal
All 28 trinkets' combat effects, the three chassis passives, and the Clockmaker's Rewind, inside combat, exactly by the rules.

## You own
`src/core/combat.ts`, `src/core/machine.ts`, `src/core/enemy.ts`, `src/core/defs.ts`, `src/core/content/trinkets.ts` (add hooks; keep ids, names, rarities, texts and exports), `src/core/content/parts.ts` (only the `springThreshold` check point for Spare Spring), `src/core/content/enemies.ts` (Clockmaker only), `tests/core/trinkets.test.ts`, `tests/core/rewind.test.ts` (new). You may ADD fields to combat types in `src/core/types.ts` (never rename or remove; list additions). Don't edit `run.ts`, `map.ts`, `events.ts`, `chassis.ts`.

## Build
1. **Trinket hooks** for every combat-time trinket (all except the run-level list `RUN_LEVEL_TRINKETS` in trinkets.ts, but including Mainspring Key's +1 tick): combat start (Oilcloth Plating, Bellows Pressure, Magnet Ward), turn start (Pocket Watch first turn, Extra Pocket, Hourglass from turn 5, Feather Duster once), tick (Copper Wire), strike (Whetstone Grit, Brass Knuckles first Strike each turn), statuses (Cracked Lens, Soot Mask), tick added (Counterweight), overpressure (Pressure Gauge threshold 25, Steam Locket Sweep 10), Grease Pot rust immunity next to the Mainspring, Spare Spring thresholds, Ember Coal boilers +1, Echo Chamber first firing echoes. The preview must stay exact (hooks run inside the machine on the copy too). Emit existing event kinds (plate, pressure, status, echo, sweep...) so the stage shows them.
2. **Chassis passives** via a new `CreateCombatOpts.chassis?: string`: Tinker (the first replace each combat refunds the placement), Stoker (start with 6 Pressure), Horologist (first turn +1 tick).
3. **Rewind** (rules 4.4, acceptance C6-C9): at the start of the Clockmaker's turn (before his action), find last turn's strongest combination from `lastTurnContrib` (highest value, ties to the lowest cell index; the combination is that part plus its `fedBy` part when that is a placed part), lift both off the board into the draw pile (top, so they come back soon; charge and counter lost), heal him half the damage that combination dealt (round down), emit one `rewind` event per lifted part (cell, uid) before his action. Phase 2 (`phase` 1) also sets Pressure to 0. Phase 3 (`phase` 2) rewinds the two strongest distinct combinations and Jams the Mainspring on alternate turns (a `sabotage` jam on his 1st, 3rd, 5th... turn in that phase). Parts with value 0 are never rewound; if nothing scored, nothing is rewound. On a phase change the board is kept and his statuses clear; emit `phase` with his one-line text (rules 4.4: short, melancholy, no em dashes).
4. **Tests:** make `tests/core/b3.acceptance.test.ts` C6-C9 and R7 green (the R1-R6, C3 and W9 cases belong to the run-core lane and may stay red in your worktree). Add a test per trinket proving its effect with a concrete number, and passives tests.

## Assumptions and decisions
- Trinkets reach combat as `CombatState.trinkets` (ids), already passed by `createCombat`.
- The Clockmaker's phase-1 first intent must be an attack (not Shell), so C6's damage reads exactly 12.
- Rewound parts go to the top of the draw pile in uid order.
- Own git worktree (path in the launch message). Don't commit. Never stash, checkout, reset or restore. American English; no em dashes.

## Done when
`npx vitest run` green in your worktree except the run-core cases; `npx tsc --noEmit` clean; the B2 fight report still runs (`npm run sim -- --mode fights --fights 500 --seed 1 --date 2026-10-04 --json /tmp/x.json`, no file committed). Report per template.
