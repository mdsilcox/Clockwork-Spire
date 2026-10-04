// Run and career drivers with a pluggable combat policy and run policy. Parallel to src/sim/run.ts and career.ts,
// which stay untouched (their behavior is the "v1" bot: v1Run + v1 chooseTurn).
import { CHASSIS } from '../../core/content/chassis';
import { UPGRADES } from '../../core/content/upgrades';
import { abandonRun, newRun, runRecord, settleCombat } from '../../core/run';
import { buyUpgrade, chassisAvailable, finishRun, newProfile, runConfigFor, upgradeCost } from '../../core/meta';
import type { PartInstance, Profile, RunConfig, RunState } from '../../core/types';
import { chooseTurn } from '../bot';
import { SENSIBLE_PATH } from '../career';
import { doEvent, doForge, doMap, doOil, doReward, doShop, newMemory } from '../runbot';
import type { BotMemory } from '../runbot';
import type { RunResult } from '../run';
import type { Policy } from './combat';
import { playCombatWith } from './fight';
import type { FightStats } from './fight';

export const COMBAT_TURN_CAP = 60;
const STEP_CAP = 3000;

export interface RunPolicy {
  doMap(run: RunState, m: BotMemory): void;
  doReward(run: RunState, m: BotMemory): void;
  doEvent(run: RunState, m: BotMemory): void;
  doShop(run: RunState, m: BotMemory): void;
  doForge(run: RunState, m: BotMemory): void;
  doOil(run: RunState, m: BotMemory): void;
}

/** v1's run decisions, unchanged. */
export const v1Run: RunPolicy = { doMap, doReward, doEvent, doShop, doForge, doOil };
export const v1Combat: Policy = chooseTurn;

/** What a fight started with: enough to replay it. */
export interface FightSnapshot {
  act: number;
  floor: number;
  tier: 'fight' | 'elite' | 'boss';
  enemies: string[];
  bin: PartInstance[];
  trinkets: string[];
  hp: number;
  maxHp: number;
  handSize: number;
  chassis: string;
}

export interface FightRecord {
  snap: FightSnapshot;
  stats: FightStats;
}

export interface Hooks {
  onFight?(rec: FightRecord): void;
}

function playCombat(run: RunState, m: BotMemory, combat: Policy, hooks?: Hooks): void {
  const c = run.combat;
  if (!c) return;
  const snap: FightSnapshot = {
    act: run.act,
    floor: run.floor,
    tier: c.kind === 'elite' || c.kind === 'boss' ? c.kind : 'fight',
    enemies: c.enemies.map((e) => e.defId),
    bin: run.bin.map((p) => ({ ...p })),
    trinkets: run.trinkets.slice(),
    hp: c.playerHp,
    maxHp: c.playerMaxHp,
    handSize: c.handSize,
    chassis: run.config.chassis,
  };
  let first: FightStats | null = null;
  for (let round = 0; round < 3; round++) {
    const st = playCombatWith(c, combat, COMBAT_TURN_CAP);
    for (const id in st.fired) m.fired[id] = (m.fired[id] ?? 0) + st.fired[id];
    if (!first) first = st;
    if (settleCombat(run)) {
      hooks?.onFight?.({ snap, stats: first });
      return;
    }
    if (c.outcome !== 'ongoing') break;
    if (st.capped) break;
  }
  hooks?.onFight?.({ snap, stats: first as FightStats });
  abandonRun(run);
}

export function playStratRun(
  cfg: RunConfig,
  botSeed: number,
  combat: Policy,
  rp: RunPolicy,
  hooks?: Hooks,
): { result: RunResult; run: RunState } {
  const run = newRun(cfg);
  const m = newMemory(botSeed);
  const hpAtBoss: (number | null)[] = [null, null, null];
  let eventStuck = 0;
  for (let step = 0; step < STEP_CAP && run.phase !== 'victory' && run.phase !== 'defeat'; step++) {
    switch (run.phase) {
      case 'map': {
        const before = run.act;
        rp.doMap(run, m);
        if ((run.phase as string) === 'combat' && run.combat?.kind === 'boss') hpAtBoss[before - 1] = run.hp;
        break;
      }
      case 'combat':
        playCombat(run, m, combat, hooks);
        break;
      case 'reward':
        rp.doReward(run, m);
        break;
      case 'event':
        rp.doEvent(run, m);
        if (run.phase === 'event' && ++eventStuck > 5) abandonRun(run);
        break;
      case 'shop':
        rp.doShop(run, m);
        break;
      case 'forge':
        rp.doForge(run, m);
        break;
      case 'oil':
        rp.doOil(run, m);
        break;
    }
    if ((run.phase as string) !== 'event') eventStuck = 0;
    if (m.illegal.length > 0) break;
  }
  if (run.phase !== 'victory' && run.phase !== 'defeat') abandonRun(run);
  const record = runRecord(run);
  const result: RunResult = {
    won: record.result === 'win',
    act: record.act,
    floor: record.floor,
    record,
    offers: run.stats.offers,
    hpAtBoss,
    bossesBeaten: run.stats.bossesBeaten,
    killedBy: record.killedBy,
    turns: run.stats.turns,
    illegal: m.illegal,
  };
  return { result, run };
}

export interface StratCareerOpts {
  seed: number;
  maxRuns: number;
  combat: Policy;
  runPolicy: RunPolicy;
  path?: string[];
  hooks?: Hooks;
  /** Called with each finished run (for pick-rate stats). */
  onRun?(result: RunResult, run: RunState): void;
}

export interface StratCareer {
  firstWin: number | null;
  runs: number;
  profile: Profile;
}

/** Same career as src/sim/career.ts (same seeds, same SENSIBLE_PATH, stops at the first win). */
export function playStratCareer(o: StratCareerOpts): StratCareer {
  const profile = newProfile('sim', '1970-01-01T00:00:00Z');
  const path = o.path ?? SENSIBLE_PATH;
  let cursor = 0;
  let firstWin: number | null = null;
  let runs = 0;
  for (let i = 0; i < o.maxRuns; i++) {
    const avail = chassisAvailable(profile).filter((id) => CHASSIS[id]);
    const chassis = avail[i % avail.length];
    const seed = o.seed * 1000003 + i * 7 + 1;
    const cfg = runConfigFor(profile, seed, chassis);
    const { result, run } = playStratRun(cfg, o.seed * 977 + i, o.combat, o.runPolicy, o.hooks);
    runs += 1;
    o.onRun?.(result, run);
    finishRun(profile, run, '1970-01-01T00:00:00Z');
    if (result.won && firstWin === null) {
      firstWin = i + 1;
      break;
    }
    while (cursor < path.length) {
      const id = path[cursor];
      if (!UPGRADES[id] || upgradeCost(profile, id) === null) {
        cursor += 1;
        continue;
      }
      if (!buyUpgrade(profile, id)) break;
      cursor += 1;
    }
  }
  return { firstWin, runs, profile };
}
