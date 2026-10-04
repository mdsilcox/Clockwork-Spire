// Sprocket's voice and the ending's music box, all synthesized with Web Audio on the game's shared graph
// (the master volume, the effects channel and the limiter live in synth.ts). Silent while audio is muted or locked.
import { graph } from './synth';

export type Mood = 'idle' | 'happy' | 'celebrate' | 'comfort' | 'sleepy' | 'pet' | 'sniff' | 'run';

function env(gain: GainNode, t: number, peak: number, attack: number, dur: number): void {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

/** A pitched bark: a saw through a sweeping vowel filter, plus a breath of noise. */
export function arf(pitch = 1, delay = 0): void {
  const g = graph();
  if (!g) return;
  const { ctx, dest } = g;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(560 * pitch, t);
  o.frequency.exponentialRampToValueAtTime(330 * pitch, t + 0.13);
  const formant = ctx.createBiquadFilter();
  formant.type = 'bandpass';
  formant.Q.value = 4;
  formant.frequency.setValueAtTime(700, t);
  formant.frequency.exponentialRampToValueAtTime(1500, t + 0.07);
  formant.frequency.exponentialRampToValueAtTime(900, t + 0.14);
  const soft = ctx.createBiquadFilter();
  soft.type = 'lowpass';
  soft.frequency.value = 2600;
  const gain = ctx.createGain();
  env(gain, t, 0.5, 0.012, 0.17);
  o.connect(formant);
  formant.connect(soft);
  soft.connect(gain);
  gain.connect(dest);
  o.start(t);
  o.stop(t + 0.2);
  if (g.noise) {
    const n = ctx.createBufferSource();
    n.buffer = g.noise;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 2200;
    nf.Q.value = 1.2;
    const ng = ctx.createGain();
    env(ng, t, 0.05, 0.006, 0.08);
    n.connect(nf);
    nf.connect(ng);
    ng.connect(dest);
    n.start(t, 0.1);
    n.stop(t + 0.1);
  }
}

/** A soft, low "boof". */
export function boof(): void {
  const g = graph();
  if (!g) return;
  const { ctx, dest } = g;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(210, t);
  o.frequency.exponentialRampToValueAtTime(110, t + 0.18);
  const gain = ctx.createGain();
  env(gain, t, 0.35, 0.02, 0.24);
  o.connect(gain);
  gain.connect(dest);
  o.start(t);
  o.stop(t + 0.28);
  if (g.noise) {
    const n = ctx.createBufferSource();
    n.buffer = g.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const ng = ctx.createGain();
    env(ng, t, 0.12, 0.02, 0.2);
    n.connect(f);
    f.connect(ng);
    ng.connect(dest);
    n.start(t, 0.05);
    n.stop(t + 0.22);
  }
}

/** A long, sleepy sigh. */
export function sigh(): void {
  const g = graph();
  if (!g || !g.noise) return;
  const { ctx, dest } = g;
  const t = ctx.currentTime;
  const n = ctx.createBufferSource();
  n.buffer = g.noise;
  n.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.5;
  f.frequency.setValueAtTime(900, t);
  f.frequency.exponentialRampToValueAtTime(380, t + 1.1);
  const gain = ctx.createGain();
  env(gain, t, 0.16, 0.35, 1.2);
  n.connect(f);
  f.connect(gain);
  gain.connect(dest);
  n.start(t);
  n.stop(t + 1.25);
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(180, t + 0.1);
  o.frequency.exponentialRampToValueAtTime(110, t + 1.1);
  const og = ctx.createGain();
  env(og, t + 0.1, 0.07, 0.3, 1.0);
  o.connect(og);
  og.connect(dest);
  o.start(t + 0.1);
  o.stop(t + 1.2);
}

/** A little rising whine with a wobble. */
export function whine(): void {
  const g = graph();
  if (!g) return;
  const { ctx, dest } = g;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(620, t);
  o.frequency.linearRampToValueAtTime(980, t + 0.3);
  o.frequency.linearRampToValueAtTime(760, t + 0.6);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 9;
  const lg = ctx.createGain();
  lg.gain.value = 28;
  lfo.connect(lg);
  lg.connect(o.frequency);
  const gain = ctx.createGain();
  env(gain, t, 0.12, 0.08, 0.65);
  o.connect(gain);
  gain.connect(dest);
  o.start(t);
  lfo.start(t);
  o.stop(t + 0.7);
  lfo.stop(t + 0.7);
}

/** Happy panting: a few quick breathy bursts. */
export function pant(n = 4): void {
  const g = graph();
  if (!g || !g.noise) return;
  const { ctx, dest } = g;
  for (let i = 0; i < n; i++) {
    const t = ctx.currentTime + i * 0.14;
    const s = ctx.createBufferSource();
    s.buffer = g.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 3200;
    f.Q.value = 0.8;
    const gain = ctx.createGain();
    env(gain, t, 0.07, 0.02, 0.1);
    s.connect(f);
    f.connect(gain);
    gain.connect(dest);
    s.start(t, i * 0.05);
    s.stop(t + 0.12);
  }
}

/** Little paw taps on a wooden floor. */
export function pawTaps(n = 6, gap = 0.09): void {
  const g = graph();
  if (!g) return;
  const { ctx, dest } = g;
  for (let i = 0; i < n; i++) {
    const t = ctx.currentTime + i * gap + (i % 2) * 0.012;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220 + (i % 2) * 40, t);
    o.frequency.exponentialRampToValueAtTime(110, t + 0.04);
    const gain = ctx.createGain();
    env(gain, t, 0.12, 0.004, 0.05);
    o.connect(gain);
    gain.connect(dest);
    o.start(t);
    o.stop(t + 0.07);
  }
}

/** The collar tag: a few tiny metallic pings. */
export function jingle(): void {
  const g = graph();
  if (!g) return;
  const { ctx, dest } = g;
  [3300, 4200, 3700, 4600].forEach((f, i) => {
    const t = ctx.currentTime + i * 0.045;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const gain = ctx.createGain();
    env(gain, t, 0.05, 0.003, 0.22);
    o.connect(gain);
    gain.connect(dest);
    o.start(t);
    o.stop(t + 0.25);
  });
}

/** The sound Sprocket makes on entering a mood. */
export function playMood(mood: Mood): void {
  switch (mood) {
    case 'happy':
      arf(1.05);
      jingle();
      break;
    case 'celebrate':
      arf(1.1);
      arf(1.2, 0.22);
      jingle();
      break;
    case 'comfort':
      pawTaps(5, 0.1);
      whine();
      break;
    case 'sleepy':
      sigh();
      break;
    case 'pet':
      arf(1.15);
      pant(2);
      break;
    case 'sniff':
      pawTaps(3, 0.16);
      boof();
      break;
    case 'run':
      pawTaps(10, 0.07);
      break;
    default:
      break;
  }
}

/** Petting: a happy arf and a tag jingle. */
export function playPet(): void {
  arf(1.15);
  jingle();
}

// ---------- the ending's music box ----------

// A simple, slow melody in C major: [semitones above middle C, beats], 72 bpm.
const MELODY: [number, number][] = [
  [7, 1], [12, 1], [11, 1], [7, 1], [9, 1], [5, 2],
  [4, 1], [7, 1], [9, 1], [7, 1], [4, 1], [0, 2],
  [2, 1], [5, 1], [9, 1], [7, 1], [5, 1], [2, 2],
  [4, 1], [7, 1], [12, 1], [11, 1], [9, 1], [7, 3],
  [9, 1], [11, 1], [12, 1], [11, 1], [9, 1], [7, 2],
  [5, 1], [4, 1], [2, 1], [4, 1], [0, 4],
];

export interface MusicBox {
  stop(): void;
  seconds: number;
}

/** Start the music box. `stop` fades it out. */
export function musicBox(): MusicBox | null {
  const g = graph('effects');
  if (!g) return null;
  const { ctx, dest } = g;
  const bus = ctx.createGain();
  bus.gain.value = 0.9;
  bus.connect(dest);
  const beat = 60 / 72;
  let t = ctx.currentTime + 0.2;
  const start = t;
  for (const [semi, beats] of MELODY) {
    const f = 261.63 * Math.pow(2, semi / 12) * 2;
    for (const [mul, gn, dur] of [[1, 0.16, 1.6], [2, 0.05, 0.9], [4.1, 0.02, 0.4]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mul;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(gn, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gain);
      gain.connect(bus);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    t += beats * beat;
  }
  return {
    seconds: t - start,
    stop() {
      bus.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    },
  };
}
