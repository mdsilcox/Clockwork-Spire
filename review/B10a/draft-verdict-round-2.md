# Draft verdict, round 2: B10a Bellfoot and the Spire's memory

Reviewer: critic, in place of the owner's draft approval (D-035). Read: docs/briefs/B10a-bellfoot.md at 0499881 ("Round 2 decisions"), review/B10a/draft-verdict.md. Spot-checked `rooms.ts` and `shop.ts` (oil), `types.ts` (`RunState.flags`, `RngStream`), `rng.ts`. The game was not run.

## Verdict: PASS, with 1 must-fix edit and 4 should-fix

| Metric | Score | Evidence |
|---|---|---|
| Plan quality | 8 | Lane split unchanged and sound; the open data (story, bestiary, collars, events) now has an owner; routing includes `autoplay.ts`, career e2e and `test:career` at hand-back; BF6's Spire half is explicitly moved to B11. |
| Spec fit | 8 | The beacon (patrols and door shown, +1 hour in act 3) is a real effect and amends rules 5.4 and content 6; per-act vault landmarks, the lift endpoint (floor 3, 1 hour), the Trader's cousin converting a fight room, the lore keys and the Scrapper passive are all defined and consistent with content 6 to 8. |
| Risk handling | 7 | CL1 is tested under every patch (200 seeds per act, all landmarks and the cousin together), the lift cannot sit next to the door, the lamplighter choice disables with a reason. The Oil Merchant effect is not implementable as written (M1). |
| Testability | 8 | One test per achievement trigger, per event, the CL1 sweep, the career test; AR6 ambience and sound bed assigned. |

Average 7.75. No blockers. Pass rule (no blockers, each at least 7, average at least 7.5) is met. Apply M1 before B10a.0.

## Round-1 findings, checked
M1 (six events), M2 (beacon), M3 (landmarks, lift, CL1, empty bin), M4 (data owners, collar ids and colors at the `collar` anchor, `bestiary` and `collar` fields), M6 (lore keys and triggers), M7 (ambience and bed, BF6 split), M8 (routing), M9 (Scrapper): resolved. M5: partly, see below.

## Must-fix
M1. **"The Oil Merchant starts each run with 2 Oil Cans, the existing trader item, no new rule" does not hold.** The trader's oil is a stock entry bought and used on the spot (`rooms.ts` `kind: 'oil'`, healing 15 for 15 Scrap; `useOil`), so there is no inventory to start a run with, and no point at which a carried can is used. Also "Oil Can" is already a Common Chimes part (`oil-can`). Decide and write: a `run.oil: number` count (migrated with a default), where it is used (the section screen, between fights, not in combat), what it heals (15, the trader's value), and a different name ("Oil Flask") to avoid the part clash; add a test (start with 2, use one, heal capped at max HP) and the HUD chip.

## Should-fix
- `RunState.flags` is `Record<string, boolean>`, but the brief writes `run.flags.resident = id` (a string) and `run.flags.met` (a list of enemy ids). Widen the type in the contract or add `run.resident: string | null` and `run.met: string[]`.
- Trader's cousin: rules 4.4 give a trader 1 to 2 per act and fights 7 to 9; converting a fight room can reach 3 traders or 6 fights. State the adjusted bounds (amend 4.4) and use them in the CL1 sweep, so "inside CL1" is true.
- Scrapper: say which wrecked part's salvage the tray offers when several stand (highest rarity, then leftmost, as Tow Hook does).
- Apprentice: the `reward` stream at `newRun` is fine for determinism; note that it makes a profile with the Apprentice differ from one without from the first reward draw, and test that the same seed and choices give the same run (invariant 4).

## Carried forward from the first verdict, still to watch at the gate
Walking and keyboard focus, `scrollWidth` inside the street frame at 667x375, anchors of the painted and code-drawn street matching, Sprocket's `sprocketMood` reactions and the collar band after the Workshop moves into Bellfoot (spec 2.4), and the shelf dropping "Opens with Bellfoot" for the five achievements.

## What was tested
Document and code read only: no `npm test`, no server.
