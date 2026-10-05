import { useEffect } from 'preact/hooks';
import { combat, nodeKey, runView, screen } from '../app/controller';
import { applyUpdate, closeTopOverlay, portrait, showUpdate } from '../app/prefs';
import { migrationNotice } from '../app/save';
import { CombatScreen } from './Combat';
import { EndScreen } from './End';
import { GlossaryScreen } from './Glossary';
import { BinViewer, MapScreen } from './Map';
import { ActScreen, OilRoomScreen, TraderScreen, WorkbenchScreen } from './Climb';
import { EventScreen, ForgeScreen, OilScreen, LegendaryScreen, RewardScreen, SalvageScreen, ShopScreen } from './Nodes';
import { HowToScreen } from './HowTo';
import { PortraitCard } from './PortraitCard';
import { PracticePicker } from './Practice';
import { SettingsScreen } from './Settings';
import { SlotsScreen } from './Slots';
import { BellfootScreen } from './Bellfoot';
import { Title } from './Title';

/** "A new version is ready": quiet, and only where nothing is at stake (title, slots, Workshop, the map). */
function UpdateToast() {
  const scr = screen.value;
  const rv = runView.value;
  const calm = scr === 'title' || scr === 'slots' || scr === 'bellfoot' || (scr === 'run' && (rv?.phase === 'map' || rv?.phase === 'section'));
  if (!showUpdate.value || !calm) return null;
  return (
    <div class="updatetoast" role="status" data-testid="update-toast">
      <span>A new version is ready</span>
      <button class="primary small" data-testid="update-now" onClick={() => applyUpdate()}>
        Update
      </button>
      <button class="ghostbtn small" data-testid="update-later" onClick={() => (showUpdate.value = false)}>
        Later
      </button>
    </div>
  );
}

/** Said once after an old save was brought up to date: calm, dismissible, on the title and slot screens only. */
function MigrationToast() {
  const scr = screen.value;
  const note = migrationNotice.value;
  if (!note || (scr !== 'title' && scr !== 'slots' && scr !== 'bellfoot')) return null;
  return (
    <div class="updatetoast" role="status" data-testid="migration-toast">
      <span>{note}</span>
      <button class="primary small" data-testid="migration-ok" onClick={() => (migrationNotice.value = null)}>
        Got it
      </button>
    </div>
  );
}

function RunScreens() {
  const run = runView.value;
  if (!run) return <Title />;
  switch (run.phase) {
    case 'map':
      return <MapScreen />;
    case 'section':
      return <ActScreen />;
    case 'workbench':
      return <WorkbenchScreen key={nodeKey.value} />;
    case 'trader':
      return <TraderScreen key={nodeKey.value} />;
    case 'combat':
      return combat.value ? <CombatScreen key={nodeKey.value} /> : run.section ? <ActScreen /> : <MapScreen />;
    case 'reward':
      return run.pending?.kind === 'salvage' ? <SalvageScreen /> : run.pending?.kind === 'legendary' ? <LegendaryScreen /> : <RewardScreen />;
    case 'event':
      return <EventScreen />;
    case 'shop':
      return <ShopScreen />;
    case 'forge':
      return <ForgeScreen />;
    case 'oil':
      return run.section ? <OilRoomScreen /> : <OilScreen />;
    default:
      return <EndScreen />;
  }
}

/** A phone held upright (portrait and narrower than 600 px) gets the turn-sideways card instead of the game. */
function watchOrientation(): () => void {
  const mq = window.matchMedia('(orientation: portrait) and (max-width: 599px)');
  const set = (): void => {
    portrait.value = mq.matches;
  };
  set();
  mq.addEventListener('change', set);
  return () => mq.removeEventListener('change', set);
}

export function App() {
  const s = screen.value;
  useEffect(() => {
    const off = watchOrientation();
    // Escape closes the topmost overlay
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && closeTopOverlay()) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      off();
      window.removeEventListener('keydown', onKey);
    };
  }, []);
  let body;
  if (s === 'loading') body = <main class="title" aria-busy="true" />;
  else if (s === 'run') body = <RunScreens />;
  else if (s === 'combat' && combat.value) body = <CombatScreen />;
  else if (s === 'practice') body = <PracticePicker />;
  else if (s === 'slots') body = <SlotsScreen />;
  else if (s === 'bellfoot') body = <BellfootScreen />;
  else body = <Title />;
  const away = portrait.value;
  return (
    <>
      <div class="appwrap" inert={away}>
        {body}
        <BinViewer />
        <HowToScreen />
        <SettingsScreen />
        <GlossaryScreen />
        <UpdateToast />
        <MigrationToast />
      </div>
      {away && <PortraitCard />}
    </>
  );
}
