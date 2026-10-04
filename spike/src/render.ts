// Canvas 2D stage. Driven ONLY by the event timeline; never re-runs rules.
import { COLS, ROWS, MAINSPRING, colOf, rowOf, type Ev, type State, type PartKind, type Preview } from './sim';

const STEP = 0.1; // seconds per BFS step at 1x
const TAU = Math.PI * 2;

interface Vis { rot: number; rotT: number; glow: number; charge: number; heat: number; snap: number; stroke: number; swingT: number; swingA: number; camT: number }
interface Pulse { from: number; to: number; t0: number }
interface Float { x: number; y: number; text: string; color: string; t0: number; big: boolean }
interface Puff { x: number; y: number; vx: number; vy: number; life: number; r: number }

const newVis = (): Vis => ({ rot: 0, rotT: 0, glow: 0, charge: 0, heat: 0, snap: 0, stroke: -9, swingT: -9, swingA: 0, camT: 0 });

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private vis: Vis[] = Array.from({ length: COLS * ROWS }, newVis);
  private parts: (PartKind | null)[] = new Array(COLS * ROWS).fill(null);
  private pulses: Pulse[] = [];
  private floats: Float[] = [];
  private puffs: Puff[] = [];
  private clock = 0; // replay clock in seconds (scaled by speed)
  private events: Ev[] = [];
  private times: number[] = [];
  private next = 0;
  private playing = false;
  private onDone: (() => void) | null = null;
  private lastNow = 0;
  private now = 0; // animation time in seconds
  private enemyHp = 80; private enemyMax = 80; private playerHp = 40; private block = 0; private ticks = 3; private intent = 8;
  private chain = 0; private chainPop = 0; private shake = 0; private runningAmount = 0;
  private highlight: Preview | null = null;
  speed = 1;
  private W = 0; private H = 0; private dpr = 1;
  private cellSize = 0; private ox = 0; private oy = 0;

  constructor(private canvas: HTMLCanvasElement) { this.ctx = canvas.getContext('2d')!; }

  /** Snap all displayed values to a state (used before and after a replay). */
  sync(s: State) {
    s.board.forEach((p, i) => {
      this.parts[i] = p ? p.kind : null;
      this.vis[i].charge = p?.charge ?? 0;
      this.vis[i].heat = p?.heat ?? 0;
    });
    this.enemyHp = s.enemy.hp; this.enemyMax = s.enemy.maxHp; this.playerHp = s.player.hp; this.block = s.player.block;
    this.ticks = s.ticks; this.intent = s.enemy.intent;
  }
  setHighlight(p: Preview | null) { this.highlight = p; }

  play(events: Ev[], onDone: () => void) {
    this.events = events; this.next = 0; this.clock = 0; this.chain = 0; this.block = 0;
    // time of each event: tick start (cumulative) + step * STEP
    const tickStart: number[] = [0]; const maxStep: number[] = [];
    for (const e of events) maxStep[e.tick] = Math.max(maxStep[e.tick] ?? 0, e.step);
    for (let t = 1; t <= maxStep.length; t++) tickStart[t] = tickStart[t - 1] + ((maxStep[t - 1] ?? 0) + 2) * STEP;
    this.times = events.map(e => (e.kind === 'attack' ? tickStart[e.tick + 1] : tickStart[e.tick] + e.step * STEP));
    this.onDone = onDone; this.playing = true;
    if (this.speed === 0) { this.fireUpTo(Infinity); this.finish(); }
  }
  isPlaying() { return this.playing; }
  private finish() { this.playing = false; const cb = this.onDone; this.onDone = null; cb?.(); }

  cellAt(clientX: number, clientY: number): number {
    const r = this.canvas.getBoundingClientRect();
    const x = clientX - r.left - this.ox, y = clientY - r.top - this.oy;
    const c = Math.floor(x / this.cellSize), row = Math.floor(y / this.cellSize);
    return c < 0 || c >= COLS || row < 0 || row >= ROWS ? -1 : row * COLS + c;
  }

  // ---------- event handling ----------
  private center(i: number) { return { x: this.ox + (colOf(i) + 0.5) * this.cellSize, y: this.oy + (rowOf(i) + 0.5) * this.cellSize }; }
  private enemyPos() { return { x: this.W - this.W * 0.13, y: this.oy + this.cellSize * 1.4 }; }
  private dir(i: number) { return (colOf(i) + rowOf(i)) % 2 === 0 ? 1 : -1; }

  private fireUpTo(t: number) {
    while (this.next < this.events.length && this.times[this.next] <= t) this.fire(this.events[this.next++]);
  }
  private fire(e: Ev) {
    const v = e.cell >= 0 ? this.vis[e.cell] : null;
    switch (e.kind) {
      case 'pulse':
        if (e.from >= 0) this.pulses.push({ from: e.from, to: e.cell, t0: this.now });
        else { this.vis[MAINSPRING].glow = 1; this.vis[MAINSPRING].rotT += 0.6; }
        break;
      case 'power':
        if (!v) break;
        v.glow = 1; v.rotT += this.dir(e.cell) * 0.7; v.stroke = this.now; v.camT += 1.2;
        if (this.parts[e.cell] === 'pendulum') { v.swingT = this.now; v.swingA = 0.7; }
        break;
      case 'damage': {
        this.chain++; this.chainPop = 1; this.shake = Math.min(1, this.shake + 0.35);
        this.enemyHp = Math.max(0, this.enemyHp - e.amount);
        const p = this.enemyPos();
        this.floats.push({ x: p.x + (this.chain % 3 - 1) * 16, y: p.y - this.cellSize * 0.5, text: String(e.amount), color: e.amount >= 7 ? '#ffd35a' : '#ff8a5a', t0: this.now, big: e.amount >= 7 });
        break;
      }
      case 'block': {
        this.block += e.amount;
        const c = this.center(e.cell);
        this.floats.push({ x: c.x, y: c.y - this.cellSize * 0.3, text: '+' + e.amount, color: '#7fc8ff', t0: this.now, big: false });
        break;
      }
      case 'charge': if (v) v.charge = e.amount; break;
      case 'release': if (v) { v.snap = 1; v.charge = 0; } break;
      case 'heat': if (v) v.heat = e.amount; break;
      case 'tickAdded': {
        this.ticks = e.amount;
        const c = this.center(e.cell);
        this.floats.push({ x: c.x, y: c.y - this.cellSize * 0.3, text: '+1 tick', color: '#e8e0a0', t0: this.now, big: false });
        break;
      }
      case 'attack': this.playerHp -= e.amount; break;
    }
  }

  // ---------- frame ----------
  frame(nowMs: number) {
    const now = nowMs / 1000;
    const dt = Math.min(0.05, this.lastNow ? now - this.lastNow : 0.016);
    this.lastNow = now; this.now = now;
    if (this.playing) {
      this.clock += dt * (this.speed || 1);
      this.fireUpTo(this.clock);
      if (this.next >= this.events.length && this.pulses.length === 0 && this.clock > (this.times[this.times.length - 1] ?? 0) + 0.3) this.finish();
    }
    this.resize();
    this.update(dt);
    this.draw();
  }

  private resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.dpr = dpr; this.W = r.width; this.H = r.height;
    const hud = Math.min(34, this.H * 0.1);
    const areaW = this.W * 0.76 - 8, areaH = this.H - hud - 8;
    this.cellSize = Math.floor(Math.min(areaW / COLS, areaH / ROWS));
    this.ox = Math.floor((this.W * 0.76 - this.cellSize * COLS) / 2);
    this.oy = Math.floor(hud + (areaH - this.cellSize * ROWS) / 2 + 4);
  }

  private update(dt: number) {
    const k = Math.min(1, dt * 12);
    for (let i = 0; i < this.vis.length; i++) {
      const v = this.vis[i];
      v.rot += (v.rotT - v.rot) * k;
      v.glow = Math.max(0, v.glow - dt * 1.6);
      v.snap = Math.max(0, v.snap - dt * 2.2);
      if (this.parts[i] === 'boiler' && v.heat > 0 && Math.random() < dt * (3 + v.heat * 2) && this.puffs.length < 120) {
        const c = this.center(i);
        this.puffs.push({ x: c.x + (Math.random() - 0.5) * this.cellSize * 0.3, y: c.y - this.cellSize * 0.32, vx: (Math.random() - 0.5) * 8, vy: -18 - Math.random() * 14, life: 1, r: this.cellSize * 0.06 });
      }
    }
    for (const p of this.puffs) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 0.9; p.r += dt * this.cellSize * 0.05; }
    this.puffs = this.puffs.filter(p => p.life > 0);
    this.pulses = this.pulses.filter(p => this.now - p.t0 < STEP * 1.6 / (this.speed || 1));
    this.floats = this.floats.filter(f => this.now - f.t0 < 1.1);
    this.chainPop = Math.max(0, this.chainPop - dt * 3);
    this.shake = Math.max(0, this.shake - dt * 3);
  }

  // ---------- drawing ----------
  private draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const bg = ctx.createRadialGradient(this.W * 0.4, this.H * 0.35, 10, this.W * 0.5, this.H * 0.5, Math.max(this.W, this.H) * 0.8);
    bg.addColorStop(0, '#5a3b1c'); bg.addColorStop(0.6, '#2b1b0e'); bg.addColorStop(1, '#120b05');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, this.W, this.H);
    this.drawHud();
    // grid
    ctx.strokeStyle = 'rgba(214,170,90,0.14)'; ctx.lineWidth = 1;
    for (let i = 0; i < COLS * ROWS; i++) {
      const c = this.center(i), s = this.cellSize;
      ctx.strokeRect(c.x - s / 2 + 2, c.y - s / 2 + 2, s - 4, s - 4);
    }
    // pipes between adjacent parts
    ctx.strokeStyle = 'rgba(190,130,60,0.55)'; ctx.lineWidth = Math.max(2, this.cellSize * 0.05); ctx.lineCap = 'round';
    for (let i = 0; i < COLS * ROWS; i++) {
      if (!this.parts[i]) continue;
      for (const j of [i + 1, i + COLS]) {
        if (j >= COLS * ROWS || !this.parts[j] || (j === i + 1 && colOf(i) === COLS - 1)) continue;
        const a = this.center(i), b = this.center(j);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    for (let i = 0; i < COLS * ROWS; i++) if (this.parts[i]) this.drawPart(i);
    // travelling pulses
    for (const p of this.pulses) {
      const t = Math.min(1, (this.now - p.t0) / (STEP * 1.2 / (this.speed || 1)));
      const a = this.center(p.from), b = this.center(p.to);
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      const g = ctx.createRadialGradient(x, y, 0, x, y, this.cellSize * 0.2);
      g.addColorStop(0, 'rgba(255,240,170,0.95)'); g.addColorStop(1, 'rgba(255,180,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, this.cellSize * 0.2, 0, TAU); ctx.fill();
    }
    // preview highlight
    if (this.highlight) {
      ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 2; ctx.fillStyle = '#ffe27a';
      ctx.font = `bold ${Math.max(10, this.cellSize * 0.17)}px system-ui`; ctx.textAlign = 'right';
      for (const i of this.highlight.fired) {
        const c = this.center(i), s = this.cellSize;
        ctx.strokeRect(c.x - s / 2 + 3, c.y - s / 2 + 3, s - 6, s - 6);
        const pp = this.highlight.perPart[i];
        if (pp) { const txt = (pp.damage ? pp.damage + ' dmg ' : '') + (pp.block ? pp.block + ' blk' : ''); ctx.fillText(txt, c.x + s / 2 - 6, c.y - s / 2 + 6 + this.cellSize * 0.14); }
      }
      ctx.restore();
    }
    // steam
    for (const p of this.puffs) { ctx.fillStyle = `rgba(240,240,235,${(p.life * 0.35).toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    this.drawEnemy();
    // floating numbers
    ctx.textAlign = 'center';
    for (const f of this.floats) {
      const t = (this.now - f.t0) / 1.1, pop = t < 0.15 ? 0.6 + t / 0.15 * 0.8 : 1.4 - Math.min(0.4, (t - 0.15));
      ctx.globalAlpha = 1 - Math.max(0, t - 0.6) / 0.4;
      ctx.font = `bold ${Math.round((f.big ? 30 : 22) * pop * Math.min(1, this.cellSize / 90 + 0.4))}px system-ui`;
      ctx.lineWidth = 4; ctx.strokeStyle = '#1a0f05'; ctx.strokeText(f.text, f.x, f.y - t * 40);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y - t * 40);
    }
    ctx.globalAlpha = 1;
  }

  private drawHud() {
    const ctx = this.ctx; const fs = Math.max(12, Math.min(18, this.H * 0.045));
    ctx.font = `bold ${fs}px system-ui`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const y = Math.min(34, this.H * 0.1) / 2 + 2;
    ctx.fillStyle = '#f0dcb4'; ctx.fillText(`Player ${this.playerHp} HP   Block ${this.block}   Ticks ${this.ticks}`, 8, y);
    const scale = 1 + this.chainPop * 0.5;
    ctx.save(); ctx.translate(this.W * 0.76 - 8, y); ctx.scale(scale, scale); ctx.textAlign = 'right';
    ctx.fillStyle = this.chain > 0 ? '#ffd35a' : '#7a6444'; ctx.fillText(`Chain x${this.chain}`, 0, 0); ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  private drawEnemy() {
    const ctx = this.ctx, p = this.enemyPos(), s = this.cellSize;
    const sx = (Math.random() - 0.5) * this.shake * 6;
    const w = Math.min(this.W * 0.2, s * 1.3);
    ctx.save(); ctx.translate(p.x + sx, p.y);
    ctx.fillStyle = '#7a4a2a'; ctx.strokeStyle = '#d6a85a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-w * 0.35, -w * 0.2, w * 0.7, w * 0.9, 8); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -w * 0.4, w * 0.25, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.arc(-w * 0.08, -w * 0.42, 3, 0, TAU); ctx.arc(w * 0.08, -w * 0.42, 3, 0, TAU); ctx.fill();
    ctx.restore();
    const bw = w * 1.1, bx = p.x - bw / 2, by = p.y + w * 0.85;
    ctx.fillStyle = '#2a1008'; ctx.fillRect(bx, by, bw, 10);
    ctx.fillStyle = '#d9473a'; ctx.fillRect(bx, by, bw * this.enemyHp / this.enemyMax, 10);
    ctx.strokeStyle = '#d6a85a'; ctx.strokeRect(bx, by, bw, 10);
    ctx.fillStyle = '#f0dcb4'; ctx.textAlign = 'center'; ctx.font = `${Math.max(11, Math.min(15, this.H * 0.04))}px system-ui`;
    ctx.fillText(`${this.enemyHp}/${this.enemyMax}  intent ${this.intent}`, p.x, by + 26);
  }

  private gear(x: number, y: number, r: number, teeth: number, rot: number, c1: string, c2: string, hub = 0.22) {
    const ctx = this.ctx, inner = r * 0.82;
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a = rot + (i / teeth) * TAU, w = TAU / teeth;
      const pts: [number, number][] = [[a, inner], [a + w * 0.12, r], [a + w * 0.38, r], [a + w * 0.5, inner]];
      for (const [aa, rr] of pts) { const px = x + Math.cos(aa) * rr, py = y + Math.sin(aa) * rr; i === 0 && aa === a ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(40,20,5,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    // spokes
    ctx.strokeStyle = 'rgba(40,20,5,0.55)'; ctx.lineWidth = Math.max(2, r * 0.1);
    for (let i = 0; i < 4; i++) { const a = rot + i * TAU / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * hub, y + Math.sin(a) * r * hub); ctx.lineTo(x + Math.cos(a) * inner * 0.85, y + Math.sin(a) * inner * 0.85); ctx.stroke(); }
    ctx.fillStyle = '#2a1608'; ctx.beginPath(); ctx.arc(x, y, r * hub, 0, TAU); ctx.fill();
  }

  private drawPart(i: number) {
    const ctx = this.ctx, v = this.vis[i], kind = this.parts[i]!, { x, y } = this.center(i), r = this.cellSize * 0.4;
    if (v.glow > 0) {
      const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.5);
      g.addColorStop(0, `rgba(255,214,120,${(v.glow * 0.6).toFixed(3)})`); g.addColorStop(1, 'rgba(255,180,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, TAU); ctx.fill();
    }
    const rot = v.rot;
    switch (kind) {
      case 'mainspring': {
        this.gear(x, y, r * 1.02, 14, rot, '#ffd27a', '#a8651f', 0.3);
        ctx.strokeStyle = '#5a3210'; ctx.lineWidth = 2; ctx.beginPath();
        for (let a = 0; a < 3 * TAU; a += 0.2) { const rr = r * 0.12 + a * r * 0.045; const px = x + Math.cos(a + rot) * rr, py = y + Math.sin(a + rot) * rr; a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
        ctx.stroke(); break;
      }
      case 'spur': this.gear(x, y, r, 10, rot, '#f2c067', '#a8651f'); break;
      case 'idler': this.gear(x, y, r * 0.7, 8, rot, '#cf8a4a', '#6e3a18', 0.3); break;
      case 'escapement': {
        this.gear(x, y, r * 0.85, 12, rot * 0.5, '#e8b85a', '#8a5a20', 0.18);
        ctx.fillStyle = '#6b8aa8'; const sw = Math.sin(this.now * 0 + rot) * 0.4;
        ctx.save(); ctx.translate(x, y - r * 0.9); ctx.rotate(sw); ctx.beginPath(); ctx.moveTo(-r * 0.4, 0); ctx.lineTo(r * 0.4, 0); ctx.lineTo(0, r * 0.35); ctx.closePath(); ctx.fill(); ctx.restore(); break;
      }
      case 'cam': {
        ctx.fillStyle = '#3a2410'; ctx.beginPath(); ctx.arc(x, y, r * 0.95, 0, TAU); ctx.fill();
        ctx.save(); ctx.translate(x, y); ctx.rotate(v.camT * 0.9);
        const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#f0b868'); g.addColorStop(1, '#9a5a22'); ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(r * 0.18, 0, r * 0.82, r * 0.55, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2a1608'; ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, TAU); ctx.fill(); ctx.restore(); break;
      }
      case 'coil': {
        const comp = 1 - 0.45 * v.charge / 3, bounce = Math.sin(v.snap * 18) * v.snap * r * 0.25;
        const L = r * 1.7 * comp + bounce, top = y - L / 2, n = 7;
        ctx.fillStyle = '#8a5a20'; ctx.fillRect(x - r * 0.55, top - 5, r * 1.1, 5); ctx.fillRect(x - r * 0.55, top + L, r * 1.1, 5);
        ctx.strokeStyle = v.snap > 0.1 ? '#fff0b0' : '#e8b85a'; ctx.lineWidth = Math.max(2.5, r * 0.1); ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(x, top);
        for (let k = 0; k < n; k++) { const yy = top + (k + 0.5) / n * L; ctx.lineTo(x + (k % 2 ? -1 : 1) * r * 0.5, yy); }
        ctx.lineTo(x, top + L); ctx.stroke();
        ctx.fillStyle = '#ffd98a'; for (let k = 0; k < 3; k++) { ctx.globalAlpha = k < v.charge ? 1 : 0.2; ctx.beginPath(); ctx.arc(x - r * 0.5 + k * r * 0.5, y + r * 1.0, 3, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1; break;
      }
      case 'boiler': {
        const w = r * 1.5, h = r * 1.5;
        const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, '#8a4a22'); g.addColorStop(0.4, '#e29a58'); g.addColorStop(1, '#6a3414');
        ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, r * 0.3); ctx.fill();
        ctx.fillStyle = `rgba(255,110,30,${Math.min(0.75, v.heat * 0.14).toFixed(3)})`; ctx.fill();
        ctx.strokeStyle = '#3a1c08'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#f6d9a0'; for (const dx of [-0.5, 0.5]) for (const dy of [-0.5, 0.5]) { ctx.beginPath(); ctx.arc(x + dx * w * 0.8, y + dy * h * 0.8, 2, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(10, r * 0.4)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(String(v.heat), x, y + r * 0.15); break;
      }
      case 'piston': {
        const p = Math.min(1, (this.now - v.stroke) / 0.35), off = p < 1 ? Math.sin(p * Math.PI) * r * 0.6 : 0;
        ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x - r * 0.45, y + r * 0.1, r * 0.9, r * 0.8);
        ctx.fillStyle = '#d6a85a'; ctx.fillRect(x - r * 0.12, y - r * 0.9 - off + r * 0.1, r * 0.24, r * 1.0 + off);
        ctx.fillStyle = '#f0c878'; ctx.fillRect(x - r * 0.42, y - r * 0.95 - off, r * 0.84, r * 0.22); break;
      }
      case 'pendulum': {
        const t = this.now - v.swingT, ang = t > 0 && t < 3 ? v.swingA * Math.exp(-t * 1.5) * Math.cos(t * 9) : 0;
        ctx.save(); ctx.translate(x, y - r * 0.85); ctx.rotate(ang);
        ctx.strokeStyle = '#d6a85a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 1.5); ctx.stroke();
        const g = ctx.createRadialGradient(-3, r * 1.5 - 3, 1, 0, r * 1.5, r * 0.35); g.addColorStop(0, '#ffe29a'); g.addColorStop(1, '#a8651f');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, r * 1.5, r * 0.3, 0, TAU); ctx.fill(); ctx.restore(); break;
      }
    }
    if (this.cellSize > 70) {
      ctx.fillStyle = 'rgba(240,220,180,0.55)'; ctx.font = `${Math.max(9, this.cellSize * 0.11)}px system-ui`; ctx.textAlign = 'center';
      ctx.fillText(kind, x, y + this.cellSize / 2 - 5);
    }
  }
}
