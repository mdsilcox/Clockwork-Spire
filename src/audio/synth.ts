// Web Audio synthesis for every sound in the game. Nothing is loaded from files.
// Starts on the first user gesture; muted under automation unless the page URL has ?sound=1.
// Graph: voices -> channel gain (effects / ui) -> master gain -> limiter -> destination.
import type { Family } from '../core/types';

export type Channel = 'master' | 'effects' | 'ui';

const FORCED = typeof location !== 'undefined' && /[?&]sound=1\b/.test(location.search);
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let limiter: DynamicsCompressorNode | null = null;
const bus: Partial<Record<Channel, GainNode>> = {};
let noiseBuf: AudioBuffer | null = null;
let muted = !FORCED && typeof navigator !== 'undefined' && navigator.webdriver === true;
const vol: Record<Channel, number> = { master: 0.8, effects: 1, ui: 1 };
const MASTER_BASE = 0.4;

// voice throttle: at most MAX_VOICES new voices in WINDOW seconds, so a big chain never turns to noise
const WINDOW = 0.06;
const MAX_VOICES = 14;
const recent: number[] = [];
let voices = 0;

export function setMuted(m: boolean): void {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : MASTER_BASE * vol.master, ctx.currentTime, 0.02);
}

export function isMuted(): boolean {
  return muted;
}

/** Channel volume, 0..1. Hook for the settings screen. */
export function setVolume(channel: Channel, v: number): void {
  const k = Math.max(0, Math.min(1, v));
  vol[channel] = k;
  if (!ctx || !master) return;
  if (channel === 'master') master.gain.setTargetAtTime(muted ? 0 : MASTER_BASE * k, ctx.currentTime, 0.02);
  else bus[channel]?.gain.setTargetAtTime(k, ctx.currentTime, 0.02);
}

export function getVolume(channel: Channel): number {
  return vol[channel];
}

/** For tests: has the graph been built, and what state is it in. */
export function status(): { built: boolean; state: string; muted: boolean; voices: number } {
  return { built: !!ctx, state: ctx?.state ?? 'none', muted, voices };
}

function build(): void {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -8;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;
  master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER_BASE * vol.master;
  master.connect(limiter);
  limiter.connect(ctx.destination);
  for (const ch of ['effects', 'ui'] as const) {
    const g = ctx.createGain();
    g.gain.value = vol[ch];
    g.connect(master);
    bus[ch] = g;
  }
  const len = Math.floor(ctx.sampleRate * 0.6);
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
}

/** Call from a user gesture. Safe to call many times. */
export function unlockAudio(): void {
  if (!ctx) {
    if (muted) return;
    build();
  }
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

function ready(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    if (!FORCED) return null; // before a gesture there is nothing to play on
    build();
  }
  if (!ctx || !master) return null;
  if (ctx.state === 'suspended') void ctx.resume();
  const now = ctx.currentTime;
  while (recent.length && recent[0] < now - WINDOW) recent.shift();
  if (recent.length >= MAX_VOICES) return null;
  recent.push(now);
  return ctx;
}

function out(ch: Channel): AudioNode | null {
  return ch === 'master' ? master : (bus[ch] ?? null);
}

/** For other synth modules (Sprocket's voice, the ending's music box): the shared context, a channel bus and the noise buffer. Null while muted or locked. */
export function graph(ch: Channel = 'effects'): { ctx: AudioContext; dest: AudioNode; noise: AudioBuffer | null } | null {
  const c = ready();
  const d = c ? out(ch) : null;
  return c && d ? { ctx: c, dest: d, noise: noiseBuf } : null;
}

function done(node: AudioScheduledSourceNode): void {
  voices++;
  node.onended = () => {
    voices--;
  };
}

/** A pitched voice with a short envelope. */
function tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number, delay = 0, ch: Channel = 'effects'): void {
  const c = ready();
  const dest = out(ch);
  if (!c || !dest) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + Math.min(0.01, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(dest);
  done(o);
  o.start(t);
  o.stop(t + dur + 0.03);
}

/** A filtered noise burst. */
function noise(dur: number, kind: BiquadFilterType, freq: number, q: number, gain: number, slideTo?: number, delay = 0, ch: Channel = 'effects'): void {
  const c = ready();
  const dest = out(ch);
  if (!c || !dest || !noiseBuf) return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = kind;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + Math.min(0.012, dur * 0.25));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(dest);
  done(s);
  s.start(t, Math.random() * 0.3);
  s.stop(t + dur + 0.03);
}

// ---------- parts firing ----------

/** The sound of a part firing; `step` raises the pitch a little along the chain. */
export function partFire(family: Family | string | null, step: number): void {
  const up = Math.pow(1.045, Math.min(12, step));
  switch (family) {
    case 'gear':
      tone(1150 * up, 0.035, 'triangle', 0.07);
      noise(0.025, 'highpass', 3500, 0.7, 0.03);
      break;
    case 'spring':
      tone(190 * up, 0.24, 'sine', 0.14, 380 * up);
      tone(380 * up, 0.18, 'sine', 0.05, 760 * up, 0.02);
      break;
    case 'cam':
      noise(0.04, 'bandpass', 1800, 1.4, 0.09);
      tone(430 * up, 0.07, 'triangle', 0.1, 250 * up);
      break;
    case 'tempo':
      tone(560 * up, 0.09, 'sine', 0.14, 400 * up);
      tone(240 * up, 0.05, 'triangle', 0.06);
      break;
    case 'steam':
      noise(0.28, 'bandpass', 3200 * up, 0.9, 0.09, 5000);
      break;
    case 'chime':
      tone(880 * up, 0.55, 'sine', 0.11);
      tone(1320 * up, 0.45, 'sine', 0.05, undefined, 0.01);
      tone(2200 * up, 0.25, 'sine', 0.025);
      break;
    default:
      tone(900 * up, 0.04, 'triangle', 0.06);
  }
}

/** A strike on an enemy, scaled by damage. Zero damage is a dull clank. */
export function strike(damage: number): void {
  if (damage <= 0) {
    tone(1900, 0.05, 'triangle', 0.05);
    return;
  }
  const k = Math.min(1, damage / 14);
  tone(210 - k * 90, 0.09 + k * 0.12, 'sine', 0.16 + k * 0.22, 55);
  noise(0.05 + k * 0.05, 'bandpass', 900 + k * 500, 1.1, 0.07 + k * 0.1);
  if (damage >= 9) tone(1250, 0.2, 'triangle', 0.06 * k, undefined, 0.01);
}

export function sweepHit(): void {
  noise(0.2, 'bandpass', 700, 0.8, 0.1, 2400);
}

export function plateClink(): void {
  tone(2400, 0.12, 'triangle', 0.07);
  tone(3300, 0.09, 'sine', 0.05, undefined, 0.012);
  tone(1500, 0.14, 'sine', 0.04, undefined, 0.02);
}

export function releaseSnap(): void {
  noise(0.08, 'highpass', 2200, 0.7, 0.14);
  tone(1100, 0.1, 'sine', 0.15, 180);
  tone(260, 0.18, 'triangle', 0.12, 120, 0.02);
}

export function pressureHiss(): void {
  noise(0.14, 'bandpass', 4200, 1, 0.05);
}

export function overpressure(): void {
  noise(0.6, 'lowpass', 2400, 0.7, 0.3, 200);
  tone(90, 0.5, 'sine', 0.35, 35);
  tone(1300, 0.3, 'triangle', 0.08, 300, 0.02);
}

export function enemyWhoosh(big = false): void {
  noise(big ? 0.5 : 0.34, 'bandpass', big ? 220 : 320, 1.3, big ? 0.22 : 0.16, big ? 2200 : 1700);
  if (big) tone(70, 0.5, 'sawtooth', 0.06, 45);
}

/** A strike on a boss: deeper, with a metallic ring. */
export function bossHit(damage: number): void {
  const k = Math.min(1, damage / 16);
  tone(95 - k * 25, 0.3 + k * 0.2, 'sine', 0.3 + k * 0.2, 38);
  noise(0.12, 'lowpass', 1200, 0.9, 0.14 + k * 0.1, 200);
  tone(520, 0.5, 'sine', 0.05 + k * 0.04, undefined, 0.01);
  tone(1130, 0.35, 'sine', 0.03, undefined, 0.01);
}

/** A boss fight begins: a low swell, a bell toll and a rising brass-like fifth. */
export function bossIntro(): void {
  tone(55, 1.6, 'sine', 0.3, 48);
  tone(110, 1.4, 'triangle', 0.1, 98);
  for (const [k, g] of [[1, 0.16], [2.76, 0.08], [5.4, 0.04]] as const) tone(146.8 * k, 1.8 / Math.sqrt(k), 'sine', g, undefined, 0.15);
  [196, 293.7, 392].forEach((f, i) => tone(f, 0.9, 'triangle', 0.07, f * 1.01, 0.5 + i * 0.18));
  noise(0.7, 'lowpass', 500, 0.8, 0.1, 1800, 0.1);
}

/** The player takes a hit. */
export function hitThud(amount = 4): void {
  const k = Math.min(1, amount / 14);
  tone(130, 0.22, 'sine', 0.26 + k * 0.2, 45);
  noise(0.12, 'lowpass', 700, 0.8, 0.12 + k * 0.1, 160);
}

export function statusSound(status: string): void {
  switch (status) {
    case 'scald':
      noise(0.22, 'bandpass', 4500, 1.2, 0.07);
      tone(700, 0.12, 'sine', 0.05, 1100);
      break;
    case 'cracked':
      noise(0.03, 'highpass', 4000, 0.7, 0.14);
      noise(0.03, 'highpass', 3000, 0.7, 0.12, undefined, 0.05);
      tone(2600, 0.06, 'triangle', 0.05, 1800, 0.02);
      break;
    case 'dazed':
      tone(620, 0.12, 'sine', 0.08, 540);
      tone(820, 0.12, 'sine', 0.08, 700, 0.1);
      tone(620, 0.14, 'sine', 0.06, 520, 0.2);
      break;
    case 'corroded':
      noise(0.3, 'lowpass', 500, 2, 0.1, 160);
      tone(210, 0.28, 'sine', 0.06, 130);
      break;
    case 'strength':
      tone(300, 0.2, 'sawtooth', 0.04, 480);
      break;
    default:
      tone(500, 0.08, 'sine', 0.05);
  }
}

export function statusTick(status: string): void {
  if (status === 'scald') noise(0.1, 'bandpass', 4200, 1, 0.05);
  else tone(1200, 0.04, 'triangle', 0.04);
}

export function shellUp(): void {
  tone(1700, 0.16, 'triangle', 0.08);
  tone(2500, 0.1, 'sine', 0.05, undefined, 0.02);
  noise(0.05, 'highpass', 3500, 0.7, 0.04);
}

export function buff(): void {
  tone(392, 0.16, 'triangle', 0.08);
  tone(587, 0.2, 'triangle', 0.08, undefined, 0.09);
}

export function summon(): void {
  tone(160, 0.2, 'sine', 0.2, 60);
  tone(300, 0.2, 'triangle', 0.08, 640, 0.06);
  noise(0.1, 'lowpass', 900, 1, 0.1, undefined, 0.16);
}

export function enemyDeath(): void {
  noise(0.4, 'lowpass', 2500, 0.8, 0.14, 200);
  for (let i = 0; i < 5; i++) tone(900 + Math.random() * 1600, 0.08, 'triangle', 0.05, undefined, 0.04 * i + 0.05);
  tone(150, 0.4, 'sine', 0.2, 50);
}

export function heal(): void {
  tone(660, 0.3, 'sine', 0.09);
  tone(880, 0.3, 'sine', 0.08, undefined, 0.09);
  tone(1320, 0.35, 'sine', 0.06, undefined, 0.18);
}

export function echo(): void {
  tone(1400, 0.1, 'sine', 0.06);
  tone(1400, 0.14, 'sine', 0.035, undefined, 0.11);
  tone(1400, 0.16, 'sine', 0.02, undefined, 0.22);
}

export function sabotage(kind: string): void {
  switch (kind) {
    case 'jam':
      tone(110, 0.16, 'triangle', 0.25, 55);
      noise(0.07, 'bandpass', 1400, 2, 0.14);
      tone(70, 0.4, 'sine', 0.12, 50, 0.1);
      break;
    case 'magnetize':
      tone(120, 0.6, 'sine', 0.12, 330);
      tone(124, 0.6, 'sine', 0.1, 340);
      break;
    case 'drain':
      noise(0.55, 'bandpass', 2600, 1.2, 0.12, 260);
      break;
    default: {
      // rust: a slow creak
      const c = ready();
      const dest = out('effects');
      if (!c || !dest) return;
      const t = c.currentTime;
      const o = c.createOscillator();
      const f = c.createBiquadFilter();
      const g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(95, t);
      o.frequency.linearRampToValueAtTime(70, t + 0.2);
      o.frequency.linearRampToValueAtTime(125, t + 0.5);
      f.type = 'lowpass';
      f.frequency.value = 650;
      f.Q.value = 6;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(f);
      f.connect(g);
      g.connect(dest);
      done(o);
      o.start(t);
      o.stop(t + 0.6);
    }
  }
}

/** A boss changes phase: a long gong and a low swell. */
export function phaseGong(clockmaker = false): void {
  if (clockmaker) {
    // glass cracking, then the clock running backwards
    noise(0.05, 'highpass', 5000, 0.7, 0.2);
    noise(0.05, 'highpass', 3500, 0.7, 0.16, undefined, 0.07);
    for (let i = 0; i < 8; i++) tone(1800 - i * 150, 0.05, 'triangle', 0.05, undefined, 0.15 + i * 0.05);
    tone(220, 1.2, 'sine', 0.1, 880, 0.2);
  }
  for (const [k, g] of [[1, 0.2], [2.76, 0.1], [5.4, 0.06], [8.9, 0.03]] as const) tone(98 * k, 2.0 / Math.sqrt(k), 'sine', g);
  tone(49, 1.4, 'sine', 0.2, 41);
  noise(0.3, 'lowpass', 900, 0.8, 0.1, 200);
}

/** The Clockmaker rewinds a part: a clock ticking backwards, falling in pitch. */
export function rewindTick(): void {
  for (let i = 0; i < 6; i++) {
    tone(1500 - i * 190, 0.05, 'triangle', 0.07, undefined, i * 0.07);
    noise(0.03, 'highpass', 4000, 0.7, 0.05, undefined, i * 0.07);
  }
  tone(520, 0.5, 'sine', 0.07, 180, 0.05);
}

/** The Momentum chain passes 10 (level 1) or 20 (level 2): a rising chime. */
export function chainChime(level: number): void {
  const notes = level >= 2 ? [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568] : [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    tone(f, 0.5, 'sine', 0.13, undefined, i * 0.07);
    tone(f * 2, 0.35, 'sine', 0.04, undefined, i * 0.07);
  });
  if (level >= 2) tone(130.8, 0.9, 'sine', 0.16);
}

export function click(): void {
  tone(520, 0.04, 'triangle', 0.05, undefined, 0, 'ui');
}

/** Victory: a rising chime sting. */
export function victory(): void {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.55, 'sine', 0.2, undefined, i * 0.13));
}

/** Defeat: a falling, winding-down sting. */
export function defeat(): void {
  [392, 311.13, 233.08, 174.61].forEach((f, i) => tone(f, 0.5, 'triangle', 0.25, f * 0.9, i * 0.2));
}

// Kept for the B1 controller: the stage now plays every event sound itself, so these do nothing.
/** @deprecated the stage plays part sounds on `power` events. */
export function tick(_step: number): void {
  void _step;
}
/** @deprecated the stage plays release sounds. */
export function chime(): void {}
/** @deprecated the stage plays strike and hit sounds. */
export function thud(): void {}

/** The audio hooks as one object: `audio.setVolume('effects', 0.5)`, `audio.muted = true`. */
export const audio = {
  setVolume,
  getVolume,
  status,
  unlock: unlockAudio,
  get muted(): boolean {
    return muted;
  },
  set muted(m: boolean) {
    setMuted(m);
  },
};
