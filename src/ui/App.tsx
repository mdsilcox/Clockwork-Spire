import { combat, nodeKey, runView, screen } from '../app/controller';
import { CombatScreen } from './Combat';
import { EndScreen } from './End';
import { GlossaryScreen } from './Glossary';
import { BinViewer, MapScreen } from './Map';
import { EventScreen, ForgeScreen, OilScreen, RewardScreen, ShopScreen } from './Nodes';
import { PracticePicker } from './Practice';
import { SlotsScreen } from './Slots';
import { WorkshopScreen } from './Workshop';
import { Title } from './Title';

function RunScreens() {
  const run = runView.value;
  if (!run) return <Title />;
  switch (run.phase) {
    case 'map':
      return <MapScreen />;
    case 'combat':
      return combat.value ? <CombatScreen key={nodeKey.value} /> : <MapScreen />;
    case 'reward':
      return <RewardScreen />;
    case 'event':
      return <EventScreen />;
    case 'shop':
      return <ShopScreen />;
    case 'forge':
      return <ForgeScreen />;
    case 'oil':
      return <OilScreen />;
    default:
      return <EndScreen />;
  }
}

export function App() {
  const s = screen.value;
  let body;
  if (s === 'loading') body = <main class="title" aria-busy="true" />;
  else if (s === 'run') body = <RunScreens />;
  else if (s === 'combat' && combat.value) body = <CombatScreen />;
  else if (s === 'practice') body = <PracticePicker />;
  else if (s === 'slots') body = <SlotsScreen />;
  else if (s === 'workshop') body = <WorkshopScreen />;
  else body = <Title />;
  return (
    <>
      {body}
      <BinViewer />
      <GlossaryScreen />
    </>
  );
}
