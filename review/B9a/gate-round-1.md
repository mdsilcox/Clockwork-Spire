# B9a Wardens, gate review round 1

Verdict: PASS (no blockers; every metric at least 7; average 7.71).

## Scores
| Metric | Score | Evidence |
|---|---|---|
| Fun | 8 | Each warden now reads as a fight in acts: Foreman (Wrench/Grate, then Overtime with a Cog Rat and Bulwark/Rivet), Queen (Gauge, Furnace, Mend and a rebuilt Gauge at 10), Clockmaker (Rewind visibly lifting parts back to the hand: board 2 placed to 1 after the run). A naive bot cleared the Foreman in 10 turns, the Queen in 15, and was still working through the Clockmaker's third phase at turn 15. |
| Clarity | 7 | Beat line shows over the warden with the phase burst, intent chips name the phase action, broken parts keep their notch marks across the mood, bestiary lines state the punish. On 667x375 the Queen and Clockmaker part chips crowd the painting and the beat line covers the head; readable but dense. Masterwork salvage cards say "Coming soon." (see improvement 1). |
| Depth | 7 | Phase-by-phase keystones, Rewind combos, Jam on alternate Midnight turns, Gauge spanning phases and Mend are real choices; BV4 medians 8/9/10 inside targets. Held back: bots always plan burst (99 to 100%), so 3 of 4 memory parts (drill, valve, chime) are never exercised in sim; expert route win rate still 11 to 16% against under 5% (flagged for B10, accepted by brief). |
| Feel | 8 | Phase mood plays gear-burst and a 2.5 s speech bubble; summons appear on the same turn; Rewind and Jam land with replay events; no stalls at skip speed. |
| Look and sound | 8 | Painted Foreman, Boilermaker Queen and Clockmaker all in game and cohesive; art round 3 PASS. Summons (Cog Rat painted, Steam Wraith code-drawn) are a slight style gap, acceptable under D-033. Audio not judged by ear. |
| Stability | 8 | `npm run test:unit` 525 passed, 3 skipped, 21 todo (rerun by me); v2-wardens and v2-memory e2e 8 of 8 (desktop and phone) rerun; no console or page errors across all driven scenarios; no sideways scroll; a loss, a win and a real-climb bell entry all clean. I did not rerun the full e2e (189), offline or career suites. |
| Spec coverage | 8 | WP2 to WP7, BV4, BF4, AR2 present and exercised: phase beats and moods for all three, Apron retracts (`lastPhase`), Gauge rebuilt by Mend, Rewind and Jam actions, memory parts for all four plans (pressure to Drain Valve, statuses to Purge Chime, plating to Drill, burst-tie to latest plan), archivist line on the start-run panel at both sizes, warden core gives a Rare via the real climb (Hairspring blueprint after the Foreman). Plan stats and `planHistory` verified only via the memory path and unit tests. |

Average: (8+7+7+8+8+8+8)/7 = 7.71.

## Blockers
None.

## Improvements (ranked)
1. Salvage after the Queen shows Masterwork cards reading "Coming soon." plus "Locked: you could almost see how it worked." in a player-facing screen. Hide Masterwork parts from the salvage list until B9b, or give them a plain name-only line, so no placeholder text ships.
2. B10 balance: make a Plating, Pressure and Statuses drafting bot so the other three memory parts are exercised in sim, and retune the expert route (11 to 16%) as already flagged.
3. Phone polish: at 667x375 the beat line sits over the Queen's and Clockmaker's heads and the part chips overlap the painting; anchor the line above the card or shrink chips for 4-part phases. The archivist line prints plan names in lowercase ("your plating") where the brief's example capitalizes Plating; pick one.

## What I tested
- Ran `npm run test:unit` (green) and the two B9a e2e specs (8 of 8). Dev server on 5382 (stopped by PID 34964).
- Scripted Playwright at 667x375 touch and 1280x800: each warden's phase change screenshots with beat text, state after every phase (parts, intents, summons), no console errors.
- Naive but adjacent-placing bot with raised HP through all three wardens to watch phases, Rewind lifting parts, Jam, Mend and the Queen's win salvage screen.
- Memory: four plan histories on both sizes (part appears, line text, tie goes to latest); Workshop and Sprocket visible on phone.
- Real climb: fixture to the warden door, bell confirm, Foreman starts Prepared, win, spoils screen with the warden Rare.
- Browser pane throttles animation to about 1.5 fps when hidden, so real-time play was done in headless Playwright instead; hand clicking through full fights was not feasible, so fights were bot-driven.
