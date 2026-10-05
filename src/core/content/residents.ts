// The five residents (docs/content.md section 6; rules 5.4). B10a.0 CONTRACT: ids, names, event ids, choices and stall
// text are final; the `effect` patches are data until memory-core (B10a.1) applies them through `runConfigFor`.
import type { ResidentDef } from '../defs';

export const RESIDENTS: ResidentDef[] = [
  { id: 'oil-merchant', name: 'The Oil Merchant', eventId: 'oil-merchant', choice: 2, stall: 'Oil by the flask, for the long way up. Two on the house, every climb.', effect: { oilFlasks: 2 } },
  { id: 'apprentice', name: 'The Apprentice', eventId: 'apprentice', choice: 2, stall: 'A small bench, a smaller stool. One of your parts is already sharpened when you set out.', effect: { upgradedStarters: 1 } },
  { id: 'lamplighter', name: 'The Lamplighter', eventId: 'lamplighter', choice: 2, stall: 'He lights the way up. Every room is named before you walk in.', effect: { revealRooms: true } },
  { id: 'hour-ghost', name: 'The Hour Ghost', eventId: 'hour-ghost', choice: 2, stall: 'He sits beside the archivist and remembers what the clocks forgot.', effect: { loreAndBestiary: true } },
  { id: 'traders-cousin', name: "The Trader's Cousin", eventId: 'traders-cousin', choice: 1, stall: 'A cart of oddities, and a map to a second one in every act.', effect: { extraTraders: 1 } },
];

export const RESIDENT_BY_ID: Record<string, ResidentDef> = Object.fromEntries(RESIDENTS.map((r) => [r.id, r]));
