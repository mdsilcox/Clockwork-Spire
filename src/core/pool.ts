// The one item pool every source goes through (docs/briefs/B9b-rarity.md "One pool"; docs/content.md section 1).
// An item is open when it never started locked, or its blueprint or achievement is in the run's config (set at the run's start
// from the profile by `runConfigFor`), or it was found as a blueprint this run, or the profile passed in has earned it.
import { ACHIEVEMENTS } from './content/achievements';
import { PARTS } from './content/parts';
import { TRINKETS } from './content/trinkets';
import { next, shuffle } from './rng';
import type { Pending, Family, Profile, Rarity, RngStream, RunState } from './types';

export interface PoolQuery {
  kind: 'part' | 'trinket';
  tier: Rarity;
  family?: Family; // parts only
}

export const TIERS: Rarity[] = ['common', 'uncommon', 'rare', 'masterwork', 'legendary'];

/** Part and trinket ids the profile's earned achievements unlock. */
export function achievementUnlocks(profile: Profile | null | undefined): { parts: string[]; trinkets: string[] } {
  const parts: string[] = [];
  const trinkets: string[] = [];
  if (profile) {
    for (const a of ACHIEVEMENTS) {
      if (!profile.achievements?.[a.id]) continue;
      parts.push(...(a.reward.parts ?? []));
      trinkets.push(...(a.reward.trinkets ?? []));
    }
  }
  return { parts, trinkets };
}

/** Is this part open to the run (never locked, or unlocked by a blueprint, an achievement or a blueprint found this run)? */
export function partOpen(run: RunState, id: string, profile?: Profile | null): boolean {
  const def = PARTS[id];
  if (!def) return false;
  if (!def.locked) return true;
  if (run.config.unlockedParts.includes(id) || run.stats.blueprintsFound.includes(id)) return true;
  return !!profile && (profile.blueprints.includes(id) || achievementUnlocks(profile).parts.includes(id));
}

export function trinketOpen(run: RunState, id: string, profile?: Profile | null): boolean {
  const def = TRINKETS[id];
  if (!def) return false;
  if (!def.locked) return true;
  if (run.config.unlockedTrinkets?.includes(id)) return true;
  return !!profile && achievementUnlocks(profile).trinkets.includes(id);
}

/** True when the run holds no Legendary (`run.legendary === null`). */
export function canTakeLegendary(run: RunState): boolean {
  return run.legendary == null;
}

/** Unlocked ids of this kind and tier (and family), not held when unique, never the Mainspring. Legendary only when canTakeLegendary. */
export function eligible(profile: Profile | null, run: RunState, q: PoolQuery): string[] {
  if (q.tier === 'legendary' && !canTakeLegendary(run)) return [];
  if (q.kind === 'part') {
    return Object.values(PARTS)
      .filter((d) => d.id !== 'mainspring' && d.rarity === q.tier && (!q.family || d.family === q.family) && partOpen(run, d.id, profile))
      .map((d) => d.id);
  }
  return Object.values(TRINKETS)
    .filter((d) => d.rarity === q.tier && !run.trinkets.includes(d.id) && trinketOpen(run, d.id, profile))
    .map((d) => d.id);
}

/** Roll a tier from percent odds (e.g. { common: 60, uncommon: 35, rare: 5 }) on the given stream. */
export function rollTier(run: RunState, stream: RngStream, odds: Partial<Record<Rarity, number>>): Rarity {
  const tiers = TIERS.filter((t) => (odds[t] ?? 0) > 0);
  const total = tiers.reduce((s, t) => s + (odds[t] as number), 0);
  const r = next(run.rng, stream) * total;
  let acc = 0;
  for (const t of tiers) {
    acc += odds[t] as number;
    if (r < acc) return t;
  }
  return tiers[tiers.length - 1] ?? 'common';
}

/** From `tier` down: the first tier that has an eligible id (a tier with nothing unlocked folds into the tier below). */
export function foldDown(profile: Profile | null, run: RunState, kind: 'part' | 'trinket', tier: Rarity, ok: (id: string) => boolean = () => true): { tier: Rarity; ids: string[] } {
  for (let i = TIERS.indexOf(tier); i >= 0; i--) {
    const ids = eligible(profile, run, { kind, tier: TIERS[i] }).filter(ok);
    if (ids.length) return { tier: TIERS[i], ids };
  }
  return { tier, ids: [] };
}

/** Up to `n` distinct ids of one tier, shuffled on `reward`. */
function offerOf(profile: Profile | null, run: RunState, tier: Rarity, n: number): { tier: Rarity; ids: string[] } {
  const f = foldDown(profile, run, 'part', tier);
  return { tier: f.tier, ids: shuffle(run.rng, 'reward', f.ids).slice(0, n) };
}

/** What a warden's core gives (rules 4.7): a `reward` Pending (the parts to choose from; the caller adds Scrap, trinkets and
 * blueprints), or the `legendary` Pending for the Queen. The Foreman: a Rare, one time in three a Masterwork when one is
 * unlocked; all offered parts share the tier. The Queen: a Legendary pick when one is eligible, else a Masterwork if any is
 * unlocked, else a Rare. The Clockmaker ends the run and drops no part. */
export function wardenCoreReward(run: RunState, profile: Profile | null, wardenId: string): Pending {
  const n = run.config.rewardChoices + (run.trinkets.includes('spectacles') ? 1 : 0);
  const reward = (parts: string[]): Pending => ({ kind: 'reward', cogs: 0, parts, trinkets: [], partTaken: parts.length === 0, trinketTaken: true });
  if (wardenId === 'clockmaker') return reward([]);
  const queen = wardenId !== 'foreman';
  if (queen) {
    const legendary = [...eligible(profile, run, { kind: 'part', tier: 'legendary' }), ...eligible(profile, run, { kind: 'trinket', tier: 'legendary' })];
    if (legendary.length > 0) return { kind: 'legendary', options: shuffle(run.rng, 'reward', legendary).slice(0, 2) };
    return reward(offerOf(profile, run, eligible(profile, run, { kind: 'part', tier: 'masterwork' }).length ? 'masterwork' : 'rare', n).ids);
  }
  const haveMaster = eligible(profile, run, { kind: 'part', tier: 'masterwork' }).length > 0;
  const tier = haveMaster ? rollTier(run, 'reward', { rare: 2, masterwork: 1 }) : 'rare';
  return reward(offerOf(profile, run, tier, n).ids);
}
