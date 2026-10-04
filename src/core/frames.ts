// v2 enemy machines: the public API the UI, the bots and the run use (docs/rules.md 2.1 to 2.3, 4.8).
// B7 CONTRACT: signatures are fixed; the enemy-engine lane implements the bodies (and the rules inside
// enemy.ts, machine.ts and combat.ts). Pure and deterministic, like the rest of src/core.
import type { CombatState, PartIntent, TargetRef } from './types';

/** At most this many entries in the target order. */
export const MAX_ORDER = 6;

export function refOf(enemy: number, part: string): TargetRef {
  return `e${enemy}.${part}`;
}

export function parseRef(ref: TargetRef | string): { enemy: number; part: string } {
  const dot = ref.indexOf('.');
  return { enemy: Number(ref.slice(1, dot)), part: ref.slice(dot + 1) };
}

/** Is this part unbroken (or this core alive) on a living enemy? */
export function isStanding(c: CombatState, ref: TargetRef): boolean {
  void c;
  void ref;
  throw new Error('B7: isStanding not implemented');
}

/** May this entry join the target order now? (standing, and not a sealed core) */
export function canTarget(c: CombatState, ref: TargetRef): boolean {
  void c;
  void ref;
  throw new Error('B7: canTarget not implemented');
}

/** Every part and core that may join the order now, left to right. */
export function targetables(c: CombatState): TargetRef[] {
  void c;
  throw new Error('B7: targetables not implemented');
}

/** Tap: append the entry if absent (and allowed, and fewer than MAX_ORDER), remove it if present. Returns whether it changed. */
export function toggleTarget(c: CombatState, ref: TargetRef): boolean {
  void c;
  void ref;
  throw new Error('B7: toggleTarget not implemented');
}

/** Replace the order (invalid entries dropped, capped at MAX_ORDER). An empty order is allowed. */
export function setOrder(c: CombatState, refs: TargetRef[]): void {
  void c;
  void refs;
  throw new Error('B7: setOrder not implemented');
}

/** The default order (rules 2.3): the leftmost living enemy's acting parts in intent order, then its core (if targetable). */
export function defaultOrder(c: CombatState): TargetRef[] {
  void c;
  throw new Error('B7: defaultOrder not implemented');
}

/** The front of an enemy: its core, or its first unbroken keystone while sealed (Sweeps and the empty-order fallback). */
export function frontOf(c: CombatState, enemy: number): TargetRef | null {
  void c;
  void enemy;
  throw new Error('B7: frontOf not implemented');
}

/** Where the next Strike goes: the first standing order entry, else the front of the leftmost living enemy; null if none. */
export function currentTarget(c: CombatState): TargetRef | null {
  void c;
  throw new Error('B7: currentTarget not implemented');
}

/** What enemy `enemy` will do on its next turn, one entry per acting part (or its core). */
export function intentsOf(c: CombatState, enemy: number): PartIntent[] {
  return c.enemies[enemy]?.intents ?? [];
}
