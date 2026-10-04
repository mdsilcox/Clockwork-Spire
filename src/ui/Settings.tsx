// The settings overlay: sound, animation speed, color-blind labels and reduced effects. Changes apply live.
import { useEffect, useRef } from 'preact/hooks';
import { settings, updateSettings } from '../app/controller';
import { settingsOpen } from '../app/prefs';

function Slider({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (v: number) => void }) {
  const pct = Math.round(value * 100);
  return (
    <div class="srow">
      <label for={`set-${id}`}>{label}</label>
      <input
        id={`set-${id}`}
        class="srange"
        type="range"
        min="0"
        max="100"
        step="5"
        value={pct}
        data-testid={`set-${id}`}
        aria-valuetext={`${pct} percent`}
        onInput={(e) => onChange(Number((e.currentTarget as HTMLInputElement).value) / 100)}
      />
      <output class="sval" data-testid={`set-${id}-value`}>
        {pct}%
      </output>
    </div>
  );
}

export function SettingsScreen() {
  const open = settingsOpen.value;
  const st = settings.value;
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) first.current?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div class="glossary settings" role="dialog" aria-label="Settings" aria-modal="true" data-testid="settings">
      <header class="ghead">
        <h2>Settings</h2>
        <span class="grow" />
        <button ref={first} class="ghostbtn gclose" data-testid="settings-close" onClick={() => (settingsOpen.value = false)}>
          Done
        </button>
      </header>
      <div class="settingsbody">
        <section class="sgroup">
          <h3>Sound</h3>
          <Slider id="master" label="Master volume" value={st.master} onChange={(v) => updateSettings({ master: v })} />
          <Slider id="music" label="Music" value={st.music} onChange={(v) => updateSettings({ music: v })} />
          <Slider id="effects" label="Effects" value={st.effects} onChange={(v) => updateSettings({ effects: v })} />
          <label class="check left">
            <input type="checkbox" data-testid="set-mute" checked={st.muted} onChange={(e) => updateSettings({ muted: (e.currentTarget as HTMLInputElement).checked })} />
            Mute everything
          </label>
        </section>
        <section class="sgroup">
          <h3>Animation</h3>
          <div class="srow">
            <span id="speed-label">Speed of a turn</span>
            <div class="seg" role="radiogroup" aria-labelledby="speed-label">
              {(['1x', '2x', 'skip'] as const).map((sp) => (
                <button key={sp} role="radio" aria-checked={st.speed === sp} class={`segbtn ${st.speed === sp ? 'on' : ''}`} data-testid={`set-speed-${sp}`} onClick={() => updateSettings({ speed: sp })}>
                  {sp === 'skip' ? 'Skip' : sp}
                </button>
              ))}
            </div>
          </div>
          <label class="check left">
            <input type="checkbox" data-testid="set-reduced" checked={st.reducedEffects} onChange={(e) => updateSettings({ reducedEffects: (e.currentTarget as HTMLInputElement).checked })} />
            Reduced effects: less shake, flashing and particles
          </label>
        </section>
        <section class="sgroup">
          <h3>Seeing the game</h3>
          <label class="check left">
            <input type="checkbox" data-testid="set-colorblind" checked={st.colorBlindIcons} onChange={(e) => updateSettings({ colorBlindIcons: (e.currentTarget as HTMLInputElement).checked })} />
            Color-blind icons: a word under every enemy intent
          </label>
        </section>
      </div>
    </div>
  );
}
