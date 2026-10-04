# Brief: B2 lane `machine-content`

Read `CLAUDE.md`, then `docs/rules.md` sections 1-3 and `docs/content.md` (parts, enemies). Open other files only as needed.

## Goal
Every part (46) and every enemy (15 regular, 6 elite, 3 bosses, plus summons and a tutorial enemy) works in combat by the rules, with statuses and sabotage.

## You own
`src/core/**` except `src/core/content/glossary.ts` (UI lane) and except the meaning of `src/core/types.ts` (contract: you may ADD fields, kinds or types, never rename or remove; list additions). `tests/core/**` except the two acceptance files (`b1.acceptance.test.ts`, `b2.acceptance.test.ts`: adapt only an import path if truly needed; never weaken).

## Build
1. **Parts:** all 46 from `docs/content.md` with base and `+` numbers, rarity, `locked` (17 locked), tooltip `text`/`textPlus` word for word from the catalog (you may drop the flavor quote into a separate `flavor` field). Extend `PartDef`/`TickCtx` in `src/core/defs.ts` as needed: `onTurnStart` (Torsion release), `onEnemyAttack` (Spring Trap), `onNeighborRelease` (Trip Hammer, Recoil, Cam Follower, Tappet-style triggers), `applyStatus(target|'all', id, n)`, `heal(n)`, `echo` for Lever and Echo, `drawNextTurn(n)` (Sprocket Wheel), first-fire-per-turn and first-fire-per-combat flags, diagonal passing (Bevel). "Cam pays off" counts as a release for neighbor triggers. Spare Spring and other trinket hooks are B3: leave a `trinkets` check point but implement no trinkets.
2. **Statuses** per rules 3: Scald (end of enemy turn, then -1), Cracked (+50% Strike/Sweep damage, turns), Dazed (-25% attack, turns), Shell, Strength (enemy attack bonus from buffs), Corroded (-25% Plating, turns), Grit (+X Strike). Emit `status`, `statusTick`, `shell`, `buff` events (see `GameEvent` kinds in types.ts).
3. **Sabotage:** Rust (exists), Jam (next turn 1 fewer tick, min 1; emit `sabotage` note `jam`), Magnetize (target part named at intent time; at the start of the player's next turn it returns to hand with its charge lost, event `unmagnetize`), Drain (Pressure -N). Rust "2 parts" picks two distinct occupied cells (intent carries `target` for the first and a new optional `targets?: number[]` field for all).
4. **Enemies:** all 24 from `docs/content.md` with their HP and behaviors, at combat level: multi-hits, alternating patterns, growing attacks (Spring Imp, Pendulum Blade), charge-up (clock icon `charge` intent then the big hit), summons (Tinpot General summons 2 Rust Mites at start; Foreman summons a Cog Rat at half HP; Queen summons a Steam Wraith at half HP; Orrery's 3 moons; mark summon-only defs `summonOnly: true` and cap enemies at 4), Pressure Warden's Shell from your Pressure, Twin Pistons enrage, Echo Sprite copying your strongest part's damage last turn (`lastTurnContrib`, min 6), Minute Warden heal and rust-strongest, Boilermaker heat. **Bosses with phases:** `phases?: { hp: number; line: string }[]`; the Clockmaker has 3 phases (110/130/150) with rising attacks; reaching 0 in a phase starts the next with full HP of that phase (event `phase`); Rewind is NOT in this phase (B3). Add a `tutorial-automaton` (20 HP; Attack 3, Attack 3, Rusts a part, Attack 4; repeat).
5. **Combat options:** `createCombat` gains `noShuffle?: boolean` (draw pile in bin order, first bin entry drawn first) for the guided first fight, and `pressure?: number` (starting Pressure).
6. **Encounters:** `src/core/content/encounters.ts` exporting the act pools from docs/content.md "Encounter pools" (`ENCOUNTERS: { act, tier: 'easy'|'normal'|'elite'|'boss', enemies: string[] }[]`). Bosses: foreman (act 1), boilermaker (act 2), clockmaker (act 3).
7. **Tests:** make `tests/core/b2.acceptance.test.ts` green and keep B1's green. Add a unit test for every part (its main number, base and `+`) and for each status and sabotage.

## Assumptions and decisions
- Rules and numbers come from the docs; where ambiguous, choose the simplest reading and list it.
- Effects that "release" emit a `release` event; triggers listening to neighbor releases fire immediately after (same tick, same step + 1 for timing), and a trigger can fire at most once per release.
- Echo: the effect resolves twice; the part is still powered once; emit `echo` before the second resolution.
- Heal never exceeds max HP.
- Contributions (`lastTurnContrib`) include Echo and triggered effects.
- Enemy intent labels are short ("Attack 8 x2", "Shell 15", "Rusts 2 parts", "Jams the Mainspring", "Charging up", "Summons a Rust Mite").
- Other lanes run in parallel in their own worktrees: `stage-art` (src/render, src/audio), `combat-ui` (src/ui, src/app, glossary, e2e), `fight-sim` (src/sim, tests/sim). They read your registries `PARTS`, `ENEMIES`, `ENCOUNTERS` and the event kinds; don't rename existing exports.
- You work in your own git worktree (path given in your launch message). Don't commit; the orchestrator merges. Never stash, checkout, reset or restore.
- American English; no em dashes.

## Done when
`npx vitest run` is green in your worktree; `npm run build` type-checks. Report: parts and enemies done, additions to types.ts/defs.ts, decisions, anything simplified.
