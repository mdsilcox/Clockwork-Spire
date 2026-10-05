// A part as a card: family band, name, family and rules text. Used by rewards, shops, the forge and the bin viewer.
import type { ComponentChildren } from 'preact';
import { partDef, partName, partText } from '../core/content/parts';
import { FAMILY_COLOR, FAMILY_LABEL } from '../render/palette';
import { TierMark } from './TierMark';

export function PartCard({
  defId,
  plus = false,
  extra,
  children,
  onClick,
  disabled,
  selected,
  testid = 'part-card',
  tip,
  fit,
}: {
  defId: string;
  plus?: boolean;
  /** A small line under the text, e.g. a price. */
  extra?: ComponentChildren;
  children?: ComponentChildren;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  testid?: string;
  tip?: object;
  /** A brass dot: its family already has 2 or more parts in the bin. */
  fit?: boolean;
}) {
  const def = partDef(defId);
  const body = (
    <>
      <span class="band" style={{ background: FAMILY_COLOR[def.family] }} />
      <span class="cname">{partName(defId, plus)}</span>
      <TierMark rarity={def.rarity} />
      <span class="cfam" style={{ color: FAMILY_COLOR[def.family] }}>
        {FAMILY_LABEL[def.family]}
        {def.rarity !== 'common' ? `, ${def.rarity}` : ''}
      </span>
      <span class="ctext">{partText(defId, plus)}</span>
      {fit && (
        <span class="fit" data-testid="fits">
          <i aria-hidden="true" />
          fits your machine
        </span>
      )}
      {children}
      {extra && <span class="cextra">{extra}</span>}
    </>
  );
  if (!onClick) {
    return (
      <div class={`card static ${selected ? 'sel' : ''}`} data-testid={testid} data-def={defId} {...(tip ?? {})} tabIndex={tip ? 0 : undefined}>
        {body}
      </div>
    );
  }
  return (
    <button class={`card ${selected ? 'sel' : ''}`} data-testid={testid} data-def={defId} disabled={disabled} onClick={onClick} {...(tip ?? {})}>
      {body}
    </button>
  );
}
