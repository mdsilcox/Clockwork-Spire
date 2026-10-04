// One small rules tooltip, reused for parts in hand and on the board (later: statuses and intents).
// It is positioned in viewport coordinates next to its anchor and clamped inside the screen.
import { useEffect, useRef } from 'preact/hooks';

export interface TipInfo {
  title: string;
  text: string;
  /** Extra live facts, e.g. "Charge 2. Rusted." */
  detail?: string;
  /** The anchor's rectangle in viewport coordinates. */
  rect: { left: number; top: number; right: number; bottom: number };
}

const WIDTH = 220;

export function Tooltip({ tip }: { tip: TipInfo }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(WIDTH, vw - 8);
    const h = el.offsetHeight;
    const cx = (tip.rect.left + tip.rect.right) / 2;
    const left = Math.max(4, Math.min(vw - w - 4, cx - w / 2));
    const above = tip.rect.top - h - 6 >= 4;
    const top = above ? tip.rect.top - h - 6 : Math.min(vh - h - 4, tip.rect.bottom + 6);
    el.style.left = `${left}px`;
    el.style.top = `${Math.max(4, top)}px`;
    el.style.visibility = 'visible';
  }, [tip]);
  return (
    <div class="tip" ref={ref} role="tooltip" data-testid="tooltip" style={{ width: `min(${WIDTH}px, calc(100vw - 8px))`, visibility: 'hidden' }}>
      <b>{tip.title}</b> {tip.text}
      {tip.detail && <span class="tipdetail">{tip.detail}</span>}
    </div>
  );
}
