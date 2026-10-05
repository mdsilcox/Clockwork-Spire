// Sprocket's collars (docs/content.md section 7 rewards). B10a: Sprocket's corner offers the earned ones; the chosen one is
// `profile.collar`, drawn as a band at the Sprocket rig's `collar` anchor.
import type { CollarDef } from '../defs';

export const COLLARS: CollarDef[] = [
  { id: 'red', name: 'Red collar', color: '#b23a2e' },
  { id: 'bell', name: 'Brass bell collar', color: '#c9a24a' },
  { id: 'dusk', name: 'Dusk collar', color: '#6a5a8c' },
];

export const COLLAR_BY_ID: Record<string, CollarDef> = Object.fromEntries(COLLARS.map((c) => [c.id, c]));
