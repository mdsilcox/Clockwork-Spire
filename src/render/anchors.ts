// Where an enemy's parts and core sit in its slot. ONE function decides this (B7: code-drawn enemies get a ring on tall
// slots and a strip of markers on short ones; B8 replaces it with the painted rigs' anchor points, so nothing else may
// compute part positions).
import { enemyBody, machineGeometry } from './layout';
import type { Rect } from './layout';

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

export function partAnchors(slot: Rect, partIds: string[]): Anchors {
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
