// Autosave of the practice fight to IndexedDB (slot `practice`). Failures never break the game.
import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import { CELLS } from '../core/types';
import type { CombatState, RunState } from '../core/types';

interface Schema extends DBSchema {
  saves: { key: string; value: { slot: string; version: number; combat?: CombatState; run?: RunState; savedAt: number } };
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

// ---------- the run (slot `run`; B4 brings three slots) ----------

function looksLikeRun(r: unknown): r is RunState {
  const x = r as RunState | undefined;
  return !!x && typeof x.phase === 'string' && !!x.map && Array.isArray(x.map.nodes) && Array.isArray(x.bin) && typeof x.hp === 'number';
}

export async function saveRun(r: RunState): Promise<void> {
  try {
    const d = await db();
    await d.put('saves', { slot: 'run', version: VERSION, run: JSON.parse(JSON.stringify(r)), savedAt: 0 });
  } catch {
    /* saving is best effort */
  }
}

export async function loadRun(): Promise<RunState | null> {
  try {
    const d = await db();
    const row = await d.get('saves', 'run');
    return row && row.version === VERSION && looksLikeRun(row.run) ? row.run : null;
  } catch {
    return null;
  }
}

export async function clearRun(): Promise<void> {
  try {
    const d = await db();
    await d.delete('saves', 'run');
  } catch {
    /* nothing to clear */
  }
}
