// Plain-words text for enemy parts: what an action does and when a part acts (tooltips and labels).
import { enemyDef } from '../core/content/enemies';
import type { ActionDef, Cadence, CombatState, PartIntent, TurnPreview } from '../core/types';
import type { EnemyPartDef } from '../core/defs';

/** The def of part `partId` of enemy def `defId` (a regular part, or a warden phase part). */
export function enemyPartDef(defId: string, partId: string): EnemyPartDef | undefined {
  const fr = enemyDef(defId).frame;
  if (!fr) return undefined;
  return [...fr.parts, ...(fr.phases ?? []).flatMap((ph) => ph.parts)].find((p) => p.id === partId);
}

const times = (a: ActionDef): string => ((a.hits ?? 1) > 1 ? `, ${a.hits} times` : '');

/** One action in plain words, e.g. "Attacks for 5". */
export function actionText(a: ActionDef): string {
  const n = a.amount ?? 0;
  switch (a.kind) {
    case 'attack':
      return `Attacks for ${n}${times(a)}`;
    case 'pierce':
      return `Pierces for ${n}${times(a)}, ignoring your Plating`;
    case 'corrode':
      return `Corrodes ${a.pct ?? 0}% of your Plating`;
    case 'siphon':
      return `Siphons up to ${n} Plating and heals its core by that much`;
    case 'shell':
      return `Gains ${n} Shell`;
    case 'mend':
      return `Mends ${n} HP${a.target === 'allies' ? ' on its allies' : ''}`;
    case 'rebuild':
      return 'Rebuilds a broken part';
    case 'rust':
      return `Rusts ${a.count ?? 1} of your parts`;
    case 'jam':
      return 'Jams your Mainspring';
    case 'magnetize':
      return 'Magnetizes one of your parts';
    case 'drain':
      return `Drains ${n} Pressure`;
    case 'reset-pressure':
      return 'Resets your Pressure';
    case 'status':
      return `Applies ${a.status ?? 'a status'} to you`;
    case 'summon':
      return `Summons ${a.count ?? 1} helper${(a.count ?? 1) === 1 ? '' : 's'}`;
    case 'buff':
      return `Gains ${n} Strength`;
    case 'purge':
      return 'Purges your statuses';
    case 'echo':
      return 'Echoes its last action';
    case 'rewind':
      return `Rewinds ${n || 1} of your parts`;
    default:
      return 'Acts';
  }
}

export function actionsText(actions: ActionDef[]): string {
  return actions.map(actionText).join(', then ');
}

/** When a part acts, in plain words. */
export function cadenceText(c: Cadence): string {
  if (typeof c === 'string') {
    switch (c) {
      case 'every':
        return 'Acts every turn.';
      case 'odd':
        return 'Acts on odd turns.';
      case 'even':
        return 'Acts on even turns.';
      case 'once':
        return 'Acts once, on its first turn.';
      default:
        return 'Never acts.';
    }
  }
  if ('countdown' in c) return `Acts after a countdown of ${c.countdown} turns.`;
  if ('buildUp' in c) return `Builds up ${c.buildUp} a turn and acts at ${c.to}.`;
  return `Acts on turns ${c.at.join(' and ')} of every ${c.of}.`;
}

/** The number shown beside an intent icon: damage first, otherwise the main amount. */
export function intentValue(it: PartIntent, bonus = 0): string {
  const hit = it.actions.find((a) => a.kind === 'attack' || a.kind === 'pierce');
  if (hit) return `${(hit.amount ?? 0) + bonus}${(hit.hits ?? 1) > 1 ? ` x${hit.hits}` : ''}`;
  const corrode = it.actions.find((a) => a.kind === 'corrode');
  if (corrode) return `${corrode.pct ?? 0}%`;
  const summon = it.actions.find((a) => a.kind === 'summon');
  if (summon) return `+${summon.count ?? 1}`;
  const other = it.actions.find((a) => (a.amount ?? 0) > 0);
  return other ? String(other.amount) : '';
}

/** "in 2" when the label says the action is a countdown away. */
export function intentWait(it: PartIntent): string {
  const m = / in (\d+)$/.exec(it.label);
  return m ? `in ${m[1]}` : '';
}

/**
 * Strength the enemy's standing Ratchet parts will add at the end of your turn, before it acts (rules 2.4).
 * A Ratchet part the preview breaks does not add it.
 */
export function pendingRatchet(c: CombatState, i: number, preview: TurnPreview | null): number {
  const e = c.enemies[i];
  if (!e || e.hp <= 0) return 0;
  let sum = 0;
  for (const p of e.parts ?? []) {
    if (p.broken) continue;
    const pd = enemyPartDef(e.defId, p.id);
    if (pd?.passive?.kind !== 'ratchet') continue;
    if (preview?.byTarget?.[`e${i}.${p.id}`]?.breaks) continue;
    sum += pd.passive.x;
  }
  return sum;
}

/** The damage line of the Run panel: core damage plus part damage, e.g. "9 damage (4 to parts)". */
export function damageText(preview: TurnPreview): string {
  const core = preview.damageByEnemy.reduce((a, b) => a + b, 0);
  const parts = Object.entries(preview.byTarget ?? {})
    .filter(([ref]) => !ref.endsWith('.core'))
    .reduce((a, [, v]) => a + v.damage, 0);
  const total = core + parts;
  return parts > 0 ? `${total} damage (${parts} to parts)` : `${total} damage`;
}
