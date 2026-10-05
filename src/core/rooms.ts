// The climb's rooms: workbench (upgrade, remove, fuse), traders (barter), oil stations, vaults; Scrap
// (docs/rules.md 4.4, 4.5; prices in docs/content.md section 10). Every action is allowed once per visit where rules 4.4
// says so. The caller opens the room's screen (sets `phase` and `pending`); these functions act on that pending.
import { int, pick, shuffle } from './rng';
import { PARTS } from './content/parts';
import { TRINKETS } from './content/trinkets';
import { eligible, foldDown, rollTier, canTakeLegendary } from './pool';
import { oilHealFor, traderPrice } from './difficulty';
import { OIL_REST_PCT } from './content/balance';
import { addScrap, gainTrinket, heal, markOfferTaken, newPart, recordOffers, scrapOf } from './rewards';
import { spendHour } from './section';
import type { Family, Pending, Rarity, RunState, TradeItem } from './types';

export const UPGRADE_SCRAP: Record<string, number> = { common: 15, uncommon: 25, rare: 40, masterwork: 60, legendary: 80 };
export const REMOVE_SCRAP_BASE = 25;
export const REMOVE_SCRAP_STEP = 15;
export const PART_VALUE: Record<string, number> = { common: 20, uncommon: 35, rare: 60, masterwork: 100, legendary: 160 };
export const BUY_MARKUP = 1.25; // buying with Scrap alone costs value + 25%
export const OIL_SCRAP = 15;
export const OIL_HEAL = 15;
export const TRINKET_VALUE: Record<string, number> = { common: 60, uncommon: 90, rare: 120, boss: 120, masterwork: 160, legendary: 0 };
export const VAULT_SCRAP = 40;

const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'masterwork', 'legendary'];

/** Trader stock odds by act (docs/content.md section 1), in percent: common, uncommon, rare, masterwork. */
const TRADER_PARTS: Record<number, Partial<Record<Rarity, number>>> = {
  1: { common: 62, uncommon: 33, rare: 5 },
  2: { common: 46, uncommon: 38, rare: 14, masterwork: 2 },
  3: { common: 36, uncommon: 38, rare: 21, masterwork: 5 },
};
const TRADER_TRINKETS: Record<number, Partial<Record<Rarity, number>>> = {
  1: { common: 60, uncommon: 35, rare: 5 },
  2: { common: 40, uncommon: 45, rare: 15 },
  3: { common: 28, uncommon: 44, rare: 24, masterwork: 4 },
};


/** Gilded Cog: -20% on the Scrap you pay at a trader. */
const discount = (run: RunState): number => (run.trinkets.includes('gilded-cog') ? 0.8 : 1);

/** The Scrap price of a trader item when handing over a part worth `offered` (null: Scrap alone, value + 25%). */
export function barterPrice(run: RunState, item: TradeItem, offered: number | null): number {
  if (item.kind === 'oil') return traderPrice(run, Math.round(item.value * discount(run))); // B10b hook (modes-overwind): Overwind 1
  const base = offered === null ? Math.round(item.value * BUY_MARKUP) : Math.max(0, item.value - offered);
  return traderPrice(run, Math.round(base * discount(run))); // B10b hook (modes-overwind)
}

function pendingOf<K extends Pending['kind']>(run: RunState, kind: K): Extract<Pending, { kind: K }> | null {
  const p = run.pending;
  return p && p.kind === kind && run.phase === kind ? (p as Extract<Pending, { kind: K }>) : null;
}

const roomHere = (run: RunState) => run.section?.rooms.find((r) => r.id === run.roomId);

// Workbench
export function workbenchUpgrade(run: RunState, uid: number): boolean {
  const p = pendingOf(run, 'workbench');
  const part = run.bin.find((b) => b.uid === uid);
  if (!p || p.usedUpgrade || !part || part.plus) return false;
  const def = PARTS[part.defId];
  if (!def) return false;
  const cost = UPGRADE_SCRAP[def.rarity];
  if (scrapOf(run) < cost) return false;
  addScrap(run, -cost);
  part.plus = true;
  p.usedUpgrade = true;
  return true;
}

/** What removing a part costs now (+15 per use in a run). */
export function removeCost(run: RunState): number {
  return REMOVE_SCRAP_BASE + REMOVE_SCRAP_STEP * (run.stats.removals ?? 0);
}

export function workbenchRemove(run: RunState, uid: number): boolean {
  const p = pendingOf(run, 'workbench');
  if (!p || p.usedRemove || run.bin.length <= 1 || !run.bin.some((b) => b.uid === uid)) return false;
  const cost = removeCost(run);
  if (scrapOf(run) < cost) return false;
  addScrap(run, -cost);
  run.bin = run.bin.filter((b) => b.uid !== uid);
  run.stats.removals = (run.stats.removals ?? 0) + 1;
  p.usedRemove = true;
  return true;
}

/** Why two parts cannot fuse, or their family and the target rarity. */
function fuseInputs(run: RunState, a: number, b: number): { family: string; target: Rarity } | string {
  if (a === b) return 'Pick two different parts.';
  const pa = run.bin.find((x) => x.uid === a);
  const pb = run.bin.find((x) => x.uid === b);
  if (!pa || !pb) return 'Both parts must be in your bin.';
  const da = PARTS[pa.defId];
  const db = PARTS[pb.defId];
  if (!da || !db) return 'Those parts cannot be fused.';
  if (da.family !== db.family) return 'The parts must be of the same family.';
  if (da.rarity !== db.rarity) return 'The parts must be of the same rarity.';
  const i = RARITY_ORDER.indexOf(da.rarity);
  if (da.rarity === 'masterwork' || da.rarity === 'legendary' || i < 0) return 'Masterworks do not fuse any further.';
  return { family: da.family, target: RARITY_ORDER[i + 1] };
}

/** Two parts of the same family and rarity: the two candidate results (next rarity, same family; rolled from `reward`),
 * or the reason when fusing isn't possible. Rolled once per pair: asking again returns the same candidates. */
export function fuseCandidates(run: RunState, a: number, b: number): { candidates: string[] } | { reason: string } {
  const p = pendingOf(run, 'workbench');
  if (!p) return { reason: 'There is no workbench here.' };
  const inp = fuseInputs(run, a, b);
  if (typeof inp === 'string') return { reason: inp };
  const cached = p.fuse;
  if (cached && ((cached.a === a && cached.b === b) || (cached.a === b && cached.b === a))) return { candidates: cached.candidates.slice() };
  const open = eligible(null, run, { kind: 'part', tier: inp.target, family: inp.family as Family });
  if (open.length === 0) return { reason: 'Nothing here is ready yet.' };
  // content.md section 1 prefers parts sharing a role tag with an input; the data carries no role tags, so every unlocked
  // part of that family and rarity qualifies, shuffled by `reward`. Spectacles show a third candidate.
  const count = run.trinkets.includes('spectacles') ? 3 : 2;
  const candidates = shuffle(run.rng, 'reward', open).slice(0, count);
  p.fuse = { a, b, candidates };
  recordOffers(run, candidates, 'fuse');
  return { candidates: candidates.slice() };
}

/** Fuse two parts into candidate `pick`: both leave the bin, the result joins it. Free; once per visit. */
export function fuse(run: RunState, a: number, b: number, pick: number): boolean {
  const p = pendingOf(run, 'workbench');
  if (!p || p.usedFuse) return false;
  const res = fuseCandidates(run, a, b);
  if (!('candidates' in res) || !Number.isInteger(pick) || pick < 0 || pick >= res.candidates.length) return false;
  const id = res.candidates[pick];
  run.bin = run.bin.filter((x) => x.uid !== a && x.uid !== b);
  newPart(run, id);
  markOfferTaken(run, id, 'fuse');
  run.stats.fuses = (run.stats.fuses ?? 0) + 1;
  p.usedFuse = true;
  p.fuse = undefined;
  return true;
}

// Traders
/** Roll a trader's stock on entry (`shop` stream): 4 parts (5 with Spectacles), 1 trinket and oil, every item through the one
 * pool (pool.ts). The parts are recorded as offers (source 'trader'). A tier with nothing unlocked folds into the tier below;
 * Legendaries never appear. */
export function traderStock(run: RunState): TradeItem[] {
  const act = run.act;
  const stock: TradeItem[] = [];
  const chosen: string[] = [];
  const nParts = 4 + (run.trinkets.includes('spectacles') ? 1 : 0);
  for (let n = 0; n < nParts; n++) {
    const tier = rollTier(run, 'shop', TRADER_PARTS[act] ?? TRADER_PARTS[1]);
    let cand = foldDown(null, run, 'part', tier, (id) => !chosen.includes(id)).ids;
    if (cand.length === 0) cand = (['common', 'uncommon', 'rare'] as const).flatMap((t) => eligible(null, run, { kind: 'part', tier: t })).filter((id) => !chosen.includes(id));
    if (cand.length === 0) break;
    const id = pick(run.rng, 'shop', cand);
    chosen.push(id);
    stock.push({ kind: 'part', id, value: PART_VALUE[PARTS[id].rarity], sold: false });
  }
  recordOffers(run, chosen, 'trader');
  const ttier = rollTier(run, 'shop', TRADER_TRINKETS[act] ?? TRADER_TRINKETS[1]);
  let tc = foldDown(null, run, 'trinket', ttier).ids;
  if (tc.length === 0) tc = (['common', 'uncommon', 'rare'] as const).flatMap((t) => eligible(null, run, { kind: 'trinket', tier: t }));
  if (tc.length) {
    const t = pick(run.rng, 'shop', tc);
    stock.push({ kind: 'trinket', id: t, value: TRINKET_VALUE[TRINKETS[t].rarity], sold: false });
  }
  stock.push({ kind: 'oil', value: OIL_SCRAP, sold: false });
  return stock;
}

/** Buy stock item `index`, handing over part `offerUid` (worth its value) plus Scrap for the difference, or Scrap alone
 * (value + 25%) when offerUid is null. An offer worth more than the item is refused (no change is given). */
export function barter(run: RunState, index: number, offerUid: number | null): boolean {
  const p = pendingOf(run, 'trader');
  const item = p?.stock[index];
  if (!p || !item || item.sold) return false;
  let offered: number | null = null;
  let offer: RunState['bin'][number] | undefined;
  if (offerUid !== null && item.kind !== 'oil') {
    offer = run.bin.find((b) => b.uid === offerUid);
    const def = offer ? PARTS[offer.defId] : undefined;
    if (!offer || !def) return false;
    offered = PART_VALUE[def.rarity];
    if (offered > item.value) return false;
  }
  if (item.kind === 'trinket' && (!item.id || run.trinkets.includes(item.id))) return false;
  const cost = barterPrice(run, item, offered);
  if (scrapOf(run) < cost) return false;
  addScrap(run, -cost);
  if (offer) run.bin = run.bin.filter((b) => b.uid !== offer!.uid);
  if (item.kind === 'part' && item.id) {
    newPart(run, item.id);
    markOfferTaken(run, item.id, 'trader');
  } else if (item.kind === 'trinket' && item.id) {
    gainTrinket(run, item.id);
  } else if (item.kind === 'oil') {
    heal(run, oilHealFor(run, OIL_HEAL)); // B10b hook (modes-overwind)
  }
  item.sold = true;
  return true;
}

// Oil stations
function oilReady(run: RunState): Extract<Pending, { kind: 'oil' }> | null {
  const p = pendingOf(run, 'oil');
  if (!p || p.done || roomHere(run)?.used) return null;
  return p;
}
function useOil(run: RunState, p: Extract<Pending, { kind: 'oil' }>): void {
  p.done = true;
  const r = roomHere(run);
  if (r) r.used = true;
}

/** Rest: heal OIL_REST_PCT of max HP (balance.ts; 30 before B10c) (rounded down), 1 extra hour (elites step). Once per station. */
export function rest(run: RunState): boolean {
  const p = oilReady(run);
  if (!p) return false;
  heal(run, oilHealFor(run, Math.floor((run.maxHp * OIL_REST_PCT) / 100) + (run.trinkets.includes('sprocket-tag') ? 5 : 0))); // B10b hook (modes-overwind)
  spendHour(run);
  useOil(run, p);
  return true;
}

/** Polish: +4 max HP, no extra hour. Once per station (rest or polish). */
export function polish(run: RunState): boolean {
  const p = oilReady(run);
  if (!p) return false;
  run.maxHp += 4;
  useOil(run, p);
  return true;
}

/** B10a: use an Oil Flask (the Oil Merchant's gift): outside combat, in any room, heal 15 (never above max HP), no hour.
 * False in combat, with no flasks left, or at full HP. */
export function useOilFlask(run: RunState): boolean {
  if ((run.oilFlasks ?? 0) <= 0 || run.combat || run.phase === 'combat' || run.phase === 'victory' || run.phase === 'defeat' || run.hp >= run.maxHp) return false;
  run.oilFlasks -= 1;
  heal(run, oilHealFor(run, OIL_HEAL)); // B10b hook (modes-overwind)
  return true;
}

// Vaults
export interface VaultLoot {
  partId?: string;
  trinketId?: string; // a Masterwork or Legendary trinket instead of a part
  scrap: number;
  legendary: boolean;
}

/** Open the vault in the player's room (once), through the one pool: a Masterwork part or trinket (parts weighted to the act's
 * families) and 40 Scrap; a random unlocked Rare if no Masterwork is unlocked; in act 3 a Legendary (part or trinket) instead
 * when one is unlocked and none is held (it marks the run). Rolled from `reward`. Call it when the vault's guardian is beaten.
 * Returns null if there is nothing to take. */
export function takeVault(run: RunState): VaultLoot | null {
  const room = roomHere(run);
  if (!room || room.kind !== 'vault' || room.cleared) return null;
  type Pick = { id: string; trinket: boolean };
  let cand: Pick[] = [];
  let legendary = false;
  if (run.act === 3 && canTakeLegendary(run)) {
    cand = [...eligible(null, run, { kind: 'part', tier: 'legendary' }).map((id) => ({ id, trinket: false })), ...eligible(null, run, { kind: 'trinket', tier: 'legendary' }).map((id) => ({ id, trinket: true }))];
    legendary = cand.length > 0;
  }
  if (!legendary) {
    const parts = eligible(null, run, { kind: 'part', tier: 'masterwork' });
    const families: string[] = run.act === 1 ? ['gear', 'cam'] : run.act === 2 ? ['spring', 'steam'] : ['tempo', 'chime'];
    const weighted = parts.filter((id) => families.includes(PARTS[id].family));
    cand = [...(weighted.length ? weighted : parts).map((id) => ({ id, trinket: false })), ...eligible(null, run, { kind: 'trinket', tier: 'masterwork' }).map((id) => ({ id, trinket: true }))];
  }
  if (cand.length === 0) cand = foldDown(null, run, 'part', 'rare').ids.map((id) => ({ id, trinket: false }));
  if (cand.length === 0) return null;
  const got = cand[int(run.rng, 'reward', cand.length)];
  if (got.trinket) gainTrinket(run, got.id);
  else newPart(run, got.id);
  if (legendary) run.legendary = got.id;
  addScrap(run, VAULT_SCRAP);
  room.cleared = true;
  const byAct = (run.stats.vaultsByAct ??= [0, 0, 0]);
  byAct[run.act - 1] += 1;
  return { ...(got.trinket ? { trinketId: got.id } : { partId: got.id }), scrap: VAULT_SCRAP, legendary };
}
