// Enemy registry: all 24 enemies of docs/content.md plus the dummy, the tutorial enemy and summon-only moons.
// Intent patterns are data; behaviors that need state use intentFor / hooks (defs.ts). Sabotage targets are
// chosen by enemy.ts when an intent is picked.
import type { EnemyDef, IntentStep } from '../defs';
import { addStrength, attackLabel, gainShell, healEnemy, strongestCell, strongestContribution, summonEnemy } from '../enemy';
import type { Intent } from '../types';

const attack = (amount: number, hits = 1): IntentStep => ({ kind: 'attack', amount, hits: hits > 1 ? hits : undefined, label: attackLabel(amount, hits) });
const shell = (amount: number): IntentStep => ({ kind: 'defend', amount, label: `Shell ${amount}` });
const corroded = (amount: number): IntentStep => ({ kind: 'debuff', amount, status: 'corroded', label: `Corroded ${amount}` });
const rust = (count = 1): IntentStep => ({
  kind: 'sabotage',
  sabotage: 'rust',
  amount: count > 1 ? count : undefined,
  label: count > 1 ? `Rusts ${count} parts` : 'Rusts a part',
});
const jam = (extra: Partial<IntentStep> = {}): IntentStep => ({ kind: 'sabotage', sabotage: 'jam', label: 'Jams the Mainspring', ...extra });
const drain = (amount: number): IntentStep => ({ kind: 'sabotage', sabotage: 'drain', amount, label: `Drains ${amount} Pressure` });

const list: EnemyDef[] = [
  { id: 'dummy', name: 'Practice Dummy', act: 1, tier: 'normal', hp: 999, pattern: [{ kind: 'special', label: 'Waits' }] },
  {
    id: 'tutorial-automaton',
    name: 'Tutorial Automaton',
    act: 1,
    tier: 'normal',
    hp: 20,
    pattern: [attack(3), attack(3), rust(), attack(4)],
  },

  // ---------- Act 1: the Gearworks ----------
  { id: 'rust-mite', name: 'Rust Mite', act: 1, tier: 'normal', hp: 18, pattern: [attack(7), attack(7), rust()] },
  { id: 'cog-rat', name: 'Cog Rat', act: 1, tier: 'normal', hp: 26, pattern: [attack(5, 2), shell(6)] },
  { id: 'brass-beetle', name: 'Brass Beetle', act: 1, tier: 'normal', hp: 34, pattern: [attack(12), shell(10)] },
  { id: 'oil-slick', name: 'Oil Slick', act: 1, tier: 'normal', hp: 28, pattern: [attack(9), corroded(2)] },
  {
    id: 'spring-imp',
    name: 'Spring Imp',
    act: 1,
    tier: 'normal',
    hp: 20,
    pattern: [attack(4)],
    intentFor: (e): Intent => {
      const amount = 4 + 3 * e.step;
      return { kind: 'attack', amount, label: attackLabel(amount) };
    },
  },
  {
    id: 'gearhound',
    name: 'Gearhound',
    act: 1,
    tier: 'elite',
    hp: 70,
    pattern: [attack(11, 2), { kind: 'sabotage', sabotage: 'magnetize', label: 'Magnetizes a part' }, attack(20)],
  },
  {
    id: 'tinpot-general',
    name: 'Tinpot General',
    act: 1,
    tier: 'elite',
    hp: 65,
    pattern: [{ kind: 'buff', amount: 3, label: 'Buffs allies +3 attack' }, attack(13)],
    onStart: (c) => {
      summonEnemy(c, 'rust-mite', null);
      summonEnemy(c, 'rust-mite', null);
    },
  },
  {
    id: 'foreman',
    name: 'The Foreman',
    act: 1,
    tier: 'boss',
    hp: 170,
    pattern: [attack(16), jam({ alsoShell: 14, label: 'Jams the Mainspring, Shell 14' }), attack(10, 3)],
    summonAtHalf: 'cog-rat',
  },

  // ---------- Act 2: the Steamworks ----------
  { id: 'steam-wraith', name: 'Steam Wraith', act: 2, tier: 'normal', hp: 42, pattern: [attack(12), corroded(2)] },
  { id: 'valve-crab', name: 'Valve Crab', act: 2, tier: 'normal', hp: 50, pattern: [attack(14), shell(15)] },
  {
    id: 'furnace-golem',
    name: 'Furnace Golem',
    act: 2,
    tier: 'normal',
    hp: 60,
    pattern: [{ kind: 'charge', label: 'Charging up' }, attack(26)],
  },
  { id: 'pipe-snake', name: 'Pipe Snake', act: 2, tier: 'normal', hp: 35, pattern: [attack(5, 3), drain(5)] },
  { id: 'gauge-gremlin', name: 'Gauge Gremlin', act: 2, tier: 'normal', hp: 30, pattern: [rust(2), attack(9)] },
  {
    id: 'pressure-warden',
    name: 'Pressure Warden',
    act: 2,
    tier: 'elite',
    hp: 100,
    pattern: [attack(18)],
    onTurn: (c, idx, events) => gainShell(c, idx, Math.floor(c.pressure / 2), events),
  },
  {
    // One def, two bodies: onStart spawns the twin. role 0 attacks first, role 1 shells first.
    id: 'twin-pistons',
    name: 'Twin Pistons',
    act: 2,
    tier: 'elite',
    hp: 65,
    pattern: [attack(19), shell(10)],
    intentFor: (e): Intent => {
      const k = (e.step + (e.mem.role ?? 0)) % 2;
      return k === 0 ? { ...attack(19) } : { ...shell(10) };
    },
    onStart: (c, idx) => {
      c.enemies[idx].mem.role = 0;
      summonEnemy(c, 'twin-pistons', null, { role: 1 });
    },
    afterMachine: (c, idx, events) => {
      const e = c.enemies[idx];
      if (e.mem.enraged) return;
      if (c.enemies.some((o, j) => j !== idx && o.defId === 'twin-pistons' && o.hp <= 0)) {
        e.mem.enraged = 1;
        addStrength(c, idx, 8, events);
      }
    },
  },
  {
    id: 'boilermaker',
    name: 'The Boilermaker Queen',
    act: 2,
    tier: 'boss',
    hp: 260,
    pattern: [attack(22), drain(8), attack(20)],
    summonAtHalf: 'steam-wraith',
    onStart: (c, idx) => {
      c.enemies[idx].mem.heat = 0;
    },
    // Heat builds each turn and Drain feeds it; at 20 the next intent is the big hit and the heat is spent.
    intentFor: (e): Intent => {
      if ((e.mem.heat ?? 0) >= 20) return { ...attack(40), label: 'Unleashes Attack 40' };
      const pat = [attack(22), drain(8), attack(20)];
      return { ...pat[e.step % pat.length] };
    },
    onTurn: (c, idx, events) => {
      const e = c.enemies[idx];
      if (e.intent.label.startsWith('Unleashes')) e.mem.heat = 0;
      else e.mem.heat = (e.mem.heat ?? 0) + 6;
      events.push({ kind: 'buff', tick: 0, step: 0, target: idx, note: 'heat', amount: e.mem.heat });
    },
  },

  // ---------- Act 3: the Belfry ----------
  {
    id: 'bell-ringer',
    name: 'Bell Ringer',
    act: 3,
    tier: 'normal',
    hp: 60,
    pattern: [attack(18), jam({ alsoAttack: 10, label: 'Jams the Mainspring, Attack 10' })],
  },
  { id: 'chime-moth', name: 'Chime Moth', act: 3, tier: 'normal', hp: 36, pattern: [attack(6, 2), shell(8)] },
  { id: 'hour-knight', name: 'Hour Hand Knight', act: 3, tier: 'normal', hp: 80, pattern: [attack(16), shell(14), attack(24)] },
  {
    id: 'echo-sprite',
    name: 'Echo Sprite',
    act: 3,
    tier: 'normal',
    hp: 40,
    pattern: [attack(6)],
    intentFor: (_e, c): Intent => {
      const amount = Math.max(8, strongestContribution(c));
      return { kind: 'attack', amount, label: attackLabel(amount) };
    },
  },
  {
    id: 'pendulum-blade',
    name: 'Pendulum Blade',
    act: 3,
    tier: 'normal',
    hp: 80,
    pattern: [attack(8)],
    intentFor: (e): Intent => {
      const amount = 8 + 4 * (e.step % 5); // 8, 12, 16, 20, 24, then back to 8
      return { kind: 'attack', amount, label: attackLabel(amount) };
    },
  },
  {
    id: 'minute-warden',
    name: 'Minute Warden',
    act: 3,
    tier: 'elite',
    hp: 170,
    pattern: [attack(28)],
    intentFor: (e, c): Intent => {
      if (e.step % 2 === 1) return { ...attack(28) };
      const target = strongestCell(c);
      const step = rust();
      return { ...step, label: 'Rusts your strongest part', target: target >= 0 ? target : undefined };
    },
    onTurn: (c, idx, events) => healEnemy(c, idx, 10, events),
  },
  {
    id: 'orrery',
    name: 'Grand Orrery',
    act: 3,
    tier: 'elite',
    hp: 150,
    pattern: [attack(24)],
    onStart: (c) => {
      for (let i = 0; i < 3; i++) summonEnemy(c, 'orrery-moon', null);
    },
    onTurn: (c, idx, events) => {
      const moons = c.enemies.filter((o) => o.defId === 'orrery-moon' && o.hp > 0).length;
      gainShell(c, idx, 6 * moons, events);
    },
  },
  {
    id: 'orrery-moon',
    name: 'Moon',
    act: 3,
    tier: 'normal',
    hp: 20,
    summonOnly: true,
    pattern: [{ kind: 'special', label: 'Orbits the Orrery' }],
  },
  {
    id: 'clockmaker',
    name: 'The Clockmaker',
    act: 3,
    tier: 'boss',
    hp: 110,
    pattern: [attack(20), attack(24)],
    rewinds: true, // Rewind: enemy.ts rewind(); phase 3 also Jams on alternate turns there
    phases: [
      { hp: 110, line: 'Tick. Every hour has its place.', pattern: [attack(20), attack(24)] },
      { hp: 130, line: 'Tock. Do not stop the hour.', pattern: [attack(26), attack(30)] },
      {
        hp: 150,
        line: 'Midnight. Again, and again.',
        pattern: [attack(32), attack(36)],
      },
    ],
  },
];

export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries(list.map((d) => [d.id, d]));

export function enemyDef(id: string): EnemyDef {
  const d = ENEMIES[id];
  if (!d) throw new Error(`Unknown enemy: ${id}`);
  return d;
}

/** Test support: register an extra enemy (used by testkit only). */
export function registerEnemy(def: EnemyDef): void {
  ENEMIES[def.id] = def;
}
