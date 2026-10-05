// @ts-nocheck
// gearhound: converted from art/gearhound/gearhound.template.html by scripts/rig-convert.mjs, then fixed by hand (D-033).
// The rig code is the template's own (loose types on purpose: it is animation code, checked by looking at it);
// the typed surface is the CharacterDef export at the bottom. Mesh grid is half the template's.
import { band, finishDef, makeView, rad, rot, smooth } from './kit';
import type { CharacterDef } from './types';


const clamp = v => Math.min(1, Math.max(0, v)), ease = v => v * v * (3 - 2 * v);
const pw = (v, pts) => { if (v <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (v <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (v - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
const kf = (u, T, V) => { if (u <= T[0]) return V[0]; for (let i = 1; i < T.length; i++) if (u <= T[i]) return V[i - 1] + (V[i] - V[i - 1]) * ease((u - T[i - 1]) / (T[i] - T[i - 1])); return V[V.length - 1]; };
// 0 before a, rising to 1 at b, back to 0 at c (smooth).
const hump = (u, a, b, c) => u <= a || u >= c ? 0 : u < b ? ease((u - a) / (b - a)) : ease((c - u) / (c - b));

let AV = null; // the hub view of the frame being drawn (puff() reads its last pose)
const GROUND = 772, PIV = [1000, 700];
const JAW_PIV = [300, 255], NECK = [340, 260];
const TAIL_PIV = [1000, 240], TAIL2_PIV = [1090, 430];
// Legs: 0 near front, 1 far front, 2 hind. Hip, knee, ankle in image pixels.
const LEG = [
  { hip: [520, 465], knee: [548, 535], ankle: [455, 690] },
  { hip: [710, 455], knee: [745, 530], ankle: [690, 690] },
  { hip: [960, 295], knee: [940, 468], ankle: [1062, 625] },
];
const cx0 = y => pw(y, [[440, 545], [525, 540], [690, 452], [770, 410]]);
const cx1 = y => pw(y, [[440, 725], [520, 740], [690, 690], [770, 665]]);
const hw0 = y => pw(y, [[440, 66], [690, 74], [730, 125]]);
const hw1 = y => pw(y, [[440, 74], [690, 70], [730, 118]]);
const Lt = y => pw(y, [[200, 900], [260, 985], [330, 1042], [420, 1060], [500, 1095], [570, 1100], [620, 1095], [655, 1088]]);   // left edge of the tail
const jawEdge = x => pw(x, [[60, 300], [100, 285], [150, 262], [200, 243], [250, 212], [300, 185]]);
const EYE = [160, 125], SNOUT = [65, 165], MOUTH = [55, 205], VENT = [728, 66], VENT2 = [836, 140], CORE = [600, 255];
const FEET = [[400, 760], [680, 760], [990, 760]];

const hound = {
  size: [1216, 832], grid: [152, 104], pad: [250, 110],
  anchors: { "hound-fangs": [125, 235, 95], "hound-snout": [62, 162, 36], "hound-haunch": [938, 468, 72], core: [600, 255, 90], eyes: [160, 125, 26] },
  weights(x, y) {
    const w = {};
    w.H = smooth(400, 320, x) * smooth(385, 330, y);
    w.J = smooth(jawEdge(x) - 6, jawEdge(x) + 6, y) * smooth(335, 305, x) * w.H;
    w.tl = smooth(Lt(y) - 14, Lt(y) + 14, x) * smooth(612, 560, y) * smooth(195, 250, y);
    w.t2 = w.tl * smooth(380, 500, y);
    const l0 = band(x, cx0(y) - hw0(y), cx0(y) + hw0(y), 14) * smooth(440, 495, y) * smooth(790, 770, y);
    const l1 = band(x, cx1(y) - hw1(y), cx1(y) + hw1(y), 14) * smooth(440, 495, y) * smooth(790, 770, y);
    const l2 = smooth(840, 875, x) * smooth(240, 310, y) * (1 - w.tl);
    w.lg = [l0, l1, l2];
    w.lo = [l0 * smooth(500, 560, y), l1 * smooth(500, 560, y), l2 * smooth(430, 490, y)];
    w.ft = [l0 * smooth(670, 705, y), l1 * smooth(670, 705, y), l2 * smooth(590, 670, y)];
    w.up = smooth(745, 500, y);
    w.eng = band(x, 470, 760, 15) * smooth(165, 120, y);
    return w;
  },
  part(x, y) { return x > Lt(y) && y < 600 ? 1 : 0; },
  tear(x, y) { return y > 430 && y < 615; },
  deform(x, y, w, P) {
    [x, y] = rot(x, y, ...JAW_PIV, rad(P.jaw), w.J);
    [x, y] = rot(x, y, ...NECK, rad(P.head), w.H);
    x += P.headX * w.H; y += P.headY * w.H;
    [x, y] = rot(x, y, ...TAIL2_PIV, rad(P.tail2), w.t2);
    [x, y] = rot(x, y, ...TAIL_PIV, rad(P.tail), w.tl);
    for (let i = 0; i < 3; i++) {
      const L = LEG[i];
      [x, y] = rot(x, y, ...L.ankle, rad(P.fa[i]), w.ft[i]);
      y -= P.lift[i] * w.ft[i];
      [x, y] = rot(x, y, ...L.knee, rad(P.ka[i]), w.lo[i]);
      [x, y] = rot(x, y, ...L.hip, rad(P.ha[i]), w.lg[i]);
    }
    y += P.shud * w.eng;
    [x, y] = rot(x, y, ...PIV, rad(P.pitch), w.up);
    y = GROUND - (GROUND - y) * (1 - P.squat);
    return [x + P.dx, y + P.dy];
  },
  moods: { idle: { heat: 0.2 }, attack: { heat: 0.5 }, hurt: { heat: 0.3 }, death: { heat: 0.1 } },
  ease: 3,
  onMood(m, api) { const S = api.state; S.start = undefined; S.cycle = undefined; S.hit = undefined; S.land = undefined; S.deathFx = 0; },
  pose(L, t, dt, S, mood, api = makeView(hound, mood, S)) {
    AV = api;
    if (S.start === undefined) { S.start = t; S.puffs = []; S.sparks = []; S.bursts = []; S.dust = []; S.pulses = S.pulses || []; S.broken = S.broken || {}; S.acc = 0; S.exh = -1; S.autoPulse = -1; }
    const u = t - S.start, m = api.mood, ph = t * Math.PI * 2 / 4;
    const P = { jaw: 5, head: -9, headX: 0, headY: 0, tail: 0, tail2: 0, pitch: 0, squat: 0.032, dx: 0, dy: 0, shud: 0,
                ha: [0, 0, 0], ka: [0, 0, 0], fa: [0, 0, 0], lift: [0, 0, 0], flash: 0, shake: null, eye: 1, t };
    let heatBoost = 0;
    if (m === "idle") {
      const c = u % 4;
      // Stalking: low and heavy. The head leads the weight shift, the tail trails it, the jaw twitches and holds.
      P.squat = 0.034 + 0.004 * Math.sin(ph);
      P.dx = 5 * Math.sin(ph - 0.4);
      P.pitch = 0.9 * Math.sin(ph + 0.2);
      P.head = -9 + 2.2 * Math.sin(ph + 0.9) + 2.5 * hump(c, 1.4, 1.46, 1.8);
      P.headX = 3 * Math.sin(ph + 1.1);
      P.jaw = 5 + 1.5 * Math.sin(2 * ph + 0.3) + 9 * hump(c, 1.5, 1.55, 1.95) + 6 * hump(c, 3.3, 3.34, 3.6);
      P.tail = 3 * Math.sin(ph - 1.0); P.tail2 = 5 * Math.sin(ph - 1.7);
      P.ha = [1.4 * Math.sin(ph + 0.5), -1.4 * Math.sin(ph + 0.5), 1.0 * Math.sin(ph - 0.4)];
      P.shud = 1.1 * Math.sin(t * 37) * (0.6 + 0.4 * Math.sin(ph * 2));
      // Far front paw lifts and plants again in the same spot (a stalking step).
      const s = kf(c, [2.3, 2.62, 2.95, 3.25], [0, 1, 1, 0]);
      P.lift[1] = 17 * s; P.ha[1] += 8 * s; P.ka[1] += -6 * s; P.fa[1] = -9 * s;
      P.pitch += -0.8 * s;
      const cyc = Math.floor((u - 3.25) / 4);
      if (c >= 3.25 && c < 3.4 && S.land !== cyc) { S.land = cyc; this.dustAt(S, t, FEET[1][0] + 5, 0.5); }
      if (u >= 0.3 && S.exh !== Math.floor((u - 0.3) / 4)) { S.exh = Math.floor((u - 0.3) / 4); for (let i = 0; i < 3; i++) S.puffs.push(puff(t, MOUTH, { vx: -50 - Math.random() * 40, vy: -22 - Math.random() * 20, r: 14 + Math.random() * 6, life: 0.9 + Math.random() * 0.4, small: true })); }
      if (c >= 2.0 && S.autoPulse !== Math.floor((u - 2.0) / 4)) { S.autoPulse = Math.floor((u - 2.0) / 4); S.pulses.push(t); }
    } else if (m === "attack") {
      const c = u % 2.4, T = [0, 0.62, 0.8, 0.97, 1.2, 1.5, 1.75, 2.4];
      P.squat = kf(c, T, [0.034, 0.095, -0.02, 0.07, 0.05, 0.036, 0.034, 0.034]);
      P.dx = kf(c, T, [0, 8, -105, -135, -135, -60, 0, 0]);
      P.dy = kf(c, T, [0, 10, -40, 0, 0, -22, 0, 0]);
      P.pitch = kf(c, T, [-0.5, -5, 3, -2, 0, 2, 0, 0]);
      P.head = kf(c, T, [-9, -16, 2, -6, -8, -12, -9, -9]);
      P.headX = kf(c, T, [0, 18, -34, -12, -8, 6, 0, 0]);
      P.headY = kf(c, T, [0, 8, -8, 2, 2, 0, 0, 0]);
      P.jaw = kf(c, T, [5, -6, -8, 34, 32, 14, 5, 5]);
      P.tail = kf(c, T, [0, -3, 5, 1, -2, 3, 0, 0]); P.tail2 = kf(c, T, [0, -3, 7, -2, -3, 4, 0, 0]);
      for (const i of [0, 1]) {
        P.ha[i] = kf(c, T, [0, -8, 22, 4, 2, 10, 0, 0]); P.ka[i] = kf(c, T, [0, 6, -10, 0, 0, 5, 0, 0]);
        P.fa[i] = kf(c, T, [0, 0, -14, 6, 0, -6, 0, 0]); P.lift[i] = kf(c, T, [0, 0, 18, 0, 0, 16, 0, 0]);
      }
      P.ha[1] += 3;
      P.ha[2] = kf(c, T, [0, 10, -14, 0, 0, -6, 0, 0]); P.fa[2] = kf(c, T, [0, 0, -12, 0, 0, -6, 0, 0]); P.lift[2] = kf(c, T, [0, 0, 14, 0, 0, 10, 0, 0]);
      P.shud = 1.6 * Math.sin(t * 41);
      heatBoost = 0.3 * hump(c, 0.4, 0.97, 1.5);
      const cyc = Math.floor(u / 2.4);
      if (c >= 0.97 && c < 1.2 && S.hit !== cyc) {
        S.hit = cyc;
        S.bursts.push({ born: t, at: [110, 225], r: 70, raw: false });
        for (let i = 0; i < 7; i++) S.sparks.push(spark(t, 110, 225, 40, 0.8));
        for (const f of FEET) this.dustAt(S, t, f[0] + P.dx, 0.8);
      }
      if (c >= 0.97) { const d = Math.exp(-(c - 0.97) * 8); P.shake = [(Math.random() - 0.5) * 12 * d, (Math.random() - 0.5) * 8 * d]; }
      if (c >= 0.62 && c < 0.8 && S.pulse1 !== cyc) { S.pulse1 = cyc; S.pulses.push(t); }
    } else if (m === "hurt") {
      const c = u % 1.6, T = [0, 0.07, 0.22, 0.6, 1.1, 1.6];
      P.flash = c < 0.1 ? 0.14 * (1 - c / 0.1) : 0;
      P.dx = kf(c, T, [0, 22, 26, 12, 0, 0]);
      P.head = kf(c, T, [-9, 16, 10, -4, -9, -9]); P.headX = kf(c, T, [0, 16, 12, 4, 0, 0]); P.headY = kf(c, T, [0, -10, -6, 0, 0, 0]);
      P.jaw = kf(c, T, [5, -10, -6, 6, 5, 5]); P.squat = kf(c, T, [0.034, 0.01, 0.05, 0.045, 0.034, 0.034]); P.pitch = kf(c, T, [0, 5, 3, 1, 0, 0]);
      P.tail = kf(c, T, [0, -6, 4, -2, 0, 0]); P.tail2 = kf(c, T, [0, -8, 6, -3, 1, 0]);
      for (const i of [0, 1]) { P.ha[i] = kf(c, T, [0, -8, -4, 0, 0, 0]); P.lift[i] = kf(c, T, [0, 14, 10, 0, 0, 0]); }
      P.ha[2] = kf(c, T, [0, 8, 4, 0, 0, 0]); P.lift[2] = kf(c, T, [0, 14, 10, 0, 0, 0]);
      P.dy = kf(c, T, [0, -8, -2, 0, 0, 0]);
      const d = Math.exp(-c * 6); P.shake = [(Math.random() - 0.5) * 10 * d, (Math.random() - 0.5) * 6 * d];
      const cyc = Math.floor(u / 1.6);
      if (S.hit !== cyc) { S.hit = cyc; S.bursts.push({ born: t, at: CORE, r: 65 }); for (let i = 0; i < 9; i++) S.sparks.push(spark(t, CORE[0], CORE[1], 60, 0.8)); }
      if (c >= 0.42 && c < 0.55 && S.land !== cyc) { S.land = cyc; for (const f of FEET) this.dustAt(S, t, f[0] + 20, 0.5); }
    } else if (m === "death") {
      const c = Math.min(u, 2.999), T = [0, 0.15, 0.6, 1.3, 2.0, 2.7, 3.0];
      P.flash = c < 0.1 ? 0.14 * (1 - c / 0.1) : 0;
      P.dx = kf(c, T, [0, 16, 24, 28, 30, 30, 30]);
      P.squat = kf(c, T, [0.034, 0.02, 0.1, 0.2, 0.27, 0.3, 0.3]);
      P.pitch = kf(c, T, [0, 5, -3, -8, -7, -6, -6]);
      P.head = kf(c, T, [-9, 16, -6, -30, -40, -42, -42]); P.headX = kf(c, T, [0, 16, 10, -10, -16, -16, -16]); P.headY = kf(c, T, [0, -8, 6, 34, 50, 52, 52]);
      P.jaw = kf(c, T, [5, -10, -8, -4, -2, -2, -2]);
      P.tail = kf(c, T, [0, -8, 4, 10, 14, 15, 15]); P.tail2 = kf(c, T, [0, -10, 6, 12, 16, 18, 18]);
      for (const i of [0, 1]) { P.ha[i] = kf(c, T, [0, -6, 10, 26, 36, 38, 38]); P.ka[i] = kf(c, T, [0, 0, 6, -24, -36, -38, -38]); P.fa[i] = kf(c, T, [0, 0, 0, 8, 14, 14, 14]); P.lift[i] = kf(c, T, [0, 10, 0, 0, 0, 0, 0]); }
      P.ha[2] = kf(c, T, [0, 8, -6, -16, -22, -24, -24]); P.ka[2] = kf(c, T, [0, 0, 4, 18, 26, 28, 28]); P.lift[2] = kf(c, T, [0, 10, 0, 0, 0, 0, 0]);
      P.eye = kf(c, [0, 0.6, 1.3, 2.0, 2.6, 3.0], [1, 0.9, 0.5, 0.7, 0.2, 0]) * (c < 2.4 ? 0.8 + 0.2 * Math.sin(t * 31) : 1);
      P.shud = c < 2.0 ? 1.8 * Math.sin(t * 43) * (1 - c / 2.0) : 0;
      if (c < 0.8) { const d = Math.exp(-c * 6); P.shake = [(Math.random() - 0.5) * 12 * d, (Math.random() - 0.5) * 8 * d]; }
      if (S.deathFx < 1 && c >= 0.0) { S.deathFx = 1; S.bursts.push({ born: t, at: CORE, r: 70 }); for (let i = 0; i < 10; i++) S.sparks.push(spark(t, CORE[0], CORE[1], 60, 0.8)); }
      if (S.deathFx < 2 && c >= 0.62) { S.deathFx = 2; for (const f of FEET) this.dustAt(S, t, f[0] + 24, 0.6); }
      if (S.deathFx < 3 && c >= 1.3) { S.deathFx = 3; for (let i = 0; i < 6; i++) S.puffs.push(puff(t, VENT, { vx: (Math.random() - 0.5) * 120, vy: -90 - Math.random() * 70, r: 24 + Math.random() * 14, life: 1.2 + Math.random() * 0.5 })); for (const f of FEET) this.dustAt(S, t, f[0] + 30, 0.8); }
      if (S.deathFx < 4 && c >= 2.0) { S.deathFx = 4; for (let i = 0; i < 5; i++) S.sparks.push(spark(t, CORE[0], CORE[1] + 40, 60, 0.45)); }
      heatBoost = -0.1;
    }
    const bk0 = S.broken || {};
    S.leak = (S.leak || 0) + dt;
    if (S.leak > 0.13) { S.leak = 0;
      if (bk0["hound-haunch"]) S.puffs.push(puff(t, [972, 492], { vx: 70 + Math.random() * 50, vy: -35 - Math.random() * 40, r: 20 + Math.random() * 8, life: 0.8 + Math.random() * 0.3 }));
      if (bk0["hound-snout"] && Math.random() < 0.5) S.puffs.push(puff(t, [60, 150], { vx: -20 - Math.random() * 30, vy: -50 - Math.random() * 30, r: 10 + Math.random() * 5, life: 0.6 }));
    }
    P.heat = clamp(L.heat + heatBoost);
    // Ambient: a thin wisp from the engine pipe, thicker when hot.
    S.acc += dt * (0.7 + 2.5 * P.heat) * (m === "death" && u > 2.2 ? 0.4 : 1);
    while (S.acc > 1) { S.acc -= 1; S.puffs.push(puff(t, Math.random() < 0.7 ? VENT : VENT2, { spread: 0.6 + P.heat })); }
    P.flick = 0.88 + 0.12 * Math.sin(t * 23) * Math.sin(t * 7.3);
    return P;
  },
  dustAt(S, t, x, k) {
    for (let i = 0; i < 3; i++) S.dust.push({ born: t, x: x + (Math.random() - 0.5) * 110, y: GROUND - 8 - Math.random() * 8, vx: (Math.random() - 0.5) * 120 * k, vy: -(14 + Math.random() * 26) * k, r: 9 + Math.random() * 6, life: 0.5 + Math.random() * 0.2, lumps: [[0, 0, 1], [-0.7, 0.2, 0.62], [0.65, 0.25, 0.55], [0.1, -0.45, 0.5]] });
  },
  under(c, P, t, api) {
    // The shadow shrinks and fades with the height of the body and paws above the ground.
    const h = Math.max(0, -P.dy) + 0.5 * (P.lift[0] + P.lift[1] + P.lift[2]) / 3, k = clamp(h / 70);
    c.fillStyle = `rgba(0,0,0,${0.36 * (1 - 0.65 * k)})`; c.beginPath(); c.ellipse(690 + P.dx * 0.9, GROUND + 4, 460 * (1 - 0.3 * k), 26 * (1 - 0.3 * k), 0, 0, 2 * Math.PI); c.fill();
  },
  over(c, P, t, api) {
    const S = api.state, at = p => api.point(p[0], p[1], P), H = P.heat, f = P.flick;
    c.globalCompositeOperation = "lighter";
    glow(c, at(EYE), 26, [255, 190, 80], (0.25 + 0.7 * H) * f * P.eye);
    glow(c, at(EYE), 10, [255, 235, 190], 0.4 * f * P.eye);
    glow(c, at(VENT), 40, [255, 150, 60], (0.05 + 0.2 * H) * f);
    glow(c, at([740, 250]), 80, [255, 160, 60], (0.04 + 0.12 * H) * f);
    S.sparks = (S.sparks || []).filter(s => t - s.born < s.life);
    for (const s of S.sparks) {
      const d = t - s.born, a = d / s.life, x = s.x + s.vx * d, y = s.y + s.vy * d + 420 * d * d;
      c.strokeStyle = `rgba(255,${180 + 60 * (1 - a)},90,${1 - a})`; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - s.vx * 0.03, y - s.vy * 0.03); c.stroke();
    }
    c.globalCompositeOperation = "source-over";
    // Magnet shimmer: faint flat rings drawing in toward the snout when it acts.
    S.pulses = (S.pulses || []).filter(p => t - p < 0.9);
    for (const p0 of S.pulses) {
      const a = (t - p0) / 0.9, s = at(SNOUT);
      for (let k = 0; k < 3; k++) {
        const b = (a + k / 3) % 1, R = 90 - 70 * b, al = 0.5 * Math.sin(b * Math.PI) * (1 - a * 0.4);
        c.globalAlpha = al; c.lineCap = "round";
        for (const [col, lw] of [["#14100C", 7], ["#3FD1C2", 3.5]]) {
          c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.arc(s[0], s[1], R, Math.PI * 0.55, Math.PI * 1.45); c.stroke();
        }
      }
      c.globalAlpha = 1;
    }
    // Dust: flat ink-edged puffs (like the steam), squashed low, in rust and gray.
    S.dust = (S.dust || []).filter(p => t - p.born < p.life);
    for (const p of S.dust) {
      const d = t - p.born, a = d / p.life, r = p.r * (0.6 + 1.0 * a), x = p.x + p.vx * d, y = p.y + p.vy * d;
      c.globalAlpha = a < 0.55 ? 1 : a < 0.8 ? 0.65 : 0.35;
      const lumps = p.lumps.map(([ox, oy, k]) => [x + ox * r * 1.4, y + oy * r * 0.7, r * k]);
      for (const [col, rk, add, dx, dy] of [["#14100C", 1, 2.2, 0, 0], ["#6E6354", 1, 0, 0, 0], ["#A8957A", 0.84, 0, -0.14, -0.16]])
        for (const [lx, ly, lr] of lumps) { c.fillStyle = col; c.beginPath(); c.ellipse(lx + dx * lr, ly + dy * lr, lr * rk * 1.15 + add, lr * rk * 0.7 + add, 0, 0, 2 * Math.PI); c.fill(); }
      c.globalAlpha = 1;
    }
    S.puffs = (S.puffs || []).filter(p => t - p.born < p.life);
    for (const p of S.puffs) {
      const a = (t - p.born) / p.life, d = t - p.born, r = p.r * (0.5 + 1.1 * a);
      const x = p.x + p.vx * d, y = p.y + p.vy * d;
      c.globalAlpha = a < 0.55 ? 1 : a < 0.8 ? 0.65 : 0.35;
      const lumps = p.lumps.map(([ox, oy, k]) => [x + ox * r, y + oy * r, r * k]);
      c.fillStyle = "#14100C"; for (const [lx, ly, lr] of lumps) { c.beginPath(); c.arc(lx, ly, lr + 2, 0, 2 * Math.PI); c.fill(); }
      c.fillStyle = "#9FB4BB"; for (const [lx, ly, lr] of lumps) { c.beginPath(); c.arc(lx, ly, lr, 0, 2 * Math.PI); c.fill(); }
      c.fillStyle = "#E8EEF0"; for (const [lx, ly, lr] of lumps) { c.beginPath(); c.arc(lx - lr * 0.14, ly - lr * 0.16, lr * 0.84, 0, 2 * Math.PI); c.fill(); }
      c.globalAlpha = 1;
    }
    // Broken parts: a bold chunk missing from the silhouette (dark void with an ember gap and rim), ink cracks running out of it.
    const bk = S.broken || {};
    if (bk["hound-fangs"]) {
      void_(c, at, [[86, 174], [100, 200], [108, 184], [121, 214], [133, 190], [148, 218], [160, 176]], 1, 1);
      void_(c, at, [[116, 296], [127, 266], [140, 286], [150, 256], [164, 280], [176, 250], [192, 262], [184, 306], [150, 312]], 2, 1);
      stubs(c, at, [[96, 196], [118, 208], [142, 212]], 1); stubs(c, at, [[124, 268], [158, 272]], -1);
    }
    if (bk["hound-snout"]) {
      // The magnet snout cracked in two: a wide zigzag split from the brow to the lip.
      const z = [[78, 112], [66, 134], [76, 150], [60, 168], [70, 184], [54, 204]];
      c.lineJoin = "miter"; c.lineCap = "round";
      for (const [col, lw] of [["#14100C", 28], ["#FF8A2A", 13], ["#FFD27A", 4]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); z.forEach((p, i) => { const q = at(p); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke(); }
      void_(c, at, [[62, 140], [74, 152], [58, 170], [66, 176], [50, 162]], 3, 1, 2);
    }
    if (bk["hound-haunch"]) {
      // The piston disc split: a jagged chunk gone from it and a gash across it, steam leaking (see pose).
      void_(c, at, [[908, 430], [926, 446], [918, 466], [944, 452], [934, 478], [962, 468], [950, 500], [936, 484], [926, 508], [902, 480], [912, 458]], 4, 1);
      c.lineJoin = "miter"; c.lineCap = "round";
      for (const [col, lw] of [["#14100C", 18], ["#FFB547", 7]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); [[972, 420], [958, 446], [970, 466], [952, 490], [962, 514]].forEach((p, i) => { const q = at(p); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke(); }
    }
    S.bursts = (S.bursts || []).filter(b => t - b.born < 0.28);
    for (const b of S.bursts) {
      const a = (t - b.born) / 0.28, p = at(b.at), R = b.r * (0.6 + 0.7 * ease(a));
      c.globalAlpha = a < 0.6 ? 1 : 0.6; c.lineJoin = "miter";
      for (const [k, col, lw] of [[1, "#FFB547", 3], [0.55, "#E8EEF0", 0]]) {
        c.beginPath();
        for (let i = 0; i < 16; i++) { const an = i / 16 * 2 * Math.PI, rr = (i % 2 ? 0.45 : 1 + 0.25 * ((i * 7) % 3 - 1)) * R * k; i ? c.lineTo(p[0] + Math.cos(an) * rr, p[1] + Math.sin(an) * rr) : c.moveTo(p[0] + Math.cos(an) * rr, p[1] + Math.sin(an) * rr); }
        c.closePath(); c.fillStyle = col; c.fill(); if (lw) { c.strokeStyle = "#14100C"; c.lineWidth = lw; c.stroke(); }
      }
      c.globalAlpha = 1;
    }
  },
};
// A jagged dark void with an ember glow behind it and a bright rim; points are painting pixels, deformed with the pose.
function void_(c, at, pts, seed, k, sc = 1.5) {
  let mx = 0, my = 0; pts.forEach(p => { mx += p[0] / pts.length; my += p[1] / pts.length; });
  const q = pts.map(p => at([mx + (p[0] - mx) * sc, my + (p[1] - my) * sc])); let cx = 0, cy = 0; q.forEach(p => { cx += p[0] / q.length; cy += p[1] / q.length; });
  const path = () => { c.beginPath(); q.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
  path(); c.fillStyle = "#14100C"; c.fill();
  const R = Math.max(...q.map(p => Math.hypot(p[0] - cx, p[1] - cy)));
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, `rgba(255,190,70,${k})`); g.addColorStop(0.6, `rgba(255,110,30,${0.9 * k})`); g.addColorStop(1, "rgba(90,30,12,0.8)");
  c.save(); path(); c.clip(); c.translate(cx, cy); c.scale(0.75, 0.75); c.translate(-cx, -cy); path(); c.fillStyle = g; c.fill(); c.restore();
  path(); c.lineJoin = "miter"; c.strokeStyle = "#14100C"; c.lineWidth = 11; c.stroke(); c.strokeStyle = "#FFB547"; c.lineWidth = 4.5; c.stroke();
  let sd = seed * 977; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  c.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    let an = rnd() * 6.28, x = q[i % q.length][0], y = q[i % q.length][1]; const pp = [[x, y]];
    for (let j = 0; j < 3; j++) { an += (rnd() - 0.5) * 1.1; x += Math.cos(an) * R * 0.6; y += Math.sin(an) * R * 0.6; pp.push([x, y]); }
    for (const [col, lw] of [["#14100C", 8], ["#FFB547", 3]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); pp.forEach((p, j) => j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); }
  }
}
// Snapped tooth stubs: short cream triangles with an ink edge (dir 1 points down, -1 up).
function stubs(c, at, pts, dir) {
  for (const p of pts) {
    const a = at([p[0] - 6, p[1]]), b = at([p[0] + 6, p[1]]), tip = at([p[0], p[1] + dir * 12]);
    c.beginPath(); c.moveTo(...a); c.lineTo(...tip); c.lineTo(...b); c.closePath(); c.fillStyle = "#E8DFC8"; c.fill(); c.lineJoin = "miter"; c.strokeStyle = "#14100C"; c.lineWidth = 3; c.stroke();
  }
}
// Deterministic jagged damage drawn to the part's size: missing chunks with an ember interior, ink cracks with a bright edge.
function crack(c, [x, y], r, id, aspect) {
  const ry = r * aspect;
  let seed = 7; for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  c.save(); c.translate(x, y);
  c.beginPath(); c.ellipse(0, 0, r * 0.95, ry * 0.95, 0, 0, 2 * Math.PI); c.clip();
  const E = (px, py) => [px * r, py * ry];
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, "rgba(255,120,40,0.55)"); g.addColorStop(0.5, "rgba(120,40,16,0.4)"); g.addColorStop(1, "rgba(20,10,6,0)");
  const chunk = (cx, cy, rad, n) => {
    c.beginPath();
    for (let i = 0; i < n; i++) { const an = i / n * 2 * Math.PI, rr = rad * (0.55 + 0.6 * rnd()); const [px, py] = E(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.closePath(); c.fillStyle = "rgba(18,10,6,0.96)"; c.fill(); c.fillStyle = g; c.fill();
    c.strokeStyle = "rgba(255,170,80,0.9)"; c.lineWidth = 2; c.lineJoin = "round"; c.stroke();
  };
  chunk(-0.05, 0.0, 0.4, 9); chunk(0.5, -0.35, 0.2, 6); chunk(-0.45, 0.42, 0.2, 6);
  const rays = 8, paths = [];
  for (let i = 0; i < rays; i++) {
    let an = i / rays * 2 * Math.PI + rnd() * 0.5, px = 0, py = 0; const pts = [[0, 0]];
    for (let k = 0; k < 4; k++) { an += (rnd() - 0.5) * 0.9; const len = 0.2 + rnd() * 0.18; px += Math.cos(an) * len; py += Math.sin(an) * len; pts.push([px, py]); }
    paths.push(pts);
  }
  c.lineCap = "round"; c.lineJoin = "miter";
  for (const [col, lw, off] of [["#14100C", 4, 0], ["rgba(255,205,130,0.9)", 1.5, -1.5]]) {
    c.strokeStyle = col; c.lineWidth = lw;
    for (const pts of paths) { c.beginPath(); pts.forEach(([a, b], j) => { const [qx, qy] = E(a, b); j ? c.lineTo(qx + off, qy + off) : c.moveTo(qx + off, qy + off); }); c.stroke(); }
  }
  c.restore();
  c.save(); c.translate(x, y); c.strokeStyle = "#14100C"; c.lineWidth = 4; c.beginPath(); c.ellipse(0, 0, r * 0.95, ry * 0.95, 0, 0, 2 * Math.PI); c.stroke(); c.restore();
}
function glow(c, [x, y], r, [R, G, B], a) {
  if (a <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${R},${G},${B},${Math.min(1, a)})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill();
}
function puff(born, [x, y], o = {}) {
  const P = AV && AV.lastP;
  if (P) [x, y] = hound.deform(x, y, hound.weights(x, y), P);
  const sp = o.spread || 1;
  const vx = o.vx !== undefined ? o.vx : (Math.random() - 0.5) * 50 * sp;
  const vy = o.vy !== undefined ? o.vy : -(40 + Math.random() * 60 * sp);
  return { x: x + (Math.random() - 0.5) * 8, y, vx, vy, r: o.r || 16 + Math.random() * 12 * sp, born, life: o.life || 1.3 + Math.random() * 0.7, lumps: [[0, 0, 1], [-0.55, 0.15, 0.62 + Math.random() * 0.15], [0.5, 0.2, 0.55 + Math.random() * 0.2], [0.05, -0.5, 0.5 + Math.random() * 0.15]] };
}
function spark(t, cx, cy, spread, k) {
  const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = (260 + Math.random() * 360) * k;
  return { x: cx + (Math.random() - 0.5) * spread, y: cy + (Math.random() - 0.5) * spread, vx: Math.cos(a) * v, vy: Math.sin(a) * v, born: t, life: 0.4 + Math.random() * 0.3 };
}

const def: CharacterDef = {
  ...hound,
  id: 'gearhound',
  grid: [58, 40],
  facing: 'left',
  durations: {"idle":4,"attack":2.4,"hurt":1.6,"death":3},
  texture: { regular: 'art/gearhound/cut.webp' },
};
export default finishDef(def);
