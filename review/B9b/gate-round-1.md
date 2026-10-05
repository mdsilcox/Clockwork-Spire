# B9b Rarity and achievements, gate review round 1

Verdict: REVISE (no blockers, every metric at least 7, but the average is 7.43 against the required 7.5).

## Scores
| Metric | Score | Evidence |
|---|---|---|
| Fun | 8 | Earning a feat in a real climb pays off: autoplay careers earned e-bell, m-act2-breaker, m-break-all, m-drill, m-bell3, m-bells, m-salvager within three runs, and the Queen's "take one of the two" Legendary screen is a good moment. Twin Mainspring on D2 with three Spurs previews "8 damage (5 to parts)" and the run took the core 15 to 12, matching. |
| Clarity | 7 | Trophies tab lists feat, tier, reward with a shape tier mark, progress ("0 of 50 pets"), hidden feats as "A hidden feat", unbuilt ones "Opens with Bellfoot". The Watch prompt is plain. Twin Mainspring says "goes on D2 only" when misplaced. On 667x375 the shelf shows only two rows above the sticky Climb button, so scanning is slow. The reward line for e-bell reads "Journal page / collar" with no mention of what a journal page does yet. |
| Depth | 7 | balance/2026-10-05-v2-rarity.md: expert 9 to 12% with everything unlocked (base 18%), plater 0%, no must-pick. But Cascade Piston was never taken and Hour Hand held in 9 runs at 0%, Night Watchman and Free Pawl hurt win rate (6.5%, 4.9%) because the bot misuses them; Legendary parts were never seen (Blanket or Whistle picked every time). Deferred to B10 as stated; this is thin evidence, not proof, of real choices. |
| Feel | 7 | Wind back restores the fight (HP 1, turn 1, hand 3), the prompt appears at the loss, Foresight chip sits by the pip, Queen cards are crisp. I did not hear audio or inspect new replay events frame by frame (headless at skip speed). |
| Look and sound | 7 | Tier marks (distinct shapes) on cards and shelf are cohesive and readable; Legendary cards are gold-pink framed. New parts use family fallback art (accepted by the brief), so the 15 new parts have no unique look. Audio not judged. |
| Stability | 8 | `npm run test:unit`: 647 passed, 3 skipped, 21 todo (my rerun). v2-trophies and v2-turntools e2e: 20 of 20 on desktop and phone (my rerun). Driven scenarios (trophies, legendary, Watch lose and wind back, Foresight, 6 autoplay runs, new item placement) at both sizes: no console or page errors, no sideways scroll. I did not rerun the full e2e, offline or career suites. |
| Spec coverage | 8 | AD1 to AD3, AD6, AD7, EM7 present and exercised: 22 available feats (11 locked "Opens with Bellfoot"), unlocks flow through `runConfigFor`, rewards recorded in `profile.rewards` (collars, journal), Queen's pick of 0, 1 or 2, Inventor's Watch defeat prompt, Foresight Dial, Two Left Hands, tier marks. Real pool contents after unlock verified by unit tests, not by me in the pool. |

Average: (8+7+7+7+7+8+8)/7 = 7.43. Below the 7.5 bar by 0.07; this is a near-miss, not a defect list.

## Blockers
None. No crash, lost save, phone breakage or missing required feature found.

## Improvements (ranked, all small)
1. Clarity on the phone: at 667x375 the Trophies panel shows two rows between the tab strip and the sticky Climb button. Make rows more compact on the phone (one-line text, reward and tier mark on the same line) and add a one-line note on what journal pages and collars do now ("kept for Bellfoot") so rewards with no system yet do not read as broken. Worth about +1 on Clarity.
2. Feel evidence: the new effects (Night Watchman's pre-enemy strike, Skewframe diagonals, Mirror Gear copies, Resonance Rod echo) use existing replay events with family fallback art. Add a distinct short flash or label in `stage.ts` for those firing (e.g. the Watchman's strike labelled), and a per-item browser screenshot in review. Worth +1 on Feel and Look.
3. Depth, for B10 (already flagged): a drafter that can use Night Watchman, Free Pawl and Cascade Piston, and a Queen pick that is not Blanket or Whistle every time, before reading win rates as item verdicts. Cascade Piston (0 taken in 900) and Hour Hand (0% at 9 runs) need a look.

## What I tested
- `npm run test:unit` (647 passed) and `e2e/v2-trophies.spec.ts` plus `e2e/v2-turntools.spec.ts` (20 of 20), reran myself. Vite on 5384, stopped by PID 29600.
- Headless Playwright at 667x375 touch and 1280x800: Trophies tab empty and with m-burst and e-pet earned (shots in `review/B9b/gate-shots/`), Queen's two-card Legendary screen with no skip, Inventor's Watch loss prompt then Wind back (state restored: HP 1, turn 1, 3 in hand), Foresight Dial chip, tier marks on hand cards, Twin Mainspring refusing A1 with a message and placing on D2, preview "8 damage (5 to parts)" matching the run (core 15 to 12).
- Six real autoplay runs through the controller: feats earned in play (e-bell, m-act2-breaker, m-break-all, m-drill, m-bell3, m-bells, m-salvager, later e-first-win, m-three-elites, h-flawless, h-whole-clock), journal pages and a collar recorded, Scrapper chassis reward recorded. No console errors. The autoplay bot won 3 of 6 seeds, much higher than the simulator's 9 to 12%; it is a stronger, seeded bot with progressive unlocks, but B10 should look.
- Read the latest balance report. Not tested: audio, full e2e, offline and career suites, the in-pool appearance of unlocked items (covered by unit tests only).
