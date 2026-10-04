// Drawing entry points for the stage: parts, the Mainspring and enemies. Everything is drawn in code.
import { COLOR } from './palette';
import { TAU, metal, BRASS, IRON, poly, fillStroke } from './kit';
import { aura } from './parts';
import type { Vis } from './parts';

export { drawPart, drawEcho, newVis, partFamily, PART_IDS } from './parts';
export type { Vis } from './parts';
export { drawEnemy, drawStatuses, drawShell, newLook, ENEMY_IDS } from './enemies';
export type { EnemyLook } from './enemies';

export function drawMainspring(c: CanvasRenderingContext2D, x: number, y: number, r: number, v: Vis, now: number): void {
  aura(c, x, y, r * 1.1, Math.max(v.glow, 0.15 + 0.1 * Math.sin(now * 2)));
  c.save();
  c.translate(x, y);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.lineWidth = Math.max(2, r * 0.08);
  c.beginPath();
  c.arc(0, 0, r * 0.78, 0, TAU);
  fillStroke(c, metal(c, r, BRASS), '#4b3512');
  c.fillStyle = '#3a2a1b';
  c.beginPath();
  c.arc(0, 0, r * 0.6, 0, TAU);
  c.fill();
  c.strokeStyle = COLOR.copper;
  c.lineWidth = r * 0.07;
  c.beginPath();
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    const a = t * TAU * 3 + v.rot;
    const rad = r * (0.08 + 0.48 * t);
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.stroke();
  c.save();
  c.rotate(v.rot);
  c.fillStyle = COLOR.brass;
  c.beginPath();
  c.roundRect(-r * 0.07, -r * 0.2, r * 0.14, r * 0.4, r * 0.04);
  c.fill();
  c.beginPath();
  c.ellipse(0, -r * 0.2, r * 0.17, r * 0.1, 0, 0, TAU);
  c.fill();
  c.restore();
  if (v.jam > 0.02) {
    // a steel wedge driven into the spring, with a few cracks around it
    const k = v.jam;
    c.save();
    c.translate(r * 0.2, -r * 0.55 * (2 - k) + r * 0.05);
    c.rotate(0.5);
    poly(c, [-r * 0.2, -r * 0.5, r * 0.2, -r * 0.5, r * 0.06, r * 0.45, -r * 0.06, r * 0.45]);
    c.lineWidth = Math.max(1.5, r * 0.06);
    fillStroke(c, metal(c, r * 0.6, IRON), IRON.s);
    c.strokeStyle = '#c33a2a';
    c.beginPath();
    c.moveTo(-r * 0.15, -r * 0.3);
    c.lineTo(r * 0.15, -r * 0.3);
    c.stroke();
    c.restore();
    c.strokeStyle = 'rgba(20, 12, 8, 0.8)';
    c.lineWidth = Math.max(1.5, r * 0.04);
    c.beginPath();
    c.moveTo(r * 0.1, r * 0.0);
    c.lineTo(r * 0.3, r * 0.12);
    c.moveTo(r * 0.2, -r * 0.1);
    c.lineTo(-r * 0.05, r * 0.1);
    c.stroke();
  }
  c.restore();
}
