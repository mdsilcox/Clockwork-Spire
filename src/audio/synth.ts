// A tiny Web Audio synth: a tick per pulse step, a chime on release, a thud on a hit.
// Nothing is loaded from files. Starts on the first user gesture and stays silent under automation.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = typeof navigator !== 'undefined' && navigator.webdriver === true;

export function setMuted(m: boolean): void {
  muted = m;
}

export function isMuted(): boolean {
  return muted;
}

/** Call from a user gesture. Safe to call many times. */
export function unlockAudio(): void {
  if (muted || ctx) {
    void ctx?.resume();
    return;
  }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);
}

function ready(): AudioContext | null {
  if (muted || !ctx || !master) return null;
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number, delay = 0): void {
  const c = ready();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** A mechanical tick; `step` raises the pitch a little along the chain. */
export function tick(step: number): void {
  tone(900 + step * 70, 0.05, 'square', 0.08);
}

export function chime(): void {
  tone(880, 0.5, 'sine', 0.18);
  tone(1318.5, 0.6, 'sine', 0.1, undefined, 0.04);
}

export function thud(): void {
  tone(140, 0.18, 'triangle', 0.35, 55);
}

export function click(): void {
  tone(520, 0.04, 'square', 0.05);
}
