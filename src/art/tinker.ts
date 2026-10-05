// @ts-nocheck
// tinker: converted from art/tinker/tinker.template.html by scripts/rig-convert.mjs, then fixed by hand (D-033).
// The rig code is the template's own (loose types on purpose: it is animation code, checked by looking at it);
// the typed surface is the CharacterDef export at the bottom. Mesh grid is half the template's.
import { band, finishDef, makeView, rad, rot, smooth } from './kit';
import type { CharacterDef } from './types';


const INK = "#14100C";
const TAU = 2 * Math.PI;

// Joints in painting pixels (the painting faces left; forward is -x).
const HIP = [[764, 478], [776, 478]];       // 0 front-painted leg (left in the painting), 1 trailing-painted leg
const KNEE = [[722, 604], [818, 602]];
const ANKLE = [[708, 712], [850, 706]];
const PAINTED = [-10, 18];                  // painted leg angles from vertical (positive = foot behind)
const LTH = 130, LSH = 145, SOLE = 748;     // thigh and shin lengths, ground line
const FAR_SH = [702, 348], FAR_EL = [650, 358];
const NEAR_SH = [866, 345], NEAR_EL = [857, 405];
const NECK = [745, 250], PACK_HINGE = [830, 320], FEET_C = [780, 748], HIPS_C = [770, 470];
const SPLIT = 775, CROTCH = 534;

const nearAxis = y => 866 - 18 * smooth(345, 520, y);
function armN(x, y) {
  const hw = y < 408 ? 46 : 24 + 8 * smooth(455, 500, y);
  return smooth(hw + 6, hw - 8, Math.abs(x - nearAxis(y))) * smooth(332, 352, y) * smooth(538, 520, y);
}
function armF(x, y) {
  const top = 318 + 14 * smooth(600, 690, x), bot = 414;
  return smooth(712, 686, x) * smooth(top - 8, top + 6, y) * smooth(bot + 8, bot - 6, y);
}

const tinker = {
  size: [1216, 832], grid: [152, 104], pad: [70, 70],
  weights(x, y) {
    const aN = armN(x, y), aF = armF(x, y);
    const w = { aN, aF };
    w.eF = aF * smooth(672, 630, x);
    w.eN = aN * smooth(396, 420, y);
    const free = (1 - aN) * (1 - aF);
    w.head = smooth(262, 226, y) * (1 - smooth(790, 812, x) * smooth(185, 225, y));
    w.pack = smooth(832, 856, x) * smooth(196, 218, y) * smooth(552, 500, y) * (1 - aN);
    w.torso = smooth(488, 432, y);
    w.chest = smooth(480, 430, y) * (1 - w.head);
    w.sway = smooth(748, 612, y);
    // Legs: side by side below the crotch, blended above it.
    const wd = 3 + 20 * smooth(540, 496, y), sideR = smooth(SPLIT - wd, SPLIT + wd, x);
    const side = [(1 - sideR) * free, sideR * free];
    w.hip = side.map(v => v * smooth(452, 528, y));
    w.shin = [side[0] * smooth(584, 634, y), side[1] * smooth(582, 632, y)];
    w.foot = [side[0] * smooth(684, 706, y), side[1] * smooth(678, 700, y)];
    w.ground = smooth(700, 748, y);
    return w;
  },
  // The two legs are separate pieces below the crotch: tear the mesh between them.
  part(x, y) { return y < CROTCH ? 0 : x < SPLIT ? 1 : 2; },
  tear(x, y) { return y > CROTCH + 4 && y < 800; },
  deform(x, y, w, P) {
    for (let i = 0; i < 2; i++) {
      [x, y] = rot(x, y, ANKLE[i][0], ANKLE[i][1], rad(-P.foot[i]), w.foot[i]);
      [x, y] = rot(x, y, KNEE[i][0], KNEE[i][1], rad(-P.shin[i]), w.shin[i]);
      [x, y] = rot(x, y, HIP[i][0], HIP[i][1], rad(-P.hip[i]), w.hip[i]);
    }
    // Arms (children first), then the head and the pack.
    [x, y] = rot(x, y, FAR_EL[0], FAR_EL[1], rad(P.farE), w.eF);
    [x, y] = rot(x, y, FAR_SH[0], FAR_SH[1], rad(P.farS), w.aF);
    [x, y] = rot(x, y, NEAR_EL[0], NEAR_EL[1], rad(P.nearE), w.eN);
    [x, y] = rot(x, y, NEAR_SH[0], NEAR_SH[1], rad(P.nearS), w.aN);
    [x, y] = rot(x, y, PACK_HINGE[0], PACK_HINGE[1], rad(P.pack), w.pack);
    y += P.packY * w.pack;
    // Breath: the chest rises, shoulders with it.
    y = 470 - (470 - y) * (1 + P.breath * w.chest);
    [x, y] = rot(x, y, NECK[0], NECK[1], rad(P.head), w.head);
    // Lean and weight shift (feet stay planted).
    [x, y] = rot(x, y, HIPS_C[0], HIPS_C[1], rad(P.lean), w.torso);
    x += P.sway * w.sway;
    y += P.dy;
    return [x, y];
  },
  moods: { idle: {}, walk: {}, cheer: {}, hurt: {} },
  ease: 3,
  anchors: { hand: [565, 360, 38], head: [725, 150, 85], satchel: [905, 330, 95], core: [765, 375, 60], eyes: [690, 176, 40] },
  onMood(m, api) { api.state = { start: undefined, prev: api.lastP || null, fx: [], last: {} }; },
  pose(L, t, dt, S, mood, api = makeView(tinker, mood, S)) {
    if (S.start === undefined) { S.start = t - dt; S.blendStart = t; S.fx = S.fx || []; S.last = {}; }
    const m = api.mood, dur = { idle: 4, walk: 2, cheer: 3, hurt: 1.5 }[m], u = (t - S.start) % dur;
    let P = poseFor(m, u, S, t);
    P.t = t; P.u = u;
    // Short blend from the previous mood's last pose so mood changes never pop.
    if (S.prev) { const k = Math.min(1, (t - S.blendStart) / 0.18); if (k < 1) P = mix(S.prev, P, k * k * (3 - 2 * k)); else S.prev = null; }
    return P;
  },
  under(c, P, t, api) {
    dirty(c, t);
    const up = Math.max(0, -P.dy) / 80, g = 1 - Math.min(0.5, up);
    c.fillStyle = `rgba(0,0,0,${0.30 * g})`;
    c.beginPath(); c.ellipse(790, 752, 170 * g, 15 * g, 0, 0, TAU); c.fill();
    fxDraw(c, api.state, t, (x, y) => api.point(x, y, P), "under");
  },
  over(c, P, t, api) {
    dirty(c, t);
    const S = api.state, at = (x, y) => api.point(x, y, P);
    fxDraw(c, S, t, at, "over");
  },
};

// An almost invisible mark each frame keeps the browser from showing a stale canvas buffer when nothing else is drawn.
function dirty(c, t) { c.fillStyle = `rgba(0,0,0,${0.004 + 0.002 * (Math.round(t * 30) % 2)})`; c.fillRect(0, 0, 2, 2); }
// ---- Poses -------------------------------------------------------------
const clamp = v => Math.min(1, Math.max(0, v)), sm = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const seg = (u, a, b) => sm((u - a) / (b - a));              // 0 before a, 1 after b
const bump = (u, a, b) => (u > a && u < b) ? Math.sin(Math.PI * (u - a) / (b - a)) : 0;
function K(u, pts) {
  if (u <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (u <= pts[i][0]) { const a = pts[i - 1], b = pts[i], t = (u - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * sm(t); }
  return pts[pts.length - 1][1];
}
function mix(a, b, k) {
  const o = {};
  for (const key in b) { const x = a[key], y = b[key];
    if (Array.isArray(y)) o[key] = y.map((v, i) => x[i] + (v - x[i]) * k);
    else if (typeof y === "number" && typeof x === "number") o[key] = x + (y - x) * k; else o[key] = y; }
  return o;
}
const smax = (a, b) => (a + b) / 2 + Math.sqrt(((a - b) / 2) ** 2 + 9);
// Height of the pelvis for planted feet: the lower foot stays on the ground.
function groundDy(hip, shin) {
  const r = i => { const phi = PAINTED[i] + hip[i]; return LTH * Math.cos(rad(phi)) + LSH * Math.cos(rad(phi + shin[i])); };
  return SOLE - 477 - smax(r(0), r(1));
}
function baseP() {
  return { hip: [0, 0], shin: [0, 0], foot: [0, 0], farS: -38, farE: 22, nearS: -3, nearE: 6, head: 0, lean: 0, sway: 0, breath: 0, pack: 0, packY: 0, dy: 0, flash: 0, shake: null };
}
// Legs from per-leg gait values: phi (angle from vertical, positive = foot behind), k (knee flexion), adj (toe pitch).
function legs(P, phi, k, adj) {
  for (let i = 0; i < 2; i++) {
    P.hip[i] = phi[i] - PAINTED[i]; P.shin[i] = k[i];
    P.foot[i] = -(P.hip[i] + k[i]) + adj[i];    // keeps the boot flat on the ground, plus toe pitch
  }
}
const wrap = p => ((p % TAU) + TAU) % TAU;
function walkLegs(P, p) {
  const phi = [], k = [], adj = [];
  for (let i = 0; i < 2; i++) {
    const q = wrap(p + i * Math.PI);
    phi[i] = 4 - 16 * Math.cos(q);
    const swing = Math.max(0, -Math.sin(q));
    k[i] = 40 * swing + 3 * Math.max(0, Math.sin(q));
    // Toe-off (heel lifts), a loose hanging foot in swing, a toe-up reach at heel strike.
    const toeOff = q > 0.66 * Math.PI && q < Math.PI * 1.15 ? Math.sin(Math.PI * (q - 0.66 * Math.PI) / (0.49 * Math.PI)) : 0;
    const reach = q > 1.7 * Math.PI ? Math.sin(Math.PI * (q - 1.7 * Math.PI) / (0.3 * Math.PI)) : 0;
    adj[i] = 20 * toeOff + 8 * swing - 14 * reach;
  }
  legs(P, phi, k, adj);
}
function poseFor(m, u, S, t) {
  const P = baseP();
  if (m === "idle") {
    const ph = u / 4 * TAU;
    walkless(P, -6, 8);
    P.sway = 8 * Math.sin(ph); P.lean = 1.4 * Math.sin(ph) - 0.4;
    // The unloaded leg relaxes a little as the weight moves off it.
    P.shin[0] += 5 * Math.max(0, -Math.sin(ph)); P.shin[1] += 5 * Math.max(0, Math.sin(ph));
    for (let i = 0; i < 2; i++) P.foot[i] = -(P.hip[i] + P.shin[i]);
    P.breath = 0.024 * Math.sin(u / 2 * TAU - 0.6);
    P.farS += 1.5 * Math.sin(u / 2 * TAU - 1.0);
    P.nearS = -2 + 1.2 * Math.sin(u / 2 * TAU - 1.3);
    P.pack = 0.6 * Math.sin(ph - 0.9); P.packY = 1.2 * Math.sin(u / 2 * TAU - 1.1);
    // A glance up and over, then the adjustment of the glasses: the free hand comes up, taps, and goes back down.
    P.head = K(u, [[0, 0], [0.7, 0], [1.0, 6], [1.8, 6], [2.1, 0], [2.4, 0], [2.9, -3], [3.5, -3], [3.8, 0], [4, 0]]);
    const up = K(u, [[0, 0], [2.3, 0], [2.85, 1], [3.3, 1], [3.8, 0], [4, 0]]);
    const tap = bump(u, 3.0, 3.25) * 0 + (u > 3.0 && u < 3.3 ? Math.sin((u - 3.0) / 0.3 * TAU) : 0);
    P.farS += 86 * up + 3 * tap; P.farE += 30 * up - 4 * tap;
    P.lean += -1.0 * up;
    P.dy = groundDy(P.hip, P.shin) + 0;
  } else if (m === "walk") {
    const p = u / 2 * TAU;
    walkLegs(P, p);
    P.dy = groundDy(P.hip, P.shin);
    P.lean = -2.2 + 1.0 * Math.cos(2 * p - 0.3);
    P.head = 1.6 + 1.6 * Math.sin(2 * p - 0.9);
    P.farS = -38 + 9 * Math.cos(p); P.farE = 22 + 8 * Math.cos(p);
    P.nearS = -3 - 10 * Math.cos(p); P.nearE = 8 - 6 * Math.cos(p);
    // The pack follows the body a beat late.
    const dyAt = q => { const Q = baseP(); walkLegs(Q, q); return groundDy(Q.hip, Q.shin); };
    const lag = 0.32;
    P.packY = 1.4 * (dyAt(p - lag) - P.dy) - 1.0;
    P.pack = 2.4 * Math.sin(2 * p - 1.3);
    P.sway = 2.0 * Math.sin(p);
    P.breath = 0.01 * Math.sin(2 * p);
    dustWalk(S, p, t);
  } else if (m === "cheer") {
    cheerPose(P, u, S, t);
  } else if (m === "hurt") {
    hurtPose(P, u, S, t);
  }
  return P;
}
// Standing legs from two hip angles.
function walkless(P, a, b, c = 0, adj = [0, 0]) {
  legs(P, [a, b], [c, c], adj);
}
function cheerPose(P, u, S, t) {
  const crouch = K(u, [[0, 0], [0.3, 1], [0.38, 0.9], [0.95, 0], [1.02, 0.7], [1.22, 0], [1.5, 0], [1.62, 0.5], [1.8, 0], [3, 0]]);
  const sA = clamp((u - 0.38) / 0.6), air1 = u > 0.38 && u < 0.98 ? 4 * sA * (1 - sA) : 0;
  const sB = clamp((u - 1.7) / 0.4), air2 = u > 1.7 && u < 2.1 ? 4 * sB * (1 - sB) : 0;
  const h = 58 * air1 + 26 * air2;
  const tuck = Math.min(1, (air1 > 0.02 ? 1 : 0) * Math.min(1, air1 * 4) + (air2 > 0.02 ? 1 : 0) * Math.min(1, air2 * 4));
  // Standing stance (hips) then crouch: thighs forward, shins back so the feet stay put.
  const phi = [-6 - 22 * crouch, 8 - 24 * crouch], k = [22 * crouch + 30 * crouch * crouch * 0, 24 * crouch];
  const baseK = [k[0], k[1]];
  const gd = groundDy([phi[0] - PAINTED[0], phi[1] - PAINTED[1]], baseK);
  legs(P, [phi[0] - 6 * tuck, phi[1] - 14 * tuck], [k[0] + 34 * tuck, k[1] + 30 * tuck], [0, 0]);
  P.foot[0] += 10 * tuck; P.foot[1] += 12 * tuck;
  P.dy = gd - h;
  // Arms: wind back in the crouch, the free hand shoots up with a fist, pumps, then lowers.
  const fist = K(u, [[0, 0], [0.3, -0.25], [0.6, 1], [0.95, 1], [2.55, 1], [3.0, 0]]);
  const pump = (u > 0.9 && u < 2.6) ? Math.abs(Math.sin((u - 0.9) * 2 * Math.PI * 1.1)) * 0.5 : 0;
  const wave = (u > 1.0 && u < 2.5) ? Math.sin((u - 1.0) * TAU * 2.2) * 13 * Math.min(1, (u - 1.0) / 0.2, (2.5 - u) / 0.3) : 0;
  P.farS = -38 + 82 * fist - 4 * pump; P.farE = 22 - 22 * fist + 3 * pump + wave;
  const nr = K(u, [[0, 0], [0.3, -1], [0.6, 1.2], [1.0, 0.7], [2.5, 0.7], [3.0, 0]]);
  P.nearS = -3 + 13 * Math.max(nr, -0.35); P.nearE = 6 + 12 * Math.max(0, nr);
  P.lean = K(u, [[0, 0], [0.3, -3], [0.7, 2.5], [1.0, -1], [1.4, 0], [3, 0]]);
  P.head = K(u, [[0, 0], [0.3, -3], [0.7, 8], [1.1, 4], [2.5, 4], [3, 0]]);
  P.breath = 0.012 * Math.sin(u * TAU / 1.5);
  P.pack = K(u, [[0, 0], [0.3, 1], [0.7, -3], [1.0, 3], [1.15, -1.5], [1.4, 0.6], [1.7, 0], [1.9, -2], [2.2, 2], [2.4, 0], [3, 0]]);
  P.packY = K(u, [[0, 0], [0.3, 3], [0.7, 6], [1.0, -6], [1.15, 4], [1.4, 0], [1.7, 0], [2.0, 5], [2.3, -4], [2.5, 0], [3, 0]]);
  P.sway = 0;
  // Effects: landing dust, a few flat sparkles at the fist.
  if (S.last.landed !== (u > 0.98) && u > 0.98 && u < 1.1) { S.fx.push({ k: "dust", born: t, x: 790, y: 746 }); }
  S.last.landed = u > 0.98;
  if (S.last.lift !== (u > 0.55) && u > 0.55 && u < 0.7) { S.fx.push({ k: "spark", born: t, x: 540, y: 250 }); }
  S.last.lift = u > 0.55;
  if (S.last.land2 !== (u > 2.1) && u > 2.1 && u < 2.2) { S.fx.push({ k: "dust", born: t, x: 790, y: 746, small: 1 }); }
  S.last.land2 = u > 2.1;
}
function hurtPose(P, u, S, t) {
  const hit = K(u, [[0, 0], [0.05, 1], [0.14, 1], [0.5, 0.35], [0.8, 0], [1.5, 0]]);
  const over = bump(u, 0.55, 1.1);
  P.flash = u < 0.1 ? 0.2 * (1 - u / 0.1) : 0;
  const crouch = 0.45 * K(u, [[0, 0], [0.1, 1], [0.4, 0.6], [0.8, 0], [1.5, 0]]);
  const phi = [-6 - 16 * crouch, 8 - 18 * crouch], k = [16 * crouch, 18 * crouch];
  const gd = groundDy([phi[0] - PAINTED[0], phi[1] - PAINTED[1]], k);
  legs(P, phi, k, [0, 0]);
  const hop = u < 0.2 ? 9 * Math.sin(Math.PI * u / 0.2) : 0;
  P.dy = gd - hop;
  P.lean = 10 * hit - 2.5 * over;
  P.sway = 14 * hit;
  // The head snaps back first, the arms fling after it, the pack trails.
  const hd = K(u, [[0, 0], [0.04, 14], [0.2, 10], [0.5, 4], [0.9, 0], [1.5, 0]]);
  P.head = hd - 2 * over;
  const arms = K(u, [[0, 0], [0.09, 1], [0.22, 0.8], [0.6, 0.2], [0.95, 0], [1.5, 0]]);
  P.farS = -38 + 22 * arms - 5 * over; P.farE = 22 + 10 * arms;
  P.nearS = -3 - 12 * arms; P.nearE = 6 + 14 * arms;
  P.pack = K(u, [[0, 0], [0.1, -1], [0.18, 6], [0.4, -3], [0.7, 1.5], [1.1, 0], [1.5, 0]]);
  P.packY = K(u, [[0, 0], [0.15, -3], [0.3, 6], [0.6, -2], [1.0, 0], [1.5, 0]]);
  P.breath = 0.015 * Math.sin(u * TAU / 0.8) * (u > 0.4 ? 1 : 0);
  if (S.last.hit !== (u < 0.3) && u < 0.3 && u >= 0) { S.fx.push({ k: "star", born: t }); }
  S.last.hit = u < 0.3;
}
// ---- Effects: flat, ink-edged, two-tone ----------------------------------
function blob(c, x, y, r, fill, ln) {
  c.fillStyle = fill; c.beginPath();
  for (const [ox, oy, s] of [[0, 0, 1], [-0.7, 0.2, 0.7], [0.7, 0.15, 0.75], [0.1, -0.5, 0.65]]) { c.moveTo(x + ox * r + r * s, y + oy * r); c.arc(x + ox * r, y + oy * r, r * s, 0, TAU); }
  c.fill();
}
function puffShape(c, x, y, r, a) {
  // A lumpy flat cloud: ink edge, light gray body, white highlight. Opaque (steps in size and a last faded step), never blurred.
  const lumps = [[0, 0, 1], [-0.8, 0.22, 0.72], [0.8, 0.14, 0.76], [0.05, -0.6, 0.62]];
  c.save(); c.globalAlpha = a;
  for (const [fill, grow, sc, ox0, oy0] of [[INK, 3.5, 1, 0, 0], ["#B9C6C9", 0, 1, 0, 0], ["#E8EEF0", 0, 0.55, -0.18, -0.2]]) {
    c.fillStyle = fill; c.beginPath();
    for (const [ox, oy, s] of lumps) { const rr = r * s * sc + grow, cx = x + (ox * r + ox0 * r) * (sc < 1 ? 0.9 : 1), cy = y + oy * r + oy0 * r; c.moveTo(cx + rr, cy); c.arc(cx, cy, rr, 0, TAU); }
    c.fill();
  }
  c.restore();
}
function fxDraw(c, S, t, at, layer) {
  if (layer === "over") S.fx = (S.fx || []).filter(f => t - f.born < 0.9);
  for (const f of S.fx || []) {
    const age = t - f.born;
    if ((f.k === "dust") !== (layer === "under")) continue;
    if (f.k === "star") {
      if (age > 0.3) continue;
      const [x, y] = at(765, 375), r = [32, 46, 40][Math.floor(age / 0.1)];
      for (const [fill, rr, ln] of [["#FFB547", r, 3], ["#FFE9A8", r * 0.55, 0]]) {
        c.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 + 0.2, q = i % 2 ? rr * 0.5 : rr; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath();
        c.fillStyle = fill; c.fill(); if (ln) { c.strokeStyle = INK; c.lineWidth = ln; c.lineJoin = "round"; c.stroke(); }
      }
    } else if (f.k === "dust") {
      const n = Math.floor(age / 0.15); if (n > 5) continue;
      const sc = f.small ? 0.6 : 1, a = n < 4 ? 1 : 0.55, r = [14, 20, 22, 20, 16, 11][n] * sc;
      for (const dir of [-1, 1]) puffShape(c, f.x + dir * (50 + 26 * n) * sc, f.y - 10 - 3 * n, r, a);
    } else if (f.k === "spark") {
      if (age > 0.5) continue;
      const s = [10, 16, 14, 8][Math.min(3, Math.floor(age / 0.125))];
      for (const [ox, oy, k] of [[0, 0, 1], [-46, 38, 0.7], [34, -40, 0.7]]) {
        const [x, y] = at(f.x + ox, f.y + oy), r = s * 1.6 * k;
        for (const [fill, rr, ln] of [["#FFB547", r, 3], ["#FFE9A8", r * 0.5, 0]]) {
          c.beginPath(); c.moveTo(x, y - rr); c.lineTo(x + rr * 0.55, y); c.lineTo(x, y + rr); c.lineTo(x - rr * 0.55, y); c.closePath();
          c.fillStyle = fill; c.fill(); if (ln) { c.strokeStyle = INK; c.lineWidth = ln; c.lineJoin = "round"; c.stroke(); }
        }
      }
    }
  }
  if (layer === "under" && S.walkDust) for (const d of S.walkDust) {
    const age = t - d.born; if (age > 0.4) continue;
    const n = Math.floor(age / 0.1), r = [8, 12, 13, 10][n], a = n < 3 ? 1 : 0.55;
    puffShape(c, d.x + 14 * n, 738 - 3 * n, r, a);
  }
}
// A small flat puff where a boot lands in the walk (heel strike), once per step.
function dustWalk(S, p, t) {
  if (!S.walkDust) { S.walkDust = []; S.stepIdx = -1; }
  S.walkDust = S.walkDust.filter(d => t - d.born < 0.45);
  for (let i = 0; i < 2; i++) {
    const q = wrap(p + i * Math.PI), strike = q < 0.12 || q > TAU - 0.02;
    if (strike && S.stepMark !== i + "|" + Math.round((p - q) / TAU)) {
      S.stepMark = i + "|" + Math.round((p - q) / TAU);
      const phi = 4 - 16 * Math.cos(q); S.walkDust.push({ born: t, x: HIP[i][0] + 275 * Math.sin(rad(phi)) + 52 });
    }
  }
}

const def: CharacterDef = {
  ...tinker,
  id: 'tinker',
  grid: [58, 40],
  facing: 'right',
  durations: {"idle":4,"walk":2,"cheer":3,"hurt":1.5},
  texture: { regular: 'art/tinker/cut.webp' },
};
export default finishDef(def);
