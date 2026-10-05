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

/** Slots shorter than this (three or four enemies on a phone) use the compact layout. */
export const COMPACT_SLOT_H = 130;
export const isCompact = (slot: Rect): boolean => slot.h < COMPACT_SLOT_H;
/** Compact slots: the name and HP share one short line at the bottom, the intent chip sits top right. */
const COMPACT_TEXT_H = 16;

/** Roomy slots: the text block (name, HP, Run damage) sits at the bottom, the HP bar just above it. */
export function textBlock(slot: Rect): number {
  return Math.max(44, slot.h * 0.28);
}

/** The sprite fills the room between the top (the intent chip may overlap its corner) and the HP bar. */
function bodyBand(slot: Rect): { top: number; bottom: number } {
  const top = slot.y + Math.max(20, slot.h * 0.12);
  const bottom = slot.y + slot.h - textBlock(slot) - 8;
  return { top, bottom: Math.max(top + 16, bottom) };
}

/**
 * Where the automaton is drawn: inside the body row, below the intent pill and above the HP bar,
 * so the sprite, the bar and the DOM rows never overlap. In a compact slot it sits left of the intent chip.
 */
export function enemyBody(slot: Rect, parts = 0): Rect {
  if (parts > 0) return machineGeometry(slot, parts).body;
  if (isCompact(slot)) {
    const barY = slot.y + slot.h - COMPACT_TEXT_H - 7;
    const room = barY - slot.y - 3;
    const size = Math.max(16, Math.min(slot.w * 0.56, room));
    return { x: slot.x + 2 + (slot.w * 0.56 - size) / 2, y: slot.y + 1 + (room - size) / 2, w: size, h: size };
  }
  const { top, bottom } = bodyBand(slot);
  const size = Math.min(slot.w * 0.96, bottom - top);
  return { x: slot.x + (slot.w - size) / 2, y: top + (bottom - top - size) / 2, w: size, h: size };
}

/** The HP bar rectangle: just above the name text. */
export function enemyBar(slot: Rect, parts = 0): Rect {
  if (parts > 0) return machineGeometry(slot, parts).bar;
  const w = Math.min(slot.w * 0.8, 120);
  if (isCompact(slot)) return { x: slot.x + (slot.w - w) / 2, y: slot.y + slot.h - COMPACT_TEXT_H - 7, w, h: 5 };
  return { x: slot.x + (slot.w - w) / 2, y: slot.y + slot.h - textBlock(slot) - 5, w, h: 5 };
}

// ---------- B7: enemy machines (a frame enemy has part markers and a core marker) ----------

/** Slots at least this tall (the desktop) draw the markers on a ring around the sprite; shorter ones (the phone) use a strip. */
export const RING_MIN_H = 250;
/** Phone markers: the 40 px tap target, with a small gap. */
export const STRIP_MARKER = 40;
const STRIP_GAP = 4;
const COMPACT_SPRITE = 34;

export interface MachineGeometry {
  mode: 'ring' | 'strip';
  body: Rect;
  bar: Rect;
  /** Marker size in px. */
  size: number;
  /** Strip mode: marker rectangles for the parts in frame order, then the core last. Ring mode: empty (anchors.ts places them). */
  strip: Rect[];
  /** Compact strips: the text column on the right (x is slot-relative). */
  column?: { x: number; w: number };
}

/**
 * The room inside a slot for a frame enemy with `parts` parts: the sprite, its HP bar and the markers never overlap
 * each other or the name text. Ring (tall slots): markers around the sprite. Strip: markers in rows above the name,
 * the sprite above them; in a compact slot the markers take the left and the sprite, bar and name the right.
 */
export function machineGeometry(slot: Rect, parts: number): MachineGeometry {
  const m = parts + 1;
  if (slot.h >= RING_MIN_H) {
    const { top, bottom } = bodyBand(slot);
    const size = Math.min(slot.w * 0.96, bottom - top);
    const w = Math.min(slot.w * 0.8, 120);
    return {
      mode: 'ring',
      body: { x: slot.x + (slot.w - size) / 2, y: top + (bottom - top - size) / 2, w: size, h: size },
      bar: { x: slot.x + (slot.w - w) / 2, y: slot.y + slot.h - textBlock(slot) - 5, w, h: 5 },
      size: 44,
      strip: [],
    };
  }
  const S = STRIP_MARKER;
  if (isCompact(slot)) {
    const maxRows = Math.max(1, Math.floor((slot.h + STRIP_GAP) / (S + STRIP_GAP)));
    const rows = Math.min(maxRows, m);
    const perRow = Math.ceil(m / rows);
    const gridW = perRow * S + (perRow - 1) * STRIP_GAP;
    const gridH = rows * S + (rows - 1) * STRIP_GAP;
    const gy = slot.y + (slot.h - gridH) / 2;
    const strip: Rect[] = [];
    for (let i = 0; i < m; i++) strip.push({ x: slot.x + 2 + (i % perRow) * (S + STRIP_GAP), y: gy + Math.floor(i / perRow) * (S + STRIP_GAP), w: S, h: S });
    const cx = gridW + 8;
    const cw = Math.max(0, slot.w - cx - 2);
    const size = Math.min(cw, COMPACT_SPRITE);
    return {
      mode: 'strip',
      body: { x: slot.x + cx + (cw - size) / 2, y: slot.y + 2, w: size, h: size },
      bar: { x: slot.x + cx, y: slot.y + 2 + size + 3, w: cw, h: 5 },
      size: S,
      strip,
      column: { x: cx, w: cw },
    };
  }
  const text = textBlock(slot);
  const barY = slot.y + slot.h - text - 5;
  const perRow = Math.max(1, Math.floor((slot.w + STRIP_GAP) / (S + STRIP_GAP)));
  const rows = Math.ceil(m / perRow);
  const stripH = rows * S + (rows - 1) * STRIP_GAP;
  const stripTop = barY - 4 - stripH;
  const strip: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    const count = Math.min(perRow, m - r * perRow);
    const x0 = slot.x + (slot.w - (count * S + (count - 1) * STRIP_GAP)) / 2;
    for (let k = 0; k < count; k++) strip.push({ x: x0 + k * (S + STRIP_GAP), y: stripTop + r * (S + STRIP_GAP), w: S, h: S });
  }
  const top = slot.y + 2;
  const room = Math.max(16, stripTop - 4 - top);
  const size = Math.min(slot.w * 0.8, room);
  const w = Math.min(slot.w * 0.8, 120);
  return {
    mode: 'strip',
    body: { x: slot.x + (slot.w - size) / 2, y: top + (room - size) / 2, w: size, h: size },
    bar: { x: slot.x + (slot.w - w) / 2, y: barY, w, h: 5 },
    size: S,
    strip,
  };
}
