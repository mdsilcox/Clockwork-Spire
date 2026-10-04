// One line per part family on what it works well with: drawn from how the families already interact, no new rules.
import { partDef } from '../core/content/parts';
import type { Family } from '../core/types';
import { FAMILY_LABEL } from '../render/palette';

export const FAMILY_HINT: Record<Family, string> = {
  gear: 'Works well with other Gears: motion passes along a long chain, and Boost carries down it.',
  spring: 'Works well with Tempo parts: more ticks mean more charge before the release.',
  cam: 'Works well with busy chains: Cams count how often things around them fire.',
  tempo: 'Works well with Springs and Cams: extra ticks give them more turns to fire.',
  steam: 'Works well with other Steam parts: build Pressure with Boilers, spend it with Pistons.',
  chime: 'Works well with Strikes: Chimes add statuses that make every hit count for more.',
};

/** "Spring part. Works well with ..." for a part id. */
export function familyHint(defId: string): string {
  try {
    const f = partDef(defId).family;
    return `${FAMILY_LABEL[f]} part. ${FAMILY_HINT[f]}`;
  } catch {
    return '';
  }
}
