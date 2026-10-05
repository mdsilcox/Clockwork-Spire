// The game's music: a synthesized loop for the Workshop, each act, the Clockmaker and the ending.
// Everything is built at runtime with Web Audio (oscillators, FM bells, filtered noise, plucked strings from a
// noise burst through a comb filter). Notes are scheduled with a lookahead timer, so timing never drifts.
// Tracks are generated from a key, a scale, a chord cycle and seeded melody phrases, so each runs 60 to 120 s
// before it repeats. Volumes and mute live in synth.ts (channels master, music, effects).
import type { Channel } from './synth';
import { getVolume, isMuted, isUnlocked, musicGraph, setMuted, setVolume, unlockAudio } from './synth';

export type TrackId = 'workshop' | 'bellfoot' | 'act1' | 'act2' | 'act3' | 'clockmaker' | 'ending';
export const TRACKS: TrackId[] = ['workshop', 'bellfoot', 'act1', 'act2', 'act3', 'clockmaker', 'ending'];

export const LOOKAHEAD = 0.1; // seconds scheduled ahead
export const TIMER_MS = 25;
export const CROSSFADE = 1.5; // seconds
const MAX_VOICES = 12;
export const TRACK_GAIN = 2; // the music's own level before the channel buses

// ---------- small helpers ----------

type Ctx = BaseAudioContext;

const midi = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
const mod = (n: number, m: number): number => ((n % m) + m) % m;

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Def {
  bpm: number;
  key: number; // midi note of the tonic
  scale: number[]; // 7 semitone offsets
  prog: number[]; // chord root degrees, one per bar, cycling
  bars: number; // length of the whole form
  seed: number; // melody seed (the ending shares the Workshop's, so it is the same theme)
  density: number[]; // chance of a melody note on each of the 8 steps of a bar
  lo: number; // melody range in scale degrees
  hi: number;
  reverb: number; // wet level
  reverbSecs: number;
}

const DEFS: Record<TrackId, Def> = {
  workshop: { bpm: 66, key: 57, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 3, 6, 0, 5, 6, 4], bars: 32, seed: 11, density: [0.75, 0.2, 0.5, 0.2, 0.65, 0.2, 0.5, 0.25], lo: 7, hi: 14, reverb: 0.3, reverbSecs: 2.2 },
  bellfoot: { bpm: 54, key: 55, scale: [0, 2, 4, 5, 7, 9, 10], prog: [0, 3, 5, 3, 0, 4, 5, 3], bars: 32, seed: 67, density: [0.45, 0.1, 0.3, 0.1, 0.4, 0.1, 0.25, 0.1], lo: 7, hi: 13, reverb: 0.5, reverbSecs: 3.2 },
  act1: { bpm: 104, key: 50, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 3, 5, 4, 0, 3, 6, 0], bars: 48, seed: 23, density: [0.8, 0.3, 0.55, 0.45, 0.7, 0.3, 0.55, 0.35], lo: 7, hi: 13, reverb: 0.18, reverbSecs: 1.4 },
  act2: { bpm: 112, key: 48, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 0, 5, 4, 0, 0, 6, 5], bars: 56, seed: 37, density: [0.7, 0.1, 0.35, 0.15, 0.55, 0.1, 0.4, 0.2], lo: 7, hi: 12, reverb: 0.22, reverbSecs: 1.8 },
  act3: { bpm: 70, key: 52, scale: [0, 2, 3, 5, 7, 9, 10], prog: [0, 3, 0, 4, 5, 3, 0, 4], bars: 36, seed: 41, density: [0.7, 0.1, 0.3, 0.15, 0.55, 0.1, 0.35, 0.15], lo: 7, hi: 15, reverb: 0.55, reverbSecs: 3.6 },
  clockmaker: { bpm: 92, key: 47, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 0, 5, 4, 0, 6, 5, 4], bars: 40, seed: 53, density: [0.5, 0.1, 0.3, 0.1, 0.45, 0.1, 0.3, 0.1], lo: 7, hi: 14, reverb: 0.4, reverbSecs: 2.8 },
  ending: { bpm: 56, key: 57, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 3, 6, 0, 5, 6, 4], bars: 32, seed: 11, density: [0.75, 0.2, 0.5, 0.2, 0.65, 0.2, 0.5, 0.25], lo: 7, hi: 14, reverb: 0.4, reverbSecs: 2.6 },
};

/** Seconds before the form repeats at the track's steady tempo. */
export function trackSeconds(id: TrackId): number {
  const d = DEFS[id];
  return (d.bars * 4 * 60) / d.bpm;
}

// ---------- the engine for one playing track ----------

export interface Engine {
  id: TrackId;
  ctx: Ctx;
  out: GainNode; // the track's own fade gain
  wet: GainNode; // reverb send input
  noise: AudioBuffer | null;
  voices: number[]; // end times of live voices
  nextTime: number;
  step: number;
  intensity: number;
  phrases: Map<number, (number | null)[]>;
  stopped: boolean;
  scheduled: number; // notes scheduled (for tests)
}

function degreeMidi(d: Def, degree: number): number {
  return d.key + d.scale[mod(degree, 7)] + 12 * Math.floor(degree / 7);
}

function phraseFor(e: Engine, id: number): (number | null)[] {
  const cached = e.phrases.get(id);
  if (cached) return cached;
  const d = DEFS[e.id];
  const r = rng(d.seed * 131 + id * 17);
  const out: (number | null)[] = [];
  let deg = d.lo + 2;
  for (let i = 0; i < 32; i++) {
    const hit = r() < d.density[i % 8] * (id === 1 ? 1.15 : 1);
    if (!hit) {
      out.push(null);
      continue;
    }
    const deltas = [-2, -1, -1, 0, 1, 1, 2];
    deg += deltas[Math.floor(r() * deltas.length)];
    if (deg > d.hi) deg -= 2;
    if (deg < d.lo) deg += 2;
    out.push(deg);
  }
  // resolve to the tonic or the fifth at the end of the phrase
  for (let i = 31; i >= 0; i--) {
    if (out[i] !== null) {
      out[i] = d.lo + (id === 1 ? 4 : 0) + (d.lo % 7 === 0 ? 0 : 0);
      break;
    }
  }
  e.phrases.set(id, out);
  return out;
}

function chordDegrees(d: Def, bar: number): number[] {
  const r = d.prog[bar % d.prog.length];
  return [r, r + 2, r + 4];
}

function snapToChord(d: Def, degree: number, bar: number): number {
  const ch = chordDegrees(d, bar);
  let best = degree;
  let bd = 99;
  for (let oct = -2; oct <= 3; oct++) {
    for (const c of ch) {
      const cand = c + oct * 7;
      const dist = Math.abs(cand - degree);
      if (dist < bd) {
        bd = dist;
        best = cand;
      }
    }
  }
  return best;
}

function canVoice(e: Engine, t: number, dur: number): boolean {
  let n = 0;
  for (let i = e.voices.length - 1; i >= 0; i--) {
    if (e.voices[i] <= t) e.voices.splice(i, 1);
    else n++;
  }
  if (n >= MAX_VOICES) return false;
  e.voices.push(t + dur);
  e.scheduled++;
  return true;
}

function sendTo(e: Engine, node: AudioNode, amount: number): void {
  if (amount <= 0.001) return;
  const g = e.ctx.createGain();
  g.gain.value = amount;
  node.connect(g);
  g.connect(e.wet);
}

function envelope(g: GainNode, t: number, peak: number, att: number, dur: number): void {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + Math.max(0.002, att));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

interface ToneOpts {
  att?: number;
  filter?: number; // lowpass cutoff
  q?: number;
  detune?: number;
  send?: number;
  slide?: number;
}

function tone(e: Engine, type: OscillatorType, freq: number, t: number, dur: number, peak: number, o: ToneOpts = {}): void {
  if (!canVoice(e, t, dur)) return;
  const c = e.ctx;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
  if (o.detune) osc.detune.value = o.detune;
  const g = c.createGain();
  envelope(g, t, peak, o.att ?? 0.01, dur);
  let node: AudioNode = osc;
  if (o.filter) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.filter;
    f.Q.value = o.q ?? 0.7;
    osc.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(e.out);
  sendTo(e, g, o.send ?? 0.15);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** A music-box or tubular bell: FM with a decaying modulation index. */
function bell(e: Engine, freq: number, t: number, dur: number, peak: number, ratio = 3.5, index = 1.6, send = 0.35): void {
  if (!canVoice(e, t, dur)) return;
  const c = e.ctx;
  const car = c.createOscillator();
  const mo = c.createOscillator();
  const mg = c.createGain();
  car.type = 'sine';
  mo.type = 'sine';
  car.frequency.value = freq;
  mo.frequency.value = freq * ratio;
  mg.gain.setValueAtTime(freq * index, t);
  mg.gain.exponentialRampToValueAtTime(Math.max(1, freq * 0.05), t + dur * 0.6);
  mo.connect(mg);
  mg.connect(car.frequency);
  const g = c.createGain();
  envelope(g, t, peak, 0.004, dur);
  car.connect(g);
  g.connect(e.out);
  sendTo(e, g, send);
  car.start(t);
  mo.start(t);
  car.stop(t + dur + 0.05);
  mo.stop(t + dur + 0.05);
}

/** A plucked string: a noise burst through a short feedback delay (comb) with a lowpass in the loop. */
function pluck(e: Engine, freq: number, t: number, dur: number, peak: number, send = 0.15): void {
  if (!e.noise) {
    tone(e, 'triangle', freq, t, dur * 0.6, peak, { send });
    return;
  }
  let f = freq;
  while (f > 300) f /= 2; // keeps the loop delay above the audio block size
  if (!canVoice(e, t, dur)) return;
  const c = e.ctx;
  const src = c.createBufferSource();
  src.buffer = e.noise;
  const delay = c.createDelay(0.1);
  delay.delayTime.value = 1 / f;
  const fb = c.createGain();
  fb.gain.value = 0.8;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  lp.Q.value = 0.3; // no resonant peak, so the loop gain stays under one
  const g = c.createGain();
  envelope(g, t, peak * 2, 0.002, dur);
  src.connect(delay);
  delay.connect(lp);
  lp.connect(fb);
  fb.connect(delay);
  lp.connect(g);
  g.connect(e.out);
  sendTo(e, g, send);
  src.start(t, 0, 0.02);
  src.stop(t + dur + 0.05);
}

/** A tick or click from a burst of filtered noise. */
function tick(e: Engine, t: number, peak: number, freq = 4500, dur = 0.025): void {
  if (!e.noise || !canVoice(e, t, dur)) return;
  const c = e.ctx;
  const src = c.createBufferSource();
  src.buffer = e.noise;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = freq;
  const g = c.createGain();
  envelope(g, t, peak, 0.001, dur);
  src.connect(f);
  f.connect(g);
  g.connect(e.out);
  src.start(t, 0.1, dur + 0.02);
  src.stop(t + dur + 0.03);
}

/** A wooden click: a short sine with a quick pitch drop. */
function wood(e: Engine, t: number, peak: number, freq = 900): void {
  tone(e, 'sine', freq, t, 0.05, peak, { slide: freq * 0.6, att: 0.001, send: 0.05 });
}

function thump(e: Engine, t: number, peak: number, freq = 110): void {
  tone(e, 'sine', freq, t, 0.22, peak, { slide: freq * 0.4, att: 0.004, send: 0.08 });
}

/** A swelling hiss of steam. */
function hiss(e: Engine, t: number, dur: number, peak: number): void {
  if (!e.noise || !canVoice(e, t, dur)) return;
  const c = e.ctx;
  const src = c.createBufferSource();
  src.buffer = e.noise;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.9;
  f.frequency.setValueAtTime(2200, t);
  f.frequency.exponentialRampToValueAtTime(6500, t + dur * 0.8);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(e.out);
  sendTo(e, g, 0.2);
  src.start(t);
  src.stop(t + dur + 0.05);
}

/** A soft pad: detuned oscillators through a lowpass, slow attack. */
function pad(e: Engine, type: OscillatorType, freqs: number[], t: number, dur: number, peak: number, cutoff: number, send = 0.4): void {
  if (!canVoice(e, t, dur)) return;
  const c = e.ctx;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  f.Q.value = 0.5;
  f.connect(g);
  g.connect(e.out);
  sendTo(e, g, send);
  for (const fr of freqs) {
    for (const det of [-7, 7]) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = fr;
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }
}

// ---------- the five tracks ----------

/** Seconds per eighth-note step at bar `bar`; the Clockmaker's pulse slows and speeds. */
function stepLen(e: Engine, bar: number): number {
  const d = DEFS[e.id];
  const base = 30 / d.bpm;
  if (e.id !== 'clockmaker') return base;
  const wob = 1 + 0.26 * Math.sin(bar * 0.9) + (e.intensity >= 2 ? -0.1 : 0);
  return base / wob;
}

function melodyNote(e: Engine, bar: number, pos: number): number | null {
  const d = DEFS[e.id];
  const section = Math.floor(bar / 8) % 4;
  const phraseId = section === 1 ? 1 : section === 3 ? 2 : 0;
  const phrase = phraseFor(e, phraseId);
  const deg = phrase[(bar % 4) * 8 + pos];
  if (deg === null || deg === undefined) return null;
  return midi(degreeMidi(d, pos === 0 ? snapToChord(d, deg, bar) : deg));
}

function scheduleStep(e: Engine, n: number, t: number, dt: number): void {
  const d = DEFS[e.id];
  const bar = Math.floor(n / 8) % d.bars;
  const pos = n % 8;
  const chord = chordDegrees(d, bar);
  const root = degreeMidi(d, chord[0]);
  const barLen = dt * 8;
  const section = Math.floor(bar / 8) % 4;
  const mel = melodyNote(e, bar, pos);
  switch (e.id) {
    case 'workshop':
    case 'ending': {
      const ending = e.id === 'ending';
      if (pos === 0) {
        pad(e, 'triangle', chord.map((c) => midi(degreeMidi(d, c) + 12)), t, barLen * 1.1, ending ? 0.02 : 0.025, 900);
        tone(e, 'sine', midi(root - 12), t, barLen * 0.45, 0.12, { send: 0.1 });
        if (section === 1) tone(e, 'sine', midi(degreeMidi(d, chord[0] + 4) - 12), t + barLen * 0.5, barLen * 0.3, 0.07, { send: 0.1 });
      }
      if (!ending && pos % 2 === 0) {
        if (pos % 4 === 0) tick(e, t, 0.05, 3800, 0.03);
        else wood(e, t, 0.035, 650);
      }
      if (mel) bell(e, mel, t, ending ? 2.4 : 1.6, ending ? 0.075 : 0.07, 4, 1.1, 0.4);
      break;
    }
    case 'bellfoot': {
      // the town at dusk: a slow pad, a soft low note, far bells, a hush of steam and the odd tick of a clock
      if (pos === 0) {
        pad(e, 'sine', chord.map((c) => midi(degreeMidi(d, c) + 12)), t, barLen * 1.2, 0.028, 1100, 0.5);
        tone(e, 'sine', midi(root - 12), t, barLen * 0.9, 0.09, { att: 0.15, send: 0.2 });
      }
      if (pos === 0 && bar % 4 === 2) hiss(e, t, barLen * 0.8, 0.035);
      if (pos === 4 && bar % 2 === 0) wood(e, t, 0.03, 700);
      if (mel) bell(e, mel, t, 2.6, 0.05, 3.5, 1.6, 0.55);
      break;
    }
    case 'act1': {
      if (pos % 2 === 0) tick(e, t, pos === 0 ? 0.07 : 0.045, 5000, 0.02);
      if (pos === 2 || pos === 6) wood(e, t, 0.06, 1100);
      if (pos === 0 || pos === 3 || pos === 4 || pos === 7) {
        const b = pos === 4 ? degreeMidi(d, chord[0] + 4) : root;
        pluck(e, midi(b - 12), t, dt * 3, 0.1);
      }
      if (mel) {
        if ((bar + pos) % 5 === 0) bell(e, mel, t, 1.0, 0.05, 3.1, 1.2, 0.25);
        else tone(e, 'triangle', mel, t, dt * 1.8, 0.06, { filter: 2400, send: 0.2 });
      }
      if (section === 2 && pos === 0) pad(e, 'sine', [midi(root), midi(root + 7)], t, barLen, 0.02, 700, 0.3);
      break;
    }
    case 'act2': {
      if (pos % 2 === 0) thump(e, t, pos === 0 ? 0.18 : 0.12, 90);
      const orn = [0, 0, 7, 0, 0, 7, 5, 0][pos];
      tone(e, 'sawtooth', midi(root - 12 + orn), t, dt * 0.85, 0.05, { filter: 650, q: 1.5, send: 0.1 });
      if (pos === 0 && bar % 2 === 0) pad(e, 'sawtooth', [midi(root), midi(root + 7)], t, barLen * 2, 0.018, 500, 0.3);
      if (pos === 0 && bar % 4 === 3) hiss(e, t, barLen * 0.95, 0.07);
      if (pos === 5 && (bar % 3 === 1)) tick(e, t, 0.09, 1800, 0.06);
      if (mel && section !== 0) tone(e, 'sawtooth', mel, t, dt * 1.8, 0.035, { filter: 1300, att: 0.03, send: 0.25 });
      break;
    }
    case 'act3': {
      if (pos === 0) {
        pad(e, 'sine', chord.map((c) => midi(degreeMidi(d, c) + 12)), t, barLen * 1.2, 0.03, 1500, 0.6);
        tone(e, 'sine', midi(root - 24), t, barLen * 1.1, 0.1, { att: 0.2, send: 0.2 });
      }
      if (mel) bell(e, mel, t, 3.2, 0.07, 3.5, 2.2, 0.7);
      if (pos === 0 || pos === 3 || pos === 6) {
        const c = chord[(pos / 3) | 0];
        bell(e, midi(degreeMidi(d, c + 7) + 12), t + dt * 0.5, 2.0, 0.025, 5.1, 0.8, 0.8);
      }
      break;
    }
    case 'clockmaker': {
      const k = e.intensity;
      // the ticking: accented, uneven because the tempo wobbles
      if (pos % 2 === 0) {
        tick(e, t, pos === 0 ? 0.1 : 0.07, 3200, 0.03);
        if (pos % 4 === 2) wood(e, t, 0.05, 520);
      }
      if (k >= 1 && pos % 2 === 1) tick(e, t, 0.04, 6000, 0.015);
      if (pos === 0) {
        tone(e, 'sine', midi(root - 24), t, barLen * 1.2, 0.12, { att: 0.15, send: 0.2 });
        if (k >= 1) pad(e, 'sawtooth', [midi(root - 12), midi(root - 5)], t, barLen * 1.3, 0.016, 420, 0.35);
        if (k >= 1 && bar % 2 === 1) hiss(e, t, barLen * 0.9, 0.05);
      }
      // the descending bell motif, every other bar
      if (pos % 2 === 0 && bar % 2 === 0) {
        const seq = bar % 4 < 2 ? [14, 12, 11, 9] : [13, 11, 9, 7];
        bell(e, midi(degreeMidi(d, seq[pos / 2]) + 0), t, 2.2 + k * 0.4, 0.07 + k * 0.02, 3.5, 2.0, 0.6);
      }
      if (k >= 2) {
        const orn = [0, 0, 7, 0, 5, 0, 7, 3][pos];
        tone(e, 'sawtooth', midi(root - 12 + orn), t, dt * 0.8, 0.045, { filter: 700, q: 2, send: 0.1 });
        if (pos % 2 === 0) thump(e, t, 0.14, 80);
      } else if (mel && k >= 1) {
        tone(e, 'triangle', mel, t, dt * 1.6, 0.04, { filter: 1800, send: 0.3 });
      }
      break;
    }
  }
}

function impulse(c: Ctx, secs: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * secs);
  const buf = c.createBuffer(2, len, c.sampleRate);
  const r = rng(99);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  return buf;
}

/** Build an engine whose output goes to `dest`. */
export function createEngine(ctx: Ctx, dest: AudioNode, noise: AudioBuffer | null, id: TrackId, intensity = 0): Engine {
  const d = DEFS[id];
  const out = ctx.createGain();
  out.gain.value = TRACK_GAIN;
  out.connect(dest);
  const wet = ctx.createGain();
  wet.gain.value = d.reverb;
  const conv = ctx.createConvolver();
  conv.buffer = impulse(ctx, d.reverbSecs);
  wet.connect(conv);
  conv.connect(out);
  return { id, ctx, out, wet, noise, voices: [], nextTime: ctx.currentTime + 0.05, step: 0, intensity, phrases: new Map(), stopped: false, scheduled: 0 };
}

/** Schedule every step that starts before `until`. Returns the start times it scheduled. */
export function scheduleUntil(e: Engine, until: number): number[] {
  const d = DEFS[e.id];
  const times: number[] = [];
  while (e.nextTime < until && !e.stopped) {
    const bar = Math.floor(e.step / 8) % d.bars;
    const dt = stepLen(e, bar);
    scheduleStep(e, e.step, e.nextTime, dt);
    times.push(e.nextTime);
    e.nextTime += dt;
    e.step++;
  }
  return times;
}

// ---------- the player: lookahead timer, crossfade, visibility ----------

export interface Deps {
  graph(): { ctx: BaseAudioContext; dest: AudioNode; noise: AudioBuffer | null } | null;
  muted(): boolean;
  hidden(): boolean;
  setInterval(fn: () => void, ms: number): number;
  clearInterval(id: number): void;
  setTimeout(fn: () => void, ms: number): number;
}

export interface Player {
  play(track: TrackId): void;
  stop(): void;
  setIntensity(n: number): void;
  current(): TrackId | null;
  /** Run one scheduler pass now (the timer calls this; tests call it with a fake clock). */
  tick(): void;
  engine(): Engine | null;
}

export function createPlayer(deps: Deps): Player {
  let want: TrackId | null = null;
  let active: Engine | null = null;
  let timer = 0;
  let intensity = 0;
  let wasHidden = false;

  const fadeOut = (e: Engine): void => {
    e.stopped = true;
    const t = e.ctx.currentTime;
    e.out.gain.cancelScheduledValues(t);
    e.out.gain.setValueAtTime(e.out.gain.value, t);
    e.out.gain.linearRampToValueAtTime(0, t + CROSSFADE);
    deps.setTimeout(() => {
      try {
        e.out.disconnect();
      } catch {
        /* already gone */
      }
    }, CROSSFADE * 1000 + 3500);
  };

  const start = (): void => {
    if (!want || (active && active.id === want)) return;
    const g = deps.graph();
    if (!g) return;
    const next = createEngine(g.ctx, g.dest, g.noise, want, intensity);
    const t = g.ctx.currentTime;
    next.out.gain.setValueAtTime(0.0001, t);
    next.out.gain.linearRampToValueAtTime(TRACK_GAIN, t + CROSSFADE);
    if (active) fadeOut(active);
    active = next;
    if (!timer) timer = deps.setInterval(tick, TIMER_MS);
  };

  function tick(): void {
    if (want && (!active || active.id !== want)) start();
    const e = active;
    if (!e || e.stopped) return;
    const now = e.ctx.currentTime;
    const hidden = deps.hidden();
    if (hidden || deps.muted()) {
      // nothing is scheduled while the page is hidden or muted; pick up from "now" afterwards
      wasHidden = true;
      return;
    }
    if (wasHidden) {
      e.nextTime = Math.max(e.nextTime, now + 0.05);
      wasHidden = false;
    }
    if (e.nextTime < now) e.nextTime = now + 0.02;
    scheduleUntil(e, now + LOOKAHEAD);
  }

  return {
    play(track) {
      want = track;
      start();
    },
    stop() {
      want = null;
      if (active) fadeOut(active);
      active = null;
      if (timer) deps.clearInterval(timer);
      timer = 0;
    },
    setIntensity(n) {
      intensity = Math.max(0, Math.min(2, Math.round(n)));
      if (active) active.intensity = intensity;
    },
    current: () => want,
    tick,
    engine: () => active,
  };
}

// ---------- the game's music, wired to synth.ts ----------

const player = createPlayer({
  graph: () => musicGraph(),
  muted: () => isMuted(),
  hidden: () => typeof document !== 'undefined' && document.hidden,
  setInterval: (fn, ms) => window.setInterval(fn, ms),
  clearInterval: (id) => window.clearInterval(id),
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
});

let gestureHooked = false;
function hookGesture(): void {
  if (gestureHooked || typeof window === 'undefined') return;
  gestureHooked = true;
  const go = (): void => {
    unlockAudio();
    player.play(player.current() ?? 'workshop');
    if (isUnlocked()) {
      for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.removeEventListener(ev, go, true);
    }
  };
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, go, true);
}

export const music = {
  /** Start (or crossfade to) a track. Before the first user gesture it waits for one. */
  play(track: TrackId): void {
    player.play(track);
    if (!isUnlocked()) hookGesture();
  },
  stop(): void {
    player.stop();
  },
  /** 0 to 2: the Clockmaker's phase. */
  setIntensity(n: number): void {
    player.setIntensity(n);
  },
  current(): TrackId | null {
    return player.current();
  },
  setVolume(channel: Channel, v: number): void {
    setVolume(channel, v);
  },
  setMuted(m: boolean): void {
    setMuted(m);
  },
};

/** The values `window.__game.audio` reports; the UI registers a getter that returns this. */
export function audioDebug(): { track: TrackId | null; volumes: Record<Channel, number>; muted: boolean } {
  return { track: player.current(), volumes: { master: getVolume('master'), music: getVolume('music'), effects: getVolume('effects'), ui: getVolume('ui') }, muted: isMuted() };
}


type Screen = 'title' | 'workshop' | 'bellfoot' | 'map' | 'combat' | 'ending';

/** Which track belongs to a screen. The title uses the Workshop's. */
export function trackFor(screen: Screen, act?: 1 | 2 | 3, enemyIds?: string[], _phase?: number): TrackId {
  void _phase;
  const actTrack: TrackId = act === 3 ? 'act3' : act === 2 ? 'act2' : 'act1';
  switch (screen) {
    case 'title':
    case 'workshop':
      return 'workshop';
    case 'bellfoot':
      return 'bellfoot';
    case 'ending':
      return 'ending';
    case 'combat':
      return enemyIds?.includes('clockmaker') ? 'clockmaker' : actTrack;
    default:
      return actTrack;
  }
}

/** The Clockmaker's phase (0-based) as an intensity level. */
export const intensityFor = (phase = 0): number => Math.max(0, Math.min(2, phase));

// ---------- offline rendering (for checks and tests) ----------

/** Render `seconds` of a track into an OfflineAudioContext and return its channel data. */
export async function renderOffline(track: TrackId, seconds: number, intensity = 0, sampleRate = 22050): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, Math.floor(sampleRate * seconds), sampleRate);
  const nb = ctx.createBuffer(1, Math.floor(sampleRate * 0.6), sampleRate);
  const nd = nb.getChannelData(0);
  const r = rng(5);
  for (let i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1;
  const bus = ctx.createGain();
  bus.gain.value = 0.6 * 0.8 * 0.4; // the music, master and base levels the live graph applies
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -8;
  lim.knee.value = 0;
  lim.ratio.value = 20;
  lim.attack.value = 0.002;
  lim.release.value = 0.12;
  bus.connect(lim);
  lim.connect(ctx.destination);
  const e = createEngine(ctx, bus, nb, track, intensity);
  scheduleUntil(e, seconds);
  const buf = await ctx.startRendering();
  return buf.getChannelData(0);
}
