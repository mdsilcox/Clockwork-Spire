// Content checks computed from the defs (docs/rules.md 7.4 target 7, docs/content.md section 3.0).
import type { ActionDef, Cadence } from '../types';
import type { EnemyPartDef } from '../defs';
import { ENEMIES } from './enemies';

export interface BypassShare {
  act: 1 | 2 | 3;
  damage: number; // expected damage per turn, all regulars of the act, averaged over each part's cadence cycle
  pierce: number;
  siphon: number;
  corrodeCredit: number; // reported, not in the share
  share: number; // (pierce + siphon) / damage
}

/** The Plating stack the doc strips with Corrode at, per act (the spike's mean peak Plating, content.md 3.0). */
const REFERENCE_STACK: Record<1 | 2 | 3, number> = { 1: 37, 2: 50, 3: 59 };

/** Fraction of enemy turns on which a part acts, averaged over its cycle (countdown: once every N turns). */
function actsPerTurn(c: Cadence): number {
  if (c === 'every') return 1;
  if (c === 'odd' || c === 'even') return 0.5;
  if (c === 'once' || c === 'passive') return 0;
  if ('of' in c) return c.at.length / c.of;
  if ('countdown' in c) return 1 / c.countdown;
  return 0; // build-up parts are not in the regular pool
}

/** A part's first-action amount averaged over its escalation cycle (4, 5, 6 averages 5). */
function averageAmount(p: EnemyPartDef, a: ActionDef, index: number): number {
  const base = a.amount ?? 0;
  if (index !== 0 || !p.escalate || !p.escalateResetAt) return base;
  const steps: number[] = [];
  for (let v = base; v <= p.escalateResetAt; v += p.escalate) steps.push(v);
  return steps.reduce((x, y) => x + y, 0) / steps.length;
}

/** The act's regular pool, equally weighted: escalating numbers at their cycle average; Ratchet growth not counted. */
export function bypassShare(act: 1 | 2 | 3): BypassShare {
  let damage = 0;
  let pierce = 0;
  let siphon = 0;
  let corrodeCredit = 0;
  const regulars = Object.values(ENEMIES).filter((d) => d.act === act && d.tier === 'normal' && d.frame && !d.summonOnly);
  for (const d of regulars) {
    const parts = d.frame!.parts;
    const strongestAttack = Math.max(0, ...parts.flatMap((p) => p.actions.filter((a) => a.kind === 'attack').map((a) => (a.amount ?? 0) * (a.hits ?? 1))));
    for (const p of parts) {
      const w = actsPerTurn(p.cadence);
      if (w === 0) continue;
      const ownAttack = Math.max(0, ...p.actions.filter((a) => a.kind === 'attack').map((a) => (a.amount ?? 0) * (a.hits ?? 1)));
      p.actions.forEach((a, i) => {
        const dmg = averageAmount(p, a, i) * (a.hits ?? 1) * w;
        if (a.kind === 'attack') damage += dmg;
        else if (a.kind === 'pierce' || a.kind === 'echo') {
          damage += dmg;
          pierce += dmg;
        } else if (a.kind === 'siphon') {
          damage += dmg;
          siphon += dmg;
        } else if (a.kind === 'corrode') {
          // credit: the Plating stripped, capped at the Attack it feeds (its own, or the frame's biggest)
          const stripped = Math.ceil(((a.pct ?? 0) / 100) * REFERENCE_STACK[act]);
          corrodeCredit += Math.min(stripped, ownAttack || strongestAttack) * w;
        }
      });
    }
  }
  return { act, damage, pierce, siphon, corrodeCredit, share: damage > 0 ? (pierce + siphon) / damage : 0 };
}

/**
 * B10c round 1 (D-047): per-act percent of the amount of every Attack, Pierce, Siphon and Echo payload that regular and elite enemies
 * deal (never Shell, Mend, Bulwark, Governor or Drain, and never a warden fight). Applied in one place, `enemyAmount` (difficulty.ts),
 * before the mode's damage %. 100 = the content.md amount. Act 1 gets +10% (BV3 act 1 normals needed the step); acts 2 and 3 carry the attrition.
 */
export const ACT_ATTACK_PCT: Record<1 | 2 | 3, number> = { 1: 110, 2: 210, 3: 210 };

/** B10c round 1 (D-047): percent of a regular (tier normal, not a summon) enemy's core HP in acts 2 and 3; applied in `scaleEnemy` (difficulty.ts). */
export const ACT_CORE_HP_PCT: Record<1 | 2 | 3, number> = { 1: 100, 2: 100, 3: 100 };

/** B10c round 1 (D-047): the oil station's rest heals this percent of max HP (rounded down; content.md 4). */
export const OIL_REST_PCT = 30;

/** B10c round 1 (D-047): the same percent for warden fights (kind 'boss': the Foreman act 1, the Queen act 2, the Clockmaker act 3, and their summons). */
export const WARDEN_ATTACK_PCT: Record<1 | 2 | 3, number> = { 1: 100, 2: 105, 3: 115 };
