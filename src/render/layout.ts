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
  // a phone gives the enemies nearly half the width: the paintings are the point of the fight
  const enemyW = Math.max(110, Math.min(w * (w < 760 ? 0.46 : 0.4), w < 760 ? 330 : 520));
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

/** The whole room an enemy has: a painting is fitted into it (the sprite itself stays in the square `enemyBody`). */
export function enemyArea(slot: Rect, parts = 0): Rect {
  if (parts > 0) return machineGeometry(slot, parts).area;
  if (isCompact(slot)) return enemyBody(slot, 0);
  const { top, bottom } = bodyBand(slot);
  return { x: slot.x + 2, y: top, w: slot.w - 4, h: bottom - top };
}

/** The HP bar rectangle: just above the name text. */
export function enemyBar(slot: Rect, parts = 0): Rect {
  if (parts > 0) return machineGeometry(slot, parts).bar;
  const w = Math.min(slot.w * 0.8, 120);
  if (isCompact(slot)) return { x: slot.x + (slot.w - w) / 2, y: slot.y + slot.h - COMPACT_TEXT_H - 7, w, h: 5 };
  return { x: slot.x + (slot.w - w) / 2, y: slot.y + slot.h - textBlock(slot) - 5, w, h: 5 };
}

// ---------- B7/B8: enemy machines (a frame enemy has part markers and a core marker) ----------

/** Slots at least this tall (the desktop) draw the markers on a ring around the sprite; shorter ones (the phone) use pips. */
export const RING_MIN_H = 250;
/** Phone: the visible pip, and the tap target around it (an invisible extension of the pip). */
export const PIP = 28;
export const PIP_HIT = 40;
/** Phone: the one text line (name and HP) at the bottom of a slot, and the HP bar just above it. */
export const PHONE_TEXT_H = 16;

export interface MachineGeometry {
  mode: 'ring' | 'phone';
  /** A square for the code-drawn enemy (and the statuses and Shell drawn over it). */
  body: Rect;
  /** The whole room for the enemy: a painting is fitted into this (the phone gives it nearly the whole slot). */
  area: Rect;
  bar: Rect;
  /** Marker size in px (the pip on the phone). */
  size: number;
  /** Phone: set so the DOM text band is not given the ring's fixed height (Combat.tsx). */
  column?: { x: number; w: number };
}

/**
 * The room inside a slot for a frame enemy with `parts` parts. Ring (tall slots, the desktop): markers around a square
 * sprite. Phone: the enemy fills the slot above one line of text; the markers are small pips drawn on the painting
 * (anchors.ts), so the art is the main thing in each slot and the pips and name never overlap.
 */
export function machineGeometry(slot: Rect, parts: number): MachineGeometry {
  void parts;
  if (slot.h >= RING_MIN_H) {
    const { top, bottom } = bodyBand(slot);
    const size = Math.min(slot.w * 0.96, bottom - top);
    const w = Math.min(slot.w * 0.8, 120);
    const body = { x: slot.x + (slot.w - size) / 2, y: top + (bottom - top - size) / 2, w: size, h: size };
    return { mode: 'ring', body, area: { x: slot.x + 2, y: top, w: slot.w - 4, h: Math.max(16, bottom - top) }, bar: { x: slot.x + (slot.w - w) / 2, y: slot.y + slot.h - textBlock(slot) - 5, w, h: 5 }, size: 44 };
  }
  // a narrow slot with room to spare (two enemies side by side) reserves two lines for a long name (the Boilermaker Queen's)
  const textH = slot.w < 200 && slot.h >= COMPACT_SLOT_H ? PHONE_TEXT_H + 13 : PHONE_TEXT_H;
  const barY = slot.y + slot.h - textH - 7;
  const top = slot.y + 1;
  const room = Math.max(16, barY - 2 - top);
  const w = Math.min(slot.w * 0.8, 120);
  const area = { x: slot.x + 2, y: top, w: slot.w - 4, h: room };
  const size = Math.min(area.w, area.h);
  return {
    mode: 'phone',
    body: { x: area.x + (area.w - size) / 2, y: top + (room - size) / 2, w: size, h: size },
    area,
    bar: { x: slot.x + (slot.w - w) / 2, y: barY, w, h: 5 },
    size: PIP,
    column: { x: 0, w: slot.w },
  };
}
