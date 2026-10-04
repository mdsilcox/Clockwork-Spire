// Where an enemy's parts and core sit on its body. ONE function decides this (B7: code-drawn enemies get a generic
// ring; B8 replaces it with the painted rigs' anchor points, so nothing else may compute part positions).
import type { Rect } from './layout';

export interface Anchor {
  x: number;
  y: number;
}

/** Marker size (px): the tap target and the minimum spacing the ring keeps. */
export const MARKER = 44;

/** Core at the center of the body; parts spread evenly on a ring around it, starting at the top, in frame order. */
export function partAnchors(body: Rect, partIds: string[]): Record<string, Anchor> {
  const cx = body.x + body.w / 2;
  const cy = body.y + body.h / 2;
  const out: Record<string, Anchor> = { core: { x: cx, y: cy } };
  const n = partIds.length;
  if (n === 0) return out;
  const rx = Math.max(MARKER * 1.05, body.w * 0.42);
  const ry = Math.max(MARKER * 0.95, body.h * 0.4);
  partIds.forEach((id, i) => {
    // two parts sit left and right above the core; three or more spread around the ring from the top
    const deg = n === 2 ? -125 + i * 70 : -90 + (360 / n) * i;
    const a = (deg * Math.PI) / 180;
    out[id] = { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
  });
  return out;
}
