// The end of a climb. The run was already settled into the profile (in one save write) before this shows.
// Defeat: the floor, who ended it, Brass and blueprints. Victory: the ending (Sprocket's lane), then the Workshop.
import { endSummary, leaveResult, profileView, runView } from '../app/controller';
import { CHASSIS } from '../core/content/chassis';
import { enemyDef } from '../core/content/enemies';
import { partName } from '../core/content/parts';
import { absoluteFloor } from '../core/run';
import { Ending } from './Ending';
import { fmt } from './format';
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
  const sum = endSummary.value;
  if (!run) return null;
  const won = run.phase === 'victory';
  const s = run.stats;
  const brass = sum?.brass ?? 0;
  const chassis = CHASSIS[run.config.chassis]?.name ?? run.config.chassis;

  if (won) {
    return (
      <main class="endscreen" data-testid="victory">
        <Ending
          stats={{ runs: profileView.value?.runsFinished ?? 1, turns: sum?.record.turns ?? s.turns, biggestTurn: sum?.record.biggestTurn ?? s.biggestTurn, chassis }}
          onDone={leaveResult}
        />
      </main>
    );
  }

  const blueprints = sum?.record.blueprintsFound ?? s.blueprintsFound;
  const rows: [string, string | number][] = [
    ['Floors climbed', absoluteFloor(run)],
    ['Fights won', s.fights],
    ['Elites beaten', s.elites],
    ['Turns played', s.turns],
    ['Biggest turn', s.biggestTurn],
    ['Brass earned', `${fmt(brass)}`],
  ];
  return (
    <main class="endscreen" data-testid="defeat">
      <div class="endcard">
        <p class="eyebrow">{ACT_TITLE[run.act]}</p>
        <h1>The machine winds down.</h1>
        <p class="lede" data-testid="end-floor">
          You reached act {run.act}, floor {run.floor}. {run.killedBy ? `${killer(run.killedBy)} had the last word.` : 'The climb ends here.'}
        </p>
        <dl class="stats" data-testid="end-stats">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {run.killedBy && (
          <p class="hint" data-testid="killed-by">
            Defeated by {killer(run.killedBy)}.
          </p>
        )}
        {blueprints.length > 0 && (
          <p class="banner-line" data-testid="end-blueprints">
            Blueprints found: {blueprints.map((b) => partName(b, false)).join(', ')}. They stay with you.
          </p>
        )}
        <button class="primary" data-testid="end-continue" onClick={leaveResult}>
          To the Workshop
        </button>
      </div>
    </main>
  );
}
