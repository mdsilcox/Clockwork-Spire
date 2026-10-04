// v2 enemy machines: the public API the UI, the bots and the run use (docs/rules.md 2.1 to 2.3, 4.8).
// B7 CONTRACT: signatures are fixed; the enemy-engine lane implements the bodies (and the rules inside
// enemy.ts, machine.ts and combat.ts). Pure and deterministic, like the rest of src/core.
import { partDefOf } from './framelib';
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
  const { enemy, part } = parseRef(ref);
  const e = c.enemies[enemy];
  if (!e || e.hp <= 0) return false;
  if (part === 'core') return true;
  const p = e.parts.find((x) => x.id === part);
  return !!p && !p.broken;
}

/** May this entry join the target order now? (standing, and not a sealed core) */
export function canTarget(c: CombatState, ref: TargetRef): boolean {
  if (!isStanding(c, ref)) return false;
  const { enemy, part } = parseRef(ref);
  return !(part === 'core' && c.enemies[enemy].sealed);
}

/** Every part and core that may join the order now, left to right. */
export function targetables(c: CombatState): TargetRef[] {
  const out: TargetRef[] = [];
  for (let i = 0; i < c.enemies.length; i++) {
    const e = c.enemies[i];
    if (e.hp <= 0) continue;
    for (const p of e.parts) if (!p.broken) out.push(refOf(i, p.id));
    if (!e.sealed) out.push(refOf(i, 'core'));
  }
  return out;
}

/** Keep the v1 `targetIdx` summary equal to the enemy of the current target. */
export function syncTargetIdx(c: CombatState): void {
  const t = currentTarget(c);
  if (t) c.targetIdx = parseRef(t).enemy;
}

/** Tap: append the entry if absent (and allowed, and fewer than MAX_ORDER), remove it if present. Returns whether it changed. */
export function toggleTarget(c: CombatState, ref: TargetRef): boolean {
  const at = c.order.indexOf(ref);
  if (at >= 0) {
    c.order.splice(at, 1);
    syncTargetIdx(c);
    return true;
  }
  if (c.order.length >= MAX_ORDER || !canTarget(c, ref)) return false;
  c.order.push(ref);
  syncTargetIdx(c);
  return true;
}

/** Replace the order (invalid entries dropped, capped at MAX_ORDER). An empty order is allowed. */
export function setOrder(c: CombatState, refs: TargetRef[]): void {
  const out: TargetRef[] = [];
  for (const r of refs) {
    if (out.length >= MAX_ORDER) break;
    if (!out.includes(r) && canTarget(c, r)) out.push(r);
  }
  c.order = out;
  syncTargetIdx(c);
}

/** The default order for one enemy: its acting parts in intent order, then its core (if targetable). */
export function defaultOrderFor(c: CombatState, enemy: number): TargetRef[] {
  const e = c.enemies[enemy];
  if (!e || e.hp <= 0) return [];
  const out: TargetRef[] = [];
  for (const it of e.intents) if (it.partId !== 'core') out.push(refOf(enemy, it.partId));
  const core = refOf(enemy, 'core');
  if (canTarget(c, core)) out.push(core);
  return out.filter((r) => canTarget(c, r)).slice(0, MAX_ORDER);
}

/** The default order (rules 2.3): the leftmost living enemy's acting parts in intent order, then its core (if targetable). */
export function defaultOrder(c: CombatState): TargetRef[] {
  const i = c.enemies.findIndex((e) => e.hp > 0);
  return i < 0 ? [] : defaultOrderFor(c, i);
}

/** The front of an enemy: its core, or its first unbroken keystone while sealed (Sweeps and the empty-order fallback). */
export function frontOf(c: CombatState, enemy: number): TargetRef | null {
  const e = c.enemies[enemy];
  if (!e || e.hp <= 0) return null;
  if (e.sealed) {
    const k = e.parts.find((p) => !p.broken && partDefOf(e, p.id)?.keystone);
    if (k) return refOf(enemy, k.id);
  }
  return refOf(enemy, 'core'); // a sealed core with every keystone down only soaks the damage (it is lost)
}

/** Where the next Strike goes: the first standing order entry, else the front of the leftmost living enemy; null if none. */
export function currentTarget(c: CombatState): TargetRef | null {
  for (const r of c.order) if (canTarget(c, r)) return r;
  const i = c.enemies.findIndex((e) => e.hp > 0);
  return i < 0 ? null : frontOf(c, i);
}

/** What enemy `enemy` will do on its next turn, one entry per acting part (or its core). */
export function intentsOf(c: CombatState, enemy: number): PartIntent[] {
  return c.enemies[enemy]?.intents ?? [];
}
