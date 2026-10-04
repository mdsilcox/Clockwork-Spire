import { newState, newPart, simulateTurn, preview as simPreview, mulberry32, idx, MAINSPRING, COLS, ROWS, type PartKind, type State } from './sim';
import { Renderer } from './render';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const R = new Renderer(canvas);
let state: State = newState();
let rng = mulberry32(1234);
let selected: PartKind | 'erase' = 'spur';
let busy = false;
const readout = document.getElementById('readout')!;

// Same fixed mix as bench.ts, for the "Fill" button and automated checks.
const MIX: PartKind[] = ['spur', 'idler', 'spur', 'cam', 'spur', 'spur', 'coil', 'boiler', 'piston', 'spur', 'pendulum', 'boiler', 'piston', 'escapement'];
function fill() {
  state = newState();
  let k = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { if (idx(c, r) !== MAINSPRING) state.board[idx(c, r)] = newPart(MIX[k++]); }
  R.sync(state); R.setHighlight(null);
}

function place(part: PartKind | 'erase', col: number, row: number) {
  const i = idx(col, row);
  if (i === MAINSPRING || busy) return false;
  state.board[i] = part === 'erase' ? null : newPart(part);
  R.sync(state); R.setHighlight(null);
  return true;
}
function showPreview() {
  const p = simPreview(state);
  R.setHighlight(p);
  readout.textContent = `Preview: ${p.damage} dmg, ${p.block} block, ${p.ticks} ticks`;
  return p;
}
function run(): Promise<void> {
  if (busy) return Promise.resolve();
  busy = true; R.setHighlight(null);
  R.sync(state); // start from the pre-turn values; the timeline then drives every change
  const { nextState, events } = simulateTurn(state, rng);
  state = nextState;
  return new Promise(res => R.play(events, () => {
    R.sync(state); busy = false;
    if (state.enemy.hp <= 0) { state.enemy.hp = state.enemy.maxHp; R.sync(state); }
    if (state.player.hp <= 0) { state.player.hp = 40; R.sync(state); }
    readout.textContent = `Turn ${state.turn}`;
    res();
  }));
}
function reset() { if (busy) return; state = newState(); rng = mulberry32(1234); R.sync(state); R.setHighlight(null); readout.textContent = ''; }

// UI
const pal = document.getElementById('palette')!;
const sel = document.createElement('select');
for (const k of ['spur', 'idler', 'coil', 'cam', 'boiler', 'piston', 'pendulum', 'escapement', 'erase']) sel.add(new Option(k, k));
sel.onchange = () => { selected = sel.value as PartKind | 'erase'; };
pal.append(sel);
const fillBtn = document.createElement('button'); fillBtn.textContent = 'Fill'; fillBtn.onclick = fill; pal.append(fillBtn);
document.getElementById('run')!.onclick = () => { void run(); };
document.getElementById('preview')!.onclick = showPreview;
document.getElementById('reset')!.onclick = reset;
document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(b => b.onclick = () => {
  R.speed = Number(b.dataset.speed);
  document.querySelectorAll('[data-speed]').forEach(o => o.classList.toggle('on', o === b));
});
canvas.addEventListener('pointerdown', e => {
  const i = R.cellAt(e.clientX, e.clientY);
  if (i >= 0) place(selected, i % COLS, Math.floor(i / COLS));
});

// FPS meter (smoothed over the last 30 frames)
const fpsEl = document.getElementById('fps')!;
const deltas: number[] = []; let last = 0;
function loop(t: number) {
  if (last) { deltas.push(t - last); if (deltas.length > 30) deltas.shift(); }
  last = t;
  if (deltas.length === 30 && Math.floor(t / 250) !== Math.floor((t - 16) / 250)) fpsEl.textContent = (1000 / (deltas.reduce((a, b) => a + b, 0) / 30)).toFixed(0) + ' fps';
  R.frame(t);
  requestAnimationFrame(loop);
}
R.sync(state);
requestAnimationFrame(loop);

(window as any).__spike = {
  get state() { return state; },
  preview: showPreview,
  run,
  place,
  fill,
  setSpeed(s: number) { R.speed = s; },
};
