# Review D1 "Concept and stack", round 1

**Verdict: PASS** (no blockers, all metrics >= 7, average 7.67 >= 7.5)

## Scores (discovery phase: documents only)
| Metric | Score | Evidence |
|---|---|---|
| Clarity | 8 | vision.md is one page with audience, four testable pillars, must-haves mapped to the spec, later and non-goals, measurable success criteria. D-006 states the architecture plainly (pure sim -> event timeline -> canvas replay; DOM UI) and names the three rejected engines with reasons. |
| Depth (of the design) | 7 | The key design insight (events tagged tick+BFS step, renderer never re-runs rules, preview = same function on a copy, per-stream seeded RNG in D-008) is sound and the spike's lessons are specific (text to DOM, cheap preview copy). Weak spots: rejected options are thin on tooling (no alternatives weighed for Vite/Preact/Vitest in D-007); the determinism proof only exercises RNG for enemy intent, so preview exactness with random parts or draws is asserted, not shown; one rationale ("a prior game build found...") is unverifiable. |
| Spec coverage | 8 | Everything D1 was meant to deliver exists: vision, stack decision with rejections, a spike covering all three risks (exact preview, 60 fps replay at both sizes, headless speed), plus Phase 0 files. Vision covers every spec section 1-5 requirement including Sprocket and onboarding. Gaps are minor: PROGRESS.md still says "Now: Phase 0" and CLAUDE.md has TODOs for scripts and source layout (acceptable pre-skeleton). |

**Average: 7.67**

## Blockers
None.

## Improvements (ranked)
1. Close the preview-exactness gap in D2: state in rules.md how any randomness (draws, random parts, enemy intent) is resolved so `preview` is exact (for example, seed the turn's RNG stream before the preview and pass it in), and add a determinism test that includes an RNG-using part, not only enemy intent.
2. Add a short "alternatives considered" line for D-007 (for example, Vitest vs Node test runner, Preact vs vanilla/Lit) and drop or source the "prior game build" claim, so the stack decision is fully justified.
3. Housekeeping: update PROGRESS.md to D1 done / D2 next, and fix spike.md's reference to `docs/acceptance.md` (not yet written) by marking it as a D2 deliverable. In the spike's phone screenshot, part labels are clipped by popups ("piston" under "+3"); note that DOM labels (already planned) must fix this.

## What I checked
- Read SPEC.md (incl. Appendix A), vision.md, DECISIONS.md D-001..D-008, spike.md, spike/RESULTS.md, CLAUDE.md, PROGRESS.md, README.md, spike/src/sim.ts, bench.ts, measure.mjs.
- Ran `npx tsx bench.ts` in spike/: 100,000 turns in 1.65 s (60,688 turns/s, 174.7 events/turn, 303 runs/s equivalent); same-seed hash 3b93816a identical twice, different seed differs. Matches the documented numbers.
- Viewed spike/shots at 1280x800 and 667x375: cohesive brass/copper look, gears, coil, boiler, piston, popups and chain counter render; phone layout fits with the enemy as a placeholder. Did not re-run the Playwright FPS measurement (needs the dev server); the 60 fps claim rests on measure.mjs and its logged output, and the doc honestly notes headless vsync-lock and no real-phone test.
- Skipped docs/rules.md, content.md, data-model.md as out of scope.
