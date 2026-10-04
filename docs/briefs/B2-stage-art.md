# Brief: B2 lane `stage-art`

Read `CLAUDE.md`, then `docs/content.md` (part families and ids, enemy ids), and `src/render/stage.ts`, `src/render/draw.ts`, `src/render/replay.ts`, `src/audio/synth.ts` (your starting point). Look at `spike/src/render.ts` for ideas.

## Goal
Every part and enemy is drawn in code with a distinct, readable silhouette in one cohesive brass, copper, steam and lamplight style; every effect in the event timeline has a satisfying visual and a synthesized sound; the stage holds 60 fps with a full board.

## You own
`src/render/**`, `src/audio/**`, `e2e/perf.spec.ts` (new). Nothing else.

## Build
1. **Parts (46):** a drawing for each part id in docs/content.md, built from family templates so the family reads at a glance (gears: toothed wheels, different tooth counts, spokes, a bevel cone, a crown, a ratchet pawl, a heavy flywheel rim, planetary sun-and-planets, the Sprocket Wheel with a tiny paw-print hub; springs: coils, leaves, torsion bars, volute cones, a jaw trap, a hairspring spiral; cams and levers: lobes, triple lobes, a lever arm, a trip hammer head, a tappet, a follower roller, a toggle switch; tempo: escapements with anchors, pendulum bob, metronome wedge, balance wheel, verge, grandfather weight, chronometer dial; steam: boiler, piston, whistle, safety valve, firebox glow, tea kettle, condenser coils, steam hammer, flyball governor; chimes: chime tubes, bell hammer, oil can, tuning fork, alarm clock, gong, inventor's lamp). Each animates when powered (turns, compresses, swings, strikes, rings, vents). An upgraded part (`plus`) gets a polished rim glint and a small "+" stamp drawn in code. Unknown ids fall back to a family template. Charge pips, counters (cam) and Pressure gauge readable on the canvas as shapes or large numerals only.
2. **Enemies (24 + summons + tutorial automaton):** distinct clockwork creatures per id (mites, rats, beetles, oil slick blob, imp on a spring, gearhound, tinpot general with a pot helmet, steam wraith, valve crab, furnace golem, pipe snake, gauge gremlin, pressure warden, twin pistons, the Foreman, the Boilermaker Queen, bell ringer, chime moths, hour hand knight, echo sprite, pendulum blade, minute warden, grand orrery with moons, and the Clockmaker: a tall robed automaton with a clock-face head, with a different look per phase). Idle bob, hit flash and shake, attack lunge, death collapse into scattered cogs. Up to 4 enemies laid out without overlap at 667x375.
3. **Effects for every `GameEvent` kind** in `src/core/types.ts`, including the B2 additions: echo (a ghost repeat), heal (green motes), status applied and status tick (scald steam, cracked fracture lines, dazed swirl, corroded green drip on the player plate gauge), shell (brass plating on the enemy), buff, summon (drop-in), phase (screen flash, chime), sabotage rust (orange patina spreading over the cell), jam (a wedge in the Mainspring), magnetize (a magnet tugging the part, which hovers until the next turn), drain (steam sucked out of the gauge), overpressure (gauge burst, screen shake), release (spring snap, burst of sparks), big-chain moments (when Momentum passes 10 and 20, a stronger glow and a rising chime). Respect a `reducedEffects` flag on the stage (fewer particles, no shake).
4. **Sound** (Web Audio only, in `src/audio/`): distinct synthesized sounds per family when parts fire (gear ticks, spring boing, cam clack, tempo tock, steam hiss, chime ring), strike impacts scaled by damage, Plating clink, release snap, enemy attack whoosh and hit thud, status sounds, sabotage creak, phase gong. Expose `audio.setVolume(channel, v)` and `audio.muted` hooks even if the settings screen comes in B5. Keep it pleasant: short envelopes, no harsh square waves at volume, a limiter on the master bus.
5. **Performance:** particle cap; no per-frame allocations in hot loops; `e2e/perf.spec.ts` (Q7): fill the board via `window.__game` (use `__game.debugBoard` if present, otherwise place parts), run turns back to back at 1x for 5 s at 1280x800, sample rAF deltas; assert average at least 55 fps and no frame over 50 ms. Mark it `test.slow()`; it runs in the desktop project only.

## Assumptions and decisions
- The renderer never re-runs rules; it only reads state and replays events. Unknown event kinds are ignored safely.
- Text inside the canvas: numbers and short labels only, large enough at 667x375 (at least 12 CSS px). Names and tooltips are DOM (UI lane).
- Palette: keep `src/render/palette.ts` as the single source; add family accent colors there (gear brass, spring copper, cam bronze, tempo silver, steam iron and ember, chime gold and verdigris) and expose them for the UI lane to read.
- Other lanes in parallel: `machine-content` (src/core: adds the parts, enemies and events you draw; use ids from docs/content.md), `combat-ui` (src/ui, src/app), `fight-sim`. Don't touch their files.
- Own git worktree (path in your launch message). Don't commit. Never stash, checkout, reset or restore. Run any dev server on port 5341 and stop it by PID; run e2e with `PW_PORT=5342 npx playwright test`.
- No image, font or audio files (test A1). American English; no em dashes.

## Done when
`npm run build` type-checks, unit tests stay green, `e2e/perf.spec.ts` passes in your worktree, and you looked at screenshots of a full board and of several enemies at 1280x800 and 667x375 (Playwright, deviceScaleFactor 2). You may preview parts not yet in the core registry with a temporary debug page or a test that renders every id offscreen; leave no debug UI in the game. Report what you drew and any id you couldn't map.

## From the B1 critic (must-fix in this lane)
- Stronger payoff beats: screen shake (skipped when reducedEffects) and a distinct rising chime for long chains (Momentum 10 and 20), a bigger burst on kills and releases. Check the audio in a real (non-webdriver) page: add `?sound=1` to force audio on under automation so you can at least confirm the graph builds without errors.
