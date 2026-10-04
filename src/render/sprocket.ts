// Sprocket the corgi, drawn in code. Side three-quarter view facing right: a long low body, short stubby legs,
// big upright ears, a fox-like face with a white blaze, a round fluffy cream rear and a tiny tail, a brass collar
// with a gear tag. Everything is deterministic for a given (pose, t), so tests can compare frames.
import { COLOR } from './palette';
import { TAU, gearPath } from './kit';

export type SprocketPose = 'idle' | 'happy' | 'celebrate' | 'comfort' | 'sleepy' | 'pet' | 'sniff' | 'run';

export const POSES: SprocketPose[] = ['idle', 'happy', 'celebrate', 'comfort', 'sleepy', 'pet', 'sniff', 'run'];

const OUT = '#4a2a14'; // warm outline
const ORANGE = '#ee9548';
const ORANGE_D = '#c9692a';
const CREAM = '#fff0d6';
const WHITE = '#fffaf0';
const PINK = '#f2a5a0';
const DARK = '#2a1a14';

interface Params {
  dx: number; // horizontal offset in units of the dog height
  hop: number; // lift off the ground
  flip: number; // horizontal scale (-1..1): spinning
  rot: number; // body tilt
  lie: number; // 0 standing .. 1 curled up
  breath: number;
  rearWig: number; // angle the rear sways by
  tailWag: number; // sideways swing of the tail
  tailUp: number; // 0..1 tail held high
  headDx: number;
  headDown: number; // 0..1 nose to the ground
  headTilt: number;
  earBack: number; // 0..1
  earTwitch: number; // extra rotation of the far ear
  eyeClosed: number; // 0..1
  happyEyes: boolean; // closed in a smile (^ ^)
  mouthOpen: number;
  tongue: number;
  legPhase: number;
  legAmp: number;
  blush: number;
  bed: boolean;
  zs: boolean;
  confetti: boolean;
  hearts: boolean;
}

const base = (): Params => ({
  dx: 0, hop: 0, flip: 1, rot: 0, lie: 0, breath: 0, rearWig: 0, tailWag: 0, tailUp: 0, headDx: 0, headDown: 0, headTilt: 0,
  earBack: 0, earTwitch: 0, eyeClosed: 0, happyEyes: false, mouthOpen: 0.12, tongue: 0, legPhase: 0, legAmp: 0, blush: 0,
  bed: false, zs: false, confetti: false, hearts: false,
});

const ease = (k: number): number => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const pulse = (t: number, period: number, width: number): number => {
  const m = t % period;
  return m < width ? Math.sin((m / width) * Math.PI) : 0;
};

function params(pose: SprocketPose, t: number): Params {
  const P = base();
  // every pose breathes and blinks a little, so he is never still
  P.eyeClosed = pulse(t + 1.1, 3.7, 0.16);
  P.earTwitch = pulse(t, 4.3, 0.3) * 0.25;
  switch (pose) {
    case 'idle':
      P.breath = Math.sin(t * 2.1) * 0.012;
      P.tailWag = Math.sin(t * 4) * 0.2;
      P.headTilt = Math.sin(t * 0.7) * 0.035;
      P.rearWig = Math.sin(t * 4) * 0.015;
      break;
    case 'happy':
      P.hop = Math.abs(Math.sin(t * 5)) * 0.07;
      P.rearWig = Math.sin(t * 10) * 0.13;
      P.tailWag = Math.sin(t * 14) * 0.55;
      P.mouthOpen = 0.7;
      P.tongue = 1;
      P.headTilt = Math.sin(t * 5) * 0.07;
      P.legAmp = 0.12;
      P.legPhase = t * 10;
      P.breath = Math.sin(t * 10) * 0.012;
      break;
    case 'celebrate': {
      const a = t * 2.6;
      const c = Math.cos(a);
      P.flip = Math.abs(c) < 0.3 ? (c < 0 ? -0.3 : 0.3) : c;
      P.hop = Math.abs(Math.sin(t * 5.2)) * 0.15;
      P.rearWig = Math.sin(t * 12) * 0.1;
      P.tailWag = Math.sin(t * 16) * 0.6;
      P.mouthOpen = 0.85;
      P.tongue = 1;
      P.legAmp = 0.5;
      P.legPhase = t * 10;
      P.earBack = 0.2;
      P.confetti = true;
      break;
    }
    case 'comfort': {
      const trot = 1 - ease(t / 1.5);
      P.dx = -0.7 * trot + 0.1 * (1 - trot);
      P.legAmp = trot > 0.02 ? 0.8 : 0;
      P.legPhase = t * 11;
      P.hop = trot > 0.02 ? Math.abs(Math.sin(t * 11)) * 0.02 : 0;
      P.rot = -0.045 * (1 - trot);
      P.headTilt = 0.2 * (1 - trot) + Math.sin(t * 0.9) * 0.02;
      P.eyeClosed = Math.max(P.eyeClosed, 0.4 * (1 - trot));
      P.tailWag = Math.sin(t * (trot > 0.02 ? 9 : 2.3)) * (trot > 0.02 ? 0.4 : 0.25);
      P.earBack = 0.35;
      P.breath = Math.sin(t * 1.8) * 0.014;
      P.mouthOpen = 0.08;
      break;
    }
    case 'sleepy':
      P.lie = 1;
      P.eyeClosed = 1;
      P.breath = Math.sin(t * 1.3) * 0.028;
      P.earBack = 0.3;
      P.tailWag = Math.sin(t * 0.9) * 0.05;
      P.earTwitch = pulse(t, 7, 0.4) * 0.3;
      P.bed = true;
      P.zs = true;
      P.mouthOpen = 0;
      P.headDown = 0;
      break;
    case 'pet':
      P.eyeClosed = 1;
      P.happyEyes = true;
      P.earBack = 0.8;
      P.rearWig = Math.sin(t * 9) * 0.1;
      P.tailWag = Math.sin(t * 13) * 0.55;
      P.headTilt = -0.12 + Math.sin(t * 6) * 0.025;
      P.mouthOpen = 0.45;
      P.tongue = 0.4;
      P.blush = 1;
      P.hearts = true;
      P.hop = Math.max(0, Math.sin(t * 6)) * 0.015;
      P.breath = Math.sin(t * 8) * 0.01;
      break;
    case 'sniff':
      P.headDown = 1;
      P.tailUp = 1;
      P.tailWag = Math.sin(t * 6) * 0.3;
      P.legAmp = 0.3;
      P.legPhase = t * 3.2;
      P.rot = 0.04;
      P.dx = Math.sin(t * 0.8) * 0.03;
      P.earBack = -0.2;
      P.headDx = Math.sin(t * 13) * 0.008;
      P.breath = Math.sin(t * 13) * 0.01;
      break;
    case 'run':
      P.legAmp = 1;
      P.legPhase = t * 14;
      P.hop = Math.abs(Math.sin(t * 7)) * 0.06;
      P.rot = -0.04;
      P.earBack = 0.95;
      P.tongue = 1;
      P.mouthOpen = 0.8;
      P.tailWag = Math.sin(t * 18) * 0.5;
      P.rearWig = Math.sin(t * 14) * 0.04;
      P.eyeClosed = 0;
      break;
  }
  return P;
}

/** A scalloped, fluffy blob. `n` scallops; `bump` is how deep the cusps go. */
function fluff(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, n: number, bump: number, rot = 0): void {
  const N = n * 12;
  c.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU;
    const k = 1 - bump * Math.abs(Math.sin((a * n) / 2));
    const x = cx + Math.cos(a + rot) * rx * k;
    const y = cy + Math.sin(a + rot) * ry * k;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
}

function lin(c: CanvasRenderingContext2D, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = c.createLinearGradient(0, y0, 0, y1);
  for (const [k, col] of stops) g.addColorStop(k, col);
  return g;
}

function ear(c: CanvasRenderingContext2D, bx: number, by: number, w: number, tx: number, ty: number, rot: number, far: boolean): void {
  c.save();
  c.translate(bx, by);
  c.rotate(rot);
  const path = (k: number, ww: number): void => {
    c.beginPath();
    c.moveTo(-ww, 0);
    c.quadraticCurveTo(-ww * 1.5 + (tx * k) * 0.3, ty * k * 0.55, tx * k, ty * k);
    c.quadraticCurveTo(ww * 0.9 + tx * k * 0.5, ty * k * 0.5, ww, 0);
    c.closePath();
  };
  path(1, w);
  c.fillStyle = far ? ORANGE_D : ORANGE;
  c.fill();
  c.stroke();
  path(0.72, w * 0.55);
  c.save();
  c.translate(0, -c.lineWidth * 0.5);
  c.fillStyle = far ? '#d98a86' : PINK;
  c.fill();
  c.restore();
  c.restore();
}

function leg(c: CanvasRenderingContext2D, u: number, x: number, y0: number, phase: number, amp: number, far: boolean, lie: number, fwd: number): void {
  const foot = Math.sin(phase) * amp * 0.11;
  const lift = Math.max(0, Math.cos(phase)) * amp * 0.1;
  const len = 0.2 - lie * 0.08;
  const fx = x * u + foot * u + fwd * u * lie;
  const fy = y0 + len * u - lift * u - 0.0;
  c.lineCap = 'round';
  const w = 0.16 * u;
  c.strokeStyle = OUT;
  c.lineWidth = w + c.lineWidth * 0 + u * 0.04;
  c.beginPath();
  c.moveTo(x * u, y0);
  c.lineTo(fx, fy);
  c.stroke();
  c.strokeStyle = far ? ORANGE_D : ORANGE;
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(x * u, y0);
  c.lineTo(fx, fy);
  c.stroke();
  // a white sock and paw
  c.fillStyle = far ? '#e8dcc6' : WHITE;
  c.strokeStyle = OUT;
  c.lineWidth = Math.max(1.2, u * 0.02);
  c.beginPath();
  c.ellipse(fx + u * 0.015, fy - u * 0.005, u * 0.085, u * 0.05, 0, 0, TAU);
  c.fill();
  c.stroke();
  c.strokeStyle = 'rgba(74,42,20,0.5)';
  c.beginPath();
  c.moveTo(fx + u * 0.04, fy - u * 0.04);
  c.lineTo(fx + u * 0.04, fy + u * 0.02);
  c.moveTo(fx + u * 0.075, fy - u * 0.03);
  c.lineTo(fx + u * 0.075, fy + u * 0.02);
  c.stroke();
}

function heart(c: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.35);
  c.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  c.closePath();
}

/** Draw Sprocket standing on the ground at (x, y). `size` is his height in px; `t` is seconds since the pose began. */
export function drawSprocket(c: CanvasRenderingContext2D, x: number, y: number, size: number, pose: SprocketPose, t: number): void {
  const P = params(pose, t);
  const u = size * 0.88;
  const ow = Math.max(1.3, u * 0.022);
  const lie = P.lie;
  const breath = P.breath;
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.lineWidth = ow;
  c.strokeStyle = OUT;

  // a cushion when he is curled up, a soft shadow otherwise
  c.save();
  c.translate(x + P.dx * u, y);
  if (P.bed) {
    c.beginPath();
    c.ellipse(0, -u * 0.04, u * 0.82, u * 0.13, 0, 0, TAU);
    c.fillStyle = lin(c, -u * 0.17, u * 0.09, [[0, '#b4533a'], [1, '#6e2c1c']]);
    c.fill();
    c.stroke();
    c.strokeStyle = 'rgba(255, 210, 122, 0.7)';
    c.setLineDash([u * 0.04, u * 0.035]);
    c.beginPath();
    c.ellipse(0, -u * 0.045, u * 0.74, u * 0.095, 0, 0, TAU);
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = OUT;
  } else {
    c.beginPath();
    c.ellipse(0, 0, u * (0.62 - P.hop * 1.2), u * 0.055, 0, 0, TAU);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fill();
  }
  c.restore();

  c.translate(x + P.dx * u, y - P.hop * u - (P.bed ? u * 0.06 : 0));
  c.rotate(P.rot);
  c.scale(P.flip, 1);

  const bodyY = -0.3 * u + lie * 0.1 * u;
  const bodyRy = 0.22 * u * (1 + breath) * (1 - lie * 0.08);
  const bodyRx = 0.5 * u * (1 + lie * 0.04);
  const bx = -0.04 * u;

  // legs behind the body
  if (lie < 0.5) {
    const top = bodyY + bodyRy * 0.45;
    leg(c, u, -0.22, top, P.legPhase, P.legAmp, true, 0, 0);
    leg(c, u, 0.42, top, P.legPhase + Math.PI, P.legAmp, true, 0, 0);
  }

  // tail: a fluffy nub that wags (and rises when he sniffs)
  c.save();
  const tx = -0.62 * u + Math.sin(P.tailWag) * 0.05 * u;
  const ty = bodyY - 0.09 * u - P.tailUp * 0.13 * u + (lie ? 0.04 * u : 0);
  fluff(c, tx, ty, 0.1 * u, 0.085 * u, 7, 0.14, P.tailWag * 0.6);
  c.fillStyle = lin(c, ty - u * 0.1, ty + u * 0.1, [[0, ORANGE], [1, CREAM]]);
  c.fill();
  c.stroke();
  c.restore();

  // the body, with its cream belly
  c.beginPath();
  c.ellipse(bx, bodyY, bodyRx, bodyRy, 0, 0, TAU);
  c.fillStyle = lin(c, bodyY - bodyRy, bodyY + bodyRy, [[0, '#f2a257'], [0.55, ORANGE], [0.78, '#fbdcb4'], [1, WHITE]]);
  c.fill();
  c.stroke();
  // the saddle's lighter top
  c.save();
  c.beginPath();
  c.ellipse(bx, bodyY, bodyRx, bodyRy, 0, 0, TAU);
  c.clip();
  c.fillStyle = 'rgba(255, 226, 170, 0.35)';
  c.beginPath();
  c.ellipse(bx - u * 0.12, bodyY - bodyRy * 0.62, bodyRx * 0.62, bodyRy * 0.22, -0.05, 0, TAU);
  c.fill();
  c.restore();

  // the big fluffy rear: round, cream below and ginger above, with a scalloped edge
  c.save();
  c.translate(-0.3 * u, bodyY);
  c.rotate(P.rearWig);
  const rr = 0.3 * u;
  fluff(c, -0.1 * u, 0.04 * u, rr, rr * (0.96 + breath), 10, 0.1, 0.3);
  c.fillStyle = lin(c, -rr, rr, [[0, '#f2a257'], [0.45, ORANGE], [0.7, '#fbdcb4'], [1, WHITE]]);
  c.fill();
  c.stroke();
  c.restore();
  c.strokeStyle = OUT;
  c.lineWidth = ow;

  // neck
  const hx = (0.5 + P.headDx + P.headDown * 0.1) * u + lie * 0.06 * u;
  const hy = (-0.52 + P.headDown * 0.26) * u + lie * 0.3 * u;
  c.beginPath();
  c.ellipse(0.33 * u, bodyY - 0.06 * u + lie * 0.04 * u, 0.2 * u, 0.18 * u, 0, 0, TAU);
  c.fillStyle = lin(c, bodyY - 0.3 * u, bodyY + 0.1 * u, [[0, ORANGE], [1, '#f6b878']]);
  c.fill();
  c.stroke();

  // white chest ruff
  fluff(c, 0.34 * u, bodyY + 0.05 * u + lie * 0.03 * u, 0.2 * u, 0.2 * u, 8, 0.14, 0.5);
  c.fillStyle = WHITE;
  c.fill();
  c.stroke();

  // front legs and, when curled up, the paws he rests his chin on
  if (lie < 0.5) {
    const top = bodyY + bodyRy * 0.45;
    leg(c, u, -0.36, top, P.legPhase + Math.PI, P.legAmp, false, 0, 0);
    leg(c, u, 0.3, top, P.legPhase, P.legAmp, false, 0, 0);
  } else {
    for (const [px, py] of [[0.5, -0.045], [0.66, -0.03]] as const) {
      c.beginPath();
      c.ellipse(px * u, py * u, 0.1 * u, 0.055 * u, 0, 0, TAU);
      c.fillStyle = WHITE;
      c.fill();
      c.stroke();
    }
    c.beginPath();
    c.ellipse(-0.45 * u, -0.05 * u, 0.1 * u, 0.055 * u, 0, 0, TAU);
    c.fillStyle = CREAM;
    c.fill();
    c.stroke();
  }

  // ---- head ----
  c.save();
  c.translate(hx, hy);
  c.rotate(P.headTilt + P.headDown * 0.5);
  c.scale(1.2, 1.2);
  const uh = u;
  // far ear first (behind the skull)
  const er = (k: number): number => -P.earBack * 0.95 * k;
  ear(c, 0.12 * uh, -0.13 * uh, 0.095 * uh, 0.04 * uh, -0.36 * uh * (1 - P.earBack * 0.15 - lie * 0.12), er(1) + P.earTwitch + (P.headDown ? -0.05 : 0), true);
  // skull
  c.beginPath();
  c.ellipse(0, -0.02 * uh, 0.21 * uh, 0.19 * uh, 0, 0, TAU);
  c.fillStyle = lin(c, -0.2 * uh, 0.16 * uh, [[0, '#f2a257'], [1, ORANGE]]);
  c.fill();
  c.stroke();
  // white cheek ruff
  fluff(c, -0.03 * uh, 0.09 * uh, 0.18 * uh, 0.1 * uh, 6, 0.14, 0.2);
  c.fillStyle = WHITE;
  c.fill();
  c.stroke();
  // muzzle
  c.beginPath();
  c.moveTo(0.0, -0.03 * uh);
  c.quadraticCurveTo(0.15 * uh, -0.1 * uh, 0.34 * uh, -0.02 * uh);
  c.quadraticCurveTo(0.39 * uh, 0.02 * uh, 0.34 * uh, 0.065 * uh);
  c.quadraticCurveTo(0.2 * uh, 0.13 * uh, 0.02 * uh, 0.125 * uh);
  c.closePath();
  c.fillStyle = CREAM;
  c.fill();
  c.stroke();
  // blaze
  c.fillStyle = WHITE;
  c.beginPath();
  c.moveTo(-0.02 * uh, -0.18 * uh);
  c.lineTo(0.05 * uh, -0.18 * uh);
  c.lineTo(0.14 * uh, -0.05 * uh);
  c.lineTo(0.02 * uh, -0.03 * uh);
  c.closePath();
  c.fill();
  // open mouth and tongue
  const mo = P.mouthOpen;
  if (mo > 0.3) {
    c.beginPath();
    c.ellipse(0.22 * uh, 0.085 * uh, 0.075 * uh, 0.045 * uh * mo, 0.05, 0, TAU);
    c.fillStyle = '#7a2a30';
    c.fill();
    if (P.tongue > 0.05) {
      c.beginPath();
      c.ellipse(0.2 * uh, 0.1 * uh + 0.03 * uh * P.tongue, 0.04 * uh, 0.03 * uh + 0.05 * uh * P.tongue, 0.05, 0, TAU);
      c.fillStyle = '#ee7a86';
      c.fill();
      c.stroke();
      c.strokeStyle = 'rgba(122,42,48,0.6)';
      c.beginPath();
      c.moveTo(0.2 * uh, 0.1 * uh);
      c.lineTo(0.2 * uh, 0.1 * uh + 0.05 * uh * P.tongue);
      c.stroke();
      c.strokeStyle = OUT;
    }
  }
  c.beginPath();
  c.moveTo(0.3 * uh, 0.05 * uh);
  c.quadraticCurveTo(0.24 * uh, 0.1 * uh + mo * 0.02 * uh, 0.13 * uh, 0.08 * uh);
  c.stroke();
  // nose
  c.beginPath();
  c.ellipse(0.35 * uh, 0.0, 0.048 * uh, 0.037 * uh, -0.2, 0, TAU);
  c.fillStyle = DARK;
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.beginPath();
  c.ellipse(0.34 * uh, -0.012 * uh, 0.016 * uh, 0.009 * uh, -0.3, 0, TAU);
  c.fill();
  // eyes, with a shine; closed in a smile when petted
  const eyeAt = (ex: number, ey: number, r: number): void => {
    if (P.happyEyes) {
      c.strokeStyle = DARK;
      c.lineWidth = ow * 1.3;
      c.beginPath();
      c.arc(ex * uh, (ey + 0.02) * uh, r * uh, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
      c.strokeStyle = OUT;
      c.lineWidth = ow;
      return;
    }
    const open = 1 - P.eyeClosed;
    if (open < 0.12) {
      c.strokeStyle = DARK;
      c.lineWidth = ow * 1.2;
      c.beginPath();
      c.moveTo((ex - r) * uh, ey * uh);
      c.quadraticCurveTo(ex * uh, (ey + r * 0.8) * uh, (ex + r) * uh, ey * uh);
      c.stroke();
      c.strokeStyle = OUT;
      c.lineWidth = ow;
      return;
    }
    c.beginPath();
    c.ellipse(ex * uh, ey * uh, r * uh, r * uh * 1.15 * open, 0, 0, TAU);
    c.fillStyle = DARK;
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.95)';
    c.beginPath();
    c.arc((ex + r * 0.3) * uh, (ey - r * 0.35 * open) * uh, r * 0.38 * uh, 0, TAU);
    c.fill();
  };
  eyeAt(0.115, -0.075, 0.04);
  eyeAt(0.225, -0.08, 0.032);
  // the corgi's tan eyebrow dots
  c.fillStyle = '#e0a36a';
  for (const [ex, ey, r] of [[0.115, -0.14, 0.02], [0.225, -0.145, 0.017]] as const) {
    c.beginPath();
    c.arc(ex * uh, ey * uh, r * uh, 0, TAU);
    c.fill();
  }
  // blush
  if (P.blush > 0) {
    c.fillStyle = `rgba(242, 130, 130, ${0.45 * P.blush})`;
    c.beginPath();
    c.ellipse(0.06 * uh, 0.04 * uh, 0.04 * uh, 0.025 * uh, 0, 0, TAU);
    c.fill();
  }
  // near ear, big and upright
  ear(c, -0.08 * uh, -0.12 * uh, 0.115 * uh, -0.05 * uh, -0.4 * uh * (1 - P.earBack * 0.15 - lie * 0.12), er(1), false);
  // brass collar and gear tag
  c.strokeStyle = OUT;
  c.lineWidth = u * 0.058;
  c.beginPath();
  c.moveTo(-0.2 * uh, 0.06 * uh);
  c.quadraticCurveTo(-0.1 * uh, 0.2 * uh, 0.05 * uh, 0.15 * uh);
  c.stroke();
  c.strokeStyle = '#d1a64a';
  c.lineWidth = u * 0.034;
  c.beginPath();
  c.moveTo(-0.2 * uh, 0.06 * uh);
  c.quadraticCurveTo(-0.1 * uh, 0.2 * uh, 0.05 * uh, 0.15 * uh);
  c.stroke();
  c.strokeStyle = OUT;
  c.lineWidth = ow;
  const sway = Math.sin(t * 5 + P.hop * 20) * 0.03;
  c.save();
  c.translate(-0.07 * uh + sway * uh, 0.205 * uh);
  c.beginPath();
  c.arc(0, 0, 0.05 * uh, 0, TAU);
  c.fillStyle = '#f0cf7a';
  c.fill();
  c.stroke();
  gearPath(c, 0.026 * uh, 6, t * 0.4, 0.3);
  c.fillStyle = '#8a6a2a';
  c.fill();
  c.restore();
  c.restore();
  c.restore();

  // ---- effects (not mirrored) ----
  const cxp = x + P.dx * u;
  if (P.zs) {
    c.save();
    c.strokeStyle = '#cfd8ff';
    c.lineWidth = Math.max(1.5, u * 0.025);
    c.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.35 + i / 3) % 1;
      const s = u * (0.04 + k * 0.05);
      const zx = cxp + u * (0.62 + k * 0.14);
      const zy = y - u * (0.5 + k * 0.5);
      c.globalAlpha = Math.sin(k * Math.PI);
      c.beginPath();
      c.moveTo(zx - s, zy - s);
      c.lineTo(zx + s, zy - s);
      c.lineTo(zx - s, zy + s);
      c.lineTo(zx + s, zy + s);
      c.stroke();
    }
    c.restore();
  }
  if (P.hearts) {
    c.save();
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.9 + i / 3) % 1;
      c.globalAlpha = Math.sin(k * Math.PI);
      c.fillStyle = '#ff8aa0';
      heart(c, cxp + u * (0.35 + i * 0.16) + Math.sin(k * 6 + i) * u * 0.03, y - u * (0.95 + k * 0.3), u * 0.045);
      c.fill();
    }
    c.restore();
  }
  if (P.confetti) {
    c.save();
    const cols = ['#d1a64a', '#c4703f', '#9fd3c9', '#ffd27a'];
    for (let i = 0; i < 12; i++) {
      const k = (t * 0.7 + i * 0.137) % 1;
      const a = i * 2.4;
      const px = cxp + Math.cos(a) * u * (0.45 + 0.4 * k);
      const py = y - u * (1.15 - k * 0.95) + Math.sin(a * 1.7) * u * 0.1;
      c.globalAlpha = Math.min(1, (1 - k) * 2.2);
      c.save();
      c.translate(px, py);
      gearPath(c, u * 0.035, 6, t * 3 + i, 0.35);
      c.fillStyle = cols[i % 4];
      c.fill();
      c.restore();
    }
    c.restore();
  }
}

// ---------- the three event scenes ----------

function pipe(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  c.beginPath();
  c.roundRect(x, y, w, h, Math.min(w, h) * 0.3);
  c.fillStyle = lin(c, y, y + h, [[0, '#d98a62'], [0.5, '#c4703f'], [1, '#7d4524']]);
  c.fill();
  c.stroke();
}

/** A small scene for the Sprocket events: sniffing out a blueprint, stuck behind the pipes, asleep on a warm boiler. */
export function drawEventScene(c: CanvasRenderingContext2D, w: number, h: number, eventId: string, t: number): void {
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.lineWidth = Math.max(1.5, h * 0.012);
  c.strokeStyle = OUT;
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2a2018');
  g.addColorStop(1, '#3a2b1f');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // floor boards
  c.fillStyle = '#2e231a';
  c.fillRect(0, h * 0.82, w, h * 0.18);
  c.strokeStyle = 'rgba(74,54,36,0.8)';
  c.beginPath();
  c.moveTo(0, h * 0.82);
  c.lineTo(w, h * 0.82);
  c.stroke();
  c.strokeStyle = OUT;
  const size = h * 0.62;
  const gy = h * 0.9;
  if (eventId === 'sprocket-pipe') {
    // pipes run across the scene; he is wedged behind them, tail and rear sticking out
    c.save();
    c.beginPath();
    c.rect(0, 0, w * 0.5, h);
    c.clip();
    drawSprocket(c, w * 0.5, gy, size, 'idle', t);
    c.restore();
    c.save();
    c.beginPath();
    c.rect(w * 0.5, 0, w * 0.5, h);
    c.clip();
    drawSprocket(c, w * 0.5, gy, size, 'sniff', t);
    c.restore();
    pipe(c, w * 0.48, h * 0.1, w * 0.1, h * 0.8);
    pipe(c, w * 0.62, h * 0.1, w * 0.1, h * 0.8);
    pipe(c, w * 0.76, h * 0.1, w * 0.1, h * 0.8);
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.5 + i / 3) % 1;
      c.beginPath();
      c.arc(w * 0.67 + Math.sin(t * 2 + i) * 4, h * 0.2 - k * h * 0.15, 4 + k * 8, 0, TAU);
      c.fillStyle = `rgba(236, 242, 246, ${0.5 * (1 - k)})`;
      c.fill();
    }
  } else if (eventId === 'sprocket-nap') {
    // a warm boiler with a sleeping corgi on top
    c.beginPath();
    c.roundRect(w * 0.12, h * 0.52, w * 0.76, h * 0.36, h * 0.1);
    c.fillStyle = lin(c, h * 0.52, h * 0.88, [[0, '#d98a62'], [0.5, '#c4703f'], [1, '#7d4524']]);
    c.fill();
    c.stroke();
    const glow = 0.15 + 0.08 * Math.sin(t * 1.5);
    c.beginPath();
    c.roundRect(w * 0.12, h * 0.52, w * 0.76, h * 0.36, h * 0.1);
    c.fillStyle = `rgba(255, 140, 60, ${glow})`;
    c.fill();
    c.fillStyle = '#d1a64a';
    for (const k of [0.2, 0.5, 0.8]) {
      c.beginPath();
      c.arc(w * k, h * 0.82, h * 0.014, 0, TAU);
      c.fill();
    }
    drawSprocket(c, w * 0.5, h * 0.55, h * 0.5, 'sleepy', t);
  } else {
    // sniffing at a rolled blueprint on the floor
    drawSprocket(c, w * 0.4, gy, size, 'sniff', t);
    c.save();
    c.translate(w * 0.78, gy - h * 0.05);
    c.rotate(-0.15);
    c.beginPath();
    c.roundRect(-w * 0.1, -h * 0.045, w * 0.2, h * 0.09, h * 0.045);
    c.fillStyle = '#9fc8e8';
    c.fill();
    c.stroke();
    c.strokeStyle = '#fff';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(-w * 0.07, -h * 0.01);
    c.lineTo(w * 0.07, -h * 0.01);
    c.moveTo(-w * 0.06, h * 0.015);
    c.lineTo(w * 0.04, h * 0.015);
    c.stroke();
    c.restore();
    const k = (t * 0.6) % 1;
    c.fillStyle = `rgba(255, 210, 122, ${0.8 * Math.sin(k * Math.PI)})`;
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + t;
      c.beginPath();
      c.arc(w * 0.78 + Math.cos(a) * w * 0.1, gy - h * 0.12 + Math.sin(a) * h * 0.06, 2.4, 0, TAU);
      c.fill();
    }
  }
  c.restore();
}

/** Re-exported palette access so the UI can match his scene colors. */
export const SPROCKET_COLORS = { orange: ORANGE, cream: CREAM, white: WHITE, outline: OUT, lamp: COLOR.lamp };

// ---------- a self-running view for a canvas ----------

export class SprocketView {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private t0 = 0;
  private pose: SprocketPose = 'idle';
  private running = false;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private eventId: string | null = null;

  constructor(private canvas: HTMLCanvasElement, pose: SprocketPose = 'idle') {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    this.pose = pose;
    this.t0 = performance.now();
  }

  /** Match the canvas to a CSS size; device pixels are capped at 2. */
  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
  }

  setPose(p: SprocketPose): void {
    if (p === this.pose) return;
    this.pose = p;
    this.t0 = performance.now();
  }

  /** Show an event scene instead of the plain dog. */
  setEvent(id: string | null): void {
    this.eventId = id;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const loop = (): void => {
      if (!this.running) return;
      this.frame();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame(): void {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    const t = (performance.now() - this.t0) / 1000;
    if (this.eventId) drawEventScene(c, this.w, this.h, this.eventId, t);
    else drawSprocket(c, this.w / 2, this.h * 0.94, this.h * 0.8, this.pose, t);
  }
}
