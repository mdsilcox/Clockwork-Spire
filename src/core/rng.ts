// Seeded random streams (mulberry32). Pure: a stream is a uint32 state stored in `Record<RngStream, number>`.
// Nothing in src/core may use Math.random or Date.
import type { RngStream } from './types';

export type RngState = Record<RngStream, number>;

export const STREAMS: readonly RngStream[] = ['map', 'draw', 'enemy', 'reward', 'event', 'shop', 'meta'];

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mix(x: number): number {
  let t = (x + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

/** The starting state of one named stream for a run seed. */
export function split(seed: number, stream: RngStream): number {
  return mix(mix(seed >>> 0) ^ hashString(stream));
}

/** All streams for a seed. */
export function initStreams(seed: number): RngState {
  const out = {} as RngState;
  for (const s of STREAMS) out[s] = split(seed, s);
  return out;
}

/** Advance a stream and return a float in [0, 1). */
export function next(rng: RngState, stream: RngStream): number {
  const s = (rng[stream] + 0x6d2b79f5) >>> 0;
  rng[stream] = s;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** An integer in [0, n). */
export function int(rng: RngState, stream: RngStream, n: number): number {
  return Math.floor(next(rng, stream) * n);
}

export function pick<T>(rng: RngState, stream: RngStream, items: readonly T[]): T {
  return items[int(rng, stream, items.length)];
}

/** Returns a shuffled copy (Fisher-Yates). */
export function shuffle<T>(rng: RngState, stream: RngStream, items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = int(rng, stream, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
