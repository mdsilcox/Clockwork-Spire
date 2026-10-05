// The landmarks (docs/content.md section 6; rules 5.4): feats that change later runs. B10a.0 CONTRACT: ids, names, events and
// archivist text are final; the `effect` patches are data until memory-core (B10a.1) applies them in `generateSection`.
// Opened vaults are per act (`vault-1` to `vault-3`); the m-vaults reward grants `vault-1`.
import type { LandmarkDef } from '../defs';

export const LANDMARKS: LandmarkDef[] = [
  { id: 'lift', name: 'The repaired lift', eventId: 'lamplighter', act: 1, text: 'The Gearworks lift runs again: a shortcut from the entry to the middle of the section.', effect: { lift: true } },
  { id: 'vault-1', name: 'The opened vault (Gearworks)', eventId: 'vault-wheel', act: 1, text: 'The Gearworks vault stands open. Its guardian has stopped guarding.', effect: { knownVaults: [1] } },
  { id: 'vault-2', name: 'The opened vault (Steamworks)', eventId: 'vault-wheel', act: 2, text: 'The Steamworks vault stands open. Its guardian has stopped guarding.', effect: { knownVaults: [2] } },
  { id: 'vault-3', name: 'The opened vault (Belfry)', eventId: 'vault-wheel', act: 3, text: 'The Belfry vault stands open. Its guardian has stopped guarding.', effect: { knownVaults: [3] } },
  { id: 'beacon', name: 'The lit beacon', eventId: 'beacon', act: 3, text: 'The great lamp on the Belfry rim is lit. The patrols and the door are plain to see, and the night is a little longer.', effect: { beacon: true } },
];

export const LANDMARK_BY_ID: Record<string, LandmarkDef> = Object.fromEntries(LANDMARKS.map((l) => [l.id, l]));
