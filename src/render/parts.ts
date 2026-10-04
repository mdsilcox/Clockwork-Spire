// Part painters: one drawing per part id, built from family templates so a family reads at a glance.
// Gears are toothed wheels (brass), springs coils and leaves (copper), cams lobes and levers (bronze),
// tempo parts escapements and pendulums (silver), steam parts tanks and pipes (iron and ember),
// chimes tubes and bells (gold and verdigris). Every painter draws around the origin.
import type { Family } from '../core/types';
import { COLOR } from './palette';
import {
  BRASS, BRONZE, COPPER, EMBER, GOLD, IRON, SILVER, TAU, VERD,
  clamp01, coilWire, coilWireV, disc, ellipse, fillStroke, flat, gear, hub, metal, pips, poly, rrect, spokes,
} from './kit';
import type { Pal } from './kit';

/** Per-cell animation state. Driven by the stage, never by rules. */
export interface Vis {
  rot: number; // current rotation (radians)
  glow: number; // 0..1, decays
  charge: number;
  snap: number; // 0..1 decays after a release
  strokeT: number; // seconds since the last power (large when idle)
  heat: number; // 0..1, boilers
  counter: number;
  rusted: boolean;
  patina: number; // 0..1 rust spreading over the cell
  lift: number; // 0..1 magnetized and hovering
  jam: number; // 0..1 (Mainspring only) a wedge is stuck in it
  echo: number; // 0..1 ghost repeat decays
}

export const newVis = (): Vis => ({
  rot: 0, glow: 0, charge: 0, snap: 0, strokeT: 99, heat: 0, counter: 0, rusted: false, patina: 0, lift: 0, jam: 0, echo: 0,
});

type PartFn = (c: CanvasRenderingContext2D, r: number, v: Vis, t: number) => void;

const FAMILY_OF: Record<string, Family> = {};
const fam = (f: Family, ids: string): void => {
  for (const id of ids.split(' ')) FAMILY_OF[id] = f;
};
fam('gear', 'spur idler bevel crown ratchet flywheel planetary sprocket-wheel');
fam('spring', 'coil leaf torsion trap recoil volute hairspring');
fam('cam', 'cam triple-cam lever trip-hammer tappet cam-follower toggle');
fam('tempo', 'escapement pendulum anchor metronome balance-wheel verge grandfather chronometer');
fam('steam', 'boiler piston whistle safety-valve firebox kettle condenser steam-hammer governor');
fam('chime', 'chime bell-hammer oil-can tuning-fork alarm-clock gong lamp');

/** The family a part id belongs to (the renderer's own table, so previews work before the core registry has it). */
export function partFamily(id: string): Family | null {
  return FAMILY_OF[id] ?? null;
}

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
/** 0..1 pulse that rises fast and falls after a power; `dur` seconds. */
const kick = (v: Vis, dur: number): number => (v.strokeT < dur ? Math.sin((v.strokeT / dur) * Math.PI) : 0);

// ---------- gears (brass) ----------

const spur: PartFn = (c, r, v) => {
  gear(c, r * 0.66, 10, v.rot, BRASS);
  for (let i = 0; i < 4; i++) {
    const a = v.rot + (i * TAU) / 4 + Math.PI / 4;
    disc(c, Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36, r * 0.11);
    c.fillStyle = flat(COLOR.tile);
    c.fill();
  }
  hub(c, 0, 0, r * 0.14);
};

const idler: PartFn = (c, r, v) => {
  gear(c, r * 0.5, 8, v.rot, COPPER, 0.24);
  c.strokeStyle = flat(COLOR.lamp);
  const a0 = v.rot * 0.5;
  c.beginPath();
  c.arc(0, 0, r * 0.8, a0, a0 + Math.PI * 1.3);
  c.stroke();
  const ea = a0 + Math.PI * 1.3;
  const ex = Math.cos(ea) * r * 0.8;
  const ey = Math.sin(ea) * r * 0.8;
  c.beginPath();
  c.moveTo(ex + Math.cos(ea + 1.9) * r * 0.16, ey + Math.sin(ea + 1.9) * r * 0.16);
  c.lineTo(ex, ey);
  c.lineTo(ex - Math.cos(ea - 0.4) * r * 0.2, ey - Math.sin(ea - 0.4) * r * 0.2);
  c.stroke();
  hub(c, 0, 0, r * 0.12);
};

const bevel: PartFn = (c, r, v) => {
  // a cone gear seen at a slant, meshing with a small gear on the diagonal
  c.save();
  c.translate(-r * 0.12, -r * 0.1);
  c.rotate(-Math.PI / 4);
  c.scale(1, 0.62);
  gear(c, r * 0.62, 12, v.rot, BRASS, 0.18, 'point');
  for (const k of [0.8, 0.55, 0.3]) {
    disc(c, 0, 0, r * 0.62 * k);
    c.strokeStyle = 'rgba(75, 53, 18, 0.7)';
    c.stroke();
  }
  c.restore();
  c.save();
  c.translate(r * 0.5, r * 0.5);
  gear(c, r * 0.2, 7, -v.rot * 1.4, COPPER, 0.25);
  c.restore();
  hub(c, -r * 0.12, -r * 0.1, r * 0.07);
};

const crown: PartFn = (c, r, v) => {
  c.rotate(v.rot * 0.3);
  const n = 9;
  // crown points: tall triangles around a ring
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i * TAU) / n;
    const b = a + TAU / n / 2;
    c.lineTo(Math.cos(a - 0.12) * r * 0.5, Math.sin(a - 0.12) * r * 0.5);
    c.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
    c.lineTo(Math.cos(a + 0.12) * r * 0.5, Math.sin(a + 0.12) * r * 0.5);
    c.lineTo(Math.cos(b) * r * 0.46, Math.sin(b) * r * 0.46);
  }
  c.closePath();
  fillStroke(c, metal(c, r, GOLD), GOLD.s);
  disc(c, 0, 0, r * 0.4);
  fillStroke(c, metal(c, r * 0.5, BRASS), BRASS.s);
  for (let i = 0; i < n; i++) {
    const a = (i * TAU) / n;
    disc(c, Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92, r * 0.05);
    c.fillStyle = flat('#fff0b0');
    c.fill();
  }
  hub(c, 0, 0, r * 0.12, '#b04a3a', BRASS.s);
};

const ratchet: PartFn = (c, r, v) => {
  gear(c, r * 0.6, 10, v.rot, BRASS, 0.3, 'saw');
  hub(c, 0, 0, r * 0.14);
  // the pawl: clicks down into a tooth when it fires
  const k = kick(v, 0.25);
  c.save();
  c.translate(r * 0.78, -r * 0.62);
  c.rotate(-0.5 + k * 0.35);
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(-r * 0.62, r * 0.1);
  c.lineTo(-r * 0.7, r * 0.26);
  c.lineTo(-r * 0.5, r * 0.18);
  c.lineTo(0, r * 0.14);
  c.closePath();
  fillStroke(c, metal(c, r * 0.5, IRON), IRON.s);
  c.restore();
  pips(c, 0, r * 0.84, Math.min(6, Math.max(3, Math.ceil(v.charge))), v.charge, r * 0.075);
};

const flywheel: PartFn = (c, r, v) => {
  c.rotate(v.rot * 0.6);
  disc(c, 0, 0, r * 0.72);
  c.lineWidth = r * 0.26;
  c.strokeStyle = metal(c, r, BRONZE);
  c.stroke();
  c.lineWidth = Math.max(1.5, r * 0.05);
  disc(c, 0, 0, r * 0.86);
  c.strokeStyle = BRONZE.s;
  c.stroke();
  disc(c, 0, 0, r * 0.59);
  c.stroke();
  spokes(c, 6, r * 0.1, r * 0.6, 0, r * 0.1, BRASS.d);
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 + Math.PI / 4;
    disc(c, Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.1);
    fillStroke(c, metal(c, r * 0.2, IRON), IRON.s);
  }
  disc(c, 0, 0, r * 0.2);
  fillStroke(c, metal(c, r * 0.3, BRASS), BRASS.s);
  disc(c, 0, 0, r * 0.07);
  c.fillStyle = COLOR.tile;
  c.fill();
};

const planetary: PartFn = (c, r, v) => {
  disc(c, 0, 0, r * 0.84);
  c.strokeStyle = BRASS.s;
  c.lineWidth = r * 0.12;
  c.stroke();
  c.strokeStyle = metal(c, r, BRASS);
  c.lineWidth = r * 0.07;
  c.stroke();
  spokes(c, 28, r * 0.74, r * 0.8, -v.rot * 0.3, Math.max(1.5, r * 0.04), BRASS.s);
  c.lineWidth = Math.max(1.5, r * 0.06);
  gear(c, r * 0.2, 8, v.rot * 1.5, COPPER, 0.25);
  for (let i = 0; i < 3; i++) {
    const a = v.rot * 0.5 + (i * TAU) / 3;
    c.save();
    c.translate(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
    gear(c, r * 0.17, 7, -v.rot * 2.2, BRASS, 0.25);
    c.restore();
  }
};

const sprocketWheel: PartFn = (c, r, v) => {
  gear(c, r * 0.62, 12, v.rot, BRASS, 0.26, 'point');
  disc(c, 0, 0, r * 0.42);
  c.fillStyle = flat(COLOR.tile);
  c.fill();
  c.strokeStyle = BRASS.s;
  c.stroke();
  // a tiny paw print for a hub
  c.fillStyle = flat(COLOR.lamp);
  ellipse(c, 0, r * 0.07, r * 0.13, r * 0.1);
  c.fill();
  for (const [dx, dy] of [[-0.16, -0.1], [-0.06, -0.19], [0.06, -0.19], [0.16, -0.1]]) {
    disc(c, dx * r, dy * r, r * 0.05);
    c.fill();
  }
};

// ---------- springs (copper) ----------

const coil: PartFn = (c, r, v) => {
  const compress = 1 - 0.12 * Math.min(v.charge, 3);
  const overshoot = v.snap > 0 ? Math.sin(v.snap * 9) * 0.25 * v.snap : 0;
  const w = r * 1.5 * (compress + overshoot);
  c.strokeStyle = metal(c, r, COPPER);
  c.lineWidth = r * 0.14;
  coilWire(c, -w / 2, w / 2, 0, r * 0.34, 6);
  c.stroke();
  c.fillStyle = flat(COLOR.brassDark);
  c.fillRect(-r * 0.85, -r * 0.45, r * 0.12, r * 0.9);
  c.fillRect(r * 0.73, -r * 0.45, r * 0.12, r * 0.9);
  pips(c, 0, r * 0.66, 3, v.charge, r * 0.09);
};

const leaf: PartFn = (c, r, v) => {
  const bend = lerp(0.55, 0.12, clamp01(v.charge / 2)) + (v.snap > 0 ? Math.sin(v.snap * 10) * 0.2 * v.snap : 0);
  for (let i = 0; i < 3; i++) {
    const half = r * (0.8 - i * 0.16);
    const y = r * 0.1 - i * r * 0.1;
    c.beginPath();
    c.moveTo(-half, y + r * bend * 0.5);
    c.quadraticCurveTo(0, y - r * bend * 0.9, half, y + r * bend * 0.5);
    c.lineWidth = r * 0.14;
    c.strokeStyle = COPPER.s;
    c.stroke();
    c.lineWidth = r * 0.08;
    c.strokeStyle = metal(c, r, i === 0 ? COPPER : BRONZE);
    c.stroke();
  }
  rrect(c, -r * 0.14, -r * 0.1, r * 0.28, r * 0.5, r * 0.05);
  fillStroke(c, metal(c, r * 0.4, BRASS), BRASS.s);
  pips(c, 0, r * 0.74, 2, v.charge, r * 0.09);
};

const torsion: PartFn = (c, r, v) => {
  const ang = v.charge * 0.45 + (v.snap > 0 ? Math.sin(v.snap * 10) * 0.4 * v.snap : 0);
  for (let i = 0; i < 3; i++) {
    disc(c, 0, 0, r * (0.18 + i * 0.1));
    c.lineWidth = r * 0.07;
    c.strokeStyle = metal(c, r, COPPER);
    c.stroke();
  }
  c.lineWidth = r * 0.1;
  c.strokeStyle = metal(c, r, COPPER);
  c.beginPath();
  c.moveTo(r * 0.38, 0);
  c.lineTo(r * 0.9, 0);
  c.stroke();
  c.save();
  c.rotate(-0.6 - ang);
  c.beginPath();
  c.moveTo(r * 0.38, 0);
  c.lineTo(r * 0.9, 0);
  c.stroke();
  c.restore();
  disc(c, 0, 0, r * 0.1);
  fillStroke(c, metal(c, r * 0.2, BRASS), BRASS.s);
  pips(c, 0, r * 0.78, 4, v.charge, r * 0.075);
};

const trap: PartFn = (c, r, v) => {
  const open = 0.5 * (1 - v.snap);
  c.fillStyle = flat('#4b3512');
  rrect(c, -r * 0.7, r * 0.1, r * 1.4, r * 0.26, r * 0.08);
  c.fill();
  for (const s of [-1, 1]) {
    c.save();
    c.translate(s * r * 0.34, r * 0.2);
    c.rotate(-s * open);
    c.beginPath();
    c.arc(0, 0, r * 0.4, Math.PI, 0, s > 0);
    c.lineWidth = r * 0.12;
    c.strokeStyle = metal(c, r, COPPER);
    c.stroke();
    // teeth
    c.fillStyle = flat(COPPER.l);
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * r * 0.2;
      poly(c, [x - r * 0.07, -r * 0.02, x + r * 0.07, -r * 0.02, x, -r * 0.22]);
      c.fill();
    }
    c.restore();
  }
  pips(c, 0, r * 0.74, 5, v.charge, r * 0.07);
};

const recoil: PartFn = (c, r, v) => {
  const h = r * 1.3 * (1 - 0.1 * Math.min(4, v.charge)) + (v.snap > 0 ? Math.sin(v.snap * 10) * r * 0.2 * v.snap : 0);
  c.strokeStyle = metal(c, r, COPPER);
  c.lineWidth = r * 0.12;
  coilWireV(c, r * 0.55, r * 0.55 - h, 0, r * 0.3, 5);
  c.stroke();
  c.fillStyle = flat(BRASS.d);
  c.fillRect(-r * 0.45, r * 0.55, r * 0.9, r * 0.12);
  c.fillRect(-r * 0.45, r * 0.55 - h - r * 0.12, r * 0.9, r * 0.12);
  pips(c, 0, r * 0.84, 4, v.charge, r * 0.07);
};

const volute: PartFn = (c, r, v) => {
  const k = 1 - 0.1 * Math.min(4, v.charge) + (v.snap > 0 ? Math.sin(v.snap * 10) * 0.15 * v.snap : 0);
  const bands = 5;
  const bh = (r * 1.4 * k) / bands;
  for (let i = 0; i < bands; i++) {
    const w = r * (0.85 - i * 0.14);
    const y = r * 0.6 - (i + 1) * bh;
    rrect(c, -w, y, w * 2, bh * 1.1, bh * 0.45);
    fillStroke(c, metal(c, r, i % 2 ? BRONZE : COPPER), COPPER.s);
  }
  pips(c, 0, r * 0.84, 4, v.charge, r * 0.07);
};

const hairspring: PartFn = (c, r, v, t) => {
  const breathe = 1 + Math.sin(t * 3) * 0.04 + v.charge * 0.05;
  c.strokeStyle = metal(c, r, SILVER);
  c.lineWidth = Math.max(1.5, r * 0.05);
  c.beginPath();
  const turns = 6;
  for (let i = 0; i <= 140; i++) {
    const t = i / 140;
    const a = t * TAU * turns + v.rot * 0.4;
    const rad = r * (0.1 + 0.72 * t) * breathe;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.stroke();
  c.beginPath();
  c.moveTo(r * 0.7, -r * 0.2);
  c.lineTo(r * 0.92, -r * 0.5);
  c.strokeStyle = BRASS.l;
  c.lineWidth = r * 0.07;
  c.stroke();
  hub(c, 0, 0, r * 0.09, '#b04a3a', BRASS.s);
  pips(c, 0, r * 0.9, 2, v.charge, r * 0.07);
};

// ---------- cams and levers (bronze) ----------

function lobeCam(c: CanvasRenderingContext2D, r: number, v: Vis, lobes: number, pal: Pal): void {
  c.save();
  c.rotate(v.rot);
  c.beginPath();
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * TAU;
    const bump = Math.max(0, Math.cos(a * lobes)) ** 1.6;
    const rad = r * (0.42 + (lobes === 1 ? 0.3 : 0.26) * bump);
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  fillStroke(c, metal(c, r * 0.8, pal), pal.s);
  c.restore();
  hub(c, 0, 0, r * 0.12);
}

const cam: PartFn = (c, r, v) => {
  lobeCam(c, r, v, 1, BRONZE);
  c.fillStyle = flat(COLOR.steel);
  c.fillRect(-r * 0.07, -r * 0.95, r * 0.14, r * 0.3);
  pips(c, 0, r * 0.82, 2, v.counter % 2, r * 0.09);
};

const tripleCam: PartFn = (c, r, v) => {
  lobeCam(c, r, v, 3, BRONZE);
  pips(c, 0, r * 0.86, 3, v.counter % 3, r * 0.09);
};

const lever: PartFn = (c, r, v) => {
  const tilt = -0.35 + kick(v, 0.4) * 0.7;
  poly(c, [-r * 0.22, r * 0.62, r * 0.22, r * 0.62, 0, r * 0.18]);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  c.save();
  c.translate(0, r * 0.2);
  c.rotate(tilt);
  rrect(c, -r * 0.9, -r * 0.09, r * 1.8, r * 0.18, r * 0.09);
  fillStroke(c, metal(c, r, BRONZE), BRONZE.s);
  disc(c, r * 0.82, 0, r * 0.14);
  fillStroke(c, metal(c, r * 0.3, BRASS), BRASS.s);
  disc(c, -r * 0.82, 0, r * 0.1);
  fillStroke(c, metal(c, r * 0.3, IRON), IRON.s);
  c.restore();
  hub(c, 0, r * 0.2, r * 0.07);
  // echo marks: two arcs, a repeat
  c.strokeStyle = flat(COLOR.lamp);
  c.lineWidth = Math.max(1.5, r * 0.06);
  for (const k of [0.28, 0.46]) {
    c.beginPath();
    c.arc(r * 0.4, -r * 0.5, r * k, -0.9, 0.9);
    c.stroke();
  }
};

const tripHammer: PartFn = (c, r, v) => {
  const ang = -0.9 + kick(v, 0.28) * 1.0;
  c.save();
  c.translate(-r * 0.5, r * 0.5);
  c.rotate(ang);
  rrect(c, 0, -r * 0.07, r * 1.05, r * 0.14, r * 0.05);
  fillStroke(c, metal(c, r, BRONZE), BRONZE.s);
  rrect(c, r * 0.8, -r * 0.27, r * 0.36, r * 0.54, r * 0.07);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  c.restore();
  rrect(c, -r * 0.75, r * 0.5, r * 1.5, r * 0.18, r * 0.06);
  fillStroke(c, metal(c, r, BRONZE), BRONZE.s);
  hub(c, -r * 0.5, r * 0.5, r * 0.09);
};

const tappet: PartFn = (c, r, v) => {
  const out = kick(v, 0.3) * r * 0.28;
  rrect(c, -r * 0.4, -r * 0.55, r * 0.8, r * 0.18, r * 0.05);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  rrect(c, -r * 0.4, r * 0.1, r * 0.8, r * 0.18, r * 0.05);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  rrect(c, -r * 0.09, -r * 0.55 - out, r * 0.18, r * 1.1, r * 0.04);
  fillStroke(c, metal(c, r, BRONZE), BRONZE.s);
  rrect(c, -r * 0.3, -r * 0.7 - out, r * 0.6, r * 0.16, r * 0.07);
  fillStroke(c, metal(c, r, BRASS), BRASS.s);
  disc(c, 0, r * 0.58, r * 0.2);
  fillStroke(c, metal(c, r * 0.4, BRONZE), BRONZE.s);
  disc(c, 0, r * 0.58, r * 0.06);
  c.fillStyle = COLOR.tile;
  c.fill();
};

const camFollower: PartFn = (c, r, v) => {
  c.save();
  c.translate(0, r * 0.38);
  c.rotate(v.rot);
  c.beginPath();
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * TAU;
    const rad = r * (0.3 + 0.18 * Math.max(0, Math.cos(a)) ** 1.5);
    if (i === 0) c.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  c.closePath();
  fillStroke(c, metal(c, r * 0.6, BRONZE), BRONZE.s);
  c.restore();
  const ry = r * 0.38 - r * (0.38 + 0.12 * Math.sin(v.rot * 1));
  c.save();
  c.translate(0, ry - r * 0.12);
  rrect(c, -r * 0.8, -r * 0.08, r * 0.8, r * 0.16, r * 0.07);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  disc(c, 0, r * 0.06, r * 0.17);
  fillStroke(c, metal(c, r * 0.3, BRASS), BRASS.s);
  disc(c, 0, r * 0.06, r * 0.05);
  c.fillStyle = COLOR.tile;
  c.fill();
  c.restore();
  hub(c, -r * 0.8, ry - r * 0.12, r * 0.09);
};

const toggle: PartFn = (c, r, v) => {
  rrect(c, -r * 0.65, -r * 0.7, r * 1.3, r * 1.4, r * 0.18);
  fillStroke(c, metal(c, r, BRONZE), BRONZE.s);
  for (const [x, y] of [[-0.48, -0.55], [0.48, -0.55], [-0.48, 0.55], [0.48, 0.55]]) {
    disc(c, x * r, y * r, r * 0.05);
    c.fillStyle = flat(BRONZE.s);
    c.fill();
  }
  const odd = v.counter % 2 === 0; // the next firing is on an odd tick: Strike
  c.fillStyle = flat(odd ? '#d8573c' : '#5a2c20');
  disc(c, -r * 0.34, -r * 0.4, r * 0.1);
  c.fill();
  c.fillStyle = flat(odd ? '#1f3b4d' : COLOR.plating);
  disc(c, r * 0.34, -r * 0.4, r * 0.1);
  c.fill();
  rrect(c, -r * 0.14, -r * 0.2, r * 0.28, r * 0.78, r * 0.12);
  c.fillStyle = flat('#1d1710');
  c.fill();
  c.save();
  c.translate(0, r * 0.5);
  c.rotate(odd ? -0.55 : 0.55);
  rrect(c, -r * 0.07, -r * 0.62, r * 0.14, r * 0.62, r * 0.07);
  fillStroke(c, metal(c, r * 0.6, SILVER), SILVER.s);
  disc(c, 0, -r * 0.62, r * 0.13);
  fillStroke(c, metal(c, r * 0.3, IRON), IRON.s);
  c.restore();
};

// ---------- tempo (silver) ----------

const escapement: PartFn = (c, r, v, t) => {
  c.save();
  c.translate(0, r * 0.1);
  gear(c, r * 0.46, 12, v.rot, SILVER, 0.28);
  hub(c, 0, 0, r * 0.1);
  c.restore();
  const rock = v.strokeT < 0.4 ? Math.sin(v.strokeT * 16) * 0.5 : Math.sin(t * 1.4) * 0.1;
  c.save();
  c.translate(0, -r * 0.5);
  c.rotate(rock);
  c.strokeStyle = flat(COLOR.brass);
  c.lineWidth = r * 0.16;
  c.beginPath();
  c.moveTo(-r * 0.6, r * 0.35);
  c.lineTo(-r * 0.4, 0);
  c.lineTo(r * 0.4, 0);
  c.lineTo(r * 0.6, r * 0.35);
  c.stroke();
  c.restore();
};

const pendulum: PartFn = (c, r, v, t) => {
  const since = v.strokeT;
  const ang = since < 1.6 ? 0.7 * Math.exp(-since * 2.2) * Math.cos(since * 11) : Math.sin(t * 1.6) * 0.12;
  c.save();
  c.translate(0, -r * 0.8);
  c.rotate(ang);
  c.strokeStyle = flat(COLOR.brassDark);
  c.lineWidth = r * 0.07;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, r * 1.25);
  c.stroke();
  c.save();
  c.translate(0, r * 1.3);
  disc(c, 0, 0, r * 0.3);
  c.lineWidth = Math.max(1.5, r * 0.07);
  fillStroke(c, metal(c, r * 0.5, BRASS), BRASS.s);
  c.restore();
  c.restore();
  hub(c, 0, -r * 0.8, r * 0.1);
};

const anchor: PartFn = (c, r, v, t) => {
  c.save();
  c.translate(0, r * 0.32);
  gear(c, r * 0.4, 12, v.rot, SILVER, 0.3, 'saw');
  hub(c, 0, 0, r * 0.08);
  c.restore();
  const rock = v.strokeT < 0.4 ? Math.sin(v.strokeT * 16) * 0.35 : Math.sin(t * 1.3) * 0.08;
  c.save();
  c.translate(0, -r * 0.1);
  c.rotate(rock);
  c.beginPath();
  c.moveTo(-r * 0.62, r * 0.12);
  c.lineTo(-r * 0.5, -r * 0.38);
  c.quadraticCurveTo(0, -r * 0.8, r * 0.5, -r * 0.38);
  c.lineTo(r * 0.62, r * 0.12);
  c.lineTo(r * 0.44, r * 0.0);
  c.lineTo(r * 0.36, -r * 0.18);
  c.quadraticCurveTo(0, -r * 0.5, -r * 0.36, -r * 0.18);
  c.lineTo(-r * 0.44, 0);
  c.closePath();
  fillStroke(c, metal(c, r, BRASS), BRASS.s);
  c.restore();
  hub(c, 0, -r * 0.1, r * 0.07);
};

const metronome: PartFn = (c, r, v, t) => {
  poly(c, [-r * 0.55, r * 0.88, r * 0.55, r * 0.88, r * 0.22, -r * 0.5, -r * 0.22, -r * 0.5]);
  fillStroke(c, metal(c, r, SILVER), SILVER.s);
  poly(c, [-r * 0.32, r * 0.7, r * 0.32, r * 0.7, r * 0.16, -r * 0.3, -r * 0.16, -r * 0.3]);
  c.fillStyle = flat('#1d2326');
  c.fill();
  const ang = v.strokeT < 1.4 ? 0.55 * Math.exp(-v.strokeT * 1.4) * Math.cos(v.strokeT * 10) : Math.sin(t * 1.5) * 0.1;
  c.save();
  c.translate(0, r * 0.6);
  c.rotate(ang);
  c.strokeStyle = flat(BRASS.l);
  c.lineWidth = r * 0.07;
  c.beginPath();
  c.moveTo(0, r * 0.1);
  c.lineTo(0, -r * 1.35);
  c.stroke();
  rrect(c, -r * 0.14, -r * 0.8, r * 0.28, r * 0.24, r * 0.05);
  fillStroke(c, metal(c, r * 0.3, BRASS), BRASS.s);
  c.restore();
};

const balanceWheel: PartFn = (c, r, v, t) => {
  const ang = (v.strokeT < 1 ? 0.7 : 0.25) * Math.sin(t * 3.4) * (v.strokeT < 1 ? Math.exp(-v.strokeT * 0.5) : 1);
  c.save();
  c.rotate(ang);
  disc(c, 0, 0, r * 0.66);
  c.lineWidth = r * 0.14;
  c.strokeStyle = metal(c, r, SILVER);
  c.stroke();
  c.lineWidth = Math.max(1.5, r * 0.04);
  c.strokeStyle = SILVER.s;
  disc(c, 0, 0, r * 0.74);
  c.stroke();
  spokes(c, 3, r * 0.08, r * 0.62, Math.PI / 2, r * 0.08, SILVER.d);
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * TAU) / 3;
    disc(c, Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66, r * 0.09);
    fillStroke(c, metal(c, r * 0.2, BRASS), BRASS.s);
  }
  c.strokeStyle = flat(COPPER.l);
  c.lineWidth = Math.max(1, r * 0.035);
  c.beginPath();
  for (let i = 0; i <= 90; i++) {
    const k = i / 90;
    const a = k * TAU * 3;
    const rad = r * (0.08 + 0.3 * k);
    if (i === 0) c.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  c.stroke();
  c.restore();
  hub(c, 0, 0, r * 0.07);
};

const verge: PartFn = (c, r, v) => {
  const sw = Math.cos(v.rot * 3);
  // crown wheel edge on the right
  c.save();
  c.translate(r * 0.62, 0);
  gear(c, r * 0.5, 12, v.rot * 0.8, SILVER, 0.22, 'saw');
  c.restore();
  rrect(c, -r * 0.07, -r * 0.85, r * 0.14, r * 1.7, r * 0.04);
  fillStroke(c, metal(c, r, BRASS), BRASS.s);
  for (const [y, s] of [[-0.45, 1], [0.35, -1]]) {
    poly(c, [0, y * r, s * r * 0.55 * (0.5 + 0.5 * Math.abs(sw)), y * r - r * 0.1, s * r * 0.55 * (0.5 + 0.5 * Math.abs(sw)), y * r + r * 0.16, 0, y * r + r * 0.08]);
    fillStroke(c, metal(c, r * 0.5, SILVER), SILVER.s);
  }
  disc(c, 0, -r * 0.85, r * 0.12);
  fillStroke(c, metal(c, r * 0.3, BRASS), BRASS.s);
};

const grandfather: PartFn = (c, r, v, t) => {
  c.beginPath();
  c.moveTo(-r * 0.5, r * 0.95);
  c.lineTo(-r * 0.5, -r * 0.5);
  c.quadraticCurveTo(-r * 0.5, -r * 0.98, 0, -r * 0.98);
  c.quadraticCurveTo(r * 0.5, -r * 0.98, r * 0.5, -r * 0.5);
  c.lineTo(r * 0.5, r * 0.95);
  c.closePath();
  fillStroke(c, metal(c, r * 1.2, COPPER), COPPER.s);
  disc(c, 0, -r * 0.56, r * 0.28);
  c.fillStyle = flat('#f3e6c8');
  c.fill();
  c.strokeStyle = COPPER.s;
  c.stroke();
  c.beginPath();
  c.moveTo(0, -r * 0.56);
  c.lineTo(Math.cos(v.rot * 2) * r * 0.2, -r * 0.56 + Math.sin(v.rot * 2) * r * 0.2);
  c.stroke();
  rrect(c, -r * 0.32, -r * 0.18, r * 0.64, r * 0.6, r * 0.05);
  c.fillStyle = flat('#1d1710');
  c.fill();
  const ang = v.strokeT < 1.6 ? 0.5 * Math.exp(-v.strokeT * 2) * Math.cos(v.strokeT * 9) : Math.sin(t * 1.6) * 0.1;
  c.save();
  c.translate(0, -r * 0.18);
  c.rotate(ang);
  c.strokeStyle = flat(BRASS.l);
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, r * 0.5);
  c.stroke();
  disc(c, 0, r * 0.52, r * 0.1);
  c.fillStyle = flat(BRASS.l);
  c.fill();
  c.restore();
  const drop = Math.min(0.12, v.counter * 0.02);
  c.strokeStyle = flat(BRASS.d);
  c.beginPath();
  c.moveTo(r * 0.2, r * 0.45);
  c.lineTo(r * 0.2, r * (0.62 + drop));
  c.stroke();
  rrect(c, r * 0.1, r * (0.62 + drop), r * 0.2, r * 0.22, r * 0.04);
  fillStroke(c, metal(c, r * 0.3, IRON), IRON.s);
};

const chronometer: PartFn = (c, r, v) => {
  disc(c, 0, 0, r * 0.84);
  fillStroke(c, metal(c, r, BRASS), BRASS.s);
  disc(c, 0, 0, r * 0.68);
  c.fillStyle = flat('#f3e6c8');
  c.fill();
  c.strokeStyle = BRASS.s;
  c.stroke();
  c.lineWidth = Math.max(1.5, r * 0.05);
  c.strokeStyle = flat('#3a2a1b');
  c.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12;
    const r0 = i % 3 === 0 ? 0.5 : 0.58;
    c.moveTo(Math.cos(a) * r * r0, Math.sin(a) * r * r0);
    c.lineTo(Math.cos(a) * r * 0.64, Math.sin(a) * r * 0.64);
  }
  c.stroke();
  c.lineWidth = r * 0.08;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(Math.cos(v.rot * 2 - 1.2) * r * 0.46, Math.sin(v.rot * 2 - 1.2) * r * 0.46);
  c.stroke();
  c.strokeStyle = flat('#b04a3a');
  c.lineWidth = r * 0.045;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(Math.cos(v.rot * 8) * r * 0.54, Math.sin(v.rot * 8) * r * 0.54);
  c.stroke();
  hub(c, 0, 0, r * 0.07, '#b04a3a', BRASS.s);
  c.fillStyle = flat(BRASS.l);
  rrect(c, -r * 0.1, -r * 1.0, r * 0.2, r * 0.18, r * 0.05);
  c.fill();
};

// ---------- steam (iron and ember) ----------

const boiler: PartFn = (c, r, v) => {
  const w = r * 1.5;
  const h = r * 1.1;
  rrect(c, -w / 2, -h / 2, w, h, r * 0.35);
  fillStroke(c, metal(c, r, COPPER), COPPER.s);
  if (v.heat > 0.02) {
    rrect(c, -w / 2, -h / 2, w, h, r * 0.35);
    c.fillStyle = `rgba(255, 140, 60, ${0.5 * v.heat})`;
    c.fill();
  }
  c.fillStyle = flat(COLOR.brass);
  for (const dx of [-0.55, 0, 0.55]) {
    disc(c, dx * w * 0.8, h * 0.3, r * 0.05);
    c.fill();
  }
  disc(c, 0, -h * 0.08, r * 0.2);
  c.fillStyle = flat(COLOR.tile);
  c.fill();
  c.strokeStyle = COLOR.brass;
  c.stroke();
  const needle = -2.2 + Math.min(1, v.heat + 0.2) * 1.6;
  c.beginPath();
  c.moveTo(0, -h * 0.08);
  c.lineTo(Math.cos(needle) * r * 0.17, -h * 0.08 + Math.sin(needle) * r * 0.17);
  c.strokeStyle = COLOR.lamp;
  c.stroke();
  c.fillStyle = flat(COLOR.brassDark);
  c.fillRect(-r * 0.08, -h / 2 - r * 0.2, r * 0.16, r * 0.22);
};

const piston: PartFn = (c, r, v) => {
  const t = Math.min(1, v.strokeT / 0.35);
  const out = v.strokeT < 0.35 ? Math.sin(t * Math.PI) * r * 0.5 : 0;
  rrect(c, -r * 0.85, -r * 0.38, r * 0.95, r * 0.76, r * 0.1);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  c.fillStyle = flat('#c9d1d6');
  c.fillRect(r * 0.1, -r * 0.09, r * 0.4 + out, r * 0.18);
  rrect(c, r * 0.5 + out, -r * 0.4, r * 0.18, r * 0.8, r * 0.05);
  fillStroke(c, metal(c, r * 0.6, BRASS), BRASS.s);
  c.fillStyle = flat(COLOR.brassDark);
  for (const dy of [-0.2, 0.2]) {
    disc(c, -r * 0.65, dy * r, r * 0.05);
    c.fill();
  }
};

const whistle: PartFn = (c, r, v) => {
  rrect(c, -r * 0.8, r * 0.1, r * 0.7, r * 0.34, r * 0.08);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  // the bell: a flared cylinder standing up
  poly(c, [-r * 0.2, r * 0.2, r * 0.7, r * 0.2, r * 0.6, -r * 0.65, -r * 0.1, -r * 0.65]);
  fillStroke(c, metal(c, r, BRASS), BRASS.s);
  c.fillStyle = flat('#1d1710');
  c.fillRect(-r * 0.04, -r * 0.12, r * 0.5, r * 0.2);
  c.strokeStyle = flat(BRASS.d);
  c.lineWidth = r * 0.05;
  for (const y of [-0.45, 0.4]) {
    c.beginPath();
    c.moveTo(-r * 0.14, y * r);
    c.lineTo(r * 0.66, y * r);
    c.stroke();
  }
  // lever valve
  c.strokeStyle = flat(COLOR.steel);
  c.lineWidth = r * 0.07;
  c.beginPath();
  c.moveTo(-r * 0.45, r * 0.1);
  c.lineTo(-r * 0.45 + kick(v, 0.3) * r * 0.1, -r * 0.2);
  c.stroke();
  disc(c, -r * 0.45, -r * 0.24, r * 0.09);
  c.fillStyle = flat('#b04a3a');
  c.fill();
};

const safetyValve: PartFn = (c, r, v) => {
  const lift = kick(v, 0.4) * r * 0.16;
  rrect(c, -r * 0.5, r * 0.2, r * 1.0, r * 0.55, r * 0.1);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  c.beginPath();
  c.arc(0, r * 0.2, r * 0.38, Math.PI, 0);
  fillStroke(c, metal(c, r, COPPER), COPPER.s);
  c.strokeStyle = metal(c, r, SILVER);
  c.lineWidth = r * 0.08;
  coilWireV(c, r * 0.0 - lift, -r * 0.55 - lift, 0, r * 0.16, 4);
  c.stroke();
  rrect(c, -r * 0.3, -r * 0.7 - lift, r * 0.6, r * 0.15, r * 0.05);
  fillStroke(c, metal(c, r * 0.5, BRASS), BRASS.s);
  disc(c, 0, -r * 0.84 - lift, r * 0.13);
  fillStroke(c, metal(c, r * 0.3, EMBER), EMBER.s);
  c.fillStyle = flat(COLOR.brass);
  for (const dx of [-0.32, 0.32]) {
    disc(c, dx * r, r * 0.5, r * 0.05);
    c.fill();
  }
};

const firebox: PartFn = (c, r, v, t) => {
  rrect(c, -r * 0.75, -r * 0.5, r * 1.5, r * 1.25, r * 0.1);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  rrect(c, -r * 0.5, -r * 0.05, r * 1.0, r * 0.62, r * 0.08);
  c.fillStyle = flat('#1d1710');
  c.fill();
  const glow = 0.55 + 0.25 * Math.sin(t * 7) + v.heat * 0.3 + v.glow * 0.3;
  const fl = (x: number, h: number, ph: number): void => {
    const hh = h * (0.8 + 0.2 * Math.sin(t * 9 + ph));
    c.beginPath();
    c.moveTo(x - r * 0.14, r * 0.55);
    c.quadraticCurveTo(x - r * 0.16, r * 0.55 - hh * 0.5, x, r * 0.55 - hh);
    c.quadraticCurveTo(x + r * 0.16, r * 0.55 - hh * 0.5, x + r * 0.14, r * 0.55);
    c.closePath();
  };
  c.fillStyle = `rgba(255, 140, 60, ${Math.min(1, glow)})`;
  fl(-r * 0.25, r * 0.5, 0);
  c.fill();
  fl(r * 0.22, r * 0.6, 2);
  c.fill();
  c.fillStyle = `rgba(255, 224, 140, ${Math.min(1, glow)})`;
  fl(0, r * 0.4, 1);
  c.fill();
  c.strokeStyle = flat(IRON.s);
  c.lineWidth = r * 0.05;
  c.beginPath();
  for (const x of [-0.3, -0.1, 0.1, 0.3]) {
    c.moveTo(x * r, -r * 0.05);
    c.lineTo(x * r, r * 0.57);
  }
  c.stroke();
  rrect(c, r * 0.35, -r * 0.82, r * 0.22, r * 0.34, r * 0.04);
  fillStroke(c, metal(c, r * 0.4, IRON), IRON.s);
};

const kettle: PartFn = (c, r, v) => {
  c.beginPath();
  c.moveTo(-r * 0.62, r * 0.55);
  c.quadraticCurveTo(-r * 0.78, -r * 0.1, -r * 0.3, -r * 0.3);
  c.lineTo(r * 0.3, -r * 0.3);
  c.quadraticCurveTo(r * 0.78, -r * 0.1, r * 0.62, r * 0.55);
  c.closePath();
  fillStroke(c, metal(c, r, COPPER), COPPER.s);
  // spout
  c.beginPath();
  c.moveTo(-r * 0.6, r * 0.3);
  c.quadraticCurveTo(-r * 0.95, r * 0.1, -r * 1.0, -r * 0.3);
  c.lineTo(-r * 0.85, -r * 0.3);
  c.quadraticCurveTo(-r * 0.8, r * 0.0, -r * 0.55, r * 0.0);
  c.closePath();
  fillStroke(c, metal(c, r, COPPER), COPPER.s);
  // handle
  c.beginPath();
  c.arc(r * 0.45, -r * 0.1, r * 0.4, -1.9, 0.6);
  c.lineWidth = r * 0.1;
  c.strokeStyle = metal(c, r, BRASS);
  c.stroke();
  c.lineWidth = Math.max(1.5, r * 0.07);
  ellipse(c, 0, -r * 0.3, r * 0.34, r * 0.1);
  fillStroke(c, metal(c, r * 0.5, BRASS), BRASS.s);
  disc(c, 0, -r * 0.46, r * 0.08);
  c.fillStyle = flat(BRASS.l);
  c.fill();
  c.fillStyle = `rgba(255, 140, 60, ${0.5 * v.heat})`;
  ellipse(c, 0, r * 0.55, r * 0.5, r * 0.08);
  c.fill();
};

const condenser: PartFn = (c, r, v, t) => {
  rrect(c, -r * 0.78, -r * 0.7, r * 1.56, r * 1.4, r * 0.12);
  c.fillStyle = flat('#1f2a30');
  c.fill();
  c.strokeStyle = IRON.s;
  c.stroke();
  c.strokeStyle = metal(c, r, VERD);
  c.lineWidth = r * 0.14;
  c.beginPath();
  for (let i = 0; i < 4; i++) {
    const y = -r * 0.5 + i * r * 0.33;
    if (i % 2 === 0) {
      c.moveTo(-r * 0.6, y);
      c.lineTo(r * 0.6, y);
      if (i < 3) c.arc(r * 0.6, y + r * 0.165, r * 0.165, -Math.PI / 2, Math.PI / 2);
    } else {
      c.moveTo(r * 0.6, y);
      c.lineTo(-r * 0.6, y);
      if (i < 3) c.arc(-r * 0.6, y + r * 0.165, r * 0.165, -Math.PI / 2, Math.PI / 2, true);
    }
  }
  c.stroke();
  // droplets
  c.fillStyle = flat(COLOR.plating);
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.8 + i * 0.33 + v.glow * 0.1) % 1;
    disc(c, (i - 1) * r * 0.4, r * 0.55 + k * r * 0.35, r * 0.05);
    c.fill();
  }
};

const steamHammer: PartFn = (c, r, v) => {
  const t = v.strokeT;
  const down = t < 0.3 ? (t < 0.12 ? lerp(0, 1, t / 0.12) : lerp(1, 0, (t - 0.12) / 0.18)) : 0;
  rrect(c, -r * 0.7, -r * 0.9, r * 1.4, r * 0.2, r * 0.05);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  rrect(c, -r * 0.7, -r * 0.9, r * 0.14, r * 1.7, r * 0.04);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  rrect(c, r * 0.56, -r * 0.9, r * 0.14, r * 1.7, r * 0.04);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  const hy = -r * 0.1 + down * r * 0.3 - (1 - down) * r * 0.2;
  c.fillStyle = flat(COLOR.steel);
  c.fillRect(-r * 0.07, -r * 0.7, r * 0.14, hy + r * 0.7);
  rrect(c, -r * 0.34, hy, r * 0.68, r * 0.34, r * 0.06);
  fillStroke(c, metal(c, r, EMBER), EMBER.s);
  rrect(c, -r * 0.5, r * 0.62, r * 1.0, r * 0.2, r * 0.05);
  fillStroke(c, metal(c, r, IRON), IRON.s);
};

const governor: PartFn = (c, r, v) => {
  const spread = 0.45 + 0.5 * clamp01(v.glow + (v.strokeT < 1 ? 0.3 : 0));
  rrect(c, -r * 0.06, -r * 0.8, r * 0.12, r * 1.5, r * 0.03);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  rrect(c, -r * 0.3, r * 0.62, r * 0.6, r * 0.18, r * 0.05);
  fillStroke(c, metal(c, r, BRASS), BRASS.s);
  const pvy = -r * 0.62;
  const cy = r * 0.1 + r * 0.25 * (1 - spread);
  for (const s of [-1, 1]) {
    const bx = s * r * 0.7 * Math.sin(spread);
    const by = pvy + r * 0.95 * Math.cos(spread);
    c.strokeStyle = flat(BRASS.d);
    c.lineWidth = r * 0.07;
    c.beginPath();
    c.moveTo(0, pvy);
    c.lineTo(bx, by);
    c.moveTo(bx * 0.5, pvy + (by - pvy) * 0.5);
    c.lineTo(0, cy);
    c.stroke();
    c.save();
    c.translate(bx, by);
    disc(c, 0, 0, r * 0.19);
    fillStroke(c, metal(c, r * 0.4, EMBER), EMBER.s);
    c.restore();
  }
  rrect(c, -r * 0.14, cy - r * 0.05, r * 0.28, r * 0.12, r * 0.04);
  fillStroke(c, metal(c, r * 0.3, BRASS), BRASS.s);
  disc(c, 0, pvy, r * 0.09);
  c.fillStyle = flat(BRASS.l);
  c.fill();
};

// ---------- chimes and tools (gold and verdigris) ----------

const chime: PartFn = (c, r, v, t) => {
  rrect(c, -r * 0.8, -r * 0.8, r * 1.6, r * 0.14, r * 0.05);
  fillStroke(c, metal(c, r, BRONZE), BRONZE.s);
  const ring = kick(v, 0.8);
  [[-0.5, 1.15], [0, 1.45], [0.5, 0.9]].forEach(([x, len], i) => {
    const sway = Math.sin(t * 8 + i * 1.7) * 0.07 * (v.strokeT < 1.2 ? Math.exp(-v.strokeT * 2) * 1.2 + 0.05 : 0.05);
    c.save();
    c.translate(x * r, -r * 0.66);
    c.rotate(sway);
    rrect(c, -r * 0.1, 0, r * 0.2, r * len * 0.9, r * 0.1);
    fillStroke(c, metal(c, r * 0.5, i === 1 ? GOLD : VERD), i === 1 ? GOLD.s : VERD.s);
    c.restore();
  });
  if (ring > 0.02) {
    c.strokeStyle = `rgba(255, 226, 154, ${ring * 0.8})`;
    c.lineWidth = Math.max(1.5, r * 0.05);
    for (const k of [0.3, 0.5]) {
      c.beginPath();
      c.arc(0, r * 0.3, r * (0.5 + k * ring), -0.6, 0.6);
      c.stroke();
    }
  }
};

const bellHammer: PartFn = (c, r, v) => {
  const swing = kick(v, 0.3);
  c.save();
  c.translate(-r * 0.1, -r * 0.1);
  c.rotate(Math.sin(v.strokeT * 30) * 0.06 * (v.strokeT < 0.6 ? 1 : 0));
  c.beginPath();
  c.moveTo(-r * 0.7, r * 0.55);
  c.quadraticCurveTo(-r * 0.7, -r * 0.55, 0, -r * 0.6);
  c.quadraticCurveTo(r * 0.7, -r * 0.55, r * 0.7, r * 0.55);
  c.closePath();
  fillStroke(c, metal(c, r, GOLD), GOLD.s);
  rrect(c, -r * 0.78, r * 0.5, r * 1.56, r * 0.14, r * 0.07);
  fillStroke(c, metal(c, r, BRASS), BRASS.s);
  disc(c, 0, -r * 0.68, r * 0.09);
  c.fillStyle = flat(GOLD.l);
  c.fill();
  c.restore();
  c.save();
  c.translate(r * 0.9, r * 0.75);
  c.rotate(-0.6 + swing * 0.5);
  rrect(c, -r * 0.5, -r * 0.05, r * 0.5, r * 0.1, r * 0.04);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  rrect(c, -r * 0.7, -r * 0.13, r * 0.28, r * 0.26, r * 0.06);
  fillStroke(c, metal(c, r * 0.4, VERD), VERD.s);
  c.restore();
};

const oilCan: PartFn = (c, r, v, t) => {
  rrect(c, -r * 0.5, -r * 0.05, r * 0.95, r * 0.7, r * 0.2);
  fillStroke(c, metal(c, r, GOLD), GOLD.s);
  rrect(c, -r * 0.3, -r * 0.3, r * 0.5, r * 0.28, r * 0.08);
  fillStroke(c, metal(c, r * 0.6, GOLD), GOLD.s);
  c.beginPath();
  c.moveTo(-r * 0.4, r * 0.2);
  c.lineTo(-r * 0.95, -r * 0.45);
  c.lineWidth = r * 0.12;
  c.strokeStyle = GOLD.s;
  c.stroke();
  c.lineWidth = r * 0.07;
  c.strokeStyle = metal(c, r, GOLD);
  c.stroke();
  c.beginPath();
  c.arc(r * 0.5, r * 0.1, r * 0.3, -1.4, 1.4);
  c.lineWidth = r * 0.09;
  c.strokeStyle = metal(c, r, VERD);
  c.stroke();
  const k = (t * 0.9 + v.strokeT * 0.2) % 1;
  c.fillStyle = flat('#6a4a1a');
  ellipse(c, -r * 0.97, -r * 0.4 + k * r * 1.1, r * 0.05, r * (0.06 + 0.04 * k));
  c.fill();
  c.fillStyle = flat(COLOR.lamp);
  disc(c, r * 0.0, -r * 0.4 - kick(v, 0.3) * r * 0.06, r * 0.07);
  c.fill();
};

const tuningFork: PartFn = (c, r, v, t) => {
  const vib = v.strokeT < 1.2 ? Math.sin(t * 90) * 0.05 * Math.exp(-v.strokeT * 2.5) : 0;
  c.strokeStyle = metal(c, r, VERD);
  c.lineCap = 'round';
  c.lineWidth = r * 0.14;
  c.beginPath();
  c.moveTo(0, r * 0.9);
  c.lineTo(0, r * 0.1);
  c.stroke();
  c.beginPath();
  c.moveTo(0, r * 0.1);
  c.bezierCurveTo(-r * 0.28, r * 0.05, -r * 0.3 - vib * r, -r * 0.2, -r * 0.3 - vib * r, -r * 0.8);
  c.moveTo(0, r * 0.1);
  c.bezierCurveTo(r * 0.28, r * 0.05, r * 0.3 + vib * r, -r * 0.2, r * 0.3 + vib * r, -r * 0.8);
  c.stroke();
  const ring = kick(v, 0.8);
  if (ring > 0.02) {
    c.strokeStyle = `rgba(169, 221, 210, ${ring * 0.8})`;
    c.lineWidth = Math.max(1.5, r * 0.05);
    for (const s of [-1, 1]) {
      c.beginPath();
      c.arc(s * r * 0.3, -r * 0.5, r * (0.25 + 0.2 * ring), s > 0 ? -0.8 : Math.PI - 0.8, s > 0 ? 0.8 : Math.PI + 0.8);
      c.stroke();
    }
  }
};

const alarmClock: PartFn = (c, r, v) => {
  const shake = v.strokeT < 0.8 ? Math.sin(v.strokeT * 70) * 0.06 : 0;
  c.rotate(shake);
  c.strokeStyle = flat(IRON.d);
  c.lineWidth = r * 0.1;
  c.beginPath();
  c.moveTo(-r * 0.4, r * 0.55);
  c.lineTo(-r * 0.55, r * 0.9);
  c.moveTo(r * 0.4, r * 0.55);
  c.lineTo(r * 0.55, r * 0.9);
  c.stroke();
  for (const s of [-1, 1]) {
    c.beginPath();
    c.arc(s * r * 0.42, -r * 0.62, r * 0.28, Math.PI, 0);
    c.closePath();
    fillStroke(c, metal(c, r * 0.6, GOLD), GOLD.s);
  }
  c.strokeStyle = flat(IRON.d);
  c.beginPath();
  c.moveTo(0, -r * 0.82);
  c.lineTo(0, -r * 0.6 - kick(v, 0.1) * 0);
  c.stroke();
  disc(c, 0, 0, r * 0.66);
  fillStroke(c, metal(c, r, BRASS), BRASS.s);
  disc(c, 0, 0, r * 0.52);
  c.fillStyle = flat('#f3e6c8');
  c.fill();
  c.lineWidth = Math.max(1.5, r * 0.06);
  c.strokeStyle = flat('#3a2a1b');
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, -r * 0.36);
  c.moveTo(0, 0);
  c.lineTo(r * 0.26, r * 0.1);
  c.stroke();
  c.strokeStyle = flat('#b04a3a');
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(Math.cos(v.rot * 4) * r * 0.4, Math.sin(v.rot * 4) * r * 0.4);
  c.stroke();
};

const gong: PartFn = (c, r, v, t) => {
  c.strokeStyle = flat(BRONZE.d);
  c.lineWidth = r * 0.11;
  c.beginPath();
  c.moveTo(-r * 0.8, r * 0.9);
  c.lineTo(-r * 0.8, -r * 0.8);
  c.lineTo(r * 0.8, -r * 0.8);
  c.lineTo(r * 0.8, r * 0.9);
  c.stroke();
  const wob = v.strokeT < 1.4 ? Math.sin(t * 40) * 0.06 * Math.exp(-v.strokeT * 2.2) : 0;
  c.strokeStyle = flat(COLOR.inkSoft);
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(-r * 0.3, -r * 0.8);
  c.lineTo(-r * 0.2, -r * 0.35);
  c.moveTo(r * 0.3, -r * 0.8);
  c.lineTo(r * 0.2, -r * 0.35);
  c.stroke();
  c.save();
  c.translate(0, r * 0.05);
  c.scale(1 + wob, 1 - wob);
  disc(c, 0, 0, r * 0.5);
  fillStroke(c, metal(c, r, GOLD), GOLD.s);
  for (const k of [0.34, 0.17]) {
    disc(c, 0, 0, r * k);
    c.strokeStyle = 'rgba(90, 67, 16, 0.7)';
    c.stroke();
  }
  disc(c, 0, 0, r * 0.07);
  c.fillStyle = flat(GOLD.d);
  c.fill();
  c.restore();
};

const lamp: PartFn = (c, r, v, t) => {
  const glow = 0.65 + 0.2 * Math.sin(t * 5) + v.glow * 0.3;
  const g = c.createRadialGradient(0, -r * 0.2, r * 0.05, 0, -r * 0.2, r * 0.95);
  g.addColorStop(0, `rgba(255, 226, 154, ${Math.min(1, glow) * 0.6})`);
  g.addColorStop(1, 'rgba(255, 226, 154, 0)');
  c.fillStyle = g;
  c.fillRect(-r, -r * 1.2, r * 2, r * 2);
  rrect(c, -r * 0.35, r * 0.3, r * 0.7, r * 0.5, r * 0.1);
  fillStroke(c, metal(c, r, BRASS), BRASS.s);
  rrect(c, -r * 0.25, r * 0.2, r * 0.5, r * 0.14, r * 0.04);
  fillStroke(c, metal(c, r * 0.4, GOLD), GOLD.s);
  c.beginPath();
  c.moveTo(-r * 0.2, r * 0.22);
  c.bezierCurveTo(-r * 0.7, -r * 0.1, -r * 0.4, -r * 0.8, 0, -r * 0.8);
  c.bezierCurveTo(r * 0.4, -r * 0.8, r * 0.7, -r * 0.1, r * 0.2, r * 0.22);
  c.closePath();
  c.fillStyle = `rgba(255, 236, 190, ${0.35 + 0.3 * Math.min(1, glow)})`;
  c.fill();
  c.strokeStyle = flat(BRASS.s);
  c.stroke();
  c.strokeStyle = flat('#fff6d8');
  c.lineWidth = r * 0.06;
  c.beginPath();
  c.moveTo(-r * 0.1, r * 0.2);
  c.lineTo(-r * 0.12, -r * 0.1);
  c.quadraticCurveTo(0, -r * 0.4, r * 0.12, -r * 0.1);
  c.lineTo(r * 0.1, r * 0.2);
  c.stroke();
};

// ---------- family fallbacks ----------

const fallbackGear: PartFn = (c, r, v) => {
  gear(c, r * 0.6, 8, v.rot, BRASS);
  hub(c, 0, 0, r * 0.12);
};
const fallbackSpring: PartFn = (c, r, v) => {
  c.strokeStyle = metal(c, r, COPPER);
  c.lineWidth = r * 0.14;
  coilWire(c, -r * 0.7, r * 0.7, 0, r * 0.34, 5);
  c.stroke();
  pips(c, 0, r * 0.66, 3, v.charge, r * 0.09);
};
const fallbackCam: PartFn = (c, r, v) => lobeCam(c, r, v, 2, BRONZE);
const fallbackTempo: PartFn = (c, r, v) => {
  disc(c, 0, 0, r * 0.7);
  fillStroke(c, metal(c, r, SILVER), SILVER.s);
  spokes(c, 4, r * 0.1, r * 0.62, v.rot, r * 0.06, SILVER.s);
  hub(c, 0, 0, r * 0.1);
};
const fallbackSteam: PartFn = (c, r) => {
  rrect(c, -r * 0.7, -r * 0.45, r * 1.4, r * 0.9, r * 0.25);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  disc(c, 0, 0, r * 0.2);
  fillStroke(c, metal(c, r * 0.3, EMBER), EMBER.s);
};
const fallbackChime: PartFn = (c, r) => {
  c.beginPath();
  c.moveTo(-r * 0.6, r * 0.5);
  c.quadraticCurveTo(-r * 0.6, -r * 0.5, 0, -r * 0.55);
  c.quadraticCurveTo(r * 0.6, -r * 0.5, r * 0.6, r * 0.5);
  c.closePath();
  fillStroke(c, metal(c, r, GOLD), GOLD.s);
};

const FALLBACK: Record<Family, PartFn> = {
  gear: fallbackGear, spring: fallbackSpring, cam: fallbackCam, tempo: fallbackTempo, steam: fallbackSteam, chime: fallbackChime,
};

const PAINT: Record<string, PartFn> = {
  spur, idler, bevel, crown, ratchet, flywheel, planetary, 'sprocket-wheel': sprocketWheel,
  coil, leaf, torsion, trap, recoil, volute, hairspring,
  cam, 'triple-cam': tripleCam, lever, 'trip-hammer': tripHammer, tappet, 'cam-follower': camFollower, toggle,
  escapement, pendulum, anchor, metronome, 'balance-wheel': balanceWheel, verge, grandfather, chronometer,
  boiler, piston, whistle, 'safety-valve': safetyValve, firebox, kettle, condenser, 'steam-hammer': steamHammer, governor,
  chime, 'bell-hammer': bellHammer, 'oil-can': oilCan, 'tuning-fork': tuningFork, 'alarm-clock': alarmClock, gong, lamp,
};

/** Ids with a dedicated painter (used by the preview test). */
export const PART_IDS: string[] = Object.keys(PAINT);

export function aura(c: CanvasRenderingContext2D, x: number, y: number, r: number, glow: number): void {
  if (glow <= 0.02) return;
  const g = c.createRadialGradient(x, y, r * 0.2, x, y, r * 1.5);
  g.addColorStop(0, `rgba(255, 210, 122, ${0.55 * glow})`);
  g.addColorStop(1, 'rgba(255, 210, 122, 0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r * 1.5, 0, TAU);
  c.fill();
}

function plusMark(c: CanvasRenderingContext2D, r: number, now: number): void {
  // a polished rim glint sweeping round the part
  const a = (now * 1.1) % TAU;
  c.strokeStyle = 'rgba(255, 244, 214, 0.75)';
  c.lineWidth = Math.max(1.5, r * 0.06);
  c.beginPath();
  c.arc(0, 0, r * 0.92, a, a + 0.55);
  c.stroke();
  c.strokeStyle = 'rgba(255, 210, 122, 0.35)';
  c.beginPath();
  c.arc(0, 0, r * 0.92, a + 3.14, a + 3.5);
  c.stroke();
  // the "+" stamp on a small brass plate, upper left
  const px = -r * 0.74;
  const py = -r * 0.72;
  const pr = r * 0.2;
  c.beginPath();
  c.arc(px, py, pr, 0, TAU);
  c.fillStyle = COLOR.lamp;
  c.fill();
  c.strokeStyle = BRASS.s;
  c.lineWidth = Math.max(1, r * 0.04);
  c.stroke();
  c.strokeStyle = '#4b3512';
  c.lineWidth = Math.max(1.5, r * 0.07);
  c.beginPath();
  c.moveTo(px - pr * 0.55, py);
  c.lineTo(px + pr * 0.55, py);
  c.moveTo(px, py - pr * 0.55);
  c.lineTo(px, py + pr * 0.55);
  c.stroke();
}

function rustOver(c: CanvasRenderingContext2D, r: number, k: number): void {
  // orange patina spreading from the edge in as k grows
  c.fillStyle = `rgba(164, 80, 42, ${0.42 * k})`;
  c.beginPath();
  c.arc(0, 0, r * (0.25 + 0.6 * k), 0, TAU);
  c.fill();
  c.fillStyle = `rgba(120, 50, 20, ${0.75 * k})`;
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4;
    const d = r * 0.7 * k * (0.5 + (i % 3) * 0.25);
    c.beginPath();
    c.arc(Math.cos(a) * d, Math.sin(a * 1.3) * d, r * (0.06 + (i % 3) * 0.03) * (0.4 + k), 0, TAU);
    c.fill();
  }
}

export function drawPart(
  c: CanvasRenderingContext2D,
  defId: string,
  plus: boolean,
  x: number,
  y: number,
  r: number,
  v: Vis,
  now: number,
): void {
  aura(c, x, y, r, v.glow);
  c.save();
  c.translate(x, y);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.lineWidth = Math.max(1.5, r * 0.07);
  const fn = PAINT[defId] ?? FALLBACK[FAMILY_OF[defId] ?? 'gear'];
  fn(c, r, v, now);
  if (plus) plusMark(c, r, now);
  const k = v.rusted ? Math.max(v.patina, 0.35) : v.patina;
  if (k > 0.01) rustOver(c, r, k);
  c.restore();
}

/** Ghost repeat for Echo: a faded copy that grows and fades. */
export function drawEcho(c: CanvasRenderingContext2D, defId: string, plus: boolean, x: number, y: number, r: number, v: Vis, now: number): void {
  const k = 1 - v.echo;
  c.save();
  c.globalAlpha = 0.45 * v.echo;
  drawPart(c, defId, plus, x, y, r * (1 + k * 0.35), v, now);
  c.restore();
}
