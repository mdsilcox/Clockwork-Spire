# Brief: B5 lane `qol-ui`

Read `CLAUDE.md`, SPEC.md section 4 and 2.6, `docs/acceptance.md` rows O3, Q1-Q4, and `src/app/controller.ts`, `src/app/save.ts`, `src/ui/App.tsx`, the `Settings` type in `src/core/types.ts`, and the music lane's API (`src/audio/music.ts` exports `music`, `trackFor`, `audioDebug`, `setVolume`, `setMuted`; until it merges, code against those names).

## Goal
Settings, run history and statistics, a how-to-play page, music switching by screen, and the finishing touches that make the game feel complete on phone and desktop.

## You own
`src/ui/**` except `src/ui/Sprocket.tsx` and `src/ui/Ending.tsx`, `src/app/**`, `e2e/**` except `e2e/audio.spec.ts` and `e2e/offline.spec.ts`, `index.html`, `src/main.tsx`. Not `src/core/**`, `src/sim/**`, `src/render/**`, `src/audio/**`.

## Build
1. **Settings screen (Q1, Q2, Q3):** reachable from the title, the Workshop and the combat Menu. Master, music and effects sliders, Mute, animation speed (1x, 2x, skip), color-blind intent labels, reduced effects (passes `reducedEffects` to the stage). Stored in the global IndexedDB `settings` record (migrate the localStorage keys from B2), applied at launch and live. Keyboard and touch friendly.
2. **Music switching:** call `music.play(trackFor(...))` on every screen change (title and Workshop: workshop; map and fights: the act's track; the Clockmaker: clockmaker with `setIntensity(phase)`; ending: stop or the ending cue). Register `window.__game.audio` from `audioDebug()`.
3. **History and statistics (Q4):** from the Workshop: a list of runs (newest first: run number, chassis, result, act and floor reached, killed by, Brass, date read naturally) and totals (runs, wins, win rate, best floor, biggest turn ever, favorite part by appearances, most common killer), per slot. An empty state for a new profile.
4. **How to play (O3):** a short page with a drawn diagram of a turn (the board with the Mainspring, arrows showing motion spreading, a spring holding, the preview badges) and five short sections (the machine, a turn, enemies and intents, the run, the Workshop), linking to the glossary. Reachable from the title, the Workshop and the combat Menu.
5. **Portrait card:** on a phone held upright (portrait and narrower than 600 px), show a "Turn your phone sideways" card drawn in code instead of the game.
6. **Keyboard and focus pass:** every screen usable with keyboard alone (Tab order, Enter, Escape closes overlays), visible focus rings in the brass style.
7. **E2E:** `e2e/settings.spec.ts` (Q1 persist across reload, Q2 skip has no animation delay, Q3 labels), `e2e/history.spec.ts` (Q4 after two cheat-finished runs), `e2e/howto.spec.ts` (O3), portrait card, no console errors and no sideways scroll at both sizes.

## Assumptions and decisions
- Dates read naturally ("today", "yesterday", "3 Oct"); numbers with separators.
- Short text; warm, curious, a little melancholy; American English; no em dashes. Tap targets at least 40 px; text at least 12 px at 667x375.
- Own git worktree (path in the launch message). Don't commit. Never stash, checkout, reset or restore. e2e with `PW_PORT=5422`; dev server 5423 stopped by PID.

## Done when
Unit and e2e green; screenshots of settings, history, how to play and the portrait card at both sizes looked at. Report per template.

## From the B4 critic (must-fix in this lane)
- Explain Brass income on the defeat and victory screens: a short breakdown (floors climbed, elites, bosses, victory, trinkets) using the run's stats, so a floor-9 loss paying 24 Brass makes sense.
- (Done by the orchestrator: an early act 1 loss now greets with comfort; a "good climb" needs act 2 or a new best of floor 8+.)
