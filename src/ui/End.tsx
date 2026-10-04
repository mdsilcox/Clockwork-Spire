// The end of a climb: a placeholder victory card and the defeat screen. B4 adds the Workshop and the full ending.
import { brassNow, dropRun, runView } from '../app/controller';
import { enemyDef } from '../core/content/enemies';
import { absoluteFloor } from '../core/run';
import { ACT_TITLE } from './Map';

function killer(id?: string): string {
  if (!id) return 'the Spire';
  try {
    return enemyDef(id).name;
  } catch {
    return id;
  }
}

export function EndScreen() {
  const run = runView.value;
  if (!run) return null;
  const won = run.phase === 'victory';
  const s = run.stats;
  let brass = 0;
  try {
    brass = brassNow();
  } catch {
    brass = s.brassEarned;
  }
  const rows: [string, string | number][] = [
    ['Floors climbed', absoluteFloor(run)],
    ['Fights won', s.fights],
    ['Elites beaten', s.elites],
    ['Bosses beaten', s.bossesBeaten],
    ['Turns played', s.turns],
    ['Biggest turn', s.biggestTurn],
    ['Parts in your bin', run.bin.length],
    ['Brass this climb', brass],
  ];
  return (
    <main class="endscreen" data-testid={won ? 'victory' : 'defeat'}>
      <div class="endcard">
        <p class="eyebrow">{won ? 'The top of the Spire' : ACT_TITLE[run.act]}</p>
        <h1>{won ? 'The Clockmaker stops.' : 'The machine winds down.'}</h1>
        <p class="lede">
          {won
            ? 'Every tick settles. For a moment, the whole Spire is quiet.'
            : `You reached act ${run.act}, floor ${run.floor}. ${run.killedBy ? `${killer(run.killedBy)} had the last word.` : 'The climb ends here.'}`}
        </p>
        <dl class="stats" data-testid="end-stats">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {!won && run.killedBy && (
          <p class="hint" data-testid="killed-by">
            Defeated by {killer(run.killedBy)}.
          </p>
        )}
        <button class="primary" data-testid="end-continue" onClick={() => dropRun(false)}>
          Back to title
        </button>
      </div>
    </main>
  );
}
