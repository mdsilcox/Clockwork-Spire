# Clockwork Spire: vision

## The game in one breath
A turn-based roguelite for the browser. You climb a clockwork tower and fight with a **machine** you build part by part on a small grid. Each turn the machine runs: gears pass motion, springs store it, cams wait for their moment, boilers build pressure, and a good layout chains into one big, loud, satisfying turn. Lose, go home to the Workshop and Sprocket the corgi, spend what you found, climb again. Beat the Clockmaker at the top to win.

## Who it is for
- **Primary:** players who like Slay the Spire, Balatro or Luck be a Landlord: short sessions, build discovery, "one more run".
- **Also:** someone on a phone, held sideways, on a train. Every screen works at 667 by 375 with touch.
- **New players:** they understand a turn within two minutes because the first fight teaches it and the preview shows what will happen before it happens.

## Pillars (how we judge every feature)
1. **The machine is the toy.** The most fun is placing a part and watching the chain you planned (or one you didn't) go off. Every part must touch the grid: adjacency, timing or stored power.
2. **See it before you run it.** The preview shows damage, block and which parts fire. No hidden math at the moment of decision.
3. **Every run moves you forward.** Materials and blueprints always come home. A bad run still buys something.
4. **Warm, curious, a little sad.** Brass and lamplight; a vanished inventor; his dog who still waits. Short text, never walls of dialogue.

## Must-haves (the spec's required features)
- The machine: at least 40 parts in at least 5 families, upgrades during a run, a run preview, animated execution.
- A run: 3 acts of about 12 floors on a branching map; fights, elites, events, forge, oil station, shop; act bosses; the Clockmaker (3+ phases, rewinds your strongest combination).
- Content: 15+ regular enemies, 6+ elites, 3 act bosses, 20+ events, 25+ trinkets.
- Between runs: the Workshop hub, materials and blueprints, permanent upgrades, 3+ chassis.
- The progression curve: first run almost never wins; first win typically on run 8 to 12 (enforced by the balance simulator and its tests).
- Sprocket the corgi: greets and reacts after every run, appears in 3+ events, a Sprocket part or trinket, in the ending, drawn and animated (idle, happy, sleepy at least), synthesized barks.
- Onboarding: guided first fight, tooltips on every part and status, a glossary.
- Look and sound in code: brass, copper, steam, lamplight; synthesized effects and a music loop per act, Workshop and final boss; volume and mute.
- Settings and quality of life: volume, animation speed with skip, color-blind-safe intent icons, run history and statistics, how to play.
- Platform: installable offline web app, 3 save slots in IndexedDB, keyboard, mouse and touch, `window.__game` debug hook, unit and end-to-end tests, a headless balance simulator.

## Later (only after every must-have works)
- Harder ascension-style runs after the win (the spec calls it a bonus).
- Gamepad support (bonus).
- Daily seeded run, more chassis, more Sprocket animations.

## Non-goals
- No accounts, servers, leaderboards or online features.
- No downloaded art, fonts used as pictures, or audio files.
- No portrait phone layout (landscape from 667 by 375 up; portrait shows a "turn your phone" card).
- No real-time action: everything is turn-based and pausable.

## Success criteria
- The final critic review passes with an average of at least 8 and no blockers.
- `npm install && npm run dev` starts the game; `npm test` runs unit, simulator and browser tests and is green.
- From a fresh save, normal play reaches a win (the balance simulator's median first win sits between runs 8 and 12, and a scripted end-to-end test completes a victory with meta-progression applied).
- No console errors in normal play; 60 fps target on a mid-range laptop; playable on a phone.
