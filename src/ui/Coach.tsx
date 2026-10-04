// The guided first fight: a one-sentence coach banner, and the keys of the things it asks you to look at or touch.
import { gentle, TUTORIAL_LAST, tutorial, tutorialAck, endTutorial } from '../app/controller';
import type { CombatState } from '../core/types';

const TEXT: Record<number, string> = {
  1: 'Tap a Spur Gear in your hand, then tap the glowing cell beside the Mainspring.',
  2: 'See the number on the part? That is how many times it will fire. The summary below shows the total.',
  3: 'Now press Run, and watch the motion travel from the Mainspring.',
  4: 'The icon above the enemy is its intent: what it will do next. Check it before you build.',
  5: 'Place an Escapement beside your Spur. It gives you Plating, which soaks up damage.',
  6: 'Add the Coil Spring, then press Run. A spring holds motion for two ticks, then releases a big Strike.',
  7: 'A wrench shows which cell the enemy will Rust. Build around it so your motion still flows.',
  8: 'That is the whole idea. Keep building until the enemy is scrapped.',
};

const ACK: Record<number, string> = { 2: 'Got it', 4: 'Got it', 7: 'Got it', 8: 'Finish' };

/** What the coach points at, as keys the combat screen matches: `cell:<index>`, `card:<defId>`, `run`, `intent`, `preview`. */
export function tutorialTargets(step: number, c: CombatState): Set<string> {
  const out = new Set<string>();
  if (step === 1) {
    out.add('card:spur');
    out.add('cell:6');
  } else if (step === 2) out.add('preview');
  else if (step === 3) out.add('run');
  else if (step === 4) out.add('intent');
  else if (step === 5) {
    out.add('card:escapement');
    out.add('cell:7');
  } else if (step === 6) {
    out.add('card:coil');
    out.add('run');
  } else if (step === 7) {
    out.add('intent');
    c.enemies.forEach((e) => {
      if (e.intent.kind === 'sabotage' && e.intent.target !== undefined) out.add(`cell:${e.intent.target}`);
    });
  }
  return out;
}

export function Coach() {
  const t = tutorial.value;
  if (!t) return null;
  const msg = gentle.value ? 'The Spire is gentle today.' : TEXT[t.step];
  const ack = ACK[t.step];
  return (
    <aside class="coach" data-testid="coach" data-step={t.step} aria-live="polite">
      <span class="cstep">
        {t.step}/{TUTORIAL_LAST}
      </span>
      <span class="ctext" data-testid="coach-text">
        {msg}
      </span>
      {ack && (
        <button class="primary small" data-testid="coach-next" onClick={tutorialAck}>
          {ack}
        </button>
      )}
      <button class="ghostbtn small" data-testid="coach-skip" onClick={() => endTutorial()}>
        Skip
      </button>
    </aside>
  );
}
