// Small drawing helpers shared by the part and enemy painters. All painters draw around the origin
// (the caller translates), so gradients can be cached by size and reused every frame.
import { COLOR } from './palette';

export const TAU = Math.PI * 2;

export interface Pal {
  l: string; // light
  d: string; // dark
  s: string; // outline
}

export const BRASS: Pal = { l: '#f0cf7a', d: COLOR.brassDark, s: '#4b3512' };
export const COPPER: Pal = { l: '#f0a370', d: COLOR.copperDark, s: '#4b2410' };
export const BRONZE: Pal = { l: '#e2b479', d: '#7a5428', s: '#3f2a10' };
export const SILVER: Pal = { l: '#e6ecef', d: '#5b666c', s: '#2b3338' };
export const IRON: Pal = { l: '#9aa5ab', d: '#343c41', s: '#1d2326' };
export const EMBER: Pal = { l: '#ffb15a', d: '#c4501f', s: '#5a1f0a' };
export const VERD: Pal = { l: '#a9ddd2', d: '#2f6a62', s: '#173a35' };
export const GOLD: Pal = { l: '#ffe29a', d: '#b48a2a', s: '#5a4310' };
export const RUSTP: Pal = { l: '#d98a62', d: COLOR.rust, s: '#4b2410' };

/** True while an enemy is drawn at the peak of its hit flash (all metal fills turn pale). */
export const state = { flash: false };

const grads = new Map<string, CanvasGradient>();
let gradCtx: CanvasRenderingContext2D | null = null;

/** A cached origin-centered metal gradient (highlight up and left). */
export function metal(c: CanvasRenderingContext2D, r: number, p: Pal): string | CanvasGradient {
  if (state.flash) return '#fff1da';
  if (gradCtx !== c) {
    grads.clear();
    gradCtx = c;
  }
  const key = `${p.l}${p.d}${Math.round(r * 2)}`;
  let g = grads.get(key);
  if (!g) {
    g = c.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.08, 0, 0, r * 1.3);
    g.addColorStop(0, p.l);
    g.addColorStop(1, p.d);
    if (grads.size > 400) grads.clear();
    grads.set(key, g);
  }
  return g;
}

/** Flat fill that honors the hit flash. */
export function flat(col: string): string {
  return state.flash ? '#fff1da' : col;
}

export function ellipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}

export function disc(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.beginPath();
  c.arc(x, y, Math.max(0.01, r), 0, TAU);
}

export function fillStroke(c: CanvasRenderingContext2D, fill: string | CanvasGradient, stroke: string): void {
  c.fillStyle = fill;
  c.fill();
  c.strokeStyle = stroke;
  c.stroke();
}

export type Tooth = 'trap' | 'saw' | 'point';

/** A toothed outline around the origin. */
export function gearPath(c: CanvasRenderingContext2D, r: number, teeth: number, rot: number, depth = 0.2, tooth: Tooth = 'trap'): void {
  const step = TAU / teeth;
  c.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a = rot + i * step;
    let k = 0;
    const add = (ang: number, rad: number): void => {
      const px = Math.cos(ang) * rad;
      const py = Math.sin(ang) * rad;
      if (i === 0 && k === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
      k++;
    };
    if (tooth === 'trap') {
      add(a - step * 0.5, r);
      add(a - step * 0.22, r * (1 + depth));
      add(a + step * 0.22, r * (1 + depth));
      add(a + step * 0.5, r);
    } else if (tooth === 'saw') {
      add(a - step * 0.5, r);
      add(a + step * 0.35, r * (1 + depth));
      add(a + step * 0.5, r);
    } else {
      add(a - step * 0.5, r);
      add(a, r * (1 + depth));
      add(a + step * 0.5, r);
    }
  }
  c.closePath();
}

/** Toothed wheel, filled with metal and outlined. */
export function gear(c: CanvasRenderingContext2D, r: number, teeth: number, rot: number, p: Pal, depth = 0.2, tooth: Tooth = 'trap'): void {
  gearPath(c, r, teeth, rot, depth, tooth);
  fillStroke(c, metal(c, r * 1.2, p), p.s);
}

export function hub(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string = COLOR.tile, edge: string = COLOR.brassDark): void {
  disc(c, x, y, r);
  c.fillStyle = flat(col);
  c.fill();
  c.strokeStyle = edge;
  c.lineWidth = Math.max(1, r * 0.25);
  c.stroke();
}

/** Spokes from the hub out to a radius. */
export function spokes(c: CanvasRenderingContext2D, n: number, r0: number, r1: number, rot: number, w: number, col: string): void {
  c.strokeStyle = flat(col);
  c.lineWidth = w;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i * TAU) / n;
    c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
  }
  c.stroke();
}

/** A row of charge pips (shapes only), centered at (x, y). */
export function pips(c: CanvasRenderingContext2D, x: number, y: number, n: number, filled: number, size: number): void {
  const gap = size * 2.6;
  for (let i = 0; i < n; i++) {
    disc(c, x + (i - (n - 1) / 2) * gap, y, size);
    c.fillStyle = i < filled ? COLOR.lamp : 'rgba(0,0,0,0.5)';
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.6)';
    c.lineWidth = 1;
    c.stroke();
  }
}

/** A sine coil between two x positions (horizontal wire). */
export function coilWire(c: CanvasRenderingContext2D, x0: number, x1: number, y: number, amp: number, loops: number): void {
  const n = loops * 8;
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = x0 + (x1 - x0) * t;
    const py = y + Math.sin(t * loops * TAU) * amp;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
}

/** The same coil, running down a vertical axis. */
export function coilWireV(c: CanvasRenderingContext2D, y0: number, y1: number, x: number, amp: number, loops: number): void {
  const n = loops * 8;
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const py = y0 + (y1 - y0) * t;
    const px = x + Math.sin(t * loops * TAU) * amp;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
}

export function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number): void {
  c.beginPath();
  c.roundRect(x, y, w, h, rad);
}

export function poly(c: CanvasRenderingContext2D, pts: number[]): void {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
}

export function eyes(c: CanvasRenderingContext2D, x: number, y: number, gap: number, r: number, col: string = COLOR.lamp): void {
  c.fillStyle = state.flash ? '#fff1da' : col;
  for (const s of [-1, 1]) {
    disc(c, x + s * gap, y, r);
    c.fill();
  }
}

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
