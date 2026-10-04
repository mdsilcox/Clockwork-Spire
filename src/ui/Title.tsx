import { hasOngoingFight, newFight, openPractice, resume, startTutorial } from '../app/controller';
import { colorBlind, openGlossary, setColorBlind } from '../app/prefs';
import { unlockAudio } from '../audio/synth';

export function Title() {
  const ongoing = hasOngoingFight();
  return (
    <main class="title" data-testid="title">
      <div class="title-card">
        <p class="eyebrow">A machine-building roguelite</p>
        <h1>Clockwork Spire</h1>
        <p class="lede">Place the parts. Wind the Mainspring. Watch the machine do the fighting.</p>
        <div class="title-actions">
          {ongoing && (
            <button
              class="primary"
              data-testid="continue"
              onClick={() => {
                unlockAudio();
                resume();
              }}
            >
              Continue practice fight
            </button>
          )}
          <button
            class={ongoing ? 'secondary' : 'primary'}
            data-testid="practice"
            onClick={() => {
              unlockAudio();
              newFight();
            }}
          >
            {ongoing ? 'New practice fight' : 'Practice fight'}
          </button>
          <button
            class="secondary"
            data-testid="tutorial"
            onClick={() => {
              unlockAudio();
              startTutorial();
            }}
          >
            Start the tutorial
          </button>
          <button class="secondary" data-testid="sandbox" onClick={openPractice}>
            Practice sandbox
          </button>
          <button class="secondary" data-testid="open-glossary" onClick={() => openGlossary()}>
            Glossary
          </button>
        </div>
        <label class="check">
          <input type="checkbox" data-testid="colorblind" checked={colorBlind.value} onChange={(e) => setColorBlind((e.currentTarget as HTMLInputElement).checked)} />
          Color-blind icons: add a word under each enemy intent
        </label>
        {ongoing && <p class="hint">Starting a new practice fight replaces the one in progress.</p>}
        <p class="hint">Keys in a fight: 1-4 pick a part, arrows move, Enter places, R runs.</p>
      </div>
    </main>
  );
}
