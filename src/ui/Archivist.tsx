// The archivist's desk (B10a): the Journal, the Bestiary, the Clockmaker's note and the Map of landmarks.
import { useState } from 'preact/hooks';
import { ACHIEVEMENTS } from '../core/content/achievements';
import { ENEMIES } from '../core/content/enemies';
import { LANDMARKS } from '../core/content/landmarks';
import type { EnemyDef } from '../core/defs';
import type { Profile } from '../core/types';
import { archivistLine } from './Workshop';

type Tab = 'journal' | 'bestiary' | 'note' | 'map';
const TABS: [Tab, string][] = [
  ['journal', 'Journal'],
  ['bestiary', 'Bestiary'],
  ['note', "Clockmaker's note"],
  ['map', 'Map'],
];

const PUNISH: Record<string, string> = {
  plating: 'Plating',
  burst: 'big single turns',
  pressure: 'Pressure',
  statuses: 'statuses',
  slow: 'slow machines',
};

/** Journal pages found, in the order found: each earned achievement's page, then any lore pages the profile holds. */
function pagesOf(p: Profile): { id: string; title: string; text: string }[] {
  const out: { id: string; title: string; text: string }[] = [];
  const earned = ACHIEVEMENTS.filter((a) => p.achievements[a.id] && a.reward.journal).sort((a, b) => (p.achievements[a.id] ?? '').localeCompare(p.achievements[b.id] ?? ''));
  for (const a of earned) out.push({ id: a.id, title: a.reward.journal as string, text: `Set down after "${a.name}": ${a.text}` });
  for (const id of p.journal ?? []) if (!out.some((x) => x.id === id)) out.push({ id, title: id.replace(/-/g, ' '), text: 'A page in the archivist\'s careful hand.' });
  return out;
}

function Journal({ p }: { p: Profile }) {
  const pages = pagesOf(p);
  return (
    <div data-testid="archivist-panel-journal" class="archpanel">
      {pages.length === 0 && <p class="empty">No pages yet. The archivist keeps one for each thing you finish.</p>}
      {pages.map((pg) => (
        <article key={pg.id} class="journalpage" data-testid="journal-page">
          <h4>{pg.title}</h4>
          <p>{pg.text}</p>
        </article>
      ))}
    </div>
  );
}

function enemyParts(d: EnemyDef): string[] {
  const f = d.frame;
  if (!f) return [];
  const parts = [...f.parts, ...(f.phases ?? []).flatMap((ph) => ph.parts)];
  return parts.map((x) => x.name);
}

function Bestiary({ p }: { p: Profile }) {
  const ghost = (p.residents ?? []).includes('hour-ghost');
  const list = Object.values(ENEMIES).filter((d) => !d.summonOnly && d.id !== 'dummy' && d.id !== 'tutorial-automaton');
  return (
    <div data-testid="archivist-panel-bestiary" class="archpanel bestiary">
      {list.map((d) => {
        const met = (p.bestiary ?? []).includes(d.id);
        const full = met || ghost;
        const parts = full ? enemyParts(d) : [];
        return (
          <article key={d.id} class={`beast ${met ? 'met' : ''}`} data-testid={`bestiary-entry-${d.id}`} data-met={met ? 'true' : 'false'}>
            <h4>{met ? d.name : 'Not met yet'}</h4>
            <span class="beastmeta">
              Act {d.act}, {d.tier === 'boss' ? 'warden' : d.tier === 'elite' ? 'elite' : 'regular'}
            </span>
            {full ? (
              <>
                {d.frame?.bestiary && <p>{d.frame.bestiary}</p>}
                {parts.length > 0 && <p class="beastparts">Parts: {parts.join(', ')}.</p>}
                {d.frame && d.frame.punishes.length > 0 && <p class="beastparts">Punishes {d.frame.punishes.map((x) => PUNISH[x] ?? x).join(' and ')}.</p>}
              </>
            ) : (
              <p class="beastsil">A silhouette on the page. Meet it to fill it in.</p>
            )}
          </article>
        );
      })}
    </div>
  );
}

function Note({ p }: { p: Profile }) {
  const line = archivistLine(p);
  return (
    <div data-testid="archivist-panel-note" class="archpanel">
      {line ? (
        <p class="archivist-line" data-testid="archivist-line">
          {line}
        </p>
      ) : (
        <p class="empty">The Clockmaker has not noticed how you build yet. Climb a few more times.</p>
      )}
    </div>
  );
}

function MapTab({ p }: { p: Profile }) {
  const mine = LANDMARKS.filter((l) => (p.landmarks ?? []).includes(l.id));
  return (
    <div data-testid="archivist-panel-map" class="archpanel">
      {mine.length === 0 && <p class="empty">No landmarks yet. Some things you do in the Spire change it for good.</p>}
      {mine.map((l) => (
        <article key={l.id} class="landmark" data-testid={`map-landmark-${l.id}`}>
          <h4>{l.name}</h4>
          <span class="beastmeta">Act {l.act}</span>
          <p>{l.text}</p>
        </article>
      ))}
    </div>
  );
}

export function Archivist({ p }: { p: Profile }) {
  const [tab, setTab] = useState<Tab>('journal');
  return (
    <section class="archivist" data-testid="archivist">
      <nav class="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" class={`tab ${tab === id ? 'on' : ''}`} aria-selected={tab === id} data-testid={`archivist-tab-${id}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
      {tab === 'journal' && <Journal p={p} />}
      {tab === 'bestiary' && <Bestiary p={p} />}
      {tab === 'note' && <Note p={p} />}
      {tab === 'map' && <MapTab p={p} />}
    </section>
  );
}
