// Enemy registry. Intent patterns are data. Sabotage targets are chosen by combat.ts when an intent is picked.
import type { EnemyDef } from '../defs';

const list: EnemyDef[] = [
  {
    id: 'dummy',
    name: 'Practice Dummy',
    act: 1,
    tier: 'normal',
    hp: 999,
    pattern: [{ kind: 'special', label: 'Waits' }],
  },
  {
    id: 'rust-mite',
    name: 'Rust Mite',
    act: 1,
    tier: 'normal',
    hp: 14,
    pattern: [
      { kind: 'attack', amount: 5, label: 'Attack 5' },
      { kind: 'attack', amount: 5, label: 'Attack 5' },
      { kind: 'sabotage', sabotage: 'rust', label: 'Rusts a part' },
    ],
  },
  {
    id: 'cog-rat',
    name: 'Cog Rat',
    act: 1,
    tier: 'normal',
    hp: 22,
    pattern: [
      { kind: 'attack', amount: 4, hits: 2, label: 'Attack 4 x2' },
      { kind: 'defend', amount: 5, label: 'Shell 5' },
    ],
  },
];

export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries(list.map((d) => [d.id, d]));

export function enemyDef(id: string): EnemyDef {
  const d = ENEMIES[id];
  if (!d) throw new Error(`Unknown enemy: ${id}`);
  return d;
}

/** Test support: register an extra enemy (used by testkit only). */
export function registerEnemy(def: EnemyDef): void {
  ENEMIES[def.id] = def;
}
