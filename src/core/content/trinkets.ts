// Trinket registry (docs/content.md "Trinkets"). B3 CONTRACT: ids, names, rarities and texts are fixed here.
// The `combat-hooks` lane adds combat hooks; the `run-core` lane reads ids for run-level effects (see briefs).
import type { CombatState } from '../types';

export type TrinketRarity = 'common' | 'uncommon' | 'rare' | 'boss' | 'masterwork' | 'legendary';

export interface TrinketDef {
  id: string;
  name: string;
  rarity: TrinketRarity;
  text: string;
  /** B9b: Masterwork and Legendary trinkets start locked; `unlock` is the achievement id that unlocks one (content.md section 7). */
  locked?: boolean;
  unlock?: string;
  /** Combat hooks (combat-hooks lane). All optional. */
  onCombatStart?(c: CombatState): void;
}

const list: TrinketDef[] = [
  { id: 'oilcloth', name: 'Oilcloth', rarity: 'common', text: 'Start each combat with 4 Plating.', onCombatStart: (c) => { c.plating += 4; } },
  { id: 'copper-wire', name: 'Copper Wire', rarity: 'common', text: 'The first part the Mainspring powers each tick gets Boost 1.' },
  { id: 'lucky-bolt', name: 'Lucky Bolt', rarity: 'common', text: '+20% Scrap from fights.' },
  { id: 'whetstone', name: 'Whetstone', rarity: 'common', text: 'Grit 1: every Strike +1.', onCombatStart: (c) => { c.playerStatuses.grit = (c.playerStatuses.grit ?? 0) + 1; } },
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
  { id: 'sprocket-tag', name: "Sprocket's Collar Tag", rarity: 'uncommon', text: 'When you skip a part reward, gain 12 Scrap (Sprocket fetched them). At each Oil station, heal 5 more.' },
  { id: 'clockwork-heart', name: 'Clockwork Heart', rarity: 'rare', text: '+8 max HP and heal 8.' },
  { id: 'spare-spring', name: 'Spare Spring', rarity: 'rare', text: "Every spring's release threshold is 1 lower (minimum 1)." },
  { id: 'mainspring-key', name: 'Mainspring Key', rarity: 'boss', text: '+1 tick every turn; hand size -1.' },
  { id: 'ember-coal', name: 'Ember Coal', rarity: 'boss', text: 'Boilers give +1 Pressure.' },
  { id: 'echo-chamber', name: 'Echo Chamber', rarity: 'boss', text: 'The first part to fire each turn fires with Echo.' },
  { id: 'brass-heart', name: 'Brass Heart', rarity: 'boss', text: '+15 max HP.' },
  // B9b: 4 Masterwork and 2 Legendary trinkets (docs/content.md section 5). B9b.0 CONTRACT: effects are no-ops until the lane
  // that owns each fills them (items-engine: Overrun Coupler and the Whistle's fetch; turn-tools: Foresight Dial, Two Left
  // Hands, the Inventor's Watch; progression: Tow Hook, a salvage effect). All locked until their achievement.
  { id: "overrun-coupler", name: "Overrun Coupler", rarity: "masterwork", locked: true, unlock: "m-drill", text: "Once per turn, a Strike that deals more than its target has left carries the excess to the next standing entry of your target order." },
  { id: "foresight-dial", name: "Foresight Dial", rarity: "masterwork", locked: true, unlock: "m-three-elites", text: "Intents are shown two enemy turns ahead (the second turn dimmed)." },
  { id: "two-left-hands", name: "Two Left Hands", rarity: "masterwork", locked: true, unlock: "m-bell3", text: "Two free swaps each turn, and a swap may trade a board part with a part in your hand." },
  { id: "tow-hook", name: "Tow Hook", rarity: "masterwork", locked: true, unlock: "m-wrecker", text: "Once per combat, when a core dies, its best standing part (highest rarity, then leftmost) is salvaged as if you had broken it." },
  { id: "inventors-watch", name: "The Inventor's Watch", rarity: "legendary", locked: true, unlock: "h-master-bare", text: "Once per combat, after a Run, wind back: everything returns to how it was before that Run, your hand and draw order included. Usable after a lost Run." },
  { id: "sprockets-whistle", name: "Sprocket's Whistle", rarity: "legendary", locked: true, unlock: "h-whole-clock", text: "At the start of each of your turns, Sprocket fetches: Pry 5 at the first living enemy, free. A part he breaks drops 1 extra Scrap." },
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
