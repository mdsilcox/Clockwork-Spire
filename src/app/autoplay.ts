// Autoplay (P5): a debug hook that plays the REAL game through the controller's own actions, the way a player would,
// using the simulator's bot decisions. No cheats: it only calls actions a player can take.
import { chassisAvailable, upgradeCost } from '../core/meta';
import { UPGRADES } from '../core/content/upgrades';
import type { CombatState, Profile, RunState, TurnResult } from '../core/types';
import { chooseTurn } from '../sim/bot';
import { SENSIBLE_PATH } from '../sim/career';
import { chooseNode, eventChoice, eventPartUid, forgeStep, newMemory, oilStep, rewardPick, shopStep } from '../sim/runbot';
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

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/** Which path entries are still ahead of this profile (levels already bought are skipped). */
function pathFor(profile: Profile): string[] {
  const seen: Record<string, number> = {};
  return SENSIBLE_PATH.filter((id) => {
    seen[id] = (seen[id] ?? 0) + 1;
    return seen[id] > (profile.upgrades[id] ?? 0);
  });
}

async function playCombat(ctl: AutoCtl, m: BotMemory): Promise<boolean> {
  for (let t = 0; t < COMBAT_TURN_CAP; t++) {
    const c = ctl.combat();
    if (!c || c.outcome !== 'ongoing') return true;
    const turn = chooseTurn(c);
    for (const p of turn.placements) if (!ctl.place(p.hand, p.cell)) return false;
    if (turn.swap && !ctl.swap(turn.swap[0], turn.swap[1])) return false;
    ctl.target(turn.target);
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

/** Play one run to its end. Returns false if the bot got stuck (the run is abandoned). */
async function playOneRun(ctl: AutoCtl, m: BotMemory): Promise<boolean> {
  for (let step = 0; step < STEP_CAP; step++) {
    const run = ctl.runState();
    if (!run) return false;
    if (run.phase === 'victory' || run.phase === 'defeat') return true;
    let ok = true;
    switch (run.phase) {
      case 'map':
        ok = ctl.go(chooseNode(run));
        break;
      case 'combat':
        ok = await playCombat(ctl, m);
        break;
      case 'reward': {
        const sp = run.pending;
        if (sp && sp.kind === 'salvage') {
          // v2: keep every unlocked salvage that fits the plan's families (the bot keeps the first two), scrap the rest
          const keep = sp.items.flatMap((it, i) => (it.locked ? [] : [i])).slice(0, 2);
          ok = ctl.salvage(keep);
          if (ok && sp.trinkets.length > 0 && !sp.trinketTaken) ok = ctl.rewardTrinket(0);
          if (ok) ok = ctl.leave();
          break;
        }
        const pick = rewardPick(run, m);
        if (pick.part !== undefined) ok = ctl.reward(pick.part);
        if (ok && pick.trinket !== undefined) ok = ctl.rewardTrinket(pick.trinket);
        if (ok) ok = ctl.leave();
        break;
      }
      case 'event': {
        const p = run.pending;
        if (!p || p.kind !== 'event') {
          ok = false;
        } else if (p.needsPart) {
          const uid = eventPartUid(run, m);
          ok = uid !== null && ctl.pickPart(uid);
        } else if (p.result === undefined) {
          ok = ctl.choose(eventChoice(run, p.eventId)) !== null;
          if (!ok) ok = ctl.leave(); // a choice that could not be made: walk on
        } else ok = ctl.leave();
        break;
      }
      case 'shop': {
        for (let g = 0; g < 20 && ok; g++) {
          const cur = ctl.runState();
          if (!cur) break;
          const s = shopStep(cur, m);
          if (!s) break;
          ok = s.kind === 'buy' ? ctl.shopBuy(s.index) : ctl.remove(s.uid);
        }
        ok = ctl.leave();
        break;
      }
      case 'forge': {
        const s = forgeStep(run, m);
        if (s) ctl.forge(s.kind, s.uid);
        ok = ctl.leave();
        break;
      }
      case 'oil':
        ctl.oil(oilStep(run));
        ok = ctl.leave();
        break;
    }
    if (!ok) {
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
