// Drawing routines for parts, the Mainspring and enemies. Everything is drawn in code.
import { COLOR } from './palette';

const TAU = Math.PI * 2;

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
}

export const newVis = (): Vis => ({ rot: 0, glow: 0, charge: 0, snap: 0, strokeT: 99, heat: 0, counter: 0, rusted: false });

function gearPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, teeth: number, rot: number, depth = 0.2): void {
  const step = TAU / teeth;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a = rot + i * step;
    const pts: [number, number][] = [
      [a - step * 0.5, r],
      [a - step * 0.22, r * (1 + depth)],
      [a + step * 0.22, r * (1 + depth)],
      [a + step * 0.5, r],
    ];
    pts.forEach(([ang, rad], k) => {
      const px = x + Math.cos(ang) * rad;
      const py = y + Math.sin(ang) * rad;
      if (i === 0 && k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
  }
  ctx.closePath();
}

function metal(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, light: string, dark: string): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r * 1.3);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  return g;
}

function hub(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = COLOR.tile;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = COLOR.brassDark;
  ctx.lineWidth = Math.max(1, r * 0.25);
  ctx.stroke();
}

function aura(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, glow: number): void {
  if (glow <= 0.02) return;
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.5);
  g.addColorStop(0, `rgba(255, 210, 122, ${0.55 * glow})`);
  g.addColorStop(1, 'rgba(255, 210, 122, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.5, 0, TAU);
  ctx.fill();
}

export function drawPart(
  ctx: CanvasRenderingContext2D,
  defId: string,
  plus: boolean,
  x: number,
  y: number,
  r: number,
  v: Vis,
  now: number,
): void {
  aura(ctx, x, y, r, v.glow);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const lw = Math.max(1.5, r * 0.07);
  ctx.lineWidth = lw;
  switch (defId) {
    case 'spur': {
      gearPath(ctx, x, y, r * 0.66, 10, v.rot);
      ctx.fillStyle = metal(ctx, x, y, r * 0.8, '#f0cf7a', COLOR.brassDark);
      ctx.fill();
      ctx.strokeStyle = '#4b3512';
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = v.rot + (i * TAU) / 4 + Math.PI / 4;
        ctx.fillStyle = COLOR.tile;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r * 0.36, y + Math.sin(a) * r * 0.36, r * 0.11, 0, TAU);
        ctx.fill();
      }
      hub(ctx, x, y, r * 0.14);
      break;
    }
    case 'idler': {
      gearPath(ctx, x, y, r * 0.5, 8, v.rot, 0.24);
      ctx.fillStyle = metal(ctx, x, y, r * 0.7, '#e7b88a', COLOR.copperDark);
      ctx.fill();
      ctx.strokeStyle = '#4b2410';
      ctx.stroke();
      ctx.strokeStyle = COLOR.lamp;
      ctx.lineWidth = lw * 0.9;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.8, v.rot * 0.5, v.rot * 0.5 + Math.PI * 1.3);
      ctx.stroke();
      // arrowhead on the boost ring
      const ea = v.rot * 0.5 + Math.PI * 1.3;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ea) * r * 0.8 + Math.cos(ea + 1.9) * r * 0.16, y + Math.sin(ea) * r * 0.8 + Math.sin(ea + 1.9) * r * 0.16);
      ctx.lineTo(x + Math.cos(ea) * r * 0.8, y + Math.sin(ea) * r * 0.8);
      ctx.lineTo(x + Math.cos(ea) * r * 0.8 + Math.cos(ea - 0.4) * r * 0.2 * -1, y + Math.sin(ea) * r * 0.8 + Math.sin(ea - 0.4) * r * 0.2 * -1);
      ctx.stroke();
      hub(ctx, x, y, r * 0.12);
      break;
    }
    case 'coil': {
      const compress = 1 - 0.12 * Math.min(v.charge, 3);
      const overshoot = v.snap > 0 ? Math.sin(v.snap * 9) * 0.25 * v.snap : 0;
      const w = r * 1.5 * (compress + overshoot);
      const loops = 6;
      ctx.strokeStyle = metal(ctx, x, y, r, '#f0a370', COLOR.copperDark);
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      for (let i = 0; i <= loops * 8; i++) {
        const t = i / (loops * 8);
        const px = x - w / 2 + t * w;
        const py = y + Math.sin(t * loops * TAU) * r * 0.34;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.fillStyle = COLOR.brassDark;
      ctx.fillRect(x - r * 0.85, y - r * 0.45, r * 0.12, r * 0.9);
      ctx.fillRect(x + r * 0.73, y - r * 0.45, r * 0.12, r * 0.9);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < v.charge ? COLOR.lamp : 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.arc(x + (i - 1) * r * 0.3, y + r * 0.66, r * 0.09, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'escapement': {
      gearPath(ctx, x, y + r * 0.1, r * 0.46, 12, v.rot, 0.28);
      ctx.fillStyle = metal(ctx, x, y, r * 0.7, '#c9d1d6', '#5b666c');
      ctx.fill();
      ctx.strokeStyle = '#2b3338';
      ctx.stroke();
      const rock = v.strokeT < 0.4 ? Math.sin(v.strokeT * 16) * 0.5 : Math.sin(now * 1.4) * 0.1;
      ctx.save();
      ctx.translate(x, y - r * 0.5);
      ctx.rotate(rock);
      ctx.strokeStyle = COLOR.brass;
      ctx.lineWidth = r * 0.16;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, r * 0.35);
      ctx.lineTo(-r * 0.4, 0);
      ctx.lineTo(r * 0.4, 0);
      ctx.lineTo(r * 0.6, r * 0.35);
      ctx.stroke();
      ctx.restore();
      hub(ctx, x, y + r * 0.1, r * 0.1);
      break;
    }
    case 'cam': {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(v.rot);
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * TAU;
        const rad = r * (0.42 + 0.3 * Math.max(0, Math.cos(a)) ** 1.5);
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = metal(ctx, 0, 0, r * 0.7, '#9fd3c9', '#2f6a62');
      ctx.fill();
      ctx.strokeStyle = '#173a35';
      ctx.stroke();
      ctx.restore();
      hub(ctx, x, y, r * 0.12);
      ctx.fillStyle = COLOR.steel;
      ctx.fillRect(x - r * 0.07, y - r * 0.95, r * 0.14, r * 0.3);
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = i < v.counter % 2 ? COLOR.lamp : 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.arc(x + (i - 0.5) * r * 0.3, y + r * 0.78, r * 0.09, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'boiler': {
      const w = r * 1.5;
      const h = r * 1.1;
      const g = ctx.createLinearGradient(x, y - h / 2, x, y + h / 2);
      g.addColorStop(0, '#d98a62');
      g.addColorStop(0.5, COLOR.copper);
      g.addColorStop(1, COLOR.copperDark);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - h / 2, w, h, r * 0.35);
      ctx.fill();
      ctx.strokeStyle = '#4b2410';
      ctx.stroke();
      if (v.heat > 0.02) {
        ctx.fillStyle = `rgba(255, 140, 60, ${0.5 * v.heat})`;
        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - h / 2, w, h, r * 0.35);
        ctx.fill();
      }
      ctx.fillStyle = COLOR.brass;
      for (const dx of [-0.55, 0, 0.55]) {
        ctx.beginPath();
        ctx.arc(x + dx * w * 0.8, y + h * 0.3, r * 0.05, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = COLOR.tile;
      ctx.beginPath();
      ctx.arc(x, y - h * 0.08, r * 0.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = COLOR.brass;
      ctx.beginPath();
      ctx.arc(x, y - h * 0.08, r * 0.2, 0, TAU);
      ctx.stroke();
      const needle = -2.2 + Math.min(1, v.heat + 0.2) * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y - h * 0.08);
      ctx.lineTo(x + Math.cos(needle) * r * 0.17, y - h * 0.08 + Math.sin(needle) * r * 0.17);
      ctx.strokeStyle = COLOR.lamp;
      ctx.stroke();
      ctx.fillStyle = COLOR.brassDark;
      ctx.fillRect(x - r * 0.08, y - h / 2 - r * 0.2, r * 0.16, r * 0.22);
      break;
    }
    case 'piston': {
      const t = Math.min(1, v.strokeT / 0.35);
      const out = v.strokeT < 0.35 ? Math.sin(t * Math.PI) * r * 0.5 : 0;
      ctx.fillStyle = COLOR.steel;
      ctx.beginPath();
      ctx.roundRect(x - r * 0.85, y - r * 0.38, r * 0.95, r * 0.76, r * 0.1);
      ctx.fill();
      ctx.strokeStyle = '#2b3338';
      ctx.stroke();
      ctx.fillStyle = '#c9d1d6';
      ctx.fillRect(x + r * 0.1, y - r * 0.09, r * 0.4 + out, r * 0.18);
      ctx.fillStyle = COLOR.brass;
      ctx.beginPath();
      ctx.roundRect(x + r * 0.5 + out, y - r * 0.4, r * 0.18, r * 0.8, r * 0.05);
      ctx.fill();
      ctx.strokeStyle = '#4b3512';
      ctx.stroke();
      ctx.fillStyle = COLOR.brassDark;
      for (const dy of [-0.2, 0.2]) {
        ctx.beginPath();
        ctx.arc(x - r * 0.65, y + dy * r, r * 0.05, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'pendulum': {
      const since = v.strokeT;
      const ang = since < 1.6 ? 0.7 * Math.exp(-since * 2.2) * Math.cos(since * 11) : Math.sin(now * 1.6) * 0.12;
      ctx.save();
      ctx.translate(x, y - r * 0.8);
      ctx.rotate(ang);
      ctx.strokeStyle = COLOR.brassDark;
      ctx.lineWidth = r * 0.07;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, r * 1.25);
      ctx.stroke();
      ctx.fillStyle = metal(ctx, 0, r * 1.3, r * 0.4, '#f0cf7a', COLOR.brassDark);
      ctx.beginPath();
      ctx.arc(0, r * 1.3, r * 0.3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#4b3512';
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.restore();
      hub(ctx, x, y - r * 0.8, r * 0.1);
      break;
    }
    default: {
      gearPath(ctx, x, y, r * 0.6, 8, v.rot);
      ctx.fillStyle = COLOR.steel;
      ctx.fill();
      break;
    }
  }
  if (plus) {
    ctx.fillStyle = COLOR.lamp;
    ctx.font = `700 ${Math.max(10, r * 0.42)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', x - r * 0.8, y - r * 0.78);
  }
  if (v.rusted) {
    ctx.fillStyle = 'rgba(164, 80, 42, 0.45)';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.85, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(120, 50, 20, 0.7)';
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.5, y + Math.sin(a * 1.3) * r * 0.5, r * 0.08 + (i % 3) * r * 0.03, 0, TAU);
      ctx.fill();
    }
  }
}

export function drawMainspring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, v: Vis, now: number): void {
  aura(ctx, x, y, r * 1.1, Math.max(v.glow, 0.15 + 0.1 * Math.sin(now * 2)));
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.fillStyle = metal(ctx, x, y, r, '#f0cf7a', COLOR.brassDark);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.78, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#4b3512';
  ctx.stroke();
  ctx.fillStyle = '#3a2a1b';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = COLOR.copper;
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    const a = t * TAU * 3 + v.rot;
    const rad = r * (0.08 + 0.48 * t);
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(v.rot);
  ctx.fillStyle = COLOR.brass;
  ctx.beginPath();
  ctx.roundRect(-r * 0.07, -r * 0.2, r * 0.14, r * 0.4, r * 0.04);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.2, r * 0.17, r * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export interface EnemyLook {
  hit: number; // 0..1 flash
  dead: number; // 0 alive .. 1 gone
  t: number; // seconds, for idle motion
  seed: number;
}

export function drawEnemy(ctx: CanvasRenderingContext2D, defId: string, x: number, y: number, size: number, look: EnemyLook): void {
  const r = size / 2;
  const bob = Math.sin(look.t * 2 + look.seed) * r * 0.04;
  ctx.save();
  ctx.globalAlpha = 1 - look.dead * 0.85;
  ctx.translate(x + Math.sin(look.hit * 30) * look.hit * r * 0.08, y + bob + look.dead * r * 0.25);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  const body = look.hit > 0.2 ? '#ffe6c8' : null;
  switch (defId) {
    case 'rust-mite': {
      ctx.strokeStyle = '#4b2410';
      for (let i = 0; i < 3; i++) {
        const k = (i - 1) * r * 0.42;
        const wig = Math.sin(look.t * 6 + i + look.seed) * r * 0.08;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * r * 0.4, k * 0.6);
          ctx.lineTo(s * r * 0.8, k + wig);
          ctx.lineTo(s * r * 0.95, k + r * 0.28);
          ctx.stroke();
        }
      }
      ctx.fillStyle = body ?? metal(ctx, 0, 0, r, '#d98a62', COLOR.rust);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.55, r * 0.46, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(70, 30, 10, 0.6)';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(Math.cos(i * 2.2) * r * 0.3, Math.sin(i * 1.7) * r * 0.22, r * 0.07, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = COLOR.lamp;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(s * r * 0.2, -r * 0.1, r * 0.1, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = COLOR.steel;
      ctx.beginPath();
      ctx.moveTo(-r * 0.12, -r * 0.45);
      ctx.lineTo(-r * 0.28, -r * 0.75);
      ctx.moveTo(r * 0.12, -r * 0.45);
      ctx.lineTo(r * 0.28, -r * 0.75);
      ctx.stroke();
      break;
    }
    case 'cog-rat': {
      ctx.strokeStyle = COLOR.steel;
      ctx.lineWidth = r * 0.08;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, r * 0.2);
      ctx.bezierCurveTo(-r * 1.0, r * 0.4, -r * 0.9, -r * 0.2, -r * 1.1, -r * 0.3);
      ctx.stroke();
      ctx.lineWidth = Math.max(1.5, r * 0.06);
      ctx.fillStyle = body ?? metal(ctx, 0, 0, r, '#b9b2a6', '#5c564d');
      ctx.beginPath();
      ctx.ellipse(-r * 0.05, r * 0.1, r * 0.62, r * 0.42, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#2b2620';
      ctx.stroke();
      gearPath(ctx, -r * 0.1, r * 0.08, r * 0.2, 8, look.t * 0.8, 0.25);
      ctx.fillStyle = COLOR.brass;
      ctx.fill();
      ctx.fillStyle = body ?? '#c9c2b6';
      ctx.beginPath();
      ctx.moveTo(r * 0.4, -r * 0.1);
      ctx.lineTo(r * 0.95, r * 0.12);
      ctx.lineTo(r * 0.4, r * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = COLOR.lamp;
      ctx.beginPath();
      ctx.arc(r * 0.5, 0, r * 0.07, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#9d948a';
      ctx.beginPath();
      ctx.arc(r * 0.25, -r * 0.25, r * 0.17, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#2b2620';
      for (const s of [-0.3, 0.3]) {
        ctx.beginPath();
        ctx.moveTo(s * r, r * 0.45);
        ctx.lineTo(s * r, r * 0.7);
        ctx.stroke();
      }
      break;
    }
    default: {
      // practice dummy and anything unknown: a tin figure on a post
      ctx.strokeStyle = '#4b3512';
      ctx.fillStyle = body ?? '#9a7a45';
      ctx.fillRect(-r * 0.08, r * 0.2, r * 0.16, r * 0.7);
      ctx.beginPath();
      ctx.roundRect(-r * 0.45, -r * 0.5, r * 0.9, r * 0.85, r * 0.2);
      ctx.fillStyle = body ?? metal(ctx, 0, 0, r, '#d1a64a', COLOR.brassDark);
      ctx.fill();
      ctx.stroke();
      for (const k of [0.38, 0.22, 0.08]) {
        ctx.beginPath();
        ctx.arc(0, -r * 0.08, r * k, 0, TAU);
        ctx.strokeStyle = k === 0.22 ? COLOR.rust : '#4b3512';
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}
