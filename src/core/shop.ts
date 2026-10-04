// Shop stock and prices (docs/content.md "Prices and values").
import { int, next } from './rng';
import { TRINKETS } from './content/trinkets';
import { randomPart, randomTrinket, recordOffers } from './rewards';
import type { RunState, ShopItem } from './types';

const PART_PRICE = { common: 45, uncommon: 70, rare: 110 } as const;
const TRINKET_PRICE = { common: 120, uncommon: 160, rare: 200, boss: 250 } as const;
export const OIL_PRICE = 30;
export const OIL_HEAL = 15;
export const REMOVAL_BASE = 60;
export const REMOVAL_STEP = 20;

/** Gilded Cog: -20% on every shop price. */
export function shopDiscount(run: RunState): number {
  return run.trinkets.includes('gilded-cog') ? 0.8 : 1;
}

/** Current price of the removal service (rises by 20 per use this run). */
export function removalPrice(run: RunState): number {
  return Math.round((REMOVAL_BASE + REMOVAL_STEP * (run.stats.removals ?? 0)) * shopDiscount(run));
}

/** 5 parts (3 common, 1 uncommon, 1 uncommon or rare), 2 trinkets, removal, oil. Prices vary -10% to +10%. */
export function makeShop(run: RunState): ShopItem[] {
  const stock: ShopItem[] = [];
  const vary = () => (90 + int(run.rng, 'shop', 21)) / 100;
  const chosen: string[] = [];
  const rarities: ('common' | 'uncommon' | 'rare')[] = ['common', 'common', 'common', 'uncommon', next(run.rng, 'shop') < 0.7 ? 'uncommon' : 'rare'];
  for (const r of rarities) {
    const id = randomPart(run, r, 'shop', chosen);
    chosen.push(id);
    const rarity = (r === 'rare' ? 'rare' : r) as keyof typeof PART_PRICE;
    stock.push({ kind: 'part', id, price: Math.round(PART_PRICE[rarity] * vary() * shopDiscount(run)), sold: false });
  }
  recordOffers(run, chosen, 'shop');
  const tr: string[] = [];
  for (const r of ['common', 'uncommon'] as const) {
    const id = randomTrinket(run, [r], 'shop', tr) ?? randomTrinket(run, ['common', 'uncommon', 'rare'], 'shop', tr);
    if (!id) continue;
    tr.push(id);
    stock.push({ kind: 'trinket', id, price: Math.round(TRINKET_PRICE[TRINKETS[id].rarity] * vary() * shopDiscount(run)), sold: false });
  }
  stock.push({ kind: 'removal', price: removalPrice(run), sold: false });
  stock.push({ kind: 'oil', price: Math.round(OIL_PRICE * shopDiscount(run)), sold: false });
  return stock;
}
