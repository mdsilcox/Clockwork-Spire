// Act map generation (docs/rules.md 4.1). B3 CONTRACT: the run-core lane implements it.
import type { RngState } from './rng';
import type { ActMap } from './types';

/** Generate the map for an act from the `map` stream of `rng` (advances it). */
export function generateActMap(_rng: RngState, _act: 1 | 2 | 3): ActMap {
  throw new Error('B3: not implemented');
}
