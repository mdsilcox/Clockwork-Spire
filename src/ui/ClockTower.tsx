// The clock tower door (B10b): pick the mode and the Overwind level for the next climb. Locked entries say what opens them.
// The choice is saved at once as the profile's lastMode and lastOverwind (controller pickMode and pickOverwind).
import { pickMode, pickOverwind } from '../app/controller';
import { MODES } from '../core/content/modes';
import { OVERWIND_BRASS_PER_LEVEL, OVERWIND_TWISTS } from '../core/content/overwind';
import { modeLock, overwindLock } from '../core/difficulty';
import type { ModeDef } from '../core/defs';
import type { Profile } from '../core/types';
import './clocktower.css';

const pct = (n: number): string => (n === 100 ? 'normal' : `${n > 100 ? '+' : ''}${n - 100}%`);

/** One line of plain numbers for a mode. */
export function modeLine(m: ModeDef): string {
  return `Enemy HP ${pct(m.enemyHp)}, enemy damage ${pct(m.enemyDamage)}, ${m.hours} hours an act, oil heals ${m.oilHeal}%, Brass ${m.brass}%`;
}

export function ClockTower({ p }: { p: Profile }) {
  const mode = p.lastMode ?? 'journeyman';
  const level = p.lastOverwind ?? 0;
  const open = p.rewards?.overwind ?? 0;
  const chosen = MODES.find((m) => m.id === mode) ?? MODES[1];
  return (
    <section class="towerpanel" data-testid="clocktower-panel">
      <h3 class="towerh">Mode</h3>
      <div class="towermodes" role="group" aria-label="Mode">
        {MODES.map((m) => {
          const reason = modeLock(p, m.id);
          return (
            <div class="towercell" key={m.id}>
              <button
                class={`towerbtn mode ${mode === m.id ? 'on' : ''}`}
                data-testid={`mode-${m.id}`}
                data-locked={reason ? 'true' : 'false'}
                aria-pressed={mode === m.id}
                disabled={!!reason}
                onClick={() => pickMode(m.id)}
              >
                {m.name}
              </button>
              {reason && (
                <span class="towerlock" data-testid={`mode-lock-${m.id}`}>
                  {reason}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p class="towerline" data-testid="mode-line">
        {chosen.name}: {modeLine(chosen)}.
      </p>

      <h3 class="towerh">Overwind</h3>
      {open === 0 && <p class="towerline">Overwind opens after a Journeyman win. A win on Apprentice does not open it.</p>}
      <div class="towerlevels" role="group" aria-label="Overwind level">
        {Array.from({ length: 11 }, (_, n) => {
          const reason = n === 0 ? null : overwindLock(p, n);
          const twist = OVERWIND_TWISTS[n - 1];
          return (
            <div class={`towerlevel ${reason ? 'shut' : ''}`} key={n}>
              <button
                class={`towerbtn lv ${level === n ? 'on' : ''}`}
                data-testid={`overwind-level-${n}`}
                data-locked={reason ? 'true' : 'false'}
                aria-pressed={level === n}
                aria-label={n === 0 ? 'Overwind off' : `Overwind ${n}`}
                disabled={!!reason}
                onClick={() => pickOverwind(n)}
              >
                {n === 0 ? 'Off' : n}
              </button>
              <span class="towername">{n === 0 ? 'No twists' : twist.name}</span>
              {reason && (
                <span class="towerlock" data-testid={`overwind-lock-${n}`}>
                  {reason}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {level > 0 && (
        <div class="towertwists" data-testid="overwind-twists">
          <p class="towerline">
            Overwind {level} applies these, and pays {level * OVERWIND_BRASS_PER_LEVEL}% more Brass:
          </p>
          <ul>
            {OVERWIND_TWISTS.filter((t) => t.level <= level).map((t) => (
              <li key={t.level} data-testid={`overwind-twist-${t.level}`}>
                <b>{t.name}.</b> {t.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** "Master" or "Master, Overwind 3": the mode (and level) a climb is on, for the gate and the run bar. */
export function modeText(mode: string | undefined, overwind: number | undefined): string {
  const m = MODES.find((x) => x.id === (mode ?? 'journeyman')) ?? MODES[1];
  return (overwind ?? 0) > 0 ? `${m.name}, Overwind ${overwind}` : m.name;
}
