// Where an enemy's parts and core sit in its slot. ONE function decides this (nothing else may compute part positions).
// Desktop (tall slots): a ring of 44 px markers around the sprite, or, for a painted enemy, each marker on the painting's
// anchor for that part, nudged apart so the marker, its intent chip above and its HP below stay clear of the others.
// Phone (short slots): 28 px pips (40 px tap target) on the painting's anchors, each with its intent chip beside it, all
// kept above the name line and clear of each other; code-drawn enemies get the same pips spread over their sprite.
import { signal } from '@preact/signals';
import { enemyBar, enemyBody, machineGeometry, PIP } from './layout';
import type { Rect } from './layout';
import type { Geometry } from '../art/geometry';

export interface Anchor {
  x: number;
  y: number;
  /** Marker size (px). */
  size: number;
  /** Phone: which side of the pip its intent chip sits on. */
  side?: 'l' | 'r';
}

export interface Anchors {
  mode: 'ring' | 'phone';
  at: Record<string, Anchor>;
}

/** Marker size on the ring (the desktop). */
export const MARKER = 44;

/** The painting that fills a slot: its geometry (known before its module loads) and the stage rectangle of the whole rig frame (painting plus pad). */
export interface RigPlacement {
  def: Geometry;
  rect: { x: number; y: number; w: number; h: number };
}
let rigSource: ((slot: Rect) => RigPlacement | null) | null = null;
/** The stage registers who paints which slot. Components that call partAnchors in render subscribe to `rigAnchorsEpoch`. */
export function setRigSource(fn: ((slot: Rect) => RigPlacement | null) | null): void {
  rigSource = fn;
}
/** Bumped by the stage whenever a slot's painted-or-not state changes, so markers re-place themselves. */
export const rigAnchorsEpoch = signal(0);

interface P {
  x: number;
  y: number;
}

/** Where a painting's anchors fall on the stage (rest pose). */
function paintedTargets(rig: RigPlacement, ids: string[]): P[] {
  const { def, rect } = rig;
  const WW = def.size[0] + 2 * def.pad[0];
  const WH = def.size[1] + 2 * def.pad[1];
  return ids.map((id) => {
    const a = def.anchors[id] ?? def.anchors.core;
    return { x: rect.x + ((a[0] + def.pad[0]) / WW) * rect.w, y: rect.y + ((a[1] + def.pad[1]) / WH) * rect.h };
  });
}

// ---------- desktop ring ----------

// A marker with the intent chip above it and the HP below it, as a box around the marker's center.
const HALF_W = 34; // the chip can be wider than the marker
const UP = MARKER / 2 + 46;
const DOWN = MARKER / 2 + 18;

const ringClash = (a: P, b: P): boolean => {
  const m = MARKER / 2;
  const box = (p: P) => ({ l: p.x - HALF_W, r: p.x + HALF_W, t: p.y - UP, b: p.y + DOWN });
  const hit = (m1: P, o: ReturnType<typeof box>) => m1.x + m > o.l - 1 && m1.x - m < o.r + 1 && m1.y + m > o.t - 1 && m1.y - m < o.b + 1;
  return hit(a, box(b)) || hit(b, box(a));
};

/** Painted ring: the painting's anchors as targets, pushed apart and kept inside the slot. Null when it cannot be made to fit. */
function paintedRing(slot: Rect, partIds: string[], rig: RigPlacement): Record<string, Anchor> | null {
  const ids = [...partIds, 'core'];
  const bar = enemyBar(slot, partIds.length);
  const minX = slot.x + HALF_W;
  const maxX = slot.x + slot.w - HALF_W;
  const minY = slot.y + UP;
  const maxY = bar.y - 3 - DOWN;
  if (maxX < minX || maxY < minY) return null;
  const pos = paintedTargets(rig, ids).map((t) => ({ x: Math.min(maxX, Math.max(minX, t.x)), y: Math.min(maxY, Math.max(minY, t.y)) }));
  for (let iter = 0; iter < 200; iter++) {
    let moved = false;
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        if (!ringClash(pos[i], pos[j])) continue;
        moved = true;
        const dx = pos[j].x - pos[i].x || (j % 2 ? 1 : -1) * 0.01;
        const dy = pos[j].y - pos[i].y || 0.01;
        const needX = HALF_W + MARKER / 2 - Math.abs(dx);
        const needY = (dy > 0 ? UP : DOWN) + MARKER / 2 - Math.abs(dy);
        if (needX < needY) {
          const s = Math.sign(dx) * (needX / 2 + 0.5);
          pos[i].x -= s;
          pos[j].x += s;
        } else {
          const s = Math.sign(dy) * (needY / 2 + 0.5);
          pos[i].y -= s;
          pos[j].y += s;
        }
        for (const p of [pos[i], pos[j]]) {
          p.x = Math.min(maxX, Math.max(minX, p.x));
          p.y = Math.min(maxY, Math.max(minY, p.y));
        }
      }
    }
    if (!moved) break;
  }
  for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) if (ringClash(pos[i], pos[j])) return null;
  const out: Record<string, Anchor> = {};
  ids.forEach((id, i) => (out[id] = { x: pos[i].x, y: pos[i].y, size: MARKER }));
  return out;
}

// ---------- phone pips ----------

const HALF = PIP / 2;
/** Room reserved for an intent chip beside its pip. */
const CHIP = 42;
const GAP = 2;
const UNIT_W = PIP + GAP + CHIP;

/** The box a pip and its chip take: the chip goes on the inner side (toward the slot's middle). */
function unitBox(p: P, slot: Rect): { l: number; r: number; t: number; b: number; side: 'l' | 'r' } {
  const side: 'l' | 'r' = p.x < slot.x + slot.w / 2 ? 'r' : 'l';
  return side === 'r' ? { l: p.x - HALF, r: p.x + HALF + GAP + CHIP, t: p.y - HALF, b: p.y + HALF, side } : { l: p.x - HALF - GAP - CHIP, r: p.x + HALF, t: p.y - HALF, b: p.y + HALF, side };
}

function pipPositions(slot: Rect, targets: P[]): { pos: P[]; side: ('l' | 'r')[] } {
  const bar = enemyBar(slot, targets.length - 1);
  const minX = slot.x + HALF;
  const maxX = slot.x + slot.w - HALF;
  const minY = slot.y + HALF + 1;
  const maxY = bar.y - 3 - HALF;
  const clamp = (p: P): P => ({ x: Math.min(maxX, Math.max(minX, p.x)), y: Math.min(maxY, Math.max(minY, p.y)) });
  const sides = (pos: P[]): ('l' | 'r')[] => pos.map((p) => unitBox(p, slot).side);
  // keep the chip inside the slot: a pip on the left half has its chip to its right, so its x is bounded by the chip
  const fit = (p: P): P => {
    const side = unitBox(p, slot).side;
    const q = clamp(p);
    if (side === 'r') q.x = Math.min(q.x, slot.x + slot.w - 2 - CHIP - GAP - HALF);
    else q.x = Math.max(q.x, slot.x + 2 + CHIP + GAP + HALF);
    return q;
  };
  const hit = (a: P, b: P): boolean => {
    const A = unitBox(a, slot);
    const B = unitBox(b, slot);
    return A.l < B.r + 1 && B.l < A.r + 1 && A.t < B.b + 1 && B.t < A.b + 1;
  };
  const pos = targets.map(fit);
  for (let iter = 0; iter < 200; iter++) {
    let moved = false;
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        if (!hit(pos[i], pos[j])) continue;
        moved = true;
        const dy = pos[j].y - pos[i].y || (j % 2 ? 1 : -1) * 0.01;
        const dx = pos[j].x - pos[i].x || 0.01;
        const needY = PIP + 2 - Math.abs(dy);
        const needX = UNIT_W + 2 - Math.abs(dx);
        if (needY <= needX) {
          const s = Math.sign(dy) * (needY / 2 + 0.5);
          pos[i].y -= s;
          pos[j].y += s;
        } else {
          const s = Math.sign(dx) * (needX / 2 + 0.5);
          pos[i].x -= s;
          pos[j].x += s;
        }
        pos[i] = fit(pos[i]);
        pos[j] = fit(pos[j]);
      }
    }
    if (!moved) break;
  }
  let ok = true;
  for (let i = 0; i < pos.length && ok; i++) for (let j = i + 1; j < pos.length; j++) if (hit(pos[i], pos[j])) ok = false;
  if (ok) return { pos, side: sides(pos) };
  // fallback: two columns (the left pips take their chip on the right, the right pips on the left), rows in target order
  const order = targets.map((t, i) => ({ t, i })).sort((a, b) => a.t.y - b.t.y || a.t.x - b.t.x);
  const cols = slot.w - 4 >= 2 * UNIT_W ? 2 : 1;
  const rows = Math.ceil(targets.length / cols);
  const out: P[] = new Array<P>(targets.length);
  order.forEach(({ i }, k) => {
    const c = cols === 2 ? k % 2 : 0;
    const r = Math.floor(k / cols);
    const y = rows === 1 ? (minY + maxY) / 2 : minY + ((maxY - minY) * r) / (rows - 1);
    const x = cols === 2 ? (c === 0 ? minX + 1 : maxX - 1) : minX + 1;
    out[i] = { x, y };
  });
  return { pos: out, side: sides(out) };
}

/** Phone pips: on the painting's anchors, or spread over the code-drawn sprite. */
function phonePips(slot: Rect, partIds: string[], rig: RigPlacement | null): Record<string, Anchor> {
  const ids = [...partIds, 'core'];
  let targets: P[];
  if (rig) targets = paintedTargets(rig, ids);
  else {
    const b = enemyBody(slot, partIds.length);
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const n = partIds.length;
    targets = [
      ...partIds.map((_, i) => {
        const deg = n === 2 ? -125 + i * 70 : -90 + (360 / n) * i;
        const a = (deg * Math.PI) / 180;
        return { x: cx + Math.cos(a) * b.w * 0.45, y: cy + Math.sin(a) * b.h * 0.4 };
      }),
      { x: cx, y: cy },
    ];
  }
  const { pos, side } = pipPositions(slot, targets);
  const out: Record<string, Anchor> = {};
  ids.forEach((id, i) => (out[id] = { x: pos[i].x, y: pos[i].y, size: PIP, side: side[i] }));
  return out;
}

export function partAnchors(slot: Rect, partIds: string[]): Anchors {
  void rigAnchorsEpoch.value; // markers re-render when a painting comes or goes
  const n = partIds.length;
  if (n === 0) {
    const b = enemyBody(slot);
    return { mode: 'ring', at: { core: { x: b.x + b.w / 2, y: b.y + b.h / 2, size: MARKER } } };
  }
  const g = machineGeometry(slot, n);
  const rig = rigSource ? rigSource(slot) : null;
  if (g.mode === 'phone') return { mode: 'phone', at: phonePips(slot, partIds, rig) };
  const at: Record<string, Anchor> = {};
  if (rig) {
    const painted = paintedRing(slot, partIds, rig);
    if (painted) return { mode: 'ring', at: painted };
  }
  // ring: the core at the center of the body, parts spread evenly from the top in frame order
  const body = g.body;
  const cx = body.x + body.w / 2;
  const cy = body.y + body.h / 2;
  at.core = { x: cx, y: cy, size: MARKER };
  const rx = Math.max(MARKER * 1.05, body.w * 0.42);
  const ry = Math.max(MARKER * 0.95, body.h * 0.4);
  partIds.forEach((id, i) => {
    const deg = n === 2 ? -125 + i * 70 : -90 + (360 / n) * i;
    const a = (deg * Math.PI) / 180;
    at[id] = { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, size: MARKER };
  });
  return { mode: 'ring', at };
}
