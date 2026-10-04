import { describe, expect, it } from 'vitest';
import { POSES, drawEventScene, drawSprocket } from '../../src/render/sprocket';
import { musicBox, playMood, playPet } from '../../src/audio/sprocket';

/** A fake 2D context that records every call and assignment, so frames can be compared. */
function fakeCtx(log: string[]): CanvasRenderingContext2D {
  const store: Record<string | symbol, unknown> = {};
  const fmt = (v: unknown): string => (typeof v === 'number' ? v.toFixed(3) : typeof v === 'string' ? v : typeof v === 'boolean' ? String(v) : Array.isArray(v) ? `[${v.length}]` : 'obj');
  return new Proxy(store, {
    get(_t, k) {
      if (k in store) return store[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() {} });
      return (...a: unknown[]) => {
        log.push(`${String(k)}(${a.map(fmt).join(',')})`);
      };
    },
    set(_t, k, v) {
      store[k] = v;
      log.push(`${String(k)}=${fmt(v)}`);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

const frame = (pose: (typeof POSES)[number], t: number, size = 120): string[] => {
  const log: string[] = [];
  drawSprocket(fakeCtx(log), 100, 150, size, pose, t);
  return log;
};

describe('Sprocket drawing', () => {
  it('has all eight poses', () => {
    expect([...POSES].sort()).toEqual(['celebrate', 'comfort', 'happy', 'idle', 'pet', 'run', 'sleepy', 'sniff']);
  });

  for (const pose of POSES) {
    it(`draws the ${pose} pose at every time without error or NaN`, () => {
      for (const t of [0, 0.3, 0.7, 1.4, 1.9, 3.3, 5, 12.5]) {
        const log = frame(pose, t);
        expect(log.length).toBeGreaterThan(80);
        expect(log.some((l) => l.includes('NaN') || l.includes('Infinity'))).toBe(false);
      }
    });

    it(`draws the ${pose} pose identically for the same t`, () => {
      expect(frame(pose, 2.37)).toEqual(frame(pose, 2.37));
    });
  }

  it('changes over time and between poses', () => {
    expect(frame('idle', 0.2)).not.toEqual(frame('idle', 1.1));
    expect(frame('idle', 1)).not.toEqual(frame('sleepy', 1));
    expect(frame('happy', 1)).not.toEqual(frame('celebrate', 1));
  });

  it('scales with size and keeps small sizes valid', () => {
    for (const size of [32, 64, 120, 400]) {
      const log = frame('idle', 1, size);
      expect(log.some((l) => l.includes('NaN'))).toBe(false);
    }
  });

  it('draws the three event scenes', () => {
    for (const id of ['sprocket-blueprint', 'sprocket-pipe', 'sprocket-nap', 'unknown']) {
      const log: string[] = [];
      drawEventScene(fakeCtx(log), 320, 170, id, 1.2);
      expect(log.length).toBeGreaterThan(80);
      expect(log.some((l) => l.includes('NaN'))).toBe(false);
    }
  });
});

describe('Sprocket sounds', () => {
  it('are safe no-ops while audio is locked', () => {
    for (const p of POSES) expect(() => playMood(p)).not.toThrow();
    expect(() => playPet()).not.toThrow();
    expect(musicBox()).toBeNull();
  });
});
