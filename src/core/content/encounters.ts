// Encounter pools per act (docs/content.md "Encounter pools"). 'easy' is act 1 floors 1-3; the others draw by tier.
// Twin Pistons and the Grand Orrery spawn their companions themselves (EnemyDef.onStart).
export interface Encounter {
  act: 1 | 2 | 3;
  tier: 'easy' | 'normal' | 'elite' | 'boss';
  enemies: string[];
}

const e = (act: 1 | 2 | 3, tier: Encounter['tier'], ...enemies: string[]): Encounter => ({ act, tier, enemies });

export const ENCOUNTERS: Encounter[] = [
  // Act 1
  e(1, 'easy', 'rust-mite', 'rust-mite'),
  e(1, 'easy', 'cog-rat'),
  e(1, 'easy', 'spring-imp'),
  e(1, 'easy', 'oil-slick'),
  e(1, 'normal', 'brass-beetle'),
  e(1, 'normal', 'cog-rat', 'rust-mite'),
  e(1, 'normal', 'oil-slick', 'spring-imp'),
  e(1, 'normal', 'rust-mite', 'rust-mite', 'rust-mite'),
  e(1, 'normal', 'brass-beetle', 'rust-mite'),
  e(1, 'elite', 'gearhound'),
  e(1, 'elite', 'tinpot-general'),
  e(1, 'boss', 'foreman'),
  // Act 2
  e(2, 'normal', 'steam-wraith'),
  e(2, 'normal', 'valve-crab'),
  e(2, 'normal', 'furnace-golem'),
  e(2, 'normal', 'pipe-snake', 'gauge-gremlin'),
  e(2, 'normal', 'steam-wraith', 'steam-wraith'),
  e(2, 'normal', 'valve-crab', 'pipe-snake'),
  e(2, 'elite', 'pressure-warden'),
  e(2, 'elite', 'twin-pistons'),
  e(2, 'boss', 'boilermaker'),
  // Act 3
  e(3, 'normal', 'bell-ringer'),
  e(3, 'normal', 'chime-moth', 'chime-moth'),
  e(3, 'normal', 'hour-knight'),
  e(3, 'normal', 'echo-sprite', 'chime-moth'),
  e(3, 'normal', 'pendulum-blade'),
  e(3, 'normal', 'hour-knight', 'echo-sprite'),
  e(3, 'elite', 'minute-warden'),
  e(3, 'elite', 'orrery'),
  e(3, 'boss', 'clockmaker'),
];
