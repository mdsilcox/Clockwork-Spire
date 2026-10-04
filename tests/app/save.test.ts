import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSettings, readSlot, resetSaveForTests, saveNotice, saveSettings, writeSlot } from '../../src/app/save';
import { newProfile } from '../../src/core/meta';
import type { SaveSlot } from '../../src/core/types';

const slot = (name: string): SaveSlot => ({ slot: 1, version: 1, profile: newProfile(name, '2026-10-04T12:00:00Z'), run: null, updatedAt: '2026-10-04T12:00:00Z' });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetSaveForTests();
});

describe('save fallbacks', () => {
  it('saves to IndexedDB with no notice when it works', async () => {
    resetSaveForTests();
    await writeSlot(slot('Ada'));
    const r = await readSlot(1);
    expect(r.state).toBe('ok');
    expect(saveNotice.value).toBe(false);
  });

  it('keeps an in-memory save and shows the notice when IndexedDB is unavailable (private mode)', async () => {
    vi.stubGlobal('indexedDB', undefined);
    resetSaveForTests();
    await writeSlot(slot('Bea'));
    expect(saveNotice.value).toBe(true);
    const r = await readSlot(1);
    expect(r.state).toBe('ok');
    if (r.state === 'ok') expect(r.slot.profile.name).toBe('Bea');
    await saveSettings({ version: 1, master: 0.5, music: 0.5, effects: 1, muted: false, speed: '1x', colorBlindIcons: false, reducedEffects: false });
    expect((await loadSettings())?.master).toBe(0.5);
  });

  it('falls back to memory when a write hits the storage quota, and reads see the newest save', async () => {
    resetSaveForTests();
    await writeSlot(slot('Old'));
    const quota = new DOMException('full', 'QuotaExceededError');
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw quota;
    });
    await writeSlot(slot('New'));
    expect(saveNotice.value).toBe(true);
    const r = await readSlot(1);
    expect(r.state).toBe('ok');
    if (r.state === 'ok') expect(r.slot.profile.name).toBe('New');
  });

  it('a read failure reports a corrupt or empty slot, never throws', async () => {
    vi.stubGlobal('indexedDB', undefined);
    resetSaveForTests();
    await expect(readSlot(2)).resolves.toEqual({ state: 'empty' });
  });
});
