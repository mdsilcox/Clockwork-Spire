// One small rules tooltip, reused for parts, statuses, intents and gauges.
// It is positioned in viewport coordinates next to its anchor and clamped inside the screen.
// Glossary words in its text are underlined and open the glossary entry.
import { useEffect, useRef } from 'preact/hooks';
import { LINK_TERMS, glossaryFor } from '../core/content/glossary';
import { openGlossary } from '../app/prefs';

export interface TipInfo {
  title: string;
  text: string;
  /** Extra live facts, e.g. "Charge 2. Rusted." */
  detail?: string;
  /** The anchor's rectangle in viewport coordinates. */
  rect: { left: number; top: number; right: number; bottom: number };
}

const WIDTH = 224;
const WORD_EDGE = String.raw`\b`;
const LINK_RE = new RegExp(`${WORD_EDGE}(${[...LINK_TERMS].sort((a, b) => b.length - a.length).join('|')})${WORD_EDGE}`, 'g');

/** Text with glossary words turned into small buttons. */
export function Linked({ text }: { text: string }) {
  const out: (string | preact.JSX.Element)[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    const i = m.index ?? 0;
    if (!glossaryFor(m[0])) continue;
    if (i > last) out.push(text.slice(last, i));
    const entry = glossaryFor(m[0])!;
    out.push(
      <button key={i} type="button" class="gl" data-gloss={entry.term} onClick={() => openGlossary(entry.term)}>
        {m[0]}
      </button>,
    );
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

export function Tooltip({ tip, onEnter, onLeave }: { tip: TipInfo; onEnter: () => void; onLeave: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Placed again whenever its size changes (text settling, a live detail updating), so it never runs off the screen.
    const place = (): void => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(WIDTH, vw - 8);
      const h = Math.min(el.offsetHeight, vh - 8);
      const cx = (tip.rect.left + tip.rect.right) / 2;
      const left = Math.max(4, Math.min(vw - w - 4, cx - w / 2));
      const above = tip.rect.top - h - 6 >= 4;
      const below = tip.rect.bottom + 6 + h <= vh - 4;
      const top = above ? tip.rect.top - h - 6 : below ? tip.rect.bottom + 6 : tip.rect.top + 4;
      el.style.left = `${left}px`;
      el.style.top = `${Math.max(4, Math.min(vh - h - 4, top))}px`;
      el.style.visibility = 'visible';
    };
    place();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tip]);
  return (
    <div
      class="tip"
      ref={ref}
      role="tooltip"
      data-testid="tooltip"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      style={{ width: `min(${WIDTH}px, calc(100vw - 8px))`, maxHeight: 'calc(100vh - 8px)', overflowY: 'auto', visibility: 'hidden' }}
    >
      <b>{tip.title}</b> <Linked text={tip.text} />
      {tip.detail && <span class="tipdetail">{tip.detail}</span>}
    </div>
  );
}
