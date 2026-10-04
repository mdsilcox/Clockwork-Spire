import { newState, newPart, simulateTurn, mulberry32, idx, type State, type PartKind, type Ev } from './src/sim.ts';

// Fixed mix, filled row 0 (5 cells), row 1 cols 1-4, row 2 (5 cells) = 14 parts.
export const MIX: PartKind[] = [
  'spur', 'idler', 'spur', 'cam', 'spur',
  'spur', 'coil', 'boiler', 'piston',
  'spur', 'pendulum', 'boiler', 'piston', 'escapement',
];
export function fullBoard(): State {
  const s = newState();
  const order: [number, number][] = [];
  for (let c = 0; c < 5; c++) order.push([c, 0]);
  for (let c = 1; c < 5; c++) order.push([c, 1]);
  for (let c = 0; c < 5; c++) order.push([c, 2]);
  order.forEach(([c, r], i) => { s.board[idx(c, r)] = newPart(MIX[i]); });
  return s;
}
const KIND_ID: Record<string, number> = { pulse: 1, power: 2, damage: 3, block: 4, charge: 5, release: 6, heat: 7, tickAdded: 8, attack: 9 };

function run(seed: number, turns: number, keep: number) {
  let s = fullBoard();
  const rng = mulberry32(seed);
  let h = 2166136261 >>> 0, nEvents = 0;
  const kept: Ev[][] = [];
  for (let t = 0; t < turns; t++) {
    const { nextState, events } = simulateTurn(s, rng);
    s = nextState;
    nEvents += events.length;
    if (t < keep) kept.push(events);
    for (const e of events) {
      for (const v of [e.tick, e.step, KIND_ID[e.kind], e.cell, e.from, e.amount]) {
        h = Math.imul(h ^ (v + 1000), 16777619) >>> 0;
      }
    }
    // reset the dummy fight so the sim keeps doing real work
    if (s.enemy.hp <= 0) s.enemy.hp = s.enemy.maxHp;
    if (s.player.hp <= 0) s.player.hp = 40;
  }
  return { h, nEvents, kept };
}

const TURNS = 100_000;
run(1, 5000, 0); // warm up the JIT
const t0 = performance.now();
const a = run(42, TURNS, 1000);
const dt = (performance.now() - t0) / 1000;
const b = run(42, TURNS, 1000);
const c = run(43, TURNS, 0);
const tps = TURNS / dt;
const sameHash = a.h === b.h;
const sameLists = JSON.stringify(a.kept) === JSON.stringify(b.kept);
console.log(`turns: ${TURNS}, time: ${dt.toFixed(2)}s, turns/sec: ${Math.round(tps)}`);
console.log(`events/turn: ${(a.nEvents / TURNS).toFixed(1)}`);
console.log(`full runs/sec (200 turns each): ${(tps / 200).toFixed(0)}`);
console.log(`determinism: hash(seed42 #1)=${a.h.toString(16)} hash(seed42 #2)=${b.h.toString(16)} equal=${sameHash}, first 1000 event lists identical=${sameLists}`);
console.log(`different seed hash=${c.h.toString(16)} differs=${c.h !== a.h}`);
(globalThis as any).process.exit(sameHash && sameLists ? 0 : 1);
