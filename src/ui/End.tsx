// The end of a climb. The run was already settled into the profile (in one save write) before this shows.
// Defeat: the floor, who ended it, Brass and blueprints. Victory: the ending (Sprocket's lane), then the Workshop.
import { useState } from 'preact/hooks';
import { endSummary, leaveResult, profileView, runView } from '../app/controller';
import type { RunState } from '../core/types';
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

/** Floors left behind: one number for the stat tile and the Brass breakdown. */
export function floorsClimbed(run: RunState): number {
  return Math.max(0, absoluteFloor(run) - (run.phase === 'victory' ? 0 : 1));
}

/** Where this run's Brass came from, from the run's own stats, so the total always makes sense. */
export function BrassBreakdown({ run, total }: { run: RunState; total: number }) {
  const s = run.stats;
  const won = run.phase === 'victory';
  const floors = floorsClimbed(run);
  const rows: [string, number, string][] = [
    [`Floors climbed (${floors})`, s.floorBrass ?? 0, 'floors'],
    [`Elites beaten (${s.elites} x 10)`, s.elites * 10, 'elites'],
    [`Bosses beaten (${s.bossesBeaten} x 25)`, s.bossesBeaten * 25, 'bosses'],
  ];
  if (won) rows.push(['Victory bonus', 50, 'victory']);
  if ((s.bonusBrass ?? 0) > 0) rows.push(['Trinkets and events', s.bonusBrass ?? 0, 'bonus']);
  return (
    <section class="brassbox" data-testid="brass-breakdown">
      <h3>Where the Brass came from</h3>
      <ul>
        {rows
          .filter(([, v, id]) => v > 0 || id === 'floors')
          .map(([k, v, id]) => (
            <li key={id} data-testid={`brass-${id}`}>
              <span>{k}</span>
              <b>{fmt(v)}</b>
            </li>
          ))}
        <li class="total" data-testid="brass-total">
          <span>Total</span>
          <b>{fmt(total)} Brass</b>
        </li>
      </ul>
    </section>
  );
}

export function EndScreen() {
  const [afterEnding, setAfterEnding] = useState(false);
  const run = runView.value;
  const sum = endSummary.value;
  if (!run) return null;
  const won = run.phase === 'victory';
  const s = run.stats;
  const brass = sum?.brass ?? 0;
  const chassis = CHASSIS[run.config.chassis]?.name ?? run.config.chassis;

  if (won && !afterEnding) {
    return (
      <main class="endscreen" data-testid="victory">
        <Ending
          stats={{ runs: profileView.value?.runsFinished ?? 1, turns: sum?.record.turns ?? s.turns, biggestTurn: sum?.record.biggestTurn ?? s.biggestTurn, chassis }}
          onDone={() => setAfterEnding(true)}
        />
      </main>
    );
  }
  if (won) {
    return (
      <main class="endscreen" data-testid="victory-summary">
        <div class="endcard">
          <p class="eyebrow">The top of the Spire</p>
          <h1>The climb is complete.</h1>
          <BrassBreakdown run={run} total={brass} />
          <button class="primary" data-testid="end-continue" onClick={leaveResult}>
            To the Workshop
          </button>
        </div>
      </main>
    );
  }

  const blueprints = sum?.record.blueprintsFound ?? s.blueprintsFound;
  const rows: [string, string | number][] = [
    ['Floors climbed', floorsClimbed(run)],
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
        <BrassBreakdown run={run} total={brass} />
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
