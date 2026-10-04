# CLOCKWORK SPIRE: An Autonomous Build Spec

A turn-based roguelite for the browser, on computers and phones. You climb a clockwork tower floor by floor, building a machine whose parts trigger chain reactions in combat. Every run, win or lose, makes you permanently stronger, until you reach the top and defeat the Clockmaker. Beating him wins the game.

No human will be available during the build. You decide everything this spec leaves open, and record why in DECISIONS.md.

## 0. How to work

0.1 Save this spec unchanged as `SPEC.md` (it already is) and never edit it; record interpretations in DECISIONS.md.
0.2 Follow the `project-lifecycle` skill in **autonomous mode**, tracked on the Orchestra board as project `clockwork-spire` (prefix `cs~`). The critic in Appendix A replaces the owner's approvals at every gate.
0.3 Keep `PROGRESS.md` current: the phase you're in, what's done, what's next, known issues. Re-read it and the board after every context compaction before doing anything else.
0.4 Commit at every gate, with the main branch always green and the game always runnable.
0.5 Required features beat extra content. After three failed attempts at something, simplify it and log why.

## 1. Platform

- Runs in a modern browser on desktop and phone (landscape, from 375×667 up). Keyboard, mouse and touch; gamepad is a bonus.
- TypeScript. Rendering engine, framework and build tool are your choice, decided in discovery with a spike of the machine simulation and its animation.
- Installable offline web app. Saves locally (IndexedDB or equivalent) with at least 3 save slots, surviving a reload.
- Tests: unit tests for all game rules, the balance simulator (section 5), and end-to-end browser tests of the main flows at desktop and phone size. A `window.__game` debug hook lets tests and the critic drive and inspect the game.
- `npm install && npm run dev` starts it; `npm test` runs everything.

## 2. The game

### 2.1 The machine (the heart of the game)
Combat is turn-based against one or more enemies who show their intent for the next turn. Instead of playing cards, you build a **machine**: parts (gears, springs, cams, levers, pendulums, escapements, boilers and more) placed on a small board, which run each turn and interact with their neighbors. Gears that mesh pass motion along; springs store energy for a bigger release later; cams fire every few ticks; and so on. The fun is in discovering combinations that chain into big turns.

You design the exact rules (board size, how parts are drawn and placed, energy, ticks) in the spec phase, with these requirements:
- A turn is understandable at a glance: the player can see what the machine will do before running it (a preview), and watching it run is satisfying (gears visibly turn, energy visibly flows, chains build up).
- Combat offers real choices every turn; no part is always the right pick.
- At least 40 distinct parts across at least 5 families, with clear synergies inside and across families.
- Parts can be upgraded during a run.

### 2.2 A run
- The Spire has 3 acts. Each act is a branching map of about 12 floors (regular fights, elites, events, a forge to upgrade or remove parts, oil stations to repair, a shop) ending in an act boss.
- At least 15 regular enemies, 6 elites, 3 act bosses, all with distinct behaviors.
- At least 20 events with choices, and at least 25 trinkets (passive run-long effects).
- **The final boss: the Clockmaker**, at the top of act 3. He can rewind time: in each phase he undoes your strongest combination from the previous turn, so no single trick wins. He has at least 3 phases.

### 2.3 Getting stronger between runs
- Between runs you return to **the Workshop**, a hub. What you found and how far you climbed earns materials and blueprints.
- Permanent upgrades include unlocking new parts into the run pool, better starting machines, and more starting health. There are at least 3 **chassis** (starting archetypes, unlocked over time), each with its own starting parts and a distinct playstyle.
- The curve: a first run almost never wins; every run makes visible progress; a competent player's first win typically comes between run 8 and run 12. Section 5 enforces this.
- **Winning:** defeating the Clockmaker ends the game with a victory ending and credits. Afterwards the player may keep playing (harder runs are a bonus, not required).

### 2.4 Sprocket the corgi (required)
**Sprocket** is a corgi who belonged to the Spire's lost inventor and now lives in the Workshop. Sprocket must be a real, charming presence, not a cameo:
- Sprocket greets you in the Workshop after every run and reacts to how it went (a happy wiggle after a good climb, a comforting nudge after a bad one, a celebration after victory).
- Sprocket appears in at least 3 events in the Spire (for example, sniffing out a hidden blueprint), and there is at least one Sprocket-themed part or trinket.
- Sprocket is part of the victory ending.
- Sprocket is drawn and animated with care (idle, happy and sleepy poses at least) and has synthesized barks and sounds. The corgi must read unmistakably as a corgi: short legs, big ears, fluffy rear.

### 2.5 Story and tone
Warm, curious and a little melancholy: an inventor vanished into the Spire, and the Clockmaker is the thing he built that wouldn't stop. Light story told through the Workshop, events and the ending. Short text; no walls of dialogue.

### 2.6 Onboarding
The first run teaches the machine through play: a guided first fight, tooltips on every part and status, and a glossary. A new player understands a turn within two minutes.

## 3. Look and sound
- **Art:** all generated in code (SVG, canvas or shaders): brass, copper, steam, warm lamplight, one cohesive style. No downloaded art. Animation carries the game: turning gears, springs, steam, impact effects. Text is readable on a phone.
- **Sound:** all synthesized in the browser: ticks, chimes, steam hisses, impacts, Sprocket's sounds, and a music loop per act plus the Workshop and the final boss. Volume controls and mute.
- Smooth on a mid-range laptop (aim for 60 fps) and playable on a phone.

## 4. Settings and quality of life
Volume, animation speed (including skip), color-blind-safe intent icons, a run history and statistics screen, and a "how to play" page. No console errors in normal play.

## 5. Balance simulator (required)
A headless bot that plays complete runs with the real game rules (no rendering), with seeded randomness so results reproduce.
- It reports: win rate by meta-progression level, runs-to-first-win distribution, and per-part pick rates and win-rate impact.
- **Targets, checked by tests:** with no meta-progression, the bot's win rate is under 3%; following a sensible upgrade path, its median first win falls between run 8 and run 12; no single part's win-rate impact is more than double the median part's.
- Run it after every content or balance change; log the results in `balance/` with the date.

## 6. Done means
All of sections 1 to 5 work; the final critic review passes (Appendix A); the full test suite is green; the game can be won from a fresh save by following normal play; README explains how to run and play; PROGRESS.md and DECISIONS.md are complete.

---

## Appendix A: The critic

The critic is a separate agent with fresh context (definition in `.claude/agents/critic.md`) that reviews each discovery phase's documents and each build phase's result. It never fixes anything; it judges and reports.

**For a build phase** it must: read this spec and the phase plan, run the tests itself, play the game through `window.__game` and the real interface at desktop (1280×800) and phone (667×375) sizes, and look at screenshots it takes.

**It scores each metric from 1 to 10:**
| Metric | What it judges |
|---|---|
| Fun | Is the phase's part of the game enjoyable to play right now? |
| Clarity | Can a new player understand what's happening and why? |
| Depth | Real choices and synergies; no dominant strategy (uses the balance simulator's report) |
| Feel | Animation, feedback, responsiveness, the satisfaction of a machine running |
| Look and sound | Cohesive, attractive art and audio |
| Stability | No crashes, console errors, stuck states or test failures |
| Spec coverage | Everything this phase was meant to deliver is there and works |

For a discovery phase it scores only Clarity, Depth (of the design) and Spec coverage, judging the documents.

**Pass rule:** no blockers, every metric at least 7, and an average of at least 7.5. The final phase needs an average of at least 8.
**Blockers** are anything that crashes, loses saves, makes the game unwinnable, breaks on phone size, or omits a required feature due in that phase (Sprocket counts as required).

**Output:** `review/<phase>/round-<n>.md`, never overwritten: the verdict (PASS or REVISE), the scores, blockers, and at most 3 ranked improvements. A phase may be re-reviewed at most 3 times; if it still fails, log the remaining blockers in PROGRESS.md under "Known issues", and the next phase must fix them first.
