// Part markers on an enemy machine (B7): a tap target per unbroken part and one for the core, each with HP pips,
// the intent it will act on next turn, its place in the target order and the damage the preview deals to it.
// Positions come from render/anchors.ts only (B8 moves them to the painted rigs' anchor points).
import type { CombatState, PartIntent, TargetRef, TurnPreview } from '../core/types';
import { MARKER, partAnchors } from '../render/anchors';
import { enemyBody, isCompact } from '../render/layout';
import type { Rect } from '../render/layout';
import type { StageView } from '../render/replay';
import { INTENT_NAME, IntentIcon, StatusIcon } from './icons';
import { actionsText, cadenceText, enemyPartDef, intentValue, intentWait } from './partText';
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

function Lock() {
  return (
    <svg class="pm-lock" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" />
      <path d="M8 11 V8 a4 4 0 0 1 8 0 V11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
    </svg>
  );
}

function Cross() {
  return (
    <svg class="pm-cross" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 5 L19 19 M19 5 L5 19" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
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
  const frame = e.parts.length > 0;
  const body = enemyBody(slot);
  const size = isCompact(slot) ? 40 : MARKER;
  const at = partAnchors(body, e.parts.map((p) => p.id));
  const cancelled = new Set((preview?.cancelled ?? []).filter((x) => x.enemy === i).map((x) => x.partId));
  const intentOf = (id: string): PartIntent | undefined => e.intents.find((it) => it.partId === id);

  const place = (id: string): { left: string; top: string; width: string; height: string } => {
    const a = at[id] ?? at.core;
    return { left: `${a.x - slot.x - size / 2}px`, top: `${a.y - slot.y - size / 2}px`, width: `${size}px`, height: `${size}px` };
  };

  const marker = (id: string): preact.JSX.Element | null => {
    const core = id === 'core';
    const st = core ? null : e.parts.find((p) => p.id === id);
    if (!core && !st) return null;
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
    const info = (): Info => {
      if (core) {
        return {
          title: `${label}.`,
          text: sealed ? 'Sealed: it cannot be hit until every keystone is broken.' : `The heart of the machine. At 0 HP, ${name} is scrapped and its standing parts are wrecked.`,
          detail: `${hp} of ${maxHp} HP. ${it ? `Acts: ${it.label}.` : ''} ${sealed ? '' : pos >= 0 ? `Number ${pos + 1} in your target order. Tap to remove.` : 'Tap to add it to your target order.'}`.trim(),
        };
      }
      if (broken) return { title: `${label}.`, text: 'Broken: it never acts again this fight.', detail: pd?.salvage ? 'It will drop salvage if you win.' : undefined };
      const bits: string[] = [];
      bits.push(`${hp} of ${maxHp} HP.`);
      if (st?.jammed) bits.push('Jammed: it skips its next action.');
      if (pd?.keystone) bits.push('Keystone: break it to open the core.');
      if (pos >= 0) bits.push(`Number ${pos + 1} in your target order. Tap to remove.`);
      else bits.push('Tap to add it to your target order.');
      const action = pd && pd.actions.length > 0 ? `${actionsText(pd.actions)}. ${cadenceText(pd.cadence)}` : '';
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
    const aria = `${label}, ${broken ? 'broken' : `${hp} of ${maxHp} HP`}${it ? `. Next: ${it.label}` : ''}${sealed ? '. Sealed' : ''}${pos >= 0 ? `. Order ${pos + 1}` : ''}`;
    const testid = core ? `enemy-core-e${i}` : `enemy-part-e${i}-${id}`;
    return (
      <div key={id} class={`pm ${core ? 'core' : ''} ${broken ? 'broken' : ''} ${sealed ? 'sealed' : ''}`} style={place(id)}>
        <button
          type="button"
          class={`pmark ${pos >= 0 ? 'ordered' : ''} ${will?.breaks ? 'breaks' : ''}`}
          data-testid={testid}
          data-target-marker=""
          aria-label={aria}
          aria-pressed={pos >= 0}
          disabled={!interactive || broken}
          {...tip(info)}
          onClick={() => onTap(ref)}
        >
          {broken ? <Cross /> : <Glyph core={core} />}
          {sealed && <Lock />}
          {pos >= 0 && (
            <span class="order-badge" data-testid="order-badge">
              {pos + 1}
            </span>
          )}
          {will && !broken && (
            <span class="pm-dmg" data-testid={`part-dmg-e${i}-${id}`}>
              -{will.damage}
              {will.breaks ? (core ? ' scrap' : ' break') : ''}
            </span>
          )}
          {st?.jammed && !broken && (
            <span class="pm-jam" aria-label="Jammed">
              <StatusIcon kind="jam" size={12} />
            </span>
          )}
        </button>
        {!core && !broken && (
          <span class="pm-hp" data-testid={`part-hp-e${i}-${id}`} aria-hidden="true">
            {maxHp <= 8 && (
              <span class="pips">
                {Array.from({ length: maxHp }, (_, k) => (
                  <i key={k} class={k < hp ? 'on' : ''} />
                ))}
              </span>
            )}
            <b>{hp}</b>
          </span>
        )}
        {it && (frame || !core) && (
          <span
            class={`pm-intent k-${it.kind} ${isCancelled ? 'cancelled' : ''}`}
            data-testid={`part-intent-e${i}-${id}`}
            data-kind={it.kind}
            data-cancelled={isCancelled ? 'true' : undefined}
            tabIndex={0}
            aria-label={`${INTENT_NAME[it.kind]}: ${it.label}${isCancelled ? ' (cancelled by your order)' : ''}`}
            {...tip(() => ({
              title: `${INTENT_NAME[it.kind]}.`,
              text: `${it.label}.${isCancelled ? ' Your Run will break its part first, so this is cancelled.' : ''}`,
              detail: pd ? `From ${label}.` : `From the ${name} core.`,
            }))}
          >
            <span class="irow">
              <IntentIcon kind={it.kind} size={16} />
              {intentValue(it) && <b>{intentValue(it)}</b>}
            </span>
            {wait && <span class="iwait">{wait}</span>}
            {cb && <span class="ilabel">{INTENT_NAME[it.kind]}</span>}
            {isCancelled && <span class="ilabel cx">cancelled</span>}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      {frame && e.parts.map((p) => marker(p.id))}
      {marker('core')}
    </>
  );
}
