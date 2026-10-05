# D3 (Clockwork Spire v2 design), review round 2

**Verdict: PASS (with four small must-fix edits to make before the phase is closed).** Clarity 8, Depth 7, Spec coverage 8. Average 7.67. No blockers. The pass rule (no blockers, every metric at least 7, average at least 7.5) is met.

Read: round 1, DECISIONS.md D-031 and D-032, `docs/content.md` (sections 1, 3, 5, 7), `docs/rules.md` (2.4, 4.1 to 4.3, 4.8, 5.4 to 5.7, 7), `docs/data-model.md` (v2), `docs/acceptance.md` (EA, WP, CL, BV rows), `tests/v2/`, `docs/roadmap.md`. Nothing run (discovery phase).

## Scores

| Metric | Score | Evidence |
|---|---|---|
| Clarity | 8 | The round 1 undefined words are now defined (rules 2.4 Corrode %, Ratchet, Countdown vs Build-up, Braced; rules 4.8 phase timing in four numbered steps; content 3.0 states its method). Data model has `{of, at}`, `buildUp`, `escalate`, `pct`. Remaining: small definitional mismatches below. |
| Depth | 7 | The Plating answer is now arithmetic, not labels, and wardens have a computed floor. Held at 7 because the act 1 headline passes by 2 points and only under inconsistent counting (item 1), and nothing has been simulated on v2 numbers yet (acceptable for discovery, but the margin is thin). |
| Spec coverage | 8 | Trinkets now have 4 Masterwork and 2 Legendary (42 total, counts check). Early non-win feats open a Rare and Masterwork (m-act2-breaker Sapper; m-bell3, m-quick-foreman, m-break-all, m-burst). Legendary source and Overwind unlock are consistent across rules, vision and content. The 33 achievements map one to one to 14 Masterwork and 7 Legendary unlocks (checked). |

## Round 1 blockers and improvements

1. **Plating answer was labels: resolved (mostly).** Content 3.0 computes damage per turn and bypass share per act from the per-enemy tables. Corrode is a percentage, Ratchet grows every turn, regular cores are about 60% of HP (all 15 headers checked: 11/18, 15/26, 20/34, 17/28, 12/20; 25/42, 30/50, 36/60, 21/35, 18/30; 36/60, 22/36, 48/80, 24/40, 48/80, all 58 to 61%). Act 1 now has real Pierce (Mite, Imp). Residual issue in must-fix 1.
2. **Impossible 15-point clause: resolved.** Rules 7.4(3) and BV3 now say turtle and burst lose at least 1.5x the expert's HP on each elite and warden and at least 10% of max HP in each act's normals; BV8 caps fully absorbed turns at 40%; BV10 and BV11 add the greedy bound and the rusher/grinder check. These can be satisfied. One doubt: the act 1 10% normals target rests on Pierce from only the Mite and Imp (about 1.5 HP per enemy per turn at roughly 50 max HP); plausible but tight.
3. **Trinkets left out: resolved** (content 5, 42 trinkets; one Legendary per run, part or trinket).
4. **Phase floor: resolved by rule.** Braced (rules 2.4, 4.8) plus WP1 and WP8 tests; phase-change timing, phase action ownership, cadence restart and mid-Run discard are defined. Max-burst bot added to BV4.
5. **Clock loss state: resolved.** Overwound warden at midnight, Prepared plus 6 Scrap and 2 Brass per hour at the bell, path bound in CL1 (shortest path at most 5, so at least 3 spare hours at 8 hours).
6. **Contradictions: resolved** for Legendary source, Overwind unlock, Countdown vs Build-up, the stale Cog Rat walkthrough (now matches content) and cadence/multi-action shapes (mostly; must-fix 4).

## Spot checks of content 3.0 and Braced

- Act 1 (all five): Mite 10/3 = 3.3; Rat 10/2 = 5; Beetle 12/2 = 6; Slick 9/2 = 4.5; Imp avg(3,4,5) = 4; total 22.8; Pierce 7.3 = 32%; with Corrode credit (Slick 9) 11.8 = 52%. Arithmetic correct.
- Act 2: Wraith 12/2 = 6; Crab 7; Golem 22/3 + 6 = 13.3; Snake 12/2 = 6; Gremlin 3.5; total 35.8; Pierce 16.8, with Siphon 22.8 = 64% (Pierce alone 47%). Correct.
- Act 3: Ringer avg(14,10) = 12 with Pierce 7; Moth 4; Knight 40/3 = 13.3; Sprite 10; Blade avg(8..24) = 16; total 55.3; Pierce 21 = 38%. Correct.
- Foreman: keystones 26 and 22 Braced to 13 and 11, so 2 turns; core 60 at a third is 20 per turn, so 3; floor 5; totals 64 + 102 + 26 (Cog Rat) = 192 as stated.
- Queen: 22/22 (11 each), 28/22 (14, 11), core 78 (26 per turn): 2 + 2 + 3 = 7 as stated; totals 64 + 50 + 120 + 42 = 276 as stated; with 8 Pressure drained the Gauge fires on enemy turn 2 (6, then 12 + 8), consistent with EA12's 6, 16, 22 for 0, 4, 0 drained.
- Clockmaker: 26/24 (13, 12), 32/30 (16, 15), core 78 (26, also Governor 14): floor 7 as stated; totals 50, 62, 152 = 264 (288 with a 24 HP memory part). Matches.

## Must-fix before closing (small; none changes the design)

1. **Escalation is counted despite the method sentence.** Content 3.0 says Ratchet and escalation are "listed but not counted", yet the Spring Imp counts at its 3, 4, 5 average (4.0) and the Pendulum Blade at the 8 to 24 average (16). At base values the act 1 share is (3.3 + 3.0) / 21.8 = 29%, below the 30% floor (act 3 would be 44%). State that escalation counts as the cycle average (Ratchet does not), or raise the Imp's base Pierce to 4. Note that act 1's 32% is the thinnest margin.
2. **Corrode is counted in rules 7.4(7) and BV9 but excluded in content 3.0.** Rules and BV9 say Pierce, Siphon and Corrode all count; content 3.0 says the headline rests on Pierce and Siphon only and reports Corrode credit separately. Pick one definition (the content one is stricter and better) and fix rules 7.4(7) and BV9 so the unit test computes the same number.
3. **Siphon is counted in full as bypassing Plating.** Siphon is still absorbed by Plating; it only heals the enemy. Fair as pressure on a stack, but say so in 3.0 and show the share without it (act 2 Pierce alone is 47%, so it still passes: wording only) so BV9 is not met by relabeling.
4. **The data model cannot yet express the Midnight Bell** (one cadence, two different action lists on odd and even turns). Also Tock Weight's "Rewind plus Pressure to 0" and the Blade's "resets after 24" have no field. Split the Bell into two parts or allow actions per cadence; add a pressure-reset flag and an escalate reset. Minor stale item: the walkthrough uses salvage "Gnasher" and ids like `e0.jaw`, not `spur` and `rat-jaw`.

## D-032 (acceptance tests pending until the contract step)

Acceptable, with a condition. Round 1 said the U rows could be real failing tests now. The reason given (they need enemy frames, target order, the section map and testkit signatures that do not exist, and would be rewritten if written against guessed ones) is sound for most rows, and the list is generated from the document so it cannot drift. The weaker point is rows that need only data, not engine (BV9, EA11, AD1, part counts, the 3.0 arithmetic): they could be a content-table check now. Not required. The condition: `docs/roadmap.md` is still v1's, so the D5 roadmap must name the contract step as the first step of the first build phase, assign each lane the criteria it owns, and keep "never weakened" as a gate. If D5 omits it, this becomes a blocker at that review.

## Improvements (at most 3, after the must-fix list)

1. Before B1, run a scripted turtle estimate on the v2 act 1 numbers (Mite and Imp Pierce only) to confirm the 10% HP-lost target is reachable; if not, the cheap lever is act 1 Pierce amounts, not more tags.
2. Make EA11 behavioral: replace "half the regulars punish Plating" with a def-based check that the part carries a Pierce, Siphon, Corrode, Ratchet or Countdown action (it still tests tags, as round 1 noted).
3. Keep scope cuts ready (round 1 section F): Overwind 6 to 10 and the Scrapper are the first to defer if the build runs long; it is still a very large build.

## Pass rule applied

Blockers: none. Scores 8, 7, 8; average 7.67 (needs at least 7.5, each at least 7). PASS, with must-fix items 1 to 4 done in the pass that closes the phase.

## What was tested

Document review only; the game was not run. Cross-checked: every round 1 blocker and improvement; the 3.0 tables against the per-enemy tables (all 15 regulars; sums and shares recomputed); Braced and floor arithmetic for the Foreman, Queen and Clockmaker (keystone caps, core caps, part totals); regular core percentages; achievement to unlock counts (14 Masterwork, 7 Legendary, 3 Rare); rules 7.4, BV3 and BV8 to BV11 for satisfiability; data model shapes against content; D-032 against the roadmap. Sprocket (spec 2.4) is unchanged since round 1 and still covered in Bellfoot, events, collars, the Sprocket's Whistle and Blanket unlocks, and the ending.
