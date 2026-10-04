# Clockwork Spire: build report

Built autonomously from `SPEC.md` on 2026-10-04, from 16:30 to 19:53 UTC (about 3 hours 25 minutes), following the project-lifecycle process in autonomous mode. An independent critic agent (`.claude/agents/critic.md`, SPEC.md Appendix A) replaced the owner's approval at every gate. Board: Orchestra project `clockwork-spire` (prefix `cs~`). Repository: https://github.com/mdsilcox/Clockwork-Spire.

## What was built

A complete, winnable turn-based roguelite for desktop and phone browsers:

- **The machine.** A 5x3 board fed by a Mainspring; motion spreads breadth first each tick; 46 parts in 6 families (gears, springs, cams and levers, pendulums and escapements, steam, chimes and tools), every one upgradable; an exact preview before every Run; an animated replay with pulses, turning gears, springs, steam, chain counters and payoff beats.
- **Combat.** 15 regular enemies, 6 elites, 3 bosses (the Foreman, the Boilermaker Queen, the Clockmaker with three phases and Rewind, which lifts your strongest combination off the board each turn), statuses (Scald, Cracked, Dazed, Shell, Corroded, Grit) and sabotage (Rust, Jam, Magnetize, Drain) with targets shown before you build.
- **The run.** Three acts of 12 floors plus a boss on generated branching maps; fights, elites, 22 events (3 with Sprocket), forge, oil stations, shops; 28 trinkets; rewards by act rarity; reload resumes exactly, mid-fight included.
- **Between runs.** Three save slots; the Workshop with an upgrade bench (7 upgrades), three chassis (Tinker, Stoker, Horologist), blueprints that unlock locked parts, the inventor's notes, run history and statistics.
- **Sprocket the corgi.** Drawn and animated in code (idle, happy, celebrate, comfort, sleepy, pet, sniff, run), synthesized barks, reacts after every run, sleeps when you idle, appears in three events and as a part (Sprocket Wheel) and a trinket (Sprocket's Collar Tag), and closes the victory ending before the credits.
- **Onboarding and quality of life.** A guided first fight, tooltips on every part, status and intent, a glossary, How to play with a drawn diagram, settings (volumes, mute, speed with skip, color-blind intent labels, reduced effects), a portrait "turn your phone" card, keyboard play.
- **Look and sound.** All art drawn in code (brass, copper, steam, lamplight); all sound synthesized with Web Audio, including six music loops (Workshop, three acts, the Clockmaker with rising intensity, the ending).
- **Platform.** Installable offline web app (service worker, code-drawn icons), IndexedDB saves with an in-memory fallback and a notice, an error boundary, `window.__game` debug hook including `autoplay`.
- **Balance simulator.** Headless bots with seeded randomness playing fights, full runs and 100-run careers; reports in `balance/`; targets enforced by tests.

## How to run

```bash
npm install
npm run dev
```

`npm test` runs everything (about 3 minutes): 300 unit and rules tests including the balance targets, 142 browser tests at 1280x800 and 667x375, the offline test on a production build, and a career test that autoplays the real UI from a fresh save to a victory. See README.md for how to play.

## Done means (SPEC.md section 6)

| Requirement | Status |
|---|---|
| Sections 1 to 5 work | Yes, every acceptance criterion in `docs/acceptance.md` has a test or a critic check |
| Final critic passes (average at least 8) | Yes: PASS 8.00, no blockers |
| Full test suite green | Yes: `npm test` exit 0 at commit 94a1a4b |
| Winnable from a fresh save by normal play | Yes: the career e2e autoplays the real UI from a fresh save to the victory ending (seed 1: first win on run 18); the bot's careers have a median first win at run 9 |
| README explains how to run and play | Yes |
| PROGRESS.md and DECISIONS.md complete | Yes |

## Balance (spec section 5)

From `balance/2026-10-04-careers-1.md`, `-runs-1.md`, `-fights-1.md` (seed 1):

| Target | Result |
|---|---|
| No meta-progression win rate under 3% | 1.0% (300 runs) |
| Median first win between run 8 and 12 | run 9 (quartiles 7 to 12; 100 careers, none unwon in 30 runs) |
| No part's win-rate impact above 2x the median | max 1.17 vs median 0.97 (offer-based, all 46 parts measured) |

Win rate by Brass spent: 0% at 0, 2.0% at 1-99, 2.9% at 100-249, 6.5% at 250-499, 19.8% at 500+.

## Critic verdicts

Pass rule: no blockers, every metric at least 7, average at least 7.5 (8 for the final phase). Discovery phases score Clarity, Depth and Spec coverage only.

| Phase | Rounds | First verdict (average) | Final verdict (average) | First scores | Final scores |
|---|---|---|---|---|---|
| D1 Concept and stack | 1 | PASS 7.67 | PASS 7.67 | Clarity 8, Depth 7, Spec 8 | same |
| D2 Design | 1 | PASS 7.67 | PASS 7.67 | Clarity 8, Depth 7, Spec 8 | same |
| B1 Walking skeleton | 2 | REVISE 7.43 | PASS 7.57 | Fun 7, Clarity 8, Depth 6, Feel 7, Look 7, Stability 9, Spec 8 | Fun 7, Clarity 8, Depth 7, Feel 7, Look 7, Stability 9, Spec 8 |
| B2 The machine | 2 | REVISE 7.43 | PASS 7.86 | Fun 7, Clarity 8, Depth 7, Feel 7, Look 7, Stability 9, Spec 7 | Fun 7, Clarity 8, Depth 7, Feel 8, Look 8, Stability 9, Spec 8 |
| B3 The run | 1 | PASS 7.57 | PASS 7.57 | Fun 7, Clarity 8, Depth 7, Feel 8, Look 7, Stability 8, Spec 8 | same |
| B4 Workshop, meta and Sprocket | 1 | PASS 7.86 | PASS 7.86 | Fun 8, Clarity 7, Depth 8, Feel 8, Look 8, Stability 8, Spec 8 | same |
| B5 Look, sound and QoL | 1 | PASS 8.00 | PASS 8.00 | all 8 | same |
| B6 Hardening and release (final) | 1 | PASS 8.00 | PASS 8.00 | all 8 | same |

Verdict files: `review/<phase>/round-<n>.md`. (B2 round 1's file carries a stray early "PASS" line above its final REVISE verdict; the final verdict in that file is REVISE.) Phase 0 had no product to judge; its files were reviewed with D1.

## Time and tokens

Measured with `phase_tokens.py` over the session transcript and its subagents (fresh input plus output; cache reads excluded).

| Phase | Wall time (UTC) | Orchestrator (Opus) | Agents (Sonnet) |
|---|---|---|---|
| P0 + D1 + D2 | 16:30 to 16:46 | about 160k | about 270k |
| B1 | 16:46 to 17:11 | 109k | 350k |
| B2 | 17:11 to 18:00 | 183k | 1.86M |
| B3 | 18:00 to 18:29 | 81k | 1.25M |
| B4 | 18:29 to 18:54 | 61k | 1.26M |
| B5 | 18:54 to 19:23 | 41k | 1.31M |
| B6 | 19:23 to 19:53 | 62k | 1.04M |
| **Whole run** | **3 h 23 min** | **780k** | **7.28M** |

Cache reads: 104M orchestrator, 238M agents. Plan usage: the weekly limit went from 4% to 12% over the run, far below the 85% stop line. 65 commits; about 28,400 lines of source and tests.

## Decisions that mattered most

1. **Pure rules that emit an event timeline** (D-006): the same code drives the game, the exact preview, the unit tests and the headless simulator, and the renderer only replays events, so animation can never disagree with the result.
2. **Tune fights on HP lost, not win rate** (D-015): the bot won 99% of single fights, so the win-rate report said nothing; per-tier HP-loss targets made enemy tuning measurable and later produced the run-level curve with no further tuning (D-019).
3. **Offer-based part impact** (D-011): measuring took vs passed at the moment of choice removed survivorship bias from the spec's "no part above 2x the median" target.
4. **Contracts with throwing stubs before parallel lanes** (D-017 and the B3/B4 contracts): four lanes built against fixed signatures and acceptance tests at once, and the UI's specs passed against the real core on first merge.
5. **Rare parts start locked behind blueprints** (D-018): meta-progression is visible in the run pool, not only in stats.
6. **Rewind as "strongest part plus the part that fed it"** (D-010): a concrete, visible reading of the spec's "undoes your strongest combination".

## Known issues

- Audio quality (music and effects) was never judged by ear: every critic ran under automation. The graph, levels (offline-rendered peaks 0.11 to 0.18 under a 0.4 limiter) and track switching are tested.
- On a 667x375 phone the Workshop History tab's stat tiles take most of the screen, so the run list needs a scroll (final critic, improvement 3).
- Late in a long fight the hand can shrink to one card, since placed parts leave the draw pile; the critics noted it but scored Depth 8 in the final review.
- The autoplay bot is not a competent human: its first win from a fresh save varies by seed (run 18 for seed 1; median run 9 over 100 careers).
- Not tested on a real phone or a real PWA install; gamepad is not supported (a spec bonus).
- The GitHub remote is public (DECISIONS.md D-003); nothing secret is committed.
