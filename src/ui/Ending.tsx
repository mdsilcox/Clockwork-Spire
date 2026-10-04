// The victory ending and credits: the Clockmaker's hands stop, the inventor's last note, dawn through the clock
// face, Sprocket running up the final stair and asleep in the sun on the Workshop doorstep, then the credits.
import { useEffect, useRef, useState } from 'preact/hooks';
import { drawEnemy, newLook } from '../render/draw';
import { drawSprocket } from '../render/sprocket';
import { musicBox } from '../audio/sprocket';
import { unlockAudio } from '../audio/synth';
import './sprocket.css';

export interface EndingStats {
  runs: number;
  turns: number;
  biggestTurn: number;
  chassis: string;
}

const TAU = Math.PI * 2;
/** Scene start times in seconds; the credits begin at CREDITS. */
const SCENES = [0, 8, 18, 28];
export const CREDITS = 37;

const LINES: Record<number, { at: number; text: string; cls?: string }[]> = {
  0: [
    { at: 1, text: 'The hands slow, and slow, and stop.' },
    { at: 4.5, text: '"There. The hour may end now."', cls: 'note' },
  ],
  1: [
    { at: 8.5, text: 'To whoever climbed this far: thank you.', cls: 'note' },
    { at: 11.5, text: 'I built him to keep time for me, and he kept it too well.', cls: 'note' },
    { at: 14.5, text: 'Tell Sprocket his dinner is late again.', cls: 'note' },
  ],
  2: [{ at: 19, text: 'Sprocket knew the way.' }],
  3: [{ at: 29, text: 'The Workshop door stayed open, and the sun found the step.' }],
};

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (k: number): number => {
  const x = clamp01(k);
  return x * x * (3 - 2 * x);
};

function mix(a: number[], b: number[], k: number): string {
  return `rgb(${Math.round(lerp(a[0], b[0], k))}, ${Math.round(lerp(a[1], b[1], k))}, ${Math.round(lerp(a[2], b[2], k))})`;
}

function sky(c: CanvasRenderingContext2D, w: number, h: number, dawn: number): void {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, mix([18, 13, 9], [92, 120, 168], dawn));
  g.addColorStop(0.6, mix([30, 22, 16], [242, 178, 122], dawn));
  g.addColorStop(1, mix([37, 27, 19], [255, 224, 170], dawn));
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

/** The Spire's great clock face, with the sun coming through it. */
function clockFace(c: CanvasRenderingContext2D, w: number, h: number, light: number, t: number): void {
  const cx = w * 0.5;
  const cy = h * 0.4;
  const r = Math.min(w, h) * 0.3;
  if (light > 0.02) {
    const g = c.createRadialGradient(cx, cy, r * 0.2, cx, cy, Math.max(w, h) * 0.9);
    g.addColorStop(0, `rgba(255, 236, 190, ${0.75 * light})`);
    g.addColorStop(1, 'rgba(255, 236, 190, 0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = `rgba(255, 240, 200, ${0.18 * light})`;
    c.lineWidth = r * 0.12;
    c.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12 + Math.sin(t * 0.2) * 0.02;
      c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      c.lineTo(cx + Math.cos(a) * r * 4, cy + Math.sin(a) * r * 4);
    }
    c.stroke();
  }
  c.lineWidth = r * 0.07;
  c.strokeStyle = '#8a6a2a';
  c.beginPath();
  c.arc(cx, cy, r, 0, TAU);
  c.stroke();
  c.fillStyle = `rgba(255, 244, 214, ${0.15 + 0.55 * light})`;
  c.fill();
  c.strokeStyle = 'rgba(58, 42, 27, 0.8)';
  c.lineWidth = r * 0.03;
  c.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12;
    c.moveTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82);
    c.lineTo(cx + Math.cos(a) * r * 0.94, cy + Math.sin(a) * r * 0.94);
  }
  c.stroke();
  // the hands rest at twelve, stopped
  c.lineWidth = r * 0.05;
  c.beginPath();
  c.moveTo(cx, cy);
  c.lineTo(cx, cy - r * 0.7);
  c.moveTo(cx, cy);
  c.lineTo(cx + r * 0.3, cy - r * 0.35);
  c.stroke();
}

function motes(c: CanvasRenderingContext2D, w: number, h: number, t: number, a: number): void {
  c.fillStyle = `rgba(255, 236, 190, ${a})`;
  for (let i = 0; i < 18; i++) {
    const x = ((i * 0.173 + t * 0.01 * (1 + (i % 3))) % 1) * w;
    const y = (0.15 + ((i * 0.37 + t * 0.02) % 0.8)) * h;
    c.beginPath();
    c.arc(x, y + Math.sin(t + i) * 4, 1.5 + (i % 3), 0, TAU);
    c.fill();
  }
}

function drawScene(c: CanvasRenderingContext2D, w: number, h: number, e: number): void {
  c.clearRect(0, 0, w, h);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  if (e < SCENES[1]) {
    // the Clockmaker: everything on him slows with his hands, then holds still
    sky(c, w, h, 0);
    const k = clamp01(e / 5.5);
    const frozen = e * (1 - ease(k)) + 3.2 * ease(k);
    clockFace(c, w, h, 0, e);
    const look = newLook(1);
    look.t = Math.min(frozen, 3.2 + 0.2 * k);
    look.phase = 2;
    drawEnemy(c, 'clockmaker', w / 2, h * 0.52, Math.min(h * 0.7, w * 0.8), look);
    return;
  }
  if (e < SCENES[2]) {
    const k = ease((e - SCENES[1]) / 9);
    sky(c, w, h, k * 0.6);
    clockFace(c, w, h, k * 0.7, e);
    motes(c, w, h, e, 0.15 + 0.2 * k);
    return;
  }
  if (e < SCENES[3]) {
    const k = (e - SCENES[2]) / (SCENES[3] - SCENES[2]);
    sky(c, w, h, 0.65 + 0.35 * k);
    clockFace(c, w, h, 0.8 + 0.2 * k, e);
    // the final stair, climbing to the clock room door
    const n = 9;
    const sx = w * 0.12;
    const sy = h * 0.9;
    const stepW = (w * 0.76) / n;
    const stepH = (h * 0.5) / n;
    for (let i = 0; i < n; i++) {
      c.fillStyle = i % 2 ? '#6b4a2e' : '#7a5636';
      c.strokeStyle = '#3a2814';
      c.lineWidth = 2;
      c.beginPath();
      c.rect(sx + i * stepW, sy - (i + 1) * stepH, stepW + 1, (i + 1) * stepH + h * 0.05);
      c.fill();
      c.stroke();
    }
    const p = ease(k * 1.25);
    const dx = sx + stepW * 0.3 + p * stepW * (n - 1.2);
    const dy = sy - stepH * (1 + p * (n - 1.3));
    drawSprocket(c, dx, dy, lerp(h * 0.3, h * 0.2, p), 'run', e);
    motes(c, w, h, e, 0.25);
    return;
  }
  // the Workshop doorstep, morning sun, Sprocket asleep
  const k = clamp01((e - SCENES[3]) / 3);
  sky(c, w, h, 1);
  const g = c.createRadialGradient(w * 0.5, h * 0.2, 10, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
  g.addColorStop(0, 'rgba(255, 240, 200, 0.7)');
  g.addColorStop(1, 'rgba(255, 240, 200, 0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // the door, ajar, with warm light spilling out
  c.fillStyle = '#5a3a22';
  c.strokeStyle = '#2a1808';
  c.lineWidth = 3;
  c.beginPath();
  c.roundRect(w * 0.58, h * 0.14, w * 0.3, h * 0.66, 10);
  c.fill();
  c.stroke();
  c.fillStyle = 'rgba(255, 214, 140, 0.9)';
  c.beginPath();
  c.roundRect(w * 0.62, h * 0.18, w * 0.22, h * 0.62, 8);
  c.fill();
  c.fillStyle = '#8a6a4a';
  c.fillRect(0, h * 0.8, w, h * 0.2);
  c.strokeStyle = '#3a2814';
  c.beginPath();
  c.moveTo(0, h * 0.8);
  c.lineTo(w, h * 0.8);
  c.stroke();
  c.fillStyle = 'rgba(255, 236, 170, 0.35)';
  c.beginPath();
  c.ellipse(w * 0.4, h * 0.88, w * 0.3, h * 0.07, 0, 0, TAU);
  c.fill();
  c.globalAlpha = ease(k);
  drawSprocket(c, w * 0.4, h * 0.9, Math.min(h * 0.4, w * 0.45), 'sleepy', e);
  c.globalAlpha = 1;
  motes(c, w, h, e, 0.3);
}

export function Ending({ stats, onDone }: { stats: EndingStats; onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const clock = useRef(0);
  const [scene, setScene] = useState(0);
  const [shown, setShown] = useState(0);
  const [credits, setCredits] = useState(false);
  const music = useRef<ReturnType<typeof musicBox>>(null);

  useEffect(() => {
    unlockAudio();
    music.current = musicBox();
    return () => music.current?.stop();
  }, []);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let w = 0;
    let h = 0;
    let dpr = 1;
    const size = (): void => {
      w = el.clientWidth;
      h = el.clientHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
    };
    size();
    window.addEventListener('resize', size);
    const loop = (now: number): void => {
      clock.current += Math.min(0.1, (now - last) / 1000);
      last = now;
      const e = clock.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(ctx, w, h, Math.min(e, CREDITS + 10));
      const sc = e >= CREDITS ? 4 : e >= SCENES[3] ? 3 : e >= SCENES[2] ? 2 : e >= SCENES[1] ? 1 : 0;
      setScene(sc);
      if (sc === 4) setCredits(true);
      else setShown((LINES[sc] ?? []).filter((l) => e >= l.at).length);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
    };
  }, []);

  const lines = (LINES[scene] ?? []).slice(0, shown);
  return (
    <div class="ending" data-testid="ending" data-scene={scene}>
      <canvas ref={canvas} aria-hidden="true" />
      {!credits && (
        <>
          <div class={`ending-text ${scene >= 2 ? 'top' : ''}`} aria-live="polite" data-testid="ending-text">
            {lines.map((l) => (
              <p key={l.text} class={l.cls}>
                {l.text}
              </p>
            ))}
          </div>
          <button
            type="button"
            class="ending-skip"
            data-testid="ending-skip"
            onClick={() => {
              clock.current = CREDITS;
            }}
          >
            Skip
          </button>
        </>
      )}
      {credits && (
        <div class="credits" data-testid="credits">
          <h1>Clockwork Spire</h1>
          <p>Built by Claude for Mikhail</p>
          <p>Sprocket as himself</p>
          <p>Made with code: every picture and sound is drawn and synthesized in your browser.</p>
          <p class="stats" data-testid="ending-stats">
            {stats.runs} {stats.runs === 1 ? 'run' : 'runs'}, {stats.turns} {stats.turns === 1 ? 'turn' : 'turns'}, biggest turn {stats.biggestTurn}
          </p>
          <p>Thanks for playing.</p>
          <button
            type="button"
            data-testid="ending-done"
            onClick={() => {
              music.current?.stop();
              onDone();
            }}
          >
            Back to the Workshop
          </button>
        </div>
      )}
    </div>
  );
}
