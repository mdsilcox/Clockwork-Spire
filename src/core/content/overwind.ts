// The ten Overwind twists (docs/content.md section 9). B10b.0 CONTRACT: names and texts as data, plus the data of the
// Thirteenth Hour (twist 10's fourth Clockmaker phase). No engine change yet: modes-overwind applies each twist where its
// rule lives (`// B10b hook (modes-overwind)` in src/core/difficulty.ts) and wires the phase into the Clockmaker's frame.
import type { EnemyPartDef, OverwindTwistDef, WardenPhaseDef } from '../defs';

export const OVERWIND_TWISTS: OverwindTwistDef[] = [
  { level: 1, name: 'Loose Bolts', text: 'Traders charge 15% more.' },
  { level: 2, name: 'Short Days', text: 'Each act has 1 hour fewer.' },
  { level: 3, name: 'Thick Plates', text: 'Enemy parts have 20% more HP.' },
  { level: 4, name: 'Cold Joints', text: 'The first part you place each combat is Rusted until your next turn.' },
  { level: 5, name: 'Restless Elites', text: 'On every third hour spent, roaming elites step twice.' },
  { level: 6, name: 'Thin Oil', text: 'Oil stations and Oil Flasks heal half as much.' },
  { level: 7, name: 'Salvage Rot', text: 'You may keep only one salvaged part per combat; the rest scrap for 2 Scrap each.' },
  { level: 8, name: 'Wound Springs', text: 'Every enemy attack deals +2.' },
  { level: 9, name: 'The Warden Stirs', text: 'The Foreman and the Queen start with one extra part, picked from your plan as the Clockmaker\'s memory is.' },
  { level: 10, name: 'The Thirteenth Hour', text: 'The Clockmaker gains a fourth phase after Midnight, and Plating is lost at the start of each of his turns.' },
];

export const OVERWIND_BRASS_PER_LEVEL = 10; // percent

const keystone = (p: Omit<EnemyPartDef, 'rarity' | 'salvage' | 'keystone' | 'cadence'>): EnemyPartDef => ({
  ...p,
  rarity: 'rare',
  salvage: null, // the new parts pay Brass 4 like the rest of his parts and count for h-whole-clock
  keystone: true,
  cadence: 'every',
});

/** Overwind 10: the Clockmaker's fourth phase (data only; B10b.1 wires it). Midnight's core does not die: the phase change runs
 * as if its last keystone broke, the core re-seals behind these two keystones (Braced to 15 a turn), and at the start of each of
 * his turns the player's Plating is lost. When both break the core reopens at THIRTEENTH_CORE.hp, Braced to THIRTEENTH_CORE.bracedTo,
 * no Governor. The Hour Wheel and the Midnight Bell stay into this phase if standing; the Governor Frame retracts
 * (`lastPhase: 3` under Overwind 10). Markers use the existing bell and head-dial anchors until B11. */
export const THIRTEENTH_HOUR: WardenPhaseDef = {
  keystones: ['clock-thirteenth-chime', 'clock-hourless-dial'],
  parts: [
    keystone({ id: 'clock-thirteenth-chime', name: 'Thirteenth Chime', hp: 30, actions: [{ kind: 'pierce', amount: 18 }], anchor: 'the bell in his chest' }),
    keystone({ id: 'clock-hourless-dial', name: 'Hourless Dial', hp: 30, actions: [{ kind: 'rewind', amount: 3 }], anchor: 'the great wheel behind his head' }),
  ],
  beat: 'There is one more hour. I kept it for you.',
  action: { kind: 'rewind', amount: 2 }, // the phase action: he winds the hour back once more
  mood: 'phase',
  coreExposed: false, // the core re-seals behind the two keystones
};

export const THIRTEENTH_CORE = { hp: 40, bracedTo: 13, governor: false, plating: 'lost at the start of each of his turns' } as const;
export const THIRTEENTH_KEYSTONE_BRACED = 15;
