# Clockwork Spire

A turn-based roguelite for the browser, on computers and phones. Climb a clockwork tower floor by floor, building a **machine** whose parts set off chain reactions in combat. Every run, win or lose, makes you stronger, until you reach the top and stop the Clockmaker. Sprocket the corgi waits for you in the Workshop.

Everything you see and hear is made in code: no image or sound files.

## Run it

You need Node.js 20.19 or newer (22.12+ recommended).

```bash
npm install
```

```bash
npm run dev
```

Open the address it prints (usually http://localhost:5173). On a phone, hold it sideways.

Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Type-checks and builds the installable offline app into `dist/` |
| `npm run preview` | Serves the built app (installable, works offline after the first load) |
| `npm test` | Runs everything: unit and rules tests, balance targets, browser tests at desktop and phone size, the offline test and the full-career test |
| `npm run sim -- --mode careers --careers 100 --seed 1` | Runs the balance simulator and writes a report to `balance/` |

The browser tests need Playwright's Chromium once: `npx playwright install chromium`.

## How to play

**The machine.** Your board is a 5 by 3 grid. The **Mainspring** sits on the left and is the source of all motion. Each turn you draw 3 parts and may place 2 (on an empty cell, or on top of a part to replace it). When you press **Run**, the machine runs for 3 ticks: each tick, motion flows out from the Mainspring through touching parts, and every part it reaches fires.

- **Gears** pass motion and strike.
- **Springs** hold motion and store charge, then release something big.
- **Cams and levers** pay off every few firings or make neighbors fire twice.
- **Pendulums and escapements** add ticks and Plating (your block).
- **Steam** parts build Pressure for big hits, but too much Pressure bursts and hurts you.
- **Chimes and tools** apply statuses like Scald and Cracked.

Before you run, the **preview** shows exactly what will happen: damage to each enemy, Plating, and a badge on every part that will fire. Enemies show their intent for the next turn, including which of your parts they plan to rust or pull away.

**A run.** Three acts of 12 floors on a branching map: fights, elites, events, the forge (upgrade or remove a part), oil stations (repair), shops, and a boss at the top of each act. At the top of act 3 waits **the Clockmaker**, who rewinds your strongest combination every turn, so no single trick wins.

**Between runs.** You return to the Workshop. Brass and blueprints you found buy permanent upgrades, unlock new parts and new chassis (starting machines). Sprocket greets you and reacts to how it went. Pet him.

New here? The first launch starts a short guided fight. Tooltips explain every part, status and intent (hover, long-press or focus), and the Glossary and How to play pages are on every menu.

**Controls.** Mouse or touch: tap a part in your hand, then a cell. Keyboard: 1 to 4 picks a hand slot, arrow keys move, Enter places, R runs, Escape closes menus.

## Settings

Music, effects and master volume, mute, animation speed (1x, 2x or skip), color-blind intent labels, and reduced effects. Three save slots, each its own Workshop.

## For developers

- `CLAUDE.md`: stack, layout, conventions and key interfaces.
- `docs/`: vision, rules, content catalog, data model, acceptance criteria, roadmap, briefs.
- `DECISIONS.md`: every design decision and why. `PROGRESS.md`: build progress. `REPORT.md`: the build report.
- `balance/`: simulator reports. `review/`: the independent critic's verdicts per phase.
- `window.__game` exposes a debug hook for tests (state, actions, cheats, autoplay).
