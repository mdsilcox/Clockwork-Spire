// Run-level helpers shared by rewards, the shop and events: the part pool, rarity rolls, offers, trinket gains.
import { int, next, pick } from './rng';
import { PARTS } from './content/parts';
import { TRINKETS } from './content/trinkets';
import type { TrinketRarity } from './content/trinkets';
import type { PartDef } from './defs';
import { partOpen, rollTier, trinketOpen } from './pool';
import type { PartInstance, Rarity, RunState } from './types';

export type OfferSource = 'reward' | 'shop' | 'trader' | 'fuse' | 'salvage';

/** The run's money: Scrap in the climb (run.scrap set), Cogs in v1 runs. */
export function scrapOf(run: RunState): number {
  return run.scrap ?? run.cogs;
}
/** Add (or, negative, spend) money, never below 0. */
export function addScrap(run: RunState, n: number): void {
  if (run.scrap !== undefined) run.scrap = Math.max(0, run.scrap + n);
  else run.cogs = Math.max(0, run.cogs + n);
}

export type Tier = 'fight' | 'elite' | 'boss';

/** Rarity weights by act (docs/content.md "Reward rarity by act"), in percent: common, uncommon, rare. */
const RARITY_BY_ACT: Record<number, [number, number, number]> = {
  1: [70, 25, 5],
  2: [55, 35, 10],
  3: [45, 38, 17],
};

/** Blueprints found this run (they join the pool at once; a dead run keeps them via the record). */
export function foundBlueprints(run: RunState): string[] {
  return run.stats.blueprintsFound;
}

/** Parts that may be offered: open to the run (pool.ts `partOpen`). Never the Mainspring. */
export function partPool(run: RunState): PartDef[] {
  return Object.values(PARTS).filter((p) => p.id !== 'mainspring' && partOpen(run, p.id));
}

/** Locked parts not yet unlocked or found (the blueprint candidates). */
export function lockedPartsLeft(run: RunState): string[] {
  const open = new Set([...run.config.unlockedParts, ...run.stats.blueprintsFound]);
  return Object.values(PARTS)
    .filter((p) => p.locked && !p.unlock && !open.has(p.id)) // B9b: achievement-gated parts (Masterwork, Legendary) are never blueprints
    .map((p) => p.id);
}

/** Record a blueprint as found. Returns false if it was already known. */
export function addBlueprint(run: RunState, id: string): boolean {
  if (run.config.unlockedParts.includes(id) || run.stats.blueprintsFound.includes(id)) return false;
  run.stats.blueprintsFound.push(id);
  return true;
}

/** A random blueprint not yet found (reward stream by default). */
export function rollBlueprint(run: RunState, stream: 'reward' | 'event' = 'reward'): string | null {
  const left = lockedPartsLeft(run);
  return left.length ? pick(run.rng, stream, left) : null;
}

export function rollRarity(run: RunState, tier: Tier): Rarity {
  if (tier === 'boss') return 'rare';
  const w = RARITY_BY_ACT[run.act].slice() as [number, number, number];
  if (tier === 'elite') {
    w[0] -= 15;
    w[1] += 10;
    w[2] += 5;
  }
  const r = next(run.rng, 'reward') * 100;
  return r < w[0] ? 'common' : r < w[0] + w[1] ? 'uncommon' : 'rare';
}

/** A random pool part of a rarity (steps down a rarity if none is open), skipping `exclude` ids. Without a rarity: Common to
 * Rare only. Masterwork parts come only when asked for; Legendary never (they have two sources: the Queen's core and the act 3
 * vault, pool.ts). */
export function randomPart(run: RunState, rarity: Rarity | null, stream: 'reward' | 'event' | 'shop', exclude: string[] = []): string {
  const pool = partPool(run).filter((p) => !exclude.includes(p.id) && p.rarity !== 'legendary' && (p.rarity !== 'masterwork' || rarity === 'masterwork'));
  const order: Rarity[] = ['masterwork', 'rare', 'uncommon', 'common'];
  let cand = pool;
  if (rarity) {
    cand = [];
    for (let i = order.indexOf(rarity === 'legendary' ? 'masterwork' : rarity); i < order.length && cand.length === 0; i++) cand = pool.filter((p) => p.rarity === order[i]);
  }
  if (cand.length === 0) cand = pool.length ? pool : partPool(run).filter((p) => p.rarity === 'common');
  return pick(run.rng, stream, cand).id;
}

/** `n` distinct part ids for a reward. */
export function offerParts(run: RunState, tier: Tier): string[] {
  const n = run.config.rewardChoices + (run.trinkets.includes('spectacles') ? 1 : 0);
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(randomPart(run, rollRarity(run, tier), 'reward', out));
  return out;
}

export function newPart(run: RunState, defId: string, plus = false): PartInstance {
  const p: PartInstance = { uid: run.nextUid++, defId, plus };
  run.bin.push(p);
  return p;
}

export function heal(run: RunState, n: number): void {
  run.hp = Math.min(run.maxHp, run.hp + Math.max(0, n));
}

/** Lose HP but never die from it (events and costs leave you at 1 at worst). */
export function hurt(run: RunState, n: number): void {
  run.hp = Math.max(1, run.hp - n);
}

/** Gain a trinket and apply its run-level effect. Returns false if already owned. */
export function gainTrinket(run: RunState, id: string): boolean {
  if (!TRINKETS[id] || run.trinkets.includes(id)) return false;
  run.trinkets.push(id);
  if (id === 'clockwork-heart') {
    run.maxHp += 8;
    heal(run, 8);
  } else if (id === 'brass-heart') {
    run.maxHp += 15;
  }
  return true;
}

/** A random trinket of the given rarities that the run does not own and has unlocked. Legendary trinkets are never rolled. */
export function randomTrinket(run: RunState, rarities: TrinketRarity[], stream: 'reward' | 'event' | 'shop', exclude: string[] = []): string | null {
  const all = Object.values(TRINKETS).filter((t) => !run.trinkets.includes(t.id) && !exclude.includes(t.id) && t.rarity !== 'legendary' && trinketOpen(run, t.id));
  const cand = all.filter((t) => rarities.includes(t.rarity));
  return cand.length ? pick(run.rng, stream, cand).id : null;
}

/** The trinket an elite drops: common 55%, uncommon 35%, rare 10%. */
export function eliteTrinket(run: RunState): string | null {
  const r = int(run.rng, 'reward', 100);
  const first = r < 55 ? 'common' : r < 90 ? 'uncommon' : 'rare';
  return randomTrinket(run, [first], 'reward') ?? randomTrinket(run, ['common', 'uncommon', 'rare'], 'reward');
}

/** Three boss trinkets to choose from (fills with other trinkets if the boss ones run out). After the Foreman and the Queen
 * (acts 1 and 2) one of them may be an unlocked Masterwork trinket; never in act 3, never a Legendary. */
export function bossTrinkets(run: RunState): string[] {
  const out: string[] = [];
  if (run.act < 3) {
    const m = eligibleMasterTrinkets(run);
    if (m.length && rollTier(run, 'reward', { common: 1, masterwork: 1 }) === 'masterwork') out.push(pick(run.rng, 'reward', m));
  }
  while (out.length < 3) {
    const id = randomTrinket(run, ['boss'], 'reward', out) ?? randomTrinket(run, ['rare', 'uncommon', 'common'], 'reward', out);
    if (!id) break;
    out.push(id);
  }
  return out;
}

function eligibleMasterTrinkets(run: RunState): string[] {
  return Object.values(TRINKETS)
    .filter((t) => t.rarity === 'masterwork' && !run.trinkets.includes(t.id) && trinketOpen(run, t.id))
    .map((t) => t.id);
}

/** Record that parts were offered (for the balance sim). */
export function recordOffers(run: RunState, ids: string[], source: OfferSource): void {
  for (const partId of ids) run.stats.offers.push({ partId, taken: false, act: run.act, source });
}

/** Mark the most recent matching offer as taken. */
export function markOfferTaken(run: RunState, partId: string, source: OfferSource): void {
  for (let i = run.stats.offers.length - 1; i >= 0; i--) {
    const o = run.stats.offers[i];
    if (o.partId === partId && o.source === source && !o.taken) {
      o.taken = true;
      return;
    }
  }
}
