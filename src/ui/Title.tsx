import { hasOngoingFight, newFight, resume } from '../app/controller';
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
        </div>
        {ongoing && <p class="hint">Starting a new practice fight replaces the one in progress.</p>}
        <p class="hint">Keys in a fight: 1-4 pick a part, arrows move, Enter places, R runs.</p>
      </div>
    </main>
  );
}
