// @ts-nocheck
// boilermaker: converted from art/boilermaker/boilermaker.template.html by scripts/rig-convert.mjs, then fixed by hand (D-033).
// The rig code is the template's own (loose types on purpose: it is animation code, checked by looking at it);
// the typed surface is the CharacterDef export at the bottom. Mesh grid is half the template's.
import { band, finishDef, makeView, rad, rot, smooth } from './kit';
import type { CharacterDef } from './types';


const BASE = [450, 1095], NECK = [450, 350];
const SH_L = [325, 425], ELB_L = [255, 452], SH_R = [590, 425], HAND_R = [715, 540];
const EYES = [[420, 263], [470, 263]];
const CROWN = [[450, 64], [310, 255], [590, 255]];
const GAUGE = [448, 478], FURN = [448, 950], ORB = [140, 150];
const HEM = [[235, 990], [725, 990]];                    // low skirt corners: steam goes sideways from here
const SIDE_VENTS = [[275, 800], [615, 800], [235, 990], [725, 990]];
const clamp = v => Math.min(1, Math.max(0, v)), ease = v => v * v * (3 - 2 * v);
// Piecewise-linear lookup and smooth keyframes.
const pw = (v, pts) => { if (v <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (v <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (v - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
const kf = (u, T, V) => { if (u <= T[0]) return V[0]; for (let i = 1; i < T.length; i++) if (u <= T[i]) return V[i - 1] + (V[i] - V[i - 1]) * ease((u - T[i - 1]) / (T[i] - T[i - 1])); return V[V.length - 1]; };

const bR = y => (y < 800 ? 702 : 702 + (y - 800) * 0.26);   // tear line right of the coat, left of the staff
const BL = 225;                                             // tear line left of the coat, right of the scepter

let AV = null; // the hub view of the frame being drawn (puff() reads its last pose)
const queen = {
  size: [896, 1152], grid: [112, 144], pad: [150, 60],
  anchors: { "queen-crown": [445, 165, 115], "queen-scepter": [140, 150, 100], "queen-gauge": [448, 478, 62], "queen-furnace": [448, 950, 75], "queen-staff": [750, 185, 95], "queen-ember": [448, 880, 130], "queen-cinder": [715, 540, 75], core: [448, 590, 80], eyes: [445, 263, 40] },
  weights(x, y) {
    const w = {};
    const padL = (1 - smooth(0.7, 1.0, Math.hypot((x - 330) / 62, (y - 392) / 48))) * smooth(470, 440, y);
    const padR = (1 - smooth(0.7, 1.0, Math.hypot((x - 572) / 62, (y - 392) / 48))) * smooth(470, 440, y);
    const aS = pw(y, [[350, 255], [430, 335], [440, 335], [520, 250]]), bS = pw(y, [[350, 215], [430, 275], [440, 275], [520, 225]]);
    const aE = pw(y, [[350, 255], [430, 305], [440, 305], [520, 230]]), bE = pw(y, [[350, 215], [430, 245], [440, 245], [520, 225]]);
    w.S = smooth(aS, bS, x) * (1 - padL) * smooth(760, 735, y);   // whole left arm and scepter
    w.E = smooth(aE, bE, x) * (1 - padL) * smooth(760, 735, y);   // forearm, hand and scepter
    w.H = smooth(365, 340, y) * band(x, 292, 605, 12);            // hat, visor, neck
    const xa = y < 350 ? 640 : y < 480 ? 715 : y < 620 ? 645 : bR(y) - 6;
    w.st = smooth(xa, xa + (y < 350 ? 40 : y < 480 ? 10 : y < 620 ? 30 : 10), x) * smooth(925, 905, y);   // clock staff and the hand holding it
    w.A = smooth(595, 640, x) * smooth(375, 415, y) * smooth(600, 545, y) * (1 - padR);   // right sleeve
    w.chest = smooth(560, 440, y) * (1 - w.S) * (1 - w.st) * (1 - w.H);
    w.skirt = smooth(560, 640, y) * smooth(1030, 980, y) * (1 - w.S) * (1 - w.st);
    return w;
  },
  part(x, y) { return x < BL ? 1 : x > bR(y) ? 2 : 0; },
  tear(x, y) { return x < 400 ? (y > 505 && y < 745) : (y > 568 && y < 915); },
  deform(x, y, w, P) {
    [x, y] = rot(x, y, ...HAND_R, rad(P.staff), w.st);
    [x, y] = rot(x, y, ...SH_R, rad(P.armR), Math.max(w.A, w.st));
    [x, y] = rot(x, y, ...NECK, rad(P.head), w.H);
    y -= P.headLift * w.H;
    [x, y] = rot(x, y, ...ELB_L, rad(P.elb), w.E);
    [x, y] = rot(x, y, ...SH_L, rad(P.sh), w.S);
    y += P.scepY * w.E;
    y -= P.breath * 220 * w.chest;
    x = 450 + (x - 450) * (1 + P.breath * 0.6 * w.skirt);
    y = BASE[1] - (BASE[1] - y) * (1 + P.tall);
    [x, y] = rot(x, y, ...BASE, rad(P.lean), 1);
    return [x + P.step, y];
  },
  moods: { idle: { heat: 0.2 }, attack: { heat: 0.55 }, hurt: { heat: 0.3 }, phase: { heat: 0.4 }, death: { heat: 0 } },
  ease: 3,
  onMood(m, api) { const S = api.state; S.start = undefined; S.cycle = undefined; S.hit = undefined; S.burst = false; S.plume = false; S.dead = false; },
  pose(L, t, dt, S, mood, api = makeView(queen, mood, S)) {
    if (S.start === undefined) { S.start = t; S.puffs = []; S.sparks = []; S.shards = []; S.rings = []; S.bursts = []; S.acc = 0; S.broken = S.broken || {}; }
    AV = api;
    const u = t - S.start, br = Math.sin(t * Math.PI * 2 / 4);
    const P = { head: 2 * Math.sin(t * Math.PI * 2 / 4 + 0.6), headLift: 0, sh: 1.3 * Math.sin(t * Math.PI * 2 / 4 + 1.2), elb: 1.2 * Math.sin(t * Math.PI * 2 / 4 + 0.7), scepY: 0,
                staff: 0.5 * Math.sin(t * 1.3), armR: 0.9 * Math.sin(t * Math.PI * 2 / 4 + 0.4), lean: 0.5 * Math.sin(t * Math.PI * 2 / 8), tall: 0.004 * br, step: 0,
                breath: 0.028 * br, flash: 0, shake: null, fur: 0 };
    let heatBoost = 0, jet = 0;
    const m = api.mood;
    if (m === "attack") {
      const c = u % 2.8, T = [0, 0.9, 1.06, 1.19, 2.0, 2.8];
      P.sh = kf(c, T, [0, 20, -10, -10, -3, 0]); P.elb = kf(c, T, [0, -24, 14, 14, 4, 0]); P.scepY = kf(c, T, [0, -22, 28, 28, 6, 0]);
      P.lean = kf(c, T, [0, -4, 4.5, 4.5, 1, 0]); P.head = kf(c, T, [0, -3, 6, 6, 1.5, 0]); P.headLift = kf(c, T, [0, 5, -3, -3, 0, 0]);
      P.tall = kf(c, T, [0, 0.015, -0.035, -0.035, 0, 0]); P.armR = kf(c, T, [0, -2, -1, -1, 0, 0]); P.staff = kf(c, T, [0, -1, 1.5, 1, 0, 0]);
      P.fur = kf(c, T, [0, 0.6, 1, 0.6, 0.2, 0]); heatBoost = 0.35 * P.fur;
      if (c >= 1.06) { const d = Math.exp(-(c - 1.06) * 7); P.shake = [(Math.random() - 0.5) * 20 * d, (Math.random() - 0.5) * 12 * d]; }
      const cyc = Math.floor((u - 1.06) / 2.8);
      if (u >= 1.06 && S.cycle !== cyc && c >= 1.06 && c < 1.3) {
        S.cycle = cyc;
        for (const v of HEM) for (let i = 0; i < 9; i++) S.puffs.push(puff(t, [v[0], v[1] - Math.random() * 30], { vx: (v[0] < 450 ? -1 : 1) * (240 + Math.random() * 260), vy: -30 - Math.random() * 70, r: 30 + Math.random() * 20, life: 0.9 + Math.random() * 0.5, hot: true }));
        S.rings.push({ born: t, at: [450, 1090] });
        for (let i = 0; i < 8; i++) S.sparks.push(spark(t, [450 + (Math.random() - 0.5) * 380, 1080], 20, 0.6));
      }
    } else if (m === "hurt") {
      const c = u % 1.8, T = [0, 0.08, 0.25, 0.7, 1.8];
      P.flash = c < 0.1 ? 0.25 : 0;   // 3 frames at most
      P.lean = kf(c, T, [0, -8, -6, 0, 0]); P.head = kf(c, T, [0, 15, 9, 0, 0]); P.headLift = kf(c, T, [0, -3, -2, 0, 0]);
      P.sh = kf(c, T, [0, -9, -4, 0, 0]); P.elb = kf(c, T, [0, 11, 5, 0, 0]); P.armR = kf(c, T, [0, -5, -2, 0, 0]);
      P.tall = kf(c, T, [0, -0.02, -0.01, 0, 0]); P.step = kf(c, T, [0, 26, 22, 0, 0]); P.staff = 2.5 * Math.exp(-c * 5) * Math.sin(c * 28);
      const d = Math.exp(-c * 6); P.shake = [(Math.random() - 0.5) * 10 * d, (Math.random() - 0.5) * 6 * d];
      if (S.hit !== Math.floor(u / 1.8)) { S.hit = Math.floor(u / 1.8); S.bursts.push({ born: t, at: GAUGE, r: 60 }); for (let i = 0; i < 10; i++) S.sparks.push(spark(t, GAUGE, 60, 0.8)); }
    } else if (m === "phase") {
      const c = Math.min(u, 3.999);
      const T = [0, 0.45, 0.63, 1.7, 2.6, 3.3, 4];
      P.lean = kf(c, T, [0, -1.5, -7, -6, -1, 0, 0]) + (c > 0.45 ? 2 * Math.sin((c - 0.45) * 11) * Math.exp(-(c - 0.45) * 4) : 0);
      P.head = kf(c, T, [0, 0, 12, 10, 2, 0, 0]); P.headLift = kf(c, T, [0, 0, -4, -4, 0, 4, 4]); P.sh = kf(c, T, [0, 0, -6, -6, -1, 0, 0]); P.elb = kf(c, T, [0, 0, 8, 8, 1, 0, 0]);
      P.tall = kf(c, T, [0, 0, -0.02, -0.02, 0.01, 0.04, 0.04]); P.armR = kf(c, T, [0, 0, 3, 3, 0, 0, 0]);
      if (c < 0.45) { const e = ease(c / 0.45); heatBoost = 0.2 * e; P.shake = [(Math.random() - 0.5) * 4 * e, (Math.random() - 0.5) * 3 * e]; }
      else {
        if (!S.burst) { S.burst = true; for (let i = 0; i < 16; i++) S.shards.push(shard(t, i)); for (let i = 0; i < 12; i++) S.sparks.push(spark(t, GAUGE, 40, 0.7)); S.flashT = t; S.bursts.push({ born: t, at: GAUGE, r: 95 }); }
        const b = c - 0.45, d = Math.exp(-b * 4);
        P.flash = 0;
        P.shake = [(Math.random() - 0.5) * 16 * d, (Math.random() - 0.5) * 10 * d];
        jet = c < 1.7 ? Math.exp(-b * 1.5) : 0;
        if (c >= 1.7 && !S.plume) { S.plume = true; for (let i = 0; i < 20; i++) S.puffs.push(puff(t, CROWN[i % 3], { vx: (Math.random() - 0.5) * 120, vy: -120 - Math.random() * 120, r: 34 + Math.random() * 20, life: 1.2 + Math.random() * 0.6, hot: true })); }
        heatBoost = 0.25 + 0.45 * ease(clamp((c - 1.8) / 1.2));
      }
    }
    if (m === "death") {
      // Her fire goes out: a last burst from the gauge and crown, then she folds forward and the light drains from the plates.
      const c = Math.min(u, 3.999), T = [0, 0.15, 0.5, 1.5, 2.6, 4];
      P.flash = c < 0.1 ? 0.2 : 0;
      P.lean = kf(c, T, [0, 5, 3, -8, -12, -12]); P.head = kf(c, T, [0, 12, 8, 16, 24, 24]); P.headLift = kf(c, T, [0, -3, -3, -8, -12, -12]);
      P.sh = kf(c, T, [0, -8, -4, 6, 10, 10]); P.elb = kf(c, T, [0, 10, 6, -4, -8, -8]); P.armR = kf(c, T, [0, -4, -2, 3, 6, 6]);
      P.tall = kf(c, T, [0, -0.02, -0.015, -0.06, -0.09, -0.09]); P.staff = kf(c, T, [0, 2, 1, -3, -5, -5]);
      if (c < 0.7) { const d = Math.exp(-c * 5); P.shake = [(Math.random() - 0.5) * 14 * d, (Math.random() - 0.5) * 8 * d]; }
      if (!S.dead) { S.dead = true; for (let i = 0; i < 14; i++) S.sparks.push(spark(t, GAUGE, 50, 0.7)); S.bursts.push({ born: t, at: GAUGE, r: 70 });
        for (let i = 0; i < 16; i++) S.puffs.push(puff(t, CROWN[i % 3], { vx: (Math.random() - 0.5) * 140, vy: -110 - Math.random() * 110, r: 32 + Math.random() * 18, life: 1.3 + Math.random() * 0.6 })); }
      heatBoost = -0.2 * ease(clamp(c / 2.4));
      const k = 1 - 0.42 * ease(clamp((c - 0.5) / 1.8));
      P.tint = [k, 0, 0, 0, k, 0, 0, 0, k * 1.04, 0, 0, 0];
    }
    P.heat = clamp(L.heat + heatBoost);
    S.acc += dt * (0.5 + 4 * P.heat);
    while (S.acc > 1) {
      S.acc -= 1; const pool = Math.random() < 0.5 ? CROWN : SIDE_VENTS, v = pool[Math.floor(Math.random() * pool.length)];
      S.puffs.push(puff(t, v, { spread: 0.6 + P.heat, side: pool === SIDE_VENTS ? (v[0] < 450 ? -1 : 1) : 0 }));
    }
    // Chest jets: two plumes out and up past either side of the head, never through it.
    if (jet > 0.05) for (const sx of [-1, 1]) for (let i = 0; i < 2; i++)
      S.puffs.push(puff(t, GAUGE, { vx: sx * (270 + Math.random() * 90), vy: -(220 + Math.random() * 80), r: 22 + Math.random() * 14, life: 0.7 + Math.random() * 0.3, hot: true }));
    P.flick = 0.88 + 0.12 * Math.sin(t * 23) * Math.sin(t * 7.3);
    P.t = t;
    return P;
  },
  under(c, P, t, api) {
    c.fillStyle = "rgba(0,0,0,0.38)"; c.beginPath(); c.ellipse(450 + P.step, 1100, 330, 24, 0, 0, 2 * Math.PI); c.fill();
  },
  over(c, P, t, api) {
    AV = api;
    const S = api.state, at = p => api.point(p[0], p[1], P), H = P.heat, f = P.flick;
    c.globalCompositeOperation = "lighter";
    const pulse = 1 + 0.2 * Math.sin(t * Math.PI) * (0.5 + H);
    glow(c, at(FURN), 105, [255, 130, 40], (0.15 + 0.6 * H + 0.5 * P.fur) * f * pulse);
    glow(c, at(FURN), 40, [255, 220, 150], (0.12 + 0.5 * H + 0.4 * P.fur) * f * pulse);
    glow(c, at([450, 790]), 60, [255, 150, 60], (0.05 + 0.2 * H) * f);
    if (S.broken && S.broken["queen-gauge"]) glow(c, at(GAUGE), 45, [255, 90, 20], 0.12 + 0.2 * H); else glow(c, at(GAUGE), 48, [255, 170, 70], 0.08 + 0.18 * H);
    for (const e of EYES) glow(c, at(e), 20, [255, 190, 80], (0.2 + 0.7 * H) * f);
    const gl = Math.max(0, Math.sin(t * 1.9)) ** 6;
    glow(c, at(ORB), 60, [255, 190, 90], 0.08 + 0.12 * H + 0.22 * gl);
    if (gl > 0.2) glow(c, at([ORB[0] - 30, ORB[1] - 30]), 22, [255, 255, 235], 0.7 * gl);
    S.sparks = (S.sparks || []).filter(s => t - s.born < s.life);
    for (const s of S.sparks) {
      const d = t - s.born, a = d / s.life, x = s.x + s.vx * d, y = s.y + s.vy * d + 420 * d * d;
      c.strokeStyle = `rgba(255,${180 + 60 * (1 - a)},90,${1 - a})`; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - s.vx * 0.03, y - s.vy * 0.03); c.stroke();
    }
    c.globalCompositeOperation = "source-over";
    // Flat ink-edged steam: lumpy circles, two tones, alpha stepped as they age.
    S.rings = (S.rings || []).filter(r => t - r.born < 0.55);
    for (const r of S.rings) {
      const a = (t - r.born) / 0.55, p = at(r.at); c.globalAlpha = a < 0.5 ? 1 : 0.5;
      for (const [col, lw] of [["#14100C", 7], ["#E8EEF0", 3.5]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.ellipse(p[0], p[1], 80 + 320 * a, 14 + 40 * a, 0, 0, 2 * Math.PI); c.stroke(); }
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
    // Impact bursts: a jagged ink-edged star in palette colors.
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
    // Broken parts (api.state.broken = {gauge: true}): painted-looking damage at the anchor, in every mood.
    const bk = S.broken || {};
    for (const id in bk) { if (!bk[id]) continue; const a = queen.anchors[id]; if (a) crack(c, at([a[0], a[1]]), a[2], id); }
    // Glass and brass shards, short travel, drawn last so they sit in front.
    S.shards = (S.shards || []).filter(s => t - s.born < s.life);
    for (const s of S.shards) {
      const d = t - s.born, a = d / s.life, x = s.x + s.vx * d, y = s.y + s.vy * d + 600 * d * d;
      c.save(); c.translate(x, y); c.rotate(s.rot + s.spin * d); c.globalAlpha = 1 - a * a;
      c.fillStyle = s.brass ? "#C9A24A" : "rgba(210,232,236,0.8)"; c.strokeStyle = "#14100C"; c.lineWidth = 2; c.lineJoin = "round";
      c.beginPath(); c.moveTo(-s.sz, -s.sz * 0.3); c.lineTo(s.sz * 0.8, -s.sz * 0.6); c.lineTo(s.sz * 0.3, s.sz); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
  },
};
// Deterministic jagged damage drawn to the part's size: missing chunks with an ember interior, ink cracks with a bright edge, loose glass facets.
const CRACK_ASPECT = { gauge: 0.8, furnace: 0.8, eyes: 0.5 };
function crack(c, [x, y], r, id) {
  const ry = r * (CRACK_ASPECT[id] || 1);
  let seed = 7; for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  c.save(); c.translate(x, y);
  c.beginPath(); c.ellipse(0, 0, r * 0.95, ry * 0.95, 0, 0, 2 * Math.PI); c.clip();
  const E = (px, py) => [px * r, py * ry];
  // Missing chunks: dark interior with an ember glow behind.
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, "rgba(255,120,40,0.55)"); g.addColorStop(0.5, "rgba(120,40,16,0.4)"); g.addColorStop(1, "rgba(20,10,6,0)");
  const chunk = (cx, cy, rad, n) => {
    c.beginPath();
    for (let i = 0; i < n; i++) { const an = i / n * 2 * Math.PI, rr = rad * (0.55 + 0.6 * rnd()); const [px, py] = E(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.closePath(); c.fillStyle = "rgba(18,10,6,0.96)"; c.fill(); c.fillStyle = g; c.fill();
    c.strokeStyle = "rgba(255,170,80,0.9)"; c.lineWidth = 2; c.lineJoin = "round"; c.stroke();
  };
  chunk(-0.05, 0.0, 0.42, 9); chunk(0.5, -0.35, 0.22, 6); chunk(-0.45, 0.42, 0.2, 6);
  // Loose glass facets left in the frame.
  c.fillStyle = "rgba(220,236,240,0.2)"; c.strokeStyle = "rgba(14,10,8,0.8)"; c.lineWidth = 2;
  for (const [a0, a1] of [[-2.6, -1.9], [0.3, 1.0], [2.1, 2.8]]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(...E(Math.cos(a0) * 0.9, Math.sin(a0) * 0.9)); c.lineTo(...E(Math.cos(a1) * 0.9, Math.sin(a1) * 0.9)); c.closePath(); c.fill(); c.stroke(); }
  // Jagged cracks: dark ink line with a bright edge beside it.
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
// A puff starts at the current deformed position of a painting point, then drifts in image space.
// Options: vx, vy (explicit velocity), r, life, hot, or spread/side for ambient wisps.
function puff(born, [x, y], o = {}) {
  const P = AV && AV.lastP;
  if (P) [x, y] = queen.deform(x, y, queen.weights(x, y), P);
  const sp = o.spread || 1;
  const vx = o.vx !== undefined ? o.vx : (o.side ? o.side * (30 + Math.random() * 50) : 0) + (Math.random() - 0.5) * 60 * sp;
  const vy = o.vy !== undefined ? o.vy : -(40 + Math.random() * 70 * sp);
  return { x: x + (Math.random() - 0.5) * 12, y, vx, vy, r: o.r || 20 + Math.random() * 16 * sp, born, life: o.life || 1.4 + Math.random() * 0.8, hot: o.hot, lumps: [[0, 0, 1], [-0.55, 0.15, 0.62 + Math.random() * 0.15], [0.5, 0.2, 0.55 + Math.random() * 0.2], [0.05, -0.5, 0.5 + Math.random() * 0.15]] };
}
function spark(t, [cx, cy], spread, k) {
  const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = (260 + Math.random() * 360) * k;
  return { x: cx + (Math.random() - 0.5) * spread, y: cy + (Math.random() - 0.5) * spread, vx: Math.cos(a) * v, vy: Math.sin(a) * v, born: t, life: 0.4 + Math.random() * 0.3 };
}
function shard(t, i) {
  const a = Math.random() * 2 * Math.PI, v = 130 + Math.random() * 190;
  return { x: GAUGE[0] + Math.cos(a) * 25, y: GAUGE[1] + Math.sin(a) * 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90, born: t, life: 0.5 + Math.random() * 0.35,
           rot: Math.random() * 6, spin: (Math.random() - 0.5) * 16, sz: 7 + Math.random() * 10, brass: i % 3 === 0 };
}

const def: CharacterDef = {
  ...queen,
  id: 'boilermaker',
  grid: [57, 73],
  facing: 'front',
  durations: { idle: 4, attack: 2.8, hurt: 1.8, phase: 4, death: 4 },
  texture: { regular: 'art/boilermaker/cut.webp' },
};
export default finishDef(def);
