// Chassis (docs/content.md "Chassis starting bins"; rules 5.4). B3 CONTRACT: ids and bins fixed.
// Passives are combat hooks implemented by the combat-hooks lane via CreateCombatOpts.chassis.
// Unlock rules are applied by the B4 meta lane.

export interface ChassisDef {
  id: string;
  name: string;
  startingBin: string[];
  passive: string;
  unlock: string; // human-readable unlock rule (B4)
}

const list: ChassisDef[] = [
  {
    id: 'tinker',
    name: 'Tinker',
    startingBin: ['spur', 'spur', 'spur', 'escapement', 'escapement', 'escapement', 'idler', 'coil'],
    passive: 'The first time each combat you replace a part, the placement is refunded.',
    unlock: 'Unlocked from the start.',
  },
  {
    id: 'stoker',
    name: 'Stoker',
    startingBin: ['boiler', 'boiler', 'piston', 'piston', 'escapement', 'escapement', 'safety-valve', 'spur'],
    passive: 'Start every combat with 6 Pressure.',
    unlock: 'Reach act 2, or 150 Brass.',
  },
  {
    id: 'horologist',
    name: 'Horologist',
    startingBin: ['cam', 'cam', 'pendulum', 'escapement', 'escapement', 'metronome', 'spur', 'anchor'],
    passive: 'Your first turn of each combat has 1 extra tick.',
    unlock: 'Defeat the act 2 boss, or 300 Brass.',
  },
];

export const CHASSIS: Record<string, ChassisDef> = Object.fromEntries(list.map((d) => [d.id, d]));

export function chassisDef(id: string): ChassisDef {
  const d = CHASSIS[id];
  if (!d) throw new Error(`Unknown chassis: ${id}`);
  return d;
}
