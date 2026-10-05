// The title's code ambience (B10d.1): chimney steam, lamp and window flicker, the two clock faces' glow, embers and slow wisps,
// drawn on a transparent canvas over the painting (art/title/source@2x.png, shipped as public/art/title/painting.webp). Ported from
// the signed-off sample art/title/title.template.html; every motion is a pure function of t, periodic over 12 seconds.
// Positions are in painting units (1216x832) and were measured on the painting (art/title/rig.json).

export const TITLE_SIZE: [number, number] = [1216, 832];
/** The tower's region on the painting, [x0, y0, x1, y1]: the layout keeps every control off it. */
export const TITLE_TOWER: [number, number, number, number] = [500, 35, 760, 832];
/** The painting's focal point (the tower's heart): cover-fit places it at the viewport's 52% across, 42% down. */
export const TITLE_FOCUS: [number, number] = [630, 330];

const ANCHORS = {
  clockL: [572, 195, 30],
  clockR: [673, 193, 34],
  gearGlow: [667, 300, 20],
  windows: [
    [525, 452, 14, 'cyan'],
    [545, 543, 12, 'white'],
    [630, 606, 22, 'amber'],
    [670, 606, 20, 'amber'],
    [582, 300, 12, 'amber'],
    [660, 365, 16, 'amber'],
    [704, 690, 18, 'cyan'],
    [498, 730, 12, 'cyan'],
    [1030, 762, 14, 'cyan'],
    [880, 750, 10, 'amber'],
    [420, 700, 8, 'amber'],
    [330, 705, 8, 'amber'],
    [985, 700, 8, 'amber'],
    [790, 735, 9, 'amber'],
  ] as [number, number, number, string][],
  vents: [
    [206, 592, 1.0],
    [452, 530, 1.1],
    [365, 585, 0.9],
    [1003, 640, 0.8],
    [505, 440, 0.7],
  ] as [number, number, number][],
};

/** Where the painting sits for a viewport: cover-fit, the focal point near 52% / 42%, clamped so it always covers. */
export function titleView(W: number, H: number): { s: number; ox: number; oy: number } {
  const [IW, IH] = TITLE_SIZE;
  const s = Math.max(W / IW, H / IH);
  const ox = Math.min(0, Math.max(W - IW * s, W * 0.52 - TITLE_FOCUS[0] * s));
  const oy = Math.min(0, Math.max(H - IH * s, H * 0.42 - TITLE_FOCUS[1] * s));
  return { s, ox, oy };
}

const TAU = Math.PI * 2;
const P = 12;
const w_ = (k: number): number => (TAU * k) / P;
const sm = (a: number, b: number, x: number): number => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
function mulberry(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function mk(w: number, h: number, fn: (g: CanvasRenderingContext2D, w: number, h: number) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (g) fn(g, w, h);
  return c;
}
const COL: Record<string, string> = { amber: 'rgba(255,181,71,A)', cyan: 'rgba(63,209,194,A)', white: 'rgba(255,244,214,A)', clock: 'rgba(255,226,150,A)' };

/** Starts the ambience on `cv` (sized by CSS to the viewport); returns `stop` and `resize`. */
export function startTitleAmbience(cv: HTMLCanvasElement, opts: { still?: boolean } = {}): { stop(): void; resize(): void } {
  const ctx = cv.getContext('2d');
  if (!ctx) return { stop() {}, resize() {} };
  const [IW, IH] = TITLE_SIZE;
  let W = 0;
  let H = 0;
  let DPR = 1;
  const resize = (): void => {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth || window.innerWidth;
    H = cv.clientHeight || window.innerHeight;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
  };
  resize();

  const rw = mulberry(21);
  const wispSprites = [0, 1, 2, 3].map((k) =>
    mk(512, 160, (g, w, h) => {
      g.filter = 'blur(10px)';
      const n = 7 + k;
      for (let i = 0; i < n; i++) {
        const cx = w * (0.15 + (0.7 * i) / (n - 1));
        const cy = h * (0.5 + (rw() - 0.5) * 0.25);
        const rx = 50 + rw() * 60;
        const ry = 14 + rw() * 14;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rx);
        gr.addColorStop(0, 'rgba(255,255,255,.9)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.save();
        g.translate(cx, cy);
        g.scale(1, ry / rx);
        g.translate(-cx, -cy);
        g.fillStyle = gr;
        g.beginPath();
        g.arc(cx, cy, rx, 0, 7);
        g.fill();
        g.restore();
      }
    }),
  );
  const tint: Record<string, HTMLCanvasElement> = {};
  const wispTinted = (k: number, color: string): HTMLCanvasElement =>
    (tint[k + color] ??= mk(512, 160, (g, w, h) => {
      g.drawImage(wispSprites[k], 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = color;
      g.fillRect(0, 0, w, h);
    }));
  const puff = mk(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(232,238,240,1)');
    gr.addColorStop(0.55, 'rgba(232,238,240,.55)');
    gr.addColorStop(1, 'rgba(232,238,240,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const glowSpr: Record<string, HTMLCanvasElement> = {};
  const glowFor = (color: string): HTMLCanvasElement =>
    (glowSpr[color] ??= mk(128, 128, (g, w, h) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, color.replace('A', '1'));
      gr.addColorStop(0.25, color.replace('A', '.55'));
      gr.addColorStop(1, color.replace('A', '0'));
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }));

  const WIND = 9;
  const STEAM_LIFE = 6;
  const puffs: { v: number[]; off: number; jx: number; vx: number; vy: number; r0: number; g: number; a: number; ph: number }[] = [];
  ANCHORS.vents.forEach((v, j) => {
    const r = mulberry(1000 + j);
    const N = Math.round(18 * v[2]);
    for (let n = 0; n < N; n++)
      puffs.push({ v, off: n / N + (r() - 0.5) * 0.02, jx: (r() - 0.5) * 4, vx: WIND * (0.5 + r() * 0.5), vy: -(14 + r() * 8) * v[2], r0: 4 + r() * 3, g: 6 + r() * 5, a: 0.4 + r() * 0.2, ph: r() * TAU });
  });
  const embers: { off: number; life: number; x0: number; y0: number; vx: number; vy: number; r: number; ph: number; tw: number; hot: boolean }[] = [];
  {
    const r = mulberry(555);
    for (let i = 0; i < 55; i++) embers.push({ off: r(), life: i % 2 ? 6 : 12, x0: -20 + r() * (IW + 40), y0: IH * (0.5 + r() * 0.5), vx: 6 + r() * 10, vy: -(5 + r() * 9), r: 0.8 + r() * 1.6, ph: r() * TAU, tw: 1 + Math.floor(r() * 4), hot: r() < 0.6 });
  }
  const rnd = mulberry(7);
  const lamps = ANCHORS.windows.map((w, i) => ({ x: w[0], y: w[1], r: w[2], kind: w[3], ph: rnd() * TAU, k1: 3 + Math.floor(rnd() * 4), k2: 10 + Math.floor(rnd() * 11), k3: 30 + Math.floor(rnd() * 8), slow: i % 3 === 1, off: rnd() }));
  const wisps: { x0: number; y: number; k: number; c: string; sc: number; A: number; a: number; ph: number }[] = [];
  {
    const r = mulberry(99);
    const cols = ['#FFF1D2', '#F2A65A', '#1F6F6B', '#FFF1D2', '#F2A65A'];
    for (let i = 0; i < 9; i++) {
      const depth = 0.4 + r() * 0.9;
      wisps.push({ x0: r() * (IW + 400) - 300, y: 40 + r() * 520, k: i % 4, c: cols[i % cols.length], sc: 0.9 + depth * 1.1, A: 40 + depth * 70, a: 0.1 + r() * 0.1, ph: r() * TAU });
    }
  }
  const lampLevel = (l: (typeof lamps)[number], t: number): number => {
    let v = 0.72 + 0.16 * Math.sin(w_(l.k1) * t + l.ph) + 0.1 * Math.sin(w_(l.k2) * t + l.ph * 2.3) + 0.05 * Math.sin(w_(l.k3) * t + l.ph * 5);
    if (l.slow) {
      const u = (t / P + l.off) % 1;
      v *= 0.1 + 0.9 * sm(0, 0.06, u) * (1 - sm(0.6, 0.66, u));
    }
    return Math.max(0, v);
  };

  const draw = (t: number): void => {
    const { s, ox, oy } = titleView(W, H);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    ctx.setTransform(DPR * s, 0, 0, DPR * s, DPR * ox, DPR * oy);
    for (const w of wisps) {
      ctx.globalAlpha = w.a * (0.8 + 0.2 * Math.sin(w_(1) * t + w.ph));
      ctx.drawImage(wispTinted(w.k, w.c), w.x0 + w.A * Math.sin(w_(1) * t + w.ph), w.y + Math.sin(w_(1) * t + w.ph * 2) * 6, 512 * w.sc, 160 * w.sc);
    }
    for (const p of puffs) {
      const u = (((t / STEAM_LIFE + p.off) % 1) + 1) % 1;
      const age = u * STEAM_LIFE;
      const x = p.v[0] + p.jx + p.vx * age * 1.15 + Math.sin(TAU * u * 2 + p.ph) * 3;
      const y = p.v[1] + p.vy * age * (1 - 0.09 * age);
      const r = (p.r0 + p.g * age * 0.8) * p.v[2];
      ctx.globalAlpha = p.a * sm(0, 0.12, u) * (1 - sm(0.35, 1, u)) * 0.85;
      ctx.drawImage(puff, x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lamps) {
      const R = l.r * 2.6;
      ctx.globalAlpha = Math.min(1, lampLevel(l, t) * 0.85);
      ctx.drawImage(glowFor(COL[l.kind] ?? COL.amber), l.x - R, l.y - R, R * 2, R * 2);
    }
    for (const id of ['clockL', 'clockR'] as const) {
      const c = ANCHORS[id];
      const R = c[2] * 2.1;
      ctx.globalAlpha = (0.5 + 0.2 * Math.sin(w_(1) * t + (id === 'clockR' ? 1.4 : 0)) + 0.06 * Math.sin(w_(4) * t)) * 0.7;
      ctx.drawImage(glowFor(COL.clock), c[0] - R, c[1] - R, R * 2, R * 2);
    }
    {
      const c = ANCHORS.gearGlow;
      const R = c[2] * 2.4;
      ctx.globalAlpha = 0.45 + 0.25 * Math.sin(w_(2) * t);
      ctx.drawImage(glowFor(COL.amber), c[0] - R, c[1] - R, R * 2, R * 2);
    }
    for (const e of embers) {
      const u = (t / e.life + e.off) % 1;
      const age = u * e.life;
      const x = e.x0 + e.vx * age + Math.sin(TAU * u * 2 + e.ph) * 5;
      const y = e.y0 + e.vy * age;
      ctx.globalAlpha = sm(0, 0.15, u) * (0.6 + 0.4 * Math.sin(w_(e.tw * 3) * t + e.ph)) * (e.hot ? 0.9 : 0.45) * (1 - sm(0.6, 1, u));
      ctx.fillStyle = e.hot ? '#FFB547' : '#E8EEF0';
      ctx.beginPath();
      ctx.arc(x, y, e.r, 0, 7);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  };

  let T = 0;
  let last = 0;
  let raf = 0;
  let stopped = false;
  const loop = (now: number): void => {
    if (stopped) return;
    if (!last) last = now;
    T = (T + Math.min(0.1, (now - last) / 1000)) % P;
    last = now;
    draw(T);
    raf = requestAnimationFrame(loop);
  };
  draw(0);
  if (!opts.still) raf = requestAnimationFrame(loop);
  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
    },
    resize() {
      resize();
      draw(T);
    },
  };
}
