// Autosave of the practice fight to IndexedDB (slot `practice`). Failures never break the game.
import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import { CELLS } from '../core/types';
import type { CombatState } from '../core/types';

interface Schema extends DBSchema {
  saves: { key: string; value: { slot: string; version: number; combat: CombatState; savedAt: number } };
}

const VERSION = 1;
let dbp: Promise<IDBPDatabase<Schema>> | null = null;

function db(): Promise<IDBPDatabase<Schema>> {
  dbp ??= openDB<Schema>('clockwork-spire', 1, {
    upgrade(d) {
      d.createObjectStore('saves', { keyPath: 'slot' });
    },
  });
  return dbp;
}

function looksValid(c: unknown): c is CombatState {
  const x = c as CombatState | undefined;
  return !!x && Array.isArray(x.board) && x.board.length === CELLS && typeof x.handSize === 'number' && Array.isArray(x.enemies) && typeof x.outcome === 'string';
}

export async function savePractice(c: CombatState): Promise<void> {
  try {
    const d = await db();
    await d.put('saves', { slot: 'practice', version: VERSION, combat: JSON.parse(JSON.stringify(c)), savedAt: 0 });
  } catch {
    /* saving is best effort */
  }
}

export async function loadPractice(): Promise<CombatState | null> {
  try {
    const d = await db();
    const row = await d.get('saves', 'practice');
    return row && row.version === VERSION && looksValid(row.combat) ? row.combat : null;
  } catch {
    return null;
  }
}
