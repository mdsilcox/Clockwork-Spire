# Draft plans: B8 The climb (with painted act 1 enemies) and A2 Art: acts 2 and 3 cast

Drafted autonomously (D-035). Roadmap: docs/roadmap-v2.md (owner chose: art after each wave, so the rig hub lands in B8).

## B8
### B8.0 Contract: the climb, Scrap, save v2, the rig hub (orchestrator, opus; deps none)
- Does: Types for sections, rooms, passages, the clock, roaming elites, Scrap, keys and the v2 RunState (data-model.md v2); run API stubs (move, ringBell, rest, polish, fuse, upgrade, remove, barter, pickLock, openDoor); save v2 and the migration signature; the art loading contract from D-033 (CharacterDef, RigHub, the manifest and `npm run art`). Real failing tests for acceptance 12, 13 (SV3 to SV6), AD4 (hours), BV11, AR1, AR2 (act 1), AR4, CL11.
- Done when: Interfaces committed; B8's criteria red; brief written.
- Risks: The run flow changes shape: v1 floor-based tests are superseded (R1, R9) and rewritten.

### B8.1 The climb in the core (climb-core, sonnet; deps B8-contract)
- Does: Section generation (16 to 20 rooms, 5 to 6 floors, two loops, shortest path at most 5), the Spire clock and midnight (Overwound), the bell (Scrap, Brass, Prepared), roaming elites on patrols, room kinds (fight, workbench with fuse, oil, trader barter, event, vault, doors and Spire Keys), Scrap replacing Cogs, the warden at the door, save version 2 with the v1 migration.
- Done when: Sections 12 and 13 green; v1 run tests rewritten.
- Risks: The biggest rewrite of the run; one lane because every piece shares RunState and run.ts.

### B8.2 The act screen and room screens (climb-ui, sonnet; deps B8-contract)
- Does: Replace the node map with a code-drawn cut-away section (painted backdrops arrive with A3): rooms, passages, the clock and hours left, each elite's patrol and next room, silhouettes; tap a connected room to walk there (the tinker and Sprocket animate, skippable). Screens for the workbench (fuse with two candidates), trader (barter), locked door, oil, the bell. Phone and desktop.
- Done when: CL7, CL8 (E), SV3 to SV5 (E) green.
- Risks: Fitting 20 rooms and patrol paths at 667x375 without sideways scroll.

### B8.3 Painted act 1 enemies in combat (rig-hub, sonnet; deps B8-contract)
- Does: The RigHub (one shared WebGL context composited into the stage, half-density meshes, context-loss recovery), `npm run art` (WebP textures to public/art and the generated manifest), CharacterDef modules converted from A1's rig templates (the Cog Rat, Rust Mite, Brass Beetle, Oil Slick, Spring Imp, Gearhound, Tinpot General, the Foreman with both phase layers, the tinker, Sprocket), part markers moved to the rig anchors, moods driven by the replay (attack, hurt, death, phase), broken looks from part state; the code-drawn enemies stay as the fallback; test A1 rescoped to AR1.
- Done when: AR1, AR2 (act 1), AR4 green; e2e at both sizes.
- Risks: Phone performance with three rigs; the spike says 14 ms at 4x throttle with half meshes.

### B8.4 Route bots and the run sim on sections (strategy-bots, sonnet; deps B8-core)
- Does: The run sim on the new climb: the expert route policy (plans hours, salvage and the bell), rusher and grinder; balance report; BV11.
- Done when: BV11 green or numbers for B8.5.

### B8.5 Clock and economy tune (orchestrator, opus; deps B8-bots)
- Does: Tune hours, Scrap prices and room counts so the clock is a real choice (BV11) and log it.
- Done when: BV11 green; DECISIONS entry.

### B8.6 Browser check (browser-checker, sonnet; deps B8-ui, B8-rigs, B8-tune)
- Does: Phone and desktop pass: a full act walked, every room kind, painted enemies in combat, part markers on anchors.
- Done when: Defects with evidence; one return round.

### B8.G Gate (critic in autonomous mode) (orchestrator, opus; deps B8-check)
- Does: Full suite green, a fresh critic plays an act, metrics, commit and push.
- Done when: Phase closed.

## A2
### A2.0 Asset list and candidates (orchestrator, opus; deps none)
- Does: The act 2 and 3 cast from content.md 3.3 to 3.6: 10 regulars, 4 elites (Pressure Warden, Twin Pistons as two, Minute Warden, Grand Orrery with moon parts), the Clockmaker (three phase paintings: Tick, Tock, Midnight, as masked repaints of one painting so layers crossfade), summons (Steam Wraith); 8 seeds each in style v3; picks and cut-outs.
- Done when: Sources and cut-outs; brief A2.
- Risks: Style drift on unusual subjects (moths, orreries); regenerate rather than settle.

### A2.1 Act 2 regulars (act2-cast, sonnet; deps A2-contract)
- Does: Steam Wraith, Valve Crab, Furnace Golem, Pipe Snake, Gauge Gremlin: idle, attack, hurt, death, anchors per part, bold broken looks.
- Done when: Rigs and clips.

### A2.2 Act 3 regulars (act3-cast, sonnet; deps A2-contract)
- Does: Bell Ringer, Chime Moth, Hour Hand Knight, Echo Sprite, Pendulum Blade.
- Done when: Rigs and clips.

### A2.3 Acts 2 and 3 elites (elites-23, sonnet; deps A2-contract)
- Does: Pressure Warden, Twin Pistons, Minute Warden, Grand Orrery.
- Done when: Rigs and clips.
- Risks: The Orrery's moons orbit: parts that move a lot.

### A2.4 The Clockmaker (clockmaker-art, sonnet; deps A2-contract)
- Does: The final warden: three phase layers, Rewind (the board's parts drawn back toward him), the memory parts' anchors, death and the ending pose.
- Done when: Rig and clip.
- Risks: The hardest asset of v2.

### A2.5 Art review in waves (art-reviewer, sonnet; deps A2-act2, A2-act3, A2-elites, A2-clockmaker)
- Does: art-reviewer per wave, the orchestrator's look at extremes, one return round.
- Done when: review/A2/.

### A2.G Gate: a clip per asset (orchestrator, opus; deps A2-review)
- Does: Clips ready for the owner; art-reviewer PASS in place of the owner in autonomous mode.
- Done when: Phase closed.
