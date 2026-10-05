# Draft verdict, round 2: B9a Wardens

Reviewer: critic, in place of the owner's draft approval (D-035). Read: docs/briefs/B9a-wardens.md, DECISIONS.md D-040, review/B9/draft-verdict.md, docs/v1/rules.md 4.4 (Rewind), acceptance C6 and WP4, and the code: `src/core/enemy.ts` (`rewind`, `liftCombos`), `defs.ts` (`WardenPhaseDef`), `combat.ts` (`lastTurnContrib`). The game was not run.

## Verdict: PASS (borderline), with 5 must-fix edits to the brief before launch

| Metric | Score | Evidence |
|---|---|---|
| Plan quality | 8 | The split fixes B2: one lane per function per phase; contract, merge order (core, then rigs, bots after core), tune box, gate and fallback (D-033) are all present. |
| Spec fit | 7 | Phase actions, conditional beat and memory match content 3.4 and 3.6. But the Rewind "combination" definition departs from v1 and from the code, the Midnight Bell jam parity differs from the engine, and the plan-stat buckets leave steady damage uncounted. |
| Risk handling | 7 | Tune is time-boxed, a failed BV4 becomes a `warn`, a failed rig falls back. Unaddressed: plan-stat bias, a lost run never reaching `recordFight`, orphaned rigs. |
| Testability | 8 | Every owned id has a named file and lane. WP6 E is runnable through the Workshop line. Two gaps listed below. |

Average 7.5. No blockers. Pass rule (no blockers, each at least 7, average at least 7.5) is met exactly, so the must-fixes below should go into the brief and the contract tests before B9a.1 launches.

## Specific checks you asked for

**Rewind "combination" (must-fix M1, contradicts v1 C6).** v1 rules 4.4 and `liftCombos` in `enemy.ts` define it as the single part with the highest contribution (damage dealt plus Plating gained) together with the one part that powered it (`fedBy`), healing half the damage that pair dealt; phase 3 lifts the two strongest distinct combinations. Acceptance WP4 says "v1 C6, kept". The brief defines it as "a placed part plus every part it passed motion to ... one BFS chain from a feeder, scored by damage". That is different on three counts: it goes downstream (a feeder's chain can be the whole machine, so a single Rewind could clear the board and heal for most of a turn), it scores by damage only (v1 counts Plating, so a Plating build is never Rewound), and it would require new bookkeeping beyond `lastTurnContrib`. WP4's example (Coil fed by Idler) passes under both, which hides the change. Fix: keep the v1 definition and the existing `liftCombos` (already unit-tested, B3), or if the owner wants chains, say so as a rules change in rules 4.9 and DECISIONS.md with its own test and a BV4 impact note. Also say which sits where: the engine today puts the Pressure reset on phase index 1 and the alternate-turn Jam inside `rewind()` (odd turns). The brief and content 3.6 move the Jam onto the breakable Midnight Bell, on even turns with Attack 36; the lane must delete the Jam from `rewind()` or Midnight jams twice, and the parity (odd in code, even in content) must be stated.

**The Gauge decision (accepted, with one gap, M2).** Letting a standing Gauge persist into phase 3 is coherent with the 2 to 3 Mend and with content 3.4's corrected table. Two follow-ups. (a) The brief generalizes "parts of earlier phases that still stand stay into later phases (the existing rule)". Then the Foreman's Apron Plate (Shell 14, phase 1 non-keystone) also persists into phase 2 and keeps shelling, which content 3.2 does not intend (it lists it for phase 1 and totals the phase 2 HP without it). Decide per part (a `persists` or `phases: [1,2]` field on the part def, as content tables list) rather than a blanket rule, and check what the B7 engine really does with surviving non-keystones. (b) With the Gauge, the Cinder Hand and a core behind the Ember Shell in phase 3, the Gauge's Pierce 28 build-up is probably too much; the brief's tune clause covers it, but name it as a BV4 risk and test that Mend resets the reading.

**Plan stats (must-fix M3).** Fixed B3's missing owner and tie-break, good. The buckets are the problem: only Steam-family damage, status damage and damage on 30-plus turns are counted. Ordinary steady Strike damage on turns under 30 (most turns in acts 1 and 2) counts nowhere, while Plating gained counts fully, so Plating wins almost every run and the Clockmaker would nearly always remember "Plating" (it also compares unlike units: Plating gained against damage). That makes BF4's variety unreachable and the memory feature feel fixed. Rules 5.4 define the shares as "damage and Plating from each source". Fix: count all non-Steam, non-status damage as burst (no 30 threshold), or define burst as Strikes and Sweeps from non-Steam parts; drop the arbitrary "3 per status stack"; and have the bots lane report the distribution of main plans across expert, turtle and burst runs (the turtle should give Plating, the burst bot burst). Add tests: a steady 15-damage-a-turn run, a Steam run, an empty run, a within-run tie, a v1-migrated profile without `planHistory`.
Related gap (M4): `recordFight` is called "in the run's settle path", which a loss never reaches (the run ends mid-fight). Specify that a defeat and `abandonRun` record the current fight, or the three-run history will skip every loss and bias toward winners. Also say that `planHistory` keeps only the last three and who migrates the field (B8's `migrate.ts`).

**WP6 via the Workshop line (accepted).** One line on the Workshop start-run panel, from the same history the fight will use (history changes only in `finishRun`, so note and fight agree), with no line when empty, satisfies WP6's E clause until B10. Add: the e2e must set history through a `cheat` or a seeded profile, and `e2e/v2-wardens.spec.ts` is listed under both the contract and warden-rigs while wardens-core turns WP6 E green; give that file to one owner (rigs for WP2 and WP7, a second file for WP6, for example `e2e/v2-memory.spec.ts`, owned by wardens-core).

## What the split leaves orphaned

- **M5: The 14 other rigs.** The first draft's "convert all A2 rigs now" (acts 2 and 3 regulars, elites, summons) is gone from B9a, which converts only the three wardens. Nobody now owns AR2 for the remaining enemies, and roadmap-v2 still says A2 delivered them as art, with B11 doing the in-game integration. Either put it explicitly in B9b (pipelined, non-blocking) or return it to B11 and say so in D-040 and the roadmap; either way the AR2 row in acceptance needs a phase.
- **Brass 4 per Clockmaker part** and the Clockmaker's ending Brass: no lane owns `brassFor` or `runRecord` changes in `run.ts` or `meta.ts` for this; wardens-core's `meta.ts` ownership lists `finishRun` and the memory only. Add it.
- **Boss trinket choice with a Masterwork slot** (content 5, Foreman and Queen) and the pick-of-two Legendary: B9b, correctly, but B9a's "warden cores give a Rare" must not break the existing boss trinket choice; one regression check.
- Items from the first verdict that rightly moved to B9b: B1, B2 (now moot), M4 rarity half, M6, M7, S3, S5.

## Should-fix

- Conditional beat: write the union's test (both Gauge states) and keep `beat` rendering in `stage.ts` on the rigs lane and the text in content on wardens-core, with one named `phase` event field carrying the line.
- BV4 in `tests/sim/v2-fights.test.ts` is red from the contract until the bots lane and tune finish; mark it expected-red in the contract and make a `warn` path explicit (the brief does, in B9a.4).
- The memory part is "not Braced" by the existing rule (only keystones and the last core are Braced); state it so a lane does not cap it.
- Art: each warden asset needs the art-reviewer pass (B9a.5 has it) and the Foreman's second layer counts against 250 KB; both are in the brief. Also confirm the Queen's phase mood has a source painting (WP7 needs the Gauge anchor to stay broken).

## What was tested
Documents and code read only, plus `enemy.ts` `rewind` and `liftCombos`, v1 rules 4.4 and acceptance C6, WP4. No `npm test`, no server.
