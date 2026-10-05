# B8 The climb (and painted act 1 enemies): shared brief

Replace v1's branching node map with v2's roaming act against the Spire clock, move the run's economy to Scrap and rooms, and bring A1's painted cast into combat. Rules: `docs/rules.md` 4.1 to 4.7 and 6, data `docs/content.md` sections 4 and 10, shapes `docs/data-model.md` "Version 2", art loading `docs/spike-art.md` and D-033. The draft review (D-037, `review/B8/draft-verdict.md`) shaped this plan. The contract is the B8.0 commit (types, stubs that throw, real failing tests); this brief names it.

## Semantics (decided; don't re-decide)
- **The contract is additive.** New RunState fields sit beside v1's (`map`, `nodeId`, `floor`, `cogs`), which stay valid until the orchestrator removes them at the gate merge. New runs use the section; nothing in a lane may start red because of a removed field.
- **Hours**: moving to a connected room is 1 hour; resting at an oil station is 1 more; picking a lock is 1 more. Each hour spent, every undefeated elite steps one room along its patrol (so resting and lock-picking move elites too).
- **Order after a move**: the player enters the room; the room is revealed with its neighbors; if an elite is in that room, that fight starts; otherwise elites step; if one steps into the player's room, that fight starts; otherwise the room resolves (an uncleared fight starts its combat; an event opens; a workbench, trader, oil station or door opens its screen; a cleared room does nothing).
- **Midnight**: checked after the room (and any fight, salvage tray or screen it opened) is resolved. If `hour >= hours`, the warden fight starts where the player stands with `overwound: true`. A fight in progress is never interrupted.
- **The bell**: only at the warden's door: pays per hour left (rules 4.2: 6 Scrap and 2 Brass each) and `prepared = min(2, floor(hoursLeft / 3))`, then the warden fight starts.
- **Combat options** (`createCombat`): `overwound` (the warden starts with Strength 3 and Shell 10) and `prepared` (extra placements on turn 1).
- **Scrap** replaces Cogs everywhere in v2 code; Brass is unchanged. Prices: rules 4.4 and 4.5, content.md section 10.
- **Wardens stay legacy** (B9 makes them frames); the act's warden fight uses the existing warden defs.
- **Save version 2**: a v1 save migrates as rules 6 says (profile kept, Cogs dropped, a run in progress closed as a loss at its floor and credited its Brass, with the notice).

## Lanes (worktrees from the B8.0 commit; merged in the order core, economy, UI, rigs; bots after core)
| Lane | Owns | Turns green |
|---|---|---|
| **climb-core** | `src/core/section.ts` (new: generation, moves, clock, elites, bell, doors and keys), the move and midnight flow in `run.ts`'s v2 path, `src/core/save*`/migration, `src/app/save.ts` version handling, tests in `tests/core/` for those | CL1 to CL6, CL9, CL11 (U), AD4 hours, migration tests |
| **economy-rooms** | `src/core/rooms.ts` (new: workbench upgrade, remove and fuse; trader stock and barter; oil; vault), Scrap in `rewards.ts`, `shop.ts`, `eventfx.ts`, `meta.ts` (Brass from rooms and bells), `content/events.ts` text (Cogs to Scrap, floors to rooms) | SV3 to SV6, CL10 |
| **climb-ui** | `src/ui/**` (the act screen replacing the map; room screens; Title, End, Workshop, Coach and HowTo text about floors and the map), `src/app/controller.ts`, `src/app/intents.ts`, `src/ui/styles.css`, `src/audio/music.ts` `trackFor`, `e2e/**` except `v2-machines.spec.ts` | CL7, CL8 (E, without the Lamplighter), SV3 to SV5 (E) |
| **rig-hub** | `src/render/rig.ts` (new: RigHub), `src/render/stage.ts`, `src/render/anchors.ts`, `src/render/enemies.ts`, `scripts/art.mjs`, `src/art/**` (generated manifest and CharacterDefs), `public/art/**`, `tests/core/b1.acceptance.test.ts` A1 rescope, `e2e/v2-machines.spec.ts` stays a regression gate | AR1, AR2 (act 1), AR4 |
| **strategy-bots** (after core merges) | `src/sim/**`, `tests/sim/**`, `balance/` | BV11 |
- rig-hub starts with the signed-off rigs (Sprocket, the Boilermaker Queen as a test asset, the Cog Rat) and converts each A1 asset as it passes review (`rig-convert` is the same lane's second half); the Foreman's phase layer waits for B9.
- climb-ui builds against a fixture section (`src/core/testkit.ts` `sectionFixture()`, in the contract) so it doesn't wait for generation, and uses the code-drawn tinker and Sprocket until the rigs land.
- B8.5 tune may change only hours per act, Scrap prices and room counts, in one time-boxed round, logged in DECISIONS.md.

## Rules for every lane
As B7's brief: never stash, checkout, reset or restore outside your worktree; commit only in your worktree; ports: core 5351, economy 5352, UI 5353, rigs 5354, bots 5355; deterministic core; American English, no em dashes; `data-testid`, 40 px taps, 12 px text, no sideways scroll at 667x375. Report what's green, what isn't, contract changes and what other lanes must know.

## Contract tests and hooks (B8.0, written by the test porter; the tests are the spec)
- `tests/v2/b8-climb.test.ts` (CL1 to CL6, CL8 U, CL9, CL10, CL11 U, SV3 to SV6, AD4 hours, migration, createCombat options): climb-core and economy-rooms.
- `tests/v2/b8-art.test.ts` (AR1, AR2 act 1): rig-hub. `src/art/manifest.ts` exports `MANIFEST` (keep the name when generating it).
- `tests/sim/v2-runs.test.ts` (BV11): `routeStatsV2` in `src/sim/strat/v2routes.ts` (stub): strategy-bots after core merges.
- `e2e/v2-climb.spec.ts` (CL7, CL8 E, CL11 E, SV3 to SV5 E, AR4): climb-ui and rig-hub. Its header comment is the authoritative list of test ids and `window.__game` hooks (act screen, room screens, `cheat.startClimb`, `cheat.fixtureSection`, `move`, `cheat.gotoRoom`, `cheat.setScrap`, `cheat.setHour`, `cheat.setKeys`, `cheat.giveParts`, `cheat.openTrader`, `rig.stats/reset/loseContext/restoreContext`).
- Decided while porting: the Spare Scrap upgrade is found by name ("Spare Scrap"; economy-rooms picks the id and migrates `cogs` levels to it); offers are recorded with sources 'trader' (when stock rolls), 'fuse', 'salvage' (widen the union in types.ts; economy-rooms owns it); `afterRoom` is called with the phase already back at 'section' and `combat` null (the run's settle and leave paths do that); the shortest-path rule counts unlocked passages only; once rig-hub puts WebP in `public/art/`, v1's A1 test fails until rig-hub rescopes it (its job). AR4 runs on the phone project only.
