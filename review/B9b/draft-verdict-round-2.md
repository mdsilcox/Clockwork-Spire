# Draft verdict, round 2: B9b Rarity and achievements

Reviewer: critic, in place of the owner's draft approval (D-035). Read: docs/briefs/B9b-rarity.md at 86cc7fb, review/B9b/draft-verdict.md, content.md 2, 5, 7, and spot-checked the code: `machine.ts` (`hitAt`, overpressure), `types.ts` (`CombatState.rng`), `render/parts.ts` (family fallbacks exist), `controller.ts` (`petSprocket` exists). The game was not run.

## Verdict: PASS (borderline), with 5 must-fix edits to the brief

| Metric | Score | Evidence |
|---|---|---|
| Plan quality | 8 | Lanes now follow mechanism: one agent owns `machine.ts` and the tick loop, hook points are contract pass-throughs (`itemhooks.ts`, `routeStrike`, `spreadStatus`, `overpressureCheck`, `isLastTick`), one owner per function (`finishRun` sequence, `recordFight`, pool call sites). Item split checks out: 17 + 3 + 1 = 21 (10 Masterwork parts, 5 Legendary parts, 4 + 2 trinkets). |
| Spec fit | 8 | Carry rules, Coupler "once per turn", invariants 8 and 9, the Watch wording, the Queen's 0, 1 or 2 options, `profile.rewards` and the 22/11 split all match or amend the docs explicitly. Remaining small mismatches below. |
| Risk handling | 7 | The Watch's restore scope and defeat prompt are handled; the long pole has a named fallback (ship a subset, log it). Unaddressed: preview equals run for 21 new effects, Twin Mainspring placement and new replay events have no owner, the `checkAchievements(profile, record)` signature cannot see run facts. |
| Testability | 7 | One behavior test per item, per pool source, AD1 "exactly one". Gaps: the turn-tools lane has no e2e file, no cross-item property test. |

Average 7.5. No blockers. Pass rule met exactly; apply the must-fixes before B9b.0.

## Round-1 findings, checked
- **B1 (lane coupling): resolved.** Strike routing, status spread, overpressure and last-tick are hooks the contract places in `machine.ts` and `combat.ts`; items-engine fills them in one agent. The only residual coupling is that 17 effects share one tick loop and one agent, which makes it the long pole; the brief says so and allows a named subset (acceptable).
- **M1: resolved** (Coupler once per turn, Piston once per Strike, no carry of a carry, invariants 8 and 9, `legendary: string | null`, content 5 and rules 1.6 and 6 amended in the contract).
- **M2: resolved.** The snapshot covers hand, draw, streams (`CombatState.rng` holds them) and the fight's tallies; `watchUsed` sits outside it; defeat waits for a prompt before `settleCombat`.
- **M3: resolved** (0, 1 or 2 options with the Masterwork then Rare fallback).
- **M4: mostly resolved.** Facts have definitions and owners; see M2 below for the signature.
- **M5: resolved** (`profile.rewards`; `petSprocket` exists in `controller.ts`, so e-pet is available).
- **M6: resolved** (Tow Hook moved to progression; `finishRun` is a fixed sequence; `controller.ts` split by function).

## Must-fix

M1. **Twin Mainspring and the new effects' non-engine surface have no owner.** "Place only on D2" is a placement rule (`placePart` in `combat.ts`, owned by turn-tools, and the UI that greys other cells, owned by nobody), Night Watchman acts on the enemy turn, Skewframe adds diagonal motion, Resonance Rod and Hour Hand add effects the stage replays. Say who adds (a) the D2 legality check and cell hint, (b) any new `GameEvent` kinds or flags and their replay in `stage.ts` (a lane that does not own it today), and (c) whether the family fallback art in `render/parts.ts` is acceptable for the 15 new parts (tier marks distinguish them), so no lane waits on art. Put the event kinds in the contract.

M2. **`checkAchievements(profile, record)` cannot see most facts.** Steam count in the bin, chassis of a win, elites per act, vaults per act, bell hours, overpressure and fuse counts are run state, not RunRecord fields. Either pass the run too (`checkAchievements(profile, run, record)`) or list the RunRecord fields the contract adds. Tests for AD2 depend on this.

M3. **Preview must equal run for every new item.** Skewframe, Twin Mainspring, Mirror Gear, Free Pawl, Perpetual Engine, Hour Hand and the carry items all change what `previewTurn` simulates; EM7 says preview equals run. Add one contract-level property test over all 21 items (parts placed in a fixed board, `previewTurn` versus `runTurn`, plus invariants 2, 3 and 8) so the check is not left to eleven separate item tests.

M4. **The turn-tools lane has no e2e file.** Its "Turns green: E on both sizes" (the Watch prompt, Foresight second intent) has no spec; `e2e/v2-trophies.spec.ts` belongs to progression. Give turn-tools its own (`e2e/v2-turntools.spec.ts`) in the contract, including the defeat prompt (Wind back, then Accept) and a reload keeping the snapshot.

M5. **Whistle's "a part he breaks drops 1 extra Scrap" crosses lanes.** The Whistle belongs to items-engine, the Scrap payout to `salvage.ts` (progression). State the seam: the engine marks the break in the fight log (an event flag or `brokenBy`), progression reads it in the salvage tally; add the test to progression's file.

## Should-fix
- Run facts say "the Apron too, so it must be broken before it retracts". Confirm B9a's Apron Plate actually retracts at the phase change (content 3.2 lists it for phase 1); if it persists, drop the clause.
- The snapshot is taken before every Run only when the Watch is held; say so, to avoid doubling every save.
- The chassis rack should not offer the Scrapper before its parts exist (`rewards.chassis` records it only).
- Vault and trader fallbacks (no Masterwork unlocked; fold into the tier below) are inside "a test per source"; list them as cases.
- Boss trinket choice: restrict Masterwork trinkets to the Foreman and Queen (the Clockmaker has no choice), never Legendary.
- `memoryPlan` reads history oldest-first (B9a) while the data model says newest first; pick one and note it in the contract.

## What was tested
Document and code read only: no `npm test`, no server.

## Resubmit
Not required: apply M1 to M5 in the brief and contract tests, then launch.
