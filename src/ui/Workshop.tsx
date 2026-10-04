// The Workshop: the home between runs. Sprocket, the upgrade bench, the chassis rack, notes, blueprints and the door.
import { useEffect, useState } from 'preact/hooks';
import { abandonClimb, checkSleepy, climb, climbing, buyChassisNow, buyUpgrade, continueRun, goTitle, news, newFight, openPractice, openSlots, petSprocket, poke, pose, profileView, slotNo, startTutorial } from '../app/controller';
import { colorBlind, openGlossary, setColorBlind } from '../app/prefs';
import { CHASSIS } from '../core/content/chassis';
import { partName } from '../core/content/parts';
import { UPGRADES, UPGRADE_ORDER } from '../core/content/upgrades';
import * as meta from '../core/meta';
import type { Profile } from '../core/types';
import { unlockAudio } from '../audio/synth';
import { fmt, when } from './format';
import { PartCard } from './PartCard';
import { Sprocket } from './Sprocket';
import { RoomArt } from './WorkshopArt';

type Tab = 'bench' | 'chassis' | 'notes' | 'parts' | 'history';
const TABS: [Tab, string][] = [
  ['bench', 'Upgrade bench'],
  ['chassis', 'Chassis'],
  ['notes', 'Notes'],
  ['parts', 'Blueprints'],
  ['history', 'History'],
];

const LINE: Record<string, string> = {
  celebrate: 'Sprocket spins in circles. He is very proud of you.',
  happy: 'Sprocket wiggles all over.',
  comfort: 'Sprocket trots over and leans on your leg.',
  sleepy: 'Sprocket is asleep, one ear twitching.',
  pet: 'Boof!',
  idle: '',
};

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function Bench({ p }: { p: Profile }) {
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

function History({ p }: { p: Profile }) {
  if (p.history.length === 0) return <p class="empty">No climbs yet.</p>;
  return (
    <ol class="history" data-testid="history">
      {p.history.slice(0, 12).map((r, i) => (
        <li key={i}>
          <b>{r.result === 'win' ? 'Victory' : r.result === 'abandoned' ? 'Gave up' : 'Defeat'}</b> with {CHASSIS[r.chassis]?.name ?? r.chassis}, act {r.act} floor {r.floor}. {fmt(r.brassEarned)} Brass. <span class="when">{when(r.endedAt)}</span>
        </li>
      ))}
    </ol>
  );
}

export function WorkshopScreen() {
  const p = profileView.value;
  const [tab, setTab] = useState<Tab>('bench');
  const [chosen, setChosen] = useState('tinker');
  const [menu, setMenu] = useState(false);
  const [sure, setSure] = useState(false);
  const mood = pose.value;
  const cb = colorBlind.value;
  const newsNow = news.value;
  const on = climbing();

  useEffect(() => {
    const t = window.setInterval(checkSleepy, 1000);
    return () => window.clearInterval(t);
  }, []);

  if (!p) return null;
  const avail = safe(() => meta.chassisAvailable(p), ['tinker']);
  const pick = avail.includes(chosen) ? chosen : 'tinker';
  const size = typeof window !== 'undefined' && window.innerWidth < 760 ? 84 : 150;

  return (
    <main class="workshop" data-testid="workshop" data-slot={slotNo.value ?? ''} onPointerDown={poke} onKeyDown={poke}>
      <header class="wshead">
        <div class="wstitle">
          <b data-testid="ws-name">{p.name}</b>
          <span>The Workshop</span>
        </div>
        <div class="pill brass" data-testid="ws-brass">
          <b>{fmt(p.brass)}</b>
          <span class="lbl">Brass</span>
        </div>
        <div class="pill" data-testid="ws-blueprints">
          <b>{p.blueprints.length}</b>
          <span class="lbl">Blueprints</span>
        </div>
        <div class="menuwrap">
          <button class="ghostbtn menu" data-testid="ws-menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            Menu
          </button>
          {menu && (
            <div class="menupanel" role="menu" data-testid="ws-menu-panel">
              <button role="menuitem" onClick={() => (setMenu(false), openGlossary())}>
                Glossary
              </button>
              <label class="check">
                <input type="checkbox" checked={cb} onChange={(e) => setColorBlind((e.currentTarget as HTMLInputElement).checked)} />
                Color-blind icons
              </label>
              <button role="menuitem" onClick={() => (setMenu(false), unlockAudio(), newFight())}>
                Practice fight
              </button>
              <button role="menuitem" onClick={() => (setMenu(false), openPractice())}>
                Practice sandbox
              </button>
              <button role="menuitem" onClick={() => (setMenu(false), unlockAudio(), startTutorial())}>
                Tutorial
              </button>
              <button role="menuitem" data-testid="ws-slots" onClick={() => (setMenu(false), void openSlots())}>
                Save slots
              </button>
              <button role="menuitem" data-testid="ws-title" onClick={goTitle}>
                Title
              </button>
            </div>
          )}
        </div>
      </header>
      <div class="wsbody">
        <section class="room" data-testid="room">
          <div class="roominner">
            <RoomArt />
            <div class="sprocketspot">
              <Sprocket mood={mood} size={size} onPet={petSprocket} />
            </div>
          </div>
          <p class="sprocketline" data-testid="sprocket-line" aria-live="polite">
            {LINE[mood]}
          </p>
        </section>
        <section class="wspanel">
          {newsNow && (newsNow.unlocks.length > 0 || newsNow.notes.length > 0) && (
            <div class="newsstrip" data-testid="ws-news">
              {newsNow.unlocks.map((u) => (
                <span key={u}>New: {CHASSIS[u]?.name ?? u} is unlocked.</span>
              ))}
              {newsNow.notes.length > 0 && <span>A new note is on the wall.</span>}
              <button class="ghostbtn small" onClick={() => (news.value = null)}>
                Dismiss
              </button>
            </div>
          )}
          <nav class="tabs" role="tablist">
            {TABS.map(([id, label]) => (
              <button key={id} role="tab" class={`tab ${tab === id ? 'on' : ''}`} aria-selected={tab === id} data-testid={`tab-${id}`} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </nav>
          <div class="tabbody" data-testid="tabbody">
            {tab === 'bench' && <Bench p={p} />}
            {tab === 'chassis' && <Rack p={p} chosen={pick} setChosen={setChosen} />}
            {tab === 'notes' && <Notes p={p} />}
            {tab === 'parts' && <Blueprints p={p} />}
            {tab === 'history' && <History p={p} />}
          </div>
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
            <span class="doorhint">Chassis: {CHASSIS[pick].name}</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
