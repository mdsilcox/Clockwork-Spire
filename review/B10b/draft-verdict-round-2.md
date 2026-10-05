# Draft verdict, round 2: B10b Modes and Overwind (and the B10c hand-off)

Reviewer: critic, in place of the owner's draft approval (D-035). Read: docs/briefs/B10b-curve.md at f6490dd ("Round 2" section, which supersedes the earlier text), review/B10b/draft-verdict.md, content.md 3.6, 7, 9, rules 5.7. The game was not run.

## Verdict: PASS (borderline), with 4 must-fix edits and a sound B10c hand-off

| Metric | Score | Evidence |
|---|---|---|
| Plan quality | 8 | One lane (modes-overwind) with review and gate; the curve moved to B10c after B10b merges, so `enemies.ts`, `rooms.ts`, `meta.ts` and `combat.ts` have one editor at a time. The contract still places pass-through application points. |
| Spec fit | 8 | Multiplier order and rounding, which amounts the damage % touches, Overwind 5 per hour, Overwind 7 versus the Scrapper and Tow Hook, Brass multiplied once, Overwind 9's scope (Foreman and Queen, none without history) and the Thirteenth Hour's trigger, Braced rules and Blanket interaction are now stated and consistent with content 9 and rules 4.8. |
| Risk handling | 7 | The riskiest work (the fourth phase) has a defined trigger and a real-engine test. Remaining risks: the ladder assertion will not hold up, summons and Strength ordering, the Midnight parts after the phase change. |
| Testability | 7 | AD4, AD5, each twist, the six hard achievements, the four-phase floor, the clock tower door's locked reasons and the saved mode and level are all testable. The ladder test as written is fragile (below). |

Average 7.5. No blockers. Pass rule (no blockers, each at least 7, average at least 7.5) is met exactly. Apply M1 to M4.

## Round-1 findings, checked
M3 (Thirteenth Hour): the trigger is now defined (Midnight's core reaching 0 starts phase 4 as if its last keystone broke; the core re-seals behind the Chime and the Dial, reopens at 40 HP, Braced to 13, no Governor; Midnight's core stays Braced to 26; the beat and the phase action run), the "fifth phase" error is corrected to fourth, anchors fall back to existing bell and dial positions until B11, and a real-engine four-phase test asserts the floor. M4 (twist 9), M5 (order, rounding, per-hour elites, Scrapper and Tow Hook, Brass): resolved. M6 (ladder): answered, but the assertion is too strict, see M1. M7: resolved by the split.

## Must-fix
M1. **The ladder test cannot assert "strictly decreasing win rates".** At 300 runs per mode, the expert's Master and Clockwork rates will be near 0% once B10c brings Journeyman under 5% (and are small even today: Journeyman is 9 to 18%), so equal zeros fail a strict test, and the same test would then break in B10c. Assert instead that win rate is non-increasing from Apprentice to Clockwork and that mean act reached (or HP lost per act) strictly decreases, with Apprentice clearly above Clockwork by a margin; keep it correct after the retune.

M2. **Thirteenth Hour details still open.** (a) After the phase change, which of Midnight's parts (Hour Wheel, Midnight Bell, Governor Frame) remain standing and keep acting in phase 4? State per part (persists or retracts), as B9a did for the Gauge and Apron. (b) "At the start of each of his turns the player's Plating is lost": phase 4 only, not Midnight, and before or after his Rewind and attacks? Content 9 puts it inside the phase 4 text. (c) The win check must treat a Midnight core at 0 HP with the phase pending as alive; give that its own assertion (the fight does not end, `anyAlive`, no victory event, no Brass or Legendary side effect). (d) Do the new parts pay Brass 4 each and count for `h-whole-clock` ("every part")?

M3. **Order of the modifiers on a hit.** The brief fixes the mode multiplier and Overwind 8's +2 but not Strength (Ratchet, Overwound's Strength 3), Dazed and Cracked. State: base amount times the mode %, rounded half up per hit, then Strength and Overwind 8 added, then Dazed. And that HP scaling also applies to enemies that enter after combat starts (summoned Cog Rat, Steam Wraith, Tinpot Mites), not only the createCombat set; test one summon.

M4. **Interactions to state and test.** Overwind 6 (oil heals half) with the mode's oil heal % and with B10a's Oil Flask and the trader's oil; Overwind 2 (one hour fewer) with the mode's hours, Dusk Lantern and the beacon (the act must never fall below the entry-to-door path plus spare hours: a bounds test over all four modes at Overwind 2); the first Journeyman-or-harder win opens Overwind 1 to 3 outside the achievement table (e-first-win counts any mode), so say where that check lives and test an Apprentice win not opening it (AD5); and `RunRecord` must carry `mode` and `overwind` for `checkAchievements` (h-master, h-clockwork, h-ow5, h-ow8, h-ow10, h-master-bare).

## Should-fix
- One Sonnet lane carries ten twists across seven files, the clock tower panel, six achievements, the fourth phase and the tests. State the order (modes, the clock tower, simple twists, twist 9, Thirteenth Hour last) and that the gate may close with a named subset of twists if it overruns, logged, like B9b's item fallback.
- The clock tower door needs an owner-facing way to test harder modes without winning first (`cheat.setMode`, `cheat.setOverwind` are in the contract; mention them in the gate checklist so the owner can try Master, Clockwork and Overwind 10).
- Overwind 9's marker "fallback position until B11": add a test that the extra part's marker appears at all (not off-screen) on both sizes.
- Overwind 4's Rust (first part placed each combat) must respect Grease Pot and Feather Duster trinkets as they exist today; list it in the twist test.

## The B10c hand-off
Sound. The decisions fixed now answer round 1: measure first with baselines for BV1, BV2, BV10, BV5 and the autoplay-versus-sim reconciliation; the drafter frozen before any lever; the bench upgrades' costs and effects added as a lever; the cheap-first check order (BV1, BV3, BV4, BV8, BV9 after every change; BV2, BV10 at a round's end); heavy sims behind `test:curve`; Plating viability as reach rates (act 2 at least 60%, act 3 at least 50% of the base expert, 600 runs: measurable with a standard error near 2 points, and it leaves BV3 and BV8 untouched); the `coreTookThisTurn` reset as its own step with a BV4 rerun; and a `warn` floor (expert no-meta win at most 8%, first autoplay win no earlier than run 5, BV3, BV4, BV8, BV9, BV11 green). Two notes for B10c's own draft: (1) all measurement and tuning stays on Journeyman at Overwind 0, so B10b must keep the defaults identical (a regression test that the BV baselines are unchanged after B10b merges); (2) the ladder test above should be re-validated after the retune.

## What was tested
Document read only: no `npm test`, no server.
