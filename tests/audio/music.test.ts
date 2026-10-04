import { afterEach, describe, expect, it, vi } from 'vitest';
import { CROSSFADE, LOOKAHEAD, TIMER_MS, TRACKS, TRACK_GAIN, createEngine, createPlayer, scheduleUntil, trackFor, trackSeconds } from '../../src/audio/music';
import type { Deps, TrackId } from '../../src/audio/music';

// ---------- a fake AudioContext that records what is scheduled ----------

class FakeParam {
  value = 0;
  calls: [string, number, number][] = [];
  setValueAtTime(v: number, t: number): this {
    this.calls.push(['set', v, t]);
    this.value = v;
    return this;
  }
  linearRampToValueAtTime(v: number, t: number): this {
    this.calls.push(['linear', v, t]);
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number): this {
    this.calls.push(['exp', v, t]);
    return this;
  }
  setTargetAtTime(v: number, t: number): this {
    this.calls.push(['target', v, t]);
    this.value = v;
    return this;
  }
  cancelScheduledValues(): this {
    return this;
  }
}

class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  detune = new FakeParam();
  delayTime = new FakeParam();
  Q = new FakeParam();
  threshold = new FakeParam();
  knee = new FakeParam();
  ratio = new FakeParam();
  attack = new FakeParam();
  release = new FakeParam();
  type = '';
  buffer: unknown = null;
  loop = false;
  starts: number[] = [];
  connect(n: unknown): unknown {
    return n;
  }
  disconnect(): void {}
  start(t = 0): void {
    this.starts.push(t);
  }
  stop(): void {}
}

class FakeCtx {
  currentTime = 1;
  sampleRate = 44100;
  state = 'running';
  destination = new FakeNode();
  gains: FakeNode[] = [];
  nodes: FakeNode[] = [];
  private make(): FakeNode {
    const n = new FakeNode();
    this.nodes.push(n);
    return n;
  }
  createGain(): FakeNode {
    const n = this.make();
    this.gains.push(n);
    return n;
  }
  createOscillator = (): FakeNode => this.make();
  createBiquadFilter = (): FakeNode => this.make();
  createBufferSource = (): FakeNode => this.make();
  createDelay = (): FakeNode => this.make();
  createConvolver = (): FakeNode => this.make();
  createDynamicsCompressor = (): FakeNode => this.make();
  createBuffer(_ch: number, len: number): { getChannelData(): Float32Array } {
    const d = new Float32Array(Math.min(len, 4096));
    return { getChannelData: () => d };
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
}

const asCtx = (c: FakeCtx): BaseAudioContext => c as unknown as BaseAudioContext;
const noise = (): AudioBuffer => ({ getChannelData: () => new Float32Array(16) }) as unknown as AudioBuffer;
const dest = (): AudioNode => new FakeNode() as unknown as AudioNode;

function deps(ctx: FakeCtx, over: Partial<Deps> = {}): Deps & { timers: (() => void)[]; timeouts: number[] } {
  const timers: (() => void)[] = [];
  const timeouts: number[] = [];
  const d = dest();
  return {
    timers,
    timeouts,
    graph: () => ({ ctx: asCtx(ctx), dest: d, noise: noise() }),
    muted: () => false,
    hidden: () => false,
    setInterval: (fn) => {
      timers.push(fn);
      return timers.length;
    },
    clearInterval: () => {},
    setTimeout: (_fn, ms) => {
      timeouts.push(ms);
      return timeouts.length;
    },
    ...over,
  };
}

describe('every track builds and schedules', () => {
  for (const id of TRACKS) {
    it(`${id}: schedules notes, stays inside 12 voices, repeats after 60 to 140 s`, () => {
      const ctx = new FakeCtx();
      const e = createEngine(asCtx(ctx), dest(), noise(), id, id === 'clockmaker' ? 2 : 0);
      const times = scheduleUntil(e, 40);
      expect(times.length).toBeGreaterThan(30);
      expect(e.scheduled).toBeGreaterThan(30);
      expect(e.voices.length).toBeLessThanOrEqual(12);
      const secs = trackSeconds(id);
      expect(secs).toBeGreaterThanOrEqual(60);
      expect(secs).toBeLessThanOrEqual(140);
      for (const n of ctx.nodes) for (const t of n.starts) expect(Number.isFinite(t)).toBe(true);
    });
  }

  it('the ending is the Workshop theme: the same melody phrases, slower', () => {
    const phrases = (id: TrackId): ((number | null)[] | undefined)[] => {
      const e = createEngine(asCtx(new FakeCtx()), dest(), noise(), id);
      scheduleUntil(e, 120);
      return [e.phrases.get(0), e.phrases.get(1), e.phrases.get(2)];
    };
    const w = phrases('workshop');
    expect(w[0]!.some((n) => n !== null)).toBe(true);
    expect(phrases('ending')).toEqual(w);
    expect(phrases('act1')).not.toEqual(w);
    expect(trackSeconds('ending')).toBeGreaterThan(trackSeconds('workshop'));
  });
});

describe('the lookahead scheduler', () => {
  it('schedules only steps inside the lookahead window and never drifts', () => {
    const ctx = new FakeCtx();
    const d = deps(ctx);
    const p = createPlayer(d);
    p.play('act1');
    expect(d.timers.length).toBe(1);
    expect(TIMER_MS).toBe(25);
    const e = p.engine()!;
    const start = e.nextTime;
    const dt = 30 / 104;
    for (let i = 0; i < 400; i++) {
      p.tick();
      // the next unscheduled step is at or beyond the window, the one before it inside
      expect(e.nextTime).toBeGreaterThanOrEqual(ctx.currentTime + LOOKAHEAD);
      expect(e.nextTime - dt).toBeLessThan(ctx.currentTime + LOOKAHEAD + 1e-9);
      ctx.currentTime += TIMER_MS / 1000;
    }
    // after 10 s, step n is exactly where the grid says it should be
    expect(e.nextTime).toBeCloseTo(start + e.step * dt, 6);
  });

  it('does not schedule while muted or hidden, and resumes from now without a burst', () => {
    const ctx = new FakeCtx();
    let muted = true;
    let hidden = false;
    const p = createPlayer(deps(ctx, { muted: () => muted, hidden: () => hidden }));
    p.play('workshop');
    p.tick();
    expect(p.engine()!.step).toBe(0);
    muted = false;
    hidden = true;
    p.tick();
    expect(p.engine()!.step).toBe(0);
    hidden = false;
    ctx.currentTime = 60;
    p.tick();
    const e = p.engine()!;
    expect(e.step).toBeGreaterThan(0);
    expect(e.step).toBeLessThan(6);
  });

  it('the Clockmaker ticking speeds up and slows down', () => {
    const ctx = new FakeCtx();
    const e = createEngine(asCtx(ctx), dest(), noise(), 'clockmaker');
    const times = scheduleUntil(e, 60);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeGreaterThan(1.3);
  });

  it('intensity adds layers to the Clockmaker and is clamped to 0..2', () => {
    const count = (k: number): number => {
      const ctx = new FakeCtx();
      const e = createEngine(asCtx(ctx), dest(), noise(), 'clockmaker', k);
      scheduleUntil(e, 30);
      return e.scheduled;
    };
    expect(count(1)).toBeGreaterThan(count(0));
    expect(count(2)).toBeGreaterThan(count(1));
    const p = createPlayer(deps(new FakeCtx()));
    p.play('clockmaker');
    p.setIntensity(7);
    expect(p.engine()!.intensity).toBe(2);
    p.setIntensity(-3);
    expect(p.engine()!.intensity).toBe(0);
  });
});

describe('crossfade', () => {
  it('fades the new track in and the old one out over 1.5 s', () => {
    const ctx = new FakeCtx();
    const d = deps(ctx);
    const p = createPlayer(d);
    p.play('workshop');
    const first = p.engine()!;
    ctx.currentTime = 10;
    p.play('act2');
    const second = p.engine()!;
    expect(second.id).toBe('act2');
    expect(first.stopped).toBe(true);
    const fo = (first.out as unknown as FakeNode).gain.calls.filter((c) => c[0] === 'linear').pop()!;
    expect(fo[1]).toBe(0);
    expect(fo[2]).toBeCloseTo(10 + CROSSFADE, 6);
    const fi = (second.out as unknown as FakeNode).gain.calls.filter((c) => c[0] === 'linear').pop()!;
    expect(fi[1]).toBe(TRACK_GAIN);
    expect(fi[2]).toBeCloseTo(10 + CROSSFADE, 6);
    expect(d.timeouts.length).toBeGreaterThan(0); // the old track is disconnected later
  });

  it('playing the same track again does nothing, and stop fades out', () => {
    const ctx = new FakeCtx();
    const p = createPlayer(deps(ctx));
    p.play('act3');
    const e = p.engine();
    p.play('act3');
    expect(p.engine()).toBe(e);
    p.stop();
    expect(p.current()).toBeNull();
    expect(e!.stopped).toBe(true);
  });

  it('remembers the wanted track until audio is unlocked', () => {
    const ctx = new FakeCtx();
    let ready = false;
    const d = deps(ctx);
    const p = createPlayer({ ...d, graph: () => (ready ? deps(ctx).graph() : null) });
    p.play('workshop');
    expect(p.current()).toBe('workshop');
    expect(p.engine()).toBeNull();
    ready = true;
    p.tick();
    expect(p.engine()!.id).toBe('workshop');
  });
});

describe('track selection', () => {
  it('maps screens to tracks', () => {
    expect(trackFor('title')).toBe('workshop');
    expect(trackFor('workshop')).toBe('workshop');
    expect(trackFor('map', 1)).toBe('act1');
    expect(trackFor('map', 2)).toBe('act2');
    expect(trackFor('map', 3)).toBe('act3');
    expect(trackFor('combat', 2, ['steam-wraith'])).toBe('act2');
    expect(trackFor('combat', 3, ['clockmaker'])).toBe('clockmaker');
    expect(trackFor('ending')).toBe('ending');
  });
});

describe('volumes and mute (synth.ts)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('muted sets the master gain to 0 and channel volumes reach their buses', async () => {
    const made: FakeCtx[] = [];
    class AC extends FakeCtx {
      constructor() {
        super();
        made.push(this);
      }
    }
    vi.stubGlobal('window', { AudioContext: AC });
    vi.resetModules();
    const synth = await import('../../src/audio/synth');
    synth.unlockAudio();
    expect(made.length).toBe(1);
    const ctx = made[0];
    const master = ctx.gains[0];
    synth.setMuted(true);
    expect(master.gain.calls.some((c) => c[0] === 'target' && c[1] === 0)).toBe(true);
    synth.setMuted(false);
    expect(master.gain.calls.filter((c) => c[0] === 'target').pop()![1]).toBeGreaterThan(0);
    synth.setVolume('music', 0.25);
    expect(synth.getVolume('music')).toBe(0.25);
    expect(ctx.gains.some((g) => g.gain.calls.some((c) => c[0] === 'target' && c[1] === 0.25))).toBe(true);
    expect(synth.musicGraph()).not.toBeNull();
  });
});
