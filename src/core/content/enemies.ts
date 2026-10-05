// Enemy registry (docs/content.md section 3): the 15 regulars and 6 elites are frames (a core plus parts, B7), the
// three wardens stay v1 (legacy pattern and hooks) until B9, plus the dummy and the tutorial enemy. A frame def's
// `hp` equals `frame.core`; its legacy `pattern` is only the core's Bump and is ignored by the engine.
// `escalateResetAt` is the last amount the part performs before it resets to its base (Imp 6, Blade 24).
// Action shapes the engine reads: Dome's shell uses `pct` (percent of your Pressure); Echo Mouth's `amount` is the
// nominal 10 (the engine clamps your last biggest hit to 6..18); the Minute Needle rusts your strongest part.
import type { EnemyDef, EnemyPartDef, FrameDef, IntentStep, Passive } from '../defs';
import { attackLabel } from '../enemy';
import type { ActionDef, Cadence, Intent, Rarity } from '../types';

const attack = (amount: number, hits = 1): IntentStep => ({ kind: 'attack', amount, hits: hits > 1 ? hits : undefined, label: attackLabel(amount, hits) });
const jam = (extra: Partial<IntentStep> = {}): IntentStep => ({ kind: 'sabotage', sabotage: 'jam', label: 'Jams the Mainspring', ...extra });
const drain = (amount: number): IntentStep => ({ kind: 'sabotage', sabotage: 'drain', amount, label: `Drains ${amount} Pressure` });

// ---------- frame data helpers ----------
const hit = (amount: number, hits?: number): ActionDef => (hits && hits > 1 ? { kind: 'attack', amount, hits } : { kind: 'attack', amount });
const pierce = (amount: number, hits?: number): ActionDef => (hits && hits > 1 ? { kind: 'pierce', amount, hits } : { kind: 'pierce', amount });
const corrode = (pct: number): ActionDef => ({ kind: 'corrode', pct });
const shell = (amount: number): ActionDef => ({ kind: 'shell', amount, target: 'self' });
const rustParts = (count: number): ActionDef => ({ kind: 'rust', count });

const R: Record<'C' | 'U' | 'R' | 'M', Rarity> = { C: 'common', U: 'uncommon', R: 'rare', M: 'masterwork' };

interface PartSpec {
  id: string;
  name: string;
  hp: number;
  r: keyof typeof R;
  cadence: Cadence;
  actions?: ActionDef[];
  passive?: Passive;
  salvage: string | null;
  anchor: string;
  key?: boolean;
  escalate?: number;
  escalateResetAt?: number;
}

const part = (s: PartSpec): EnemyPartDef => ({
  id: s.id,
  name: s.name,
  hp: s.hp,
  rarity: R[s.r],
  actions: s.actions ?? [],
  passive: s.passive,
  cadence: s.cadence,
  escalate: s.escalate,
  escalateResetAt: s.escalateResetAt,
  salvage: s.salvage,
  keystone: s.key ? true : undefined,
  anchor: s.anchor,
});

interface FrameSpec {
  core: number;
  bump: number;
  scrap: number;
  sealed?: boolean;
  punishes: FrameDef['punishes'];
  bestiary: string;
  parts: EnemyPartDef[];
  startSummons?: string[];
}

const machine = (id: string, name: string, act: 1 | 2 | 3, tier: 'normal' | 'elite', f: FrameSpec, extra: Partial<EnemyDef> = {}): EnemyDef => ({
  id,
  name,
  act,
  tier,
  hp: f.core,
  pattern: [attack(f.bump)],
  frame: {
    core: f.core,
    coreAction: hit(f.bump),
    sealed: f.sealed ? true : undefined,
    parts: f.parts,
    scrap: f.scrap,
    punishes: f.punishes,
    bestiary: f.bestiary,
    startSummons: f.startSummons,
  },
  ...extra,
});

const odd: Cadence = 'odd';
const even: Cadence = 'even';
const every: Cadence = 'every';
const passive: Cadence = 'passive';
const of3 = (...at: number[]): Cadence => ({ of: 3, at });

const list: EnemyDef[] = [
  { id: 'dummy', name: 'Practice Dummy', act: 1, tier: 'normal', hp: 999, pattern: [{ kind: 'special', label: 'Waits' }] },
  {
    id: 'tutorial-automaton',
    name: 'Tutorial Automaton',
    act: 1,
    tier: 'normal',
    hp: 20,
    pattern: [attack(3), attack(3), { kind: 'sabotage', sabotage: 'rust', label: 'Rusts a part' }, attack(4)],
  },

  // ---------- Act 1: the Gearworks ----------
  machine('rust-mite', 'Rust Mite', 1, 'normal', {
    core: 11,
    bump: 3,
    scrap: 3,
    punishes: ['plating', 'slow'],
    bestiary: 'Often in pairs. The Pincers have 4 HP, one Spur; then the Gland, with an Oil Can nearby.',
    parts: [
      part({ id: 'mite-pincers', name: 'Pincers', hp: 4, r: 'C', cadence: of3(1, 2), actions: [pierce(5)], salvage: 'pry-bar', anchor: 'the front claws' }),
      part({ id: 'mite-gland', name: 'Rust Gland', hp: 3, r: 'C', cadence: of3(3), actions: [rustParts(1)], salvage: 'oil-can', anchor: 'the swollen sac on its back' }),
    ],
  }),
  machine('cog-rat', 'Cog Rat', 1, 'normal', {
    core: 15,
    bump: 3,
    scrap: 3,
    punishes: ['slow', 'burst'],
    bestiary: 'The Tail first, or its Jaw grows every turn. Then the Jaw.',
    parts: [
      part({ id: 'rat-jaw', name: 'Gnawing Jaw', hp: 5, r: 'C', cadence: odd, actions: [hit(5, 2)], salvage: 'spur', anchor: 'the jaw' }),
      part({ id: 'rat-plate', name: 'Tin Plate', hp: 3, r: 'C', cadence: even, actions: [shell(6)], salvage: 'escapement', anchor: 'the patch of tin on its flank' }),
      part({ id: 'rat-tail', name: 'Gear Tail', hp: 3, r: 'C', cadence: passive, passive: { kind: 'ratchet', x: 1 }, salvage: 'idler', anchor: 'the cog on its tail' }),
    ],
  }),
  machine('brass-beetle', 'Brass Beetle', 1, 'normal', {
    core: 20,
    bump: 4,
    scrap: 4,
    punishes: ['burst'],
    bestiary: 'The Carapace halves what the core takes. Drill it, or break the Carapace first.',
    parts: [
      part({ id: 'beetle-mandibles', name: 'Mandibles', hp: 5, r: 'U', cadence: odd, actions: [hit(12)], salvage: 'bevel', anchor: 'the mandibles' }),
      part({ id: 'beetle-shell', name: 'Shell Plate', hp: 5, r: 'C', cadence: even, actions: [shell(10)], salvage: 'leaf', anchor: 'the underside plate' }),
      part({ id: 'beetle-carapace', name: 'Carapace', hp: 4, r: 'C', cadence: passive, passive: { kind: 'bulwark' }, salvage: null, anchor: 'the domed back' }),
    ],
  }),
  machine('oil-slick', 'Oil Slick', 1, 'normal', {
    core: 17,
    bump: 3,
    scrap: 4,
    punishes: ['plating'],
    bestiary: 'The Nozzle strips half your Plating just before the Spitter fires. Break the Nozzle first.',
    parts: [
      part({
        id: 'slick-nozzle',
        name: 'Drip Nozzle',
        hp: 5,
        r: 'C',
        cadence: odd,
        actions: [corrode(50), { kind: 'status', status: 'corroded', amount: 2 }],
        salvage: 'toggle',
        anchor: 'the dripping spout',
      }),
      part({ id: 'slick-spitter', name: 'Spitter', hp: 6, r: 'C', cadence: odd, actions: [hit(9)], salvage: 'cam', anchor: 'the open mouth' }),
    ],
  }),
  machine('spring-imp', 'Spring Imp', 1, 'normal', {
    core: 12,
    bump: 3,
    scrap: 3,
    punishes: ['plating', 'slow'],
    bestiary: 'The Tail Pierces, a little more each time, and the Key ratchets. Both die first.',
    parts: [
      part({
        id: 'imp-tail',
        name: 'Coil Tail',
        hp: 5,
        r: 'C',
        cadence: every,
        actions: [pierce(4)],
        escalate: 1,
        escalateResetAt: 6,
        salvage: 'coil',
        anchor: 'the coiled tail',
      }),
      part({ id: 'imp-key', name: 'Wind-up Key', hp: 3, r: 'U', cadence: passive, passive: { kind: 'ratchet', x: 1 }, salvage: 'ratchet', anchor: 'the key in its back' }),
    ],
  }),

  // ---------- Act 1: elites and the Foreman ----------
  machine('gearhound', 'Gearhound', 1, 'elite', {
    core: 26,
    bump: 6,
    scrap: 14,
    sealed: true,
    punishes: ['plating', 'slow'],
    bestiary: 'The Haunch Pierces on turn 3: break it first, then the Fangs. Sealed until both fall.',
    parts: [
      part({ id: 'hound-fangs', name: 'Fangs', hp: 14, r: 'U', cadence: of3(1), actions: [corrode(50), hit(11, 2)], salvage: 'crown', key: true, anchor: 'the open jaws' }),
      part({ id: 'hound-snout', name: 'Magnet Snout', hp: 10, r: 'U', cadence: of3(2), actions: [{ kind: 'magnetize', count: 1 }], salvage: 'wedge', anchor: 'the nose' }),
      part({ id: 'hound-haunch', name: 'Haunch Piston', hp: 20, r: 'R', cadence: of3(3), actions: [pierce(16)], salvage: 'volute', key: true, anchor: 'the hind leg' }),
    ],
  }),
  machine('tinpot-general', 'Tinpot General', 1, 'elite', {
    core: 20,
    bump: 5,
    scrap: 14,
    sealed: true,
    punishes: ['burst', 'plating'],
    bestiary: 'The Bugle buffs everyone: break it first, then the Sabre. An Auger ignores the Tin Hat.',
    parts: [
      part({ id: 'tinpot-horn', name: 'Barracks Horn', hp: 9, r: 'U', cadence: 'once', actions: [{ kind: 'summon', summon: 'rust-mite', count: 2 }], salvage: 'spire-key', anchor: 'the horn at its hip' }),
      part({ id: 'tinpot-bugle', name: 'Bugle', hp: 10, r: 'U', cadence: every, actions: [{ kind: 'buff', amount: 3, target: 'allies' }], salvage: 'recoil', key: true, anchor: 'the bugle in its hand' }),
      part({ id: 'tinpot-sabre', name: 'Sabre', hp: 14, r: 'U', cadence: every, actions: [corrode(75), hit(13)], salvage: 'trap', key: true, anchor: 'the sabre arm' }),
      part({ id: 'tinpot-hat', name: 'Tin Hat', hp: 12, r: 'R', cadence: passive, passive: { kind: 'governor', cap: 10 }, salvage: 'governor', anchor: 'the dented hat' }),
    ],
  }),
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
  machine('steam-wraith', 'Steam Wraith', 2, 'normal', {
    core: 25,
    bump: 4,
    scrap: 4,
    punishes: ['plating'],
    bestiary: 'Its Siphon heals it by the Plating it eats. Break the Claw and Plating is free again.',
    parts: [
      part({ id: 'wraith-claw', name: 'Hollow Claw', hp: 11, r: 'C', cadence: odd, actions: [{ kind: 'siphon', amount: 12 }], salvage: 'whistle', anchor: 'the long claw' }),
      part({ id: 'wraith-vent', name: 'Chill Vent', hp: 6, r: 'U', cadence: even, actions: [{ kind: 'status', status: 'corroded', amount: 2 }], salvage: 'kettle', anchor: 'the vent in its chest' }),
    ],
  }),
  machine('valve-crab', 'Valve Crab', 2, 'normal', {
    core: 30,
    bump: 4,
    scrap: 5,
    punishes: ['burst'],
    bestiary: 'The Valve shells for 15 and swallows a Coil. Break it, or strike on the odd turns. A Pry Bar finds it.',
    parts: [
      part({ id: 'crab-pincer', name: 'Pincer', hp: 11, r: 'C', cadence: odd, actions: [corrode(50), hit(14)], salvage: 'piston', anchor: 'the big pincer' }),
      part({ id: 'crab-valve', name: 'Shell Valve', hp: 9, r: 'C', cadence: even, actions: [shell(15)], salvage: 'safety-valve', anchor: 'the brass valve on its back' }),
    ],
  }),
  machine('furnace-golem', 'Furnace Golem', 2, 'normal', {
    core: 36,
    bump: 5,
    scrap: 5,
    punishes: ['plating'],
    bestiary: 'The Heart counts down to a Pierce. Break it inside three turns, or Wedge it to pause the count.',
    parts: [
      part({ id: 'golem-heart', name: 'Furnace Heart', hp: 14, r: 'U', cadence: { countdown: 3 }, actions: [pierce(22)], salvage: 'firebox', anchor: 'the glowing door in its chest' }),
      part({ id: 'golem-fist', name: 'Slag Fist', hp: 10, r: 'C', cadence: every, actions: [hit(6)], salvage: 'boiler', anchor: 'the slag fist' }),
    ],
  }),
  machine('pipe-snake', 'Pipe Snake', 2, 'normal', {
    core: 21,
    bump: 3,
    scrap: 4,
    punishes: ['pressure', 'plating'],
    bestiary: 'The Coil drains your Pressure and the Fangs Pierce. Coil first if you play Steam.',
    parts: [
      part({ id: 'snake-fangs', name: 'Fangs', hp: 8, r: 'C', cadence: odd, actions: [pierce(4, 3)], salvage: 'cold-chisel', anchor: 'the forked head' }),
      part({ id: 'snake-coil', name: 'Drain Coil', hp: 6, r: 'U', cadence: even, actions: [{ kind: 'drain', amount: 5 }], salvage: 'condenser', anchor: 'the coiled tail pipe' }),
    ],
  }),
  machine('gauge-gremlin', 'Gauge Gremlin', 2, 'normal', {
    core: 18,
    bump: 3,
    scrap: 4,
    punishes: ['slow', 'plating'],
    bestiary: 'The Wrench Hand rusts two parts and drops a Spire Key. Break it first, with an Oil Can nearby.',
    parts: [
      part({ id: 'gremlin-wrench', name: 'Wrench Hand', hp: 6, r: 'C', cadence: odd, actions: [rustParts(2)], salvage: 'spire-key', anchor: 'the oversized wrench' }),
      part({ id: 'gremlin-spanner', name: 'Spanner', hp: 6, r: 'C', cadence: even, actions: [pierce(7)], salvage: 'trip-hammer', anchor: 'the spanner' }),
    ],
  }),

  // ---------- Act 2: elites and the Boilermaker Queen ----------
  machine('pressure-warden', 'Pressure Warden', 2, 'elite', {
    core: 50,
    bump: 6,
    scrap: 14,
    sealed: true,
    punishes: ['pressure', 'burst', 'plating'],
    bestiary: 'The Dome shells for half your Pressure: break it first, or keep Pressure low. Sealed until Dome and Fist fall.',
    parts: [
      part({ id: 'pw-dome', name: 'Pressure Dome', hp: 20, r: 'U', cadence: every, actions: [{ kind: 'shell', pct: 50, target: 'self' }], salvage: 'soothing-valve', key: true, anchor: 'the glass dome on its head' }),
      part({ id: 'pw-fist', name: 'Piston Fist', hp: 16, r: 'R', cadence: every, actions: [corrode(75), hit(18)], salvage: 'steam-hammer', key: true, anchor: 'the piston fist' }),
      part({ id: 'pw-valve', name: 'Intake Valve', hp: 14, r: 'U', cadence: even, actions: [{ kind: 'drain', amount: 6 }], salvage: 'spire-key', anchor: 'the valve at its side' }),
    ],
  }),
  // Twin Pistons: two frames, each its own enemy. The left one summons the right one when combat starts.
  machine(
    'twin-pistons',
    'Twin Pistons',
    2,
    'elite',
    {
      core: 29,
      bump: 5,
      scrap: 9,
      punishes: ['burst', 'plating'],
      bestiary: 'One shells while the other hits; kill one and the other enrages. Link first on one twin, then its core.',
      startSummons: ['twin-pistons-r'],
      parts: [
        part({ id: 'twinl-ram', name: 'Left Ram', hp: 16, r: 'U', cadence: odd, actions: [corrode(50), hit(19)], salvage: 'auger', anchor: 'the left piston rod' }),
        part({ id: 'twinl-shield', name: 'Left Shield', hp: 12, r: 'U', cadence: even, actions: [shell(10)], salvage: 'torsion', anchor: 'the left cylinder cap' }),
        part({ id: 'twinl-link', name: 'Left Linkage', hp: 8, r: 'U', cadence: passive, passive: { kind: 'enrage', x: 8 }, salvage: null, anchor: 'the crossbar between them' }),
      ],
    },
  ),
  machine(
    'twin-pistons-r',
    'Twin Pistons (right)',
    2,
    'elite',
    {
      core: 29,
      bump: 5,
      scrap: 9,
      punishes: ['burst', 'plating'],
      bestiary: 'The right twin Pierces. Its Linkage enrages it if the left core falls.',
      parts: [
        part({ id: 'twinr-ram', name: 'Right Ram', hp: 16, r: 'R', cadence: even, actions: [pierce(14)], salvage: 'flywheel', anchor: 'the right piston rod' }),
        part({ id: 'twinr-shield', name: 'Right Shield', hp: 12, r: 'U', cadence: odd, actions: [shell(10)], salvage: 'verge', anchor: 'the right cylinder cap' }),
        part({ id: 'twinr-link', name: 'Right Linkage', hp: 8, r: 'U', cadence: passive, passive: { kind: 'enrage', x: 8 }, salvage: null, anchor: 'the crossbar between them' }),
      ],
    },
    { summonOnly: true },
  ),
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
  machine('bell-ringer', 'Bell Ringer', 3, 'normal', {
    core: 36,
    bump: 5,
    scrap: 5,
    punishes: ['plating', 'slow'],
    bestiary: 'The Rope jams your Mainspring and drops a Spire Key. Rope first, then the Clapper.',
    parts: [
      part({ id: 'ringer-clapper', name: 'Clapper', hp: 10, r: 'C', cadence: odd, actions: [pierce(14)], salvage: 'bell-hammer', anchor: 'the iron clapper' }),
      part({ id: 'ringer-fist', name: "Ringer's Fist", hp: 6, r: 'C', cadence: even, actions: [{ kind: 'siphon', amount: 10 }], salvage: 'metronome', anchor: 'the ringing fist' }),
      part({ id: 'ringer-rope', name: 'Bell Rope', hp: 8, r: 'C', cadence: even, actions: [{ kind: 'jam' }], salvage: 'spire-key', anchor: 'the rope over its shoulder' }),
    ],
  }),
  machine('chime-moth', 'Chime Moth', 3, 'normal', {
    core: 22,
    bump: 3,
    scrap: 3,
    punishes: ['plating', 'burst'],
    bestiary: 'Comes in pairs, each Shelling every other turn. Sweep or Chisel the pair; Dust Shells first.',
    parts: [
      part({ id: 'moth-wing', name: 'Wing Chime', hp: 8, r: 'C', cadence: odd, actions: [pierce(4, 2)], salvage: 'chime', anchor: 'the chiming wing' }),
      part({ id: 'moth-dust', name: 'Dust Shell', hp: 6, r: 'C', cadence: even, actions: [shell(8)], salvage: 'anchor', anchor: 'the dust on its back' }),
    ],
  }),
  machine('hour-knight', 'Hour Hand Knight', 3, 'normal', {
    core: 48,
    bump: 6,
    scrap: 6,
    punishes: ['burst'],
    bestiary: 'The Visor caps every Strike at 12 and the Shield soaks the middle turn. Drill the Visor, or hit small and often.',
    parts: [
      part({ id: 'knight-sword', name: 'Hand Sword', hp: 12, r: 'U', cadence: of3(1, 3), actions: [corrode(50), hit(20)], salvage: 'pendulum', anchor: 'the hour-hand sword' }),
      part({ id: 'knight-shield', name: 'Dial Shield', hp: 8, r: 'U', cadence: of3(2), actions: [shell(14)], salvage: 'balance-wheel', anchor: 'the clock-dial shield' }),
      part({ id: 'knight-visor', name: 'Visor', hp: 12, r: 'U', cadence: passive, passive: { kind: 'governor', cap: 12 }, salvage: null, anchor: 'the visored helm' }),
    ],
  }),
  machine('echo-sprite', 'Echo Sprite', 3, 'normal', {
    core: 24,
    bump: 4,
    scrap: 4,
    punishes: ['burst', 'plating'],
    bestiary: 'The Mouth echoes your biggest hit last turn as a Pierce. Spread your damage, or break the Mouth.',
    parts: [
      part({ id: 'sprite-mouth', name: 'Echo Mouth', hp: 10, r: 'U', cadence: every, actions: [{ kind: 'echo', amount: 10 }], salvage: 'tuning-fork', anchor: 'the open mouth' }),
      part({ id: 'sprite-fin', name: 'Mirror Fin', hp: 6, r: 'U', cadence: even, actions: [shell(8)], salvage: 'lever', anchor: 'the mirror-bright fin' }),
    ],
  }),
  machine('pendulum-blade', 'Pendulum Blade', 3, 'normal', {
    core: 48,
    bump: 6,
    scrap: 5,
    punishes: ['slow'],
    bestiary: 'The Blade swings harder every turn and the Weight adds more. Break the Blade before it passes 16, the Weight early.',
    parts: [
      part({ id: 'blade-edge', name: 'Swinging Edge', hp: 20, r: 'U', cadence: every, actions: [hit(8)], escalate: 4, escalateResetAt: 24, salvage: 'triple-cam', anchor: 'the pendulum blade' }),
      part({ id: 'blade-weight', name: 'Counterweight', hp: 12, r: 'U', cadence: passive, passive: { kind: 'ratchet', x: 1 }, salvage: 'tappet', anchor: 'the brass weight at its base' }),
    ],
  }),

  // ---------- Act 3: elites and the Clockmaker ----------
  machine('minute-warden', 'Minute Warden', 3, 'elite', {
    core: 80,
    bump: 8,
    scrap: 16,
    sealed: true,
    punishes: ['slow', 'burst', 'plating'],
    bestiary: 'The Mender heals it, the Hand Corrodes you, the Dial caps your Strikes. Mender first. Sealed until Mender and Hand fall.',
    parts: [
      part({ id: 'minute-mender', name: 'Mender Gear', hp: 26, r: 'R', cadence: every, actions: [{ kind: 'mend', amount: 10, target: 'self' }], salvage: 'planetary', key: true, anchor: 'the wheel in its chest' }),
      part({ id: 'minute-hand', name: 'Minute Hand', hp: 24, r: 'R', cadence: even, actions: [corrode(75), hit(28)], salvage: 'chronometer', key: true, anchor: 'the long hand' }),
      part({ id: 'minute-needle', name: 'Rust Needle', hp: 12, r: 'U', cadence: odd, actions: [rustParts(1)], salvage: 'alarm-clock', anchor: 'the needle at its wrist' }),
      part({ id: 'minute-dial', name: 'Dial', hp: 28, r: 'U', cadence: passive, passive: { kind: 'governor', cap: 22 }, salvage: null, anchor: 'the clock face on its belly' }),
    ],
  }),
  machine('orrery', 'Grand Orrery', 3, 'elite', {
    core: 80,
    bump: 8,
    scrap: 18,
    sealed: true,
    punishes: ['burst', 'slow', 'plating'],
    bestiary: 'Three Moons shell it every turn and the Ring halves core damage. Break the Moons one by one; sealed until all three fall.',
    parts: [
      part({ id: 'orrery-moon1', name: 'Moon of Hush', hp: 20, r: 'R', cadence: every, actions: [shell(6)], salvage: 'gong', key: true, anchor: 'the nearest, palest moon' }),
      part({ id: 'orrery-moon2', name: 'Moon of Embers', hp: 20, r: 'R', cadence: every, actions: [shell(6)], salvage: 'lamp', key: true, anchor: 'the red moon' }),
      part({ id: 'orrery-moon3', name: 'Moon of Dusk', hp: 20, r: 'R', cadence: every, actions: [shell(6)], salvage: 'grandfather', key: true, anchor: 'the slow, far moon' }),
      part({ id: 'orrery-arm', name: 'Orbit Arm', hp: 30, r: 'R', cadence: every, actions: [corrode(75), hit(24)], salvage: 'hairspring', anchor: 'the long brass arm' }),
      part({ id: 'orrery-ring', name: 'Brass Ring', hp: 40, r: 'U', cadence: passive, passive: { kind: 'bulwark' }, salvage: null, anchor: 'the great ring around the core' }),
    ],
  }),
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
