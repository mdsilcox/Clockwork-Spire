import { combat, screen } from '../app/controller';
import { CombatScreen } from './Combat';
import { Title } from './Title';

export function App() {
  const s = screen.value;
  if (s === 'loading') return <main class="title" aria-busy="true" />;
  if (s === 'combat' && combat.value) return <CombatScreen />;
  return <Title />;
}
