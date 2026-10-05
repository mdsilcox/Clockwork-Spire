// Part markers on an enemy machine (B7): a tap target per part and one for the core, each with its HP, the intent it
// will act on next turn, its place in the target order and the damage the preview deals to it.
// Positions come from render/anchors.ts only (on the painted rigs' anchor points). On a tall slot (the desktop) the
// intent and HP sit outside the 44 px marker; on a short one (the phone) the marker is a 28 px pip showing the HP
// number (a 40 px tap area extends past it, see machines.css) with its intent as a small chip beside it.
import type { CombatState, PartIntent, TargetRef, TurnPreview } from '../core/types';
import { phaseIntent } from '../app/controller';
import { previewIntents } from '../core/enemy';
import { partAnchors } from '../render/anchors';
import type { Rect } from '../render/layout';
import type { StageView } from '../render/replay';
import { INTENT_NAME, IntentIcon, StatusIcon } from './icons';
import { partActionText, enemyPartDef, intentValue, intentWait, pendingRatchet } from './partText';
import type { TipInfo } from './Tooltip';
import './machines.css';

type Info = Omit<TipInfo, 'rect'> | null;
export type TipFor = (info: () => Info) => Record<string, unknown>;

interface Props {
  c: CombatState;
  i: number;
  slot: Rect;
  vw: StageView;
  preview: TurnPreview | null;
  name: string;
  cb: boolean;
  interactive: boolean;
  tip: TipFor;
  onTap: (ref: TargetRef) => void;
}

/** Color-blind mode inside a 40 px marker: a short word in place of the icon. */
const CB_SHORT: Record<string, string> = { attack: 'Hit', defend: 'Def', buff: 'Buff', debuff: 'Weak', sabotage: 'Sabo', charge: 'Wait', summon: 'Call', special: 'Odd' };

function Lock() {
  return (
    <svg class="pm-lock" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" />
      <path d="M8 11 V8 a4 4 0 0 1 8 0 V11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
    </svg>
  );
}

/** A broken part: a bold crack across it. */
function Crack() {
  return (
    <svg class="pm-cross" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 4 L10 11 L7 13 L13 20 M20 4 L14 10 M18 20 L13 14" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

function Glyph({ core }: { core: boolean }) {
  return core ? (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.4" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2.4" />
      <path d="M12 2.5 V6 M12 18 V21.5 M2.5 12 H6 M18 12 H21.5 M5.3 5.3 L7.8 7.8 M16.2 16.2 L18.7 18.7 M18.7 5.3 L16.2 7.8 M7.8 16.2 L5.3 18.7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
    </svg>
  );
}

export function EnemyMachine({ c, i, slot, vw, preview, name, cb, interactive, tip, onTap }: Props) {
  const e = c.enemies[i];
  if (!e || vw.enemyHp[i] <= 0) return null;
  const frame = (e.parts?.length ?? 0) > 0;
  const parts = e.parts ?? [];
  const geo = partAnchors(slot, parts.map((p) => p.id));
  const phone = geo.mode === 'phone';
  const inline = phone; // the phone's intent chip is the compact one
  const cancelled = new Set((preview?.cancelled ?? []).filter((x) => x.enemy === i).map((x) => x.partId));
  const phaseNow = phaseIntent.value;
  const intentOf = (id: string): PartIntent | undefined =>
    e.intents?.find((it) => it.partId === id) ?? (id === 'core' && phaseNow?.enemy === i ? phaseNow.intent : undefined);
  const bonus = pendingRatchet(c, i, preview);
  const foresight = c.trinkets.includes('foresight-dial') ? previewIntents(c, i, 2) : [];

  const marker = (id: string): preact.JSX.Element | null => {
    const core = id === 'core';
    const st = core ? null : parts.find((p) => p.id === id);
    if (!core && !st) return null;
    const a = geo.at[id] ?? geo.at.core;
    const size = a.size;
    const ref = `e${i}.${id}` as TargetRef;
    const pd = core ? undefined : enemyPartDef(e.defId, id);
    const label = core ? `${name} core` : (pd?.name ?? id);
    const broken = !core && !!vw.partBroken[ref];
    const hp = core ? vw.enemyHp[i] : (vw.partHp[ref] ?? st?.hp ?? 0);
    const maxHp = core ? e.maxHp : (st?.maxHp ?? 1);
    const sealed = core && e.sealed;
    const pos = c.order.indexOf(ref);
    const it = broken ? undefined : intentOf(id);
    const will = preview?.byTarget?.[ref];
    const isCancelled = cancelled.has(id);
    const wait = it ? intentWait(it) : '';
    const grows = it ? it.actions.some((x) => x.kind === 'attack' || x.kind === 'pierce') && bonus > 0 : false;
    const bu = pd && typeof pd.cadence === 'object' && 'buildUp' in pd.cadence ? pd.cadence : null;
    const val = it ? (bu && it.kind === 'charge' ? `${st?.gauge ?? 0}/${bu.to}` : intentValue(it, bonus)) : '';
    const nextLabel = it ? it.label.replace(/ at (\d+) \((\d+)\)$/, ' when the gauge reaches $1 (now $2)') : '';
    const info = (): Info => {
      if (core) {
        return {
          title: `${label}.`,
          text: sealed ? 'Sealed: it cannot be hit until every keystone is broken.' : `The heart of the machine. At 0 HP, ${name} is scrapped and its standing parts are wrecked.`,
          detail: `${hp} of ${maxHp} HP. ${it ? `Acts: ${it.label}.` : ''} ${sealed ? '' : pos >= 0 ? `Number ${pos + 1} in your target order. Tap to remove.` : 'Tap to add it to your target order.'}`.trim(),
        };
      }
      if (broken) return { title: `${label}.`, text: 'Broken: it never acts again this fight.', detail: pd?.salvage ? 'It will drop salvage if you win.' : undefined };
      const bits: string[] = [`${hp} of ${maxHp} HP.`];
      if (st?.jammed) bits.push('Jammed: it skips its next action.');
      if (pd?.keystone) bits.push('Keystone: break it to open the core.');
      if (it) bits.push(`Next: ${nextLabel}${grows ? `, +${bonus} Strength from the Ratchet first` : ''}${isCancelled ? ' (your Run breaks this part first, so it is cancelled)' : ''}.`);
      if (pos >= 0) bits.push(`Number ${pos + 1} in your target order. Tap to remove.`);
      else bits.push('Tap to add it to your target order.');
      const action = pd && pd.actions.length > 0 ? partActionText(pd) : '';
      const passive = pd?.passive
        ? pd.passive.kind === 'bulwark'
          ? 'Bulwark: halves damage to the core while it stands.'
          : pd.passive.kind === 'governor'
            ? `Governor: caps each Strike on the core at ${pd.passive.cap}.`
            : pd.passive.kind === 'ratchet'
              ? `Ratchet: gains ${pd.passive.x} Strength each turn.`
              : `Enrage: gains ${pd.passive.x} Strength when it is hurt.`
        : '';
      return { title: `${label}.`, text: [action, passive].filter(Boolean).join(' ') || 'A part of the machine.', detail: bits.join(' ') };
    };
    const aria = `${label}, ${broken ? 'broken' : `${hp} of ${maxHp} HP`}${it ? `. Next: ${nextLabel}${grows ? `, plus ${bonus} Strength` : ''}` : ''}${sealed ? '. Sealed' : ''}${pos >= 0 ? `. Order ${pos + 1}` : ''}`;
    const testid = core ? `enemy-core-e${i}` : `enemy-part-e${i}-${id}`;
    const intentChip = it ? (
      <span
        class={`pm-intent k-${it.kind} ${inline ? 'inline' : ''} ${isCancelled ? 'cancelled' : ''}`}
        data-testid={`part-intent-e${i}-${id}`}
        data-kind={it.kind}
        data-cancelled={isCancelled ? 'true' : undefined}
        aria-hidden={inline ? 'true' : undefined}
        tabIndex={inline ? undefined : 0}
        {...(inline
          ? {}
          : tip(() => ({
              title: `${INTENT_NAME[it.kind]}.`,
              text: `${nextLabel}${grows ? ` (+${bonus} Strength from the Ratchet first)` : ''}.${isCancelled ? ' Your Run will break its part first, so this is cancelled.' : ''}`,
              detail: pd ? `From ${label}.` : `From the ${name} core.`,
            })))}
      >
        <span class="irow">
          {inline && cb ? <span class="ilabel">{CB_SHORT[it.kind]}</span> : <IntentIcon kind={it.kind} size={inline ? 14 : 16} />}
          {val && <b>{inline ? val.replace(' x', 'x') : val}</b>}
        </span>
        {it.kind === 'summon' && <span class="pm-sr">{` ${it.label}`}</span>}
        {grows && <span class="pm-sr">{` (base ${intentValue(it, 0)}, plus ${bonus} Strength)`}</span>}
        {!inline && wait && <span class="iwait">{wait}</span>}
        {!inline && cb && <span class="ilabel">{INTENT_NAME[it.kind]}</span>}
        {!inline && isCancelled && <span class="ilabel cx">cancelled</span>}
      </span>
    ) : null;
    // B9b: the Foresight Dial shows the next-but-one turn dimmed beside the current intent
    const it2 = !broken && c.trinkets.includes('foresight-dial') && !e.phaseActionPending ? foresight.find((x) => x.partId === id) : undefined;
    const intent2 = it2 ? (
      <span class={`pm-intent pm-intent2 k-${it2.kind} ${inline ? 'inline' : ''}`} data-testid={`part-intent2-e${i}-${id}`} data-kind={it2.kind} aria-label={`Turn after next: ${it2.label}`}>
        <span class="irow">
          {inline && cb ? <span class="ilabel">{CB_SHORT[it2.kind]}</span> : <IntentIcon kind={it2.kind} size={inline ? 14 : 16} />}
          {intentValue(it2, 0) && <b>{intentValue(it2, 0).replace(' x', 'x')}</b>}
        </span>
        <span class="pm-sr">{` ${it2.label}`}</span>
      </span>
    ) : null;
    const hpText = (
      <span class="pm-hp" data-testid={`part-hp-e${i}-${id}`} aria-hidden="true">
        <b>{hp}</b>
      </span>
    );
    return (
      <div
        key={id}
        class={`pm ${core ? 'core' : ''} ${broken ? 'broken' : ''} ${sealed ? 'sealed' : ''} ${phone ? `phone side-${a.side ?? 'r'}` : 'outer'}`}
        style={{ left: `${a.x - slot.x - size / 2}px`, top: `${a.y - slot.y - size / 2}px`, width: `${size}px`, height: `${size}px` }}
      >
        <button
          type="button"
          class={`pmark ${broken ? 'broken' : ''} ${pos >= 0 ? 'ordered' : ''} ${will?.breaks ? 'breaks' : ''} ${it ? 'acts' : ''}`}
          data-testid={testid}
          data-target-marker=""
          aria-label={aria}
          aria-pressed={pos >= 0}
          disabled={!interactive || broken}
          {...tip(info)}
          onClick={() => onTap(ref)}
        >
          {broken ? <Crack /> : phone && !core ? hpText : <Glyph core={core} />}
          {sealed && <Lock />}
          {pos >= 0 && (
            <span class="order-badge" data-testid="order-badge">
              {pos + 1}
            </span>
          )}
          {will && will.damage > 0 && !broken && (
            <span class="pm-dmg" data-testid={`part-dmg-e${i}-${id}`}>
              -{will.damage}
            </span>
          )}
          {st?.jammed && !broken && (
            <span class="pm-jam" aria-label="Jammed">
              <StatusIcon kind="jam" size={12} />
            </span>
          )}
        </button>
        {!phone && !core && !broken && hpText}
        {intentChip && (phone || frame || !core) && intentChip}
        {intent2 && (phone || frame || !core) && intent2}
      </div>
    );
  };

  return (
    <>
      {frame && parts.map((p) => marker(p.id))}
      {marker('core')}
    </>
  );
}
