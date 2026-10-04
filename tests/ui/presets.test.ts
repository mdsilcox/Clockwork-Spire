// Sandbox preset bins: every part exists, sizes are 12 to 16, and later acts add upgraded and rare parts.
import { describe, expect, it } from 'vitest';
import { PRESETS, presetBin, resolveBin } from '../../src/app/controller';

describe('sandbox presets', () => {
  it.each(PRESETS.map((p) => p.id))('%s: all parts exist and sizes grow by act within 12 to 16', (id) => {
    for (const act of [1, 2, 3]) {
      const ids = presetBin(id, act);
      expect(resolveBin(ids)).toHaveLength(ids.length); // nothing dropped
      expect(ids.length).toBeGreaterThanOrEqual(12);
      expect(ids.length).toBeLessThanOrEqual(16);
    }
    expect(presetBin(id, 2).some((x) => x.endsWith('+'))).toBe(true);
    expect(presetBin(id, 3).length).toBeGreaterThan(presetBin(id, 2).length);
  });
});
