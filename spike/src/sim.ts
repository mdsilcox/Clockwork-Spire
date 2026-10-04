// Pure, deterministic machine simulation. No DOM, no globals, no Math.random.
export const COLS = 5, ROWS = 3;
export const MAINSPRING = 1 * COLS + 0; // (col 0, row 1)
export type PartKind = 'mainspring' | 'spur' | 'idler' | 'coil' | 'cam' | 'boiler' | 'piston' | 'pendulum' | 'escapement';
export type EvKind = 'pulse' | 'power' | 'damage' | 'block' | 'charge' | 'release' | 'heat' | 'tickAdded' | 'attack';
export interface Part { kind: PartKind; charge: number; count: number; heat: number }
export interface State {
  board: (Part | null)[]; ticks: number; turn: number;
  enemy: { hp: number; maxHp: number; intent: number };
  player: { hp: number; block: number };
}
// tick: which tick; step: BFS depth within the tick (drives replay timing). amount by kind:
// damage/block = amount dealt, charge = new charge, heat = new heat, tickAdded = new tick total, attack = HP lost.
export interface Ev { tick: number; step: number; kind: EvKind; cell: number; from: number; amount: number }
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const idx = (col: number, row: number) => row * COLS + col;
export const colOf = (i: number) => i % COLS;
export const rowOf = (i: number) => (i / COLS) | 0;

export function newPart(kind: PartKind): Part { return { kind, charge: 0, count: 0, heat: 0 }; }

export function newState(): State {
  const board: (Part | null)[] = new Array(COLS * ROWS).fill(null);
  board[MAINSPRING] = newPart('mainspring');
  return { board, ticks: 3, turn: 0, enemy: { hp: 80, maxHp: 80, intent: 8 }, player: { hp: 40, block: 0 } };
}

export function cloneState(s: State): State {
  return {
    board: s.board.map(p => (p ? { kind: p.kind, charge: p.charge, count: p.count, heat: p.heat } : null)),
    ticks: s.ticks, turn: s.turn,
    enemy: { hp: s.enemy.hp, maxHp: s.enemy.maxHp, intent: s.enemy.intent },
    player: { hp: s.player.hp, block: s.player.block },
  };
}

// Neighbor order: up, right, down, left (fixed, so results are deterministic).
const NEIGHBORS: number[][] = [];
for (let i = 0; i < COLS * ROWS; i++) {
  const c = colOf(i), r = rowOf(i), n: number[] = [];
  if (r > 0) n.push(idx(c, r - 1));
  if (c < COLS - 1) n.push(idx(c + 1, r));
  if (r < ROWS - 1) n.push(idx(c, r + 1));
  if (c > 0) n.push(idx(c - 1, r));
  NEIGHBORS.push(n);
}
const MAX_TICKS = 8;

export function simulateTurn(state: State, rng: Rng): { nextState: State; events: Ev[] } {
  const s = cloneState(state);
  const events: Ev[] = [];
  const board = s.board;
  let budget = s.ticks;
  let pendulumFired = false;
  s.player.block = 0;
  let tick = 0, step = 0;
  const emit = (kind: EvKind, cell: number, from = -1, amount = 0) => events.push({ tick, step, kind, cell, from, amount });

  for (tick = 0; tick < budget; tick++) {
    const visited = new Uint8Array(COLS * ROWS);
    const idlerUsed = new Uint8Array(COLS * ROWS);
    visited[MAINSPRING] = 1;
    step = 0;
    emit('pulse', MAINSPRING, -1);
    const queue: number[] = [MAINSPRING];
    const depth: number[] = [0];
    for (let q = 0; q < queue.length; q++) {
      const cell = queue[q], d = depth[q];
      for (const nb of NEIGHBORS[cell]) {
        const np = board[nb];
        if (!np || visited[nb]) continue;
        visited[nb] = 1;
        step = d + 1;
        emit('pulse', nb, cell);
        emit('power', nb, cell);
        // Idler bonus: only the first part an idler powers gets +1.
        let bonus = 0;
        if (board[cell]!.kind === 'idler' && !idlerUsed[cell]) { idlerUsed[cell] = 1; bonus = 1; }
        const dmg = (n: number) => {
          s.enemy.hp = Math.max(0, s.enemy.hp - n);
          emit('damage', nb, cell, n);
        };
        let pass = true;
        switch (np.kind) {
          case 'spur': dmg(2 + bonus); break;
          case 'coil':
            np.charge += 1;
            emit('charge', nb, cell, np.charge);
            if (np.charge >= 3) {
              np.charge = 0;
              emit('release', nb, cell, 0);
              dmg(9 + bonus);
            } else pass = false;
            break;
          case 'cam':
            np.count += 1;
            if (np.count % 2 === 0) dmg(6 + bonus);
            break;
          case 'boiler':
            np.heat += 2 + bonus;
            emit('heat', nb, cell, np.heat);
            break;
          case 'piston':
            for (const pn of NEIGHBORS[nb]) {
              const b = board[pn];
              if (b && b.kind === 'boiler' && b.heat >= 2) {
                b.heat -= 2;
                emit('heat', pn, nb, b.heat);
                dmg(7 + bonus);
                break;
              }
            }
            break;
          case 'pendulum':
            if (!pendulumFired) {
              pendulumFired = true;
              if (budget < MAX_TICKS) { budget++; emit('tickAdded', nb, cell, budget); }
            }
            break;
          case 'escapement':
            s.player.block += 3 + bonus;
            emit('block', nb, cell, 3 + bonus);
            break;
          default: break; // idler: nothing, just passes
        }
        if (pass) { queue.push(nb); depth.push(d + 1); }
      }
    }
  }
  // The enemy acts after the machine; block absorbs. Its next intent varies slightly (this is what uses the rng).
  tick = budget - 1; step = 0;
  const lost = Math.max(0, s.enemy.intent - s.player.block);
  s.player.hp -= lost;
  emit('attack', -1, s.enemy.intent, lost); // from = the enemy's intent this turn, amount = HP actually lost
  s.enemy.intent = 7 + Math.floor(rng() * 3);
  s.turn += 1;
  s.ticks = state.ticks; // the pendulum's extra tick lasts one turn only
  return { nextState: s, events };
}

export interface Preview {
  damage: number; block: number; ticks: number; fired: number[];
  perPart: Record<number, { damage: number; block: number }>;
}
// Runs on a clone (simulateTurn clones internally); never mutates `state`.
export function preview(state: State): Preview {
  const { events } = simulateTurn(state, mulberry32(1));
  const out: Preview = { damage: 0, block: 0, ticks: state.ticks, fired: [], perPart: {} };
  const fired = new Set<number>();
  for (const e of events) {
    if (e.kind === 'power') fired.add(e.cell);
    if (e.kind === 'tickAdded') out.ticks = e.amount;
    if (e.kind === 'damage' || e.kind === 'block') {
      const pp = (out.perPart[e.cell] ??= { damage: 0, block: 0 });
      if (e.kind === 'damage') { out.damage += e.amount; pp.damage += e.amount; }
      else { out.block += e.amount; pp.block += e.amount; }
    }
  }
  out.fired = [...fired].sort((a, b) => a - b);
  return out;
}
