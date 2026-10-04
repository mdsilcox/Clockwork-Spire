// Autosave of the practice fight to IndexedDB (slot `practice`). Failures never break the game.
import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import { CELLS } from '../core/types';
import type { CombatState, Profile, RunState, SaveSlot, Settings } from '../core/types';

interface Schema extends DBSchema {
  saves: { key: string; value: { slot: string; version: number; combat?: CombatState; run?: RunState; data?: unknown; raw?: unknown; savedAt: number } };
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

// ---------- save slots (B4): three SaveSlots, a settings record, and the B3 single run save migrated once ----------

export type SlotNo = 1 | 2 | 3;
export type SlotRead = { state: 'empty' } | { state: 'ok'; slot: SaveSlot } | { state: 'corrupt' };

const slotKey = (n: number): string => `slot-${n}`;

function looksLikeProfile(p: unknown): p is Profile {
  const x = p as Profile | undefined;
  return !!x && typeof x.name === 'string' && typeof x.brass === 'number' && Array.isArray(x.blueprints) && !!x.upgrades && Array.isArray(x.chassisUnlocked) && Array.isArray(x.history);
}

function looksLikeSlot(d: unknown): d is SaveSlot {
  const x = d as SaveSlot | undefined;
  return !!x && looksLikeProfile(x.profile) && (x.run === null || looksLikeRun(x.run)) && typeof x.updatedAt === 'string';
}

/** Read one slot. A record that does not parse is copied to `slot-N-corrupt` (never overwritten) and reported. */
export async function readSlot(n: SlotNo): Promise<SlotRead> {
  try {
    const d = await db();
    const row = await d.get('saves', slotKey(n));
    if (!row) return { state: 'empty' };
    if (row.version === VERSION && looksLikeSlot(row.data)) return { state: 'ok', slot: row.data };
    // keep what was there: the first copy is slot-N-corrupt, later ones get a number
    let key = `${slotKey(n)}-corrupt`;
    for (let i = 2; await d.get('saves', key); i++) key = `${slotKey(n)}-corrupt-${i}`;
    await d.put('saves', { slot: key, version: row.version, raw: row, savedAt: 0 });
    return { state: 'corrupt' };
  } catch {
    return { state: 'corrupt' };
  }
}

/** One write: the profile, the run in progress (or null) and the time. */
export async function writeSlot(slot: SaveSlot): Promise<void> {
  try {
    const d = await db();
    await d.put('saves', { slot: slotKey(slot.slot), version: VERSION, data: JSON.parse(JSON.stringify(slot)), savedAt: 0 });
  } catch {
    /* saving is best effort */
  }
}

export async function removeSlot(n: SlotNo): Promise<void> {
  try {
    const d = await db();
    await d.delete('saves', slotKey(n));
  } catch {
    /* nothing to delete */
  }
}

export async function loadSettings(): Promise<Settings | null> {
  try {
    const d = await db();
    const row = await d.get('saves', 'settings');
    const s = row?.data as Settings | undefined;
    return s && typeof s.master === 'number' ? s : null;
  } catch {
    return null;
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  try {
    const d = await db();
    await d.put('saves', { slot: 'settings', version: VERSION, data: s, savedAt: 0 });
  } catch {
    /* best effort */
  }
}
