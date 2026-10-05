// Permanent upgrades on the Workshop bench (docs/rules.md 5.3). B4 CONTRACT: ids fixed; numbers may be tuned
// by the meta-balance lane (and docs/rules.md updated to match).

export interface UpgradeDef {
  id: string;
  name: string;
  costs: number[]; // one entry per level
  text: string; // effect per level, shown on the bench
}

const list: UpgradeDef[] = [
  { id: 'frame', name: 'Reinforced Frame', costs: [40, 60, 80, 100, 120], text: '+5 max HP per level.' },
  { id: 'scrap', name: 'Spare Scrap', costs: [30, 50, 70], text: '+25 starting Scrap per level.' },
  { id: 'bearings', name: 'Oiled Bearings', costs: [50, 90, 140], text: 'Start each run with one more starting part upgraded per level.' },
  { id: 'toolbelt', name: 'Tool Belt', costs: [250], text: 'Hand size 4.' },
  { id: 'notes', name: "Inventor's Notes", costs: [80, 160], text: 'Level 1: part rewards offer 4 choices. Level 2: the first elite each act drops an extra blueprint.' },
  { id: 'secondwind', name: 'Second Wind', costs: [200], text: 'Once per run, survive a killing blow at 1 HP.' },
  { id: 'charm', name: 'Lucky Charm', costs: [120], text: 'Start each run with a random common trinket.' },
];

export const UPGRADES: Record<string, UpgradeDef> = Object.fromEntries(list.map((d) => [d.id, d]));
export const UPGRADE_ORDER: string[] = list.map((d) => d.id);
