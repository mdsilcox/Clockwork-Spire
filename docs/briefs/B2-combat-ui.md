# Brief: B2 lane `combat-ui`

Read `CLAUDE.md`, then `docs/rules.md` (bold terms are glossary entries), `docs/acceptance.md` rows M15, O1, O2, Q3, C5, and `src/ui/*.tsx`, `src/app/controller.ts`.

## Goal
A new player understands a turn within two minutes: tooltips on every part, status and intent; a glossary; color-blind-safe intent icons; sabotage targets shown before you build; a guided first fight; and a practice sandbox to fight any enemy with any parts.

## You own
`src/ui/**`, `src/app/**`, `src/main.tsx`, `index.html`, `src/core/content/glossary.ts` (new), `e2e/**` except `e2e/perf.spec.ts`. Nothing else.

## Build
1. **Tooltips (M15):** hover (mouse), long-press 400 ms (touch) or focus (keyboard) on any hand card, board part, enemy, intent, status pip, Plating, Pressure, ticks, Momentum shows a small DOM tooltip: name, one or two lines of text (part `text` or `textPlus` from `PARTS`), current numbers (charge, counter, rust). Tooltips stay inside the viewport at 667x375. Glossary terms in tooltip text are underlined and open the glossary entry.
2. **Glossary (O2):** `src/core/content/glossary.ts` exports `GLOSSARY: { term: string; text: string; icon?: string }[]` covering every bold term in `docs/rules.md` (a unit test in `tests/ui/glossary.test.ts` greps the bold terms from rules.md and checks each has an entry; you own that test file). A Glossary screen reachable from the combat Menu and the title screen, searchable, readable at 667x375.
3. **Intent icons (Q3):** every intent kind has a distinct SVG-in-JSX shape (sword attack, shield defend, wrench sabotage, up arrow buff, down arrow debuff, clock charge, plus summon, spiral special) and a number; colors from the palette but never color alone; a "Color-blind icons" option (stored in localStorage for now; settings screen arrives in B5) adds a text label under each icon. Multi-hit shows "8 x2".
4. **Sabotage targets (C5):** when an enemy intends Rust or Magnetize, the targeted cell(s) get a pulsing DOM outline and a small wrench badge before the player builds; hovering the intent highlights its cells. Jam shows a wedge badge on the Mainspring; Drain on the Pressure gauge.
5. **Statuses on screen:** enemy status pips (scald, cracked, dazed, strength, shell) and player pips (corroded, grit, Plating) with icon + number + tooltip.
6. **Guided first fight (O1):** "Start the tutorial" on the title screen (and automatically on the very first launch, skippable). Uses `createCombat({ ..., noShuffle: true, enemies: ['tutorial-automaton'] })` with a scripted bin so the first hands are known. Short steps (one sentence each, a highlighted target, advance by doing the action): 1 place a Spur next to the Mainspring; 2 watch the preview badges; 3 press Run; 4 read the enemy intent; 5 place an Escapement for Plating; 6 a spring holds then releases; 7 the Rust intent and routing around it; 8 finish. It can't be lost: if HP would drop to 0, it stays at 1 and the tutorial says "The Spire is gentle today." `__game.tutorial()` returns the current step.
7. **Practice sandbox:** title screen "Practice" opens a picker: choose an encounter (all encounters from `ENCOUNTERS` grouped by act, plus every boss) and a bin (Tinker start, or "Random 10 parts", or pick parts from the full catalog). Then fight. This is how the critic and players try every part and enemy in B2.
8. **Combat polish:** target selection by tapping an enemy; a turn summary line after each Run ("Chain x14, 32 damage, 9 Plating"); Pressure gauge with the overpressure line at 20; tick counter; enemy HP bars with Shell; three or four enemies fit at 667x375.
9. **`window.__game` additions:** `tutorial()`, `practice({ enemies, bin })`, `glossary()`, `intents()` (array of {kind, label, target, targets}), `tooltip(selector)` returns tooltip text for tests. Keep B1 hooks.
10. **E2E:** `e2e/tutorial.spec.ts` (complete the guided fight through the real UI at both sizes), `e2e/ui.spec.ts` (tooltips on a part, an intent and a status; glossary opens and lists every term; rust target outline visible; color-blind labels; no horizontal scroll; no console errors). Keep `e2e/practice.spec.ts` green.

## Assumptions and decisions
- The core lane (`machine-content`) adds parts, enemies, `ENCOUNTERS` (`src/core/content/encounters.ts`), `noShuffle`, `tutorial-automaton` and new event kinds in parallel. Until its work merges, your worktree has only B1 content: code against the documented names and keep tests that need new content tolerant by skipping when the def is missing (`test.skip(!ENEMIES['gauge-gremlin'])`); the orchestrator reruns everything after the merge. Never edit `src/core/` files other than `glossary.ts`.
- Part family colors: read from `src/render/palette.ts` (the stage-art lane may add family accents there; don't edit it).
- DOM text at least 12 px at 667x375; tap targets at least 40 px; no sideways scroll.
- Own git worktree (path in your launch message). Don't commit. Never stash, checkout, reset or restore. Playwright `webServer` port: set `PW_PORT` env support in `playwright.config.ts` is NOT yours; run e2e with the config as is (port 5320) and nothing else on that port.
- American English; no em dashes; short warm text.

## Done when
Unit and e2e suites green in your worktree at both sizes; you completed the tutorial yourself at 667x375 and looked at screenshots of tooltips, glossary and the sandbox. Report per template.
