// B10b application points (docs/briefs/B10b-curve.md "Round 2"). B10b.0 CONTRACT: every body is a pass-through, so Journeyman at
// Overwind 0 plays exactly as before. modes-overwind (B10b.1) fills them from `run.config.mode` / `overwind` (RunConfig) and
// `CombatState.mode` / `overwind`. Each is called from the place its rule lives, marked `// B10b hook (modes-overwind)`.
//
// Order of operations the lane implements (content.md 9, rules 5.7):
//   enemy HP: mode HP % times (Overwind 3: 1.2 on parts), multiplied, rounded half up once, every part and core (also summons);
//   a hit the player takes: base amount times mode damage %, rounded half up; then Strength; then Overwind 8's +2; then the
//     player's reductions (Dazed and the like); then Plating. The mode % never touches Shell, Mend, Bulwark, Governor or Drain;
//   hours per act: the mode's hours, minus 1 (Overwind 2), plus 1 in act 3 with the beacon, never below 6;
//   oil: base times mode oil % times 0.5 at Overwind 6, round half up (stations, trader oil and Oil Flasks alike);
//   Brass: mode % times (1 + 0.1 times the Overwind level), once, at finishRun.
import { DEFAULT_MODE, MODE_BY_ID } from './content/modes';
import { ENEMIES, MEMORY_PARTS } from './content/enemies';
import { ACT_ATTACK_PCT, ACT_CORE_HP_PCT, WARDEN_ATTACK_PCT } from './content/balance';
import { neighbors } from './board';
import { MAINSPRING } from './types';
import { frameOf, initPart } from './framelib';
import type { ModeDef } from './defs';
import type { CombatState, EnemyPartState, EnemyState, Plan, Profile, RunState } from './types';

/** Round half up of n / d for non-negative integers. */
const rh = (n: number, d: number): number => Math.floor((2 * n + d) / (2 * d));

/** The mode of a combat or run config (missing or unknown: Journeyman, the old saves' mode). */
export function modeOf(id: string | undefined): ModeDef {
  return MODE_BY_ID[id ?? DEFAULT_MODE] ?? MODE_BY_ID[DEFAULT_MODE];
}
const runMode = (run: RunState): ModeDef => modeOf(run.config.mode);
const runLevel = (run: RunState): number => run.config.overwind ?? 0;
const combatLevel = (c: CombatState): number => c.overwind ?? 0;

/** One part's HP: the mode % times Overwind 3's +20%, multiplied, rounded half up once. */
export function scalePart(c: CombatState, p: EnemyPartState): void {
  const hp = rh(p.maxHp * modeOf(c.mode).enemyHp * (combatLevel(c) >= 3 ? 120 : 100), 10000);
  p.hp = hp;
  p.maxHp = hp;
}

/** Combat start and every summon: scale the enemy's HP (parts and core). The core takes the mode % only. */
export function scaleEnemy(c: CombatState, e: EnemyState): void {
  const m = modeOf(c.mode);
  const d = ENEMIES[e.defId];
  const actPct = c.curved && d && d.tier === 'normal' && !d.summonOnly ? ACT_CORE_HP_PCT[d.act as 1 | 2 | 3] : 100; // B10c hook (curve): regular cores in acts 2 and 3
  const core = rh(rh(e.maxHp * actPct, 100) * m.enemyHp, 100);
  e.hp = core;
  e.maxHp = core;
  for (const p of e.parts) scalePart(c, p);
}

/** The amount of one enemy attack the player takes before reductions: the mode % of the base, then Strength, then Overwind 8's +2. */
export function enemyAmount(c: CombatState, base: number, strength: number): number {
  const act = c.curved ? (ENEMIES[c.enemies[0]?.defId]?.act ?? 1) : 1;
  const pct = !c.curved ? 100 : c.kind === 'boss' ? WARDEN_ATTACK_PCT[act as 1 | 2 | 3] : ACT_ATTACK_PCT[act as 1 | 2 | 3];
  const scaled = pct === 100 ? base : rh(base * pct, 100); // B10c hook (curve): per-act attack percent (regulars and elites; wardens have their own)
  return rh(scaled * modeOf(c.mode).enemyDamage, 100) + strength + (combatLevel(c) >= 8 ? 2 : 0);
}

/** Hours in this act (startAct): the mode's, one fewer with Overwind 2, one more in act 3 with the beacon, never below 6. */
export function hoursFor(run: RunState, beacon: boolean): number {
  return Math.max(6, runMode(run).hours - (runLevel(run) >= 2 ? 1 : 0) + (beacon ? 1 : 0));
}

/** An oil heal (stations, trader oil, Oil Flasks): the mode's percent as a ratio to Journeyman's 30, halved with Overwind 6. */
export function oilHealFor(run: RunState, base: number): number {
  return rh(base * runMode(run).oilHeal * (runLevel(run) >= 6 ? 50 : 100), 3000);
}

/** A trader price (Overwind 1: +15%). */
export function traderPrice(run: RunState, price: number): number {
  return runLevel(run) >= 1 ? rh(price * 115, 100) : price;
}

/** How many ordinary salvaged parts may be kept from one tray (Overwind 7: 1; items marked `scrapper` don't count). */
export function salvageKeepLimit(run: RunState): number {
  return runLevel(run) >= 7 ? 1 : Infinity;
}

/** Scrap for a salvage item that is not kept (3, or 2 with Overwind 7). */
export function scrapPerScrapped(run: RunState, base: number): number {
  return runLevel(run) >= 7 ? 2 : base;
}

/** How many steps every elite takes when an hour passes (Overwind 5: 2 on every third hour spent). */
export function eliteSteps(run: RunState): number {
  const hour = run.hour ?? 0;
  return runLevel(run) >= 5 && hour > 0 && hour % 3 === 0 ? 2 : 1;
}

/** A part was placed on `cell` (Overwind 4: the first one placed each combat is Rusted until the next turn). */
export function afterPlacement(c: CombatState, cell: number): void {
  if (combatLevel(c) < 4) return;
  const flags = (c.flags ??= {});
  if (flags.coldJoints) return;
  flags.coldJoints = 1;
  const part = c.board[cell];
  if (!part) return;
  if (c.trinkets.includes('grease-pot') && neighbors(MAINSPRING).includes(cell)) return; // an ordinary Rust: Grease Pot stops it
  part.rusted = 1;
}

/** Combat start: wardens gain the extra part chosen by the player's plan (Overwind 9: the Foreman and the Queen). */
export function wardenExtraPart(c: CombatState, memory: Plan | null | undefined): void {
  if (combatLevel(c) < 9 || !memory) return;
  for (const e of c.enemies) {
    if (e.defId !== 'foreman' && e.defId !== 'boilermaker') continue;
    const d = MEMORY_PARTS[memory];
    if (!d || !frameOf(e) || e.parts.some((p) => p.id === d.id)) continue;
    const s = initPart(d);
    scalePart(c, s);
    e.parts.push(s);
  }
}

/** Brass at the end of a run (finishRun): the mode % times the Overwind bonus, multiplied once. */
export function scaleBrass(run: RunState, brass: number): number {
  return rh(brass * runMode(run).brass * (10 + runLevel(run)), 1000);
}


// ---------- the clock tower door: what is open and what opens the rest ----------

const MODE_LOCK: Record<string, string> = { master: 'Win a run on Journeyman', clockwork: 'Win a run on Master' };

/** Why a mode is shut, or null when it is open. */
export function modeLock(p: Profile, id: string): string | null {
  return (p.modesUnlocked ?? []).includes(id) ? null : (MODE_LOCK[id] ?? 'Not open yet');
}

/** What opens Overwind level `n` (1 to 10). */
export function overwindLockText(n: number): string {
  if (n <= 3) return 'Win a run on Journeyman or harder';
  if (n <= 5) return 'Win a run on Master';
  if (n <= 7) return 'Win a run on Clockwork';
  if (n <= 9) return 'Win a run at Overwind 5';
  return 'Win a run at Overwind 8';
}

/** Why Overwind level `n` is shut, or null when it is open (level 0 is always open). */
export function overwindLock(p: Profile, n: number): string | null {
  return n <= (p.rewards?.overwind ?? 0) ? null : overwindLockText(n);
}
