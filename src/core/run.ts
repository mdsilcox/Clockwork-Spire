// The run: map, nodes, rewards, shop, forge, oil, events and act progression (docs/rules.md section 4).
// B3 CONTRACT: the signatures below are fixed; the `run-core` lane implements them. Pure: no DOM, no clock.
// Every function mutates the RunState in place and returns nothing unless stated. Illegal actions return false
// (or throw nothing) and leave the state unchanged.
import type { RunConfig, RunRecord, RunState, ShopItem } from './types';

/** Default RunConfig for a fresh profile (B4 replaces fields from upgrades). */
export function defaultRunConfig(seed: number, chassis = 'tinker'): RunConfig {
  return {
    seed,
    chassis,
    maxHp: 50,
    cogs: 0,
    handSize: 3,
    upgradedStarters: 0,
    trinkets: [],
    unlockedParts: [],
    rewardChoices: 3,
    extraEliteBlueprint: false,
    secondWind: false,
  };
}

/** Start a run: bin from the chassis, act 1 map, phase 'map', floor 0. */
export function newRun(_cfg: RunConfig): RunState {
  throw new Error('B3: not implemented');
}

/** Node ids the player may enter now (floor 1 nodes at the start; else the current node's `next`). */
export function availableNodes(_run: RunState): string[] {
  throw new Error('B3: not implemented');
}

/** Enter a node: fight/elite/boss create `run.combat` (phase 'combat'); others set `run.pending` and their phase. */
export function enterNode(_run: RunState, _nodeId: string): boolean {
  throw new Error('B3: not implemented');
}

/**
 * Call after every runTurn on `run.combat`. If the combat ended: on a win, move to 'reward' (Cogs, part choices,
 * trinket for elites and bosses, blueprint drops), copy HP back, update stats; on a loss, phase 'defeat'.
 * Second Wind applies here. Returns true if the combat ended.
 */
export function settleCombat(_run: RunState): boolean {
  throw new Error('B3: not implemented');
}

/** Reward screen: take a part (index into pending.parts) or null to skip; take a trinket index (elite/boss). */
export function takeRewardPart(_run: RunState, _index: number | null): boolean {
  throw new Error('B3: not implemented');
}
export function takeRewardTrinket(_run: RunState, _index: number | null): boolean {
  throw new Error('B3: not implemented');
}

/** Events: choose a choice index. If the choice needs a part (remove, upgrade...), pending.needsPart is set and
 * `eventPickPart(run, uid)` completes it. Returns the outcome text. */
export function chooseEvent(_run: RunState, _choice: number): string | null {
  throw new Error('B3: not implemented');
}
export function eventPickPart(_run: RunState, _uid: number): boolean {
  throw new Error('B3: not implemented');
}

/** Shop stock for the current run (5 parts, 2 trinkets, removal, oil); used by enterNode. */
export function makeShop(_run: RunState): ShopItem[] {
  throw new Error('B3: not implemented');
}

/** Shop. */
export function shopBuy(_run: RunState, _itemIndex: number): boolean {
  throw new Error('B3: not implemented');
}
/** Removal service: remove the part `uid` (pays the removal price). */
export function shopRemove(_run: RunState, _uid: number): boolean {
  throw new Error('B3: not implemented');
}

/** Forge: upgrade or remove exactly one part. */
export function forgeUpgrade(_run: RunState, _uid: number): boolean {
  throw new Error('B3: not implemented');
}
export function forgeRemove(_run: RunState, _uid: number): boolean {
  throw new Error('B3: not implemented');
}

/** Oil station: repair 30% of max HP (rounded down) or polish +4 max HP (Collar Tag: +5 heal). */
export function oilRepair(_run: RunState): boolean {
  throw new Error('B3: not implemented');
}
export function oilPolish(_run: RunState): boolean {
  throw new Error('B3: not implemented');
}

/** Leave the current non-combat node (or the reward screen) back to the map; after the boss: next act or 'victory'. */
export function leaveNode(_run: RunState): boolean {
  throw new Error('B3: not implemented');
}

/** Abandon the run (phase 'defeat', result 'abandoned' in the record). */
export function abandonRun(_run: RunState): void {
  throw new Error('B3: not implemented');
}

/** Brass earned by this run so far per rules 5.2 (B4 pays it out; B3 shows it). */
export function brassFor(_run: RunState): number {
  throw new Error('B3: not implemented');
}

/** The history record for a finished run. `endedAt` and `n` are filled by the app. */
export function runRecord(_run: RunState): Omit<RunRecord, 'n' | 'endedAt'> {
  throw new Error('B3: not implemented');
}

/** Floor counted across acts (act 2 floor 3 = 16), for best-floor tracking. */
export function absoluteFloor(run: RunState): number {
  return (run.act - 1) * 13 + run.floor;
}
