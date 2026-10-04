# Brief: B4 lane `workshop-ui`

Read `CLAUDE.md`, then `docs/rules.md` section 5 and 6 (saves), `docs/acceptance.md` rows W1-W5, W7, and the contracts: `src/core/meta.ts` (signatures; implementations arrive from meta-balance at merge), `src/core/content/upgrades.ts`, `src/core/content/chassis.ts`, Profile and SaveSlot types in `src/core/types.ts`, and `src/ui/Sprocket.tsx` (the Sprocket component's props; the sprocket lane implements it). Then `src/app/controller.ts`, `src/app/save.ts`, `src/ui/App.tsx`.

## Goal
The game has a home: three save slots, the Workshop hub between runs with Sprocket, the upgrade bench, the chassis rack, the inventor's notes, and the flow run -> result -> Workshop -> next run, all saved safely.

## You own
`src/ui/**` except `src/ui/Sprocket.tsx` and `src/ui/Ending.tsx` (sprocket lane), `src/app/**`, `e2e/**`, `index.html`, `src/main.tsx`. Not `src/core/**`, `src/sim/**`, `src/render/**`, `src/audio/**`.

## Build
1. **Save slots (W7):** IndexedDB holds three `SaveSlot`s (profile + run in progress + updatedAt) and a global `settings` record. A slot screen on launch: three cards (name, wins, best floor, runs, last played as "2 hours ago" / a date, "Empty slot" with "Begin"), Continue, New (name prompt, default "Tinkerer"), Delete with a confirm dialog. Migrate the B3 single `run` save into slot 1 once. A save that fails to parse is kept as `slot-N-corrupt` and never overwritten; the card shows "This save could not be read" with Delete. Each slot is independent (W7 e2e: create in two slots, play, reload, both intact).
2. **Run end (W1):** when a run reaches victory or defeat, call `finishRun(profile, run, endedAtIso)` and save `{ profile, run: null }` in ONE IndexedDB write before any result screen or celebration plays. The result screen (defeat: floor, killed by, Brass earned, blueprints found; victory: the sprocket lane's `Ending` component, then credits) leads to the Workshop.
3. **Workshop hub:** a warm lamplit room drawn in code (DOM/CSS/SVG or a small canvas: workbench, pinned notes, a window onto the Spire, a corgi bed). Sprocket (`<Sprocket mood=... onPet=... />`) greets you with the mood from `finishRun` (W4: celebrate / happy / comfort), goes `sleepy` after 20 s idle (W5), and a tap pets him (bark, wiggle). Panels: Brass and blueprints count; **Upgrade bench** (each upgrade, level pips, next cost, effect text, Buy; disabled with the reason when unaffordable); **Chassis rack** (three chassis, starting parts as small cards, passive text, locked ones show the unlock rule and a Brass buy option); **Notes wall** (`workshopNotes(profile)`, newest highlighted); **Blueprints** (the parts unlocked into the pool); door: "Climb the Spire" (choose chassis, then start with `runConfigFor`).
4. **Title flow:** title -> slot screen -> Workshop (or the run in progress: "Continue climb"). Tutorial, Practice, Sandbox and Glossary stay reachable from the title and the Workshop menu. First launch: tutorial first (as now), then slot screen.
5. **`window.__game` additions:** `slots()`, `useSlot(n)`, `newSlot(n, name)`, `deleteSlot(n)`, `profile()`, `buy(upgradeId)` (bench; rename the B3 shop `buy` to `shopBuy` and update the B3 specs), `buyChassis(id)`, `climb(chassis)`, `sprocket()` (current mood), `cheat.brass(n)`, `cheat.finishRun('win'|'loss', floor?)`, `cheat.idle(ms)` for the sleepy test. Keep all earlier hooks.
6. **E2E:** `e2e/workshop.spec.ts` at both sizes: W1 (finish a run via cheat; the profile already has the Brass when the result shows; reload on the result screen keeps it once, not twice), W2 (cheat 40 Brass, buy Reinforced Frame I, start a run with 55 max HP), W3 (unlock Stoker via cheat, pick it, its starting bin), W4 (mood after a win, a good climb, a bad run), W5 (idle to sleepy), W7 (three slots). No console errors, no sideways scroll.

## Assumptions and decisions
- Until meta-balance and sprocket merge, `meta.ts` stubs throw and `Sprocket` is a placeholder: code against the signatures and props; skip dependent e2e while stubbed (detect a throwing `newProfile`).
- Dates read naturally ("today", "yesterday", "3 Oct"); numbers with thin formatting ("1,250 Brass").
- Short text; warm, curious, a little melancholy; American English; no em dashes. Tap targets at least 40 px; text at least 12 px at 667x375; no sideways scroll.
- Own git worktree (path in the launch message). Don't commit. Never stash, checkout, reset or restore. e2e with `PW_PORT=5382`; dev server on 5383, stopped by PID.

## Done when
Unit and e2e green in your worktree (stub-dependent specs skipped); screenshots of the slot screen, Workshop and every panel at 667x375 and 1280x800 looked at. Report per template.

## From the B3 critic (must-fix in this lane)
- The event, shop, forge and oil screens are plain text; at 1280x800 the event screen is a thin text column over an empty page. Give each node screen a bounded, framed layout with drawn art in the house style (a lamplit vignette per node type, drawn in code: the forge's anvil and sparks, the oil station's can and drip, the shop's counter and hanging parts, an event's scene card; Sprocket events use `SprocketEventArt`).
- On phone a reward-card tooltip stays pinned over the "Spoils" header: dismiss on scroll and on any tap outside.
- Repair is offered at full HP with no hint: disable it with "Already at full HP".
- The rewind banner overlaps the Chain label at 667x375: move one of them.
