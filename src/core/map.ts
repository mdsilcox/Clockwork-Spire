// Act map generation (docs/rules.md 4.1). Four lanes, floors 1-12 with 2 to 4 nodes each, the boss on floor 13.
// Links between two floors form a monotone staircase over the sorted lanes, so paths may shift lanes but never cross.
import { int, next } from './rng';
import type { RngState } from './rng';
import type { ActMap, MapNode, NodeType } from './types';

const LANES = 4;
const FLOORS = 12;

/** Pick `count` distinct lanes, sorted. */
function pickLanes(rng: RngState, count: number): number[] {
  const lanes = [0, 1, 2, 3];
  for (let i = lanes.length - 1; i > 0; i--) {
    const j = int(rng, 'map', i + 1);
    [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
  }
  return lanes.slice(0, count).sort((a, b) => a - b);
}

/**
 * Edges between floor f (a nodes) and floor f+1 (b nodes) as [from, to] index pairs: a monotone walk from
 * (0,0) to (a-1,b-1), every node has an edge, and every `from` has at most 2 edges. Returns null if the walk
 * painted itself into a corner (the caller retries).
 */
function links(rng: RngState, a: number, b: number): [number, number][] | null {
  const edges: [number, number][] = [[0, 0]];
  let i = 0;
  let j = 0;
  const deg = new Array(a).fill(0);
  deg[0] = 1;
  while (i < a - 1 || j < b - 1) {
    const opts: ('i' | 'j' | 'ij')[] = [];
    if (i < a - 1 && j < b - 1) opts.push('ij');
    if (i < a - 1) opts.push('i');
    if (j < b - 1 && deg[i] < 2) opts.push('j');
    if (opts.length === 0) return null;
    const o = opts[int(rng, 'map', opts.length)];
    if (o === 'i' || o === 'ij') i++;
    if (o === 'j' || o === 'ij') j++;
    deg[i]++;
    edges.push([i, j]);
  }
  return edges;
}

function weightedType(rng: RngState, floor: number): NodeType {
  const table: [NodeType, number][] = [
    ['fight', 45],
    ['elite', floor >= 4 ? 15 : 0],
    ['event', 22],
    ['shop', 8],
    ['forge', 5],
    ['oil', 5],
  ];
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = next(rng, 'map') * total;
  for (const [t, w] of table) {
    if (r < w) return t;
    r -= w;
  }
  return 'fight';
}

/** Generate the map for an act from the `map` stream of `rng` (advances it). */
export function generateActMap(rng: RngState, act: 1 | 2 | 3): ActMap {
  const lanesByFloor: number[][] = [[]];
  for (let f = 1; f <= FLOORS; f++) lanesByFloor.push(pickLanes(rng, 2 + int(rng, 'map', LANES - 1)));
  lanesByFloor.push([int(rng, 'map', LANES)]); // the boss
  const id = (f: number, lane: number) => `${act}-${f}-${lane}`;

  const nodes: MapNode[] = [];
  for (let f = 1; f <= 13; f++) {
    for (const lane of lanesByFloor[f]) {
      let type: NodeType;
      if (f === 1) type = 'fight';
      else if (f === 7) type = 'forge';
      else if (f === 12) type = 'oil';
      else if (f === 13) type = 'boss';
      else type = weightedType(rng, f);
      nodes.push({ id: id(f, lane), floor: f, lane, type, next: [], visited: false });
    }
  }
  const find = (f: number, lane: number) => nodes.find((n) => n.id === id(f, lane))!;

  for (let f = 1; f <= 12; f++) {
    const A = lanesByFloor[f];
    const B = lanesByFloor[f + 1];
    if (f === 12) {
      for (const l of A) find(f, l).next = [id(13, B[0])];
      continue;
    }
    let edges: [number, number][] | null = null;
    for (let tries = 0; tries < 50 && !edges; tries++) edges = links(rng, A.length, B.length);
    if (!edges) {
      // deterministic fallback: link by rank
      edges = A.map((_, i) => [i, Math.min(B.length - 1, Math.floor((i * B.length) / A.length))] as [number, number]);
      for (let j = 0; j < B.length; j++) if (!edges.some((e) => e[1] === j)) edges.push([A.length - 1, j]);
    }
    for (const [i, j] of edges) {
      const n = find(f, A[i]);
      const to = id(f + 1, B[j]);
      if (!n.next.includes(to)) n.next.push(to);
    }
  }
  return { act, nodes };
}
