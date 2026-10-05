// Shared kit for the act 2 cast (inlined into each template at __KIT__ by that asset's build.py).
// Needs before it: const { smooth, band, rad, rot } = Rig; and const IMG = "__IMG__".
const clamp = v => Math.min(1, Math.max(0, v)), ease = v => v * v * (3 - 2 * v);
const kf = (u, T, V) => { if (u <= T[0]) return V[0]; for (let i = 1; i < T.length; i++) if (u <= T[i]) return V[i - 1] + (V[i] - V[i - 1]) * ease((u - T[i - 1]) / (T[i] - T[i - 1])); return V[V.length - 1]; };
const flashK = c => c < 0.05 ? 0.18 : c < 0.085 ? 0.1 : c < 0.12 ? 0.04 : 0;   // hit flash: at most 0.25, three frames, body only (shader flash)
const INK = "#14100C", STEAM1 = "#9FB4BB", STEAM2 = "#E8EEF0", AMBER = "#FFB547", CREAM = "#FFE2A8";
function seeded(seed) { return () => (seed = (seed * 9301 + 49297) % 233280) / 233280; }
// Nearest point on a polyline: { d: distance, i: segment, t: 0..1 along it, s: i + t }.
function chainDist(x, y, pts) {
  let best = 1e9, bi = 0, bt = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / L)), d = Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
    if (d < best) { best = d; bi = i; bt = t; }
  }
  return { d: best, i: bi, t: bt, s: bi + bt };
}
// ---- Ink effects: flat shapes, dark edge, two tones, stepped alpha. ----
function stepA(a) { return a < 0.5 ? 1 : a < 0.8 ? 0.65 : 0.35; }
function lumpPuff(c, x, y, r, a, tones, edge) {
  const lumps = [[0, 0, 1], [-0.62, 0.18, 0.62], [0.55, 0.2, 0.58], [0.05, -0.52, 0.52]].map(([ox, oy, k]) => [x + ox * r, y + oy * r, r * k]);
  c.globalAlpha = stepA(a);
  c.fillStyle = INK; for (const [lx, ly, lr] of lumps) { c.beginPath(); c.arc(lx, ly, lr + (edge || 5), 0, 2 * Math.PI); c.fill(); }
  c.fillStyle = tones[0]; for (const [lx, ly, lr] of lumps) { c.beginPath(); c.arc(lx, ly, lr, 0, 2 * Math.PI); c.fill(); }
  c.fillStyle = tones[1]; for (const [lx, ly, lr] of lumps) { c.beginPath(); c.arc(lx - lr * 0.14, ly - lr * 0.16, lr * 0.82, 0, 2 * Math.PI); c.fill(); }
  c.globalAlpha = 1;
}
function spawnPuff(S, t, x, y, o) { o = o || {}; (S.puffs = S.puffs || []).push({ born: t, x, y, vx: o.vx !== undefined ? o.vx : (Math.random() - 0.5) * 40, vy: o.vy !== undefined ? o.vy : -(60 + Math.random() * 50), r: o.r || 24 + Math.random() * 12, life: o.life || 1.0 + Math.random() * 0.4, tones: o.tones || [STEAM1, STEAM2] }); }
function drawPuffs(c, S, t) {
  S.puffs = (S.puffs || []).filter(p => t - p.born < p.life);
  for (const p of S.puffs) { const d = t - p.born, a = d / p.life; lumpPuff(c, p.x + p.vx * d, p.y + p.vy * d, p.r * (0.55 + 1.0 * a), a, p.tones); }
}
function spawnSpark(S, t, x, y, n, spd) { S.sparks = S.sparks || []; for (let i = 0; i < n; i++) { const an = Math.random() * 2 * Math.PI, v = (spd || 400) * (0.4 + Math.random() * 0.6); S.sparks.push({ born: t, x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v - 120, life: 0.35 + Math.random() * 0.25 }); } }
function drawSparks(c, S, t) {
  S.sparks = (S.sparks || []).filter(s => t - s.born < s.life);
  for (const s of S.sparks) {
    const d = t - s.born, a = d / s.life, x = s.x + s.vx * d, y = s.y + s.vy * d + 900 * d * d, an = Math.atan2(s.vy + 1800 * d, s.vx), L = 15 * (1 - a * 0.5);
    c.globalAlpha = stepA(a); c.lineCap = "round";
    c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.cos(an) * L, y - Math.sin(an) * L); c.stroke();
    c.strokeStyle = AMBER; c.lineWidth = 3.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.cos(an) * L, y - Math.sin(an) * L); c.stroke();
    c.globalAlpha = 1;
  }
}
function spawnRing(S, t, x, y, r, life) { (S.rings = S.rings || []).push({ born: t, x, y, r, life: life || 0.5 }); }
function drawRings(c, S, t) {
  S.rings = (S.rings || []).filter(r => t - r.born < r.life);
  for (const r of S.rings) { const a = (t - r.born) / r.life, rx = 10 + r.r * a; c.globalAlpha = stepA(a); for (const [col, lw] of [[INK, 8], [STEAM1, 4]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.ellipse(r.x, r.y, rx, rx * 0.26, 0, 0, 2 * Math.PI); c.stroke(); } c.globalAlpha = 1; }
}
function spawnStar(S, t, x, y, r) { (S.bursts = S.bursts || []).push({ born: t, x, y, r }); }
function drawStars(c, S, t) {
  S.bursts = (S.bursts || []).filter(b => t - b.born < 0.28);
  for (const b of S.bursts) {
    const a = (t - b.born) / 0.28, R = b.r * (0.6 + 0.7 * ease(a)); c.globalAlpha = a < 0.6 ? 1 : 0.6; c.lineJoin = "miter";
    for (const [k, col, lw] of [[1, AMBER, 3], [0.55, STEAM2, 0]]) {
      c.beginPath(); for (let i = 0; i < 16; i++) { const an = i / 16 * 2 * Math.PI, rr = (i % 2 ? 0.45 : 1 + 0.25 * ((i * 7) % 3 - 1)) * R * k; i ? c.lineTo(b.x + Math.cos(an) * rr, b.y + Math.sin(an) * rr) : c.moveTo(b.x + Math.cos(an) * rr, b.y + Math.sin(an) * rr); }
      c.closePath(); c.fillStyle = col; c.fill(); if (lw) { c.strokeStyle = INK; c.lineWidth = lw; c.stroke(); }
    }
    c.globalAlpha = 1;
  }
}
// A smear: a crescent following a path of points (the weapon's path), 3 to 4 frames. spawnSmear(S, t, [[x,y]...], width).
function spawnSmear(S, t, pts, w) { (S.smears = S.smears || []).push({ born: t, pts, w: w || 40 }); }
function drawSmears(c, S, t) {
  S.smears = (S.smears || []).filter(s => t - s.born < 0.14);
  for (const s of S.smears) {
    const a = (t - s.born) / 0.14, n = s.pts.length; c.globalAlpha = a < 0.35 ? 1 : a < 0.7 ? 0.6 : 0.3;
    const edge = k => {
      c.beginPath();
      for (let i = 0; i < n; i++) {
        const [x, y] = s.pts[i], p0 = s.pts[Math.max(0, i - 1)], p1 = s.pts[Math.min(n - 1, i + 1)], f = Math.sin(Math.PI * (i + 0.5) / n) * s.w * k;
        const nx = p1[1] - p0[1], ny = -(p1[0] - p0[0]), L = Math.hypot(nx, ny) || 1, px = x + nx / L * f, py = y + ny / L * f; i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      for (let i = n - 1; i >= 0; i--) c.lineTo(s.pts[i][0], s.pts[i][1]);
      c.closePath();
    };
    edge(1.15); c.fillStyle = INK; c.fill(); edge(1); c.fillStyle = STEAM1; c.fill(); edge(0.5); c.fillStyle = STEAM2; c.fill();
    c.globalAlpha = 1;
  }
}
// Dust and debris: small flat ink-edged chips (rust or gray), thrown out and falling; never soft lumps.
function spawnDust(S, t, x, y, n, spd, dir) {
  S.chips = S.chips || [];
  for (let i = 0; i < n; i++) {
    const an = (dir !== undefined ? dir : -Math.PI / 2) + (Math.random() - 0.5) * 2.2, v = (spd || 380) * (0.4 + Math.random() * 0.6), rust = Math.random() < 0.5;
    S.chips.push({ born: t, x: x + (Math.random() - 0.5) * 30, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, r: 6 + Math.random() * 8, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 14, life: 0.55 + Math.random() * 0.3, tones: rust ? ["#8A4B2A", "#C97B3C"] : ["#5F686D", "#A7B1B5"], sides: 4 + (i % 2) });
  }
}
function drawDust(c, S, t) {
  S.chips = (S.chips || []).filter(p => t - p.born < p.life);
  for (const p of S.chips) {
    const d = t - p.born, a = d / p.life, x = p.x + p.vx * d, y = p.y + p.vy * d + 1100 * d * d, an0 = p.rot + p.spin * d;
    const poly = k => { c.beginPath(); for (let i = 0; i < p.sides; i++) { const an = an0 + i / p.sides * 2 * Math.PI, rr = (p.r * k) * (i % 2 ? 0.7 : 1); i ? c.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr) : c.moveTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } c.closePath(); };
    c.globalAlpha = stepA(a); c.lineJoin = "miter";
    poly(1.35); c.fillStyle = INK; c.fill(); poly(1); c.fillStyle = p.tones[0]; c.fill(); poly(0.5); c.fillStyle = p.tones[1]; c.fill();
    c.globalAlpha = 1;
  }
}
function drawFx(c, S, t) { drawRings(c, S, t); drawSmears(c, S, t); drawPuffs(c, S, t); drawDust(c, S, t); drawSparks(c, S, t); drawStars(c, S, t); }
// A small hard-edged ember: flat ink-edged disk, two tones, no airbrush.
function ember(c, x, y, r, a) { if (a <= 0) return; c.globalAlpha = Math.min(1, a); c.fillStyle = INK; c.beginPath(); c.arc(x, y, r + 2.5, 0, 2 * Math.PI); c.fill(); c.fillStyle = "#FF8A2A"; c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill(); c.fillStyle = CREAM; c.beginPath(); c.arc(x, y, r * 0.5, 0, 2 * Math.PI); c.fill(); c.globalAlpha = 1; }

// ---- Broken-look kit: a jagged notch erased from the painting's alpha (texture re-uploaded through the page's own WebGL context), a hard-edged two-tone ember edge and inside, thick ink cracks running out. ----
const imgEl = new Image(); imgEl.src = IMG;
let ALPHA = null;
function alphaAt(x, y) {
  if (!ALPHA) { if (!imgEl.complete || !imgEl.naturalWidth) return 0; const k = document.createElement("canvas"); k.width = imgEl.naturalWidth; k.height = imgEl.naturalHeight; const g = k.getContext("2d"); g.drawImage(imgEl, 0, 0); ALPHA = g.getImageData(0, 0, k.width, k.height); }
  x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= ALPHA.width || y >= ALPHA.height) return 0; return ALPHA.data[(y * ALPHA.width + x) * 4 + 3];
}
function jaggedBlob(cx, cy, r, n, j, seed) {
  const rnd = seeded(seed), pts = [];
  for (let i = 0; i < n; i++) { const an = i / n * 2 * Math.PI, rr = r * (i % 2 ? 1 - j * (0.4 + 0.6 * rnd()) : 1 + j * 0.5 * rnd()); pts.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr]); }
  return pts;
}
// DMG: id -> { poly: rest-pose points (scaled about their centroid by k, default 1.7, to cut a big chunk), c: crack origin, r, cracks, crack0, crackStep, seed }
function polyOf(d, k) {
  k = k === undefined ? (d.k || 1.7) : k;
  const n = d.poly.length, cx = d.poly.reduce((a, p) => a + p[0], 0) / n, cy = d.poly.reduce((a, p) => a + p[1], 0) / n;
  return d.poly.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
}
function syncBroken(S, W, H) {
  const ids = Object.keys(S.broken || {}).filter(k => S.broken[k] && DMG[k]).sort(), key = ids.join(",");
  if (S.bkKey === key || !imgEl.complete || !imgEl.naturalWidth) return;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  g.drawImage(imgEl, 0, 0); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000";
  for (const id of ids) { g.beginPath(); polyOf(DMG[id]).forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); }
  const gl = document.getElementById("stage").querySelectorAll("canvas")[1].getContext("webgl");
  gl.bindTexture(gl.TEXTURE_2D, gl.getParameter(gl.TEXTURE_BINDING_2D)); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  S.bkKey = key;
}
function urlBroken() { const o = {}; const q = new URLSearchParams(location.search).get("broken"); if (q) for (let k of q.split(",")) { k = k.trim(); if (k === "all") for (const id in DMG) o[id] = true; else o[k] = true; } return o; }
function drawBroken(c, at, S, t) {
  const bk = S.broken || {};
  for (const id in bk) {
    if (!bk[id] || !DMG[id]) continue;
    const d = DMG[id], poly = polyOf(d), rnd = seeded(d.seed || 3), pulse = 0.75 + 0.25 * Math.sin(t * 5 + d.seed);
    // 1. A thick ink rim on the painted side of the notch edge (so the bite reads as a dark broken edge).
    const segs = []; let cur = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4));
      for (let k = 0; k < n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n; if (alphaAt(x, y) > 128) cur.push([x, y]); else if (cur.length) { segs.push(cur); cur = []; } }
    }
    if (cur.length) segs.push(cur);
    c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = INK; c.lineWidth = 16;
    for (const s of segs) { c.beginPath(); s.forEach(([x, y], i) => { const p = at([x, y]); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.stroke(); }
    // 2. The ember sits inside the notch only: a flat two-tone blob well inside the hole, so the silhouette bite stays visible around it.
    const inner = polyOf(d, (d.k || 1.7) * 0.42), pts = inner.map(p => at(p));
    const blob = (k, col) => { const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length; c.beginPath(); pts.forEach(([x, y], i) => { const X = cx + (x - cx) * k, Y = cy + (y - cy) * k; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.closePath(); c.fillStyle = col; c.fill(); };
    c.lineJoin = "miter"; blob(1.18, INK); blob(1, pulse > 0.8 ? "#FF8A2A" : "#E0701F"); blob(0.55, CREAM);
    // 3. Thick ink cracks (about 3 to 4 px at 125 px tall) running out of the notch over the paint, with a bright core.
    const paths = [], R = (d.r || 30) * (d.k || 1.7) * 0.5;
    for (let k = 0; k < (d.cracks || 3); k++) {
      let an = (d.crack0 || 0) + k * (d.crackStep || 1.3) + rnd() * 0.4, x = d.c[0], y = d.c[1]; const pts2 = [];
      for (let s = 0; s < 16; s++) { an += (rnd() - 0.5) * 0.7; x += Math.cos(an) * 16; y += Math.sin(an) * 16; if (alphaAt(x, y) > 128 && s * 16 > R) pts2.push([x, y]); }
      if (pts2.length > 2) paths.push(pts2);
    }
    for (const [col, lw, off] of [[INK, 24, 0], [CREAM, 7, -2]]) {
      c.strokeStyle = col; c.lineWidth = lw; c.lineJoin = "miter";
      for (const pts2 of paths) { c.beginPath(); pts2.forEach(([x, y], i) => { const p = at([x, y]); i ? c.lineTo(p[0] + off, p[1] + off) : c.moveTo(p[0] + off, p[1] + off); }); c.stroke(); }
    }
  }
}
// Page chrome: mood buttons, break checkboxes (input[data-break]), "all" and mesh toggles.
function wire(rig) {
  window.rig = rig;
  document.querySelectorAll("button[data-mood]").forEach(b => b.addEventListener("click", () => { rig.setMood(b.dataset.mood); document.querySelectorAll("button[data-mood]").forEach(o => o.setAttribute("aria-pressed", o === b)); }));
  document.getElementById("mesh").addEventListener("change", e => { rig.showMesh = e.target.checked; });
  document.getElementById("ball").addEventListener("change", e => { rig.state.broken = rig.state.broken || {}; for (const id in DMG) rig.state.broken[id] = e.target.checked; document.querySelectorAll("input[data-break]").forEach(i => i.checked = e.target.checked); });
  document.querySelectorAll("input[data-break]").forEach(i => i.addEventListener("change", e => { rig.state.broken = rig.state.broken || {}; rig.state.broken[i.dataset.break] = e.target.checked; }));
}
