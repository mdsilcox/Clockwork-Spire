// The stage: one canvas drawing the board, parts, enemies and the replay of a turn.
// It reads state and replays events; it never re-runs rules.
import { MAINSPRING, CELLS } from '../core/types';
import type { CombatState, GameEvent, TurnPreview } from '../core/types';
import { colOf, neighbors, rowOf } from '../core/board';
import { drawEnemy, drawMainspring, drawPart, newVis } from './draw';
import type { EnemyLook, Vis } from './draw';
import { cellRect, computeLayout, enemyBody, enemySlots } from './layout';
import type { Layout } from './layout';
import { COLOR, FONT } from './palette';
import { applyEvent, timeline, viewFromState } from './replay';
import type { StageView, Timed } from './replay';

export type Speed = '1x' | '2x' | 'skip';

interface Pulse {
  from: number;
  to: number;
  t0: number;
}
interface Float {
  x: number;
  y: number;
  text: string;
  color: string;
  t0: number;
  big: boolean;
}
interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t0: number;
  r: number;
}

const PULSE_LIFE = 0.28;
const TAU = Math.PI * 2;

export class Stage {
  onView: (v: StageView) => void = () => {};
  onEvent: (e: GameEvent, speed: Speed) => void = () => {};
  layout: Layout = computeLayout(640, 360);

  private ctx: CanvasRenderingContext2D;
  private state: CombatState | null = null;
  private view: StageView | null = null;
  private vis: Vis[] = Array.from({ length: CELLS }, newVis);
  private looks: EnemyLook[] = [];
  private pulses: Pulse[] = [];
  private floats: Float[] = [];
  private puffs: Puff[] = [];
  private firing: Record<number, number> | null = null;
  private cursor = -1;
  private marked = -1; // swap source
  private clock = 0;
  private now = 0;
  private lastMs = 0;
  private timed: Timed | null = null;
  private next = 0;
  private after: CombatState | null = null;
  private resolve: (() => void) | null = null;
  private shimmer = 0;
  private raf = 0;
  private speed: Speed = '1x';
  private dpr = 1;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
  }

  start(): void {
    const loop = (ms: number): void => {
      this.frame(ms);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.finishNow();
  }

  /** Match the canvas to its CSS size (device pixels, DPR capped at 2). */
  resize(): void {
    const w = Math.max(1, this.canvas.clientWidth);
    const h = Math.max(1, this.canvas.clientHeight);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.layout = computeLayout(w, h);
  }

  setSpeed(s: Speed): void {
    this.speed = s;
    if (s === 'skip' && this.timed) this.finishNow();
  }

  isPlaying(): boolean {
    return this.timed !== null;
  }

  /** Idle sync: show a state as it is. */
  setState(c: CombatState): void {
    this.state = c;
    this.view = viewFromState(c);
    c.board.forEach((p, i) => {
      const v = this.vis[i];
      v.charge = p?.charge ?? 0;
      v.counter = p?.counter ?? 0;
      v.rusted = (p?.rusted ?? 0) > 0;
      if (!p) {
        v.heat = 0;
        v.glow = 0;
      }
    });
    while (this.looks.length < c.enemies.length) this.looks.push({ hit: 0, dead: 0, t: 0, seed: this.looks.length * 1.7 });
    this.onView(this.view);
  }

  setPreview(p: TurnPreview | null): void {
    this.firing = p ? p.firing : null;
  }

  setCursor(cell: number, marked = -1): void {
    this.cursor = cell;
    this.marked = marked;
  }

  /** Replay a turn. `before` is what the board looked like when Run was pressed; `after` is the real new state. */
  play(events: GameEvent[], before: CombatState, after: CombatState): Promise<void> {
    this.finishNow();
    this.setState(before);
    this.after = after;
    return new Promise<void>((resolve) => {
      this.resolve = resolve;
      if (this.speed === 'skip' || events.length === 0) {
        for (const e of events) this.applyToView(e);
        this.finishNow();
        return;
      }
      this.timed = timeline(events);
      this.next = 0;
      this.clock = 0;
    });
  }

  private finishNow(): void {
    const resolve = this.resolve;
    const after = this.after;
    this.timed = null;
    this.resolve = null;
    this.after = null;
    this.pulses = [];
    if (after) this.setState(after);
    if (resolve) resolve();
  }

  private applyToView(e: GameEvent): void {
    if (!this.view) return;
    applyEvent(this.view, e);
  }

  // ---------- geometry helpers ----------

  private center(i: number): { x: number; y: number } {
    const r = cellRect(this.layout, i);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  private enemyCenter(i: number): { x: number; y: number; size: number } {
    const n = this.state?.enemies.length ?? 1;
    const slot = enemySlots(this.layout, n)[i];
    if (!slot) return { x: this.layout.w - 40, y: this.layout.h / 2, size: 60 };
    const b = enemyBody(slot);
    return { x: b.x + b.w / 2, y: b.y + b.h / 2, size: b.w };
  }

  private dir(i: number): number {
    return (colOf(i) + rowOf(i)) % 2 === 0 ? 1 : -1;
  }

  // ---------- events ----------

  private fire(e: GameEvent): void {
    this.applyToView(e);
    const t = this.now;
    const v = e.cell !== undefined && e.cell >= 0 && e.cell < CELLS ? this.vis[e.cell] : null;
    switch (e.kind) {
      case 'pulse': {
        if (e.from !== undefined && e.cell !== undefined) {
          this.pulses.push({ from: e.from, to: e.cell, t0: t });
          if (e.from === MAINSPRING) {
            const m = this.vis[MAINSPRING];
            m.glow = 1;
            m.rot += 0.5;
          }
        }
        break;
      }
      case 'power':
        if (v && e.cell !== undefined) {
          v.glow = 1;
          v.strokeT = 0;
          v.rot += this.dir(e.cell) * 0.7;
          v.counter += 1;
          const def = this.state?.board[e.cell]?.defId;
          if (def === 'boiler') {
            v.heat = 1;
            this.steam(e.cell, 3);
          }
        }
        break;
      case 'hold':
        if (v && e.note === 'rust') v.glow = Math.max(v.glow, 0.2);
        break;
      case 'charge':
        if (v) v.charge = e.amount ?? v.charge;
        break;
      case 'release':
        if (v) {
          v.snap = 1;
          v.charge = 0;
        }
        break;
      case 'strike': {
        if (e.target === undefined) break;
        const p = this.enemyCenter(e.target);
        const look = this.looks[e.target];
        if (look) look.hit = 1;
        const amt = e.amount ?? 0;
        const blocked = amt === 0;
        this.floats.push({
          x: p.x + (this.floats.length % 3 - 1) * p.size * 0.15,
          y: p.y - p.size * 0.35,
          text: blocked ? 'Blocked' : String(amt),
          color: blocked ? COLOR.inkSoft : amt >= 7 ? COLOR.lamp : COLOR.hurt,
          t0: t,
          big: amt >= 7,
        });
        break;
      }
      case 'plate': {
        this.shimmer = 1;
        if (e.cell !== undefined) {
          const c = this.center(e.cell);
          this.floats.push({ x: c.x, y: c.y - this.layout.cell * 0.3, text: `+${e.amount ?? 0}`, color: COLOR.plating, t0: t, big: false });
        }
        break;
      }
      case 'pressure': {
        if (e.cell !== undefined && (e.amount ?? 0) > 0 && e.note !== 'set') {
          const c = this.center(e.cell);
          this.floats.push({ x: c.x, y: c.y - this.layout.cell * 0.3, text: `+${e.amount}`, color: COLOR.steam, t0: t, big: false });
        }
        break;
      }
      case 'tickAdded':
        if (e.cell !== undefined) {
          const c = this.center(e.cell);
          this.floats.push({ x: c.x, y: c.y - this.layout.cell * 0.3, text: '+1 tick', color: COLOR.lamp, t0: t, big: false });
        }
        break;
      case 'overpressure': {
        const c = this.center(MAINSPRING);
        for (let i = 0; i < 6; i++) this.puffs.push({ x: c.x, y: c.y, vx: (i - 2.5) * 20, vy: -40 - (i % 3) * 14, t0: t, r: this.layout.cell * 0.18 });
        break;
      }
      case 'enemyDied':
        break;
      case 'sabotage':
        if (e.cell !== undefined && e.cell >= 0 && e.note === 'rust' && this.vis[e.cell]) this.vis[e.cell].rusted = true;
        break;
      case 'playerHit': {
        if ((e.amount ?? 0) > 0) this.floats.push({ x: this.layout.board.x + this.layout.board.w / 2, y: this.layout.board.y + 14, text: `-${e.amount}`, color: COLOR.hurt, t0: t, big: true });
        break;
      }
      default:
        break;
    }
    this.onView(this.view as StageView);
    this.onEvent(e, this.speed);
  }

  private steam(cell: number, n: number): void {
    const c = this.center(cell);
    for (let i = 0; i < n; i++) {
      this.puffs.push({ x: c.x + (i - 1) * this.layout.cell * 0.1, y: c.y - this.layout.cell * 0.3, vx: (i - 1) * 8, vy: -26 - i * 6, t0: this.now, r: this.layout.cell * 0.1 });
    }
  }

  // ---------- frame ----------

  private frame(ms: number): void {
    const now = ms / 1000;
    const dt = Math.min(0.05, this.lastMs ? now - this.lastMs : 0.016);
    this.lastMs = now;
    this.now = now;

    for (let i = 0; i < CELLS; i++) {
      const v = this.vis[i];
      if (!v.rusted) v.rot += this.dir(i) * (i === MAINSPRING ? 0.12 : 0.22) * dt;
      v.glow = Math.max(0, v.glow - dt * 2.2);
      v.snap = Math.max(0, v.snap - dt * 2.6);
      v.heat = Math.max(0, v.heat - dt * 0.5);
      v.strokeT += dt;
    }
    this.shimmer = Math.max(0, this.shimmer - dt * 1.4);
    for (const l of this.looks) {
      l.t += dt;
      l.hit = Math.max(0, l.hit - dt * 3.2);
    }
    if (this.state) {
      this.state.enemies.forEach((e, i) => {
        const hp = this.view ? this.view.enemyHp[i] : e.hp;
        const l = this.looks[i];
        if (l) l.dead = hp <= 0 ? Math.min(1, l.dead + dt * 2) : 0;
      });
    }

    if (this.timed) {
      const mult = this.speed === '2x' ? 2 : 1;
      this.clock += dt * mult;
      while (this.next < this.timed.events.length && this.timed.times[this.next] / 1 <= this.clock) {
        this.fire(this.timed.events[this.next++]);
      }
      if (this.next >= this.timed.events.length && this.clock >= this.timed.duration) this.finishNow();
    }
    this.draw();
  }

  private draw(): void {
    const ctx = this.ctx;
    const L = this.layout;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, L.w, L.h);
    const s = this.state;
    if (!s) return;
    const now = this.now;
    const cs = L.cell;

    // board frame
    const b = L.board;
    ctx.fillStyle = COLOR.panel;
    ctx.strokeStyle = COLOR.panelEdge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8, 10);
    ctx.fill();
    ctx.stroke();
    if (this.shimmer > 0.02) {
      ctx.strokeStyle = `rgba(127, 200, 255, ${0.8 * this.shimmer})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8, 10);
      ctx.stroke();
    }

    // tiles
    for (let i = 0; i < CELLS; i++) {
      const r = cellRect(L, i);
      ctx.fillStyle = (colOf(i) + rowOf(i)) % 2 ? '#2a2018' : COLOR.tile;
      ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      ctx.strokeStyle = COLOR.tileEdge;
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
    }

    // links between occupied neighbors and the Mainspring
    ctx.lineCap = 'round';
    for (let i = 0; i < CELLS; i++) {
      if (i !== MAINSPRING && !s.board[i]) continue;
      for (const n of neighbors(i)) {
        if (n < i) continue;
        if (n !== MAINSPRING && !s.board[n]) continue;
        const a = this.center(i);
        const c = this.center(n);
        ctx.strokeStyle = 'rgba(209, 166, 74, 0.28)';
        ctx.lineWidth = Math.max(2, cs * 0.05);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
      }
    }

    // pulses
    this.pulses = this.pulses.filter((p) => now - p.t0 < PULSE_LIFE + 0.1);
    for (const p of this.pulses) {
      const k = Math.min(1, (now - p.t0) / PULSE_LIFE);
      const a = this.center(p.from);
      const c = this.center(p.to);
      const x = a.x + (c.x - a.x) * k;
      const y = a.y + (c.y - a.y) * k;
      ctx.strokeStyle = `rgba(255, 210, 122, ${0.9 * (1 - k * 0.5)})`;
      ctx.lineWidth = Math.max(3, cs * 0.07);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = COLOR.lamp;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(3, cs * 0.06), 0, TAU);
      ctx.fill();
    }

    // Mainspring and parts
    const mc = this.center(MAINSPRING);
    drawMainspring(ctx, mc.x, mc.y, cs * 0.46, this.vis[MAINSPRING], now);
    for (let i = 0; i < CELLS; i++) {
      const p = s.board[i];
      if (!p) continue;
      const c = this.center(i);
      const dim = this.firing && !this.timed && !(this.firing[i] > 0) && !(p.rusted > 0);
      ctx.save();
      if (dim) ctx.globalAlpha = 0.42;
      drawPart(ctx, p.defId, p.plus, c.x, c.y, cs * 0.46, this.vis[i], now);
      ctx.restore();
    }

    // sabotage targets: a pulsing red ring
    for (const e of s.enemies) {
      if (e.hp > 0 && e.intent.kind === 'sabotage' && e.intent.target !== undefined && !this.timed) {
        const c = this.center(e.intent.target);
        ctx.strokeStyle = `rgba(255, 122, 85, ${0.55 + 0.35 * Math.sin(now * 5)})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(c.x - cs * 0.45, c.y - cs * 0.45, cs * 0.9, cs * 0.9);
        ctx.setLineDash([]);
      }
    }

    // cursor and swap mark
    if (this.cursor >= 0) {
      const r = cellRect(L, this.cursor);
      ctx.strokeStyle = COLOR.lamp;
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
    }
    if (this.marked >= 0) {
      const r = cellRect(L, this.marked);
      ctx.strokeStyle = COLOR.plating;
      ctx.lineWidth = 3;
      ctx.strokeRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10);
    }

    // enemies
    s.enemies.forEach((e, i) => {
      const p = this.enemyCenter(i);
      const look = this.looks[i];
      if (!look) return;
      drawEnemy(ctx, e.defId, p.x, p.y, p.size, look);
      const slot = enemySlots(L, s.enemies.length)[i];
      const hp = this.view ? this.view.enemyHp[i] : e.hp;
      const shell = this.view ? this.view.enemyShell[i] : e.shell;
      const bw = Math.min(slot.w * 0.8, 120);
      const bx = slot.x + (slot.w - bw) / 2;
      const by = slot.y + slot.h * 0.22 + slot.h * 0.5 + 1;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx, by, bw, 7);
      ctx.fillStyle = hp / e.maxHp > 0.4 ? COLOR.good : COLOR.hurt;
      ctx.fillRect(bx, by, bw * Math.max(0, hp / e.maxHp), 7);
      if (shell > 0) {
        ctx.strokeStyle = COLOR.plating;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx - 1, by - 1, bw + 2, 9);
      }
    });

    // steam puffs
    this.puffs = this.puffs.filter((p) => now - p.t0 < 1.1);
    for (const p of this.puffs) {
      const k = (now - p.t0) / 1.1;
      ctx.fillStyle = `rgba(230, 236, 240, ${0.5 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(p.x + p.vx * (now - p.t0), p.y + p.vy * (now - p.t0), p.r * (1 + k * 2), 0, TAU);
      ctx.fill();
    }

    // floating numbers
    this.floats = this.floats.filter((f) => now - f.t0 < 1.1);
    for (const f of this.floats) {
      const k = (now - f.t0) / 1.1;
      ctx.globalAlpha = 1 - k * k;
      ctx.fillStyle = f.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3;
      ctx.font = `800 ${f.big ? 24 : 16}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const y = f.y - k * 26;
      ctx.strokeText(f.text, f.x, y);
      ctx.fillText(f.text, f.x, y);
      ctx.globalAlpha = 1;
    }
  }
}
