// The glossary overlay: every rules term, searchable. Opens from the combat menu, the title screen and tooltip links.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { closeGlossary, glossaryOpen } from '../app/prefs';
import { GLOSSARY } from '../core/content/glossary';
import { IntentIcon, StatusIcon } from './icons';
import type { IntentKind } from '../core/types';

const INTENT_KINDS = ['attack', 'defend', 'buff', 'debuff', 'sabotage', 'charge', 'summon', 'special'];

function EntryIcon({ icon }: { icon?: string }) {
  if (!icon) return null;
  return <span class="gicon">{INTENT_KINDS.includes(icon) ? <IntentIcon kind={icon as IntentKind} size={18} /> : <StatusIcon kind={icon} size={18} />}</span>;
}

export function GlossaryScreen() {
  const open = glossaryOpen.value;
  const [q, setQ] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const focus = open ?? '';
  const closed = open === null;

  useEffect(() => {
    setQ('');
  }, [closed]);

  useEffect(() => {
    if (closed) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeGlossary();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closed]);

  useEffect(() => {
    if (!focus) return;
    const el = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-term]') ?? []).find((x) => x.dataset.term === focus);
    el?.scrollIntoView({ block: 'center' });
  }, [focus, closed]);

  const entries = useMemo(() => {
    const t = q.trim().toLowerCase();
    const all = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
    return t ? all.filter((e) => e.term.toLowerCase().includes(t) || e.text.toLowerCase().includes(t)) : all;
  }, [q]);

  if (open === null) return null;
  return (
    <div class="glossary" role="dialog" aria-label="Glossary" data-testid="glossary">
      <header class="ghead">
        <h2>Glossary</h2>
        <input
          type="search"
          class="gsearch"
          placeholder="Search terms"
          aria-label="Search the glossary"
          data-testid="glossary-search"
          value={q}
          onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)}
        />
        <button class="ghostbtn gclose" data-testid="glossary-close" onClick={closeGlossary}>
          Close
        </button>
      </header>
      <div class="glist" ref={listRef}>
        {entries.length === 0 && <p class="empty">Nothing matches that. Try a shorter word.</p>}
        {entries.map((e) => (
          <article key={e.term} class={`gentry ${focus && e.term === focus ? 'focus' : ''}`} data-term={e.term} data-testid="glossary-entry">
            <h3>
              <EntryIcon icon={e.icon} />
              {e.term}
            </h3>
            <p>{e.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
