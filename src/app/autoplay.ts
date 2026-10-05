// Autoplay (P5): a debug hook that plays the REAL game through the controller's own actions, the way a player would,
// using the simulator's bot decisions. No cheats: it only calls actions a player can take.
import { chassisAvailable, upgradeCost } from '../core/meta';
import { UPGRADES } from '../core/content/upgrades';
import type { CombatState, Profile, RunState, TargetRef, TurnResult } from '../core/types';
import { SENSIBLE_PATH } from '../sim/career';
import { newMemory } from '../sim/runbot';
import { decide } from '../sim/strat/decide';
import type { Action } from '../sim/strat/decide';
import { makeExpert2 } from '../sim/strat/v2combat';
import { benchFuse, benchFusePick, benchRemove, benchUpgrade, currentOrder, leaveRoom, moveRoom, oilPolish, oilRest, pickLock, ringBell, toggleTarget, traderBuy, useKey } from './controller';
import type { BotMemory } from '../sim/runbot';

/** The controller actions autoplay may use (the same ones the screens call). */
export interface AutoCtl {
  profile(): Profile | null;
  newSlot(n: 1 | 2 | 3, name: string): Promise<boolean>;
  buy(id: string): boolean;
  climb(chassis: string, seed?: number): boolean;
  runState(): RunState | null;
  combat(): CombatState | null;
  go(id: string): boolean;
  reward(i: number | null): boolean;
  rewardTrinket(i: number | null): boolean;
  salvage(keep: number[]): boolean;
  choose(i: number): string | null;
  pickPart(uid: number): boolean;
  shopBuy(i: number): boolean;
  remove(uid: number): boolean;
  forge(kind: 'upgrade' | 'remove', uid: number): boolean;
  oil(kind: 'repair' | 'polish'): boolean;
  leave(): boolean;
  place(handIndex: number, cell: number): boolean;
  swap(a: number, b: number): boolean;
  target(i: number): void;
  run(): Promise<TurnResult | null>;
  leaveResult(): void;
  abandon(): void;
  setSpeed(s: 'skip'): void;
}

export interface AutoOpts {
  maxRuns?: number;
  speed?: 'skip';
  /** Base seed for the runs (default 1); the same seed plays the same career. */
  seed?: number;
}

export interface AutoResult {
  runs: number;
  won: boolean;
  firstWinRun: number | null;
}

const STEP_CAP = 4000;
const COMBAT_TURN_CAP = 60;
/** The v2 expert's search, with the narrower beam the route bots use (a career is hundreds of turns). */
const COMBAT_BOT = makeExpert2({ width: 6, swapStates: 2, finalists: 3 });

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/** Which path entries are still ahead of this profile (levels already bought are skipped). */
function pathFor(profile: Profile): string[] {
  const seen: Record<string, number> = {};
  return SENSIBLE_PATH.filter((id) => {
    seen[id] = (seen[id] ?? 0) + 1;
    return seen[id] > (profile.upgrades[id] ?? 0);
  });
}

/** Aim the live combat at `order` with player taps: clear the entries it holds, then tap the wanted ones in order. */
function aim(order: TargetRef[]): void {
  for (const ref of currentOrder()) toggleTarget(ref);
  for (const ref of order) toggleTarget(ref);
}

async function playCombat(ctl: AutoCtl, m: BotMemory): Promise<boolean> {
  for (let t = 0; t < COMBAT_TURN_CAP; t++) {
    const c = ctl.combat();
    if (!c || c.outcome !== 'ongoing') return true;
    const turn = COMBAT_BOT(c);
    for (const p of turn.placements) if (!ctl.place(p.hand, p.cell)) return false;
    if (turn.swap && !ctl.swap(turn.swap[0], turn.swap[1])) return false;
    if (turn.order) aim(turn.order);
    else ctl.target(turn.target);
    const res = await ctl.run();
    if (!res) return false;
    for (const e of res.events) {
      if (e.kind === 'power' && e.uid !== undefined) {
        const id = c.parts[e.uid]?.defId;
        if (id) m.fired[id] = (m.fired[id] ?? 0) + 1;
      }
    }
    const r = ctl.runState();
    if (!r || r.phase !== 'combat') return true;
  }
  return false;
}

/** Carry out one decision with the same actions the screens call. */
function perform(ctl: AutoCtl, a: Action): boolean {
  switch (a.t) {
    case 'move':
      return moveRoom(a.to);
    case 'ring':
      return ringBell();
    case 'key':
      return useKey(a.passage);
    case 'lock':
      return pickLock(a.passage);
    case 'leave':
      return leaveRoom();
    case 'salvage':
      return ctl.salvage(a.keep);
    case 'trinket':
      return ctl.rewardTrinket(a.index);
    case 'rewardPart':
      return ctl.reward(a.index);
    case 'choose':
      return ctl.choose(a.index) !== null;
    case 'pickPart':
      return ctl.pickPart(a.uid);
    case 'upgrade':
      return benchUpgrade(a.uid);
    case 'remove':
      return benchRemove(a.uid);
    case 'fuse':
      return benchFuse(a.a, a.b) && benchFusePick(a.a, a.b, a.pick);
    case 'barter':
      return traderBuy(a.index, a.offer);
    case 'rest':
      return oilRest();
    case 'polish':
      return oilPolish();
    case 'abandon':
      ctl.abandon();
      return true;
  }
}

/** Play one climb to its end with the expert route and the v2 expert combat. Returns false if the bot got stuck (the run is abandoned). */
async function playOneRun(ctl: AutoCtl, m: BotMemory): Promise<boolean> {
  let fails = 0;
  for (let step = 0; step < STEP_CAP; step++) {
    const run = ctl.runState();
    if (!run) return false;
    if (run.phase === 'victory' || run.phase === 'defeat') return true;
    let ok = true;
    if (run.phase === 'combat') ok = await playCombat(ctl, m);
    else ok = perform(ctl, decide(run, 'expert', m));
    fails = ok ? 0 : fails + 1;
    if (fails >= 3) {
      ctl.abandon();
      return false;
    }
    if (step % 8 === 7) await tick(); // let the page breathe: the UI repaints and saves land
  }
  ctl.abandon();
  return false;
}

/** Fresh profile (when none is open), then runs on the sensible path until the Clockmaker falls. */
export async function runAutoplay(ctl: AutoCtl, opts: AutoOpts = {}): Promise<AutoResult> {
  const maxRuns = opts.maxRuns ?? 30;
  const base = opts.seed ?? 1;
  ctl.setSpeed(opts.speed ?? 'skip');
  if (!ctl.profile()) await ctl.newSlot(1, 'Autoplay');
  let profile = ctl.profile();
  if (!profile) return { runs: 0, won: false, firstWinRun: null };
  const path = pathFor(profile);
  let cursor = 0;
  let firstWinRun: number | null = null;
  let runs = 0;
  for (let i = 0; i < maxRuns; i++) {
    // buy along the path while the next item is affordable (Workshop purchases)
    while (cursor < path.length) {
      const id = path[cursor];
      profile = ctl.profile() as Profile;
      if (!UPGRADES[id] || upgradeCost(profile, id) === null) {
        cursor += 1;
        continue;
      }
      if (!ctl.buy(id)) break;
      cursor += 1;
    }
    profile = ctl.profile() as Profile;
    const avail = chassisAvailable(profile);
    const chassis = avail[i % avail.length];
    const seed = base * 1000003 + i * 7 + 1;
    if (!ctl.climb(chassis, seed)) break;
    runs += 1;
    await tick();
    const done = await playOneRun(ctl, newMemory(base * 977 + i));
    const end = ctl.runState();
    if (done && end && end.phase === 'victory') {
      firstWinRun = runs;
      await tick();
      return { runs, won: true, firstWinRun }; // the ending is showing; the caller walks on from there
    }
    ctl.leaveResult();
    await tick();
  }
  return { runs, won: false, firstWinRun };
}
