// Frame helpers shared by enemy.ts, machine.ts, frames.ts and run.ts: part lookup, passives, cadences, intent labels.
// Pure. Legacy enemies (no `frame`) have no parts; every helper treats them as a core-only enemy.
import { enemyDef } from './content/enemies';
import type { EnemyPartDef, FrameDef, Passive } from './defs';
import type { ActionDef, Cadence, EnemyPartState, EnemyState, IntentKind } from './types';

export function frameOf(e: EnemyState): FrameDef | undefined {
  return enemyDef(e.defId).frame;
}

/** Every part def of a frame (all phases for wardens). */
export function allPartDefs(f: FrameDef): EnemyPartDef[] {
  const base = f.phases ? f.phases.flatMap((p) => p.parts) : f.parts;
  return f.memoryParts ? [...base, ...Object.values(f.memoryParts)] : base;
}

export function partDefOf(e: EnemyState, id: string): EnemyPartDef | undefined {
  const f = frameOf(e);
  return f ? allPartDefs(f).find((p) => p.id === id) : undefined;
}

export function partState(e: EnemyState, id: string): EnemyPartState | undefined {
  return e.parts.find((p) => p.id === id);
}

export function initPart(d: EnemyPartDef): EnemyPartState {
  const s: EnemyPartState = { id: d.id, hp: d.hp, maxHp: d.hp, broken: false, jammed: false, acted: 0, tookThisTurn: 0 };
  if (typeof d.cadence === 'object' && 'countdown' in d.cadence) s.countdown = d.cadence.countdown;
  if (typeof d.cadence === 'object' && 'buildUp' in d.cadence) s.gauge = 0;
  return s;
}

/** The first standing part of this passive kind on enemy `e` (parts of a living enemy only). */
export function standingPassive<K extends Passive['kind']>(e: EnemyState, kind: K): Extract<Passive, { kind: K }> | null {
  const f = frameOf(e);
  if (!f) return null;
  for (const p of e.parts) {
    if (p.broken) continue;
    const d = partDefOf(e, p.id);
    if (d?.passive?.kind === kind) return d.passive as Extract<Passive, { kind: K }>;
  }
  return null;
}

/** Parts that have actions (non-passive) and are not broken: the enemy's acting parts. */
export function standingActing(e: EnemyState): EnemyPartState[] {
  return e.parts.filter((p) => {
    if (p.broken) return false;
    const d = partDefOf(e, p.id);
    return !!d && d.actions.length > 0 && d.cadence !== 'passive';
  });
}

export function isCountdown(c: Cadence): c is { countdown: number } {
  return typeof c === 'object' && 'countdown' in c;
}
export function isBuildUp(c: Cadence): c is { buildUp: number; to: number; bonus?: 'drained' } {
  return typeof c === 'object' && 'buildUp' in c;
}

/** Plain cadences: does it act on enemy turn `t` (1-based within the phase)? Countdown and build-up are stateful. */
export function actsOnTurn(c: Cadence, t: number): boolean {
  if (c === 'every') return true;
  if (c === 'odd') return t % 2 === 1;
  if (c === 'even') return t % 2 === 0;
  if (c === 'once') return t === 1;
  if (c === 'passive') return false;
  if (typeof c === 'object' && 'of' in c) return c.at.includes(((t - 1) % c.of) + 1);
  return false;
}

/** The actions a part performs on its turn `t` of a cycle (Midnight Bell has different lists by turn). */
export function actionsFor(d: EnemyPartDef, t: number): ActionDef[] {
  if (d.actionsByTurn) {
    const of = typeof d.cadence === 'object' && 'of' in d.cadence ? d.cadence.of : 0;
    const k = of > 0 ? ((t - 1) % of) + 1 : t;
    if (d.actionsByTurn[k]) return d.actionsByTurn[k];
  }
  return d.actions;
}

/** Bonus to the first action's amount from escalation, given how often the part acted already. */
export function escalationBonus(d: EnemyPartDef, acted: number): number {
  if (!d.escalate) return 0;
  const base = d.actions[0]?.amount ?? 0;
  let n = acted;
  if (d.escalateResetAt !== undefined && d.escalate > 0) {
    const cycle = Math.floor((d.escalateResetAt - base) / d.escalate) + 1;
    if (cycle > 0) n = acted % cycle;
  }
  return d.escalate * n;
}

const STATUS_NAME: Record<string, string> = { corroded: 'Corroded', dazed: 'Dazed' };

export function actionLabel(a: ActionDef, bonus = 0): string {
  const amt = (a.amount ?? 0) + bonus;
  switch (a.kind) {
    case 'attack':
      return `Attack ${amt}${a.hits && a.hits > 1 ? ` x${a.hits}` : ''}`;
    case 'pierce':
      return `Pierce ${amt}${a.hits && a.hits > 1 ? ` x${a.hits}` : ''}`;
    case 'siphon':
      return `Siphon ${amt}`;
    case 'corrode':
      return `Corrode ${a.pct ?? 0}%`;
    case 'shell':
      return `Shell ${amt}`;
    case 'mend':
      return `Mend ${amt}`;
    case 'rebuild':
      return 'Rebuild';
    case 'rust':
      return `Rust${(a.count ?? a.amount ?? 1) > 1 ? ` ${a.count ?? a.amount}` : ''}`;
    case 'jam':
      return 'Jam';
    case 'magnetize':
      return 'Magnetize';
    case 'drain':
      return `Drain ${amt}`;
    case 'reset-pressure':
      return 'Reset Pressure';
    case 'status':
      return `${STATUS_NAME[a.status ?? ''] ?? a.status ?? 'Status'} ${amt}`;
    case 'summon':
      return 'Summon';
    case 'buff':
      return `Buff ${amt}`;
    case 'purge':
      return 'Purge';
    case 'echo':
      return `Echo${amt > 0 ? ` ${amt}` : ''}`;
    case 'rewind':
      return 'Rewind';
  }
}

export function actionIntentKind(a: ActionDef): IntentKind {
  switch (a.kind) {
    case 'attack':
    case 'pierce':
    case 'siphon':
    case 'echo':
      return 'attack';
    case 'shell':
    case 'mend':
    case 'rebuild':
      return 'defend';
    case 'rust':
    case 'jam':
    case 'magnetize':
    case 'drain':
    case 'reset-pressure':
      return 'sabotage';
    case 'corrode':
    case 'status':
      return 'debuff';
    case 'summon':
      return 'summon';
    case 'buff':
      return 'buff';
    default:
      return 'special';
  }
}

/** The icon kind of a list of actions: the first attack, else sabotage, else the first action that isn't Corrode. */
export function listIntentKind(actions: ActionDef[]): IntentKind {
  const kinds = actions.map(actionIntentKind);
  for (const k of ['attack', 'sabotage', 'summon', 'buff', 'defend', 'debuff'] as IntentKind[]) if (kinds.includes(k)) return k;
  return kinds[0] ?? 'special';
}
