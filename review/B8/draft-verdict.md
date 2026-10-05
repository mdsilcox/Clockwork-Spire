# Draft verdict: B8 The climb and A2 Art (acts 2 and 3)

Reviewer: critic, in place of the owner's draft approval (D-035). Read: draft.md, roadmap-v2.md, rules 4 and 6, acceptance 12, 13, 16, data-model v2, spike-art.md, D-032 to D-036, the B7 brief, A1 wave-1 review, A1 brief. Spot-checked the tree (grep of `cogs|floor|nodeId`, `git status`, `run.ts` exports). The game was not run.

## Verdict
- **B8: PASS WITH CHANGES.** The shape is right (contract first, bots after core, tune after bots, browser check, gate). Seven changes below must be made before launch; items 1 to 4 are the ones that would cause real damage if skipped.
- **A2: PASS WITH CHANGES.** Sound as a phase, but it is not part of B8, it has a dangling dependency, and it should not start before A1 has passed.

---

## B8

### Answers to the specific questions

**Is one lane for the whole climb core right?** No. Split it behind the contract into two lanes. The draft's reason ("every piece shares RunState and run.ts") is a reason for a contract that fixes RunState and the API signatures, not for one lane. The pieces couple unevenly:
- `climb-core`: section generation (pure, seeded, CL1), move, clock, elites and patrols, midnight and Overwound, bell and Prepared, doors and keys, warden trigger, CL2 to CL6, CL9, CL11 (core part). Interface out: `ActSection`, `move(run, roomId)`, `ringBell(run)`.
- `economy-rooms`: workbench (upgrade, remove, fuse; SV3, SV5), trader (barter; SV4), oil (CL10), vault contents, Scrap replacing Cogs in rewards, shop and the 22 events' effects (`eventfx.ts` is 396 lines of Cogs and floor logic). Interface in: `RunState.scrap`, `Pending` shapes (already in data-model v2). Interface out: the stub functions the draft already lists (`fuse`, `barter`, `rest`, `polish`, `upgrade`, `remove`).
They touch different files if the contract does one thing: make `run.ts` a facade whose exports the orchestrator pre-registers (re-exporting from new `src/core/climb.ts`, `section.ts`, `economy.ts`, `rooms.ts`), so no two lanes edit `run.ts` at once. Same rule as B7's "keep shared entry points out of lanes". That also shortens the critical path: the 20-room generator and the fuse/barter rules are the two slowest things.
Draft assigns nobody: the events port to Scrap and hours (event choices cost or give hours, rules 4.2), `rewards.ts` and `shop.ts`, salvage keys (`spire-key` parts in `content/enemies.ts`), `meta.ts` (`finishRun`, `runRecord`, `bestFloor`, `floorBrass`), the save migration. Assign them: events, rewards, shop to economy-rooms; keys, meta, save v2 and the migration to climb-core (the migration needs only the minimal `Profile` v2 fields; the rest is B10's).

**Can the rig-hub lane start before A1's rigs pass review?** Half of it can. A1 is not done: wave 1 is REVISE (hurt flash over cap, broken looks too small); the tinker, Foreman and Sprocket fixes are not in the tree yet. Porting a rig template to a typed `CharacterDef` is mechanical but it is redone by hand if the template changes. Split B8.3:
- **rig-hub** (starts at launch): `RigHub`, context-loss recovery, `npm run art`, `manifest.ts`, the rescoped AR1, the AR4 perf harness, `loadAct/preload`, fallback to code-drawn enemies. Build it against the already signed-off rigs (`art/cog-rat`, `art/sprocket`, `art/boilermaker`), not A1's.
- **rig-convert** (per asset, as each A1 asset passes its art-reviewer round): `CharacterDef` modules. Pipeline them; do not hold the phase for the last one.
Also: the **Foreman cannot be driven in B8**. The wardens are legacy until B9 (B7 brief: "the three wardens until B9"), so there are no foreman part ids, no phase events and no keystones for the replay to drive "phase" or the part anchors. Convert his module if it is ready, but drop "Foreman with both phase layers", his phase mood and AR2's warden clause from B8's done-when; the phase mood and anchors are B9's. Likewise, the Spring Imp, Tinpot General and the rest are only worth converting if they are in the act 1 pools B7 shipped (they are), but check each has a frame in `content/enemies.ts` before listing it.

**Does B8 need the A2 work at all?** No. B8 uses act 1 only; acts 2 and 3 fall back to code-drawn enemies by design (D-033). A2 is a separate phase and should have its own board entry, gate and verdict, not share B8's draft or gate. (Keep them in the same file if convenient, but they must not gate each other.)

**Collisions with the just-merged B7 code?**
1. **B7 is not closed.** There is no `review/B7/`; `git status` shows uncommitted edits to `src/sim/{bot,fight,run,runbot}.ts`, `src/sim/strat/{fight,runbot,v2}.ts`, `tests/sim/targets.test.ts` and an untracked `v2cli.ts`/`v2combat.ts`. B8.0 must not start (and B8.4 must not be planned against `src/sim`) until the B7 gate is passed and those are committed. Add "deps: B7 gate closed, tree clean" to B8.0.
2. **A contract that removes `floor`, `cogs`, `nodeId`, `map` from `RunState` breaks type-checking in about 55 files at once** (grep: controller, Map/Nodes/End/Workshop UI, stage and layout, music and synth, all of `src/sim/**`, `meta.ts`, `eventfx.ts`, and the v1 tests `b3`, `b4`, `run.test`, `meta.test`, `e2e/run.spec.ts`). Every lane runs `tsc --noEmit`, so every lane would start red for reasons that are not theirs. Decide in the contract: either (a) additive: new fields and functions land beside the old ones, the v1 flow stays working, and the orchestrator deletes the v1 flow in one commit after the lanes merge; or (b) the contract commit itself ports every consumer to compile against stubs. (a) is cheaper and is what I recommend; say so in the brief and list the superseded v1 tests (R1, R9, B3/B4 run tests, run e2e) as expected-red or rewritten at the merge, not "rewritten by climb-core" (which would race with climb-ui and bots over the same files).
3. `stage.ts` (1302 lines) and `render/anchors.ts`: B8.3 changes how part markers are placed. B7's `e2e/v2-machines.spec.ts` asserts marker positions and intents; those must stay green with the code-drawn fallback and with a rig. Name that spec as a regression gate for rig-hub, and give rig-hub sole ownership of `stage.ts`, `anchors.ts` and `render/enemies.ts` (climb-ui must not touch them).
4. `controller.ts` (1348 lines, `window.__game` hooks and `cheat.*`), `e2e/helpers.ts` and `src/ui/styles.css` are not owned by any lane in the draft. climb-ui owns them (it needs new actions: move, ring bell, barter, fuse); the others get the actions through the contract's stubs. Also assign `Title/Slots/End/Workshop` text that shows "floor", `audio/music.ts` (`trackFor` reads floor), `Coach`/`HowTo`/`Glossary` text that mentions the node map. Missing today; they will surface as late failures.

### Other findings

5. **Rule gaps the contract must decide, in a "Semantics every lane relies on" section like B7's.** Not specified in rules 4.2 or 4.3 and the lanes will guess differently: does an oil rest (1 hour) and a lock-pick (1 hour) make the elites step? (CL2 says only "move".) What happens when midnight arrives mid-fight or on the same hour an elite meets you? Two elites in one room? Elite already defeated: does its patrol continue (it should not)? Does fleeing exist? What does "room resolved" mean for a door or a trader at hour 11? Revealing rooms when you walk through a cleared one. The `map` RNG stream and the `shop` stream usage per room (CL11 needs identical layout and trader stock after reload). Bell Prepared: how "+1 placement on the first warden turn" is applied to `createCombat` (an engine hook, so name its owner: climb-core, touching `combat.ts` only for that hook). Warden Overwound: same.
6. **Acceptance mapping is slightly off.** SV1 and SV2 are B7's (salvage tray) and already shipped; B8 owns SV3 to SV6. AD4 is "hours, enemy HP and damage, Brass, oil heal per mode"; modes are B10's, so B8 owns only the hours-per-mode constants in `ModeDef` and the Journeyman case; say so, or the contract test cannot be written without the mode table. CL8's Lamplighter clause needs a resident (B10): test the visibility rule only, mark the resident clause deferred. The AR1/AR2/AR4 moves from B11 to B8 change the roadmap table (B11 still lists AR1, AR4); update `docs/roadmap-v2.md` and log it in DECISIONS.md in the same commit as the launch, as the project rule requires. AR3 and AR6 stay with B11.
7. **BV11 has no fallback.** "Green or numbers for B8.5" is fine, but B8.5 needs a rule for what it may change when the expert does not beat both rusher and grinder (hours, Scrap prices, room counts only, per the draft; not the route bots) and a time-box (two retune rounds, then the gate records a `warn` with the numbers, as B7 did for BV3/BV4). Without it the gate is open-ended. Note BV1/BV2 curve targets stay B10's.
8. **Lane tools in B8.2.** The act screen needs a walking tinker and Sprocket, but the painted tinker (A1's hardest rig) is not ready and rigs are in the hub. State that climb-ui uses the existing code-drawn Sprocket (`render/sprocket.ts`) and a code-drawn tinker; the painted tinker swaps in at B11. Give climb-ui a `sectionWith`/fixture builder in the contract (hand-built 18-room section, with a patrol and a locked door) so it does not wait for the generator.
9. **Scope and the gate.** Climb + economy + new screens + rig hub + conversion + bots is a big phase for one owner try. Keep it as one phase only if the hub/convert lane is explicitly non-blocking for the climb's gate (the owner can play a full act with code-drawn enemies even if conversion lags), and the gate lists what is acceptable as "not yet painted". Otherwise split rig-hub into its own phase ahead of A2. I would keep it in B8 with that rule.
10. **Browser check and gate are fine** but add the CL11 reload check and a 667x375 pass of the act screen with two elites and a locked door, since the risk named in B8.2 (20 rooms and patrol paths without sideways scroll) is the likeliest defect.

### What is good
Contract-first with real failing tests, bots after core, tune by the orchestrator, the one-return-round rule, keeping the code-drawn enemies as a fallback, the perf budget named with the spike's numbers, and AR4 as a test rather than a promise.

### Required changes before launch (B8)
1. Add "B7 gate closed and tree clean" as B8.0's dep.
2. Contract decides additive vs port for the v1 flow, and lists superseded tests.
3. Split climb-core into climb-core and economy-rooms; contract makes `run.ts` a facade with pre-registered exports; assign events, rewards, shop, meta, save, keys.
4. Split rig-hub from rig-convert; rig-hub starts on signed-off rigs; convert per A1-passed asset; drop the Foreman's phase work (B9).
5. Add the semantics section (item 5), including who hooks Overwound and Prepared into `createCombat`.
6. Assign `controller.ts`, `e2e/helpers.ts`, `styles.css`, audio, Title/End/Workshop/Coach text; give `stage.ts`/`anchors.ts`/`enemies.ts` to rig-hub alone; name `e2e/v2-machines.spec.ts` as a regression gate.
7. Fix the acceptance mapping (SV3 to SV6, AD4 hours only, CL8 resident deferred), update roadmap-v2.md and DECISIONS.md, give B8.5 a rule and a time-box.

---

## A2

The content is right (the cast in content.md 3.3 to 3.6, one lane per family, reviewer per wave, the Clockmaker called out as hardest). Changes:
1. **Dangling dependency**: A2.1 to A2.4 depend on "A2-contract", which does not exist. A2.0 already prepares sources and cut-outs; either rename it to include the contract or add one. The contract for art is the rig format: A1's `rig.json`, anchors per content.md part id, and the broken-look pattern, plus the `CharacterDef` fields rig-convert will use, so A2 assets drop into B11 without rework. Use the A1 brief's "The game's needs" section as the base.
2. **Start only after A1 passes its gate**, not in parallel. A1 wave 1 is REVISE and the same defects (hurt flash over 0.25, thin broken looks, shallow wind-ups) would be repeated in 14 more assets. Put A1's reviewer notes into the A2 brief as rules.
3. **Resource contention**: A2.0 runs ComfyUI (GPU), and A1 still needs repaints (tinker, Foreman, Sprocket happy, title). A2.0 must not start generating until A1's repaints finish; A1 used six lanes recording on one CPU, so cap A2 recording at three lanes at a time or sequence them.
4. **Scope**: 15 regulars and elites plus the Clockmaker's three phase paintings. The Clockmaker (Rewind drawing parts toward him, memory parts, ending pose) cannot be validated in B8's engine because wardens are legacy until B9. Do it last in A2, with its definition of done limited to the rig and clips; integration waits for B9/B11. Also "masked repaints of one painting so layers crossfade" needs the orchestrator's GPU time per phase; state who does the repaints (orchestrator only, as in A1).
5. **Acceptance**: AR2 is "per manifest asset", so A2 supplies the rigs and B11 the manifest entries; list that A2 owns AR5 only (clip + reviewer verdict) and that AR2 lands in B11, to avoid a criterion with no owner.
6. **Gate**: "art-reviewer PASS in place of the owner" is consistent with D-035 for production in an approved style; the Clockmaker and the Orrery (new subjects, style drift risk named in A2.0) should additionally have the orchestrator's extreme-frame look recorded in the review file.

## Not tested
Nothing was run. I did not verify the current state of A1's tinker/Foreman/Sprocket rigs beyond the wave-1 review and the git status; the tree shows no `review/B7/`, so I assumed B7's gate is still open.
