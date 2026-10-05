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
  /** Phone: which side of the pip its intent chip sits on (beside it, or above or below when the sides are taken). */
  side?: 'l' | 'r' | 't' | 'b';
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

/** Parts with no anchor of their own yet (B11 paints them) sit where a sibling does: the Thirteenth Hour's keystones. */
const ANCHOR_ALIAS: Record<string, string> = { 'clock-thirteenth-chime': 'clock-bell', 'clock-hourless-dial': 'clock-wheel' };
const ALIAS_OF = (id: string): string => ANCHOR_ALIAS[id] ?? id;

/** Where a painting's anchors fall on the stage (rest pose). */
function paintedTargets(rig: RigPlacement, ids: string[]): P[] {
  const { def, rect } = rig;
  const WW = def.size[0] + 2 * def.pad[0];
  const WH = def.size[1] + 2 * def.pad[1];
  return ids.map((id) => {
    const a = def.anchors[id] ?? def.anchors[ALIAS_OF(id)] ?? def.anchors.core;
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

type Side = 'l' | 'r' | 't' | 'b';
interface Unit extends P {
  side: Side;
}
interface Box {
  l: number;
  r: number;
  t: number;
  b: number;
}
const CHIP_H = 18;

const pipBox = (p: P): Box => ({ l: p.x - HALF, r: p.x + HALF, t: p.y - HALF, b: p.y + HALF });
/** The intent chip's box beside (l, r) or above and below (t, b) its pip. */
function chipBox(p: P, side: Side): Box {
  if (side === 'r') return { l: p.x + HALF + GAP, r: p.x + HALF + GAP + CHIP, t: p.y - CHIP_H / 2, b: p.y + CHIP_H / 2 };
  if (side === 'l') return { l: p.x - HALF - GAP - CHIP, r: p.x - HALF - GAP, t: p.y - CHIP_H / 2, b: p.y + CHIP_H / 2 };
  if (side === 't') return { l: p.x - CHIP / 2, r: p.x + CHIP / 2, t: p.y - HALF - GAP - CHIP_H, b: p.y - HALF - GAP };
  return { l: p.x - CHIP / 2, r: p.x + CHIP / 2, t: p.y + HALF + GAP, b: p.y + HALF + GAP + CHIP_H };
}
const boxesTouch = (A: Box, B: Box): boolean => A.l < B.r + 1 && B.l < A.r + 1 && A.t < B.b + 1 && B.t < A.b + 1;
const overlapArea = (A: Box, B: Box): number => Math.max(0, Math.min(A.r, B.r) - Math.max(A.l, B.l)) * Math.max(0, Math.min(A.b, B.b) - Math.max(A.t, B.t));

/**
 * Pass 1: each pip goes to the free spot nearest its anchor (pips only, so they stay on their parts whenever the slot
 * has room). Pass 2: each pip's intent chip takes a side (right, left, above or below) where it touches no pip and, if
 * possible, no other chip. Pips stay above the bar and the name line, chips inside the slot.
 */
function pipPositions(slot: Rect, targets: P[]): Unit[] {
  const strict = strictUnits(slot, targets);
  if (strict) return strict;
  const loose = pipsThenChips(slot, targets);
  const bad = loose.some((u, i) => loose.some((v, j) => i !== j && (boxesTouch(chipBox(u, u.side), pipBox(v)) || boxesTouch(pipBox(u), pipBox(v)))));
  return bad ? cornerUnits(slot, targets) : loose;
}

/** Last resort, always clear: two columns in the slot's corners (left pips take their chip on the right, right pips on the left). */
function cornerUnits(slot: Rect, targets: P[]): Unit[] {
  const bar = enemyBar(slot, targets.length - 1);
  const minX = slot.x + HALF + 1;
  const maxX = slot.x + slot.w - HALF - 1;
  const minY = slot.y + HALF + 1;
  const maxY = bar.y - 3 - HALF;
  const rank = targets.map((t, i) => ({ t, i })).sort((p, q) => p.t.y - q.t.y || p.t.x - q.t.x);
  const cols = slot.w - 4 >= 2 * (PIP + GAP + CHIP) ? 2 : 1;
  const rows = Math.ceil(targets.length / cols);
  const out: Unit[] = new Array<Unit>(targets.length);
  rank.forEach(({ i }, k) => {
    const left = cols === 1 || k % 2 === 0;
    const r = Math.floor(k / cols);
    const y = rows === 1 ? (minY + maxY) / 2 : minY + ((maxY - minY) * r) / (rows - 1);
    out[i] = { x: left ? minX : maxX, y, side: left ? 'r' : 'l' };
  });
  return out;
}

/** The slot's middle, kept free of pips and their 40 px tap areas: a tap there targets the enemy itself. */
const centerBlocked = (slot: Rect, x: number, y: number): boolean => Math.abs(x - (slot.x + slot.w / 2)) < HALF + 10 && Math.abs(y - (slot.y + slot.h / 2)) < HALF + 10;

/** Every pip with its chip, placed one after another at the free spot nearest its anchor; null when one finds no spot. */
function strictUnits(slot: Rect, targets: P[]): Unit[] | null {
  const bar = enemyBar(slot, targets.length - 1);
  const minX = slot.x + HALF;
  const maxX = slot.x + slot.w - HALF;
  const minY = slot.y + HALF + 1;
  const maxY = bar.y - 3 - HALF;
  const inSlot = (B: Box): boolean => B.l >= slot.x + 1 && B.r <= slot.x + slot.w - 1 && B.t >= slot.y + 1 && B.b <= bar.y - 2;
  const placed: (Unit | undefined)[] = new Array<Unit | undefined>(targets.length).fill(undefined);
  const order = targets.map((t, i) => ({ i, n: targets.filter((u) => Math.hypot(u.x - t.x, u.y - t.y) < 50).length })).sort((p, q) => q.n - p.n || p.i - q.i);
  const sides: Side[] = ['r', 'l', 't', 'b'];
  for (const { i } of order) {
    const t = targets[i];
    let best: Unit | undefined;
    let bestD = Infinity;
    for (let y = minY; y <= maxY + 0.01; y += 2) {
      for (let x = minX; x <= maxX + 0.01; x += 2) {
        const d = Math.hypot(x - t.x, y - t.y);
        if (d >= bestD || centerBlocked(slot, x, y)) continue;
        const pb = pipBox({ x, y });
        const roomy = { l: pb.l - 3, r: pb.r + 3, t: pb.t - 3, b: pb.b + 3 }; // pips keep a gap of a few pixels
        if (placed.some((u) => u && (boxesTouch(roomy, pipBox(u)) || boxesTouch(pb, chipBox(u, u.side))))) continue;
        for (const side of sides) {
          const cb = chipBox({ x, y }, side);
          if (!inSlot(cb) || placed.some((u) => u && (boxesTouch(cb, pipBox(u)) || boxesTouch(cb, chipBox(u, u.side))))) continue;
          best = { x, y, side };
          bestD = d;
          break;
        }
      }
    }
    if (!best) return null;
    placed[i] = best;
  }
  return placed as Unit[];
}

/** The looser fallback: pips first, then each chip on the side where it covers the fewest others. */
function pipsThenChips(slot: Rect, targets: P[]): Unit[] {
  const bar = enemyBar(slot, targets.length - 1);
  const minX = slot.x + HALF;
  const maxX = slot.x + slot.w - HALF;
  const minY = slot.y + HALF + 1;
  const maxY = bar.y - 3 - HALF;
  const pips: (P | undefined)[] = new Array<P | undefined>(targets.length).fill(undefined);
  const order = targets.map((t, i) => ({ i, n: targets.filter((u) => Math.hypot(u.x - t.x, u.y - t.y) < 50).length })).sort((p, q) => q.n - p.n || p.i - q.i);
  for (const { i } of order) {
    const t = targets[i];
    let best: P | undefined;
    let bestD = Infinity;
    for (let y = minY; y <= maxY + 0.01; y += 2) {
      for (let x = minX; x <= maxX + 0.01; x += 2) {
        const d = Math.hypot(x - t.x, y - t.y);
        if (d >= bestD) continue;
        // the middle of the slot stays free: a tap there targets the enemy itself
        if (centerBlocked(slot, x, y)) continue;
        if (pips.some((p) => p && boxesTouch(pipBox(p), pipBox({ x, y })))) continue;
        best = { x, y };
        bestD = d;
      }
    }
    pips[i] = best ?? { x: Math.min(maxX, Math.max(minX, t.x)), y: Math.min(maxY, Math.max(minY, t.y)) };
  }
  const inSlot = (B: Box): boolean => B.l >= slot.x + 1 && B.r <= slot.x + slot.w - 1 && B.t >= slot.y + 1 && B.b <= bar.y - 2;
  const chips: (Box | undefined)[] = new Array<Box | undefined>(targets.length).fill(undefined);
  const out: Unit[] = [];
  for (const { i } of order) {
    const p = pips[i] as P;
    const prefer: Side[] = p.x < slot.x + slot.w / 2 ? ['r', 'l', 't', 'b'] : ['l', 'r', 't', 'b'];
    let pick: Side = prefer[0];
    let pickCost = Infinity;
    prefer.forEach((side, rank) => {
      const B = chipBox(p, side);
      let cost = rank * 0.5;
      if (!inSlot(B)) cost += 1000;
      for (let j = 0; j < pips.length; j++) {
        const q = pips[j] as P;
        if (j !== i && boxesTouch(B, pipBox(q))) cost += 500;
        const c = chips[j];
        if (j !== i && c) cost += overlapArea(B, c) * 2;
      }
      if (cost < pickCost) {
        pickCost = cost;
        pick = side;
      }
    });
    chips[i] = chipBox(p, pick);
    out[i] = { x: p.x, y: p.y, side: pick };
  }
  return out;
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
  const units = pipPositions(slot, targets);
  const out: Record<string, Anchor> = {};
  ids.forEach((id, i) => (out[id] = { x: units[i].x, y: units[i].y, size: PIP, side: units[i].side }));
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
