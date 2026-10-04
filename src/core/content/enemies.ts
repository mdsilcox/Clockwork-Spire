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
  { id: 'rust-mite', name: 'Rust Mite', act: 1, tier: 'normal', hp: 14, pattern: [attack(5), attack(5), rust()] },
  { id: 'cog-rat', name: 'Cog Rat', act: 1, tier: 'normal', hp: 22, pattern: [attack(4, 2), shell(5)] },
  { id: 'brass-beetle', name: 'Brass Beetle', act: 1, tier: 'normal', hp: 30, pattern: [shell(8), attack(9)] },
  { id: 'oil-slick', name: 'Oil Slick', act: 1, tier: 'normal', hp: 24, pattern: [corroded(2), attack(6)] },
  {
    id: 'spring-imp',
    name: 'Spring Imp',
    act: 1,
    tier: 'normal',
    hp: 18,
    pattern: [attack(3)],
    intentFor: (e): Intent => {
      const amount = 3 + 2 * e.step;
      return { kind: 'attack', amount, label: attackLabel(amount) };
    },
  },
  {
    id: 'gearhound',
    name: 'Gearhound',
    act: 1,
    tier: 'elite',
    hp: 60,
    pattern: [attack(8, 2), { kind: 'sabotage', sabotage: 'magnetize', label: 'Magnetizes a part' }, attack(14)],
  },
  {
    id: 'tinpot-general',
    name: 'Tinpot General',
    act: 1,
    tier: 'elite',
    hp: 55,
    pattern: [{ kind: 'buff', amount: 2, label: 'Buffs allies +2 attack' }, attack(10)],
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
    hp: 150,
    pattern: [attack(10), jam({ alsoShell: 12, label: 'Jams the Mainspring, Shell 12' }), attack(6, 3)],
    summonAtHalf: 'cog-rat',
  },

  // ---------- Act 2: the Steamworks ----------
  { id: 'steam-wraith', name: 'Steam Wraith', act: 2, tier: 'normal', hp: 38, pattern: [attack(11), corroded(2)] },
  { id: 'valve-crab', name: 'Valve Crab', act: 2, tier: 'normal', hp: 45, pattern: [shell(15), attack(13)] },
  {
    id: 'furnace-golem',
    name: 'Furnace Golem',
    act: 2,
    tier: 'normal',
    hp: 55,
    pattern: [{ kind: 'charge', label: 'Charging up' }, attack(24)],
  },
  { id: 'pipe-snake', name: 'Pipe Snake', act: 2, tier: 'normal', hp: 35, pattern: [attack(5, 3), drain(5)] },
  { id: 'gauge-gremlin', name: 'Gauge Gremlin', act: 2, tier: 'normal', hp: 30, pattern: [rust(2), attack(8)] },
  {
    id: 'pressure-warden',
    name: 'Pressure Warden',
    act: 2,
    tier: 'elite',
    hp: 100,
    pattern: [attack(16)],
    onTurn: (c, idx, events) => gainShell(c, idx, Math.floor(c.pressure / 2), events),
  },
  {
    // One def, two bodies: onStart spawns the twin. role 0 attacks first, role 1 shells first.
    id: 'twin-pistons',
    name: 'Twin Pistons',
    act: 2,
    tier: 'elite',
    hp: 55,
    pattern: [attack(12), shell(10)],
    intentFor: (e): Intent => {
      const k = (e.step + (e.mem.role ?? 0)) % 2;
      return k === 0 ? { ...attack(12) } : { ...shell(10) };
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
        addStrength(c, idx, 6, events);
      }
    },
  },
  {
    id: 'boilermaker',
    name: 'The Boilermaker Queen',
    act: 2,
    tier: 'boss',
    hp: 240,
    pattern: [attack(12), drain(6), attack(10)],
    summonAtHalf: 'steam-wraith',
    onStart: (c, idx) => {
      c.enemies[idx].mem.heat = 0;
    },
    // Heat builds each turn and Drain feeds it; at 20 the next intent is the big hit and the heat is spent.
    intentFor: (e): Intent => {
      if ((e.mem.heat ?? 0) >= 20) return { ...attack(30), label: 'Unleashes Attack 30' };
      const pat = [attack(12), drain(6), attack(10)];
      return { ...pat[e.step % pat.length] };
    },
    onTurn: (c, idx, events) => {
      const e = c.enemies[idx];
      if (e.intent.label.startsWith('Unleashes')) e.mem.heat = 0;
      else e.mem.heat = (e.mem.heat ?? 0) + 5;
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
    pattern: [attack(14), jam({ alsoAttack: 6, label: 'Jams the Mainspring, Attack 6' })],
  },
  { id: 'chime-moth', name: 'Chime Moth', act: 3, tier: 'normal', hp: 32, pattern: [attack(4, 2), shell(8)] },
  { id: 'hour-knight', name: 'Hour Hand Knight', act: 3, tier: 'normal', hp: 80, pattern: [attack(12), shell(12), attack(20)] },
  {
    id: 'echo-sprite',
    name: 'Echo Sprite',
    act: 3,
    tier: 'normal',
    hp: 40,
    pattern: [attack(6)],
    intentFor: (_e, c): Intent => {
      const amount = Math.max(6, strongestContribution(c));
      return { kind: 'attack', amount, label: attackLabel(amount) };
    },
  },
  {
    id: 'pendulum-blade',
    name: 'Pendulum Blade',
    act: 3,
    tier: 'normal',
    hp: 70,
    pattern: [attack(6)],
    intentFor: (e): Intent => {
      const amount = 6 + 3 * (e.step % 5); // 6, 9, 12, 15, 18, then back to 6
      return { kind: 'attack', amount, label: attackLabel(amount) };
    },
  },
  {
    id: 'minute-warden',
    name: 'Minute Warden',
    act: 3,
    tier: 'elite',
    hp: 160,
    pattern: [attack(15)],
    intentFor: (e, c): Intent => {
      if (e.step % 2 === 1) return { ...attack(15) };
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
    pattern: [attack(18)],
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
    pattern: [attack(12), attack(14)],
    // Rewind (rules 4.4) is B3: it will run from a hook at the start of his turn.
    phases: [
      { hp: 110, line: 'Tick. Every hour has its place.', pattern: [attack(12), attack(14)] },
      { hp: 130, line: 'Tock. Do not stop the hour.', pattern: [attack(16), attack(18)] },
      {
        hp: 150,
        line: 'Midnight. Again, and again.',
        pattern: [attack(20), jam({ alsoAttack: 22, label: 'Jams the Mainspring, Attack 22' })],
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
