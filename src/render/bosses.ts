// Bosses and elites: layered creatures with moving parts. Each reads the attack timing from the look
// (wind-up, then strike) so its own parts react: a raised wrench, a swelling boiler, spinning rings.
import { COLOR } from './palette';
import {
  BRASS, COPPER, EMBER, GOLD, IRON, SILVER, TAU, VERD,
  disc, ellipse, eyes, fillStroke, flat, gear, hub, metal, poly, rrect, spokes,
} from './kit';
import type { Pal } from './kit';
import type { EnemyLook } from './enemies';

type Fn = (c: CanvasRenderingContext2D, r: number, L: EnemyLook) => void;

/** Seconds an attack animation lasts: wind-up for the first half, strike near 0.55 s, then recovery. */
export const ATTACK_TIME = 0.9;

export interface Atk {
  w: number; // wind-up 0..1 (leaning back, glowing)
  s: number; // strike 0..1 (a short pulse at the moment of impact)
}

export function atk(L: EnemyLook): Atk {
  const k = L.lunge / ATTACK_TIME;
  if (k >= 1) return { w: 0, s: 0 };
  const w = k < 0.5 ? (k / 0.5) ** 2 : Math.max(0, 1 - (k - 0.5) / 0.2);
  const s = k >= 0.5 && k < 0.78 ? Math.sin(((k - 0.5) / 0.28) * Math.PI) : 0;
  return { w, s };
}

const sw = (L: EnemyLook, speed: number, ph = 0): number => Math.sin(L.t * speed + L.seed + ph);

/** Steam puffs rising from a vent at (x, y); `n` puffs, `force` 0..1 scales their size and speed. */
function vent(c: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, n: number, force = 0.3): void {
  for (let i = 0; i < n; i++) {
    const k = (t * (0.5 + force) + i / n) % 1;
    disc(c, x + Math.sin(t * 2 + i * 2) * r * 0.06 * k, y - k * r * (0.35 + force * 0.7), r * (0.04 + k * 0.09) * (1 + force));
    c.fillStyle = flat(`rgba(236, 242, 246, ${0.6 * (1 - k)})`);
    c.fill();
  }
}

function rivets(c: CanvasRenderingContext2D, pts: number[], r: number, col = '#f0cf7a'): void {
  c.fillStyle = flat(col);
  for (let i = 0; i < pts.length; i += 2) {
    disc(c, pts[i] * r, pts[i + 1] * r, r * 0.028);
    c.fill();
  }
}

// ---------- The Foreman (boss, Act 1) ----------

export const foreman: Fn = (c, r, L) => {
  const { w, s } = atk(L);
  const big = gear;
  // smokestack on his back, puffing
  rrect(c, -r * 0.72, -r * 0.95, r * 0.2, r * 0.6, r * 0.04);
  fillStroke(c, metal(c, r * 0.4, IRON), IRON.s);
  vent(c, -r * 0.62, -r * 0.95, r, L.t + L.seed, 4, 0.2 + w * 0.6);
  // the big back gear and its small partner turn
  c.save();
  c.translate(-r * 0.25, -r * 0.05);
  big(c, r * 0.62, 12, L.t * (0.5 + w * 2), IRON, 0.18);
  spokes(c, 6, r * 0.1, r * 0.5, L.t * (0.5 + w * 2), r * 0.06, '#1d2326');
  hub(c, 0, 0, r * 0.1);
  c.restore();
  c.save();
  c.translate(-r * 0.92, r * 0.32);
  big(c, r * 0.22, 8, -L.t * (1.1 + w * 4), BRASS, 0.25);
  c.restore();
  // legs
  c.fillStyle = flat('#2b3a4d');
  rrect(c, -r * 0.4, r * 0.7, r * 0.3, r * 0.3, r * 0.06);
  c.fill();
  rrect(c, r * 0.1, r * 0.7, r * 0.3, r * 0.3, r * 0.06);
  c.fill();
  // torso: red work jacket, blue overalls, belt
  rrect(c, -r * 0.55, -r * 0.22, r * 1.1, r * 1.0, r * 0.15);
  fillStroke(c, metal(c, r * 1.2, { l: '#d9694e', d: '#8a3a28', s: '#3a120a' }), '#3a120a');
  c.fillStyle = flat('#2b3a4d');
  c.fillRect(-r * 0.4, r * 0.12, r * 0.8, r * 0.64);
  c.fillStyle = flat(GOLD.d);
  c.fillRect(-r * 0.4, r * 0.34, r * 0.8, r * 0.08);
  rrect(c, -r * 0.1, r * 0.3, r * 0.2, r * 0.16, r * 0.03);
  fillStroke(c, metal(c, r * 0.3, GOLD), GOLD.s);
  rivets(c, [-0.46, -0.1, 0.46, -0.1, -0.46, 0.5, 0.46, 0.5], r);
  // left arm: a pneumatic piston fist hanging down
  c.strokeStyle = flat(BRASS.d);
  c.lineWidth = r * 0.16;
  c.beginPath();
  c.moveTo(-r * 0.55, r * 0.0);
  c.lineTo(-r * 0.78, r * 0.36 + s * r * 0.05);
  c.stroke();
  rrect(c, -r * 0.9, r * 0.36, r * 0.24, r * 0.22, r * 0.06);
  fillStroke(c, metal(c, r * 0.4, IRON), IRON.s);
  // right arm: shoulder gear, upper arm, forearm and a wrench that rises and slams
  c.save();
  c.translate(r * 0.58, -r * 0.05);
  big(c, r * 0.2, 8, L.t * (1.2 + w * 3), BRASS, 0.25);
  const up = -0.3 - w * 1.0 + s * 1.9 + sw(L, 2.2) * 0.05;
  c.rotate(up);
  c.strokeStyle = flat(BRASS.d);
  c.lineWidth = r * 0.17;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(r * 0.42, r * 0.22);
  c.stroke();
  c.translate(r * 0.42, r * 0.22);
  c.rotate(-0.3);
  rrect(c, -r * 0.06, -r * 1.0, r * 0.12, r * 1.05, r * 0.04);
  fillStroke(c, metal(c, r * 0.5, SILVER), SILVER.s);
  disc(c, 0, -r * 1.02, r * 0.19);
  fillStroke(c, metal(c, r * 0.4, SILVER), SILVER.s);
  disc(c, 0, -r * 1.02, r * 0.07);
  c.fillStyle = COLOR.tile;
  c.fill();
  c.restore();
  // head: copper face, grille mouth, hard hat with a warning lamp
  rrect(c, -r * 0.3, -r * 0.7, r * 0.6, r * 0.5, r * 0.15);
  fillStroke(c, metal(c, r, COPPER), COPPER.s);
  eyes(c, 0, -r * 0.5, r * 0.12, r * 0.06 + w * r * 0.03, w > 0.3 ? '#ff7a55' : '#fff3c0');
  c.strokeStyle = flat(COPPER.s);
  c.lineWidth = r * 0.025;
  c.beginPath();
  for (let i = -2; i <= 2; i++) {
    c.moveTo(i * r * 0.07, -r * 0.34);
    c.lineTo(i * r * 0.07, -r * 0.27);
  }
  c.stroke();
  c.lineWidth = Math.max(1.5, r * 0.06);
  c.beginPath();
  c.arc(0, -r * 0.7, r * 0.38, Math.PI, 0);
  fillStroke(c, metal(c, r, GOLD), GOLD.s);
  c.fillStyle = flat(GOLD.d);
  c.fillRect(-r * 0.5, -r * 0.73, r * 1.0, r * 0.08);
  const blink = 0.5 + 0.5 * Math.sin(L.t * (4 + w * 14));
  disc(c, 0, -r * 1.0, r * 0.09);
  c.fillStyle = `rgba(255, 70, 50, ${0.5 + 0.5 * blink})`;
  c.fill();
  if (blink > 0.6) {
    disc(c, 0, -r * 1.0, r * 0.2);
    c.fillStyle = `rgba(255, 70, 50, ${0.18 * blink})`;
    c.fill();
  }
};

// ---------- The Boilermaker Queen (boss, Act 2) ----------

export const boilermaker: Fn = (c, r, L) => {
  const { w, s } = atk(L);
  const heat = Math.min(1, L.heat + w * 0.6);
  const swell = 1 + w * 0.06 - s * 0.04;
  c.save();
  c.scale(swell, swell);
  // stubby piston legs
  for (const x of [-0.55, 0.55]) {
    rrect(c, x * r - r * 0.12, r * 0.65, r * 0.24, r * 0.32, r * 0.05);
    fillStroke(c, metal(c, r * 0.4, IRON), IRON.s);
  }
  // great copper boiler
  rrect(c, -r * 0.88, -r * 0.2, r * 1.76, r * 1.0, r * 0.4);
  fillStroke(c, metal(c, r * 1.6, COPPER), COPPER.s);
  rrect(c, -r * 0.88, -r * 0.2, r * 1.76, r * 1.0, r * 0.4);
  c.fillStyle = `rgba(255, 110, 40, ${0.12 + heat * 0.45})`;
  c.fill();
  // riveted bands
  c.strokeStyle = flat(BRASS.d);
  c.lineWidth = r * 0.07;
  for (const x of [-0.55, 0.55]) {
    c.beginPath();
    c.moveTo(x * r, -r * 0.18);
    c.lineTo(x * r, r * 0.78);
    c.stroke();
  }
  rivets(c, [-0.55, -0.05, -0.55, 0.3, -0.55, 0.65, 0.55, -0.05, 0.55, 0.3, 0.55, 0.65], r);
  // gauges at both sides, needles trembling harder as she heats up
  for (const sx of [-1, 1]) {
    c.save();
    c.translate(sx * r * 0.72, r * 0.1);
    disc(c, 0, 0, r * 0.17);
    fillStroke(c, flat('#f3e6c8'), BRASS.s);
    const n = -2.4 + heat * 2.4 + Math.sin(L.t * 30 + sx) * 0.08 * heat;
    c.strokeStyle = flat('#c33a2a');
    c.lineWidth = r * 0.03;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(Math.cos(n) * r * 0.14, Math.sin(n) * r * 0.14);
    c.stroke();
    c.restore();
  }
  // belly fan inside a grille
  c.save();
  c.translate(0, r * 0.52);
  rrect(c, -r * 0.32, -r * 0.16, r * 0.64, r * 0.32, r * 0.08);
  c.fillStyle = flat('#1d1710');
  c.fill();
  c.rotate(L.t * (3 + heat * 8));
  c.fillStyle = `rgba(255, ${170 - heat * 70}, 60, ${0.8})`;
  for (let i = 0; i < 4; i++) {
    c.rotate(TAU / 4);
    c.beginPath();
    c.ellipse(r * 0.1, 0, r * 0.09, r * 0.03, 0, 0, TAU);
    c.fill();
  }
  c.restore();
  // face in a sight glass
  disc(c, 0, r * 0.14, r * 0.36);
  fillStroke(c, flat('#1d1710'), BRASS.s);
  disc(c, 0, r * 0.14, r * 0.29);
  c.fillStyle = `rgba(255, ${170 - heat * 100}, 60, 0.92)`;
  c.fill();
  eyes(c, 0, r * 0.1, r * 0.12, r * 0.05, '#1d1710');
  c.strokeStyle = flat('#1d1710');
  c.lineWidth = r * 0.04;
  c.beginPath();
  c.moveTo(-r * 0.15, r * 0.27 + w * r * 0.03);
  c.quadraticCurveTo(0, r * 0.2 - w * r * 0.05, r * 0.15, r * 0.27 + w * r * 0.03);
  c.stroke();
  // crown of pipes, each venting, with a lick of flame on the tallest
  c.lineWidth = Math.max(1.5, r * 0.06);
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * r * 0.34;
    const h = r * (0.34 + (i % 2 ? 0 : 0.2));
    rrect(c, x - r * 0.08, -r * 0.2 - h, r * 0.16, h + r * 0.02, r * 0.03);
    fillStroke(c, metal(c, r * 0.4, GOLD), GOLD.s);
    rrect(c, x - r * 0.11, -r * 0.2 - h - r * 0.04, r * 0.22, r * 0.06, r * 0.02);
    fillStroke(c, metal(c, r * 0.3, BRASS), BRASS.s);
    vent(c, x, -r * 0.24 - h, r, L.t + i * 0.37 + L.seed, 3, 0.2 + w * 0.9);
  }
  const fl = 0.6 + 0.4 * Math.sin(L.t * 12);
  c.fillStyle = `rgba(255, 150, 50, ${0.5 + heat * 0.4})`;
  c.beginPath();
  c.moveTo(-r * 0.07, -r * 0.62);
  c.quadraticCurveTo(0, -r * (0.62 + 0.3 * fl), r * 0.07, -r * 0.62);
  c.fill();
  c.restore();
};

// ---------- The Clockmaker (boss, Act 3): a different look per phase ----------

export const clockmaker: Fn = (c, r, L) => {
  const { w, s } = atk(L);
  const ph = L.phase;
  const robe: Pal = ph === 0 ? { l: '#7c6a52', d: '#2c2218', s: '#140e08' } : ph === 1 ? { l: '#6a4a5a', d: '#2a1624', s: '#12080f' } : { l: '#8a3a30', d: '#2a0c0a', s: '#120404' };
  const glow = ph === 0 ? '255, 226, 154' : ph === 1 ? '255, 170, 110' : '255, 110, 80';
  // halo and orbiting cogs: more of them in later phases
  const halo = 0.15 + ph * 0.12 + w * 0.3;
  const g = c.createRadialGradient(0, -r * 0.3, r * 0.2, 0, -r * 0.3, r * 1.15);
  g.addColorStop(0, `rgba(${glow}, ${halo})`);
  g.addColorStop(1, `rgba(${glow}, 0)`);
  c.fillStyle = g;
  c.fillRect(-r * 1.2, -r * 1.4, r * 2.4, r * 2.6);
  const orbit = ph === 0 ? 2 : ph === 1 ? 4 : 7;
  for (let i = 0; i < orbit; i++) {
    const a = L.t * (0.5 + ph * 0.35 + w) + (i * TAU) / orbit;
    c.save();
    c.translate(Math.cos(a) * r * 0.98, -r * 0.1 + Math.sin(a) * r * 0.5);
    gear(c, r * 0.1 + (i % 2) * r * 0.03, 8, L.t * 2 * (i % 2 ? -1 : 1), ph === 2 ? EMBER : BRASS, 0.25);
    c.restore();
  }
  c.save();
  c.rotate(sw(L, 1.2) * 0.025 - w * 0.06 + s * 0.08);
  // the robe, with an open window showing the works inside
  c.beginPath();
  c.moveTo(-r * 0.64, r * 1.0);
  c.quadraticCurveTo(-r * 0.58, -r * 0.1, -r * 0.3, -r * 0.35);
  c.lineTo(r * 0.3, -r * 0.35);
  c.quadraticCurveTo(r * 0.58, -r * 0.1, r * 0.64, r * 1.0);
  c.closePath();
  fillStroke(c, metal(c, r * 1.5, robe), robe.s);
  c.save();
  c.beginPath();
  c.moveTo(-r * 0.26, r * 0.9);
  c.lineTo(-r * 0.26, r * 0.0);
  c.quadraticCurveTo(0, -r * 0.22, r * 0.26, r * 0.0);
  c.lineTo(r * 0.26, r * 0.9);
  c.closePath();
  c.fillStyle = flat('#150f0a');
  c.fill();
  c.clip();
  // inside: two gears and a swinging pendulum
  c.save();
  c.translate(-r * 0.12, r * 0.18);
  gear(c, r * 0.13, 8, L.t * (1.4 + ph), BRASS, 0.25);
  c.restore();
  c.save();
  c.translate(r * 0.13, r * 0.08);
  gear(c, r * 0.1, 7, -L.t * (1.9 + ph), COPPER, 0.25);
  c.restore();
  const pa = Math.sin(L.t * (2.2 + ph * 0.6)) * 0.55;
  c.save();
  c.translate(0, r * 0.02);
  c.rotate(pa);
  c.strokeStyle = flat(GOLD.l);
  c.lineWidth = r * 0.025;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, r * 0.62);
  c.stroke();
  disc(c, 0, r * 0.66, r * 0.09);
  fillStroke(c, metal(c, r * 0.3, GOLD), GOLD.s);
  c.restore();
  c.restore();
  c.strokeStyle = flat(GOLD.l);
  c.lineWidth = r * 0.04;
  c.beginPath();
  c.moveTo(-r * 0.26, r * 0.9);
  c.lineTo(-r * 0.26, r * 0.0);
  c.quadraticCurveTo(0, -r * 0.22, r * 0.26, r * 0.0);
  c.lineTo(r * 0.26, r * 0.9);
  c.stroke();
  // arms: raised and glowing during the wind-up, swept down on the strike
  c.strokeStyle = flat(robe.d);
  c.lineWidth = r * 0.16;
  c.beginPath();
  if (ph === 2 || w > 0.3) {
    const lift = ph === 2 ? 0.45 : 0.2 + w * 0.3;
    c.moveTo(-r * 0.4, -r * 0.2);
    c.lineTo(-r * 0.78, -r * (0.25 + lift) + sw(L, 3) * r * 0.04 + s * r * 0.5);
    c.moveTo(r * 0.4, -r * 0.2);
    c.lineTo(r * 0.78, -r * (0.25 + lift) + sw(L, 3, 1) * r * 0.04 + s * r * 0.5);
  } else {
    c.moveTo(-r * 0.4, -r * 0.2);
    c.lineTo(-r * 0.72, r * 0.35);
    c.moveTo(r * 0.4, -r * 0.2);
    c.lineTo(r * 0.82, ph === 1 ? r * 0.0 : r * 0.35);
  }
  c.stroke();
  c.lineWidth = Math.max(1.5, r * 0.06);
  if (ph === 1 && w <= 0.3) {
    c.save();
    c.translate(r * 0.88, -r * 0.05);
    c.rotate(0.3 + sw(L, 2) * 0.05);
    c.strokeStyle = metal(c, r * 0.5, GOLD);
    c.lineWidth = r * 0.07;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -r * 0.55);
    c.stroke();
    disc(c, 0, -r * 0.62, r * 0.14);
    c.stroke();
    c.restore();
  }
  // the clock-face head
  const hy = -r * 0.62;
  disc(c, 0, hy, r * 0.44);
  fillStroke(c, metal(c, r * 0.9, ph === 2 ? EMBER : GOLD), GOLD.s);
  disc(c, 0, hy, r * 0.36);
  c.fillStyle = flat(ph === 2 ? '#fff0d0' : ph === 1 ? '#efe0c0' : '#f3e6c8');
  c.fill();
  c.strokeStyle = flat('#3a2a1b');
  c.lineWidth = r * 0.03;
  c.beginPath();
  for (let i = 0; i < 12; i++) {
    if (ph === 1 && i % 4 === 1) continue; // a few marks have fallen off
    const a = (i * TAU) / 12;
    const r0 = i % 3 === 0 ? 0.24 : 0.29;
    c.moveTo(Math.cos(a) * r * r0, hy + Math.sin(a) * r * r0);
    c.lineTo(Math.cos(a) * r * 0.33, hy + Math.sin(a) * r * 0.33);
  }
  c.stroke();
  if (ph >= 1) {
    // cracks in the glass, glowing from within in the last phase
    c.strokeStyle = ph === 2 ? `rgba(255, 120, 60, ${0.7 + 0.3 * Math.sin(L.t * 8)})` : flat('#2a1010');
    c.lineWidth = r * (ph === 2 ? 0.035 : 0.025);
    c.beginPath();
    c.moveTo(-r * 0.05, hy - r * 0.35);
    c.lineTo(r * 0.04, hy - r * 0.1);
    c.lineTo(-r * 0.08, hy + r * 0.05);
    c.lineTo(r * 0.12, hy + r * 0.32);
    c.moveTo(r * 0.04, hy - r * 0.1);
    c.lineTo(r * 0.3, hy - r * 0.2);
    c.moveTo(-r * 0.08, hy + r * 0.05);
    c.lineTo(-r * 0.32, hy + r * 0.12);
    c.stroke();
  }
  const spin = ph === 2 ? -6 : ph === 1 ? 1.6 : 0.5;
  c.strokeStyle = flat('#3a2a1b');
  c.lineWidth = r * 0.05;
  c.beginPath();
  c.moveTo(0, hy);
  c.lineTo(Math.cos(L.t * spin - 1.2) * r * 0.2, hy + Math.sin(L.t * spin - 1.2) * r * 0.2);
  c.stroke();
  c.lineWidth = r * 0.03;
  c.beginPath();
  c.moveTo(0, hy);
  c.lineTo(Math.cos(L.t * spin * 12 - 0.4) * r * 0.3, hy + Math.sin(L.t * spin * 12 - 0.4) * r * 0.3);
  c.stroke();
  hub(c, 0, hy, r * 0.045, '#b04a3a', BRASS.s);
  if (ph === 2) {
    c.strokeStyle = 'rgba(255, 140, 80, 0.85)';
    c.lineWidth = r * 0.04;
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8 + L.t * 0.8;
      c.moveTo(Math.cos(a) * r * 0.52, hy + Math.sin(a) * r * 0.52);
      c.lineTo(Math.cos(a) * r * 0.72, hy + Math.sin(a) * r * 0.72);
    }
    c.stroke();
  }
  c.restore();
  // phase change: cracks of light burst out from the face and fade
  if (L.morph > 0.02) {
    const m = L.morph;
    c.save();
    c.translate(0, -r * 0.62);
    c.strokeStyle = `rgba(255, 244, 214, ${m})`;
    c.lineWidth = r * 0.05 * m + 1;
    c.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12 + i * 0.3;
      const len = r * (0.5 + (1 - m) * 1.6 + (i % 3) * 0.15);
      c.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
      c.lineTo(Math.cos(a + 0.08) * len * 0.6, Math.sin(a + 0.08) * len * 0.6);
      c.lineTo(Math.cos(a - 0.06) * len, Math.sin(a - 0.06) * len);
    }
    c.stroke();
    disc(c, 0, 0, r * (0.4 + (1 - m) * 0.6));
    c.fillStyle = `rgba(255, 244, 214, ${m * 0.55})`;
    c.fill();
    c.restore();
  }
};

// ---------- Elites ----------

export const gearhound: Fn = (c, r, L) => {
  const { w, s } = atk(L);
  const run = L.t * (5 + w * 8);
  // two pairs of legs galloping out of phase
  c.lineCap = 'round';
  for (const [x, ph, back] of [[-0.55, 0, 1], [-0.28, Math.PI, 1], [0.3, Math.PI * 0.5, 0], [0.6, Math.PI * 1.5, 0]] as const) {
    const sw1 = Math.sin(run + ph);
    c.strokeStyle = flat(back ? '#1d2326' : '#2b3338');
    c.lineWidth = r * 0.1;
    c.beginPath();
    c.moveTo(x * r, r * 0.25);
    c.lineTo(x * r + sw1 * r * 0.12, r * 0.55);
    c.lineTo(x * r + sw1 * r * 0.2 - r * 0.04, r * 0.85 - Math.max(0, sw1) * r * 0.08);
    c.stroke();
  }
  // wagging antenna tail, with a spark at the tip
  c.strokeStyle = flat(IRON.l);
  c.lineWidth = Math.max(1.5, r * 0.06);
  const wag = Math.sin(L.t * (6 + w * 8)) * r * 0.12;
  c.beginPath();
  c.moveTo(-r * 0.8, -r * 0.15);
  c.quadraticCurveTo(-r * 1.05, -r * 0.4 + wag, -r * 0.95, -r * 0.75 + wag);
  c.stroke();
  disc(c, -r * 0.95, -r * 0.78 + wag, r * 0.05);
  c.fillStyle = flat(COLOR.lamp);
  c.fill();
  // body, armor plates, steam vent
  rrect(c, -r * 0.85, -r * 0.35, r * 1.5, r * 0.7, r * 0.3);
  fillStroke(c, metal(c, r * 1.2, IRON), IRON.s);
  for (let i = 0; i < 3; i++) {
    rrect(c, -r * 0.6 + i * r * 0.35, -r * 0.42, r * 0.28, r * 0.14, r * 0.04);
    fillStroke(c, metal(c, r * 0.4, SILVER), SILVER.s);
  }
  vent(c, -r * 0.35, -r * 0.42, r, L.t, 3, 0.2 + w * 0.8);
  c.save();
  c.translate(-r * 0.1, r * 0.02);
  gear(c, r * 0.22, 9, L.t * (1.2 + w * 4), BRASS, 0.25);
  hub(c, 0, 0, r * 0.05);
  c.restore();
  // head with opening jaw, ears flicking
  c.save();
  c.translate(r * 0.62, -r * 0.18);
  c.rotate(-w * 0.12 + s * 0.2);
  poly(c, [-r * 0.1, -r * 0.3, r * 0.4, -r * 0.05, r * 0.45, r * 0.0, r * 0.05, r * 0.05, -r * 0.15, -r * 0.1]);
  fillStroke(c, metal(c, r, IRON), IRON.s);
  const jaw = 0.1 + w * 0.35 + s * 0.2;
  c.save();
  c.translate(r * 0.05, r * 0.05);
  c.rotate(jaw);
  poly(c, [0, 0, r * 0.4, -r * 0.01, r * 0.36, r * 0.1, 0, r * 0.1]);
  fillStroke(c, metal(c, r * 0.6, IRON), IRON.s);
  c.fillStyle = flat('#f1e3c6');
  for (const x of [0.12, 0.22, 0.32]) {
    poly(c, [x * r, -r * 0.01, (x + 0.05) * r, -r * 0.01, (x + 0.025) * r, -r * 0.1]);
    c.fill();
  }
  c.restore();
  c.save();
  c.translate(-r * 0.05, -r * 0.3);
  c.rotate(Math.sin(L.t * 3 + L.seed) * 0.15);
  poly(c, [0, 0, -r * 0.1, -r * 0.35, r * 0.15, -r * 0.05]);
  fillStroke(c, flat(IRON.d), IRON.s);
  c.restore();
  eyes(c, r * 0.18, -r * 0.12, 0, r * 0.06 + w * r * 0.02, w > 0.2 ? '#ff4a30' : '#ff9a55');
  c.restore();
};

export const tinpotGeneral: Fn = (c, r, L) => {
  const { w, s } = atk(L);
  // legs
  c.fillStyle = flat('#2b3a4d');
  rrect(c, -r * 0.34, r * 0.72, r * 0.26, r * 0.28, r * 0.05);
  c.fill();
  rrect(c, r * 0.08, r * 0.72, r * 0.26, r * 0.28, r * 0.05);
  c.fill();
  // coat with a row of medals and a red sash
  rrect(c, -r * 0.5, -r * 0.1, r * 1.0, r * 0.95, r * 0.25);
  fillStroke(c, metal(c, r, SILVER), SILVER.s);
  c.fillStyle = flat('#b04a3a');
  c.beginPath();
  c.moveTo(-r * 0.5, -r * 0.02);
  c.lineTo(-r * 0.3, -r * 0.1);
  c.lineTo(r * 0.5, r * 0.55);
  c.lineTo(r * 0.3, r * 0.65);
  c.closePath();
  c.fill();
  for (let i = 0; i < 3; i++) {
    disc(c, -r * 0.3 + i * r * 0.14, r * 0.12, r * 0.05);
    fillStroke(c, metal(c, r * 0.2, i === 1 ? EMBER : GOLD), GOLD.s);
  }
  // epaulettes with fringe
  for (const sx of [-1, 1]) {
    rrect(c, sx * r * 0.5 - r * 0.16, -r * 0.14, r * 0.32, r * 0.16, r * 0.05);
    fillStroke(c, metal(c, r * 0.4, GOLD), GOLD.s);
    c.strokeStyle = flat(GOLD.d);
    c.lineWidth = r * 0.02;
    c.beginPath();
    for (let i = -2; i <= 2; i++) {
      c.moveTo(sx * r * 0.5 + i * r * 0.06, r * 0.02);
      c.lineTo(sx * r * 0.5 + i * r * 0.06, r * 0.1 + Math.sin(L.t * 3 + i) * r * 0.01);
    }
    c.stroke();
  }
  // head with moustache and monocle
  disc(c, 0, -r * 0.3, r * 0.34);
  fillStroke(c, metal(c, r, COPPER), COPPER.s);
  eyes(c, 0, -r * 0.32, r * 0.13, r * 0.05, w > 0.3 ? '#ff7a55' : '#fff3c0');
  c.strokeStyle = flat('#3a2a1b');
  c.lineWidth = r * 0.07;
  c.beginPath();
  c.moveTo(-r * 0.26, -r * 0.13);
  c.quadraticCurveTo(-r * 0.12, -r * 0.2, 0, -r * 0.14);
  c.quadraticCurveTo(r * 0.12, -r * 0.2, r * 0.26, -r * 0.13);
  c.stroke();
  c.lineWidth = r * 0.025;
  c.strokeStyle = flat(GOLD.l);
  disc(c, r * 0.13, -r * 0.32, r * 0.1);
  c.stroke();
  c.strokeStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(L.t * 2)})`;
  c.beginPath();
  c.arc(r * 0.13, -r * 0.32, r * 0.07, 3.6, 4.5);
  c.stroke();
  // pot helmet with a plume and a wisp of steam from its handle
  c.lineWidth = Math.max(1.5, r * 0.06);
  c.beginPath();
  c.moveTo(-r * 0.42, -r * 0.4);
  c.quadraticCurveTo(-r * 0.42, -r * 0.9, 0, -r * 0.9);
  c.quadraticCurveTo(r * 0.42, -r * 0.9, r * 0.42, -r * 0.4);
  c.closePath();
  fillStroke(c, metal(c, r, IRON), IRON.s);
  rrect(c, -r * 0.54, -r * 0.45, r * 1.08, r * 0.1, r * 0.04);
  fillStroke(c, metal(c, r * 0.4, IRON), IRON.s);
  disc(c, 0, -r * 0.96, r * 0.07);
  c.fillStyle = flat(IRON.l);
  c.fill();
  vent(c, 0, -r * 1.0, r, L.t, 2, 0.1 + w * 0.4);
  c.fillStyle = flat('#b04a3a');
  c.beginPath();
  c.moveTo(r * 0.1, -r * 0.88);
  c.quadraticCurveTo(r * 0.5 + Math.sin(L.t * 3) * r * 0.05, -r * 1.0, r * 0.35, -r * 0.6);
  c.quadraticCurveTo(r * 0.3, -r * 0.8, r * 0.1, -r * 0.8);
  c.fill();
  // baton: raised in the wind-up, then brought down
  c.save();
  c.translate(r * 0.62, r * 0.35);
  c.rotate(-0.5 - w * 0.9 + s * 1.6 + sw(L, 2) * 0.06);
  c.fillStyle = flat(GOLD.l);
  c.fillRect(-r * 0.04, -r * 0.75, r * 0.08, r * 0.85);
  disc(c, 0, -r * 0.78, r * 0.07);
  c.fillStyle = flat(EMBER.l);
  c.fill();
  c.restore();
  c.strokeStyle = flat(SILVER.d);
  c.lineWidth = r * 0.14;
  c.beginPath();
  c.moveTo(r * 0.5, r * 0.05);
  c.lineTo(r * 0.64, r * 0.35);
  c.stroke();
};

export const pressureWarden: Fn = (c, r, L) => {
  const { w, s } = atk(L);
  const heat = Math.min(1, 0.3 + L.heat * 0.5 + w * 0.7);
  // legs
  for (const x of [-0.3, 0.3]) {
    rrect(c, x * r - r * 0.14, r * 0.7, r * 0.28, r * 0.3, r * 0.06);
    fillStroke(c, metal(c, r * 0.4, IRON), IRON.s);
  }
  // tank body, banded and riveted
  rrect(c, -r * 0.62, -r * 0.2, r * 1.24, r * 1.0, r * 0.28);
  fillStroke(c, metal(c, r * 1.3, IRON), IRON.s);
  c.strokeStyle = flat(SILVER.d);
  c.lineWidth = r * 0.06;
  c.beginPath();
  c.moveTo(-r * 0.6, r * 0.55);
  c.lineTo(r * 0.6, r * 0.55);
  c.moveTo(-r * 0.58, -r * 0.05);
  c.lineTo(r * 0.58, -r * 0.05);
  c.stroke();
  rivets(c, [-0.5, 0.65, -0.25, 0.65, 0, 0.65, 0.25, 0.65, 0.5, 0.65], r, IRON.l);
  // chest gauge with a trembling needle, a valve wheel beside it
  disc(c, -r * 0.12, r * 0.25, r * 0.26);
  fillStroke(c, flat('#f3e6c8'), BRASS.s);
  const n = -2.3 + heat * 2.2 + Math.sin(L.t * 25) * 0.07 * heat;
  c.strokeStyle = flat('#c33a2a');
  c.lineWidth = r * 0.05;
  c.beginPath();
  c.moveTo(-r * 0.12, r * 0.25);
  c.lineTo(-r * 0.12 + Math.cos(n) * r * 0.21, r * 0.25 + Math.sin(n) * r * 0.21);
  c.stroke();
  c.save();
  c.translate(r * 0.36, r * 0.25);
  spokes(c, 4, r * 0.02, r * 0.16, L.t * (0.6 + w * 4), r * 0.05, BRASS.l);
  disc(c, 0, 0, r * 0.17);
  c.strokeStyle = metal(c, r * 0.3, BRASS);
  c.lineWidth = r * 0.04;
  c.stroke();
  c.restore();
  // shoulder vents
  for (const sx of [-1, 1]) {
    rrect(c, sx * r * 0.62 - r * 0.07, -r * 0.34, r * 0.14, r * 0.2, r * 0.03);
    fillStroke(c, metal(c, r * 0.3, IRON), IRON.s);
    vent(c, sx * r * 0.62, -r * 0.34, r, L.t + sx, 3, 0.25 + w * 0.9);
  }
  // fists, raised for the slam
  for (const sx of [-1, 1]) {
    c.save();
    c.translate(sx * r * 0.74, r * 0.0);
    c.rotate(sx * (w * 0.5 - s * 0.9));
    rrect(c, -r * 0.14, -r * 0.1, r * 0.28, r * 0.78 - w * r * 0.15, r * 0.1);
    fillStroke(c, metal(c, r * 0.5, IRON), IRON.s);
    rrect(c, -r * 0.18, r * 0.5 - w * r * 0.15, r * 0.36, r * 0.24, r * 0.08);
    fillStroke(c, metal(c, r * 0.4, SILVER), SILVER.s);
    c.restore();
  }
  // helmet with a visor that glows red as pressure builds
  c.beginPath();
  c.moveTo(-r * 0.4, -r * 0.18);
  c.quadraticCurveTo(-r * 0.45, -r * 0.85, 0, -r * 0.88);
  c.quadraticCurveTo(r * 0.45, -r * 0.85, r * 0.4, -r * 0.18);
  c.closePath();
  fillStroke(c, metal(c, r, SILVER), SILVER.s);
  rrect(c, -r * 0.3, -r * 0.55, r * 0.6, r * 0.2, r * 0.06);
  c.fillStyle = `rgba(${60 + heat * 190}, ${20 + (1 - heat) * 20}, 20, 1)`;
  c.fill();
  eyes(c, 0, -r * 0.45, r * 0.12, r * 0.05, '#ffd0a0');
  rrect(c, -r * 0.05, -r * 1.0, r * 0.1, r * 0.14, r * 0.02);
  fillStroke(c, metal(c, r * 0.3, BRASS), BRASS.s);
};

export const twinPistons: Fn = (c, r, L) => {
  const { w, s } = atk(L);
  const ph = L.seed * 2;
  const pump = (Math.sin(L.t * (3 + w * 6) + ph) + 1) / 2;
  const slam = s * r * 0.25;
  // flywheel at the side, turning
  c.save();
  c.translate(r * 0.62, r * 0.35);
  disc(c, 0, 0, r * 0.3);
  c.lineWidth = r * 0.1;
  c.strokeStyle = metal(c, r * 0.6, BRASS);
  c.stroke();
  spokes(c, 5, r * 0.04, r * 0.25, L.t * (2 + w * 6) * (L.seed > 2 ? -1 : 1), r * 0.05, BRASS.d);
  hub(c, 0, 0, r * 0.07);
  c.restore();
  // cylinder with a glass window; the piston head pumps inside
  rrect(c, -r * 0.42, r * 0.05, r * 0.84, r * 0.85, r * 0.12);
  fillStroke(c, metal(c, r * 1.2, IRON), IRON.s);
  rrect(c, -r * 0.3, r * 0.14, r * 0.6, r * 0.6, r * 0.08);
  c.fillStyle = flat('#12181b');
  c.fill();
  c.fillStyle = flat('#b9c6cc');
  c.fillRect(-r * 0.26, r * 0.2 + pump * r * 0.18, r * 0.52, r * 0.1);
  eyes(c, 0, r * 0.55, r * 0.14, r * 0.07 + w * r * 0.02, w > 0.3 ? '#ff4a30' : '#ff9a55');
  c.strokeStyle = flat(IRON.l);
  c.lineWidth = r * 0.05;
  c.beginPath();
  c.moveTo(-r * 0.28, r * 0.45);
  c.lineTo(-r * 0.06, r * 0.52);
  c.moveTo(r * 0.28, r * 0.45);
  c.lineTo(r * 0.06, r * 0.52);
  c.stroke();
  // piston rod and the heavy head on top
  const top = -r * 0.55 - pump * r * 0.2 - w * r * 0.15 + slam;
  c.fillStyle = flat(COLOR.steel);
  c.fillRect(-r * 0.09, top, r * 0.18, r * 0.6 - top - r * 0.55);
  rrect(c, -r * 0.5, top - r * 0.28, r * 1.0, r * 0.3, r * 0.08);
  fillStroke(c, metal(c, r, BRASS), BRASS.s);
  // a pressure gauge and steam from the exhaust
  disc(c, r * 0.0, top - r * 0.13, r * 0.09);
  fillStroke(c, flat('#f3e6c8'), BRASS.s);
  vent(c, -r * 0.38, top - r * 0.3, r, L.t + L.seed, 3, 0.2 + w * 0.8);
  c.lineWidth = Math.max(1.5, r * 0.06);
};

export const minuteWarden: Fn = (c, r, L) => {
  const { w, s } = atk(L);
  const hy = -r * 0.5;
  // halo: a ring of minute ticks with a sweeping hand behind the head
  c.save();
  c.translate(0, hy);
  c.strokeStyle = `rgba(255, 226, 154, ${0.35 + w * 0.5})`;
  c.lineWidth = r * 0.03;
  disc(c, 0, 0, r * 0.52);
  c.stroke();
  c.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i * TAU) / 24;
    c.moveTo(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52);
    c.lineTo(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58);
  }
  c.stroke();
  c.strokeStyle = flat(GOLD.l);
  c.lineWidth = r * 0.04;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(Math.cos(L.t * (1.5 + w * 6) - 1.57) * r * 0.5, Math.sin(L.t * (1.5 + w * 6) - 1.57) * r * 0.5);
  c.stroke();
  c.restore();
  // robe with a swaying hem
  const sway = Math.sin(L.t * 1.6) * r * 0.05;
  c.beginPath();
  c.moveTo(-r * 0.62 + sway, r * 0.98);
  c.quadraticCurveTo(-r * 0.52, -r * 0.2, -r * 0.25, -r * 0.45);
  c.lineTo(r * 0.25, -r * 0.45);
  c.quadraticCurveTo(r * 0.52, -r * 0.2, r * 0.62 + sway, r * 0.98);
  for (let i = 0; i < 4; i++) c.lineTo(r * (0.62 - (i + 1) * 0.31) + sway + (i % 2 ? 0 : r * 0.04 * Math.sin(L.t * 3 + i)), r * (0.98 + (i % 2 ? 0 : -0.06)));
  c.closePath();
  fillStroke(c, metal(c, r * 1.4, { l: '#6d7f9a', d: '#222d3d', s: '#10161f' }), '#10161f');
  // hood
  c.beginPath();
  c.arc(0, hy, r * 0.34, Math.PI * 0.95, Math.PI * 2.05);
  c.lineTo(r * 0.28, -r * 0.22);
  c.lineTo(-r * 0.28, -r * 0.22);
  c.closePath();
  fillStroke(c, flat('#222d3d'), '#10161f');
  eyes(c, 0, hy + r * 0.08, r * 0.11, r * 0.05 + w * r * 0.02, w > 0.3 ? '#ffe29a' : '#9ad27a');
  // clock face on the chest with moving hands
  disc(c, 0, r * 0.16, r * 0.26);
  fillStroke(c, flat('#f3e6c8'), BRASS.s);
  c.strokeStyle = flat('#3a2a1b');
  c.lineWidth = r * 0.04;
  c.beginPath();
  c.moveTo(0, r * 0.16);
  c.lineTo(Math.cos(L.t * 2) * r * 0.2, r * 0.16 + Math.sin(L.t * 2) * r * 0.2);
  c.moveTo(0, r * 0.16);
  c.lineTo(Math.cos(L.t * 0.2) * r * 0.13, r * 0.16 + Math.sin(L.t * 0.2) * r * 0.13);
  c.stroke();
  // lantern swinging from the left hand
  c.save();
  c.translate(-r * 0.66, r * 0.15);
  c.rotate(Math.sin(L.t * 1.8) * 0.2);
  c.strokeStyle = flat(IRON.l);
  c.lineWidth = r * 0.03;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, r * 0.22);
  c.stroke();
  rrect(c, -r * 0.08, r * 0.22, r * 0.16, r * 0.2, r * 0.03);
  c.fillStyle = `rgba(255, 226, 154, ${0.7 + 0.2 * Math.sin(L.t * 7)})`;
  c.fill();
  c.strokeStyle = flat(BRASS.d);
  c.lineWidth = r * 0.025;
  c.stroke();
  c.restore();
  // minute-hand staff: lifted, glowing, then swung
  c.save();
  c.translate(r * 0.62, r * 0.4);
  c.rotate(0.12 - w * 0.5 + s * 1.1 + sw(L, 1.5) * 0.03);
  if (w > 0.1) {
    disc(c, 0, -r * 1.1, r * (0.12 + w * 0.2));
    c.fillStyle = `rgba(255, 226, 154, ${w * 0.4})`;
    c.fill();
  }
  poly(c, [-r * 0.04, r * 0.5, r * 0.04, r * 0.5, r * 0.04, -r * 1.1, 0, -r * 1.3, -r * 0.04, -r * 1.1]);
  fillStroke(c, metal(c, r * 0.6, GOLD), GOLD.s);
  disc(c, 0, r * 0.1, r * 0.1);
  fillStroke(c, metal(c, r * 0.3, BRASS), BRASS.s);
  c.restore();
  // a couple of floating cogs
  for (let i = 0; i < 2; i++) {
    c.save();
    c.translate(r * (i ? 0.75 : -0.8), -r * 0.7 + Math.sin(L.t * 1.4 + i * 2) * r * 0.08);
    gear(c, r * 0.1, 8, L.t * (i ? -1.5 : 1.5), BRASS, 0.25);
    c.restore();
  }
};

export const orrery: Fn = (c, r, L) => {
  const { w, s } = atk(L);
  const spin = 1 + w * 4 + s * 3;
  // stand
  rrect(c, -r * 0.1, r * 0.72, r * 0.2, r * 0.22, r * 0.04);
  fillStroke(c, metal(c, r * 0.3, BRASS), BRASS.s);
  rrect(c, -r * 0.42, r * 0.9, r * 0.84, r * 0.1, r * 0.04);
  fillStroke(c, metal(c, r * 0.5, BRASS), BRASS.s);
  // glow that builds in the wind-up
  if (w > 0.05) {
    const g = c.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.1);
    g.addColorStop(0, `rgba(255, 190, 90, ${w * 0.55})`);
    g.addColorStop(1, 'rgba(255, 190, 90, 0)');
    c.fillStyle = g;
    c.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4);
  }
  // sun core
  disc(c, 0, 0, r * (0.3 + w * 0.05));
  fillStroke(c, metal(c, r * 0.6, EMBER), EMBER.s);
  eyes(c, 0, -r * 0.02, r * 0.1, r * 0.05, '#1d1710');
  // three armillary rings tumbling, each at its own tilt, with a moon riding it
  for (let i = 0; i < 3; i++) {
    c.save();
    c.rotate(L.t * 0.25 * spin * (i % 2 ? -1 : 1) + i * 1.05);
    const tilt = 0.3 + 0.12 * i + 0.18 * Math.sin(L.t * 0.9 * spin + i * 2);
    ellipse(c, 0, 0, r * (0.92 - i * 0.1), r * Math.abs(tilt));
    c.strokeStyle = metal(c, r, i === 1 ? GOLD : BRASS);
    c.lineWidth = r * 0.06;
    c.stroke();
    c.lineWidth = r * 0.015;
    c.strokeStyle = flat('#4b3512');
    c.stroke();
    const a = L.t * (0.8 + i * 0.35) * spin + i * 2.1;
    disc(c, Math.cos(a) * r * (0.92 - i * 0.1), Math.sin(a) * r * Math.abs(tilt), r * 0.11);
    fillStroke(c, metal(c, r * 0.3, i === 1 ? VERD : SILVER), IRON.s);
    c.restore();
  }
  c.lineWidth = Math.max(1.5, r * 0.06);
  c.save();
  c.translate(0, r * 0.55);
  gear(c, r * 0.15, 8, L.t * 1.2 * spin, BRASS, 0.25);
  c.restore();
};

export const BOSS_PAINT: Record<string, Fn> = {
  foreman,
  boilermaker,
  clockmaker,
  gearhound,
  'tinpot-general': tinpotGeneral,
  'pressure-warden': pressureWarden,
  'twin-pistons': twinPistons,
  'minute-warden': minuteWarden,
  orrery,
};
