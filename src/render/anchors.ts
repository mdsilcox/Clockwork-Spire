// Where an enemy's parts and core sit in its slot. ONE function decides this (B7: code-drawn enemies get a ring on tall
// slots and a strip of markers on short ones; B8: a painted enemy on a tall slot puts each marker on the painting's anchor
// for that part, nudged apart so every marker, its intent chip above and its HP below stay clear of the others; nothing
// else may compute part positions).
import { signal } from '@preact/signals';
import { enemyBar, enemyBody, machineGeometry } from './layout';
import type { Rect } from './layout';
import type { Geometry } from '../art/geometry';

export interface Anchor {
  x: number;
  y: number;
  /** Marker size (px). */
  size: number;
}

export interface Anchors {
  mode: 'ring' | 'strip';
  at: Record<string, Anchor>;
  /** Compact strips only: the right-hand text column (x is slot-relative). */
  column?: { x: number; w: number };
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

// A marker with the intent chip above it and the HP below it, as a box around the marker's center.
const HALF_W = 34; // the chip can be wider than the marker
const UP = MARKER / 2 + 46;
const DOWN = MARKER / 2 + 18;

interface P {
  x: number;
  y: number;
}
const clash = (a: P, b: P): boolean => {
  const m = MARKER / 2;
  const box = (p: P) => ({ l: p.x - HALF_W, r: p.x + HALF_W, t: p.y - UP, b: p.y + DOWN });
  const hit = (m1: P, o: ReturnType<typeof box>) => m1.x + m > o.l - 1 && m1.x - m < o.r + 1 && m1.y + m > o.t - 1 && m1.y - m < o.b + 1;
  return hit(a, box(b)) || hit(b, box(a));
};

/** Painted ring: the painting's anchors as targets, pushed apart and kept inside the slot. Null when it cannot be made to fit. */
function paintedRing(slot: Rect, partIds: string[], rig: RigPlacement): Record<string, Anchor> | null {
  const { def, rect } = rig;
  const WW = def.size[0] + 2 * def.pad[0];
  const WH = def.size[1] + 2 * def.pad[1];
  const target = (id: string): P => {
    const a = def.anchors[id] ?? def.anchors.core;
    return { x: rect.x + ((a[0] + def.pad[0]) / WW) * rect.w, y: rect.y + ((a[1] + def.pad[1]) / WH) * rect.h };
  };
  const ids = [...partIds, 'core'];
  const bar = enemyBar(slot, partIds.length);
  const minX = slot.x + HALF_W;
  const maxX = slot.x + slot.w - HALF_W;
  const minY = slot.y + UP;
  const maxY = bar.y - 3 - DOWN;
  if (maxX < minX || maxY < minY) return null;
  const pos: P[] = ids.map((id) => {
    const t = target(id);
    return { x: Math.min(maxX, Math.max(minX, t.x)), y: Math.min(maxY, Math.max(minY, t.y)) };
  });

  for (let iter = 0; iter < 200; iter++) {
    let moved = false;
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        if (!clash(pos[i], pos[j])) continue;
        moved = true;
        // push the pair apart along the axis they overlap least on, the one further from its goal moving more
        const dx = pos[j].x - pos[i].x || (j % 2 ? 1 : -1) * 0.01;
        const dy = pos[j].y - pos[i].y || 0.01;
        const needX = HALF_W + MARKER / 2 - Math.abs(dx);
        const needY = (dy > 0 ? UP : DOWN) + MARKER / 2 - Math.abs(dy);
        if (needX < needY) {
          const s = Math.sign(dx) * (needX / 2 + 0.5);
          pos[i].x -= s;
          pos[j].x += s;
        } else {
          // j sits below i (dy > 0): i's HP is above j's chip; the chip needs more room than the HP
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
  for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) if (clash(pos[i], pos[j])) return null;
  const out: Record<string, Anchor> = {};
  ids.forEach((id, i) => (out[id] = { x: pos[i].x, y: pos[i].y, size: MARKER }));
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
  const at: Record<string, Anchor> = {};
  if (g.mode === 'strip') {
    partIds.forEach((id, i) => (at[id] = { x: g.strip[i].x + g.size / 2, y: g.strip[i].y + g.size / 2, size: g.size }));
    const c = g.strip[n];
    at.core = { x: c.x + g.size / 2, y: c.y + g.size / 2, size: g.size };
    return { mode: 'strip', at, column: g.column };
  }
  const rig = rigSource ? rigSource(slot) : null;
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
