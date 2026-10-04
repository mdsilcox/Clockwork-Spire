# B2 "The machine" review, round 1

Verdict: PASS (no blockers, all metrics >= 7, average 7.6)

## Scores
- Fun 7: sandbox fights with varied bins and enemies are readable and tactical; naive placement loses to bosses, so skill matters. Limited by sandbox-only (no run loop yet).
- Clarity 8: guided 8-step tutorial, preview line ("6 damage, 0 Plating, 3 ticks"), enemy intent chips, targeted-cell rings and tooltips/glossary all present and tested (M15, O2, C5, Q3).
- Depth 7: balance report has median defense impact 0.96, max 1.32, min 0.89, none above 2x median; tier HP-loss targets met. But combat-level win rate is 98.9% for a competent bot, and 4 of 29 parts show n/a (always-in bin), so choice depth is only weakly evidenced; run-level checks are B4's.
- Feel 7: gears and parts animate, chain badges (x3), damage floaters, speed control; Clockmaker and bosses are plain static silhouettes.
- Look and sound 7: cohesive brass/copper palette, distinct part icons and enemy art at both sizes; enemy art is simple. Audio only checked as present in src/audio/synth.ts, not heard.
- Stability 9: `npm test` 35 passed, 1 skipped (phone perf spec); no console errors or warnings across tutorial, title and 6 sandbox fights at both sizes; reload mid-fight tested.
- Spec coverage 7: all due acceptance ids appear covered by passing tests; practice sandbox, tooltips, glossary, tutorial, sabotage and Clockmaker present. Balance report measures only 29 parts (spec needs 40 across 5 families overall; check by B3/B4).

Average: 7.43 -> (7+8+7+7+7+9+7)/7 = 7.43

NOTE: the arithmetic gives 7.43, which is below 7.5. Applying the pass rule exactly: **REVISE**.

## Final verdict: REVISE (average 7.43 < 7.5; no blockers)

## Blockers
None.

## Improvements (ranked)
1. Raise Feel/Look: give bosses and elites (Clockmaker, Boilermaker) richer art and attack/phase animations (rewind visual, steam bursts); currently static silhouettes with a bobbing HP bar.
2. Depth evidence: make the bot play non-trivially (win rate 98.9% at combat level suggests fights are too easy for a good build) and measure all parts (4 are n/a because they are in every bin); verify the Clockmaker rewind punishes a single big combo in the report.
3. Sandbox fun: random10 hands often leave a single card in hand (e.g. one Cam vs a 110 HP boss); offer sensible preset bins per act so a player can feel synergies (springs, steam overpressure) without hand-picking ids.

## What I tested
- `npm test` with PW_PORT=5362: 35 passed, 1 skipped (desktop and phone).
- Vite on 5363 (stopped by PID); Playwright at 1280x800 and 667x375, deviceScaleFactor 2: tutorial first launch, title, then sandbox fights vs cog-rat, pipe-snake+gauge-gremlin, gearhound, bell-ringer, clockmaker, boilermaker with random10 bins via `window.__game`; screenshots viewed (tutorial, Clockmaker board, phone Gauge Gremlin sabotage ring and Defeat dialog); console clean.
- Read balance/2026-10-04-fights-1.md. Did not hand-play every part family or listen to audio; Sprocket and Workshop not due.
