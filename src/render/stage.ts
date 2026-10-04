// The stage: one canvas drawing the board, parts, enemies and the replay of a turn.
// It reads state and replays events; it never re-runs rules. Unknown event kinds are ignored.
import { MAINSPRING, CELLS } from '../core/types';
import type { CombatState, GameEvent, TurnPreview } from '../core/types';
import { colOf, neighbors, rowOf } from '../core/board';
import * as audio from '../audio/synth';
import { drawEcho, drawEnemy, drawMainspring, drawPart, drawShell, drawStatuses, newLook, newVis, partFamily, isBig, BOSS_IDS, attackStyle } from './draw';
import type { EnemyLook, Vis } from './draw';
import { TAU, gearPath } from './kit';
import { cellRect, computeLayout, enemyBar, enemyBody, enemySlots } from './layout';
import type { Layout, Rect } from './layout';
import { COLOR, FONT } from './palette';
import { applyEvent, timeline, viewFromState } from './replay';
import type { StageView, Timed } from './replay';

export type Speed = '1x' | '2x' | 'skip';

const PULSE_LIFE = 0.28;
const POOL = 420;
const POOL_REDUCED = 150;
const FLOATS = 28;
const PULSES = 24;
const FONT_BIG = `800 24px ${FONT}`;
const FONT_SMALL = `800 16px ${FONT}`;

// particle kinds
const STEAM = 0;
const SPARK = 1;
const COG = 2;
const MOTE = 3;
const RING = 4;
const DRIP = 5;
const STAR = 6;
const PLUS = 7;
const CHEVRON = 8;

interface Particle {
  on: boolean;
  k: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  age: number;
  life: number;
  size: number;
  rot: number;
  vr: number;
  col: string;
}
interface Float {
  on: boolean;
  x: number;
  y: number;
  text: string;
  color: string;
  t0: number;
  big: boolean;
}
interface Pulse {
  on: boolean;
  from: number;
  to: number;
  t0: number;
}

const rnd = Math.random;

export class Stage {
  onView: (v: StageView) => void = () => {};
  onEvent: (e: GameEvent, speed: Speed) => void = () => {};
  layout: Layout = computeLayout(640, 360);
  /** Fewer particles and no screen shake. */
  reducedEffects = false;

  private ctx: CanvasRenderingContext2D;
  private state: CombatState | null = null;
  private view: StageView | null = null;
  private vis: Vis[] = Array.from({ length: CELLS }, newVis);
  private liftT: number[] = new Array<number>(CELLS).fill(0);
  private looks: EnemyLook[] = [];
  private pulses: Pulse[] = Array.from({ length: PULSES }, () => ({ on: false, from: 0, to: 0, t0: 0 }));
  private floats: Float[] = Array.from({ length: FLOATS }, () => ({ on: false, x: 0, y: 0, text: '', color: '', t0: 0, big: false }));
  private parts: Particle[] = Array.from({ length: POOL }, () => ({ on: false, k: 0, x: 0, y: 0, vx: 0, vy: 0, g: 0, age: 0, life: 1, size: 1, rot: 0, vr: 0, col: '#fff' }));
  private pcursor = 0;
  private fcursor = 0;
  private qcursor = 0;
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
  private flash = 0;
  private flashCol = '255, 244, 214';
  private shake = 0;
  private hurt = 0;
  private chainGlow = 0;
  private chainLevel = 0;
  private lastChain = 0;
  private bigAttack = false;
  private introDone = false;
  private jamT = 0;
  private dripT = 0;
  private raf = 0;
  private speed: Speed = '1x';
  private dpr = 1;
  private cx: number[] = new Array<number>(CELLS).fill(0);
  private cy: number[] = new Array<number>(CELLS).fill(0);
  private slots: Rect[] = [];
  private slotsN = -1;
  private shellAt: number[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    this.relayout();
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
    this.relayout();
  }

  private relayout(): void {
    for (let i = 0; i < CELLS; i++) {
      const r = cellRect(this.layout, i);
      this.cx[i] = r.x + r.w / 2;
      this.cy[i] = r.y + r.h / 2;
    }
    this.slotsN = -1;
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
      this.liftT[i] = p?.magnetized ? 1 : 0;
      if (!p) {
        v.heat = 0;
        v.glow = 0;
        v.patina = 0;
        v.lift = 0;
      }
    });
    this.jamT = c.jammed > 0 ? 1 : 0;
    while (this.looks.length < c.enemies.length) this.looks.push(newLook(this.looks.length * 1.7));
    c.enemies.forEach((e, i) => {
      this.looks[i].phase = e.phase;
    });
    this.slotsN = -1;
    // boss intro: once when a boss fight starts
    if (c.kind === 'boss' && c.turn === 1 && c.outcome === 'ongoing') {
      if (!this.introDone) {
        this.introDone = true;
        this.flash = 0.45;
        this.flashCol = '255, 200, 120';
        this.bump(4);
        audio.bossIntro();
      }
    } else if (c.turn > 1 || c.kind !== 'boss') this.introDone = false;
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
    this.lastChain = 0;
    return new Promise<void>((resolve) => {
      this.resolve = resolve;
      if (this.speed === 'skip' || events.length === 0) {
        for (const e of events) {
          this.applyToView(e);
          if (e.kind === 'combatEnd') this.fire(e);
        }
        this.finishNow();
        return;
      }
      // the display copy can grow when a summon lands; the controller's `before` is left alone
      this.state = { ...before, enemies: before.enemies.slice() };
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
    for (const p of this.pulses) p.on = false;
    if (after) this.setState(after);
    if (resolve) resolve();
  }

  private applyToView(e: GameEvent): void {
    if (!this.view) return;
    applyEvent(this.view, e);
  }

  // ---------- geometry helpers ----------

  private slotList(): Rect[] {
    const n = this.state?.enemies.length ?? 1;
    if (this.slotsN !== n) {
      this.slots = enemySlots(this.layout, n);
      this.slotsN = n;
    }
    return this.slots;
  }

  private enemyX(i: number): number {
    const slot = this.slotList()[i];
    if (!slot) return this.layout.w - 40;
    const b = enemyBody(slot);
    return b.x + b.w / 2;
  }

  private enemyY(i: number): number {
    const slot = this.slotList()[i];
    if (!slot) return this.layout.h / 2;
    const b = enemyBody(slot);
    return b.y + b.h / 2;
  }

  private enemySize(i: number): number {
    const slot = this.slotList()[i];
    return slot ? enemyBody(slot).w : 60;
  }

  private dir(i: number): number {
    return (colOf(i) + rowOf(i)) % 2 === 0 ? 1 : -1;
  }

  // ---------- effect helpers ----------

  private n(v: number): number {
    return this.reducedEffects ? Math.max(1, Math.round(v * 0.35)) : v;
  }

  private spawn(k: number, x: number, y: number, vx: number, vy: number, life: number, size: number, col: string, g = 0, rot = 0, vr = 0, delay = 0): void {
    const cap = this.reducedEffects ? POOL_REDUCED : POOL;
    let idx = -1;
    for (let i = 0; i < cap; i++) {
      const j = (this.pcursor + i) % cap;
      if (!this.parts[j].on) {
        idx = j;
        break;
      }
    }
    if (idx < 0) idx = this.pcursor % cap;
    this.pcursor = (idx + 1) % cap;
    const p = this.parts[idx];
    p.on = true;
    p.k = k;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.g = g;
    p.age = -delay;
    p.life = life;
    p.size = size;
    p.rot = rot;
    p.vr = vr;
    p.col = col;
  }

  private addFloat(x: number, y: number, text: string, color: string, big: boolean): void {
    const f = this.floats[this.fcursor];
    this.fcursor = (this.fcursor + 1) % FLOATS;
    f.on = true;
    f.x = x;
    f.y = y;
    f.text = text;
    f.color = color;
    f.t0 = this.now;
    f.big = big;
  }

  private addPulse(from: number, to: number): void {
    const p = this.pulses[this.qcursor];
    this.qcursor = (this.qcursor + 1) % PULSES;
    p.on = true;
    p.from = from;
    p.to = to;
    p.t0 = this.now;
  }

  private bump(amount: number): void {
    if (!this.reducedEffects) this.shake = Math.max(this.shake, amount);
  }

  private steam(x: number, y: number, n: number, spread = 1): void {
    const cs = this.layout.cell;
    const m = this.n(n);
    for (let i = 0; i < m; i++) {
      this.spawn(STEAM, x + (rnd() - 0.5) * cs * 0.2 * spread, y, (rnd() - 0.5) * 18 * spread, -22 - rnd() * 22, 0.9 + rnd() * 0.4, cs * 0.09, '#e6ecf0');
    }
  }

  private sparks(x: number, y: number, n: number, col: string, speed = 90, g = 140): void {
    const m = this.n(n);
    for (let i = 0; i < m; i++) {
      const a = rnd() * TAU;
      const s = speed * (0.4 + rnd() * 0.8);
      this.spawn(SPARK, x, y, Math.cos(a) * s, Math.sin(a) * s - 20, 0.35 + rnd() * 0.3, 1 + rnd() * 1.5, col, g);
    }
  }

  private cogs(x: number, y: number, n: number, size: number): void {
    const m = this.n(n);
    const cols = ['#d1a64a', '#c4703f', '#8a6a2a', '#7e8b92'];
    for (let i = 0; i < m; i++) {
      const a = -Math.PI * (0.1 + rnd() * 0.8);
      const s = 70 + rnd() * 110;
      this.spawn(COG, x, y, Math.cos(a) * s * 1.2, Math.sin(a) * s, 0.9 + rnd() * 0.5, size * (0.05 + rnd() * 0.05), cols[i % 4], 360, rnd() * TAU, (rnd() - 0.5) * 12);
    }
  }

  private ring(x: number, y: number, size: number, col: string, life = 0.5): void {
    this.spawn(RING, x, y, 0, 0, life, size, col);
  }

  // ---------- events ----------

  private fire(e: GameEvent): void {
    this.applyToView(e);
    const snd = this.speed !== 'skip';
    const cs = this.layout.cell;
    const v = e.cell !== undefined && e.cell >= 0 && e.cell < CELLS ? this.vis[e.cell] : null;
    const cx = e.cell !== undefined && v ? this.cx[e.cell] : 0;
    const cy = e.cell !== undefined && v ? this.cy[e.cell] : 0;
    const ti = e.target !== undefined && e.target >= 0 ? e.target : -1;
    const look = ti >= 0 ? this.looks[ti] : undefined;
    const ex = ti >= 0 ? this.enemyX(ti) : 0;
    const ey = ti >= 0 ? this.enemyY(ti) : 0;
    const es = ti >= 0 ? this.enemySize(ti) : 0;
    switch (e.kind) {
      case 'pulse': {
        if (e.from !== undefined && e.cell !== undefined) {
          this.addPulse(e.from, e.cell);
          if (e.from === MAINSPRING) {
            const m = this.vis[MAINSPRING];
            m.glow = 1;
            m.rot += 0.5;
          }
        }
        break;
      }
      case 'power': {
        if (v && e.cell !== undefined) {
          v.glow = 1;
          v.strokeT = 0;
          v.rot += this.dir(e.cell) * 0.7;
          v.counter += 1;
          const def = this.state?.board[e.cell]?.defId ?? '';
          const fam = partFamily(def);
          if (fam === 'steam') {
            v.heat = 1;
            this.steam(cx, cy - cs * 0.3, def === 'boiler' ? 3 : 4);
          } else if (fam === 'gear') this.sparks(cx, cy, 2, '#ffe29a', 50, 60);
          else if (fam === 'chime') this.ring(cx, cy, cs * 0.5, '255, 226, 154', 0.55);
          else if (fam === 'cam') this.sparks(cx, cy + cs * 0.1, 2, '#e2b479', 60, 90);
          if (snd) audio.partFire(fam, e.step);
        }
        // big-chain moments: Momentum passes 10 and 20
        const m = e.amount ?? 0;
        if (m >= 10 && this.lastChain < 10) this.bigChain(1, m);
        if (m >= 20 && this.lastChain < 20) this.bigChain(2, m);
        this.lastChain = Math.max(this.lastChain, m);
        break;
      }
      case 'hold':
        if (v && e.note === 'rust') v.glow = Math.max(v.glow, 0.2);
        break;
      case 'charge':
        if (v) {
          v.charge = e.amount ?? v.charge;
          this.sparks(cx, cy, 2, '#ffd27a', 40, 30);
        }
        break;
      case 'release': {
        if (v) {
          v.snap = 1;
          v.charge = 0;
          v.glow = 1;
          this.sparks(cx, cy, 16, '#ffd27a', 150, 160);
          this.ring(cx, cy, cs * 0.7, '255, 210, 122', 0.4);
          this.bump(2.5);
        }
        if (snd) audio.releaseSnap();
        break;
      }
      case 'strike': {
        if (ti < 0) break;
        if (look) look.hit = 1;
        const amt = e.amount ?? 0;
        const blocked = amt === 0;
        this.addFloat(ex + ((this.fcursor % 3) - 1) * es * 0.15, ey - es * 0.35, blocked ? 'Blocked' : String(amt), blocked ? COLOR.inkSoft : amt >= 7 ? COLOR.lamp : COLOR.hurt, amt >= 7);
        if (blocked) this.sparks(ex - es * 0.4, ey, 6, '#f0cf7a', 70, 60);
        else {
          this.sparks(ex - es * 0.2, ey, 4 + Math.min(14, amt), amt >= 7 ? '#ffd27a' : '#ff9a70', 80 + amt * 4, 150);
          if (amt >= 10) this.bump(Math.min(5, 1.5 + amt / 8));
        }
        if (snd) {
          const en = this.state?.enemies[ti];
          if (en && BOSS_IDS.has(en.defId)) audio.bossHit(amt);
          else audio.strike(amt);
        }
        break;
      }
      case 'sweep': {
        const b = this.layout.enemyZone;
        const m = this.n(8);
        for (let i = 0; i < m; i++) this.spawn(SPARK, b.x, b.y + (b.h * (i + 0.5)) / m, 260 + rnd() * 120, (rnd() - 0.5) * 20, 0.35, 2.4, '#ffe29a', 0);
        if (snd) audio.sweepHit();
        break;
      }
      case 'plate': {
        this.shimmer = 1;
        const x = e.cell !== undefined && v ? cx : this.layout.board.x + this.layout.board.w / 2;
        const y = e.cell !== undefined && v ? cy - cs * 0.3 : this.layout.board.y;
        this.addFloat(x, y, `+${e.amount ?? 0}`, COLOR.plating, false);
        const m = this.n(5);
        for (let i = 0; i < m; i++) this.spawn(STAR, x + (rnd() - 0.5) * cs * 0.5, y + cs * 0.2, (rnd() - 0.5) * 20, -20 - rnd() * 20, 0.6, 3, '#9fd8ff');
        if (snd) audio.plateClink();
        break;
      }
      case 'pressure': {
        if (e.cell !== undefined && v && (e.amount ?? 0) > 0 && e.note !== 'set') {
          this.addFloat(cx, cy - cs * 0.3, `+${e.amount}`, COLOR.steam, false);
          if (snd) audio.pressureHiss();
        }
        break;
      }
      case 'tickAdded':
        if (e.cell !== undefined && v) this.addFloat(cx, cy - cs * 0.3, '+1 tick', COLOR.lamp, false);
        break;
      case 'overpressure': {
        const mx = this.cx[MAINSPRING];
        const my = this.cy[MAINSPRING];
        this.steam(mx, my, 14, 4);
        this.sparks(mx, my, 24, '#ff9a55', 190, 200);
        this.ring(mx, my, cs * 1.4, '255, 140, 70', 0.6);
        this.flash = 0.5;
        this.flashCol = '255, 150, 90';
        this.bump(7);
        this.hurt = 0.5;
        if (snd) audio.overpressure();
        break;
      }
      case 'echo': {
        if (v) {
          v.echo = 1;
          this.ring(cx, cy, cs * 0.6, '255, 255, 255', 0.5);
        }
        if (snd) audio.echo();
        break;
      }
      case 'heal': {
        const b = this.layout.board;
        const m = this.n(12);
        for (let i = 0; i < m; i++) this.spawn(MOTE, b.x + rnd() * b.w, b.y + b.h * (0.6 + rnd() * 0.4), (rnd() - 0.5) * 10, -26 - rnd() * 24, 1.1 + rnd() * 0.4, cs * 0.045, '#9ad27a');
        this.spawn(PLUS, b.x + b.w / 2, b.y + b.h * 0.7, 0, -30, 1.1, cs * 0.12, '#9ad27a');
        this.addFloat(b.x + b.w / 2, b.y + b.h * 0.45, `+${e.amount ?? 0}`, COLOR.good, true);
        if (snd) audio.heal();
        break;
      }
      case 'status': {
        const st = e.status ?? '';
        if (ti >= 0) {
          if (st === 'scald') this.steam(ex, ey, 7, 2.5);
          else if (st === 'cracked') this.sparks(ex, ey, 10, '#ffd27a', 100, 40);
          else if (st === 'dazed') {
            for (let i = 0; i < this.n(4); i++) this.spawn(STAR, ex + (i - 1.5) * es * 0.2, ey - es * 0.5, 0, -14, 0.9, es * 0.06, '#ffd27a', 0, i);
          } else if (st === 'strength') {
            for (let i = 0; i < this.n(3); i++) this.spawn(CHEVRON, ex + (i - 1) * es * 0.2, ey, 0, -30, 0.8, es * 0.07, '#ff7a55');
          }
        } else if (st === 'corroded') {
          const b = this.layout.board;
          for (let i = 0; i < this.n(10); i++) this.spawn(DRIP, b.x + rnd() * b.w, b.y - 2, 0, 20 + rnd() * 20, 0.9, cs * 0.05, '#8ac24a', 110);
        } else {
          this.sparks(this.layout.board.x + this.layout.board.w / 2, this.layout.board.y, 6, '#ffd27a', 60, 50);
        }
        if (snd) audio.statusSound(st);
        break;
      }
      case 'statusTick': {
        if (ti >= 0) {
          if (look) look.hit = Math.max(look.hit, 0.6);
          if (e.status === 'scald') this.steam(ex, ey, 4, 2);
          if ((e.amount ?? 0) > 0) this.addFloat(ex, ey - es * 0.35, String(e.amount), '#ff9a55', false);
        }
        if (snd) audio.statusTick(e.status ?? '');
        break;
      }
      case 'shell':
        if (ti >= 0) this.shellFx(ti, ex, ey, es, snd);
        break;
      case 'enemyAction': {
        if (ti < 0) break;
        const kind = e.note ?? '';
        if (look && (kind === 'attack' || kind === 'special' || kind === 'sabotage' || kind === 'debuff' || kind === 'charge')) look.lunge = 0;
        const def = this.state?.enemies[ti]?.defId ?? '';
        this.bigAttack = kind === 'attack' && isBig(def);
        if (kind === 'attack') {
          const style = attackStyle(def);
          if (style === 'slam') {
            // dust and a ring where the blow lands, timed to the strike
            this.ring(ex - es * 0.2, ey + es * 0.45, es * 0.9, '220, 200, 160', 0.5);
            for (let i = 0; i < this.n(8); i++) this.spawn(STEAM, ex - es * 0.3 + rnd() * es * 0.6, ey + es * 0.45, (rnd() - 0.7) * 50, -8 - rnd() * 10, 0.7, es * 0.05, '#c8b79a', 0, 0, 0, 0.5);
          } else if (style === 'blast') {
            for (let i = 0; i < this.n(12); i++) this.spawn(STEAM, ex - es * 0.3, ey + (rnd() - 0.5) * es * 0.5, -120 - rnd() * 90, (rnd() - 0.5) * 30, 0.8, es * 0.08, '#e6ecf0', 0, 0, 0, 0.45);
          }
          if (snd) audio.enemyWhoosh(this.bigAttack);
        }
        if (kind === 'buff') this.buffFx(ex, ey, es, snd);
        if (kind === 'charge') {
          if (look) look.heat = 1;
          this.steam(ex, ey, 6, 2.5);
        }
        if (kind === 'defend') this.shellFx(ti, ex, ey, es, snd);
        break;
      }
      case 'buff':
        if (ti >= 0) this.buffFx(ex, ey, es, snd);
        break;
      case 'summon': {
        if (ti < 0 || !this.state || !this.view) break;
        const st = this.state;
        const src = this.after?.enemies[ti];
        if (st.enemies.length <= ti && src) {
          st.enemies.push({ ...src, hp: src.maxHp, shell: 0 });
          this.view.enemyHp[ti] = src.maxHp;
          this.view.enemyShell[ti] = 0;
          this.slotsN = -1;
        }
        while (this.looks.length <= ti) this.looks.push(newLook(this.looks.length * 1.7));
        const l = this.looks[ti];
        l.dead = 0;
        l.drop = 1;
        if (snd) audio.summon();
        break;
      }
      case 'phase': {
        if (look) {
          look.phase = e.amount ?? look.phase + 1;
          look.morph = 1;
        }
        this.flash = 0.7;
        this.flashCol = '255, 236, 190';
        this.bump(6);
        if (ti >= 0) {
          this.ring(ex, ey, es * 1.3, '255, 226, 154', 0.9);
          this.ring(ex, ey, es * 0.9, '255, 255, 255', 0.6);
          this.cogs(ex, ey, 10, es);
        }
        if (snd) audio.phaseGong(ti >= 0 && this.state?.enemies[ti]?.defId === 'clockmaker');
        break;
      }
      case 'rewind': {
        if (v) {
          this.ring(cx, cy, cs * 0.7, '169, 221, 210', 0.6);
          for (let i = 0; i < this.n(6); i++) this.spawn(MOTE, cx + (rnd() - 0.5) * cs * 0.5, cy + cs * 0.3, 0, -70 - rnd() * 40, 0.6, cs * 0.04, '#a9ddd2');
        }
        break;
      }
      case 'unmagnetize':
        if (v && e.cell !== undefined) {
          this.liftT[e.cell] = 0;
          this.ring(cx, cy, cs * 0.5, '127, 200, 255', 0.4);
        }
        break;
      case 'sabotage': {
        const note = e.note ?? 'rust';
        const att = ti >= 0 ? ti : 0;
        if (note === 'rust' && v && e.cell !== undefined) {
          v.rusted = true;
          v.patina = 0;
          for (let i = 0; i < this.n(10); i++) this.spawn(DRIP, cx + (rnd() - 0.5) * cs * 0.7, cy - cs * 0.2, 0, 10 + rnd() * 16, 0.9, cs * 0.04, '#c4703f', 60);
        } else if (note === 'fizzle') {
          if (v) this.steam(cx, cy, 3);
        } else if (note === 'jam') {
          this.jamT = 1;
          this.vis[MAINSPRING].jam = 0.02;
          this.sparks(this.cx[MAINSPRING], this.cy[MAINSPRING], 10, '#ffd27a', 120, 160);
          this.bump(3);
        } else if (note === 'magnetize' && v && e.cell !== undefined) {
          this.liftT[e.cell] = 1;
          this.ring(cx, cy - cs * 0.3, cs * 0.6, '127, 200, 255', 0.6);
        } else if (note === 'drain') {
          const sx = this.cx[MAINSPRING];
          const sy = this.cy[MAINSPRING];
          const tx = this.enemyX(att);
          const ty = this.enemyY(att);
          const m = this.n(14);
          for (let i = 0; i < m; i++) {
            const k = i / m;
            this.spawn(STEAM, sx + (rnd() - 0.5) * cs * 0.5, sy + (rnd() - 0.5) * cs * 0.5, (tx - sx) * (0.7 + k * 0.3) * 0.8, (ty - sy) * 0.8, 0.8 + k * 0.4, cs * 0.08, '#cfe0ea');
          }
        }
        if (snd) audio.sabotage(note);
        break;
      }
      case 'playerHit': {
        const amt = e.amount ?? 0;
        if (amt > 0) {
          this.addFloat(this.layout.board.x + this.layout.board.w / 2, this.layout.board.y + 14, `-${amt}`, COLOR.hurt, true);
          this.hurt = Math.min(0.55, 0.2 + amt * 0.03);
          this.bump(Math.min(8, (2 + amt * 0.4) * (this.bigAttack ? 1.5 : 1)));
          if (snd) audio.hitThud(this.bigAttack ? amt + 8 : amt);
          if (this.bigAttack) this.sparks(this.layout.board.x + this.layout.board.w * 0.9, this.layout.board.y + this.layout.board.h / 2, 12, '#ff9a55', 150, 160);
        } else if (snd) audio.plateClink();
        break;
      }
      case 'enemyDied': {
        if (ti >= 0) {
          this.cogs(ex, ey, 22, es);
          this.sparks(ex, ey, 14, '#ffd27a', 140, 200);
          this.steam(ex, ey, 6, 3);
          this.bump(3.5);
          if (snd) audio.enemyDeath();
        }
        break;
      }
      case 'combatEnd': {
        if (e.note === 'won') {
          const b = this.layout.board;
          const m = this.n(18);
          for (let i = 0; i < m; i++) this.spawn(STEAM, b.x + (b.w * (i + 0.5)) / m, b.y + b.h * 0.8, ((i % 5) - 2) * 12, -50 - (i % 4) * 18, 1.1, cs * 0.16, '#e6ecf0');
          this.shimmer = 1;
        }
        break;
      }
      default:
        break;
    }
    this.onView(this.view as StageView);
    this.onEvent(e, this.speed);
  }

  private shellFx(ti: number, ex: number, ey: number, es: number, snd: boolean): void {
    if (this.now - (this.shellAt[ti] ?? -9) < 0.4) return;
    this.shellAt[ti] = this.now;
    this.sparks(ex - es * 0.45, ey, 8, '#f0cf7a', 70, 40);
    this.ring(ex, ey, es * 0.8, '240, 207, 122', 0.45);
    if (snd) audio.shellUp();
  }

  private buffFx(ex: number, ey: number, es: number, snd: boolean): void {
    for (let i = 0; i < this.n(4); i++) this.spawn(CHEVRON, ex + (i - 1.5) * es * 0.2, ey + es * 0.1, 0, -34, 0.9, es * 0.07, '#ff7a55');
    if (snd) audio.buff();
  }

  private bigChain(level: number, m: number): void {
    const b = this.layout.board;
    this.chainGlow = 1;
    this.chainLevel = level;
    this.flash = 0.18 + 0.12 * level;
    this.flashCol = '255, 226, 154';
    this.bump(2 + level * 2);
    this.ring(this.cx[MAINSPRING], this.cy[MAINSPRING], this.layout.cell * (1.6 + level * 0.6), '255, 210, 122', 0.7);
    this.sparks(b.x + b.w / 2, b.y + b.h / 2, 12 * level, '#ffe29a', 200, 120);
    this.addFloat(b.x + b.w / 2, b.y + b.h / 2, String(m), COLOR.lamp, true);
    if (this.speed !== 'skip') audio.chainChime(level);
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
      v.echo = Math.max(0, v.echo - dt * 2.2);
      v.strokeT += dt;
      if (v.rusted) v.patina = Math.min(1, v.patina + dt * 1.6);
      else if (v.patina > 0) v.patina = Math.max(0, v.patina - dt * 2);
      v.lift += (this.liftT[i] - v.lift) * Math.min(1, dt * 8);
    }
    const ms0 = this.vis[MAINSPRING];
    ms0.jam += (this.jamT - ms0.jam) * Math.min(1, dt * 10);
    this.shimmer = Math.max(0, this.shimmer - dt * 1.4);
    this.flash = Math.max(0, this.flash - dt * 2.2);
    this.shake = Math.max(0, this.shake - dt * 14);
    this.hurt = Math.max(0, this.hurt - dt * 1.8);
    this.chainGlow = Math.max(0, this.chainGlow - dt * 0.7);
    const st = this.state;
    for (let i = 0; i < this.looks.length; i++) {
      const l = this.looks[i];
      l.t += dt;
      l.hit = Math.max(0, l.hit - dt * 3.2);
      l.lunge += dt;
      l.morph = Math.max(0, l.morph - dt * 0.7);
      l.heat = Math.max(l.heat - dt * 0.4, st && st.enemies[i] ? Math.min(1, (st.enemies[i].mem.heat ?? 0) / 20) : 0);
      if (l.drop > 0) {
        l.drop = Math.max(0, l.drop - dt * 2.4);
        if (l.drop === 0 && st && st.enemies[i]) {
          const x = this.enemyX(i);
          const y = this.enemyY(i) + this.enemySize(i) * 0.4;
          this.steam(x, y, 5, 3);
          this.sparks(x, y, 6, '#c8b79a', 60, 80);
          this.bump(1.5);
        }
      }
    }
    if (st) {
      const es = st.enemies;
      for (let i = 0; i < es.length; i++) {
        const hp = this.view ? this.view.enemyHp[i] : es[i].hp;
        const l = this.looks[i];
        if (l) l.dead = hp <= 0 ? Math.min(1, l.dead + dt * 2) : 0;
      }
      if ((st.playerStatuses.corroded ?? 0) > 0) {
        this.dripT -= dt;
        if (this.dripT <= 0) {
          this.dripT = this.reducedEffects ? 0.8 : 0.35;
          const b = this.layout.board;
          this.spawn(DRIP, b.x + rnd() * b.w, b.y - 2, 0, 16, 1, this.layout.cell * 0.05, '#8ac24a', 110);
        }
      }
    }

    if (this.timed) {
      const mult = this.speed === '2x' ? 2 : 1;
      this.clock += dt * mult;
      while (this.timed && this.next < this.timed.events.length && this.timed.times[this.next] <= this.clock) {
        this.fire(this.timed.events[this.next++]);
      }
      if (this.timed && this.next >= this.timed.events.length && this.clock >= this.timed.duration) this.finishNow();
    }
    this.draw(dt);
  }

  private draw(dt: number): void {
    const ctx = this.ctx;
    const L = this.layout;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, L.w, L.h);
    const s = this.state;
    if (!s) return;
    const now = this.now;
    const cs = L.cell;
    if (this.shake > 0.05) ctx.translate(Math.sin(now * 83) * this.shake, Math.cos(now * 71) * this.shake);

    // board frame
    const b = L.board;
    ctx.fillStyle = COLOR.panel;
    ctx.strokeStyle = COLOR.panelEdge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8, 10);
    ctx.fill();
    ctx.stroke();
    if (this.chainGlow > 0.02) {
      ctx.strokeStyle = `rgba(255, 210, 122, ${0.9 * this.chainGlow})`;
      ctx.lineWidth = 3 + this.chainLevel * 3 * this.chainGlow;
      ctx.beginPath();
      ctx.roundRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12, 12);
      ctx.stroke();
    }
    if (this.shimmer > 0.02) {
      ctx.strokeStyle = `rgba(127, 200, 255, ${0.8 * this.shimmer})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8, 10);
      ctx.stroke();
    }
    // corroded: a green stain along the plate edge, with drips falling from it
    if ((s.playerStatuses.corroded ?? 0) > 0) {
      ctx.strokeStyle = 'rgba(138, 194, 74, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x + 6, b.y - 4);
      ctx.lineTo(b.x + b.w - 6, b.y - 4);
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
    ctx.strokeStyle = 'rgba(209, 166, 74, 0.28)';
    ctx.lineWidth = Math.max(2, cs * 0.05);
    ctx.beginPath();
    for (let i = 0; i < CELLS; i++) {
      if (i !== MAINSPRING && !s.board[i]) continue;
      const nb = neighbors(i);
      for (let k = 0; k < nb.length; k++) {
        const n = nb[k];
        if (n < i) continue;
        if (n !== MAINSPRING && !s.board[n]) continue;
        ctx.moveTo(this.cx[i], this.cy[i]);
        ctx.lineTo(this.cx[n], this.cy[n]);
      }
    }
    ctx.stroke();

    // pulses
    for (let i = 0; i < PULSES; i++) {
      const p = this.pulses[i];
      if (!p.on) continue;
      if (now - p.t0 > PULSE_LIFE + 0.1) {
        p.on = false;
        continue;
      }
      const k = Math.min(1, (now - p.t0) / PULSE_LIFE);
      const ax = this.cx[p.from];
      const ay = this.cy[p.from];
      const x = ax + (this.cx[p.to] - ax) * k;
      const y = ay + (this.cy[p.to] - ay) * k;
      ctx.strokeStyle = `rgba(255, 210, 122, ${0.9 * (1 - k * 0.5)})`;
      ctx.lineWidth = Math.max(3, cs * 0.07);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = COLOR.lamp;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(3, cs * 0.06), 0, TAU);
      ctx.fill();
    }

    // Mainspring and parts
    drawMainspring(ctx, this.cx[MAINSPRING], this.cy[MAINSPRING], cs * 0.46, this.vis[MAINSPRING], now);
    for (let i = 0; i < CELLS; i++) {
      const p = s.board[i];
      if (!p) continue;
      const v = this.vis[i];
      const lift = v.lift;
      const x = this.cx[i];
      const y = this.cy[i] - lift * cs * 0.1 + (lift > 0.05 ? Math.sin(now * 4 + i) * cs * 0.015 : 0);
      const dim = this.firing && !this.timed && !(this.firing[i] > 0) && !(p.rusted > 0);
      if (lift > 0.02) this.drawMagnet(ctx, x, this.cy[i] - cs * 0.42, cs, lift);
      ctx.save();
      if (dim) ctx.globalAlpha = 0.42;
      drawPart(ctx, p.defId, p.plus, x, y, cs * 0.46, v, now);
      ctx.restore();
      if (v.echo > 0.02) drawEcho(ctx, p.defId, p.plus, x, y, cs * 0.46, v, now);
    }

    // sabotage targets: a pulsing red ring
    for (let i = 0; i < s.enemies.length; i++) {
      const e = s.enemies[i];
      if (e.hp > 0 && e.intent.kind === 'sabotage' && e.intent.target !== undefined && e.intent.target >= 0 && !this.timed) {
        const t = e.intent.target;
        ctx.strokeStyle = `rgba(255, 122, 85, ${0.55 + 0.35 * Math.sin(now * 5)})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(this.cx[t] - cs * 0.45, this.cy[t] - cs * 0.45, cs * 0.9, cs * 0.9);
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
    const slots = this.slotList();
    for (let i = 0; i < s.enemies.length; i++) {
      const e = s.enemies[i];
      const look = this.looks[i];
      const slot = slots[i];
      if (!look || !slot) continue;
      const body = enemyBody(slot);
      const x = body.x + body.w / 2;
      const y = body.y + body.h / 2;
      drawEnemy(ctx, e.defId, x, y, body.w, look);
      const hp = this.view ? this.view.enemyHp[i] : e.hp;
      const shell = this.view ? this.view.enemyShell[i] : e.shell;
      if (hp > 0 && look.drop <= 0) {
        drawStatuses(ctx, e.statuses, x, y, body.w, now);
        if (shell > 0) drawShell(ctx, x, y, body.w, shell, now);
      }
      const bar = enemyBar(slot);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
      ctx.fillStyle = hp / e.maxHp > 0.4 ? COLOR.good : COLOR.hurt;
      ctx.fillRect(bar.x, bar.y, bar.w * Math.max(0, hp / e.maxHp), bar.h);
      if (shell > 0) {
        ctx.strokeStyle = COLOR.plating;
        ctx.lineWidth = 2;
        ctx.strokeRect(bar.x - 1, bar.y - 1, bar.w + 2, bar.h + 2);
      }
    }

    this.drawParticles(ctx, dt);

    // floating numbers
    for (let i = 0; i < FLOATS; i++) {
      const f = this.floats[i];
      if (!f.on) continue;
      const k = (now - f.t0) / 1.1;
      if (k >= 1) {
        f.on = false;
        continue;
      }
      ctx.globalAlpha = 1 - k * k;
      ctx.fillStyle = f.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3;
      ctx.font = f.big ? FONT_BIG : FONT_SMALL;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const y = f.y - k * 26;
      ctx.strokeText(f.text, f.x, y);
      ctx.fillText(f.text, f.x, y);
      ctx.globalAlpha = 1;
    }

    // screen flashes
    if (this.hurt > 0.02) {
      ctx.fillStyle = `rgba(255, 70, 40, ${this.hurt * 0.35})`;
      ctx.fillRect(0, 0, L.w, L.h);
    }
    if (this.flash > 0.02 && !this.reducedEffects) {
      ctx.fillStyle = `rgba(${this.flashCol}, ${this.flash * 0.6})`;
      ctx.fillRect(0, 0, L.w, L.h);
    }
  }

  /** A horseshoe magnet hovering over a magnetized part. */
  private drawMagnet(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, k: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = Math.min(1, k * 1.4);
    ctx.lineCap = 'butt';
    ctx.lineWidth = cs * 0.1;
    ctx.strokeStyle = '#c33a2a';
    ctx.beginPath();
    ctx.arc(0, 0, cs * 0.14, Math.PI, 0);
    ctx.moveTo(-cs * 0.14, 0);
    ctx.lineTo(-cs * 0.14, cs * 0.1);
    ctx.moveTo(cs * 0.14, 0);
    ctx.lineTo(cs * 0.14, cs * 0.1);
    ctx.stroke();
    ctx.strokeStyle = '#e6ecf0';
    ctx.beginPath();
    ctx.moveTo(-cs * 0.14, cs * 0.1);
    ctx.lineTo(-cs * 0.14, cs * 0.15);
    ctx.moveTo(cs * 0.14, cs * 0.1);
    ctx.lineTo(cs * 0.14, cs * 0.15);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(127, 200, 255, 0.7)';
    ctx.beginPath();
    for (const s of [-1, 1]) {
      ctx.moveTo(s * cs * 0.14, cs * 0.19);
      ctx.lineTo(s * cs * 0.1, cs * 0.3);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, dt: number): void {
    const cs = this.layout.cell;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < POOL; i++) {
      const p = this.parts[i];
      if (!p.on) continue;
      p.age += dt;
      if (p.age < 0) continue;
      if (p.age >= p.life) {
        p.on = false;
        continue;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const k = p.age / p.life;
      switch (p.k) {
        case STEAM:
          ctx.globalAlpha = 0.5 * (1 - k);
          ctx.fillStyle = p.col;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + k * 2), 0, TAU);
          ctx.fill();
          break;
        case SPARK:
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = p.col;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
          ctx.stroke();
          break;
        case COG:
          ctx.globalAlpha = Math.min(1, (1 - k) * 2);
          ctx.save();
          ctx.translate(p.x, p.y);
          gearPath(ctx, p.size, 6, p.rot, 0.35);
          ctx.fillStyle = p.col;
          ctx.fill();
          ctx.restore();
          break;
        case MOTE:
          ctx.globalAlpha = 0.9 * (1 - k);
          ctx.fillStyle = p.col;
          ctx.beginPath();
          ctx.arc(p.x + Math.sin(p.age * 6 + p.rot) * 3, p.y, p.size * (1 - k * 0.4), 0, TAU);
          ctx.fill();
          break;
        case RING:
          ctx.globalAlpha = 0.8 * (1 - k);
          ctx.strokeStyle = `rgb(${p.col})`;
          ctx.lineWidth = 3 * (1 - k) + 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.3 + k * 0.9), 0, TAU);
          ctx.stroke();
          break;
        case DRIP:
          ctx.globalAlpha = 1 - k * k;
          ctx.fillStyle = p.col;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * 0.7, p.size * 1.3, 0, 0, TAU);
          ctx.fill();
          break;
        case STAR:
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = p.col;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - p.size);
          ctx.lineTo(p.x + p.size * 0.35, p.y - p.size * 0.35);
          ctx.lineTo(p.x + p.size, p.y);
          ctx.lineTo(p.x + p.size * 0.35, p.y + p.size * 0.35);
          ctx.lineTo(p.x, p.y + p.size);
          ctx.lineTo(p.x - p.size * 0.35, p.y + p.size * 0.35);
          ctx.lineTo(p.x - p.size, p.y);
          ctx.lineTo(p.x - p.size * 0.35, p.y - p.size * 0.35);
          ctx.closePath();
          ctx.fill();
          break;
        case PLUS:
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = p.col;
          ctx.lineWidth = Math.max(3, cs * 0.05);
          ctx.beginPath();
          ctx.moveTo(p.x - p.size, p.y);
          ctx.lineTo(p.x + p.size, p.y);
          ctx.moveTo(p.x, p.y - p.size);
          ctx.lineTo(p.x, p.y + p.size);
          ctx.stroke();
          break;
        case CHEVRON:
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = p.col;
          ctx.lineWidth = Math.max(2, p.size * 0.5);
          ctx.beginPath();
          ctx.moveTo(p.x - p.size, p.y + p.size * 0.4);
          ctx.lineTo(p.x, p.y - p.size * 0.6);
          ctx.lineTo(p.x + p.size, p.y + p.size * 0.4);
          ctx.stroke();
          break;
        default:
          break;
      }
    }
    ctx.globalAlpha = 1;
  }
}
