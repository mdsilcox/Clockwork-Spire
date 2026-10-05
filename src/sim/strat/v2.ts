// v2 strategy bots on enemy machines (docs/rules.md 7.1, 7.4). B7 CONTRACT: signatures fixed; the strategy-bots
// lane implements them (porting src/sim/strat/combat.ts to target orders and part-aware scoring).
import { createCombat } from '../../core/combat';
import { chooseTurn } from '../bot';
import type { Policy } from './combat';
import { defaultRunConfig } from '../../core/run';
import { playClimb } from './climb';
import { ROUTE_COMBAT } from './v2routes';
import type { FightSnapshot } from './drive';
import { playCombatWith } from './fight';
import type { FightStats } from './fight';
import { enemyDef } from '../../core/content/enemies';
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
 * Snapshots of what expert climbs (v2 expert route, combat and drafting, Journeyman, no meta) held on arrival at
 * normal and elite fights: every elite, every second normal fight, until each wanted bucket has `need` of them.
 */
export function collectBins(seed: number, need: number, acts: (1 | 2 | 3)[], maxRuns = 800): FightSnapshot[] {
  const snaps: FightSnapshot[] = [];
  const count = (a: number, t: string): number => snaps.filter((x) => x.act === a && x.tier === t).length;
  const done = (): boolean => acts.every((a) => count(a, 'fight') >= need && count(a, 'elite') >= need);
  let n = 0;
  for (let i = 0; i < maxRuns && !done(); i++) {
    const cfg = { ...defaultRunConfig(seed * 100003 + 77 + i), legacyMap: false };
    playClimb(cfg, seed * 31 + i, 'expert', ROUTE_COMBAT, {
      onFight: (rec) => (rec.snap.tier === 'elite' || (rec.snap.tier === 'fight' && n++ % 2 === 0)) && snaps.push(rec.snap),
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
    curved: true, // B10c: replays are climb fights, so the per-act percents apply
    bin: snap.bin,
    enemies: snap.enemies,
    hp: snap.hp,
    maxHp: snap.maxHp,
    kind: snap.tier === 'fight' ? 'fight' : snap.tier,
    trinkets: snap.trinkets,
    handSize: snap.handSize,
    chassis: snap.chassis,
    overwound: snap.overwound,
    prepared: snap.prepared,
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

// ---------- B9a: the wardens (docs/acceptance.md BV4) ----------

export type WardenId = 'foreman' | 'boilermaker' | 'clockmaker';

/** One (bot, warden) cell of BV4. A "turn in phase k" is a player turn that started while the warden's `phase` was k. */
export interface WardenFightStats {
  bot: V2Bot;
  warden: 'foreman' | 'boilermaker' | 'clockmaker';
  fights: number;
  /** Fights the bot won (BV4 needs at least 30 of 100, or the median means little). */
  wins: number;
  turnsMedian: number; // median player turns over the WON fights (a loss on turn 5 is not the fight's length)
  /** Per phase index, the fewest turns any fight of this cell spent in that phase (a fight that won in a phase counts the turns it took there). */
  phaseTurnsMin: number[];
  /** B10c: how many won fights spent fewer than 3 turns in the last phase (BV4 wants none): the margin behind `phaseTurnsMin`. */
  lastPhaseShort: number;
}

export interface WardenFightOpts {
  seed: number;
  fights: number; // per (bot, warden)
  bots: V2Bot[];
}

/**
 * Snapshots of the warden fights expert climbs reached (Journeyman, no meta, so no Clockmaker memory): `need` per warden,
 * or as many as `maxRuns` climbs give. Climbs alternate the expert route and the rusher so act 3 is reached often enough.
 */
export function collectWardenBins(seed: number, need: number, maxRuns = 2500): FightSnapshot[] {
  const snaps: FightSnapshot[] = [];
  const count = (a: number): number => snaps.filter((x) => x.act === a).length;
  const routes = ['expert', 'expert', 'rusher'] as const;
  for (let i = 0; i < maxRuns && !([1, 2, 3] as const).every((a) => count(a) >= need); i++) {
    const cfg = { ...defaultRunConfig(seed * 100003 + 5000 + i), legacyMap: false };
    playClimb(cfg, seed * 31 + 7000 + i, routes[i % 3], ROUTE_COMBAT, { onFight: (rec) => rec.snap.tier === 'boss' && count(rec.snap.act) < need && snaps.push(rec.snap) });
  }
  return snaps;
}

const WARDEN_OF: Record<number, WardenId> = { 1: 'foreman', 2: 'boilermaker', 3: 'clockmaker' };

function median(xs: number[]): number {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length === 0 ? 0 : s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

/** The same bot against each warden on bins snapshotted from expert climbs. */
export function wardenStatsFromBins(o: WardenFightOpts, bins: FightSnapshot[]): WardenFightStats[] {
  const out: WardenFightStats[] = [];
  for (const bot of o.bots) {
    for (const act of [1, 2, 3]) {
      const warden = WARDEN_OF[act];
      const here = bins.filter((b) => b.act === act);
      const rows: FightStats[] = [];
      for (let i = 0; i < o.fights && here.length > 0; i++) rows.push(replay(bot, here[i % here.length], o.seed * 9973 + 131 * i + act));
      const phases = enemyDef(warden).frame?.phases?.length ?? 1;
      const won = rows.filter((r) => r.won);
      const min = Array.from({ length: phases }, (_, k) => (won.length ? Math.min(...won.map((r) => r.phaseStartTurns[k] ?? 0)) : 0));
      out.push({ bot, warden, fights: rows.length, wins: won.length, turnsMedian: median(won.map((r) => r.turns)), phaseTurnsMin: min, lastPhaseShort: won.filter((r) => (r.phaseStartTurns[phases - 1] ?? 0) < 3).length });
    }
  }
  return out;
}

export function wardenStatsV2(o: WardenFightOpts): WardenFightStats[] {
  return wardenStatsFromBins(o, collectWardenBins(o.seed, o.fights));
}
