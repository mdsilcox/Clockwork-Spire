// Enemy painters: a distinct clockwork creature per id, drawn around the origin inside a box of radius r.
// Idle bob, hit flash and shake, attack lunge and death collapse are applied by drawEnemy for every creature.
import { COLOR } from './palette';
import {
  BRASS, BRONZE, COPPER, EMBER, GOLD, IRON, RUSTP, SILVER, TAU, VERD,
  coilWireV, disc, ellipse, eyes, fillStroke, flat, gear, hub, metal, poly, rrect, spokes, state,
} from './kit';
import type { Pal } from './kit';
import { ATTACK_TIME, BOSS_PAINT, atk } from './bosses';

export interface EnemyLook {
  hit: number; // 0..1 flash, decays
  dead: number; // 0 alive .. 1 gone
  t: number; // seconds, for idle motion
  seed: number;
  lunge: number; // seconds since the last attack started (large when idle)
  phase: number; // boss phase, 0-based
  heat: number; // 0..1, the Boilermaker Queen and friends
  drop: number; // 1 .. 0 summon drop-in
  morph: number; // 1 .. 0 after a phase change (cracks of light)
}

export const newLook = (seed: number): EnemyLook => ({ hit: 0, dead: 0, t: 0, seed, lunge: 99, phase: 0, heat: 0, drop: 0, morph: 0 });

type EnemyFn = (c: CanvasRenderingContext2D, r: number, L: EnemyLook) => void;

const sw = (L: EnemyLook, speed: number, ph = 0): number => Math.sin(L.t * speed + L.seed + ph);
const PURPLE: Pal = { l: '#6d5a78', d: '#241a2c', s: '#120c18' };
const STEAM: Pal = { l: '#f4f7f9', d: '#9fb0ba', s: '#5b6b75' };

function legs(c: CanvasRenderingContext2D, n: number, x0: number, spread: number, y: number, len: number, L: EnemyLook, col: string, speed = 6): void {
  c.strokeStyle = flat(col);
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0 : i / (n - 1) - 0.5;
    const wig = Math.sin(L.t * speed + i * 1.3 + L.seed) * len * 0.2;
    c.beginPath();
    c.moveTo(x0 + k * spread, y);
    c.lineTo(x0 + k * spread * 1.2 + wig, y + len * 0.6);
    c.lineTo(x0 + k * spread * 1.35 + wig, y + len);
    c.stroke();
  }
}

// ---------- Act 1: the Gearworks ----------

const rustMite: EnemyFn = (c, r, L) => {
  c.strokeStyle = flat('#4b2410');
  for (let i = 0; i < 3; i++) {
    const k = (i - 1) * r * 0.42;
    const wig = Math.sin(L.t * 6 + i + L.seed) * r * 0.08;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(s * r * 0.4, k * 0.6);
      c.lineTo(s * r * 0.8, k + wig);
      c.lineTo(s * r * 0.95, k + r * 0.28);
      c.stroke();
    }
  }
  ellipse(c, 0, 0, r * 0.55, r * 0.46);
  fillStroke(c, metal(c, r, RUSTP), '#4b2410');
  c.fillStyle = flat('rgba(70, 30, 10, 0.6)');
  for (let i = 0; i < 5; i++) {
    disc(c, Math.cos(i * 2.2) * r * 0.3, Math.sin(i * 1.7) * r * 0.22, r * 0.07);
    c.fill();
  }
  eyes(c, r * 0.0, -r * 0.1, r * 0.2, r * 0.1);
  c.strokeStyle = flat(COLOR.steel);
  c.beginPath();
  c.moveTo(-r * 0.12, -r * 0.45);
  c.lineTo(-r * 0.28, -r * 0.75);
  c.moveTo(r * 0.12, -r * 0.45);
  c.lineTo(r * 0.28, -r * 0.75);
  c.stroke();
};

const cogRat: EnemyFn = (c, r, L) => {
  c.strokeStyle = flat(COLOR.steel);
  c.lineWidth = r * 0.08;
  c.beginPath();
  c.moveTo(-r * 0.6, r * 0.2);
  c.bezierCurveTo(-r * 1.0, r * 0.4 + sw(L, 4) * r * 0.1, -r * 0.9, -r * 0.2, -r * 1.1, -r * 0.3);
  c.stroke();
  c.lineWidth = Math.max(1.5, r * 0.06);
  ellipse(c, -r * 0.05, r * 0.1, r * 0.62, r * 0.42);
  fillStroke(c, metal(c, r, { l: '#b9b2a6', d: '#5c564d', s: '#2b2620' }), '#2b2620');
  c.save();
  c.translate(-r * 0.1, r * 0.08);
  gear(c, r * 0.2, 8, L.t * 0.8, BRASS, 0.25);
  c.restore();
  poly(c, [r * 0.4, -r * 0.1, r * 0.95, r * 0.12, r * 0.4, r * 0.38]);
  fillStroke(c, flat('#c9c2b6'), '#2b2620');
  disc(c, r * 0.5, 0, r * 0.07);
  c.fillStyle = flat(COLOR.lamp);
  c.fill();
  disc(c, r * 0.25, -r * 0.25, r * 0.17);
  fillStroke(c, flat('#9d948a'), '#2b2620');
  c.strokeStyle = flat('#2b2620');
  for (const s of [-0.3, 0.3]) {
    c.beginPath();
    c.moveTo(s * r, r * 0.45);
    c.lineTo(s * r, r * 0.7);
    c.stroke();
  }
};

const brassBeetle: EnemyFn = (c, r, L) => {
  legs(c, 3, -r * 0.1, r * 0.6, r * 0.3, r * 0.5, L, '#4b3512', 4);
  c.beginPath();
  c.moveTo(-r * 0.85, r * 0.35);
  c.quadraticCurveTo(-r * 0.85, -r * 0.7, r * 0.1, -r * 0.7);
  c.quadraticCurveTo(r * 0.8, -r * 0.6, r * 0.8, r * 0.35);
  c.closePath();
  fillStroke(c, metal(c, r * 1.2, BRASS), BRASS.s);
  c.strokeStyle = flat(BRASS.s);
  c.beginPath();
  c.moveTo(r * 0.0, -r * 0.7);
  c.lineTo(r * 0.02, r * 0.35);
  c.stroke();
  for (const [x, y] of [[-0.45, -0.2], [-0.45, 0.1], [0.4, -0.2], [0.4, 0.1]]) {
    disc(c, x * r, y * r, r * 0.05);
    c.fillStyle = flat(BRASS.l);
    c.fill();
  }
  c.beginPath();
  c.moveTo(r * 0.7, -r * 0.1);
  c.lineTo(r * 1.0, -r * 0.05);
  c.lineTo(r * 1.0, r * 0.3);
  c.lineTo(r * 0.7, r * 0.3);
  c.closePath();
  fillStroke(c, metal(c, r * 0.5, IRON), IRON.s);
  eyes(c, r * 0.9, r * 0.0, r * 0.0, r * 0.06);
  c.strokeStyle = flat(IRON.s);
  c.beginPath();
  c.moveTo(r * 1.0, r * 0.22);
  c.lineTo(r * 1.15, r * 0.12);
  c.moveTo(r * 1.0, r * 0.3);
  c.lineTo(r * 1.15, r * 0.4);
  c.stroke();
};

const oilSlick: EnemyFn = (c, r, L) => {
  const w = 1 + sw(L, 3) * 0.05;
  c.beginPath();
  c.moveTo(-r * 0.9, r * 0.45);
  c.bezierCurveTo(-r * 1.0, -r * 0.2, -r * 0.4, -r * 0.55 * w, 0, -r * 0.5 * w);
  c.bezierCurveTo(r * 0.5, -r * 0.55, r * 1.0, -r * 0.1, r * 0.9, r * 0.45);
  c.bezierCurveTo(r * 0.5, r * 0.6, -r * 0.5, r * 0.6, -r * 0.9, r * 0.45);
  c.closePath();
  fillStroke(c, metal(c, r * 1.2, PURPLE), PURPLE.s);
  c.strokeStyle = flat('rgba(120, 220, 190, 0.55)');
  c.lineWidth = r * 0.05;
  c.beginPath();
  c.arc(-r * 0.2, -r * 0.1, r * 0.4, 3.6, 4.7);
  c.stroke();
  c.strokeStyle = flat('rgba(220, 120, 200, 0.5)');
  c.beginPath();
  c.arc(r * 0.3, 0, r * 0.35, 3.5, 4.6);
  c.stroke();
  eyes(c, 0, -r * 0.05, r * 0.25, r * 0.1, '#e8d7ff');
  const k = (L.t * 0.7 + L.seed) % 1;
  disc(c, r * 0.55, r * 0.5 + k * r * 0.3, r * 0.07 * (1 - k * 0.4));
  c.fillStyle = flat(PURPLE.l);
  c.fill();
};

const springImp: EnemyFn = (c, r, L) => {
  const b = Math.abs(sw(L, 5));
  const coilH = r * (0.5 + 0.1 * (1 - b));
  c.strokeStyle = metal(c, r, COPPER);
  c.lineWidth = r * 0.09;
  coilWireV(c, r * 0.9, r * 0.9 - coilH, 0, r * 0.26, 4);
  c.stroke();
  c.lineWidth = Math.max(1.5, r * 0.06);
  const by = r * 0.9 - coilH - r * 0.5 - b * r * 0.08;
  ellipse(c, 0, by + r * 0.1, r * 0.45, r * 0.4);
  fillStroke(c, metal(c, r, EMBER), EMBER.s);
  poly(c, [-r * 0.32, by - r * 0.15, -r * 0.55, by - r * 0.62, -r * 0.1, by - r * 0.3]);
  fillStroke(c, flat(EMBER.d), EMBER.s);
  poly(c, [r * 0.32, by - r * 0.15, r * 0.55, by - r * 0.62, r * 0.1, by - r * 0.3]);
  fillStroke(c, flat(EMBER.d), EMBER.s);
  eyes(c, 0, by, r * 0.18, r * 0.09, '#fff3c0');
  c.strokeStyle = flat(EMBER.s);
  c.beginPath();
  c.arc(0, by + r * 0.2, r * 0.18, 0.2, Math.PI - 0.2);
  c.stroke();
};

const gearhound: EnemyFn = (c, r, L) => {
  const run = sw(L, 5);
  c.strokeStyle = flat(IRON.s);
  c.lineWidth = r * 0.1;
  for (const [x, ph] of [[-0.55, 0], [-0.25, 2], [0.3, 1], [0.6, 3]]) {
    c.beginPath();
    c.moveTo(x * r, r * 0.25);
    c.lineTo(x * r + Math.sin(L.t * 5 + ph) * r * 0.12, r * 0.85);
    c.stroke();
  }
  c.lineWidth = Math.max(1.5, r * 0.06);
  c.strokeStyle = flat(IRON.l);
  c.beginPath();
  c.moveTo(-r * 0.8, -r * 0.15);
  c.quadraticCurveTo(-r * 1.05, -r * 0.4 + run * r * 0.1, -r * 0.95, -r * 0.7);
  c.stroke();
  rrect(c, -r * 0.85, -r * 0.35, r * 1.5, r * 0.7, r * 0.3);
  fillStroke(c, metal(c, r * 1.2, IRON), IRON.s);
  c.save();
  c.translate(-r * 0.1, 0);
  gear(c, r * 0.22, 9, L.t * 1.2, BRASS, 0.25);
  c.restore();
  poly(c, [r * 0.5, -r * 0.5, r * 1.0, -r * 0.2, r * 1.05, r * 0.05, r * 0.55, r * 0.2, r * 0.45, -r * 0.05]);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  poly(c, [r * 0.55, -r * 0.5, r * 0.5, -r * 0.85, r * 0.75, -r * 0.5]);
  fillStroke(c, flat(IRON.d), IRON.s);
  eyes(c, r * 0.72, -r * 0.22, 0, r * 0.07, '#ff7a55');
  c.fillStyle = flat('#f1e3c6');
  for (const x of [0.88, 0.97]) {
    poly(c, [x * r, r * 0.04, (x + 0.05) * r, r * 0.04, (x + 0.025) * r, r * 0.14]);
    c.fill();
  }
};

const tinpotGeneral: EnemyFn = (c, r, L) => {
  rrect(c, -r * 0.5, -r * 0.1, r * 1.0, r * 0.95, r * 0.25);
  fillStroke(c, metal(c, r, SILVER), SILVER.s);
  c.fillStyle = flat('#b04a3a');
  c.fillRect(-r * 0.5, r * 0.2, r * 1.0, r * 0.14);
  for (const s of [-1, 1]) {
    rrect(c, s * r * 0.5 - r * 0.13, -r * 0.12, r * 0.26, r * 0.18, r * 0.05);
    fillStroke(c, metal(c, r * 0.4, GOLD), GOLD.s);
  }
  disc(c, 0, -r * 0.3, r * 0.34);
  fillStroke(c, metal(c, r, COPPER), COPPER.s);
  eyes(c, 0, -r * 0.3, r * 0.13, r * 0.06, '#fff3c0');
  c.strokeStyle = flat('#3a2a1b');
  c.lineWidth = r * 0.07;
  c.beginPath();
  c.moveTo(-r * 0.2, -r * 0.14);
  c.quadraticCurveTo(0, -r * 0.08, r * 0.2, -r * 0.14);
  c.stroke();
  c.lineWidth = Math.max(1.5, r * 0.06);
  // pot helmet
  c.beginPath();
  c.moveTo(-r * 0.42, -r * 0.38);
  c.quadraticCurveTo(-r * 0.42, -r * 0.88, 0, -r * 0.88);
  c.quadraticCurveTo(r * 0.42, -r * 0.88, r * 0.42, -r * 0.38);
  c.closePath();
  fillStroke(c, metal(c, r, IRON), IRON.s);
  rrect(c, -r * 0.52, -r * 0.42, r * 1.04, r * 0.1, r * 0.04);
  fillStroke(c, metal(c, r * 0.4, IRON), IRON.s);
  disc(c, 0, -r * 0.94, r * 0.07);
  c.fillStyle = flat(IRON.l);
  c.fill();
  // baton
  c.save();
  c.translate(r * 0.65, r * 0.35);
  c.rotate(-0.5 + sw(L, 2) * 0.08);
  c.fillStyle = flat(GOLD.l);
  c.fillRect(-r * 0.04, -r * 0.7, r * 0.08, r * 0.8);
  c.restore();
};

const foreman: EnemyFn = (c, r, L) => {
  // big gear on his back
  c.save();
  c.translate(-r * 0.2, -r * 0.1);
  gear(c, r * 0.7, 12, -L.t * 0.4, IRON, 0.18);
  c.restore();
  rrect(c, -r * 0.55, -r * 0.2, r * 1.1, r * 1.05, r * 0.15);
  fillStroke(c, metal(c, r * 1.2, { l: '#d9694e', d: '#8a3a28', s: '#3a120a' }), '#3a120a');
  c.fillStyle = flat('#2b3a4d');
  c.fillRect(-r * 0.38, r * 0.15, r * 0.76, r * 0.7);
  for (const s of [-1, 1]) {
    c.strokeStyle = flat('#2b3a4d');
    c.lineWidth = r * 0.1;
    c.beginPath();
    c.moveTo(s * r * 0.25, r * 0.15);
    c.lineTo(s * r * 0.2, -r * 0.15);
    c.stroke();
  }
  c.lineWidth = Math.max(1.5, r * 0.06);
  // arms and wrench
  const a = sw(L, 2.2) * 0.1;
  c.strokeStyle = flat(BRASS.d);
  c.lineWidth = r * 0.2;
  c.beginPath();
  c.moveTo(r * 0.55, r * 0.0);
  c.lineTo(r * 0.95, r * 0.35);
  c.moveTo(-r * 0.55, r * 0.0);
  c.lineTo(-r * 0.9, r * 0.4);
  c.stroke();
  c.lineWidth = Math.max(1.5, r * 0.06);
  c.save();
  c.translate(r * 0.95, r * 0.3);
  c.rotate(-0.7 + a);
  rrect(c, -r * 0.06, -r * 0.95, r * 0.12, r * 1.0, r * 0.04);
  fillStroke(c, metal(c, r * 0.5, SILVER), SILVER.s);
  disc(c, 0, -r * 0.98, r * 0.17);
  fillStroke(c, metal(c, r * 0.4, SILVER), SILVER.s);
  c.restore();
  // head and hard hat
  rrect(c, -r * 0.3, -r * 0.62, r * 0.6, r * 0.5, r * 0.15);
  fillStroke(c, metal(c, r, COPPER), COPPER.s);
  eyes(c, 0, -r * 0.4, r * 0.12, r * 0.06, '#fff3c0');
  c.beginPath();
  c.arc(0, -r * 0.62, r * 0.38, Math.PI, 0);
  fillStroke(c, metal(c, r, GOLD), GOLD.s);
  c.fillStyle = flat(GOLD.d);
  c.fillRect(-r * 0.5, -r * 0.65, r * 1.0, r * 0.08);
};

// ---------- Act 2: the Steamworks ----------

const steamWraith: EnemyFn = (c, r, L) => {
  c.globalAlpha *= 0.9;
  for (let i = 0; i < 4; i++) {
    const y = r * 0.1 + i * r * 0.18;
    const x = Math.sin(L.t * 2 + i * 1.1 + L.seed) * r * 0.2;
    disc(c, x, y, r * (0.5 - i * 0.07));
    c.fillStyle = flat(`rgba(222, 232, 240, ${0.55 - i * 0.08})`);
    c.fill();
  }
  c.beginPath();
  c.moveTo(-r * 0.55, r * 0.25);
  c.bezierCurveTo(-r * 0.7, -r * 0.7, r * 0.7, -r * 0.7, r * 0.55, r * 0.25);
  c.bezierCurveTo(r * 0.4, r * 0.1, r * 0.3, r * 0.45, r * 0.15, r * 0.2);
  c.bezierCurveTo(0, r * 0.5, -r * 0.2, r * 0.1, -r * 0.35, r * 0.4);
  c.bezierCurveTo(-r * 0.4, r * 0.15, -r * 0.5, r * 0.3, -r * 0.55, r * 0.25);
  c.closePath();
  fillStroke(c, flat('rgba(236, 242, 246, 0.85)'), STEAM.s);
  eyes(c, 0, -r * 0.12, r * 0.2, r * 0.1, '#7fc8ff');
  c.fillStyle = flat('#1d2a33');
  ellipse(c, 0, r * 0.08, r * 0.1, r * 0.14);
  c.fill();
  // a pipe elbow where its tail should be
  c.strokeStyle = flat(IRON.l);
  c.lineWidth = r * 0.12;
  c.beginPath();
  c.moveTo(-r * 0.2, r * 0.5);
  c.lineTo(-r * 0.2, r * 0.75);
  c.lineTo(r * 0.1, r * 0.75);
  c.stroke();
};

const valveCrab: EnemyFn = (c, r, L) => {
  legs(c, 3, -r * 0.45, r * 0.0, r * 0.3, r * 0.45, L, '#4b2410', 4);
  c.save();
  c.scale(-1, 1);
  legs(c, 3, -r * 0.45, r * 0.0, r * 0.3, r * 0.45, L, '#4b2410', 4);
  c.restore();
  ellipse(c, 0, r * 0.1, r * 0.7, r * 0.45);
  fillStroke(c, metal(c, r * 1.2, COPPER), COPPER.s);
  // valve wheel on the back
  c.save();
  c.translate(0, -r * 0.12);
  disc(c, 0, 0, r * 0.3);
  c.lineWidth = r * 0.07;
  c.strokeStyle = metal(c, r * 0.5, BRASS);
  c.stroke();
  spokes(c, 4, r * 0.04, r * 0.28, L.t * 0.4, r * 0.06, BRASS.l);
  c.restore();
  c.lineWidth = Math.max(1.5, r * 0.06);
  for (const s of [-1, 1]) {
    const open = 0.2 + 0.15 * sw(L, 2.5, s);
    c.save();
    c.translate(s * r * 0.7, -r * 0.05);
    c.strokeStyle = flat(COPPER.d);
    c.lineWidth = r * 0.12;
    c.beginPath();
    c.moveTo(0, r * 0.2);
    c.lineTo(s * r * 0.1, -r * 0.2);
    c.stroke();
    c.lineWidth = Math.max(1.5, r * 0.06);
    c.translate(s * r * 0.1, -r * 0.25);
    c.rotate(s * -open);
    c.beginPath();
    c.arc(0, 0, r * 0.3, Math.PI * 1.1, Math.PI * 1.9 + (s < 0 ? 0 : 0));
    c.lineTo(0, 0);
    c.closePath();
    fillStroke(c, metal(c, r * 0.5, COPPER), COPPER.s);
    c.restore();
  }
  c.strokeStyle = flat(COPPER.s);
  c.lineWidth = r * 0.05;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(s * r * 0.15, -r * 0.3);
    c.lineTo(s * r * 0.2, -r * 0.55);
    c.stroke();
    disc(c, s * r * 0.2, -r * 0.58, r * 0.07);
    c.fillStyle = flat(COLOR.lamp);
    c.fill();
  }
};

const furnaceGolem: EnemyFn = (c, r, L) => {
  const glow = 0.6 + 0.3 * Math.sin(L.t * 6) + L.heat * 0.2;
  rrect(c, -r * 0.55, -r * 0.55, r * 1.1, r * 1.15, r * 0.12);
  fillStroke(c, metal(c, r * 1.2, IRON), IRON.s);
  rrect(c, r * 0.1, -r * 0.95, r * 0.22, r * 0.45, r * 0.04);
  fillStroke(c, metal(c, r * 0.4, IRON), IRON.s);
  for (let i = 0; i < 3; i++) {
    disc(c, r * 0.21 + Math.sin(L.t * 2 + i) * r * 0.06, -r * (1.0 + i * 0.12), r * (0.07 + i * 0.03));
    c.fillStyle = `rgba(160, 160, 160, ${0.4 - i * 0.1})`;
    c.fill();
  }
  rrect(c, -r * 0.36, -r * 0.1, r * 0.72, r * 0.5, r * 0.1);
  c.fillStyle = `rgba(255, ${120 + glow * 60}, 40, ${Math.min(1, glow)})`;
  c.fill();
  c.strokeStyle = flat(IRON.s);
  c.lineWidth = r * 0.06;
  c.beginPath();
  for (const x of [-0.2, 0, 0.2]) {
    c.moveTo(x * r, -r * 0.1);
    c.lineTo(x * r, r * 0.4);
  }
  c.stroke();
  eyes(c, 0, -r * 0.34, r * 0.22, r * 0.07, '#ffd27a');
  for (const s of [-1, 1]) {
    rrect(c, s * r * 0.78 - r * 0.16, -r * 0.3, r * 0.32, r * 0.75, r * 0.1);
    fillStroke(c, metal(c, r * 0.5, IRON), IRON.s);
  }
};

const pipeSnake: EnemyFn = (c, r, L) => {
  const segs = 9;
  let hx = 0;
  let hy = 0;
  for (let i = segs - 1; i >= 0; i--) {
    const k = i / (segs - 1);
    const x = -r * 0.85 + k * r * 1.45;
    const y = Math.sin(k * 5.5 - L.t * 3 + L.seed) * r * 0.35 * (1 - k * 0.3);
    disc(c, x, y, r * (0.17 + 0.03 * (1 - k)));
    fillStroke(c, metal(c, r * 0.5, i % 2 ? COPPER : BRONZE), COPPER.s);
    if (i === segs - 1) {
      hx = x;
      hy = y;
    }
  }
  poly(c, [hx, hy - r * 0.2, hx + r * 0.38, hy - r * 0.05, hx + r * 0.38, hy + r * 0.12, hx, hy + r * 0.22]);
  fillStroke(c, metal(c, r * 0.6, IRON), IRON.s);
  eyes(c, hx + r * 0.1, hy - r * 0.06, 0, r * 0.06, '#ff7a55');
  c.strokeStyle = flat('#c33a2a');
  c.lineWidth = r * 0.03;
  c.beginPath();
  c.moveTo(hx + r * 0.38, hy + r * 0.02);
  c.lineTo(hx + r * 0.58, hy + r * 0.02 + Math.sin(L.t * 12) * r * 0.05);
  c.stroke();
  // tail valve wheel
  c.save();
  c.translate(-r * 0.9, Math.sin(-5.5 * 0 - L.t * 3 + L.seed) * r * 0.35);
  spokes(c, 4, r * 0.03, r * 0.22, L.t, r * 0.05, BRASS.l);
  c.restore();
};

const gaugeGremlin: EnemyFn = (c, r, L) => {
  legs(c, 2, 0, r * 0.4, r * 0.4, r * 0.4, L, '#3a2a1b', 5);
  for (const s of [-1, 1]) {
    ellipse(c, s * r * 0.55, -r * 0.35, r * 0.28, r * 0.4, s * 0.4);
    fillStroke(c, flat('#8a6a50'), '#3a2a1b');
  }
  disc(c, 0, -r * 0.1, r * 0.55);
  fillStroke(c, metal(c, r, BRASS), BRASS.s);
  disc(c, 0, -r * 0.1, r * 0.42);
  c.fillStyle = flat('#f3e6c8');
  c.fill();
  c.strokeStyle = flat('#3a2a1b');
  c.lineWidth = r * 0.04;
  c.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * 0.8 + (i * Math.PI * 1.4) / 8;
    c.moveTo(Math.cos(a) * r * 0.34, -r * 0.1 + Math.sin(a) * r * 0.34);
    c.lineTo(Math.cos(a) * r * 0.4, -r * 0.1 + Math.sin(a) * r * 0.4);
  }
  c.stroke();
  const n = -2.2 + (0.5 + 0.5 * Math.sin(L.t * 9)) * 2.6 + L.seed * 0.01;
  c.strokeStyle = flat('#c33a2a');
  c.lineWidth = r * 0.06;
  c.beginPath();
  c.moveTo(0, -r * 0.1);
  c.lineTo(Math.cos(n) * r * 0.33, -r * 0.1 + Math.sin(n) * r * 0.33);
  c.stroke();
  eyes(c, 0, r * 0.08, r * 0.15, r * 0.06, '#c33a2a');
  c.lineWidth = Math.max(1.5, r * 0.06);
};

const pressureWarden: EnemyFn = (c, r, L) => {
  rrect(c, -r * 0.62, -r * 0.2, r * 1.24, r * 1.0, r * 0.28);
  fillStroke(c, metal(c, r * 1.3, IRON), IRON.s);
  c.fillStyle = flat(IRON.l);
  for (const x of [-0.5, -0.25, 0, 0.25, 0.5]) {
    disc(c, x * r, r * 0.68, r * 0.04);
    c.fill();
  }
  disc(c, 0, r * 0.25, r * 0.28);
  fillStroke(c, flat('#f3e6c8'), BRASS.s);
  c.strokeStyle = flat('#c33a2a');
  c.lineWidth = r * 0.06;
  const n = -2.3 + (0.35 + 0.1 * Math.sin(L.t * 3) + L.heat * 0.5) * 2.2;
  c.beginPath();
  c.moveTo(0, r * 0.25);
  c.lineTo(Math.cos(n) * r * 0.22, r * 0.25 + Math.sin(n) * r * 0.22);
  c.stroke();
  c.lineWidth = Math.max(1.5, r * 0.06);
  c.beginPath();
  c.moveTo(-r * 0.4, -r * 0.18);
  c.quadraticCurveTo(-r * 0.45, -r * 0.85, 0, -r * 0.88);
  c.quadraticCurveTo(r * 0.45, -r * 0.85, r * 0.4, -r * 0.18);
  c.closePath();
  fillStroke(c, metal(c, r, SILVER), SILVER.s);
  rrect(c, -r * 0.3, -r * 0.55, r * 0.6, r * 0.2, r * 0.06);
  c.fillStyle = flat('#1d1710');
  c.fill();
  eyes(c, 0, -r * 0.45, r * 0.12, r * 0.05, '#ff7a55');
  for (const s of [-1, 1]) {
    rrect(c, s * r * 0.8 - r * 0.14, -r * 0.1, r * 0.28, r * 0.7, r * 0.1);
    fillStroke(c, metal(c, r * 0.5, IRON), IRON.s);
  }
};

const twinPistons: EnemyFn = (c, r, L) => {
  const pump = (Math.sin(L.t * 3 + L.seed * 2) + 1) / 2;
  rrect(c, -r * 0.42, r * 0.05, r * 0.84, r * 0.85, r * 0.12);
  fillStroke(c, metal(c, r * 1.2, IRON), IRON.s);
  c.fillStyle = flat(COLOR.steel);
  c.fillRect(-r * 0.09, -r * 0.55 - pump * r * 0.15, r * 0.18, r * 0.65);
  rrect(c, -r * 0.5, -r * 0.82 - pump * r * 0.15, r * 1.0, r * 0.3, r * 0.08);
  fillStroke(c, metal(c, r, BRASS), BRASS.s);
  eyes(c, 0, r * 0.35, r * 0.17, r * 0.08, '#ff9a55');
  c.strokeStyle = flat(IRON.s);
  c.lineWidth = r * 0.05;
  c.beginPath();
  c.moveTo(-r * 0.3, r * 0.2);
  c.lineTo(-r * 0.08, r * 0.28);
  c.moveTo(r * 0.3, r * 0.2);
  c.lineTo(r * 0.08, r * 0.28);
  c.stroke();
  c.lineWidth = Math.max(1.5, r * 0.06);
  c.fillStyle = flat(IRON.l);
  for (const y of [0.55, 0.72]) {
    c.fillRect(-r * 0.3, y * r, r * 0.6, r * 0.05);
  }
};

const boilermaker: EnemyFn = (c, r, L) => {
  const heat = Math.min(1, L.heat);
  rrect(c, -r * 0.85, -r * 0.2, r * 1.7, r * 1.05, r * 0.4);
  fillStroke(c, metal(c, r * 1.5, COPPER), COPPER.s);
  c.fillStyle = `rgba(255, 110, 40, ${0.15 + heat * 0.5})`;
  rrect(c, -r * 0.85, -r * 0.2, r * 1.7, r * 1.05, r * 0.4);
  c.fill();
  c.fillStyle = flat(BRASS.l);
  for (const x of [-0.7, -0.35, 0, 0.35, 0.7]) {
    disc(c, x * r, r * 0.7, r * 0.045);
    c.fill();
  }
  // sight-glass face
  disc(c, 0, r * 0.2, r * 0.36);
  fillStroke(c, flat('#1d1710'), BRASS.s);
  disc(c, 0, r * 0.2, r * 0.29);
  c.fillStyle = `rgba(255, ${150 - heat * 90}, 60, 0.9)`;
  c.fill();
  eyes(c, 0, r * 0.16, r * 0.12, r * 0.05, '#1d1710');
  c.strokeStyle = flat('#1d1710');
  c.lineWidth = r * 0.04;
  c.beginPath();
  c.moveTo(-r * 0.14, r * 0.32);
  c.quadraticCurveTo(0, r * 0.28, r * 0.14, r * 0.32);
  c.stroke();
  // crown of pipes with steam
  c.lineWidth = Math.max(1.5, r * 0.06);
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * r * 0.32;
    const h = r * (0.35 + (i % 2 ? 0 : 0.18));
    rrect(c, x - r * 0.07, -r * 0.2 - h, r * 0.14, h, r * 0.03);
    fillStroke(c, metal(c, r * 0.4, GOLD), GOLD.s);
    disc(c, x + Math.sin(L.t * 2 + i) * r * 0.05, -r * 0.3 - h - r * 0.1, r * 0.09);
    c.fillStyle = `rgba(230, 236, 240, ${0.35})`;
    c.fill();
  }
};

// ---------- Act 3: the Belfry ----------

const bellRinger: EnemyFn = (c, r, L) => {
  const sway = sw(L, 1.6) * 0.07;
  c.save();
  c.rotate(sway);
  c.strokeStyle = flat('#6a4a2a');
  c.lineWidth = r * 0.08;
  c.beginPath();
  c.moveTo(-r * 0.2, -r * 1.0);
  c.lineTo(-r * 0.12, -r * 0.7);
  c.moveTo(r * 0.2, -r * 1.0);
  c.lineTo(r * 0.12, -r * 0.7);
  c.stroke();
  c.lineWidth = Math.max(1.5, r * 0.06);
  c.beginPath();
  c.moveTo(-r * 0.85, r * 0.65);
  c.quadraticCurveTo(-r * 0.8, -r * 0.7, 0, -r * 0.75);
  c.quadraticCurveTo(r * 0.8, -r * 0.7, r * 0.85, r * 0.65);
  c.closePath();
  fillStroke(c, metal(c, r * 1.4, GOLD), GOLD.s);
  rrect(c, -r * 0.95, r * 0.58, r * 1.9, r * 0.16, r * 0.08);
  fillStroke(c, metal(c, r, BRASS), BRASS.s);
  rrect(c, -r * 0.38, -r * 0.2, r * 0.76, r * 0.3, r * 0.1);
  c.fillStyle = flat('#1d1710');
  c.fill();
  eyes(c, 0, -r * 0.05, r * 0.2, r * 0.07, '#ffd27a');
  const cl = sw(L, 3) * r * 0.2;
  c.strokeStyle = flat(IRON.l);
  c.lineWidth = r * 0.06;
  c.beginPath();
  c.moveTo(0, -r * 0.5);
  c.lineTo(cl * 0.5, r * 0.6);
  c.stroke();
  disc(c, cl * 0.5, r * 0.78, r * 0.13);
  fillStroke(c, metal(c, r * 0.3, IRON), IRON.s);
  c.restore();
};

const chimeMoth: EnemyFn = (c, r, L) => {
  const flap = 0.55 + 0.4 * Math.sin(L.t * 9 + L.seed);
  for (const s of [-1, 1]) {
    c.save();
    c.scale(s, 1);
    c.translate(r * 0.1, -r * 0.1);
    c.rotate(-0.3 + (1 - flap) * 0.4);
    c.scale(flap, 1);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(r * 0.8, -r * 0.8, r * 1.0, -r * 0.05);
    c.quadraticCurveTo(r * 0.8, r * 0.55, 0, r * 0.2);
    c.closePath();
    fillStroke(c, flat('rgba(169, 221, 210, 0.7)'), VERD.s);
    for (let i = 0; i < 3; i++) {
      rrect(c, r * (0.3 + i * 0.22), -r * 0.08 - i * r * 0.1, r * 0.1, r * (0.35 - i * 0.04), r * 0.04);
      fillStroke(c, metal(c, r * 0.3, GOLD), GOLD.s);
    }
    c.restore();
  }
  ellipse(c, 0, r * 0.05, r * 0.16, r * 0.45);
  fillStroke(c, metal(c, r * 0.6, BRASS), BRASS.s);
  disc(c, 0, -r * 0.5, r * 0.15);
  fillStroke(c, metal(c, r * 0.4, BRASS), BRASS.s);
  eyes(c, 0, -r * 0.52, r * 0.07, r * 0.04, '#1d1710');
  c.strokeStyle = flat(BRASS.s);
  c.lineWidth = r * 0.03;
  c.beginPath();
  for (const s of [-1, 1]) {
    c.moveTo(s * r * 0.05, -r * 0.62);
    c.quadraticCurveTo(s * r * 0.3, -r * 0.95, s * r * 0.45, -r * 0.82 + Math.sin(L.t * 5) * r * 0.04);
  }
  c.stroke();
};

const hourKnight: EnemyFn = (c, r, L) => {
  rrect(c, -r * 0.4, -r * 0.1, r * 0.8, r * 0.95, r * 0.2);
  fillStroke(c, metal(c, r * 1.2, SILVER), SILVER.s);
  c.fillStyle = flat(COLOR.rust);
  c.fillRect(-r * 0.4, r * 0.35, r * 0.8, r * 0.1);
  rrect(c, -r * 0.3, -r * 0.62, r * 0.6, r * 0.55, r * 0.18);
  fillStroke(c, metal(c, r, SILVER), SILVER.s);
  c.fillStyle = flat('#1d1710');
  c.fillRect(-r * 0.22, -r * 0.42, r * 0.44, r * 0.1);
  eyes(c, 0, -r * 0.37, r * 0.1, r * 0.03, '#ffd27a');
  poly(c, [-r * 0.04, -r * 0.62, r * 0.08, -r * 1.0, r * 0.28, -r * 0.8, r * 0.12, -r * 0.6]);
  fillStroke(c, flat('#b04a3a'), '#3a120a');
  // clock-face shield
  c.save();
  c.translate(-r * 0.7, r * 0.3);
  disc(c, 0, 0, r * 0.42);
  fillStroke(c, metal(c, r * 0.7, BRASS), BRASS.s);
  disc(c, 0, 0, r * 0.33);
  c.fillStyle = flat('#f3e6c8');
  c.fill();
  c.strokeStyle = flat('#3a2a1b');
  c.lineWidth = r * 0.04;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, -r * 0.24);
  c.moveTo(0, 0);
  c.lineTo(Math.cos(L.t * 0.8) * r * 0.18, Math.sin(L.t * 0.8) * r * 0.18);
  c.stroke();
  c.restore();
  // hour-hand sword
  c.save();
  c.translate(r * 0.55, r * 0.35);
  c.rotate(-0.35 + sw(L, 2) * 0.05);
  poly(c, [-r * 0.07, r * 0.2, r * 0.07, r * 0.2, r * 0.05, -r * 0.2, 0, -r * 1.15, -r * 0.05, -r * 0.2]);
  fillStroke(c, metal(c, r * 0.6, GOLD), GOLD.s);
  disc(c, 0, r * 0.2, r * 0.1);
  fillStroke(c, flat(GOLD.d), GOLD.s);
  c.restore();
};

const echoSprite: EnemyFn = (c, r, L) => {
  for (let i = 3; i >= 0; i--) {
    c.save();
    c.globalAlpha *= i === 0 ? 0.95 : 0.22 / i + 0.05;
    c.translate(i * r * 0.14 + Math.sin(L.t * 3 + i) * r * 0.03, -i * r * 0.05);
    c.scale(1 + i * 0.04, 1 + i * 0.04);
    c.beginPath();
    c.moveTo(0, -r * 0.65);
    c.quadraticCurveTo(r * 0.55, -r * 0.4, r * 0.4, r * 0.2);
    c.quadraticCurveTo(r * 0.3, r * 0.55, 0, r * 0.7);
    c.quadraticCurveTo(-r * 0.3, r * 0.55, -r * 0.4, r * 0.2);
    c.quadraticCurveTo(-r * 0.55, -r * 0.4, 0, -r * 0.65);
    c.closePath();
    fillStroke(c, i === 0 ? metal(c, r, VERD) : flat('rgba(169, 221, 210, 0.6)'), VERD.s);
    c.restore();
  }
  // spiral eyes
  for (const s of [-1, 1]) {
    c.strokeStyle = flat('#1d3a35');
    c.lineWidth = r * 0.035;
    c.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = i * 0.5 + L.t * 3;
      const rad = r * 0.015 * i * 0.9;
      const x = s * r * 0.17 + Math.cos(a) * rad;
      const y = -r * 0.12 + Math.sin(a) * rad;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  }
  c.lineWidth = Math.max(1.5, r * 0.06);
  c.strokeStyle = flat('#1d3a35');
  c.beginPath();
  c.arc(0, r * 0.15, r * 0.12, 0.2, Math.PI - 0.2, false);
  c.stroke();
};

const pendulumBlade: EnemyFn = (c, r, L) => {
  const ang = sw(L, 2.4) * 0.55;
  disc(c, 0, -r * 0.9, r * 0.1);
  fillStroke(c, metal(c, r * 0.3, BRASS), BRASS.s);
  c.save();
  c.translate(0, -r * 0.9);
  c.rotate(ang);
  c.strokeStyle = flat(BRASS.d);
  c.lineWidth = r * 0.07;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, r * 0.95);
  c.stroke();
  c.lineWidth = Math.max(1.5, r * 0.06);
  c.beginPath();
  c.moveTo(-r * 0.75, r * 0.95);
  c.quadraticCurveTo(0, r * 1.95, r * 0.75, r * 0.95);
  c.quadraticCurveTo(0, r * 1.3, -r * 0.75, r * 0.95);
  c.closePath();
  fillStroke(c, metal(c, r * 1.2, SILVER), SILVER.s);
  c.strokeStyle = flat('rgba(255,255,255,0.7)');
  c.beginPath();
  c.moveTo(-r * 0.5, r * 1.12);
  c.quadraticCurveTo(0, r * 1.62, r * 0.5, r * 1.12);
  c.stroke();
  eyes(c, 0, r * 1.18, r * 0.12, r * 0.05, '#ff7a55');
  c.restore();
};

const minuteWarden: EnemyFn = (c, r, L) => {
  c.beginPath();
  c.moveTo(-r * 0.6, r * 0.9);
  c.quadraticCurveTo(-r * 0.5, -r * 0.2, -r * 0.25, -r * 0.45);
  c.lineTo(r * 0.25, -r * 0.45);
  c.quadraticCurveTo(r * 0.5, -r * 0.2, r * 0.6, r * 0.9);
  c.closePath();
  fillStroke(c, metal(c, r * 1.4, { l: '#6d7f9a', d: '#222d3d', s: '#10161f' }), '#10161f');
  c.beginPath();
  c.arc(0, -r * 0.5, r * 0.34, Math.PI * 0.95, Math.PI * 2.05);
  c.lineTo(r * 0.28, -r * 0.22);
  c.lineTo(-r * 0.28, -r * 0.22);
  c.closePath();
  fillStroke(c, flat('#222d3d'), '#10161f');
  eyes(c, 0, -r * 0.42, r * 0.11, r * 0.05, '#9ad27a');
  // clock face on the chest
  disc(c, 0, r * 0.12, r * 0.26);
  fillStroke(c, flat('#f3e6c8'), BRASS.s);
  c.strokeStyle = flat('#3a2a1b');
  c.lineWidth = r * 0.04;
  c.beginPath();
  c.moveTo(0, r * 0.12);
  c.lineTo(Math.cos(L.t * 2) * r * 0.2, r * 0.12 + Math.sin(L.t * 2) * r * 0.2);
  c.stroke();
  // minute-hand staff
  c.save();
  c.translate(r * 0.62, r * 0.4);
  c.rotate(0.12 + sw(L, 1.5) * 0.03);
  poly(c, [-r * 0.04, r * 0.5, r * 0.04, r * 0.5, r * 0.04, -r * 1.1, 0, -r * 1.3, -r * 0.04, -r * 1.1]);
  fillStroke(c, metal(c, r * 0.6, GOLD), GOLD.s);
  disc(c, 0, r * 0.1, r * 0.1);
  fillStroke(c, metal(c, r * 0.3, BRASS), BRASS.s);
  c.restore();
};

const orrery: EnemyFn = (c, r, L) => {
  disc(c, 0, 0, r * 0.3);
  fillStroke(c, metal(c, r * 0.6, EMBER), EMBER.s);
  for (let i = 0; i < 3; i++) {
    c.save();
    c.rotate(i * 1.05 + 0.2);
    ellipse(c, 0, 0, r * (0.9 - i * 0.1), r * (0.3 + i * 0.12));
    c.strokeStyle = metal(c, r, BRASS);
    c.lineWidth = r * 0.06;
    c.stroke();
    const a = L.t * (0.8 + i * 0.35) + i * 2.1;
    disc(c, Math.cos(a) * r * (0.9 - i * 0.1), Math.sin(a) * r * (0.3 + i * 0.12), r * 0.11);
    fillStroke(c, metal(c, r * 0.3, i === 1 ? VERD : SILVER), IRON.s);
    c.restore();
  }
  c.lineWidth = Math.max(1.5, r * 0.06);
  eyes(c, 0, -r * 0.02, r * 0.1, r * 0.05, '#1d1710');
  rrect(c, -r * 0.1, r * 0.75, r * 0.2, r * 0.2, r * 0.04);
  fillStroke(c, metal(c, r * 0.3, BRASS), BRASS.s);
  rrect(c, -r * 0.4, r * 0.9, r * 0.8, r * 0.1, r * 0.04);
  fillStroke(c, metal(c, r * 0.5, BRASS), BRASS.s);
};

const orreryMoon: EnemyFn = (c, r, L) => {
  disc(c, 0, Math.sin(L.t * 2 + L.seed) * r * 0.05, r * 0.5);
  fillStroke(c, metal(c, r, SILVER), SILVER.s);
  for (const [x, y, k] of [[-0.15, -0.1, 0.12], [0.18, 0.12, 0.09], [0.05, -0.28, 0.07]]) {
    disc(c, x * r, y * r, k * r);
    c.fillStyle = flat('rgba(60, 70, 76, 0.5)');
    c.fill();
  }
  c.save();
  c.rotate(L.t * 0.7);
  gear(c, r * 0.7, 14, 0, BRASS, 0.12);
  c.restore();
  disc(c, 0, 0, r * 0.45);
  fillStroke(c, metal(c, r, SILVER), SILVER.s);
  eyes(c, 0, -r * 0.04, r * 0.14, r * 0.05, '#1d1710');
};

// The Clockmaker: a tall robed automaton with a clock-face head; a different look for each phase.
const clockmaker: EnemyFn = (c, r, L) => {
  const ph = L.phase;
  const robe: Pal = ph === 0 ? { l: '#7c6a52', d: '#2c2218', s: '#140e08' } : ph === 1 ? { l: '#6a4a5a', d: '#2a1624', s: '#12080f' } : { l: '#8a3a30', d: '#2a0c0a', s: '#120404' };
  const sway = sw(L, 1.2) * 0.03;
  c.save();
  c.rotate(sway);
  // floating cogs: more as the phases go on
  const orbit = ph === 0 ? 0 : ph === 1 ? 3 : 6;
  for (let i = 0; i < orbit; i++) {
    const a = L.t * (0.5 + ph * 0.3) + (i * TAU) / orbit;
    c.save();
    c.translate(Math.cos(a) * r * 0.95, -r * 0.1 + Math.sin(a) * r * 0.55);
    gear(c, r * 0.12, 8, L.t * 2, ph === 2 ? EMBER : BRASS, 0.25);
    c.restore();
  }
  c.beginPath();
  c.moveTo(-r * 0.62, r * 0.98);
  c.quadraticCurveTo(-r * 0.55, -r * 0.1, -r * 0.3, -r * 0.35);
  c.lineTo(r * 0.3, -r * 0.35);
  c.quadraticCurveTo(r * 0.55, -r * 0.1, r * 0.62, r * 0.98);
  c.closePath();
  fillStroke(c, metal(c, r * 1.5, robe), robe.s);
  c.strokeStyle = flat(GOLD.l);
  c.lineWidth = r * 0.04;
  c.beginPath();
  c.moveTo(0, -r * 0.3);
  c.lineTo(0, r * 0.95);
  c.stroke();
  c.lineWidth = Math.max(1.5, r * 0.06);
  // arms: phase 1 holds out a key, phase 2 reaches both hands up
  c.strokeStyle = flat(robe.d);
  c.lineWidth = r * 0.16;
  c.beginPath();
  if (ph === 2) {
    c.moveTo(-r * 0.4, -r * 0.2);
    c.lineTo(-r * 0.8, -r * 0.7 + sw(L, 3) * r * 0.05);
    c.moveTo(r * 0.4, -r * 0.2);
    c.lineTo(r * 0.8, -r * 0.7 + sw(L, 3, 1) * r * 0.05);
  } else {
    c.moveTo(-r * 0.4, -r * 0.2);
    c.lineTo(-r * 0.7, r * 0.35);
    c.moveTo(r * 0.4, -r * 0.2);
    c.lineTo(r * 0.8, ph === 1 ? r * 0.0 : r * 0.35);
  }
  c.stroke();
  c.lineWidth = Math.max(1.5, r * 0.06);
  if (ph === 1) {
    c.save();
    c.translate(r * 0.85, -r * 0.05);
    c.rotate(0.3);
    c.strokeStyle = metal(c, r * 0.5, GOLD);
    c.lineWidth = r * 0.07;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -r * 0.55);
    c.stroke();
    disc(c, 0, -r * 0.62, r * 0.14);
    c.strokeStyle = metal(c, r * 0.5, GOLD);
    c.stroke();
    c.restore();
  }
  // the clock-face head
  const hy = -r * 0.62;
  disc(c, 0, hy, r * 0.42);
  fillStroke(c, metal(c, r * 0.9, ph === 2 ? EMBER : GOLD), GOLD.s);
  disc(c, 0, hy, r * 0.34);
  c.fillStyle = flat(ph === 2 ? '#fff0d0' : '#f3e6c8');
  c.fill();
  if (ph >= 1) {
    c.strokeStyle = flat('#2a1010');
    c.lineWidth = r * 0.025;
    c.beginPath();
    c.moveTo(-r * 0.05, hy - r * 0.34);
    c.lineTo(r * 0.04, hy - r * 0.1);
    c.lineTo(-r * 0.08, hy + r * 0.05);
    c.lineTo(r * 0.12, hy + r * 0.3);
    if (ph === 2) {
      c.moveTo(r * 0.04, hy - r * 0.1);
      c.lineTo(r * 0.3, hy - r * 0.2);
      c.moveTo(-r * 0.08, hy + r * 0.05);
      c.lineTo(-r * 0.3, hy + r * 0.1);
    }
    c.stroke();
  }
  c.strokeStyle = flat('#3a2a1b');
  c.lineWidth = r * 0.03;
  c.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12;
    c.moveTo(Math.cos(a) * r * 0.27, hy + Math.sin(a) * r * 0.27);
    c.lineTo(Math.cos(a) * r * 0.32, hy + Math.sin(a) * r * 0.32);
  }
  c.stroke();
  const spin = ph === 2 ? 6 : ph === 1 ? 1.6 : 0.5;
  c.lineWidth = r * 0.05;
  c.beginPath();
  c.moveTo(0, hy);
  c.lineTo(Math.cos(L.t * spin - 1.2) * r * 0.2, hy + Math.sin(L.t * spin - 1.2) * r * 0.2);
  c.moveTo(0, hy);
  c.lineTo(Math.cos(L.t * spin * 12 - 0.4) * r * 0.29, hy + Math.sin(L.t * spin * 12 - 0.4) * r * 0.29);
  c.stroke();
  hub(c, 0, hy, r * 0.04, '#b04a3a', BRASS.s);
  if (ph === 2) {
    // a halo of hands
    c.strokeStyle = flat('rgba(255, 140, 80, 0.8)');
    c.lineWidth = r * 0.04;
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8 + L.t * 0.8;
      c.moveTo(Math.cos(a) * r * 0.5, hy + Math.sin(a) * r * 0.5);
      c.lineTo(Math.cos(a) * r * 0.68, hy + Math.sin(a) * r * 0.68);
    }
    c.stroke();
  }
  c.restore();
};

// ---------- the practice dummy, anything unknown ----------

const dummy: EnemyFn = (c, r) => {
  c.strokeStyle = flat('#4b3512');
  c.fillStyle = flat('#9a7a45');
  c.fillRect(-r * 0.08, r * 0.2, r * 0.16, r * 0.7);
  rrect(c, -r * 0.45, -r * 0.5, r * 0.9, r * 0.85, r * 0.2);
  fillStroke(c, metal(c, r, BRASS), '#4b3512');
  for (const k of [0.38, 0.22, 0.08]) {
    disc(c, 0, -r * 0.08, r * k);
    c.strokeStyle = flat(k === 0.22 ? COLOR.rust : '#4b3512');
    c.stroke();
  }
};

const PAINT: Record<string, EnemyFn> = {
  'rust-mite': rustMite,
  'cog-rat': cogRat,
  'brass-beetle': brassBeetle,
  'oil-slick': oilSlick,
  'spring-imp': springImp,
  gearhound,
  'tinpot-general': tinpotGeneral,
  foreman,
  'steam-wraith': steamWraith,
  'valve-crab': valveCrab,
  'furnace-golem': furnaceGolem,
  'pipe-snake': pipeSnake,
  'gauge-gremlin': gaugeGremlin,
  'pressure-warden': pressureWarden,
  'twin-pistons': twinPistons,
  boilermaker,
  'bell-ringer': bellRinger,
  'chime-moth': chimeMoth,
  'hour-knight': hourKnight,
  'echo-sprite': echoSprite,
  'pendulum-blade': pendulumBlade,
  'minute-warden': minuteWarden,
  orrery,
  clockmaker,
  ...BOSS_PAINT,
};

/** Ids with a dedicated painter (used by the preview test). */
export const ENEMY_IDS: string[] = Object.keys(PAINT);

function painterFor(id: string): EnemyFn {
  const p = PAINT[id];
  if (p) return p;
  if (id.includes('moon')) return orreryMoon;
  if (id.includes('piston')) return twinPistons;
  return dummy;
}

/** Draw one enemy centered at (x, y) filling a `size` box, with idle bob, hit flash and shake, lunge and death collapse. */
type Style = 'lunge' | 'slam' | 'blast' | 'lean';
/** How each creature attacks: dash at the board, rise and slam, swell and blast, or lean back and swing. */
export const ATTACK_STYLE: Record<string, Style> = {
  foreman: 'slam',
  'furnace-golem': 'slam',
  'pressure-warden': 'slam',
  'twin-pistons': 'slam',
  'bell-ringer': 'slam',
  'brass-beetle': 'slam',
  boilermaker: 'blast',
  'steam-wraith': 'blast',
  orrery: 'blast',
  'pipe-snake': 'blast',
  clockmaker: 'lean',
  'hour-knight': 'lean',
  'minute-warden': 'lean',
  'pendulum-blade': 'lean',
  'tinpot-general': 'lean',
  'echo-sprite': 'lean',
};

const BIG = new Set(['foreman', 'boilermaker', 'clockmaker', 'gearhound', 'tinpot-general', 'pressure-warden', 'twin-pistons', 'minute-warden', 'orrery']);
/** Bosses and elites: richer art, stronger sounds. */
export const isBig = (id: string): boolean => BIG.has(id);

export function attackStyle(id: string): Style {
  return ATTACK_STYLE[id] ?? 'lunge';
}

export const BOSS_IDS = new Set(['foreman', 'boilermaker', 'clockmaker']);

/** Draw one enemy centered at (x, y) filling a `size` box: idle breathing, attack wind-up and strike, hit recoil, death collapse. */
export function drawEnemy(c: CanvasRenderingContext2D, defId: string, x: number, y: number, size: number, L: EnemyLook): void {
  const r = size / 2;
  const bob = Math.sin(L.t * 2 + L.seed) * r * 0.04;
  const breathe = 1 + Math.sin(L.t * 2.3 + L.seed) * 0.015;
  const style = attackStyle(defId);
  const { w, s } = atk(L);
  let ox = 0;
  let oy = 0;
  let rot = Math.sin(L.t * 1.3 + L.seed) * 0.015;
  let sx = breathe;
  let sy = 2 - breathe;
  if (L.lunge < ATTACK_TIME) {
    if (style === 'lunge') {
      ox = w * r * 0.14 - s * r * 0.6;
      sx *= 1 + s * 0.08;
    } else if (style === 'slam') {
      oy = -w * r * 0.2 + s * r * 0.22;
      sy *= 1 + w * 0.08 - s * 0.14;
      sx *= 1 - w * 0.04 + s * 0.1;
    } else if (style === 'blast') {
      sx *= 1 + w * 0.12 - s * 0.08;
      sy *= 1 + w * 0.12 - s * 0.08;
      ox = Math.sin(L.t * 60) * w * r * 0.02 - s * r * 0.12;
    } else {
      rot += w * 0.14 - s * 0.26;
      ox = w * r * 0.08 - s * r * 0.3;
    }
  }
  const drop = L.drop > 0 ? -L.drop * L.drop * r * 2.4 : 0;
  c.save();
  c.globalAlpha = Math.max(0, 1 - L.dead * L.dead * 0.95);
  // hit reaction: knocked back, a tilt and a shake
  c.translate(x + ox + L.hit * r * 0.14 + Math.sin(L.hit * 30) * L.hit * r * 0.06, y + bob + oy + drop + L.dead * r * 0.35);
  c.rotate(rot + L.hit * 0.07);
  c.scale(sx, sy);
  if (L.dead > 0) c.scale(1 + L.dead * 0.12, 1 - L.dead * 0.5);
  // wind-up glow behind the creature: bigger and warmer for bosses and elites
  if (w > 0.05) {
    const big = BIG.has(defId);
    const g = c.createRadialGradient(0, 0, r * 0.2, 0, 0, r * (big ? 1.3 : 1.0));
    const col = style === 'blast' ? '190, 220, 255' : '255, 160, 80';
    g.addColorStop(0, `rgba(${col}, ${w * (big ? 0.5 : 0.32)})`);
    g.addColorStop(1, `rgba(${col}, 0)`);
    c.fillStyle = g;
    c.fillRect(-r * 1.4, -r * 1.4, r * 2.8, r * 2.8);
  }
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.lineWidth = Math.max(1.5, r * 0.06);
  if (BIG.has(defId)) c.scale(0.86, 0.86); // the layered art runs a little taller than its box
  state.flash = L.hit > 0.55;
  painterFor(defId)(c, r, L);
  state.flash = false;
  c.restore();
}

/** Statuses drawn on a living enemy: scald steam, cracked fracture lines, dazed swirl, strength glow. */
export function drawStatuses(c: CanvasRenderingContext2D, st: Record<string, number>, x: number, y: number, size: number, t: number): void {
  const r = size / 2;
  c.save();
  c.translate(x, y);
  c.lineCap = 'round';
  if ((st.strength ?? 0) > 0) {
    c.strokeStyle = `rgba(255, 90, 60, ${0.45 + 0.2 * Math.sin(t * 5)})`;
    c.lineWidth = Math.max(2, r * 0.07);
    c.beginPath();
    c.arc(0, 0, r * 0.95, 0, TAU);
    c.stroke();
  }
  if ((st.scald ?? 0) > 0) {
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.7 + i * 0.25) % 1;
      disc(c, Math.sin(t * 2 + i * 2) * r * 0.5, r * 0.2 - k * r * 1.0, r * (0.1 + k * 0.12));
      c.fillStyle = `rgba(236, 242, 246, ${0.55 * (1 - k)})`;
      c.fill();
    }
  }
  if ((st.cracked ?? 0) > 0) {
    c.strokeStyle = 'rgba(20, 12, 8, 0.85)';
    c.lineWidth = Math.max(1.5, r * 0.04);
    c.beginPath();
    c.moveTo(-r * 0.25, -r * 0.55);
    c.lineTo(-r * 0.05, -r * 0.25);
    c.lineTo(-r * 0.3, -r * 0.05);
    c.lineTo(r * 0.0, r * 0.2);
    c.moveTo(-r * 0.05, -r * 0.25);
    c.lineTo(r * 0.25, -r * 0.35);
    c.moveTo(r * 0.3, -r * 0.1);
    c.lineTo(r * 0.1, r * 0.1);
    c.stroke();
    c.strokeStyle = 'rgba(255, 210, 122, 0.45)';
    c.lineWidth = Math.max(1, r * 0.015);
    c.stroke();
  }
  if ((st.dazed ?? 0) > 0) {
    for (let i = 0; i < 3; i++) {
      const a = t * 3 + (i * TAU) / 3;
      const sx = Math.cos(a) * r * 0.5;
      const sy = -r * 0.85 + Math.sin(a) * r * 0.12;
      c.fillStyle = COLOR.lamp;
      c.beginPath();
      for (let k = 0; k < 10; k++) {
        const ang = (k * Math.PI) / 5 - Math.PI / 2 + a;
        const rad = k % 2 ? r * 0.05 : r * 0.12;
        const px = sx + Math.cos(ang) * rad;
        const py = sy + Math.sin(ang) * rad;
        if (k === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.closePath();
      c.fill();
    }
  }
  c.restore();
}

/** Brass plating in front of an enemy that has Shell. */
export function drawShell(c: CanvasRenderingContext2D, x: number, y: number, size: number, amount: number, t: number): void {
  const r = size / 2;
  const plates = Math.min(6, 2 + Math.ceil(amount / 5));
  c.save();
  c.translate(x, y);
  c.lineCap = 'round';
  for (let i = 0; i < plates; i++) {
    const a = Math.PI * 0.62 + (i * (Math.PI * 0.76)) / Math.max(1, plates - 1);
    c.save();
    c.rotate(a + Math.PI * 0);
    c.translate(0, 0);
    c.beginPath();
    c.arc(0, 0, r * 0.98, -0.22, 0.22);
    c.lineWidth = r * 0.16;
    c.strokeStyle = '#4b3512';
    c.stroke();
    c.lineWidth = r * 0.1;
    c.strokeStyle = i % 2 ? '#d1a64a' : '#f0cf7a';
    c.stroke();
    c.restore();
  }
  const g = 0.5 + 0.5 * Math.sin(t * 3);
  c.strokeStyle = `rgba(255, 244, 214, ${0.25 + 0.2 * g})`;
  c.lineWidth = Math.max(1, r * 0.03);
  c.beginPath();
  c.arc(0, 0, r * 1.02, Math.PI * 0.7, Math.PI * 1.0);
  c.stroke();
  c.restore();
}
