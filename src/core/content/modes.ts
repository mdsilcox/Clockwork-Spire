// The four modes (docs/rules.md 5.7, all *(tune)*). B10b.0 CONTRACT: the table as data; modes-overwind applies it through the
// `// B10b hook (modes-overwind)` points (src/core/difficulty.ts). Journeyman is the default and equals today's numbers.
import type { ModeDef } from '../defs';

export const MODES: ModeDef[] = [
  { id: 'apprentice', name: 'Apprentice', enemyHp: 80, enemyDamage: 75, hours: 14, oilHeal: 40, brass: 75, unlock: 'start' },
  { id: 'journeyman', name: 'Journeyman', enemyHp: 100, enemyDamage: 100, hours: 12, oilHeal: 30, brass: 100, unlock: 'start' },
  { id: 'master', name: 'Master', enemyHp: 115, enemyDamage: 115, hours: 11, oilHeal: 25, brass: 125, unlock: 'journeyman-win' },
  { id: 'clockwork', name: 'Clockwork', enemyHp: 130, enemyDamage: 125, hours: 10, oilHeal: 20, brass: 150, unlock: 'master-win' },
];

export const MODE_BY_ID: Record<string, ModeDef> = Object.fromEntries(MODES.map((m) => [m.id, m]));
export const DEFAULT_MODE = 'journeyman';
/** Modes open in a new profile. */
export const START_MODES = ['apprentice', 'journeyman'];
