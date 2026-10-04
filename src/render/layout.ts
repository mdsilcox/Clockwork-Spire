// Stage layout shared by the canvas and the DOM overlays so they line up exactly.
import { COLS, ROWS } from '../core/types';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  w: number;
  h: number;
  cell: number;
  board: Rect;
  enemyZone: Rect;
}

export function computeLayout(w: number, h: number): Layout {
  const pad = Math.max(6, Math.round(Math.min(w, h) * 0.03));
  const enemyW = Math.max(110, Math.min(w * 0.3, 330));
  const availW = Math.max(100, w - enemyW - pad * 3);
  const availH = Math.max(60, h - pad * 2);
  const cell = Math.max(24, Math.floor(Math.min(availW / COLS, availH / ROWS)));
  const bw = cell * COLS;
  const bh = cell * ROWS;
  const board: Rect = { x: pad, y: Math.round((h - bh) / 2), w: bw, h: bh };
  const ex = board.x + bw + pad;
  const enemyZone: Rect = { x: ex, y: pad, w: Math.max(60, w - ex - pad), h: Math.max(40, h - pad * 2) };
  return { w, h, cell, board, enemyZone };
}

export function cellRect(L: Layout, i: number): Rect {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return { x: L.board.x + col * L.cell, y: L.board.y + row * L.cell, w: L.cell, h: L.cell };
}

/** Enemy slots: up to two columns, rows as needed. */
export function enemySlots(L: Layout, n: number): Rect[] {
  const z = L.enemyZone;
  const cols = n <= 2 ? Math.max(1, n) : 2;
  const rows = Math.max(1, Math.ceil(n / cols));
  const gap = 6;
  const sw = (z.w - gap * (cols - 1)) / cols;
  const sh = (z.h - gap * (rows - 1)) / rows;
  const out: Rect[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    out.push({ x: z.x + c * (sw + gap), y: z.y + r * (sh + gap), w: sw, h: sh });
  }
  return out;
}

/** The part of an enemy slot where the automaton is drawn (the rest holds DOM text). */
export function enemyBody(slot: Rect): Rect {
  const h = slot.h * 0.5;
  const size = Math.min(slot.w * 0.9, h);
  return { x: slot.x + (slot.w - size) / 2, y: slot.y + slot.h * 0.22 + (h - size) / 2, w: size, h: size };
}
