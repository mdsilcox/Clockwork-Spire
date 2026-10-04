// Encounter pools per act (docs/content.md "Encounter pools"). 'easy' is act 1 floors 1-3; the others draw by tier.
// Twin Pistons and the Grand Orrery spawn their companions themselves (EnemyDef.onStart).
export interface Encounter {
  act: 1 | 2 | 3;
  tier: 'easy' | 'normal' | 'elite' | 'boss';
  /** content.md section 4's difficulty band for fight rooms: easy (first floors), middle, deep. Elites and bosses: none. */
  band?: 'easy' | 'middle' | 'deep';
  enemies: string[];
}

// `tier` keeps what the v1 run reads (act 1 floors 1 to 3 draw 'easy', every other fight room 'normal'); `band` is
// content.md's easy / middle / deep split, used by `encounterPool` for floor-aware draws.
const e = (act: 1 | 2 | 3, band: 'easy' | 'middle' | 'deep', ...enemies: string[]): Encounter => ({
  act,
  tier: act === 1 && band === 'easy' ? 'easy' : 'normal',
  band,
  enemies,
});
const x = (act: 1 | 2 | 3, tier: 'elite' | 'boss', ...enemies: string[]): Encounter => ({ act, tier, enemies });

export const ENCOUNTERS: Encounter[] = [
  // Act 1
  e(1, 'easy', 'rust-mite', 'rust-mite'),
  e(1, 'easy', 'cog-rat'),
  e(1, 'easy', 'spring-imp'),
  e(1, 'easy', 'oil-slick'),
  e(1, 'middle', 'brass-beetle'),
  e(1, 'middle', 'cog-rat', 'rust-mite'),
  e(1, 'middle', 'oil-slick', 'spring-imp'),
  e(1, 'middle', 'rust-mite', 'rust-mite', 'rust-mite'),
  e(1, 'deep', 'brass-beetle', 'rust-mite'),
  e(1, 'deep', 'brass-beetle', 'cog-rat'),
  e(1, 'deep', 'cog-rat', 'spring-imp', 'rust-mite'),
  x(1, 'elite', 'gearhound'),
  x(1, 'elite', 'tinpot-general'),
  x(1, 'boss', 'foreman'),
  // Act 2
  e(2, 'easy', 'steam-wraith'),
  e(2, 'easy', 'gauge-gremlin'),
  e(2, 'easy', 'pipe-snake'),
  e(2, 'easy', 'valve-crab'),
  e(2, 'middle', 'furnace-golem'),
  e(2, 'middle', 'pipe-snake', 'gauge-gremlin'),
  e(2, 'middle', 'steam-wraith', 'steam-wraith'),
  e(2, 'middle', 'valve-crab', 'pipe-snake'),
  e(2, 'deep', 'furnace-golem', 'gauge-gremlin'),
  e(2, 'deep', 'valve-crab', 'steam-wraith'),
  e(2, 'deep', 'furnace-golem', 'pipe-snake'),
  x(2, 'elite', 'pressure-warden'),
  x(2, 'elite', 'twin-pistons'),
  x(2, 'boss', 'boilermaker'),
  // Act 3
  e(3, 'easy', 'bell-ringer'),
  e(3, 'easy', 'chime-moth', 'chime-moth'),
  e(3, 'easy', 'echo-sprite'),
  e(3, 'easy', 'pendulum-blade'),
  e(3, 'middle', 'hour-knight'),
  e(3, 'middle', 'echo-sprite', 'chime-moth'),
  e(3, 'middle', 'bell-ringer', 'chime-moth'),
  e(3, 'deep', 'hour-knight', 'echo-sprite'),
  e(3, 'deep', 'pendulum-blade', 'chime-moth'),
  e(3, 'deep', 'bell-ringer', 'hour-knight'),
  x(3, 'elite', 'minute-warden'),
  x(3, 'elite', 'orrery'),
  x(3, 'boss', 'clockmaker'),
];

/**
 * The band a fight room on `floor` (1-based) draws from, with `floors` floors in the act (5 or 6; content.md section 4):
 * 5 floors: 1 to 2 easy, 3 middle, 4 to 5 deep; 6 floors: 1 to 2 easy, 3 to 4 middle, 5 to 6 deep.
 */
export function bandForFloor(floor: number, floors: number): 'easy' | 'middle' | 'deep' {
  if (floor <= 2) return 'easy';
  const deepFrom = floors >= 6 ? 5 : 4;
  return floor >= deepFrom ? 'deep' : 'middle';
}

/** Fight-room encounters for an act and band (not elites or bosses). */
export function encounterPool(act: 1 | 2 | 3, band: 'easy' | 'middle' | 'deep'): Encounter[] {
  return ENCOUNTERS.filter((en) => en.act === act && en.band === band);
}
