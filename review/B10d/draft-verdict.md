# Draft verdict: B10d The front door

Reviewer: critic, in place of the owner's draft approval (D-035). Read: docs/briefs/B10d-front-door.md (51ab217), acceptance AR1 and AR3, `src/ui/Title.tsx`, `src/ui/Coach.tsx`, `src/app/controller.ts` (`startTutorial`, first-launch branch at the end of `boot`), `src/app/prefs.ts` (`tutorialDone`), `e2e/helpers.ts`, `src/core/content/enemies.ts` (`tutorial-automaton`), the filters that exclude it, `art/title/` and `public/art` (1.6 MB). The game was not run.

## Verdict: FAIL (6.75). No blocker, 7 must-fix; all are brief edits.

| Metric | Score | Evidence |
|---|---|---|
| Plan quality | 7 | Small, well-motivated, two lanes with owned files, a gate, a browser and art review; it correctly keeps balance and sims out. But the first-launch route and the title buttons sit between the lanes, and the training rig is introduced without the existing enemy filters. |
| Spec fit | 7 | AR3's wording (Continue, New run, Settings; tower not covered; animated steam and lamps) is matched in intent; the button list drops "Save slots" and renames test ids that 21 specs use, and the first-launch path never shows the painted title the phase exists to ship. |
| Risk handling | 6 | Unaddressed: the `cs.tutorialDone` key set in five places, `tutorial-automaton` used as a plain fixture in four test files, the new enemy leaking into regular-enemy tests and B10c's balance hooks, the salvage step with no run, a 5.6 MB source painting against a 600 KB cap. |
| Testability | 7 | `e2e/v2-title.spec.ts` and `e2e/v2-tutorial.spec.ts` are named in the contract with real failing tests; AR3's [C] part has the art-reviewer. The salvage step and first launch into Bellfoot need a deterministic path. |

Average 6.75. Pass rule (no blockers, each at least 7, average at least 7.5): not met.

## Must-fix
M1. **Keep the title's existing test ids and the Save slots button.** Today's `Title.tsx` has `climb`, `continue-run`, `open-slots`, `continue`, `practice`, `tutorial`, `sandbox`, `open-howto`, `open-glossary`, `open-settings`, `colorblind`; several e2e specs click `climb` (workshop, bellfoot, clocktower specs). The brief's button set (Continue, New climb, Settings, a smaller row without Save slots) would either rename them or lose the slot screen. List the preserved ids in the contract (the label may change, the id and behavior may not), keep "Save slots" and the color-blind toggle, and make the AR3 test read the ids, not the labels. Note `New climb` maps to the existing `climb` (now Bellfoot, B10a).

M2. **Do not retire `tutorial-automaton`.** It is used as a plain scripted enemy by `e2e/ui.spec.ts` (`fightWithSpur`), `tests/core/enemies.test.ts`, `tests/core/b2.acceptance.test.ts` (an exclusion list), `Archivist.tsx` and `controller.ts` line 73. The brief says the tutorial lane "retires" it, but none of those files is in a lane. Keep it as a fixture (it is already excluded everywhere) and have the v2 tutorial use a new entry.

M3. **Give the training rig a name and flags the existing filters already exclude.** Existing filters exclude ids beginning with `tutorial` or `test-` and `summonOnly` (b7-content tests, `balance.ts`'s regular pool for the act shares, `difficulty.ts` act core scaling, `Archivist.tsx`, EM1, EA11, BV9). A new act 1 normal frame enemy named `training-rig` without `summonOnly` would join the 15 regulars' counts, the Plating-bypass share, B10c's act core HP hook and the bestiary. Name it `tutorial-rig`, set `summonOnly: true`, add a one-line test that no tutorial entry appears in `ENEMIES` filters (EM1 counts, the bestiary list, encounter pools, B10c's `balance.ts`). That also settles the B10c collision: the new entry sits in its own region of `enemies.ts` and no tuning lever touches it.

M4. **First launch must keep `cs.tutorialDone === '1'` working, or change all five places at once.** The key is read in `prefs.ts` and set in `e2e/helpers.ts` (`skipFirstLaunch`, used by 21 specs), `e2e/audio.spec.ts`, `e2e/practice.spec.ts` and `src/sim/strat/autoplay-compare.mjs` (the B10c autoplay reconciliation). Decide: (a) keep the key and meaning (existing players, including the owner, never see the v2 tutorial except from the title's "Start the tutorial"), or (b) a new key (`cs.tutorialV2`) with the helper and the other four updated in one commit and a title hint for returning players. Recommend (a) plus a one-time title banner "A new tutorial is ready" until opened. State it, and require that all 21 specs and `test:career` pass unchanged (no edits to the specs).

M5. **The first-launch order skips the front door.** The brief says a fresh profile goes "tutorial, then the slot and name prompt, then Bellfoot (no detour through the title); the title shows on every later launch". The owner's complaint was seeing v1's tutorial and title; this order means a new player never sees the painted title that this phase pulls forward. Put the title first: title, then New climb (first time) runs the tutorial, then Bellfoot. Also confirm the "slot and name prompt" exists (the controller's boot goes tutorial or title or practice, with no name prompt visible); if it does not, drop it from the brief.

M6. **The salvage step has no run to run in.** The tutorial fight is a practice combat (`kind: 'practice'`, no `RunState`), but the salvage tray is a run `Pending`. State how the step works: a fabricated one-item tray shown by the tutorial (no save, nothing added to a bin), or a minimal mock run discarded at the end. Test that leaving or skipping at any step writes nothing to a save slot or `profile`, and that `practice` fights in progress are stashed and restored as `startTutorial` does today (the `stash`).

M7. **The painting and the AR1 budget.** `art/title/source@2x.png` is 5.6 MB and the animated version (steam, lamps) needs layers or masks; "at most 600 KB, as a scene" must cover the painting plus every layer file in the manifest, as WebP, and the AR1 test must pass (every manifest entry has a source under `art/`, no PNG in `public/`). The title is the first paint: state the loading behavior (the code-drawn title until the WebP decodes, no layout shift, no tower covered by buttons at 667x375 and 1280x800), that the file is in the service worker precache (offline test), and that the AR3 [C] check goes through the art-reviewer on the title's extreme frames (steam peak, lamp off). Current `public/art` is 1.6 MB, so 6 MB total is not at risk.

## Lane split by coupling
The two lanes share three things: the `tutorial` button and `startTutorial()` (Title.tsx, controller), the first-launch branch (controller, owned by the tutorial lane), and `e2e/helpers.ts`. The brief says "no shared files", which is true for files but not for interfaces. Contract in B10d.0: freeze `startTutorial(): void`, `tutorialDone()`, the test ids (M1), and the marked first-launch block; the title lane edits only `Title.tsx`, `title.css`, `art/title` and the manifest; the tutorial lane edits the controller's tutorial functions and `Coach.tsx`. With that the split is sound and the two can run in parallel with B10c.

## Does the training rig belong in `content/enemies.ts` while B10c tunes numbers there?
Yes, as a separate entry with `summonOnly: true` and a `tutorial-` id (M3). B10c's levers are act 2 and 3 regular and elite rows and warden numbers; the new entry is in act 1's header region. Merge risk is a text conflict near the `tutorial-automaton` entry only; the brief's own order (merge before or after B10c, whichever is ready) is fine. B10c's per-act helpers in `balance.ts` and `difficulty.ts` already skip `summonOnly`.

## Should-fix
- `e2e/tutorial.spec.ts` (87 lines) is rewritten: list what it must still cover (skip at any step, replay from the title, the tutorial not starting when the key is set, a saved practice fight surviving it).
- `Coach.tsx` and the 8-step scripted bin in `controller.ts` (`TUTORIAL_BIN`, `TUTORIAL_LAST`) are written for v1; the v2 steps (place, Run, tap a part to set order, break a part to cancel its intent, salvage) need a script of forced hands and a deterministic seed in the contract's tests, so the tutorial lane does not invent its own.
- Sprocket's closing line should come from `story.ts` (owned, short, warm) and the walk into Bellfoot must not break the "Sprocket's mood" reactions.
- The hint "Keys in a fight: 1-4 pick a part..." on the title is a keyboard mention; keep it or move it into How to play.
- Decide the `Practice fight` and `Sandbox` placement in the smaller row so the tower stays uncovered at 667x375 (a screenshot test of the tower region would make AR3 mechanical).

## What was tested
Documents and code read only: no `npm test`, no browser, no art review.

## Resubmit when
M1 to M7 are applied; I expect plan 8, spec fit 8, risk 7, testability 8.
