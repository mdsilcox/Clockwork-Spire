// The Workshop: the home between runs. Sprocket, the upgrade bench, the chassis rack, notes, blueprints and the door.
import { modeText } from './ClockTower';
import { signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { abandonClimb, climb, climbing, buyChassisNow, buyUpgrade, continueRun } from '../app/controller';
import { CHASSIS } from '../core/content/chassis';
import { enemyDef } from '../core/content/enemies';
import { partName } from '../core/content/parts';
import { UPGRADES, UPGRADE_ORDER } from '../core/content/upgrades';
import * as meta from '../core/meta';
import { memoryPlan } from '../core/record';
import type { Plan, Profile } from '../core/types';
import { unlockAudio } from '../audio/synth';
import { dayLabel, fmt } from './format';
import { PartCard } from './PartCard';

type Tab = 'bench' | 'chassis' | 'notes' | 'parts' | 'history';
const TABS: [Tab, string][] = [
  ['bench', 'Upgrade bench'],
  ['chassis', 'Chassis'],
  ['notes', 'Notes'],
  ['parts', 'Blueprints'],
  ['history', 'History'],
];

/** What the archivist says about the Clockmaker's memory (B9a, rules 5.4): the plan he remembers and the part he has for it. */
const MEMORY_NOTE: Record<Plan, { plan: string; part: string }> = {
  plating: { plan: 'plating', part: 'a drill' },
  burst: { plan: 'burst', part: 'a governor cap' },
  pressure: { plan: 'pressure', part: 'a drain valve' },
  statuses: { plan: 'statuses', part: 'a purge chime' },
};

export function archivistLine(p: Profile): string | null {
  const plan = memoryPlan(p.planHistory);
  if (!plan) return null;
  const n = MEMORY_NOTE[plan];
  return `The archivist says: he remembers your ${n.plan}. He has ${n.part} now.`;
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function Bench({ p }: { p: Profile }) {
  return (
    <div class="benchlist" data-testid="bench">
      {UPGRADE_ORDER.map((id) => {
        const u = UPGRADES[id];
        const level = p.upgrades[id] ?? 0;
        const cost = safe(() => meta.upgradeCost(p, id), null);
        const maxed = cost === null;
        const short = !maxed && p.brass < cost;
        return (
          <article key={id} class="upgrade" data-testid={`upgrade-${id}`} data-level={level}>
            <div class="uhead">
              <b>{u.name}</b>
              <span class="pips" aria-label={`Level ${level} of ${u.costs.length}`}>
                {u.costs.map((_, i) => (
                  <i key={i} class={i < level ? 'on' : ''} />
                ))}
              </span>
            </div>
            <p class="utext">{u.text}</p>
            <div class="ubuy">
              <button class="primary small" data-testid={`buy-${id}`} disabled={maxed || short} onClick={() => buyUpgrade(id)}>
                {maxed ? 'Maxed' : `Buy for ${fmt(cost)} Brass`}
              </button>
              {short && <span class="reason">Needs {fmt(cost - p.brass)} more Brass</span>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Rack({ p, chosen, setChosen }: { p: Profile; chosen: string; setChosen: (id: string) => void }) {
  const avail = safe(() => meta.chassisAvailable(p), ['tinker']);
  return (
    <div class="benchlist" data-testid="rack">
      {Object.values(CHASSIS).map((c) => {
        const open = avail.includes(c.id);
        const price = safe(() => meta.chassisPrice(p, c.id), null);
        return (
          <article key={c.id} class={`upgrade chassis ${chosen === c.id && open ? 'chosen' : ''} ${open ? '' : 'locked'}`} data-testid={`chassis-${c.id}`} data-unlocked={open}>
            <div class="uhead">
              <b>{c.name}</b>
              {open ? (
                <button class={`secondary small ${chosen === c.id ? 'on' : ''}`} data-testid={`chassis-select-${c.id}`} aria-pressed={chosen === c.id} onClick={() => setChosen(c.id)}>
                  {chosen === c.id ? 'Chosen' : 'Choose'}
                </button>
              ) : (
                <span class="lockedtag">Locked</span>
              )}
            </div>
            <p class="utext">{c.passive}</p>
            <div class="chips" data-testid={`chassis-parts-${c.id}`}>
              {c.startingBin.map((id, i) => (
                <span key={`${id}${i}`} class="chip">
                  {partName(id, false)}
                </span>
              ))}
            </div>
            {!open && (
              <div class="ubuy">
                <span class="reason">{c.unlock}</span>
                {price !== null && (
                  <button class="primary small" data-testid={`chassis-buy-${c.id}`} disabled={p.brass < price} onClick={() => buyChassisNow(c.id)}>
                    Unlock for {fmt(price)} Brass
                  </button>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function Notes({ p }: { p: Profile }) {
  const notes = safe(() => meta.workshopNotes(p), []);
  if (notes.length === 0) return <p class="empty" data-testid="notes-empty">The wall is bare. Climb, and Sprocket will pin something up.</p>;
  return (
    <div class="noteswall" data-testid="notes">
      {notes.map((n, i) => (
        <article key={n.id} class={`note ${i === notes.length - 1 ? 'newest' : ''}`} data-testid="note">
          <h4>{n.title}</h4>
          <p>{n.text}</p>
        </article>
      ))}
    </div>
  );
}

function Blueprints({ p }: { p: Profile }) {
  if (p.blueprints.length === 0) return <p class="empty" data-testid="blueprints-empty">No blueprints yet. Bosses and elites drop them, and a run that ends early keeps the ones it found.</p>;
  return (
    <div class="cardrow" data-testid="blueprints">
      {p.blueprints.map((id) => (
        <PartCard key={id} defId={id} testid="blueprint" />
      ))}
    </div>
  );
}

function killerName(id: string | undefined): string {
  if (!id) return 'none';
  try {
    return enemyDef(id).name;
  } catch {
    return id;
  }
}

/** Totals over the run history of one profile (capped at 100 runs by the profile). */
export function statsOf(p: Profile): { runs: number; wins: number; rate: number; best: number; biggest: number; favorite: string | null; killer: string | null } {
  const runs = p.history.length;
  const wins = p.history.filter((r) => r.result === 'win').length;
  const parts = new Map<string, number>();
  const killers = new Map<string, number>();
  let biggest = 0;
  for (const r of p.history) {
    biggest = Math.max(biggest, r.biggestTurn ?? 0);
    for (const id of new Set(r.partsAtEnd ?? [])) parts.set(id, (parts.get(id) ?? 0) + 1);
    if (r.result === 'loss' && r.killedBy) killers.set(r.killedBy, (killers.get(r.killedBy) ?? 0) + 1);
  }
  const top = (m: Map<string, number>): string | null => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
  return { runs, wins, rate: runs ? Math.round((wins / runs) * 100) : 0, best: p.bestFloor, biggest, favorite: top(parts), killer: top(killers) };
}

function History({ p }: { p: Profile }) {
  if (p.history.length === 0) return <p class="empty" data-testid="history-empty">No climbs yet. When you finish one, it is written down here.</p>;
  const st = statsOf(p);
  const cells: [string, string, string][] = [
    ['Runs', fmt(st.runs), 'stat-runs'],
    ['Wins', `${fmt(st.wins)} (${st.rate}%)`, 'stat-wins'],
    ['Best floor', fmt(st.best), 'stat-best'],
    ['Biggest turn', fmt(st.biggest), 'stat-biggest'],
    ['Favorite part', st.favorite ? partName(st.favorite, false) : 'none yet', 'stat-favorite'],
    ['Most common killer', st.killer ? killerName(st.killer) : 'none yet', 'stat-killer'],
  ];
  return (
    <div data-testid="history">
      <dl class="stats statsgrid" data-testid="history-stats">
        {cells.map(([k, v, id]) => (
          <div key={id}>
            <dt>{k}</dt>
            <dd data-testid={id}>{v}</dd>
          </div>
        ))}
      </dl>
      <ol class="runlist" data-testid="run-list">
        {p.history.map((r) => (
          <li key={r.n} class={`runrow ${r.result}`} data-testid="run-row">
            <span class="rn">#{r.n}</span>
            <span class="rres">
              <b>{r.result === 'win' ? 'Victory' : r.result === 'abandoned' ? 'Gave up' : 'Defeat'}</b> as {CHASSIS[r.chassis]?.name ?? r.chassis}
            </span>
            <span class="rfl">
              Act {r.act}, floor {r.floor}
            </span>
            <span class="rkill">{r.result === 'win' ? 'The Clockmaker stopped' : r.killedBy ? `Killed by ${killerName(r.killedBy)}` : 'Gave up'}</span>
            <span class="rbrass">{fmt(r.brassEarned)} Brass</span>
            <span class="when">{dayLabel(r.endedAt)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The chassis picked on the rack (the gate climbs with it). Shared by the Workshop place and the gate. */
export const chosenChassis = signal('tinker');

export function pickedChassis(p: Profile): string {
  const avail = safe(() => meta.chassisAvailable(p), ['tinker']);
  return avail.includes(chosenChassis.value) ? chosenChassis.value : 'tinker';
}

/** The Workshop place: the upgrade bench, the chassis rack, the inventor's notes, blueprints and history (v1's panels, moved). */
export function WorkshopPanel({ p }: { p: Profile }) {
  const [tab, setTab] = useState<Tab>('bench');
  const pick = pickedChassis(p);
  return (
    <section class="wspanel" data-testid="workshop">
      <nav class="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" class={`tab ${tab === id ? 'on' : ''}`} aria-selected={tab === id} data-testid={`tab-${id}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
      <div class="tabbody" data-testid="tabbody">
        {tab === 'bench' && <Bench p={p} />}
        {tab === 'chassis' && <Rack p={p} chosen={pick} setChosen={(id) => (chosenChassis.value = id)} />}
        {tab === 'notes' && <Notes p={p} />}
        {tab === 'parts' && <Blueprints p={p} />}
        {tab === 'history' && <History p={p} />}
      </div>
    </section>
  );
}

/** The Spire gate: start a climb (as the chassis picked on the rack), or continue or give up the one in progress. */
export function GatePanel({ p }: { p: Profile }) {
  const [sure, setSure] = useState(false);
  const on = climbing();
  const pick = pickedChassis(p);
  return (
    <section class="gatepanel" data-testid="gate">
      <p class="gateline">{on ? 'Your climb is waiting where you left it.' : 'The Spire stands over the street, quiet and very tall.'}</p>
      <p class="modetag" data-testid="gate-mode" data-mode={p.lastMode ?? 'journeyman'} data-overwind={p.lastOverwind ?? 0}>
        {modeText(p.lastMode, p.lastOverwind)}
      </p>
      <footer class="door">
        {on ? (
          <>
            <button class="primary" data-testid="continue-climb" onClick={() => (unlockAudio(), continueRun())}>
              Continue climb
            </button>
            {!sure ? (
              <button class="secondary" data-testid="abandon-climb" onClick={() => setSure(true)}>
                Give up this climb
              </button>
            ) : (
              <button class="secondary danger" data-testid="abandon-sure" onClick={() => (setSure(false), abandonClimb())}>
                Really give up? Tap again
              </button>
            )}
          </>
        ) : (
          <button
            class="primary"
            data-testid="climb"
            onClick={() => {
              unlockAudio();
              climb(pick);
            }}
          >
            Climb the Spire{pick !== 'tinker' ? ` as ${CHASSIS[pick].name}` : ''}
          </button>
        )}
        <span class="doorhint">Chassis: {CHASSIS[pick].name}. Change it on the Workshop's rack.</span>
      </footer>
    </section>
  );
}
