# Brief: B3 lane `run-ui`

Read `CLAUDE.md`, then `docs/rules.md` section 4, `docs/acceptance.md` rows R2, R5, R8, R9, and the contract `src/core/run.ts` (signatures only; implementations arrive from the run-core lane at merge), `src/core/types.ts` (RunState, Pending, MapNode), `src/core/content/trinkets.ts`, `src/core/content/chassis.ts`, `src/core/content/events.ts` (EventDef shape). Then `src/app/controller.ts` and `src/ui/App.tsx`.

## Goal
A player climbs the Spire: picks a chassis (only Tinker for now), sees a beautiful act map, enters nodes, fights, takes rewards, reads events, shops, forges, oils, beats bosses, wins or loses, and can reload at any point and continue exactly there.

## You own
`src/ui/**`, `src/app/**`, `src/render/**` (for Rewind and map art), `src/audio/**` (new stings), `src/main.tsx`, `index.html`, `e2e/**`. Not `src/core/**` or `src/sim/**`.

## Build
1. **Controller:** a run lives in a signal; every action calls the run API and autosaves the whole `RunState` to IndexedDB (key `run`, one save for now; B4 brings 3 slots) after each action (placement, Run, reward, event choice, purchase, node entered). Reload restores the screen and state exactly, mid-combat included (R8). After each `runTurn` in a run combat, call `settleCombat(run)` once the replay finishes.
2. **Title:** "Climb the Spire" (new run, Tinker) and "Continue climb" when a run exists (never silently replace a run in progress: confirm). Keep Practice, Practice sandbox, Tutorial, Glossary.
3. **Map screen:** the act map drawn in code (SVG or canvas): brass nodes with distinct icons and shapes per type (fight crossed gears, elite horned gear, event question gear, forge anvil, oil can, shop coin, boss clock), paths, visited trail, current position, reachable nodes glowing; legend; act title ("Act 1: the Gearworks"); HP, Cogs, bin count, trinket bar with tooltips. Scrolls vertically on phone (R9: tap a reachable node to enter; unreachable can't be chosen). Opens scrolled to the current floor.
4. **Node screens (DOM):** Reward (Cogs line, part cards with full text and tooltips, Skip, trinket choice for elites and bosses, "Blueprint found" banner), Event (title, short lines, choice buttons showing their detail, greyed when unavailable; a part picker when `needsPart`; the outcome line; Sprocket events show a small "Sprocket" tag, his art arrives in B4), Shop (cards with prices, sold state, removal service with a part picker, oil), Forge (choose upgrade or remove, part picker showing base and + text side by side), Oil (repair or polish, numbers shown). A bin viewer (all parts, upgraded marked) reachable from the map.
5. **Combat in a run:** reuse the combat screen; header shows act and floor; boss phase banner; trinket bar. **Rewind visuals** (`rewind` events): the lifted cells flash, the part spins backwards and flies to the draw pile, a ticking-backwards sound; phase change flash and his line as a caption.
6. **Victory and defeat:** victory screen (a placeholder card: "The Clockmaker stops." plus run stats; the full ending with Sprocket is B4) and defeat screen (floor reached, killed by, Brass this run from `brassFor`). Both lead back to the title (B4 adds the Workshop).
7. **`window.__game` additions:** `newRun(seed?)`, `run()` (the RunState), `go(nodeId)`, `nodes()` (available ids), `reward(partIndex | null)`, `rewardTrinket(i | null)`, `choose(i)`, `pickPart(uid)`, `buy(i)`, `forge('upgrade'|'remove', uid)`, `oil('repair'|'polish')`, `leave()`, `cheat.winFight()` (sets enemies to 0 HP and runs a turn), `cheat.setHp(n)`, `cheat.gotoFloor(act, floor)` (for tests). Keep all B1/B2 hooks.
8. **E2E:** `e2e/run.spec.ts` at both sizes: start a run, tap a floor 1 node, win via cheat, take a reward, reach a forge/oil/shop/event node through `cheat.gotoFloor` and use each screen through the real UI, reload mid-combat and see the same hand, board and intents (R8), and a map tap test (R9). `e2e/victory.spec.ts`: cheat through to the Clockmaker, win, see the victory screen. No console errors, no sideways scroll.

## From the B2 critic
- Make the Rewind unmistakable (critic: "a visible rewind effect"): the lifted cells run their last animation backwards, a clock-hand sweep crosses the board, the parts fly back into the draw pile, and the Clockmaker's heal shows as a green number. The player should understand at a glance which combination he took and why.
- Bosses must feel big: a boss intro card (name, act, one line) before the first turn, and a phase banner on each phase change.

## Assumptions and decisions
- Until run-core merges, `src/core/run.ts` is stubs that throw: build against the signatures, and keep e2e specs that need a working run skipping when `run.ts` throws (`test.skip`); the orchestrator reruns everything after the merge.
- Map art and node icons drawn in code (no image files); readable at 667x375; tap targets at least 40 px.
- Short text; warm, curious, a little melancholy; American English; no em dashes.
- Own git worktree (path in the launch message). Don't commit. Never stash, checkout, reset or restore. Run e2e with `PW_PORT=5372 npx playwright test`; any dev server on 5373, stopped by PID.

## Done when
Unit and e2e green in your worktree (with run-dependent specs skipped until the merge); you looked at screenshots of every new screen at 667x375 and 1280x800. Report per template.
