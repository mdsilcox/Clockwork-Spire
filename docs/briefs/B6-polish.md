# Brief: B6 lane `polish`

Read `CLAUDE.md`, the latest critic verdicts (`review/B5/round-1.md`, `review/B4/round-1.md`, `review/B3/round-1.md`), and SPEC.md Appendix A. The final critic needs an average of at least 8 on Fun, Clarity, Depth, Feel, Look and sound, Stability and Spec coverage, with no blockers.

## Goal
Lift the release from "every metric 8" to a confident pass: fix every open critic note and add the small touches that make the game feel finished.

## You own
`src/ui/**`, `src/render/**`, `src/audio/**`, `e2e/**` except `career.spec.ts`, `sweep.spec.ts` and `perf.spec.ts` (hardening lane), `tests/ui/**`. Not `src/core/**`, `src/sim/**`, `src/app/autoplay.ts`. If a fix needs `src/app/controller.ts`, keep the change small and say so (the hardening lane only adds a hook and error handling there).

## Must-fix (critic notes)
1. Defeat screen: "Floors climbed" in the stat tile and in the Brass breakdown must come from one source (B5 #1).
2. Speed buttons: `aria-pressed` state; 2x and Skip persist across reload; assert both in e2e (B5 #2).
3. How to play diagram: label the parts (Spur Gear drawn as the real part art or a labeled gear, not a hollow ring) and number the steps in reading order (B5 #3).
4. Event screens for Sprocket events: his art sits at the top of the frame with empty space below on desktop; center and size it (B4 lane note).

## Should-do (feel and fun)
5. A short "new best" or "first win" moment in the Workshop (a pinned note slides in, Sprocket reacts) and on the map when you enter a new act (act title card with the act's motif).
6. Tooltips and card text: every part's tooltip shows its family and a one-line "works well with" hint drawn from its family synergies (data-driven from the part registry family; no new rules).
7. Reward screen: highlight parts that synergize with the current bin (a small brass dot "fits your machine" when its family already has 2+ parts in the bin).
8. A quick visual pass at 667x375 and 1280x800 of every screen for alignment, overflow and contrast; fix what you find.

## Assumptions and decisions
- No rule or number changes (balance is settled; see balance/ reports). UI and presentation only.
- Short text; warm, curious, a little melancholy; American English; no em dashes. Tap targets at least 40 px; text at least 12 px at 667x375.
- Own git worktree (path in the launch message). Don't commit. Never stash, checkout, reset or restore. e2e with `PW_PORT=5452`.

## Done when
Unit and e2e green; screenshots of every changed screen at both sizes looked at. Report per template.
