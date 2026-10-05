// The v2 guided fight (B10d): a one-sentence coach banner, the keys of the things it asks you to touch, the salvage tray built from
// the rig's broken part (held here, in UI state: not a run, nothing saved) and Sprocket's closing line.
import { useState } from 'preact/hooks';
import { combat, endTutorial, gentle, tutorial, tutorialAck, tutorialTrayDone } from '../app/controller';
import { TUTORIAL_SCRIPT } from '../app/tutorial';
import { cell } from '../core/board';
import { partName, partText } from '../core/content/parts';
import { SCRAP_PER_SCRAPPED } from '../core/salvage';
import type { CombatState, SalvageItem } from '../core/types';
import { TierMark } from './TierMark';
import './tutorial.css';

const STEPS = TUTORIAL_SCRIPT.steps;
const RARITY_LABEL: Record<string, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', masterwork: 'Masterwork', legendary: 'Legendary' };

/** What the coach points at, as keys the combat screen matches: `cell:<index>`, `card:<defId>`, `run`, `intent`, `preview`. */
export function tutorialTargets(step: number, _c: CombatState): Set<string> {
  const out = new Set<string>();
  const s = STEPS[step - 1];
  if (!s) return out;
  if (s.expect.kind === 'place') {
    out.add('card:spur');
    out.add(`cell:${cell(s.expect.cell)}`);
  } else if (s.expect.kind === 'run') {
    out.add('run');
    out.add('preview');
  }
  return out;
}

/** The rig's broken part as a salvage item (the Strut's Spur Gear), from the live fight, with the script's own as a fallback. */
function trayItems(c: CombatState | null): SalvageItem[] {
  const got = c?.broken?.filter((b) => !b.locked) ?? [];
  return got.length > 0 ? got.slice(0, 1) : [{ enemy: 0, partId: 'rig-strut', salvage: 'spur', rarity: 'common', locked: false }];
}

function Tray({ items }: { items: SalvageItem[] }) {
  const [keep, setKeep] = useState<number[]>([]);
  const scrapped = items.length - keep.length;
  return (
    <section class="tut-tray rewardbox salvagebox" data-testid="salvage-tray" aria-label="Salvage tray">
      <p class="salvage-note">Keep any of these parts for your bin. What you leave is scrapped for {SCRAP_PER_SCRAPPED} Scrap each.</p>
      <div class="salvage-list">
        {items.map((it, n) => {
          const kept = keep.includes(n);
          return (
            <div key={n} class={`salvage-item ${kept ? 'kept' : ''}`} data-testid={`salvage-item-${n}`}>
              <span class="sname">{partName(it.salvage, false)}</span>
              <span class="srarity">
                <TierMark rarity={it.rarity} />
                {RARITY_LABEL[it.rarity] ?? it.rarity}
              </span>
              <span class="ctext">{partText(it.salvage, false)}</span>
              <button class={kept ? 'primary skeep' : 'secondary skeep'} data-testid={`salvage-keep-${n}`} aria-pressed={kept} onClick={() => setKeep(kept ? keep.filter((k) => k !== n) : [...keep, n])}>
                {kept ? 'Keeping it' : 'Keep it'}
              </button>
            </div>
          );
        })}
      </div>
      <div class="nodeactions salvage-foot">
        <span class="salvage-pay" data-testid="salvage-pay">
          {scrapped > 0 ? `Scrapping the rest adds +${scrapped * SCRAP_PER_SCRAPPED} Scrap` : 'Nothing left to scrap'}
        </span>
        <button class="primary" data-testid="salvage-done" onClick={tutorialTrayDone}>
          Done
        </button>
      </div>
    </section>
  );
}

export function Coach() {
  const t = tutorial.value;
  if (!t) return null;
  if (t.closing) {
    return (
      <div class="tut-overlay" data-testid="tutorial-closing-wrap">
        <div class="tut-closing" data-testid="tutorial-closing">
          <p>{TUTORIAL_SCRIPT.closing}</p>
          <button class="primary" data-testid="tutorial-finish" onClick={() => endTutorial()}>
            Finish
          </button>
        </div>
      </div>
    );
  }
  const step = STEPS[t.step - 1];
  const msg = gentle.value ? 'The Spire is gentle today.' : step.prompt;
  const ack = step.expect.kind === 'continue';
  const tray = step.expect.kind === 'keep';
  return (
    <>
      <aside class={`coach ${tray ? 'tut-top' : ''}`} data-testid="coach" data-step={step.id} data-index={t.step} aria-live="polite">
        <span class="cstep">
          {t.step}/{STEPS.length}
        </span>
        <span class="ctext" data-testid="coach-text">
          {msg}
        </span>
        {ack && (
          <button class="primary small" data-testid="coach-next" onClick={tutorialAck}>
            Got it
          </button>
        )}
        <button class="ghostbtn small" data-testid="coach-skip" onClick={() => endTutorial()}>
          Skip
        </button>
      </aside>
      {tray && (
        <div class="tut-overlay">
          <Tray items={trayItems(combat.value)} />
        </div>
      )}
    </>
  );
}
