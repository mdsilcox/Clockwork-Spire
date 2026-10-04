// Board geometry. 5 columns (A-E) by 3 rows (1-3); index = row * 5 + col. A2 (index 5) is the Mainspring.
import { CELLS, COLS, ROWS } from './types';

export function cell(name: string): number {
  const m = /^([A-E])([1-3])$/i.exec(name.trim());
  if (!m) throw new Error(`Bad cell name: ${name}`);
  return (Number(m[2]) - 1) * COLS + (m[1].toUpperCase().charCodeAt(0) - 65);
}

export function cellName(i: number): string {
  return String.fromCharCode(65 + (i % COLS)) + String(Math.floor(i / COLS) + 1);
}

export const colOf = (i: number): number => i % COLS;
export const rowOf = (i: number): number => Math.floor(i / COLS);

export function inBoard(i: number): boolean {
  return Number.isInteger(i) && i >= 0 && i < CELLS;
}

/** Edge neighbors in the fixed order up, right, down, left. */
export function neighbors(i: number): number[] {
  const c = colOf(i);
  const r = rowOf(i);
  const out: number[] = [];
  if (r > 0) out.push(i - COLS);
  if (c < COLS - 1) out.push(i + 1);
  if (r < ROWS - 1) out.push(i + COLS);
  if (c > 0) out.push(i - 1);
  return out;
}

/** Diagonal neighbors in the order up-right, down-right, down-left, up-left. */
export function diagonals(i: number): number[] {
  const c = colOf(i);
  const r = rowOf(i);
  const out: number[] = [];
  if (r > 0 && c < COLS - 1) out.push(i - COLS + 1);
  if (r < ROWS - 1 && c < COLS - 1) out.push(i + COLS + 1);
  if (r < ROWS - 1 && c > 0) out.push(i + COLS - 1);
  if (r > 0 && c > 0) out.push(i - COLS - 1);
  return out;
}
