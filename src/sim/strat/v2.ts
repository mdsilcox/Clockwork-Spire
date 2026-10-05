// v2 strategy bots on enemy machines (docs/rules.md 7.1, 7.4). B7 CONTRACT: signatures fixed; the strategy-bots
// lane implements them (porting src/sim/strat/combat.ts to target orders and part-aware scoring).
import { createCombat } from '../../core/combat';
import { chooseTurn } from '../bot';
import type { Policy } from './combat';
import { playStratCareer } from './drive';
import type { FightSnapshot } from './drive';
import { playCombatWith } from './fight';
import type { FightStats } from './fight';
import { expertRun } from './runbot';
import { burst2, expert2, maxburst2, turtle2 } from './v2combat';


export type V2Bot = 'greedy' | 'turtle' | 'burst' | 'expert' | 'maxburst';

export interface V2FightStats {
  bot: V2Bot;
  act: 1 | 2 | 3;
  tier: 'normal' | 'elite';
  fights: number;
  winRate: number; // 0..1
  hpLostMean: number;
  hpLostPctMean: number; // HP lost / max HP, 0..1
  turnsMean: number;
  absorbedTurnShare: number; // enemy turns whose damage Plating fully absorbed / enemy turns that dealt damage
  msPerTurn: number; // mean decision time
}

export interface V2FightOpts {
  seed: number;
  fightsPerTier: number;
  bots: V2Bot[];
  acts?: (1 | 2 | 3)[];
}

/** The policy behind each bot name. */
export const V2_POLICY: Record<V2Bot, Policy> = { greedy: chooseTurn, turtle: turtle2, burst: burst2, expert: expert2, maxburst: maxburst2 };

/**
 * Snapshots of what expert runs (v2 expert combat and drafting, careers on the sensible path) held on arrival at
 * normal and elite fights: every elite, every second normal fight, until each wanted bucket has `need` of them.
 */
export function collectBins(seed: number, need: number, acts: (1 | 2 | 3)[], maxCareers = 300): FightSnapshot[] {
  const snaps: FightSnapshot[] = [];
  const count = (a: number, t: string): number => snaps.filter((x) => x.act === a && x.tier === t).length;
  const done = (): boolean => acts.every((a) => count(a, 'fight') >= need && count(a, 'elite') >= need);
  let n = 0;
  for (let i = 0; i < maxCareers && !done(); i++) {
    playStratCareer({
      seed: seed * 10007 + i,
      maxRuns: 6,
      combat: expert2,
      runPolicy: expertRun,
      hooks: { onFight: (rec) => (rec.snap.tier === 'elite' || (rec.snap.tier === 'fight' && n++ % 2 === 0)) && snaps.push(rec.snap) },
    });
  }
  return snaps;
}

export interface V2Fight {
  bot: V2Bot;
  snap: FightSnapshot;
  stats: FightStats;
}

/** Replay one snapshot with one bot (same seed for every bot). */
export function replay(bot: V2Bot, snap: FightSnapshot, seed: number): FightStats {
  const c = createCombat({
    seed,
    bin: snap.bin,
    enemies: snap.enemies,
    hp: snap.hp,
    maxHp: snap.maxHp,
    kind: snap.tier === 'fight' ? 'fight' : snap.tier,
    trinkets: snap.trinkets,
    handSize: snap.handSize,
    chassis: snap.chassis,
  });
  return playCombatWith(c, V2_POLICY[bot]);
}

/** Every (bot, act, tier) cell: the same bins (snapshots of expert runs, as the D3 spike) for every bot. */
export function fightStatsV2(o: V2FightOpts): V2FightStats[] {
  const acts = o.acts ?? [1, 2, 3];
  const bins = collectBins(o.seed, o.fightsPerTier, acts);
  return statsFromBins(o, bins).stats;
}

export function statsFromBins(o: V2FightOpts, bins: FightSnapshot[]): { stats: V2FightStats[]; fights: V2Fight[] } {
  const acts = o.acts ?? [1, 2, 3];
  const out: V2FightStats[] = [];
  const fights: V2Fight[] = [];
  for (const bot of o.bots) {
    for (const act of acts) {
      for (const tier of ['normal', 'elite'] as const) {
        const here = bins.filter((s) => s.act === act && s.tier === (tier === 'normal' ? 'fight' : 'elite'));
        const pick: FightSnapshot[] = [];
        for (let i = 0; i < Math.min(o.fightsPerTier, here.length); i++) pick.push(here[Math.floor((i * here.length) / Math.min(o.fightsPerTier, here.length))]);
        const rows = pick.map((snap, i) => ({ snap, stats: replay(bot, snap, o.seed * 9973 + 131 * i + act) }));
        for (const r of rows) fights.push({ bot, snap: r.snap, stats: r.stats });
        const n = Math.max(1, rows.length);
        const turns = rows.reduce((a, r) => a + r.stats.turns, 0);
        const dmgTurns = rows.reduce((a, r) => a + r.stats.damageTurns, 0);
        out.push({
          bot,
          act,
          tier,
          fights: rows.length,
          winRate: rows.filter((r) => r.stats.won).length / n,
          hpLostMean: rows.reduce((a, r) => a + r.stats.hpLost, 0) / n,
          hpLostPctMean: rows.reduce((a, r) => a + r.stats.hpLost / r.snap.maxHp, 0) / n,
          turnsMean: turns / n,
          absorbedTurnShare: dmgTurns ? rows.reduce((a, r) => a + r.stats.absorbedTurns, 0) / dmgTurns : 0,
          msPerTurn: rows.reduce((a, r) => a + r.stats.decideMs, 0) / Math.max(1, turns),
        });
      }
    }
  }
  return { stats: out, fights };
}
