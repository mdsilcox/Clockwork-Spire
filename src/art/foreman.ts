// @ts-nocheck
// foreman: converted from art/foreman/foreman.template.html by scripts/rig-convert.mjs, then fixed by hand (D-033).
// The rig code is the template's own (loose types on purpose: it is animation code, checked by looking at it);
// the typed surface is the CharacterDef export at the bottom. Mesh grid is half the template's.
import { band, finishDef, makeView, rad, rot, smooth } from './kit';
import type { CharacterDef } from './types';


const clamp = v => Math.min(1, Math.max(0, v)), ease = v => v * v * (3 - 2 * v);
const pw = (v, pts) => { if (v <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (v <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (v - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
const kf = (u, T, V) => { if (u <= T[0]) return V[0]; for (let i = 1; i < T.length; i++) if (u <= T[i]) return V[i - 1] + (V[i] - V[i - 1]) * ease((u - T[i - 1]) / (T[i] - T[i - 1])); return V[V.length - 1]; };

// Joints (image pixels). The wrench arm is on the viewer's right, the rivet-gun arm on the viewer's left.
const BASE = [448, 1095], NECK = [450, 268];
const SH_R = [692, 448], EL_R = [716, 662], SH_L = [200, 448], EL_L = [172, 664];
const EYES = [[413, 201], [473, 203]], EARS = [[352, 178], [528, 178]], LAMP = [372, 80];
const GRATE = [448, 432], VENTS = [[188, 288], [298, 248], [589, 258], [684, 286]];
const WTIP = [688, 985], RIVET_TIP = [210, 958], APRON_MID = [447, 700];

const foreman = {
  size: [896, 1152], grid: [112, 144], pad: [300, 230],
  anchors: {
    "foreman-wrench": [715, 770, 100], "foreman-grate": [448, 432, 97], "foreman-apron": [448, 690, 110],
    "foreman-bulwark": [448, 655, 100], "foreman-rivet": [175, 690, 100], core: [448, 560, 60], eyes: [443, 201, 45],
  },
  weights(x, y) {
    const w = {};
    const xbR = pw(y, [[540, 646], [580, 622], [740, 620], [780, 620]]);
    const xbL = pw(y, [[540, 254], [580, 262], [740, 262], [780, 274]]);
    const bw = pw(y, [[540, 12], [575, 2.5]]);
    const armR = smooth(xbR - bw, xbR + bw, x) * smooth(445, 490, y) * smooth(pw(x, [[640, 1000], [662, 1070]]) + 6, pw(x, [[640, 1000], [662, 1070]]) - 6, y);
    const armL = smooth(xbL + bw, xbL - bw, x) * smooth(445, 490, y) * smooth(pw(x, [[225, 950], [245, 850]]) + 10, pw(x, [[225, 950], [245, 850]]) - 10, y);
    w.SR = armR; w.ER = armR * smooth(646, 676, y);
    w.SL = armL; w.EL = armL * smooth(640, 684, y);
    w.H = smooth(290, 262, y) * band(x, 322, 562, 14);
    w.T = (1 - armR) * (1 - armL) * smooth(270, 330, y) * smooth(620, 560, y);
    return w;
  },
  part(x, y) { if (y < 480) return 0; return x < pw(y, [[540, 258], [580, 262], [740, 262], [780, 274]]) ? 1 : x > (y < 570 ? 634 : 621) ? 2 : 0; },
  tear(x, y) { return y > 575 && y < (x > 448 ? 1000 : 905); },
  deform(x, y, w, P) {
    x = SH_R[0] + (x - SH_R[0]) * (1 + P.reach * w.SR); y = SH_R[1] + (y - SH_R[1]) * (1 + P.reach * w.SR);
    [x, y] = rot(x, y, ...EL_R, rad(P.elR), w.ER);
    [x, y] = rot(x, y, ...SH_R, rad(P.shR), w.SR);
    [x, y] = rot(x, y, ...EL_L, rad(P.elL), w.EL);
    [x, y] = rot(x, y, ...SH_L, rad(P.shL), w.SL);
    [x, y] = rot(x, y, ...NECK, rad(P.head), w.H);
    x += P.headX * w.H; y -= P.headLift * w.H;
    y -= P.br * 7 * smooth(900, 500, y);
    x = 448 + (x - 448) * (1 + 0.012 * P.br * w.T);
    y -= P.lift * smooth(1000, 820, y) * (1 + P.asym * (smooth(700, 200, x) - 0.5));
    [x, y] = rot(x, y, ...BASE, rad(P.lean), smooth(1060, 760, y));
    return [x + P.step * smooth(1060, 800, y), y];
  },
  moods: { idle: { heat: 0.25 }, attack: { heat: 0.6 }, hurt: { heat: 0.35 }, phase: { heat: 0.45 }, death: { heat: 0 } },
  ease: 3,
  onMood(m, api) { const S = api.state; S.start = undefined; S.cycle = undefined; S.hit = undefined; S.rivCycle = undefined; S.tore = false; S.roared = false; S.kneel = false; },
  under(c, P, t, api) {
    c.fillStyle = "rgba(0,0,0,0.38)"; c.beginPath(); c.ellipse(448 + P.step * 0.2, 1098, 250, 20, 0, 0, 2 * Math.PI); c.fill();
  },
  over: null,
};

// Broken parts: each is an edge notch (erased from the painting's alpha), an ember rim, and dark ink cracks painted into the texture.
const PARTS = {
  "foreman-wrench": { layers: [1, 2], notches: [[800, 690, 70], [638, 805, 50]] },
  "foreman-rivet": { layers: [1, 2], notches: [[95, 590, 66], [104, 735, 52]] },
  "foreman-grate": { layers: [1, 2], notches: [[522, 372, 58], [382, 492, 48]] },
  "foreman-apron": { layers: [1], notches: [[298, 668, 62], [562, 778, 58]] },
  "foreman-bulwark": { layers: [2], notches: [[292, 655, 52], [598, 662, 52]] },
};
const W = 896, H = 1152;
let PH2 = false; // set at the tear; the hub-held layer mix (view.layers.phase2) follows it
let MIXV = 0;
const RIV = { t0: -9 };
let lastT = 0, frameId = 0, lastFx = -1;

function jag(cx, cy, r, seed) {
  let s = seed; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const n = 10, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI, rr = r * (i % 3 === 0 ? 0.5 + 0.2 * rnd() : 0.85 + 0.45 * rnd()); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  return pts;
}
// Bakes the broken look into a copy of one painting: the hub drew the painting scaled to W x H on `c`; layerName '' is the
// phase 1 painting, 'phase2' the second.
function bakeBroken(c, img, layerName, broken) {
  const layer = layerName === "phase2" ? 2 : 1;
  let k = 0;
  for (const id in broken) {
    const d = PARTS[id]; if (!broken[id] || !d || !d.layers.includes(layer)) continue;
    for (const [cx, cy, r] of d.notches) {
      const seed = 11 + (k++) * 977, pts = jag(cx, cy, r, seed);
      let s = seed + 5; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
      c.globalCompositeOperation = "source-atop"; c.lineCap = "round"; c.lineJoin = "miter";
      c.strokeStyle = "#14100C"; c.lineWidth = 9;
      for (let i = 0; i < 4; i++) {
        let an = (i / 4 + 0.08) * 2 * Math.PI + rnd() * 0.6, x = cx + Math.cos(an) * r * 0.8, y = cy + Math.sin(an) * r * 0.8;
        c.beginPath(); c.moveTo(x, y);
        for (let j = 0; j < 4; j++) { an += (rnd() - 0.5) * 1.0; x += Math.cos(an) * r * 0.36; y += Math.sin(an) * r * 0.36; c.lineTo(x, y); }
        c.stroke();
      }
      c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
      c.strokeStyle = "#14100C"; c.lineWidth = 16; c.stroke();
      c.strokeStyle = "#FFB547"; c.lineWidth = 6; c.stroke();
      c.globalCompositeOperation = "destination-out"; c.fillStyle = "#000"; c.fill();
      c.globalCompositeOperation = "source-over";
      const tc = document.createElement("canvas"); tc.width = W; tc.height = H; const t2 = tc.getContext("2d");
      t2.beginPath(); pts.forEach(([x, y], i) => i ? t2.lineTo(x, y) : t2.moveTo(x, y)); t2.closePath(); t2.fillStyle = "#C2461A"; t2.fill();
      t2.beginPath(); pts.forEach(([x, y], i) => { const q = [cx + (x - cx) * 0.6, cy + (y - cy) * 0.6]; i ? t2.lineTo(...q) : t2.moveTo(...q); }); t2.closePath();
      t2.fillStyle = "#FFB547"; t2.strokeStyle = "#14100C"; t2.lineWidth = 3; t2.stroke(); t2.fill();
      t2.globalCompositeOperation = "destination-in"; t2.drawImage(img, 0, 0, W, H);
      c.drawImage(tc, 0, 0);
    }
  }
}

function restP() {
  return { reach: 0, shR: 0, elR: 0, shL: 0, elL: 0, head: 0, headX: 0, headLift: 0, br: 0, lift: 0, asym: 0, lean: 0, step: 0, flash: 0, shake: null, heat: 0.25, flick: 1, eyeFlare: 0, eyeAlive: 1, grateDead: 0, mix: MIXV, ev: [], t: 0, mood: "idle", fid: -1 };
}

foreman.pose = function (L, t, dt, S, mood, api = makeView(foreman, mood, S)) {
  lastT = t; frameId++;
  if (S.start === undefined) { S.start = t; S.cycle = undefined; }
  if (!S.broken) S.broken = {};
  // the second painting's fade follows a target the pose owns; a rig created in phase 2 starts with the layer already up
  if (api.layers.phase2t === undefined) api.layers.phase2t = api.layers.phase2 ?? 0;
  PH2 = api.layers.phase2t > 0.5; MIXV = api.layers.phase2 ?? 0;
  const u = t - S.start, m = api.mood, P = restP();
  P.t = t; P.u = u; P.mood = m; P.fid = frameId;
  const ph = t * Math.PI * 2 / 4, br = Math.sin(ph - 0.5);
  // Idle base: heavy breathing, arms lag the chest, a twitch-and-hold head turn.
  const hc = u % 4;
  P.br = 0.55 + 0.45 * br;
  P.shR = -1.6 * Math.sin(ph - 1.1); P.shL = 1.4 * Math.sin(ph - 1.3); P.elR = -1.2 * Math.sin(ph - 1.7); P.elL = 1.0 * Math.sin(ph - 1.5);
  P.head = 0.8 * Math.sin(ph - 0.9) + kf(hc, [0, 0.7, 1.1, 2.0, 2.5, 2.9, 3.3, 4], [0, 0, -5.5, -5.5, 3, 3, 0, 0]);
  P.headX = kf(hc, [0, 0.7, 1.1, 2.0, 2.5, 2.9, 3.3, 4], [0, 0, -7, -7, 4, 4, 0, 0]);
  P.lean = 0.35 * Math.sin(ph * 0.5); P.lift = 0;
  let heatBoost = 0, steamRate = 1;
  if (m === "attack") {
    const c = u % 2.8, T = [0, 0.18, 0.95, 1.07, 1.3, 2.0, 2.8];
    P.shR = kf(c, T, [0, 4, -70, 3, 3, 1, 0]); P.elR = kf(c, T, [0, 3, -78, 3, 3, 1, 0]); P.reach = kf(c, T, [0, 0, 0, 0.1, 0.1, 0.02, 0]);
    P.shL = kf(c, T, [0, -3, 10, -6, -6, 0, 0]); P.elL = kf(c, T, [0, 0, 6, -4, -4, 0, 0]);
    P.lift = kf(c, T, [0, 6, 16, -24, -24, -4, 0]); P.lean = kf(c, T, [0, -3, -5, 5, 5, 1, 0]);
    P.head = kf(c, T, [0, -2, -6, 7, 7, 1, 0]); P.headLift = kf(c, T, [0, 0, 5, -4, -4, 0, 0]); P.br = kf(c, T, [0.5, 0, 1.2, -0.5, -0.5, 0.3, 0.5]);
    P.eyeFlare = kf(c, T, [0, 0, 0.6, 0.3, 0, 0, 0]); heatBoost = 0.35 * kf(c, T, [0, 0.3, 0.8, 1, 0.6, 0.2, 0]);
    const cyc = Math.floor(u / 2.8);
    if (c >= 1.07 && S.cycle !== cyc) { S.cycle = cyc; P.ev.push("impact"); }
    if (c >= 1.07) { const d = Math.exp(-(c - 1.07) * 7); P.shake = [(Math.random() - 0.5) * 18 * d, (Math.random() - 0.5) * 11 * d]; }
    if (c < 0.1) steamRate = 3;
    if (c >= 1.75 && S.rivCycle !== cyc) { S.rivCycle = cyc; RIV.t0 = t; P.ev.push("rivet"); }
  } else if (m === "hurt") {
    const c = Math.min(u, 1.79), T = [0, 0.08, 0.25, 0.7, 1.8];
    P.flash = 0.09 * clamp(1 - (u - 0.02) / 0.11);
    P.lean = kf(c, T, [0, 8, 6, 0, 0]); P.head = kf(c, T, [0, 15, 8, 0, 0]); P.headLift = kf(c, T, [0, -4, -2, 0, 0]); P.headX = 0;
    P.shR = kf(c, T, [0, -16, -8, 0, 0]) + 3 * Math.exp(-c * 5) * Math.sin(c * 26); P.elR = kf(c, T, [0, -10, -4, 0, 0]);
    P.shL = kf(c, T, [0, 16, 8, 0, 0]) - 3 * Math.exp(-c * 5) * Math.sin(c * 26); P.elL = kf(c, T, [0, 10, 4, 0, 0]);
    P.lift = kf(c, T, [0, -8, -4, 0, 0]); P.step = kf(c, T, [0, 22, 18, 0, 0]); P.br = kf(c, T, [0.5, -0.4, 0.2, 0.5, 0.5]);
    const d = Math.exp(-c * 6); P.shake = [(Math.random() - 0.5) * 10 * d, (Math.random() - 0.5) * 6 * d];
    P.eyeFlare = kf(c, T, [0, 0.8, 0.3, 0, 0]);
    if (S.hit !== Math.floor(u / 1.8)) { S.hit = Math.floor(u / 1.8); P.ev.push("hit"); }
  } else if (m === "phase") {
    const c = Math.min(u, 3.999), T = [0, 0.35, 0.7, 0.78, 1.2, 2.3, 2.8, 3.4, 4];
    const TA = [0, 0.35, 0.58, 0.95, 1.2, 2.3, 2.8, 3.4, 4];
    P.shL = kf(c, TA, [0, -6, -10, 14, 12, 6, 2, 0, 0]); P.shR = kf(c, TA, [0, 6, 10, -14, -12, -6, -2, 0, 0]);
    P.elL = kf(c, TA, [0, -4, -8, 8, 6, 3, 1, 0, 0]); P.elR = kf(c, TA, [0, 4, 8, -8, -6, -3, -1, 0, 0]);
    P.head = kf(c, T, [0, 6, 10, -4, -10, -12, -4, 0, 0]); P.headLift = kf(c, T, [0, -2, -4, 4, 8, 8, 2, 0, 0]); P.headX = 0;
    P.lean = kf(c, T, [0, 2, 4, -6, -5, -1, 0, 0, 0]) + (c > 0.78 ? 1.5 * Math.sin((c - 0.78) * 12) * Math.exp(-(c - 0.78) * 3) : 0);
    P.lift = kf(c, T, [0, -4, -12, -4, -8, -4, 10, 0, 0]);
    P.br = kf(c, T, [0.5, 0, 0, 0.5, 1.5, 1.5, 0.3, 0.4, 0.5]);
    P.eyeFlare = kf(c, [0, 0.7, 1.0, 2.3, 3.0, 4], [0, 0.3, 1, 1, 0.2, 0]);
    heatBoost = 0.1 + 0.5 * kf(c, [0, 0.7, 1.2, 2.5, 4], [0, 0.2, 1, 0.8, 0.3]);
    if (c < 0.7) { const e = ease(c / 0.7); P.shake = [(Math.random() - 0.5) * 5 * e, (Math.random() - 0.5) * 3 * e]; }
    else { const d = Math.exp(-(c - 0.7) * 3.2); P.shake = [(Math.random() - 0.5) * 16 * d, (Math.random() - 0.5) * 9 * d]; }
    if (c >= 0.72 && !S.tore) { S.tore = true; api.layers.phase2t = 1; PH2 = true; P.ev.push("tear"); }
    if (c >= 1.15 && !S.roared) { S.roared = true; P.ev.push("roar"); }
    steamRate = c > 1.2 && c < 2.8 ? 5 : 1;
  } else if (m === "death") {
    const c = Math.min(u, 2.999), T = [0, 0.12, 0.35, 1.3, 2.0, 3];
    P.flash = 0.09 * clamp(1 - (u - 0.02) / 0.11);
    P.lean = kf(c, T, [0, 6, 3, -14, -22, -22]); P.lift = kf(c, T, [0, -4, -6, -100, -150, -150]); P.asym = 1.2 * ease(clamp((c - 0.3) / 1));
    P.head = kf(c, T, [0, 12, 6, 16, 22, 22]); P.headLift = kf(c, T, [0, 0, 0, -14, -22, -22]); P.headX = 0;
    const lim = 3 * Math.exp(-Math.max(0, c - 1.3) * 3) * Math.sin(c * 9);
    P.shR = kf(c, T, [0, -14, -6, 6, 10, 10]) + lim; P.shL = kf(c, T, [0, 14, 6, -4, -6, -6]) - lim;
    P.elR = kf(c, T, [0, -8, -2, 5, 8, 8]); P.elL = kf(c, T, [0, 8, 2, -3, -5, -5]);
    P.br = kf(c, T, [0.5, -0.5, 0, 0.2, 0, 0]);
    P.heat = 0.3 * (1 - ease(clamp((c - 0.25) / 1.6))); P.grateDead = 0.5 * ease(clamp((c - 0.9) / 1.4)); P.eyeAlive = 1 - ease(clamp((c - 1.75) / 0.5));
    P.eyeFlare = kf(c, [0, 0.12, 0.5], [0, 0.8, 0]);
    if (c < 0.6) { const d = Math.exp(-c * 6); P.shake = [(Math.random() - 0.5) * 10 * d, (Math.random() - 0.5) * 6 * d]; }
    if (c >= 1.3 && !S.kneel) { S.kneel = true; P.ev.push("kneel"); }
    if (!S.hit) { S.hit = 1; P.ev.push("hit"); }
    steamRate = c < 1.8 ? 2 : 0.5;
    if (u > 3) P.shake = null;
  }
  if (m !== "death") P.heat = clamp(L.heat + heatBoost);
  // Rivet gun kick (any mood, via rig.act).
  const rk = t - RIV.t0;
  if (rk >= 0 && rk < 0.5) { const k = Math.exp(-rk * 9); P.elL -= 16 * k * Math.cos(rk * 14); P.shL += 6 * k; }
  // Crossfade ramp for the phase-2 painting (0.4 s).
  P.lift += 14 * MIXV;
  MIXV += Math.sign((PH2 ? 1 : 0) - MIXV) * Math.min(Math.abs((PH2 ? 1 : 0) - MIXV), dt / 0.4);
  api.layers.phase2 = MIXV;
  P.mix = MIXV;
  P.flick = 0.88 + 0.12 * Math.sin(t * 23) * Math.sin(t * 7.3);
  P.steamRate = steamRate; P.dt = dt;
  return P;
};

// ---- effects: flat, ink-edged, two-tone. All state is module-level; the top layer draws it. ----
const FX = { puffs: [], sparks: [], scraps: [], bursts: [], rings: [], muzzles: [], acc: 0 };
function glow(c, [x, y], r, [R, G, B], a) {
  if (a <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${R},${G},${B},${Math.min(1, a)})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill();
}
function puff(born, [x, y], o = {}) {
  const sp = o.spread || 1;
  return { x: x + (Math.random() - 0.5) * 10, y, vx: o.vx !== undefined ? o.vx : (o.side || 0) * (20 + Math.random() * 40) + (Math.random() - 0.5) * 50 * sp,
    vy: o.vy !== undefined ? o.vy : -(40 + Math.random() * 70 * sp), r: o.r || 18 + Math.random() * 14 * sp, born, life: o.life || 1.3 + Math.random() * 0.7, dust: o.dust,
    lumps: [[0, 0, 1], [-0.55, 0.15, 0.62 + Math.random() * 0.15], [0.5, 0.2, 0.55 + Math.random() * 0.2], [0.05, -0.5, 0.5 + Math.random() * 0.15]] };
}
function spark(t, [cx, cy], spread, k, dir) {
  const a = (dir === undefined ? -Math.PI / 2 : dir) + (Math.random() - 0.5) * 2.4, v = (240 + Math.random() * 340) * k;
  return { x: cx + (Math.random() - 0.5) * spread, y: cy + (Math.random() - 0.5) * spread, vx: Math.cos(a) * v, vy: Math.sin(a) * v, born: t, life: 0.35 + Math.random() * 0.3 };
}
function scrap(t, [cx, cy], i) {
  const a = (i / 9) * 2 * Math.PI + Math.random() * 0.5, v = 200 + Math.random() * 260;
  const n = 5, shape = []; for (let k = 0; k < n; k++) { const an = k / n * 2 * Math.PI, rr = (0.5 + Math.random() * 0.6); shape.push([Math.cos(an) * rr, Math.sin(an) * rr]); }
  return { x: cx + (Math.random() - 0.5) * 120, y: cy + (Math.random() - 0.5) * 50, vx: Math.cos(a) * v * 1.2, vy: Math.sin(a) * v - 220, born: t, life: 1.1 + Math.random() * 0.4, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 14, sz: 22 + Math.random() * 20, shape, buckle: i === 0 };
}
function star(c, [x, y], R, a) {
  c.globalAlpha = a < 0.6 ? 1 : 0.6; c.lineJoin = "miter";
  for (const [k, col, lw] of [[1, "#FFB547", 4], [0.5, "#E8EEF0", 0]]) {
    c.beginPath();
    for (let i = 0; i < 16; i++) { const an = i / 16 * 2 * Math.PI, rr = (i % 2 ? 0.45 : 1 + 0.25 * ((i * 7) % 3 - 1)) * R * k; i ? c.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr) : c.moveTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
    c.closePath(); c.fillStyle = col; c.fill(); if (lw) { c.strokeStyle = "#14100C"; c.lineWidth = lw; c.stroke(); }
  }
  c.globalAlpha = 1;
}
function handleEvents(P, api) {
  if (P.fid === lastFx) return; lastFx = P.fid;
  const at = p => api.point(p[0], p[1], P), t = P.t;
  for (const e of P.ev) {
    if (e === "impact") {
      const w = at(WTIP);
      FX.bursts.push({ born: t, at: [w[0], w[1] - 30], r: 105 });
      for (let i = 0; i < 16; i++) FX.sparks.push(spark(t, w, 40, 1, -Math.PI / 2));
      for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) FX.puffs.push(puff(t, [w[0] + sx * 20, 1085 - Math.random() * 20], { vx: sx * (160 + Math.random() * 200), vy: -20 - Math.random() * 40, r: 26 + Math.random() * 16, life: 0.9 + Math.random() * 0.4, dust: true }));
      FX.rings.push({ born: t, at: [w[0], 1092] });
    } else if (e === "hit") {
      const g = at(GRATE); FX.bursts.push({ born: t, at: g, r: 80 });
      for (let i = 0; i < 9; i++) FX.sparks.push(spark(t, g, 50, 0.8, -Math.PI / 2));
    } else if (e === "rivet") {
      const r = at(RIVET_TIP); FX.muzzles.push({ born: t, at: r });
      for (let i = 0; i < 5; i++) FX.sparks.push(spark(t, r, 8, 0.6, Math.PI / 2));
    } else if (e === "tear") {
      const w = at(APRON_MID);
      for (let i = 0; i < 9; i++) FX.scraps.push(scrap(t, w, i));
      for (let i = 0; i < 8; i++) FX.sparks.push(spark(t, w, 80, 0.7, -Math.PI / 2));
      FX.bursts.push({ born: t, at: w, r: 70 });
    } else if (e === "roar") {
      for (const v of VENTS.concat(EARS)) for (let i = 0; i < 3; i++) { const p = at(v); FX.puffs.push(puff(t, p, { vx: (v[0] < 448 ? -1 : 1) * (80 + Math.random() * 160), vy: -(120 + Math.random() * 160), r: 26 + Math.random() * 18, life: 1.1 + Math.random() * 0.5 })); }
    } else if (e === "kneel") {
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) FX.puffs.push(puff(t, [330 + sx * 80, 1085], { vx: sx * (120 + Math.random() * 120), vy: -20 - Math.random() * 30, r: 24 + Math.random() * 12, life: 0.9, dust: true }));
      FX.rings.push({ born: t, at: [330, 1092] });
    }
  }
  // Ambient steam from the shoulder vents on the exhale.
  FX.acc += P.dt * P.steamRate * (P.mood === "death" ? 0.9 : 1.1);
  while (FX.acc > 1) { FX.acc -= 1; const v = VENTS[Math.floor(Math.random() * VENTS.length)], p = at(v); FX.puffs.push(puff(t, p, { spread: 0.8 + P.heat, side: v[0] < 448 ? -1 : 1 })); }
}
function drawOver(c, P, t, api) {
  // a new fight restarts the rig clock: drop effects left from the last one (they would have negative ages)
  if (P.t < (FX.lastT ?? 0)) for (const k in FX) if (Array.isArray(FX[k])) FX[k] = [];
  FX.lastT = P.t;
  handleEvents(P, api);
  const at = p => api.point(p[0], p[1], P), H = P.heat, f = P.flick, tt = P.t;
  c.globalCompositeOperation = "lighter";
  const pulse = 1 + 0.25 * Math.sin(tt * Math.PI * 0.5 + 1) * (0.4 + H);
  const g = at(GRATE);
  glow(c, g, 120, [255, 120, 40], (0.1 + 0.55 * H) * f * pulse);
  glow(c, g, 55, [255, 215, 140], (0.1 + 0.4 * H) * f * pulse);
  if (P.eyeAlive > 0.01) for (const e of EYES) { const p = at(e); glow(c, p, 24 + 22 * P.eyeFlare, [255, 205, 100], (0.25 + 0.5 * H + 0.9 * P.eyeFlare) * f * P.eyeAlive); if (P.eyeFlare > 0.3) glow(c, p, 12, [255, 255, 230], 0.9 * P.eyeFlare * P.eyeAlive); }
  glow(c, at(LAMP), 28, [255, 190, 90], (0.3 + 0.2 * H) * f * (P.eyeAlive > 0.5 ? 1 : 0.3));
  FX.sparks = FX.sparks.filter(s => tt - s.born < s.life);
  c.globalCompositeOperation = "source-over";
  // Dead eyes: dark glass with a small dull highlight, ink rim.
  if (P.eyeAlive < 0.99) for (const e of EYES) {
    const p = at(e); c.globalAlpha = 1 - P.eyeAlive; c.fillStyle = "#14282A"; c.strokeStyle = "#14100C"; c.lineWidth = 4;
    c.beginPath(); c.ellipse(p[0], p[1], 21, 23, 0, 0, 2 * Math.PI); c.fill(); c.stroke();
    c.fillStyle = "#3A5558"; c.beginPath(); c.ellipse(p[0] - 7, p[1] - 8, 6, 4, -0.5, 0, 2 * Math.PI); c.fill(); c.globalAlpha = 1;
  }
  if (P.grateDead > 0.01) { c.globalAlpha = P.grateDead; c.fillStyle = "#14282A"; c.beginPath(); c.arc(g[0], g[1], 86, 0, 2 * Math.PI); c.fill(); c.globalAlpha = 1; }
  // Sparks: flat slivers with an ink edge.
  for (const s of FX.sparks) {
    const d = tt - s.born, a = d / s.life, x = s.x + s.vx * d, y = s.y + s.vy * d + 520 * d * d, vx = s.vx, vy = s.vy + 1040 * d, L = Math.hypot(vx, vy) || 1, ux = vx / L, uy = vy / L;
    const len = 20 * (1 - a * 0.6), wd = 5.5 * (1 - a * 0.5);
    c.globalAlpha = a < 0.7 ? 1 : 0.6;
    c.beginPath(); c.moveTo(x + ux * len, y + uy * len); c.lineTo(x - uy * wd, y + ux * wd); c.lineTo(x - ux * len * 0.6, y - uy * len * 0.6); c.lineTo(x + uy * wd, y - ux * wd); c.closePath();
    c.fillStyle = a < 0.45 ? "#FFE3A0" : "#FFB547"; c.strokeStyle = "#14100C"; c.lineWidth = 3; c.lineJoin = "miter"; c.stroke(); c.fill(); c.globalAlpha = 1;
  }
  FX.rings = FX.rings.filter(r => tt - r.born < 0.5);
  for (const r of FX.rings) {
    const a = (tt - r.born) / 0.5; c.globalAlpha = a < 0.5 ? 1 : 0.5;
    for (const [col, lw] of [["#14100C", 20], ["#A8987A", 13], ["#D8C9A8", 6]]) { c.strokeStyle = col; c.lineWidth = lw * (1 - 0.5 * a); c.beginPath(); c.ellipse(r.at[0], r.at[1], 60 + 260 * a, 10 + 30 * a, 0, 0, 2 * Math.PI); c.stroke(); }
    c.globalAlpha = 1;
  }
  FX.puffs = FX.puffs.filter(p => tt - p.born < p.life);
  for (const p of FX.puffs) {
    const a = (tt - p.born) / p.life, d = tt - p.born, r = p.r * (0.5 + 1.1 * a), x = p.x + p.vx * d * (p.dust ? Math.exp(-d * 1.5) : 1), y = p.y + p.vy * d;
    c.globalAlpha = a < 0.55 ? 1 : a < 0.8 ? 0.65 : 0.35;
    const lumps = p.lumps.map(([ox, oy, k]) => [x + ox * r, y + oy * r, r * k]);
    const [dark, mid, light] = p.dust ? ["#14100C", "#A8987A", "#D8C9A8"] : ["#14100C", "#9FB4BB", "#E8EEF0"];
    c.fillStyle = dark; for (const [lx, ly, lr] of lumps) { c.beginPath(); c.arc(lx, ly, lr + 2.5, 0, 2 * Math.PI); c.fill(); }
    c.fillStyle = mid; for (const [lx, ly, lr] of lumps) { c.beginPath(); c.arc(lx, ly, lr, 0, 2 * Math.PI); c.fill(); }
    c.fillStyle = light; for (const [lx, ly, lr] of lumps) { c.beginPath(); c.arc(lx - lr * 0.14, ly - lr * 0.16, lr * 0.84, 0, 2 * Math.PI); c.fill(); }
    c.globalAlpha = 1;
  }
  // Leather scraps (and one brass buckle), flat with an ink edge.
  FX.scraps = FX.scraps.filter(s => tt - s.born < s.life);
  for (const s of FX.scraps) {
    const d = tt - s.born, a = d / s.life, x = s.x + s.vx * d, y = s.y + s.vy * d + 620 * d * d;
    c.save(); c.translate(x, y); c.rotate(s.rot + s.spin * d); c.globalAlpha = a < 0.7 ? 1 : 1 - (a - 0.7) / 0.3; c.lineJoin = "round";
    c.beginPath(); s.shape.forEach(([px, py], i) => i ? c.lineTo(px * s.sz, py * s.sz) : c.moveTo(px * s.sz, py * s.sz)); c.closePath();
    c.fillStyle = "#7A4A2A"; c.strokeStyle = "#14100C"; c.lineWidth = 3.5; c.fill(); c.stroke();
    c.save(); c.scale(0.55, 0.55); c.beginPath(); s.shape.forEach(([px, py], i) => i ? c.lineTo(px * s.sz, py * s.sz) : c.moveTo(px * s.sz, py * s.sz)); c.closePath(); c.fillStyle = "#A06A3E"; c.fill(); c.restore();
    if (s.buckle) { c.fillStyle = "#C9A24A"; c.beginPath(); c.rect(-13, -10, 26, 20); c.fill(); c.stroke(); c.fillStyle = "#14100C"; c.fillRect(-6, -4, 12, 8); }
    c.restore();
  }
  FX.bursts = FX.bursts.filter(b => tt - b.born < 0.28);
  for (const b of FX.bursts) { const a = (tt - b.born) / 0.28; star(c, b.at, b.r * (0.6 + 0.7 * ease(a)), a); }
  FX.muzzles = FX.muzzles.filter(m => tt - m.born < 0.14);
  for (const mz of FX.muzzles) { const a = (tt - mz.born) / 0.14; star(c, mz.at, 34 * (0.7 + 0.5 * a), a); }
  c.fillStyle = `rgba(0,0,0,${0.004 + 0.002 * (Math.round(tt * 30) % 2)})`; c.fillRect(0, 0, 2, 2);
}

const def: CharacterDef = {
  ...foreman,
  id: 'foreman',
  bakeBroken,
  over: (c, P, t, api) => drawOver(c, P, t, api),
  grid: [57, 73],
  facing: 'front',
  durations: { idle: 4, attack: 2.8, hurt: 1.8, phase: 4, death: 3 },
  texture: { regular: 'art/foreman/cut.webp', layers: { phase2: 'art/foreman/cut-phase2.webp' } },
};
export default finishDef(def);
