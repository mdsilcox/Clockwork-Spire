// A tooltip hook for the run screens: hover, keyboard focus or a 400 ms press shows it; a tap elsewhere, leaving
// the screen or choosing something hides it. (The combat screen has its own copy of this, built earlier.)
import { useEffect, useRef, useState } from 'preact/hooks';
import { Tooltip } from './Tooltip';
import type { TipInfo } from './Tooltip';

export type TipBody = Omit<TipInfo, 'rect'>;

export function useTip() {
  const [tip, setTip] = useState<TipInfo | null>(null);
  const longTimer = useRef(0);
  const hideTimer = useRef(0);
  const longFired = useRef(false);

  const hide = (): void => {
    window.clearTimeout(longTimer.current);
    window.clearTimeout(hideTimer.current);
    setTip(null);
  };
  const hideSoon = (): void => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setTip(null), 160);
  };
  const keep = (): void => window.clearTimeout(hideTimer.current);
  const show = (el: Element, info: TipBody | null): void => {
    if (!info) return setTip(null);
    const r = el.getBoundingClientRect();
    setTip({ ...info, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom } });
  };

  useEffect(() => {
    const away = (e: PointerEvent): void => {
      if ((e.target as HTMLElement | null)?.closest?.('.tip')) return;
      window.clearTimeout(hideTimer.current);
      setTip(null);
    };
    window.addEventListener('pointerdown', away, true);
    return () => {
      window.removeEventListener('pointerdown', away, true);
      window.clearTimeout(longTimer.current);
      window.clearTimeout(hideTimer.current);
    };
  }, []);

  /** Spread onto any element that explains itself. */
  const on = (info: () => TipBody | null) => ({
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        window.clearTimeout(hideTimer.current);
        show(e.currentTarget as Element, info());
      }
    },
    onPointerLeave: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') hideSoon();
    },
    onFocus: (e: FocusEvent) => show(e.currentTarget as Element, info()),
    onBlur: () => hideSoon(),
    onPointerDown: (e: PointerEvent) => {
      longFired.current = false;
      const el = e.currentTarget as Element;
      window.clearTimeout(longTimer.current);
      longTimer.current = window.setTimeout(() => {
        longFired.current = true;
        show(el, info());
        window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => setTip(null), 6000);
      }, 400);
    },
    onPointerUp: () => window.clearTimeout(longTimer.current),
    onPointerCancel: () => window.clearTimeout(longTimer.current),
  });

  /** Wrap a click so the click that ends a long press does nothing. */
  const guard =
    <A extends unknown[]>(fn: (...a: A) => void) =>
    (...a: A): void => {
      if (longFired.current) {
        longFired.current = false;
        return;
      }
      hide();
      fn(...a);
    };

  const node = tip ? <Tooltip tip={tip} onEnter={keep} onLeave={hideSoon} /> : null;
  return { on, guard, hide, node };
}
