// v2 strategy bots on enemy machines (docs/rules.md 7.1, 7.4). B7 CONTRACT: signatures fixed; the strategy-bots
// lane implements them (porting src/sim/strat/combat.ts to target orders and part-aware scoring).

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

/** Every (bot, act, tier) cell: the same bins (snapshots of expert runs, as the D3 spike) for every bot. */
export function fightStatsV2(o: V2FightOpts): V2FightStats[] {
  void o;
  throw new Error('B7: fightStatsV2 not implemented');
}
