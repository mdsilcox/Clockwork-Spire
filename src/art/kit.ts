// Helpers shared by the character modules (the maths of art/lib/rig.js, typed) and a default RigView for tests and tools.
import type { CharacterDef, Pose, RigView } from './types';

export const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const band = (x: number, x0: number, x1: number, soft: number): number => smooth(x0 - soft, x0 + soft, x) * smooth(x1 + soft, x1 - soft, x);

export const rad = (d: number): number => (d * Math.PI) / 180;

// One result tuple for every call: deform() runs this thousands of times per frame and always unpacks the result at
// once (`[x, y] = rot(...)`), so reusing it saves an allocation per bone per vertex. Never keep the returned array.
const OUT: [number, number] = [0, 0];

// Every vertex of a rig rotates by the same few bone angles each frame, so sin and cos are looked up in a small
// direct-mapped cache keyed by the angle (the same angle always lands in the same slot; a clash just recomputes).
const CACHE = 1024;
const cacheA = new Float64Array(CACHE).fill(NaN);
const cacheC = new Float64Array(CACHE);
const cacheS = new Float64Array(CACHE);

/** Rotate (x, y) about (px, py) by angle a, blended by the weight w. Returns a shared tuple: unpack it at once. */
export function rot(x: number, y: number, px: number, py: number, a: number, w: number): [number, number] {
  if (!w || !a) {
    OUT[0] = x;
    OUT[1] = y;
    return OUT;
  }
  const k = (a * 8192) & (CACHE - 1);
  if (cacheA[k] !== a) {
    cacheA[k] = a;
    cacheC[k] = Math.cos(a);
    cacheS[k] = Math.sin(a);
  }
  const c = cacheC[k];
  const s = cacheS[k];
  const dx = x - px;
  const dy = y - py;
  OUT[0] = x + w * (px + dx * c - dy * s - x);
  OUT[1] = y + w * (py + dx * s + dy * c - y);
  return OUT;
}

/**
 * The last step of every character module. Each mood gets a `mood` number (its index) so the moods are distinct
 * targets, not only distinct timelines; and pose() fills any live value it is not given from the mood's targets, so a
 * pose is computable without a hub (tests, tools). The hub always passes a full `live`, so this costs nothing there.
 */
export function finishDef(def: CharacterDef): CharacterDef {
  const moods: CharacterDef['moods'] = {};
  Object.keys(def.moods).forEach((name, i) => (moods[name] = { ...def.moods[name], mood: i }));
  const base = def.pose;
  return {
    ...def,
    moods,
    pose: (live, t, dt, state, mood, view) => base.call(def, live.mood === undefined ? { ...moods[mood], ...live } : live, t, dt, state, mood, view),
  };
}

/** A view without a hub behind it (unit tests, tools): no painting, so alpha is 0 and image is null. */
export function makeView(def: Pick<CharacterDef, 'weights' | 'deform'>, mood: string, state: Record<string, unknown>): RigView {
  return {
    mood,
    state,
    lastP: null,
    point: (x: number, y: number, P: Pose) => def.deform(x, y, def.weights(x, y), P),
    alpha: () => 0,
    image: null,
    sprites: {},
    layers: {},
  };
}
