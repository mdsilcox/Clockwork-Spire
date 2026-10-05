# B10c The curve, gate review round 1 (96982aa)

Verdict: PASS (no blockers; every metric at least 7; average 7.57, a narrow margin). `npm run test:curve` had not finished when I wrote this (still running on the same checkout, slowed by my browser session); see "Not verified".

## Scores
| Metric | Score | Evidence |
|---|---|---|
| Fun | 8 | A real in-game fresh-save career (autoplay through the controller, seed 7, no cheats): 10 losses then the first win on run 11, inside the 8 to 12 target. Deaths: 6 of 10 in act 2 (floors 2 to 6), 4 in act 3 (Orrery x3), so each run still shows progress. The owner's ask ("won in 4 runs; more difficulty") is met in the numbers: expert no-meta 14.7% to 3.7%, BV2 median 4 to 9. |
| Clarity | 7 | The scaled numbers are what the player sees: an act 2 Pipe Snake shows "Pierce 8 x3" and the Incoming pill reads 24; the Furnace Golem "Pierce 22 in 3". Nothing tells a player why act 2 hits twice as hard as act 1; no new copy was added. Bench prices read correctly (Frame 40, Tool Belt 250, Second Wind 200). |
| Depth | 7 | Levers are sound and small in number: one per-act constant (`ACT_ATTACK_PCT` 110/210/210, `WARDEN_ATTACK_PCT` 100/105/115) applied in one place (`difficulty.ts`) to climb fights only; practice, tutorial and unit combats stay at content.md numbers. Fight targets, BV4 and the ladder stay green, BV5 max 1.07 against median 0.98. Held back: a flat +110% is a blunt lever, and the Plating plan is still unproven (D-029), see below. |
| Feel | 7 | A played act 2 regular (Pipe Snake, Journeyman, 60 max HP) took 24 HP (40%) from the first unanswered turn and I killed it on turn 2. That is a spike, not a grind: the bot meets it by breaking parts first, a human who piles Plating or builds slowly meets it head on. Fights, speed 'skip' and the run screens played without error. |
| Look and sound | 7 | Not touched by this phase. The Workshop and fight screens looked as before at 667x375 and 1280x800; audio not judged. |
| Stability | 8 | Run in the browser: no console errors seen, no sideways scroll at 667x375 (scrollWidth 667), 11 autoplay runs and a 30-run-cap career completed through the real controller without a stuck state. Coordinator's results (not rerun by me): npm test green, unit 831, e2e 241, offline, career first win run 13. |
| Spec coverage | 9 | Every BV target in the brief is met and reported: BV1 expert 3.7 / 1.3 / 3.0% over seeds 1 to 3, greedy 0.0%; BV2 median 9 (q1 7, q3 11, 0 never win; the 5-of-100 bound is respected); BV10 median 18 (at most 20 and the per-round guard); BV5 regression guard; BV3, BV4, BV6, BV8, BV9, BV11 and the ladder green. docs/content.md section 3.0 (line 214) and section 10 (line 688) are updated in the same commit; D-046 to D-049 hold before and after numbers. |

Average: (8+7+7+7+7+8+9)/7 = 53/7 = 7.57.

## Blockers
None. The warn floor was not needed.

## Judgement of the numbers and the method
- Levers are sound: the brief's order (engine fix, regulars, oil, HP, wardens, then bench price) was followed, a failed lever was reverted and logged (D-046, Braced reset breaks BV4, engine unchanged, Governor stays 10), the oil lever was dropped because B10b's AD4 tests pin 30%, the core-HP lever was measured as useless (the expert kills parts, not cores) and left at 100. Round 2 used a single price change (Tool Belt 150 to 250). Seeds 1 to 3 are reported for BV1, so the 3.7% is not one lucky seed.
- Over-fit risk, stated honestly in D-049 and acceptable for this phase: regulars at +110% were chosen because they rarely end a run for the expert (97.7% reach act 2); the +110% is calibrated on a part-breaking bot. The one human-style evidence I have: the first unanswered act 2 turn costs about 40% of a 60 HP bar. If the owner's playtest finds act 2 a wall, the fix is one constant. The first win of the in-game autoplay (run 13 seed 1, run 11 my seed 7) lands in range, but the autoplay is the same policy as the simulator, so it confirms the sim, not the player.
- Known gaps are stated accurately: Plating plan unproven (the expert always plays burst; the turtle wins 0%); greedy careers median 18 with 11 of 100 never winning by run 30 (a pure-rarity picker is a weak model of a player, the target of at most 20 holds); regulars +110% felt harder by humans than by the bot. All acceptable for a tuning phase with the owner's playtest and B12 as the judge, provided they stay on the B12 list.
- Method: the `coreTookThisTurn` change was tried, measured and not shipped; the career e2e at seed 1 (first win run 13, floor run 5) and a second seed agree with the sim's median band.

## Improvements (ranked, none blocking)
1. Make the act 2 and act 3 harshness readable: a one-line note on the Spire gate or the act intro (for example "The Steamworks hits harder") and, for Journeyman, show enemy damage already scaled in the bestiary and tooltips (I did not find the unscaled content.md numbers shown anywhere, but nothing explains the jump either). Cheap, and it turns a wall into an expectation.
2. Before B12, give the bench a clearer first buy: at 250 Brass the Tool Belt takes 3 to 4 early runs of about 60 to 125 Brass each, and a phone player sees only about one and a half upgrades per screen of the bench list. Consider sorting by price or flagging "best next buy".
3. Carry the Plating gap into B12 with a concrete task: a Plating-wanting combat bot (not the turtle) and a measurement of the pierce, siphon and corrode share the new act 2 and 3 amounts leave it, so D-029 is proven or the rules are changed.

## What I tested
Vite dev server on 5389 in the clean checkout at 96982aa (stopped by PID 34724), the in-app browser at 667x375 and 1280x800.
- Workshop at 667x375: bench text and prices (Frame 40, Scrap 30, Bearings 50, Tool Belt 250, Notes 80, Second Wind 200, Charm 120).
- Fresh slot, autoplay through the real controller (seed 7, cap 30): 11 runs, first win run 11, deaths by act and killer listed above (act 2: furnace-golem, steam-wraith x2, boilermaker x3, valve-crab; act 3: orrery x3).
- A manual act 2 fight (cheat.startClimb, gotoFloor, go): Pipe Snake Pierce 8 x3, Incoming 24, HP 60 to 36 after one unanswered turn, killed on turn 2; Furnace Golem "Pierce 22 in 3". Skip speed and the post-fight salvage worked.
- Earlier phases: Workshop town, gate and the career screens still rendered and played.
- Read: B10c brief (including "Draft review additions"), B10b "Round 2", DECISIONS.md D-046 to D-049, balance reports baseline and round 3, balance.ts, content.md 3.0 and 10.
- Not played by me: a full human climb on Journeyman to act 3, Master and Clockwork curves, audio.

## Not verified
- `npm run test:curve` (about 11 minutes) was still running on the checkout. Its result is not in this verdict; the figures above are the coordinator's reports. If it fails a BV assertion, this verdict is void for that target.
- I did not rerun `npm test`.
