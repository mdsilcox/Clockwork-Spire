# B10c The curve: shared brief (draft for the critic)

Retune v2 to the curve (rules 5.8, 7.4) on Journeyman. This is the owner's first playtest ask: "won in 4 runs; more difficulty". The decisions fixed in B10b's draft (docs/briefs/B10b-curve.md "Round 2": measure first, freeze the drafter, cheap-first checks, `test:curve`, the `coreTookThisTurn` step, the warn floor) stand. B10c.0 (measure first) is done: `balance/2026-10-05-v2-curve-baseline.md`, commit e9d7d3d. This brief plans the tuning from those numbers.

## Where we start (seed 1, Journeyman, Overwind 0)
| Target | Now | Goal |
|---|---|---|
| BV1 expert, no meta (300 runs) | 14.7% | under 5% |
| BV1 greedy, no meta | 0.0% | under 2% |
| BV2 expert careers, median first win (100, cap 30) | run 4 | run 8 to 12 |
| BV10 greedy careers, median first win | run 10 | at most run 20 |
| BV5 offer impact, max against median | 1.05 | at most 2x |
| BV3, BV4, BV6, BV8, BV9, BV11 (fight and route targets) | green | stay green |
- The autoplay and the sim agree (60 of 60 careers after the turn-cap fix), so the career e2e is a faithful second check.
- No-meta deaths: act 1 7 of 300, act 2 144, act 3 105, so attrition in acts 2 and 3 is the main axis. HP is the strongest single lever (+25 max HP: +28 points). On the bench, Tool Belt (+18 points for 150 Brass) and Second Wind (+14 for 200) outweigh the other six upgrades together; the median career wins right after Tool Belt lands (run 4).

## Semantics (decided; don't re-decide)
- **Round 0, the engine fix** (its own step, before any lever): `coreTookThisTurn` resets at the start of the player's turn (before start-of-turn hooks), so Braced counts from the turn's start (B9a, D-041). Its own unit test; then BV4 reruns, and if BV4 holds, the Clockmaker's Governor cap returns to 14 (content.md 3.6). Logged as D-046.
- **Round 1, attrition (BV1)**: levers in this order, smallest step first, BV1 and the fight targets after every change: (a) act 2 and act 3 regular and elite attack amounts (Attack, Pierce, Siphon payloads, not Shell or Mend), in steps of +10%; (b) the oil station's rest heal (30% now; 25% at most); (c) act 2 and act 3 regular core HP, in steps of +10%; (d) warden numbers only to keep BV4. Starting HP stays 50 (the bench's Frame is the HP lever). Goal at round end: expert at most 5%, greedy at most 2%, BV3, BV4, BV8, BV9, BV11 green.
- **Round 2, the bench and the economy (BV2, BV10)**: (a) Tool Belt 150 to about 350 Brass, Second Wind 200 to about 400 (or each behind a Frame level, whichever the sim prefers), (b) Reinforced Frame's step stays +5 HP but its price ladder rises (40, 70, 110, 160, 220), (c) Brass per run only if (a) and (b) aren't enough; (d) the sim's "sensible path" is reordered to what a player sees as cheapest first, and the in-game bench text shows the new prices. Goal: BV2 median 8 to 12, BV10 at most 20, BV1 unchanged.
- **Round 3, settle**: rerun everything: BV1, BV2, BV5 (3,000 runs), BV10, the fight targets, the ladder (tests/sim/v2-ladder.test.ts, re-validated after the retune), the career e2e (fresh-save autoplay within 30 runs, first win no earlier than run 5), and a mode check (Apprentice wins clearly more than Journeyman).
- **Each round** is logged in DECISIONS.md (D-047, D-048, ...) with before and after numbers, and in a dated balance report; content.md 10 (prices) and the changed enemy rows are updated in the same commit (rules: numbers come from content.md).
- **The warn floor** (B10b round 2, M8): if after round 3 BV1 or BV2 still miss, B10c may close with a `warn` only if the expert's no-meta win rate is at most 8%, the career e2e's first win is no earlier than run 5, and BV3, BV4, BV8, BV9, BV11 are green; otherwise it stays open. The remaining gap then goes to B12 with the owner's own playtest as the judge.
- **Plating viability, honestly**: the B10c.0 check passes for a structural reason (the expert bot always plays burst; the only Plating combat bot, the turtle, wins 0% by design). Making a Plating plan winnable needs a Plating-wanting combat bot and probably rule changes (Corrode, bypass shares), which this phase does not attempt. It is recorded as a known gap (D-029's "no plan is dead" is not yet proven for Plating) for the owner's playtest and B12, not hidden behind a green check.
- **Out of scope**: modes' multipliers (B10b, data in `content/modes.ts`), new content, art.

## Steps (one lane: sequential by nature; D-039)
| Step | Owner | Owns | Turns green |
|---|---|---|---|
| **B10c.1 round 0** | curve (the B10c.0 agent) | the `coreTookThisTurn` line in `combat.ts`, its test, BV4 rerun, the Governor cap | D-046 |
| **B10c.2 round 1** | curve | non-warden enemy numbers in `content/enemies.ts`, the oil rest value, content.md rows | BV1 |
| **B10c.3 round 2** | curve | bench prices in `content/upgrades.ts`, Brass in `meta.ts` constants if needed, the sim's sensible path, content.md 10 | BV2, BV10 |
| **B10c.4 round 3** | curve | reruns, reports | all, or the warn floor |
| **B10c.5 gate** | orchestrator + a fresh critic | full suite incl. `test:curve` and the career e2e, a browser look at the bench prices, `review/B10c/gate-round-1.md`, merge to main | |
- Each round is time-boxed to one agent session; the agent reports numbers at each round's end before the next starts (the orchestrator reads them and may stop early if the curve is met).
- Heavy sims run with no other heavy work on the machine (the B10b perf test failed under parallel sims).

## Rules
Shared tree or a worktree, as the orchestrator says per step; never stash, checkout, reset or restore outside it; commit only when told; deterministic core; American English, no em dashes. Report numbers before and after, and every content.md row changed.
