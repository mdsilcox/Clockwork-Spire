// Bellfoot's place list, order and anchors (B10a.0 CONTRACT), shared by the street UI (bellfoot-ui) and the scene
// (bellfoot-scene, src/art/scenes/bellfoot.ts). Positions are in scene units: the street is SCENE_W wide and SCENE_H tall and
// scrolls sideways inside its own frame; the page never does.
import { RESIDENTS } from '../core/content/residents';

export const SCENE_W = 2400;
export const SCENE_H = 800;
/** The street's ground line (y of every anchor). */
export const GROUND_Y = 640;

export type PlaceId = 'gate' | 'workshop' | 'sprocket' | 'trophies' | 'archivist' | `stall-${string}` | 'clocktower';

export interface TownPlace {
  id: PlaceId;
  label: string;
  /** Anchor x in scene units. */
  x: number;
}

/** Fixed positions, left to right: gate, workshop, Sprocket's corner, the trophy shelf, the archivist, five stall slots, the clock tower door. */
const FIXED: Record<string, { label: string; x: number }> = {
  gate: { label: 'The Spire gate', x: 200 },
  workshop: { label: 'The Workshop', x: 520 },
  sprocket: { label: "Sprocket's corner", x: 840 },
  trophies: { label: 'The trophy shelf', x: 1160 },
  archivist: { label: 'The archivist', x: 1480 },
  clocktower: { label: 'The clock tower door', x: 2250 },
};
/** Stall slots in resident order (content/residents.ts), 120 apart. */
export const STALL_X0 = 1700;
export const STALL_STEP = 120;

/** The places of the street now: fixed ones plus one stall per resident living in Bellfoot, left to right. */
export function townPlaces(residents: string[]): TownPlace[] {
  const out: TownPlace[] = [];
  const fixed = (id: string): void => void out.push({ id: id as PlaceId, ...FIXED[id] });
  for (const id of ['gate', 'workshop', 'sprocket', 'trophies', 'archivist']) fixed(id);
  RESIDENTS.forEach((r, i) => {
    if (residents.includes(r.id)) out.push({ id: `stall-${r.id}`, label: `${r.name}'s stall`, x: STALL_X0 + i * STALL_STEP });
  });
  fixed('clocktower');
  return out;
}

/** Every place, in order, with a stall for every resident (the anchors the scene paints). */
export const ALL_PLACES: TownPlace[] = townPlaces(RESIDENTS.map((r) => r.id));

/** The anchor [x, y] of a place in scene units, or null for an unknown id. */
export function placeAnchor(id: string): [number, number] | null {
  const p = ALL_PLACES.find((q) => q.id === id);
  return p ? [p.x, GROUND_Y] : null;
}
