import { combat, screen } from '../app/controller';
import { CombatScreen } from './Combat';
import { GlossaryScreen } from './Glossary';
import { PracticePicker } from './Practice';
import { Title } from './Title';

export function App() {
  const s = screen.value;
  let body;
  if (s === 'loading') body = <main class="title" aria-busy="true" />;
  else if (s === 'combat' && combat.value) body = <CombatScreen />;
  else if (s === 'practice') body = <PracticePicker />;
  else body = <Title />;
  return (
    <>
      {body}
      <GlossaryScreen />
    </>
  );
}
