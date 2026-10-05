// The save slot screen: three cards. Each slot keeps its own profile and run.
import { useEffect, useRef, useState } from 'preact/hooks';
import { deleteSlot, goTitle, newSlot, slotCards, slotsHint, useSlot } from '../app/controller';
import type { SlotCard } from '../app/controller';
import type { SlotNo } from '../app/save';
import { unlockAudio } from '../audio/synth';
import { fmt, when } from './format';

function Card({ c, onBegin, onDelete }: { c: SlotCard; onBegin: (n: SlotNo) => void; onDelete: (c: SlotCard) => void }) {
  if (c.state === 'empty') {
    return (
      <article class="slotcard empty" data-testid={`slot-${c.n}`} data-state="empty">
        <h3>Slot {c.n}</h3>
        <p class="slotline">Empty slot</p>
        <button class="primary" data-testid={`slot-begin-${c.n}`} onClick={() => onBegin(c.n)}>
          Begin
        </button>
      </article>
    );
  }
  if (c.state === 'corrupt') {
    return (
      <article class="slotcard corrupt" data-testid={`slot-${c.n}`} data-state="corrupt">
        <h3>Slot {c.n}</h3>
        <p class="slotline warn">This save could not be read.</p>
        <p class="slotsub">It is kept safe on this device, and will not be overwritten.</p>
        <button class="secondary" data-testid={`slot-delete-${c.n}`} onClick={() => onDelete(c)}>
          Delete
        </button>
      </article>
    );
  }
  return (
    <article class="slotcard" data-testid={`slot-${c.n}`} data-state="ok">
      <h3 data-testid={`slot-name-${c.n}`}>{c.name}</h3>
      <dl class="slotstats">
        <div>
          <dt>Wins</dt>
          <dd data-testid={`slot-wins-${c.n}`}>{fmt(c.wins ?? 0)}</dd>
        </div>
        <div>
          <dt>Best floor</dt>
          <dd>{fmt(c.bestFloor ?? 0)}</dd>
        </div>
        <div>
          <dt>Runs</dt>
          <dd>{fmt(c.runs ?? 0)}</dd>
        </div>
      </dl>
      <p class="slotsub">Last played {when(c.updatedAt)}</p>
      <div class="slotbtns">
        <button
          class="primary"
          data-testid={`slot-continue-${c.n}`}
          onClick={() => {
            unlockAudio();
            void useSlot(c.n);
          }}
        >
          {c.climbing ? 'Continue climb' : 'Continue'}
        </button>
        <button class="secondary" data-testid={`slot-delete-${c.n}`} onClick={() => onDelete(c)}>
          Delete
        </button>
      </div>
    </article>
  );
}

export function SlotsScreen() {
  const cards = slotCards.value;
  const [naming, setNaming] = useState<SlotNo | null>(null);
  const [name, setName] = useState('Tinkerer');
  const [confirm, setConfirm] = useState<SlotCard | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // focus the name field once the dialog is on screen (the autofocus attribute is blocked by the browser)
  useEffect(() => {
    if (naming === null) return;
    const el = input.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, [naming]);

  const begin = async (): Promise<void> => {
    if (naming === null || busy) return;
    setBusy(true);
    unlockAudio();
    slotsHint.value = false;
    await newSlot(naming, input.current?.value ?? name); // what is in the field, typed or not yet through onInput
    setBusy(false);
    setNaming(null);
  };

  return (
    <main class="slotscreen" data-testid="slots">
      <header class="slothead">
        <button class="ghostbtn" data-testid="slots-back" onClick={() => ((slotsHint.value = false), goTitle())}>
          Back
        </button>
        <h2>Choose a save</h2>
      </header>
      {slotsHint.value && (
        <p class="slots-hint" data-testid="slots-hint">
          Name your tinker to start your first climb.
        </p>
      )}
      <div class="slotgrid">
        {cards === null && <p class="empty">Looking at the shelves...</p>}
        {cards?.map((c) => (
          <Card
            key={c.n}
            c={c}
            onBegin={(n) => {
              setName('Tinkerer');
              setNaming(n);
            }}
            onDelete={setConfirm}
          />
        ))}
      </div>
      {naming !== null && (
        <div class="modal" role="dialog" aria-label="Name your tinkerer" data-testid="name-dialog">
          <form
            class="modalcard"
            onSubmit={(e) => {
              e.preventDefault();
              void begin();
            }}
          >
            <h3>Who is climbing?</h3>
            <input class="nameinput" data-testid="name-input" maxLength={20} value={name} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} aria-label="Name" ref={input} />
            <div class="slotbtns">
              <button type="button" class="secondary" data-testid="name-cancel" onClick={() => setNaming(null)}>
                Cancel
              </button>
              <button type="submit" class="primary" data-testid="name-begin" disabled={busy}>
                Begin
              </button>
            </div>
          </form>
        </div>
      )}
      {confirm && (
        <div class="modal" role="alertdialog" aria-label="Delete this save" data-testid="delete-dialog">
          <div class="modalcard">
            <h3>Delete {confirm.state === 'ok' ? confirm.name : `slot ${confirm.n}`}?</h3>
            <p>All of its Brass, upgrades and history will be gone. This cannot be undone.</p>
            <div class="slotbtns">
              <button class="secondary" data-testid="delete-cancel" onClick={() => setConfirm(null)}>
                Keep it
              </button>
              <button
                class="primary danger-btn"
                data-testid="delete-confirm"
                onClick={() => {
                  const n = confirm.n;
                  setConfirm(null);
                  void deleteSlot(n);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
