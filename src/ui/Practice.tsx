// The practice sandbox picker: any encounter, any bin. This is how every part and enemy can be tried.
import { useMemo, useState } from 'preact/hooks';
import { allEncounters, catalog, defaultEnemies, goTitle, PRESETS, presetBin, resolveBin, startPractice } from '../app/controller';
import type { BinSpec, Encounter } from '../app/controller';
import { enemyDef } from '../core/content/enemies';
import { partDef } from '../core/content/parts';
import { FAMILY_COLOR, FAMILY_LABEL } from '../render/palette';
import { unlockAudio } from '../audio/synth';

type BinMode = 'tinker' | 'random10' | 'pick' | `preset:${string}`;

const TIER_LABEL: Record<string, string> = { easy: 'Easy', normal: 'Fight', elite: 'Elite', boss: 'Boss', practice: 'Dummy' };

function label(e: Encounter): string {
  const names = e.enemies.map((id) => enemyDef(id).name);
  const out: string[] = [];
  for (const n of names) {
    const same = names.filter((x) => x === n).length;
    if (same > 1) {
      if (!out.some((o) => o.startsWith(`${n} x`))) out.push(`${n} x${same}`);
    } else out.push(n);
  }
  return out.join(', ');
}

export function PracticePicker() {
  const encounters = useMemo(() => allEncounters(), []);
  const defKey = defaultEnemies().join();
  const [enc, setEnc] = useState<number>(Math.max(0, encounters.findIndex((e) => e.enemies.join() === defKey)));
  const [mode, setMode] = useState<BinMode>('preset:mixed');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const parts = useMemo(() => catalog(), []);
  const chosen = parts.flatMap((p) => Array.from({ length: counts[p.id] ?? 0 }, () => p.id));
  const act = encounters[enc]?.act ?? 1;
  const canStart = mode !== 'pick' || chosen.length > 0;
  const acts = [1, 2, 3].filter((a) => encounters.some((e) => e.act === a));

  const start = (): void => {
    unlockAudio();
    const bin: BinSpec = mode === 'pick' ? chosen : mode === 'tinker' || mode === 'random10' ? mode : presetBin(mode.slice(7), act);
    startPractice({ enemies: encounters[enc].enemies, bin });
  };
  const bump = (id: string, d: number): void => setCounts((c) => ({ ...c, [id]: Math.max(0, Math.min(9, (c[id] ?? 0) + d)) }));

  return (
    <main class="picker" data-testid="practice-picker">
      <header class="phead">
        <button class="ghostbtn" onClick={goTitle} data-testid="picker-back">
          Back
        </button>
        <h2>Practice sandbox</h2>
        <button class="primary" data-testid="start-practice" disabled={!canStart} onClick={start}>
          Start fight
        </button>
      </header>
      <div class="pbody">
        <section>
          <h3>Enemies</h3>
          {acts.map((a) => (
            <div key={a} class="pgroup">
              <h4>Act {a}</h4>
              <div class="pgrid">
                {encounters.map((e, i) =>
                  e.act !== a ? null : (
                    <button key={i} class={`opt ${enc === i ? 'on' : ''}`} aria-pressed={enc === i} data-testid={`enc-${i}`} onClick={() => setEnc(i)}>
                      <span class="otier">{TIER_LABEL[e.tier] ?? e.tier}</span>
                      {label(e)}
                    </button>
                  ),
                )}
              </div>
            </div>
          ))}
        </section>
        <section>
          <h3>Parts</h3>
          <p class="phint">Presets grow with the enemy act: act 2 adds upgraded parts, act 3 adds rare ones.</p>
          <div class="pgrid">
            {PRESETS.map((p) => (
              <button key={p.id} class={`opt ${mode === `preset:${p.id}` ? 'on' : ''}`} aria-pressed={mode === `preset:${p.id}`} data-testid={`bin-${p.id}`} onClick={() => setMode(`preset:${p.id}`)}>
                <span class="otier">{resolveBin(presetBin(p.id, act)).length} parts, {p.blurb}</span>
                {p.name}
              </button>
            ))}
            <button class={`opt ${mode === 'tinker' ? 'on' : ''}`} aria-pressed={mode === 'tinker'} data-testid="bin-tinker" onClick={() => setMode('tinker')}>
              Tinker start
            </button>
            <button class={`opt ${mode === 'random10' ? 'on' : ''}`} aria-pressed={mode === 'random10'} data-testid="bin-random" onClick={() => setMode('random10')}>
              Random 10 parts
            </button>
            <button class={`opt ${mode === 'pick' ? 'on' : ''}`} aria-pressed={mode === 'pick'} data-testid="bin-pick" onClick={() => setMode('pick')}>
              Pick parts {chosen.length > 0 ? `(${chosen.length})` : ''}
            </button>
          </div>
          {mode === 'pick' && (
            <div class="plist" data-testid="part-list">
              {parts.map((p) => {
                const d = partDef(p.id);
                const n = counts[p.id] ?? 0;
                return (
                  <div key={p.id} class={`prow ${n > 0 ? 'on' : ''}`}>
                    <span class="pband" style={{ background: FAMILY_COLOR[d.family] }} />
                    <span class="pname">
                      <b>{d.name}</b> <i>{FAMILY_LABEL[d.family]}</i>
                      <span class="ptext">{d.text}</span>
                    </span>
                    <span class="step">
                      <button aria-label={`Fewer ${d.name}`} disabled={n === 0} onClick={() => bump(p.id, -1)}>
                        -
                      </button>
                      <b data-testid={`count-${p.id}`}>{n}</b>
                      <button aria-label={`More ${d.name}`} data-testid={`part-${p.id}-plus`} onClick={() => bump(p.id, 1)}>
                        +
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
