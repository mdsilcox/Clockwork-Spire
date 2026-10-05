// src/art/geometry.ts is the part of each painted character the page knows before its module loads; it must match
// the module (rig-hub lane). Refresh with `npx tsx scripts/art-geometry.ts`.
import { describe, expect, it } from 'vitest';
import { GEOMETRY } from '../../src/art/geometry';
import { characterFor, hasCharacter, loadCharacter } from '../../src/art';
import { MANIFEST } from '../../src/art/manifest';

describe('art geometry table', () => {
  for (const id of Object.keys(GEOMETRY)) {
    it(`${id}: size, pad and anchors match the character module`, async () => {
      const def = await loadCharacter(id);
      expect(def, id).toBeTruthy();
      expect(characterFor(id)).toBe(def);
      expect(GEOMETRY[id].size).toEqual(def?.size);
      expect(GEOMETRY[id].pad).toEqual(def?.pad);
      expect(GEOMETRY[id].anchors).toEqual(def?.anchors);
    });
  }

  it('every manifest character has a loader and a geometry entry (scenes are not characters)', () => {
    for (const e of MANIFEST.filter((x) => x.id !== 'bellfoot')) {
      expect(hasCharacter(e.id), e.id).toBe(true);
      expect(GEOMETRY[e.id], e.id).toBeTruthy();
    }
  });
});
