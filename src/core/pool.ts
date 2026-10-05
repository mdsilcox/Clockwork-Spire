// B9b.0 CONTRACT: the one item pool every source goes through (docs/briefs/B9b-rarity.md "One pool"). Stubs that throw;
// the progression lane (B9b.3) builds them and wires every call site. The contract does NOT wire them.
//
// Call sites progression must reach (file: function):
//   src/core/salvage.ts      salvage offers and the Tow Hook salvage (tier of a salvaged part; locked ids pay Scrap)
//   src/core/rooms.ts        trader stock (`makeTrade`/trader parts and the one trinket, content.md 1 odds via rollTier),
//                            fuse candidates (`fuseCandidates`), vaults (`takeVault`: Masterwork, act 3 Legendary when
//                            canTakeLegendary and one is unlocked; fallbacks: no Masterwork unlocked -> a Rare)
//   src/core/eventfx.ts      event part and trinket rewards (never Legendary; uses partPool/randomPart/randomTrinket today)
//   src/core/run.ts          the warden core reward (wardenCoreReward: Foreman a Rare or one time in three a Masterwork;
//                            Queen the `legendary` pending) and the boss trinket choice (rewards.ts bossTrinkets: Masterwork
//                            trinkets only after the Foreman and the Queen)
//   src/core/rewards.ts      partPool/randomPart/randomTrinket/eliteTrinket: eligible() replaces their lock checks
import type { Pending, Family, Profile, Rarity, RngStream, RunState } from './types';

export interface PoolQuery {
  kind: 'part' | 'trinket';
  tier: Rarity;
  family?: Family; // parts only
}

/** Unlocked ids of this kind and tier (and family), not held when unique, never the Mainspring. Legendary only when canTakeLegendary. */
export function eligible(_profile: Profile, _run: RunState, _q: PoolQuery): string[] {
  throw new Error('B9b: progression');
}

/** Roll a tier from percent odds (e.g. { common: 60, uncommon: 35, rare: 5 }) on the given stream. */
export function rollTier(_run: RunState, _stream: RngStream, _odds: Partial<Record<Rarity, number>>): Rarity {
  throw new Error('B9b: progression');
}

/** What a warden's core gives (rules 4.7): a `reward`/`salvage`-style Pending, or the `legendary` Pending for the Queen. */
export function wardenCoreReward(_run: RunState, _profile: Profile, _wardenId: string): Pending {
  throw new Error('B9b: progression');
}

/** True when the run holds no Legendary (`run.legendary === null`). */
export function canTakeLegendary(_run: RunState): boolean {
  throw new Error('B9b: progression');
}
