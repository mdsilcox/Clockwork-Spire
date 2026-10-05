// @ts-nocheck
// clockmaker: converted from art/clockmaker/clockmaker.template.html by scripts/rig-convert.mjs, then fixed by hand (D-033).
// The rig code is the template's own (loose types on purpose: it is animation code, checked by looking at it);
// the typed surface is the CharacterDef export at the bottom. Mesh grid is half the template's.
import { band, finishDef, makeView, rad, rot, smooth } from './kit';
import type { CharacterDef } from './types';


const clamp = v => Math.min(1, Math.max(0, v)), ease = v => v * v * (3 - 2 * v);
const pw = (v, pts) => { if (v <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (v <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (v - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
const kf = (u, T, V) => { if (u <= T[0]) return V[0]; for (let i = 1; i < T.length; i++) if (u <= T[i]) return V[i - 1] + (V[i] - V[i - 1]) * ease((u - T[i - 1]) / (T[i] - T[i - 1])); return V[V.length - 1]; };
const INK = "#14100C", GOLD = "#C9A24A", GOLD_L = "#FFE3A0", CREAM = "#EADFBE", COLD = "#9FB4BB", COLD_L = "#E8EEF0";

// Joints (image pixels). He faces us: the viewer's left hand sweeps and pulls; the right hand carries the minute-hand chain.
const BASE = [448, 1095], NECK = [445, 236];
const SH_L = [322, 395], EL_L = [262, 505], SH_R = [575, 395], EL_R = [640, 505];
const HAND_L = [190, 625], HAND_R = [705, 622], GEAR_L = [285, 625];
const DIAL_H = [446, 142, 25], DIAL_U = [443, 306, 28], DIAL_C = [443, 530, 29];

const ANCHORS = {
  "clock-hour": [443, 306, 100], "clock-tick": [588, 683, 52], "clock-minute": [711, 757, 46], "clock-tock": [443, 598, 52],
  "clock-gov": [445, 455, 75], "clock-wheel": [446, 172, 110], "clock-bell": [443, 530, 52],
  "mem-drill": [268, 195, 48], "mem-governor": [446, 45, 44], "mem-valve": [446, 222, 44], "mem-chime": [281, 706, 52],
  core: [443, 430, 45], eyes: [446, 142, 45],
};
// Notches (cx, cy, r) in painting pixels; big on purpose so they read at 220 px.
const PARTS = {
  "clock-hour": [[520, 336, 74], [372, 282, 64]],
  "clock-tick": [[604, 660, 66], [556, 712, 50]],
  "clock-minute": [[711, 764, 54], [733, 698, 38]],
  "clock-tock": [[443, 604, 60], [392, 584, 44], [496, 590, 44]],
  "clock-gov": [[384, 470, 58], [508, 450, 62]],
  "clock-wheel": [[364, 172, 56], [532, 172, 56], [446, 84, 50]],
  "clock-bell": [[478, 506, 54], [410, 560, 48]],
  "mem-drill": [[268, 198, 58]],
  "mem-governor": [[446, 44, 54], [486, 80, 42]],
  "mem-valve": [[418, 226, 46], [480, 226, 46]],
  "mem-chime": [[281, 706, 64]],
};
const W = 896, H = 1152;
// Phase look: PHASE is the settled phase (1 Tick, 2 Tock, 3 Midnight; the view holds it as view.phase, 0-based) and PF eases toward it.
let PHASE = 1, PF = 1;
const PT_OVERRIDE = 0;
// Chest clock minute and hour hands and the big hour hand across the chest (degrees clockwise from up), at phases 1, 2, 3.
const MINB = [70, 150, 0], HRB = [215, 250, 0], BIGB = [300, 245, 100];
const pv = (arr, f) => { f = Math.min(3, Math.max(1, f)); const i = Math.min(1, Math.floor(f - 1)), k = f - 1 - i; return arr[i] + (arr[i + 1] - arr[i]) * k; };

const clockmaker = {
  size: [896, 1152], grid: [112, 144], pad: [230, 170], anchors: ANCHORS,
  weights(x, y) {
    const w = {};
    const xbL = pw(y, [[400, 352], [560, 352], [640, 332], [880, 300]]);
    const xbR = pw(y, [[400, 560], [600, 565], [670, 640], [880, 672]]);
    const yEL = x < 245 ? 868 : 792, yER = x > 690 ? 868 : 792;
    const bl = pw(y, [[400, 8], [440, 1.5]]);
    const armL = smooth(xbL, xbL - 2 * bl, x) * smooth(385, 425, y) * smooth(yEL, yEL - 20, y);
    const armR = smooth(xbR, xbR + 2 * bl, x) * smooth(385, 425, y) * smooth(yER, yER - 20, y);
    w.SL = armL; w.EL = armL * smooth(485, 540, y); w.SR = armR; w.ER = armR * smooth(485, 540, y);
    w.PL = armL * smooth(640, 668, y) * smooth(243, 217, x);
    w.PR = armR * smooth(640, 668, y) * smooth(668, 692, x);
    w.GL = armL * band(x, 238, 322, 6) * smooth(648, 668, y) * smooth(805, 775, y);
    w.H = band(x, 352, 545, 14) * smooth(252, 224, y);
    w.C = (1 - armL) * (1 - armR) * smooth(780, 1000, y) * smooth(1075, 1030, y);
    w.T = (1 - armL) * (1 - armR) * smooth(300, 380, y) * smooth(700, 560, y);
    return w;
  },
  part(x, y) { if (y < 400) return 0; return x < pw(y, [[400, 352], [560, 352], [640, 332], [880, 300]]) ? 1 : x > pw(y, [[400, 560], [600, 565], [670, 640], [880, 672]]) ? 2 : 0; },
  tear(x, y) { return y > 415 && y < 880; },
  deform(x, y, w, P) {
    [x, y] = rot(x, y, ...GEAR_L, rad(P.gearL), w.GL);
    [x, y] = rot(x, y, ...HAND_L, rad(P.pendL), w.PL);
    [x, y] = rot(x, y, ...HAND_R, rad(P.pendR), w.PR);
    [x, y] = rot(x, y, ...EL_R, rad(P.elR), w.ER);
    [x, y] = rot(x, y, ...SH_R, rad(P.shR), w.SR);
    [x, y] = rot(x, y, ...EL_L, rad(P.elL), w.EL);
    [x, y] = rot(x, y, ...SH_L, rad(P.shL), w.SL);
    [x, y] = rot(x, y, ...NECK, rad(P.head), w.H);
    x += P.headX * w.H; y -= P.headLift * w.H;
    y -= P.br * 5 * smooth(900, 300, y);
    x = 448 + (x - 448) * (1 + 0.012 * P.br * w.T);
    // Coat: sway sideways, and lift the hem outward (phase).
    x += P.sway * w.C; const side = Math.max(-1, Math.min(1, (x - 448) / 230));
    y -= P.hemLift * w.C * Math.abs(side); x += P.hemLift * 0.35 * w.C * side;
    if (P.pool) x = 448 + (x - 448) * (1 + 0.3 * P.pool * smooth(800, 1060, y) * w.C);
    // Lift (hover) and kneel: the legs shorten, the body sinks.
    y -= P.lift * smooth(1075, 800, y) * 0.7 + P.lift * 0.3 * smooth(900, 300, y);
    if (P.kneel) y = y > 760 ? y + P.kneel * (BASE[1] - y) : y + P.kneel * (BASE[1] - 760);
    [x, y] = rot(x, y, 448, 820, rad(P.lean), smooth(900, 780, y)); // about the hip: the body bows over the legs, the waist holds
    return [x + P.step * smooth(1060, 800, y), y];
  },
  moods: { idle: {}, attack: {}, hurt: {}, phase: {}, rewind: {}, death: {} },
  ease: 3,
  onMood(m, api) {
    const S = api.state; S.start = undefined; S.hit = undefined; S.shifted = false; S.spin = 0; S.cycle = undefined;
    if (m === "phase") { PHASE = (api.phase ?? 0) + 1; S.from = PHASE; S.to = PT_OVERRIDE || Math.min(3, PHASE + 1); }
  },
  under(c, P) {
    c.fillStyle = "rgba(0,0,0,0.38)"; c.beginPath(); c.ellipse(448, 1098, 250, 20, 0, 0, 2 * Math.PI); c.fill();
    if (P.warm > 0.04) {
      // Dawn arriving: a soft warm glow behind him (a radial fade, no hard edge) and three short, faint rays.
      const by = 1000 + P.kneel * 90, k = P.warm;
      const g = c.createRadialGradient(448, by - 70, 10, 448, by - 70, 430);
      g.addColorStop(0, `rgba(255,222,150,${0.34 * k})`); g.addColorStop(0.55, `rgba(255,200,120,${0.14 * k})`); g.addColorStop(1, "rgba(255,190,110,0)");
      c.fillStyle = g; c.beginPath(); c.ellipse(448, by - 70, 430, 330, 0, 0, 2 * Math.PI); c.fill();
      for (let i = 0; i < 3; i++) {
        const an = Math.PI + 0.55 + i * 0.52, x0 = 448 + Math.cos(an) * 190, y0 = by - 40 + Math.sin(an) * 70, R = 90, wd = 0.05;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + Math.cos(an - wd) * R, y0 + Math.sin(an - wd) * R); c.lineTo(x0 + Math.cos(an + wd) * R, y0 + Math.sin(an + wd) * R); c.closePath();
        c.globalAlpha = 0.18 * k; c.fillStyle = GOLD_L; c.fill();
      }
      c.globalAlpha = 1;
    }
  },
  over: null,
};

// ---- Broken looks: a jagged notch with an ember rim and ink cracks, baked into the texture (same recipe as the Foreman). ----
function jag(cx, cy, r, seed) {
  let s = seed; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const n = 10, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI, rr = r * (i % 3 === 0 ? 0.5 + 0.2 * rnd() : 0.85 + 0.45 * rnd()); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  return pts;
}
// Bakes the broken look into a copy of the painting (the hub drew it scaled to W x H on `c`).
function bakeBroken(c, img, layerName, broken) {
  let k = 0;
  for (const id in broken) {
    const d = PARTS[id]; if (!broken[id] || !d) continue;
    for (const [cx, cy, r0] of d) { const r = r0 * 0.8;
      const seed = 11 + (k++) * 977, pts = jag(cx, cy, r, seed);
      let s = seed + 5; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
      c.globalCompositeOperation = "source-atop"; c.lineCap = "round"; c.lineJoin = "miter";
      c.strokeStyle = INK; c.lineWidth = 5;
      for (let i = 0; i < 4; i++) {
        let an = (i / 4 + 0.08) * 2 * Math.PI + rnd() * 0.6, x = cx + Math.cos(an) * r * 0.8, y = cy + Math.sin(an) * r * 0.8;
        c.beginPath(); c.moveTo(x, y);
        for (let j = 0; j < 4; j++) { an += (rnd() - 0.5) * 1.0; x += Math.cos(an) * r * 0.4; y += Math.sin(an) * r * 0.4; c.lineTo(x, y); }
        c.stroke();
      }
      c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
      c.strokeStyle = INK; c.lineWidth = 16; c.stroke();
      c.strokeStyle = "#FFB547"; c.lineWidth = 6; c.stroke();
      c.globalCompositeOperation = "destination-out"; c.fillStyle = "#000"; c.fill();
      c.globalCompositeOperation = "source-over";
      const tc = document.createElement("canvas"); tc.width = W; tc.height = H; const t2 = tc.getContext("2d");
      t2.beginPath(); pts.forEach(([x, y], i) => i ? t2.lineTo(x, y) : t2.moveTo(x, y)); t2.closePath(); t2.fillStyle = "#C2461A"; t2.fill();
      t2.beginPath(); pts.forEach(([x, y], i) => { const q = [cx + (x - cx) * 0.6, cy + (y - cy) * 0.6]; i ? t2.lineTo(...q) : t2.moveTo(...q); }); t2.closePath();
      t2.fillStyle = "#FFB547"; t2.strokeStyle = INK; t2.lineWidth = 3; t2.stroke(); t2.fill();
      t2.globalCompositeOperation = "destination-in"; t2.drawImage(img, 0, 0, W, H);
      c.drawImage(tc, 0, 0);
    }
  }
}

function restP() {
  return { shL: 0, elL: 0, shR: 0, elR: 0, pendL: 0, pendR: 0, gearL: 0, head: 0, headX: 0, headLift: 0, br: 0, sway: 0, hemLift: 0, pool: 0, lift: 0, kneel: 0, lean: 0, step: 0,
    flash: 0, shake: null, cold: 0, warm: 0, minA: 0, hrA: 0, headMin: 0, bigA: 300, droop: 0, ev: [], t: 0, u: 0, mood: "idle", fid: -1, dt: 0.033, sweep: false, rw: 0, bell: 0 };
}
let lastT = 0, frameId = 0, lastFx = -1;
// The light of the phase (colder with each, warm in death) as the hub's color matrix: a 3x3, column-major, then an added color.
function setTint(P) {
  const k = P.cold, w = P.warm;
  const w0 = 0.22 * clamp(1 - 2 * k), kk = k * 1.15;
  const r = 1 - 0.3 * kk + 0.1 * w + 0.08 * w0, g = 1 - 0.1 * kk + 0.02 * w, b = 1 + 0.22 * kk - 0.16 * w - 0.1 * w0;
  const sat = 1 - 0.25 * k, o = (1 - sat) * 0.3;
  P.tint = [r * sat, o, o / 3, o, g * sat, o, o / 3, o / 3, b, 0.02 * w, 0.01 * w, 0];
}
// Head dial: eight ticks in four seconds (a full turn, so the idle loop is seamless).
const tickA = tt => { const n = Math.floor(tt * 2), f = clamp((tt * 2 - n) / 0.22); return 45 * (n + ease(f) * 1.12 - 0.12 * f); };

clockmaker.pose = function (L, t, dt, S, mood, api = makeView(clockmaker, mood, S)) {
  lastT = t; frameId++;
  if (S.start === undefined) { S.start = t; }
  if (!S.broken) S.broken = {};
  PHASE = (api.phase ?? 0) + 1; PF = api.layers.pf ?? PHASE;
  const u = t - S.start, m = api.mood, P = restP();
  P.t = t; P.u = u; P.mood = m; P.fid = frameId; P.dt = dt;
  const ph = t * Math.PI * 2 / 4;
  let amp = 1, pendA = 7, spinRate = 0;
  // Idle base: a slow breath, arms lag the chest, the pendulums swing against each other like a clock's (period 2 s).
  P.br = 0.5 + 0.5 * Math.sin(ph - 0.5);
  P.shL = 1.2 * Math.sin(ph - 1.0); P.shR = -1.2 * Math.sin(ph - 1.0); P.elL = 1.5 * Math.sin(ph - 1.4); P.elR = -1.5 * Math.sin(ph - 1.4);
  P.head = 0.7 * Math.sin(ph - 0.8);
  P.sway = 2 * Math.sin(ph - 0.3); P.gearL = 3.5 * Math.sin(2 * ph + 1);
  const swing = Math.sin(2 * ph);
  P.lean = 0.3 * Math.sin(ph * 0.5);
  const headTick = tickA(u);
  S.spin = S.spin || 0;

  if (m === "attack") {
    const c = u % 2.8, T = [0, 0.3, 0.9, 1.18, 1.45, 2.2, 2.8];
    P.shL = kf(c, T, [0, 3, 34, -16, -14, -3, 0]); P.elL = kf(c, T, [0, 2, 24, -12, -10, -2, 0]);
    P.shR = kf(c, T, [0, -3, -14, 8, 8, 1, 0]); P.elR = kf(c, T, [0, -2, -8, 5, 5, 1, 0]);
    P.lean = kf(c, T, [0, 3, 6, -7, -7, -1, 0]); P.head = kf(c, T, [0, 2, 6, -5, -5, -1, 0]); P.headLift = kf(c, T, [0, 0, 4, -3, -3, 0, 0]);
    P.br = kf(c, T, [0.5, 0.4, 1.2, -0.2, -0.2, 0.3, 0.5]); P.lift = kf(c, T, [0, 2, 8, -4, -4, -1, 0]);
    pendA = 7 + 8 * Math.exp(-Math.max(0, c - 1.1) * 2.4);
    P.sweep = c > 0.9 && c < 1.4;
    P.hemLift = kf(c, T, [0, 0, 6, 14, 6, 0, 0]);
    if (c >= 1.18 && S.cycle !== Math.floor(u / 2.8)) { S.cycle = Math.floor(u / 2.8); P.ev.push("swept"); }
  } else if (m === "hurt") {
    const c = Math.min(u, 1.79), T = [0, 0.08, 0.25, 0.7, 1.8];
    P.flash = 0.25 * clamp(1 - (u - 0.02) / 0.1);
    P.lean = kf(c, T, [0, 12, 8, 0, 0]); P.head = kf(c, T, [0, 22, 12, 0, 0]); P.headLift = kf(c, T, [0, -6, -3, 0, 0]); P.headX = kf(c, T, [0, -14, -8, 0, 0]); P.step = kf(c, T, [0, 16, 10, 0, 0]);
    P.shL = kf(c, T, [0, 14, 7, 0, 0]) + 3 * Math.exp(-c * 5) * Math.sin(c * 26); P.elL = kf(c, T, [0, 9, 4, 0, 0]);
    P.shR = kf(c, T, [0, -14, -7, 0, 0]) - 3 * Math.exp(-c * 5) * Math.sin(c * 26); P.elR = kf(c, T, [0, -9, -4, 0, 0]);
    P.lift = kf(c, T, [0, -6, -3, 0, 0]); P.step = kf(c, T, [0, 20, 16, 0, 0]); P.br = kf(c, T, [0.5, -0.4, 0.2, 0.5, 0.5]);
    pendA = 7 + 24 * Math.exp(-c * 1.8);
    const d = Math.exp(-c * 6); P.shake = [(Math.random() - 0.5) * 9 * d, (Math.random() - 0.5) * 5 * d];
    if (S.hit === undefined) { S.hit = 1; P.ev.push("hit"); }
  } else if (m === "phase") {
    const c = Math.min(u, 3.999), T = [0, 0.5, 1.0, 1.4, 2.4, 3.2, 4];
    spinRate = kf(c, T, [0, 0, 700, 1500, 1500, 300, 0]);
    P.shL = kf(c, T, [0, 6, 16, 26, 22, 8, 0]); P.shR = kf(c, T, [0, -6, -16, -26, -22, -8, 0]);
    P.elL = kf(c, T, [0, 3, 8, 12, 10, 4, 0]); P.elR = kf(c, T, [0, -3, -8, -12, -10, -4, 0]);
    P.head = kf(c, T, [0, -3, -6, -8, -5, -1, 0]); P.headLift = kf(c, T, [0, 0, 3, 6, 6, 2, 0]);
    P.hemLift = kf(c, T, [0, 0, 10, 46, 52, 22, 0]); P.lift = kf(c, T, [0, 0, -4, -14, -14, -5, 0]);
    P.br = kf(c, T, [0.5, 0.2, 0, 1.2, 1.2, 0.6, 0.5]); P.lean = kf(c, T, [0, 0, -2, -3, -2, 0, 0]);
    pendA = 7 + 14 * kf(c, T, [0, 0, 0.3, 1, 1, 0.4, 0]);
    if (c < 1.4) { const e = ease(c / 1.4); P.shake = [(Math.random() - 0.5) * 4 * e, (Math.random() - 0.5) * 2.5 * e]; }
    else { const d = Math.exp(-(c - 1.4) * 3); P.shake = [(Math.random() - 0.5) * 10 * d, (Math.random() - 0.5) * 6 * d]; }
    if (c >= 1.3 && !S.shifted) { S.shifted = true; PHASE = S.to; api.phase = PHASE - 1; P.ev.push("shift"); }
  } else if (m === "rewind") {
    const c = Math.min(u, 2.499), T = [0, 0.25, 0.6, 1.0, 1.4, 1.8, 2.1, 2.5];
    P.shL = kf(c, T, [0, 25, 60, 46, 62, 46, 12, 0]); P.elL = kf(c, T, [0, 12, 36, 24, 38, 24, 6, 0]);
    P.shR = kf(c, T, [0, -4, -8, -6, -8, -6, -2, 0]); P.elR = kf(c, T, [0, -2, -5, -3, -5, -3, -1, 0]);
    P.lean = kf(c, T, [0, 0, 3, 5, 3, 5, 1, 0]); P.head = kf(c, T, [0, 2, 7, 8, 7, 8, 2, 0]); P.headLift = kf(c, T, [0, 0, 2, 3, 2, 3, 0, 0]);
    P.br = kf(c, T, [0.5, 0.3, 0.1, 1, 0.1, 1, 0.5, 0.5]); P.hemLift = kf(c, T, [0, 0, 4, 10, 5, 10, 2, 0]);
    pendA = 7 + 6 * Math.sin(c * 5);
    spinRate = kf(c, T, [0, 0, 300, -400, 300, -400, 0, 0]);
    P.rw = clamp((c - 0.3) / 0.35) * (1 - clamp((c - 1.95) / 0.35));
    if (c >= 1.95 && !S.shifted) { S.shifted = true; P.ev.push("rewound"); }
  } else if (m === "death") {
    const c = Math.min(u, 3.999), still = ease(clamp((c - 0.4) / 1.4));
    P.flash = 0.25 * clamp(1 - (u - 0.02) / 0.1);
    amp = 1 - ease(clamp((c - 0.15) / 1.1));
    P.br *= amp; P.elL *= amp; P.elR *= amp; P.sway *= amp; P.gearL *= amp; pendA *= amp; P.head *= amp;
    P.shL = P.shL * amp - 12 * still; P.shR = P.shR * amp + 12 * still;
    const bow = ease(clamp((c - 1.0) / 1.8));
    P.head += 26 * bow; P.headLift = -6 * bow; P.lean = 7 * bow; P.pool = ease(clamp((c - 1.8) / 1.6));
    P.kneel = 0.52 * ease(clamp((c - 1.4) / 1.9));
    P.warm = ease(clamp((c - 0.3) / 2.6));
    P.droop = ease(clamp((c - 0.45) / 0.45));
    if (c < 0.5) { const d = Math.exp(-c * 6); P.shake = [(Math.random() - 0.5) * 8 * d, (Math.random() - 0.5) * 5 * d]; }
    if (S.hit === undefined) { S.hit = 1; P.ev.push("hit"); }
  }
  P.pendL = pendA * swing; P.pendR = -pendA * swing;
  S.spin += spinRate * dt;
  // Phase look eases toward the settled phase.
  PF += Math.sign(PHASE - PF) * Math.min(Math.abs(PHASE - PF), dt / 1.1);
  P.minA = pv(MINB, PF) + S.spin * 0.6; P.hrA = pv(HRB, PF) + S.spin * 0.05; P.bigA = pv(BIGB, PF) + S.spin * 0.02;
  P.headMin = (m === "phase" || m === "rewind") ? headTick + S.spin : headTick;
  if (m === "death") {
    // The hands drop to six o'clock and stay (a small bounce as the head hand lands).
    const h0 = headTick % 360, cc = Math.min(u, 3.999), tgt = h0 + ((180 - h0 + 360) % 360);
    P.headMin = u < 0.45 ? headTick : h0 + (tgt - h0) * P.droop + (cc > 0.9 ? 7 * Math.exp(-(cc - 0.9) * 7) * Math.sin((cc - 0.9) * 24) : 0);
    P.minA = P.minA * (1 - P.droop) + 180 * P.droop; P.hrA = P.hrA * (1 - P.droop) + 180 * P.droop;
  }
  P.cold = clamp((PF - 1) / 2) * (1 - P.warm);
  P.bell = clamp((PF - 2.5) * 2) * (1 - P.warm);
  api.layers.pf = PF;
  setTint(P);
  return P;
};

// ---- effects: flat, ink-edged, two-tone, stepped alpha. All state is module-level; the top layer draws it. ----
const FX = { trail: [], rings: [], stars: [] };
const stepA = a => a < 0.4 ? 1 : a < 0.7 ? 0.65 : 0.35;
function ringShape(c, [x, y], R, lw, a, cols) {
  c.globalAlpha = a;
  for (const [col, w] of [[INK, lw + 9], [cols[0], lw], [cols[1], Math.max(2, lw * 0.4)]]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.arc(x, y, R, 0, 2 * Math.PI); c.stroke(); }
  c.globalAlpha = 1;
}
function star(c, [x, y], R, a) {
  c.globalAlpha = a < 0.6 ? 1 : 0.6; c.lineJoin = "miter";
  for (const [k, col, lw] of [[1, "#FFB547", 4], [0.5, "#E8EEF0", 0]]) {
    c.beginPath();
    for (let i = 0; i < 16; i++) { const an = i / 16 * 2 * Math.PI, rr = (i % 2 ? 0.45 : 1 + 0.25 * ((i * 7) % 3 - 1)) * R * k; i ? c.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr) : c.moveTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
    c.closePath(); c.fillStyle = col; c.fill(); if (lw) { c.strokeStyle = INK; c.lineWidth = lw; c.stroke(); }
  }
  c.globalAlpha = 1;
}
// A brass clock hand: tapered, a spade near the tip, a short counterweight tail; ink edge, two tones. ang in degrees clockwise from up.
function bigHand(c, cx, cy, ang, len, wid, cols = [GOLD, GOLD_L]) {
  c.save(); c.translate(cx, cy); c.rotate(rad(ang)); c.lineJoin = "miter";
  c.beginPath();
  [[-wid * 0.5, 0], [-wid * 0.3, -len * 0.62], [-wid * 0.85, -len * 0.74], [0, -len], [wid * 0.85, -len * 0.74], [wid * 0.3, -len * 0.62], [wid * 0.5, 0], [wid * 0.7, len * 0.14], [-wid * 0.7, len * 0.14]]
    .forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.closePath(); c.fillStyle = cols[0]; c.strokeStyle = INK; c.lineWidth = 4; c.fill(); c.stroke();
  c.beginPath(); c.moveTo(0, -len * 0.08); c.lineTo(0, -len * 0.66); c.strokeStyle = cols[1]; c.lineWidth = Math.max(2, wid * 0.16); c.stroke();
  c.restore();
}
function handLine(c, cx, cy, ang, len, wid, col) {
  const a = rad(ang), x = cx + Math.sin(a) * len, y = cy - Math.cos(a) * len;
  c.lineCap = "round";
  c.strokeStyle = INK; c.lineWidth = wid + 4; c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke();
  c.strokeStyle = col; c.lineWidth = wid; c.stroke();
}
function dial(c, [x, y], r, minA, hrA) {
  c.fillStyle = INK; c.beginPath(); c.arc(x, y, r + 5, 0, 2 * Math.PI); c.fill();
  c.fillStyle = GOLD; c.beginPath(); c.arc(x, y, r + 1.5, 0, 2 * Math.PI); c.fill();
  c.fillStyle = CREAM; c.beginPath(); c.arc(x, y, r - 3.5, 0, 2 * Math.PI); c.fill();
  c.strokeStyle = INK; c.lineCap = "butt";
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, l = i % 3 === 0 ? 0.28 : 0.14; c.lineWidth = i % 3 === 0 ? 3 : 2; c.beginPath(); c.moveTo(x + Math.sin(a) * r * 0.9, y - Math.cos(a) * r * 0.9); c.lineTo(x + Math.sin(a) * r * (0.9 - l), y - Math.cos(a) * r * (0.9 - l)); c.stroke(); }
  handLine(c, x, y, hrA, r * 0.5, 4.5, "#3A2A14"); handLine(c, x, y, minA, r * 0.82, 3, "#3A2A14");
  c.fillStyle = INK; c.beginPath(); c.arc(x, y, 4.5, 0, 2 * Math.PI); c.fill();
  c.fillStyle = GOLD; c.beginPath(); c.arc(x, y, 2, 0, 2 * Math.PI); c.fill();
}
function cog(c, x, y, r, rt) {
  c.save(); c.translate(x, y); c.rotate(rt); c.lineJoin = "miter"; c.beginPath();
  for (let i = 0; i < 16; i++) { const an = i / 16 * 2 * Math.PI, rr = (i % 2 ? 0.7 : 1) * r; i ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); }
  c.closePath(); c.fillStyle = GOLD; c.strokeStyle = INK; c.lineWidth = 3.5; c.fill(); c.stroke();
  c.beginPath(); c.arc(0, 0, r * 0.3, 0, 2 * Math.PI); c.fillStyle = INK; c.fill(); c.restore();
}
function handleEvents(P, api) {
  if (P.fid === lastFx) return; lastFx = P.fid;
  const at = p => api.point(p[0], p[1], P), t = P.t;
  for (const e of P.ev) {
    if (e === "hit") FX.stars.push({ born: t, at: at([443, 455]), r: 85 });
    else if (e === "swept") FX.rings.push({ born: t, at: at(HAND_L), r0: 30, r1: 150, col: [GOLD, GOLD_L], life: 0.4 });
    else if (e === "shift") { for (const k of [0, 0.12]) FX.rings.push({ born: t + k, at: at([443, 430]), r0: 40, r1: 400, col: PHASE === 3 ? [COLD, COLD_L] : [GOLD, GOLD_L], life: 0.6 }); FX.stars.push({ born: t, at: at(DIAL_H), r: 60 }); }
    else if (e === "rewound") FX.rings.push({ born: t, at: at(HAND_L), r0: 20, r1: 110, col: [GOLD, GOLD_L], life: 0.45 });
  }
}
function drawOver(c, P, t, api) {
  // a new fight restarts the rig clock: drop effects left from the last one (they would have negative ages)
  if (P.t < (FX.lastT ?? 0)) for (const k in FX) if (Array.isArray(FX[k])) FX[k] = [];
  FX.lastT = P.t;
  handleEvents(P, api);
  const at = p => api.point(p[0], p[1], P), tt = P.t, B = api.state.broken || {};
  // Dials (code-drawn over the painted ones): head dial, upper wheel, chest clock. A broken clock-bell shows its painted dial, cracked.
  const hd = at(DIAL_H); dial(c, hd, DIAL_H[2], P.headMin, P.mood === "death" ? 180 : 150);
  const du = at(DIAL_U); dial(c, du, DIAL_U[2], P.minA * 0.5 + 40, P.hrA * 0.5 + 40);
  const dc = at(DIAL_C);
  if (!B["clock-bell"]) dial(c, dc, DIAL_C[2], P.minA, P.hrA);
  else { c.strokeStyle = INK; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(dc[0] - 24, dc[1] - 20); c.lineTo(dc[0] - 4, dc[1] - 2); c.lineTo(dc[0] - 12, dc[1] + 10); c.lineTo(dc[0] + 16, dc[1] + 26); c.stroke(); }
  // The hour hand across the chest, pivoting on the upper wheel. Broken: snapped to a stub.
  bigHand(c, du[0], du[1], P.bigA, B["clock-hour"] ? 40 : 118, 15);
  c.fillStyle = INK; c.beginPath(); c.arc(du[0], du[1], 8, 0, 2 * Math.PI); c.fill(); c.fillStyle = GOLD; c.beginPath(); c.arc(du[0], du[1], 4, 0, 2 * Math.PI); c.fill();
  // Midnight: a faint bell-ring around the chest clock, stepped (arcs on both sides, widening each cycle).
  if (P.bell > 0.05) {
    const k = Math.floor(((tt * 0.9) % 1) * 4) / 4;
    c.globalAlpha = P.bell * (0.85 - 0.45 * k); c.lineCap = "round";
    for (const s of [-1, 1]) for (let j = 0; j < 2; j++) {
      const R = 54 + 22 * j + 40 * k, a0 = s < 0 ? Math.PI - 0.55 : -0.55, a1 = s < 0 ? Math.PI + 0.55 : 0.55;
      for (const [col, w] of [[INK, 12], [COLD, 6], [COLD_L, 2]]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.arc(dc[0], dc[1], R, a0, a1); c.stroke(); }
    }
    c.globalAlpha = 1;
  }
  // Attack: the sweeping hand leaves a flat arc of clock hands, with stepped alpha.
  if (P.sweep) FX.trail.push({ t: tt, p: at(HAND_L), s: at(SH_L) });
  FX.trail = FX.trail.filter(q => tt - q.t < 0.26);
  const tr = FX.trail;
  if (tr.length > 1) {
    c.lineCap = "round"; c.lineJoin = "round";
    for (let i = 1; i < tr.length; i++) {
      const q = tr[i], age = tt - q.t, a = age < 0.09 ? 1 : age < 0.17 ? 0.7 : 0.4, wd = 5 + 22 * (1 - age / 0.26);
      c.globalAlpha = a;
      for (const [col, w] of [[INK, wd + 9], [GOLD, wd], [GOLD_L, wd * 0.38]]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(tr[i - 1].p[0], tr[i - 1].p[1]); c.lineTo(q.p[0], q.p[1]); c.stroke(); }
    }
    c.globalAlpha = 1;
    // Three clock hands fanned from the shoulder through the sweep.
    for (const want of [0.02, 0.09, 0.16]) {
      let best = null; for (const q of tr) if (!best || Math.abs((tt - q.t) - want) < Math.abs((tt - best.t) - want)) best = q;
      if (!best) continue; const age = tt - best.t; if (Math.abs(age - want) > 0.05) continue;
      const dx = best.p[0] - best.s[0], dy = best.p[1] - best.s[1], d = Math.hypot(dx, dy), ang = Math.atan2(dx, -dy) * 180 / Math.PI;
      c.globalAlpha = age < 0.09 ? 1 : age < 0.17 ? 0.7 : 0.4;
      bigHand(c, best.s[0] + dx * 0.3, best.s[1] + dy * 0.3, ang, d * 0.95, 16);
      c.globalAlpha = 1;
    }
  }
  // Rewind: flat strands drawn from the left of the frame toward his palm, with small cogs (the parts he takes back) riding them.
  if (P.rw > 0.02) {
    const palm = at([HAND_L[0] - 12, HAND_L[1] - 10]);
    c.lineCap = "round"; c.lineJoin = "round";
    const q = Math.round(tt * 15) / 15;
    for (let i = 0; i < 6; i++) {
      const sy = 120 + i * 150, sx = -215;
      const c1 = [sx + 180, sy + (i - 2.5) * 30], c2 = [palm[0] - 190, palm[1] + (i - 2.5) * 46];
      const pt = (s) => { const m = 1 - s; const x = m * m * m * sx + 3 * m * m * s * c1[0] + 3 * m * s * s * c2[0] + s * s * s * palm[0], y = m * m * m * sy + 3 * m * m * s * c1[1] + 3 * m * s * s * c2[1] + s * s * s * palm[1]; return [x, y + 16 * Math.sin(s * 12 - q * 16 + i) * (s * (1 - s) * 4)]; };
      const N = 28, pts = []; for (let k = 0; k <= N; k++) pts.push(pt(k / N));
      const nVis = Math.max(2, Math.floor(N * clamp(P.rw * 1.4 - i * 0.04)));
      c.globalAlpha = P.rw < 0.4 ? 0.65 : 1;
      for (const [col, w] of [[INK, 17], [i % 2 ? COLD : GOLD, 9], [i % 2 ? COLD_L : GOLD_L, 3]]) {
        c.strokeStyle = col; c.lineWidth = w; c.beginPath(); pts.slice(0, nVis).forEach(([x, y], k) => k ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
      }
      c.globalAlpha = 1;
      for (let j = 0; j < 2; j++) { const s = Math.pow((q * 0.75 + i * 0.21 + j * 0.5) % 1, 1.3); if (s * N > nVis - 1) continue; const [x, y] = pt(s); cog(c, x, y, 17 * (1 - 0.35 * s), q * 6 + i); }
    }
    ringShape(c, palm, 26 + 9 * Math.floor(((q * 3) % 1) * 3), 7, 0.9 * P.rw, [GOLD, GOLD_L]);
  }
  // Rings and stars.
  FX.rings = FX.rings.filter(r => tt - r.born < r.life);
  for (const r of FX.rings) { if (tt < r.born) continue; const a = (tt - r.born) / r.life, rs = r.r0 + (r.r1 - r.r0) * (Math.floor(a * 6) / 6 + 1 / 6); ringShape(c, r.at, rs, 11 * (1 - 0.4 * a), stepA(a), r.col); }
  FX.stars = FX.stars.filter(s => tt - s.born < 0.28);
  for (const s of FX.stars) { const a = (tt - s.born) / 0.28; star(c, s.at, s.r * (0.6 + 0.7 * ease(a)), a); }
}
clockmaker.over = (c, P, t, api) => drawOver(c, P, t, api);

const def: CharacterDef = {
  ...clockmaker,
  id: 'clockmaker',
  bakeBroken,
  grid: [57, 73],
  facing: 'front',
  durations: { idle: 4, attack: 2.8, hurt: 1.8, phase: 4, rewind: 2.5, death: 4 },
  texture: { regular: 'art/clockmaker/cut.webp' },
};
export default finishDef(def);
