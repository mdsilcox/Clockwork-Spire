// Trinket registry (docs/content.md "Trinkets"). B3 CONTRACT: ids, names, rarities and texts are fixed here.
// The `combat-hooks` lane adds combat hooks; the `run-core` lane reads ids for run-level effects (see briefs).
import type { CombatState } from '../types';

export type TrinketRarity = 'common' | 'uncommon' | 'rare' | 'boss';

export interface TrinketDef {
  id: string;
  name: string;
  rarity: TrinketRarity;
  text: string;
  /** Combat hooks (combat-hooks lane). All optional. */
  onCombatStart?(c: CombatState): void;
}

const list: TrinketDef[] = [
  { id: 'oilcloth', name: 'Oilcloth', rarity: 'common', text: 'Start each combat with 4 Plating.' },
  { id: 'copper-wire', name: 'Copper Wire', rarity: 'common', text: 'The first part the Mainspring powers each tick gets Boost 1.' },
  { id: 'lucky-bolt', name: 'Lucky Bolt', rarity: 'common', text: '+20% Cogs from fights.' },
  { id: 'whetstone', name: 'Whetstone', rarity: 'common', text: 'Grit 1: every Strike +1.' },
  { id: 'tin-cup', name: 'Tin Cup', rarity: 'common', text: 'Heal 3 after each combat.' },
  { id: 'bellows', name: 'Bellows', rarity: 'common', text: 'Start each combat with 4 Pressure.' },
  { id: 'pressure-gauge', name: 'Pressure Gauge', rarity: 'common', text: 'You overpressure above 25 instead of 20.' },
  { id: 'brass-knuckles', name: 'Brass Knuckles', rarity: 'common', text: 'Your first Strike each turn deals +4.' },
  { id: 'grease-pot', name: 'Grease Pot', rarity: 'common', text: "Parts next to the Mainspring can't be Rusted." },
  { id: 'magnet-ward', name: 'Magnet Ward', rarity: 'common', text: 'The first Magnetize each combat fails.' },
  { id: 'feather-duster', name: 'Feather Duster', rarity: 'common', text: 'Once per combat, at the start of your turn, clear all Rust.' },
  { id: 'blueprint-scrap', name: 'Blueprint Scrap', rarity: 'common', text: '+1 Brass per floor this run.' },
  { id: 'pocket-watch', name: 'Pocket Watch', rarity: 'uncommon', text: 'Your first turn of each combat has 1 extra tick.' },
  { id: 'spectacles', name: "Inventor's Spectacles", rarity: 'uncommon', text: 'Part rewards offer one more choice.' },
  { id: 'extra-pocket', name: 'Extra Pocket', rarity: 'uncommon', text: '+1 placement on your first turn of each combat.' },
  { id: 'cracked-lens', name: 'Cracked Lens', rarity: 'uncommon', text: 'Cracked you apply lasts 1 more turn.' },
  { id: 'soot-mask', name: 'Soot Mask', rarity: 'uncommon', text: 'Scald you apply is +1.' },
  { id: 'counterweight', name: 'Counterweight', rarity: 'uncommon', text: 'Whenever a part adds a tick, Plate 3.' },
  { id: 'steam-locket', name: 'Steam Locket', rarity: 'uncommon', text: 'When you overpressure, Sweep 10.' },
  { id: 'hourglass', name: 'Hourglass', rarity: 'uncommon', text: 'From your 5th turn of a combat, +1 placement each turn.' },
  { id: 'gilded-cog', name: 'Gilded Cog', rarity: 'uncommon', text: 'Shop prices -20%.' },
  { id: 'sprocket-tag', name: "Sprocket's Collar Tag", rarity: 'uncommon', text: 'When you skip a part reward, gain 12 Cogs (Sprocket fetched them). At each Oil station, heal 5 more.' },
  { id: 'clockwork-heart', name: 'Clockwork Heart', rarity: 'rare', text: '+8 max HP and heal 8.' },
  { id: 'spare-spring', name: 'Spare Spring', rarity: 'rare', text: "Every spring's release threshold is 1 lower (minimum 1)." },
  { id: 'mainspring-key', name: 'Mainspring Key', rarity: 'boss', text: '+1 tick every turn; hand size -1.' },
  { id: 'ember-coal', name: 'Ember Coal', rarity: 'boss', text: 'Boilers give +1 Pressure.' },
  { id: 'echo-chamber', name: 'Echo Chamber', rarity: 'boss', text: 'The first part to fire each turn fires with Echo.' },
  { id: 'brass-heart', name: 'Brass Heart', rarity: 'boss', text: '+15 max HP.' },
];

export const TRINKETS: Record<string, TrinketDef> = Object.fromEntries(list.map((d) => [d.id, d]));

export function trinketDef(id: string): TrinketDef {
  const d = TRINKETS[id];
  if (!d) throw new Error(`Unknown trinket: ${id}`);
  return d;
}

/** Run-level trinkets: handled by run-core when gained or at run events (not combat hooks). */
export const RUN_LEVEL_TRINKETS = [
  'lucky-bolt',
  'tin-cup',
  'blueprint-scrap',
  'spectacles',
  'gilded-cog',
  'sprocket-tag',
  'clockwork-heart',
  'brass-heart',
  'mainspring-key', // hand size -1 is run-level (RunConfig/combat handSize); its +1 tick is a combat hook
] as const;
