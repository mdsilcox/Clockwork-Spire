// Statuses, sabotage, enemy behaviors, phases, summons and encounter pools (B2).
import { describe, expect, it } from 'vitest';
import { cell } from '../../src/core/board';
import { createCombat, runTurn } from '../../src/core/combat';
import { ENCOUNTERS } from '../../src/core/content/encounters';
import { ENEMIES, enemyDef } from '../../src/core/content/enemies';
import { MAX_ENEMIES, summonEnemy } from '../../src/core/enemy';
import { runMachine } from '../../src/core/machine';
import { combatWith } from '../../src/core/testkit';
import type { CombatState, GameEvent } from '../../src/core/types';

const lost = (c: CombatState, i = 0) => c.enemies[i].maxHp - c.enemies[i].hp;
const kinds = (ev: GameEvent[], k: string) => ev.filter((e) => e.kind === k);
const seq = (c: CombatState, n: number, i = 0): string[] => {
  const out: string[] = [];
  for (let t = 0; t < n; t++) {
    out.push(`${c.enemies[i].intent.kind}:${c.enemies[i].intent.amount ?? ''}`);
    runTurn(c);
  }
  return out;
};

describe('statuses', () => {
  it('Scald: damage at the end of the enemy turn straight through Shell, then it falls by 1', () => {
    const c = combatWith({});
    c.enemies[0].statuses.scald = 3;
    c.enemies[0].shell = 50;
    const r = runTurn(c);
    expect(c.enemies[0].hp).toBe(999 - 3);
    expect(c.enemies[0].statuses.scald).toBe(2);
    expect(kinds(r.events, 'statusTick')[0]).toMatchObject({ status: 'scald', amount: 3, target: 0 });
  });

  it('Cracked: Strike and Sweep deal 50% more, and it runs out after its turns', () => {
    const c = combatWith({ board: { B2: 'spur' } });
    c.enemies[0].statuses.cracked = 2;
    runTurn(c);
    expect(lost(c)).toBe(4 * 3);
    expect(c.enemies[0].statuses.cracked).toBe(1);
    runTurn(c);
    expect(c.enemies[0].statuses.cracked).toBeUndefined();
  });

  it('Dazed: 25% less attack damage, for its turns', () => {
    const c = combatWith({ enemies: ['test-attacker-8'], hp: 50 });
    c.enemies[0].statuses.dazed = 1;
    runTurn(c);
    expect(c.playerHp).toBe(50 - 6);
    runTurn(c);
    expect(c.playerHp).toBe(50 - 6 - 8);
  });

  it('Shell: a defend intent emits a shell event and absorbs strikes', () => {
    const c = combatWith({ board: { B2: 'spur' }, enemies: ['brass-beetle'] }); // Attack 12, then Shell 10
    runTurn(c);
    const r = runTurn(c);
    expect(kinds(r.events, 'shell')[0]).toMatchObject({ target: 0, amount: 10 });
    expect(c.enemies[0].shell).toBe(10);
  });

  it('Strength: a buff raises the attacks of allies, including the intent already shown', () => {
    const c = combatWith({ enemies: ['tinpot-general'], hp: 500 });
    expect(c.enemies.map((e) => e.defId)).toEqual(['tinpot-general', 'rust-mite', 'rust-mite']);
    const r = runTurn(c);
    expect(kinds(r.events, 'buff').length).toBe(2);
    expect(c.enemies[1].statuses.strength).toBe(3);
    expect(c.enemies[1].intent.amount).toBe(10);
    expect(c.enemies[1].intent.label).toBe('Attack 10');
    runTurn(c);
    expect(c.enemies[1].statuses.strength).toBe(3); // strength lasts
  });

  it('Corroded: 25% less Plating for its turns (applied by an Oil Slick)', () => {
    const c = combatWith({ board: { B2: 'escapement' }, enemies: ['oil-slick'], hp: 500 });
    runTurn(c); // Attack 9
    const r = runTurn(c); // Corroded 2
    expect(kinds(r.events, 'status')[0]).toMatchObject({ status: 'corroded', amount: 2, note: 'player' });
    expect(c.playerStatuses.corroded).toBe(2);
    const before = c.plating;
    runMachine(c, []);
    expect(c.plating - before).toBe(2 * 3); // floor(3 * 0.75) = 2 per tick
  });

  it('Grit: every Strike gains +X, Sweep does not', () => {
    const c = combatWith({ board: { B2: 'spur', B1: 'crown' } });
    c.playerStatuses.grit = 2;
    runMachine(c, []);
    expect(lost(c)).toBe(3 * (3 + 2) + 3 * 2);
  });
});

describe('sabotage', () => {
  it('Jam: the next turn has one fewer tick', () => {
    const c = combatWith({ enemies: ['bell-ringer'], hp: 999 });
    runTurn(c); // Attack 14
    expect(c.ticksThisTurn).toBe(3);
    const r = runTurn(c); // Jam + Attack 6
    expect(kinds(r.events, 'sabotage').some((e) => e.note === 'jam')).toBe(true);
    expect(c.ticksThisTurn).toBe(2);
    runTurn(c);
    expect(c.ticksThisTurn).toBe(3);
  });

  it('Magnetize: the named part returns to the hand at the start of the next turn with its charge lost', () => {
    const c = combatWith({ board: { B2: 'coil' }, enemies: ['gearhound'], hp: 999 });
    runTurn(c); // Attack 8 x2
    const it = c.enemies[0].intent;
    expect(it.sabotage).toBe('magnetize');
    expect(it.target).toBe(cell('B2'));
    const uid = c.board[cell('B2')]!.uid;
    const r = runTurn(c);
    expect(kinds(r.events, 'unmagnetize')[0]).toMatchObject({ cell: cell('B2'), uid });
    expect(c.board[cell('B2')]).toBeNull();
    expect(c.hand).toContain(uid);
  });

  it('Drain: Pressure falls by N', () => {
    const c = combatWith({ enemies: ['pipe-snake'], hp: 999, pressure: 12 });
    runTurn(c); // Attack 5 x3
    expect(c.pressure).toBe(12);
    runTurn(c); // Drains 5
    expect(c.pressure).toBe(7);
  });

  it('Rust 2 parts: two distinct occupied cells, named in the intent', () => {
    const c = combatWith({ board: { B2: 'spur', B1: 'spur', B3: 'spur' }, enemies: ['gauge-gremlin'], hp: 999 });
    const it = c.enemies[0].intent;
    expect(it.targets).toHaveLength(2);
    expect(new Set(it.targets).size).toBe(2);
    expect(it.target).toBe(it.targets![0]);
    for (const t of it.targets!) expect(c.board[t]).not.toBeNull();
  });

  it('Rust set by an enemy lasts through the next machine run', () => {
    const c = combatWith({ board: { B2: 'spur', B1: 'spur', B3: 'spur' }, enemies: ['gauge-gremlin'], hp: 999 });
    const targets = c.enemies[0].intent.targets!;
    runTurn(c); // my machine runs, then the enemy rusts its two targets for the next turn
    for (const t of targets) expect(c.board[t]!.rusted).toBe(1);
  });
});

describe('enemy behaviors', () => {
  it('the tutorial automaton: Attack 3, Attack 3, Rusts a part, Attack 4, repeat; 20 HP', () => {
    const c = combatWith({ enemies: ['tutorial-automaton'], hp: 999 });
    expect(c.enemies[0].maxHp).toBe(20);
    expect(seq(c, 5)).toEqual(['attack:3', 'attack:3', 'sabotage:', 'attack:4', 'attack:3']);
  });

  it('Spring Imp grows by 3 each turn; Pendulum Blade swings 8 to 24 then resets', () => {
    expect(seq(combatWith({ enemies: ['spring-imp'], hp: 999 }), 4)).toEqual(['attack:4', 'attack:7', 'attack:10', 'attack:13']);
    expect(seq(combatWith({ enemies: ['pendulum-blade'], hp: 999 }), 6)).toEqual([
      'attack:8',
      'attack:12',
      'attack:16',
      'attack:20',
      'attack:24',
      'attack:8',
    ]);
  });

  it('Furnace Golem charges up (clock icon) and then hits for 24', () => {
    const c = combatWith({ enemies: ['furnace-golem'], hp: 999 });
    expect(c.enemies[0].intent.kind).toBe('charge');
    runTurn(c);
    expect(c.playerHp).toBe(999);
    expect(c.enemies[0].intent).toMatchObject({ kind: 'attack', amount: 26 });
    runTurn(c);
    expect(c.playerHp).toBe(999 - 26);
  });

  it('Pressure Warden gains Shell equal to half your Pressure each turn', () => {
    const c = combatWith({ enemies: ['pressure-warden'], hp: 999, pressure: 10 });
    runTurn(c);
    expect(c.enemies[0].shell).toBe(5);
  });

  it('Echo Sprite copies your strongest part last turn (min 6)', () => {
    const c = combatWith({ enemies: ['echo-sprite'], hp: 999 });
    expect(c.enemies[0].intent.amount).toBe(8);
    const d = combatWith({ board: { B2: 'spur' }, enemies: ['echo-sprite'], hp: 999 });
    runTurn(d);
    expect(d.enemies[0].intent.amount).toBe(9);
  });

  it('Minute Warden heals 10 each turn and rusts your strongest part', () => {
    const c = combatWith({ board: { B2: 'spur', A1: 'chime' }, enemies: ['minute-warden'], hp: 999 });
    runTurn(c);
    expect(c.enemies[0].hp).toBe(170 - 12 + 10);
    runTurn(c); // Attack 15
    expect(c.enemies[0].intent.label).toBe('Rusts your strongest part');
    expect(c.enemies[0].intent.target).toBe(cell('B2'));
  });

  it('Grand Orrery: 3 moons give it Shell 6 each per turn', () => {
    const c = combatWith({ enemies: ['orrery'], hp: 999 });
    expect(c.enemies.map((e) => e.defId)).toEqual(['orrery', 'orrery-moon', 'orrery-moon', 'orrery-moon']);
    runTurn(c);
    expect(c.enemies[0].shell).toBe(18);
    c.enemies[1].hp = 0;
    runTurn(c);
    expect(c.enemies[0].shell).toBe(12);
  });

  it('Twin Pistons: one attacks while the other shells; the survivor enrages (+6 attack)', () => {
    const c = combatWith({ board: { B2: 'spur' }, enemies: ['twin-pistons'], hp: 999 });
    expect(c.enemies).toHaveLength(2);
    expect(c.enemies[0].intent).toMatchObject({ kind: 'attack', amount: 19 });
    expect(c.enemies[1].intent.kind).toBe('defend');
    c.enemies[0].hp = 1;
    const r = runTurn(c); // the spur kills the first twin
    expect(c.enemies[0].hp).toBe(0);
    expect(kinds(r.events, 'buff').some((e) => e.note === 'strength' && e.amount === 8)).toBe(true);
    expect(c.enemies[1].statuses.strength).toBe(8);
  });

  it('Foreman summons a Cog Rat at half HP, once', () => {
    const c = combatWith({ enemies: ['foreman'], hp: 999 });
    c.enemies[0].hp = 70;
    const r = runTurn(c);
    expect(kinds(r.events, 'summon')[0]).toMatchObject({ target: 1, note: 'cog-rat' });
    expect(c.enemies.map((e) => e.defId)).toEqual(['foreman', 'cog-rat']);
    runTurn(c);
    expect(c.enemies).toHaveLength(2);
  });

  it('Boilermaker Queen: builds heat, unleashes Attack 40 at 20, summons a Steam Wraith at half HP', () => {
    const c = combatWith({ enemies: ['boilermaker'], hp: 999 });
    let unleashed = 0;
    for (let t = 0; t < 8; t++) {
      if (c.enemies[0].intent.label.startsWith('Unleashes')) {
        unleashed = c.enemies[0].intent.amount!;
        const before = c.playerHp;
        runTurn(c);
        expect(before - c.playerHp).toBe(40);
        expect(c.enemies[0].mem.heat).toBe(0);
        break;
      }
      runTurn(c);
    }
    expect(unleashed).toBe(40);
    c.enemies[0].hp = 100;
    runTurn(c);
    expect(c.enemies.some((e) => e.defId === 'steam-wraith')).toBe(true);
  });

  it('the Queen turns Pressure Drain into heat', () => {
    const c = combatWith({ enemies: ['boilermaker'], hp: 999, pressure: 6 });
    runTurn(c); // Attack 22, heat 6
    runTurn(c); // heat 12, Drains 6
    expect(c.pressure).toBe(0);
    expect(c.enemies[0].mem.heat).toBe(18);
  });

  it('caps enemies at 4', () => {
    const c = combatWith({ enemies: ['rust-mite', 'rust-mite', 'rust-mite'] });
    expect(summonEnemy(c, 'rust-mite', null)).toBe(3);
    expect(summonEnemy(c, 'rust-mite', null)).toBe(-1);
    expect(c.enemies).toHaveLength(MAX_ENEMIES);
  });
});

describe('the Clockmaker', () => {
  it('has three phases of 110 / 130 / 150; reaching 0 starts the next with full HP and clears statuses', () => {
    const c = combatWith({ board: { B2: 'spur' }, enemies: ['clockmaker'], hp: 999 });
    const e = c.enemies[0];
    expect(e.maxHp).toBe(110);
    e.hp = 1;
    e.statuses.scald = 5;
    const r = runTurn(c);
    expect(c.outcome).toBe('ongoing');
    expect(kinds(r.events, 'phase')[0]).toMatchObject({ target: 0, amount: 1 });
    expect(kinds(r.events, 'phase')[0].note?.length).toBeGreaterThan(0);
    expect(kinds(r.events, 'enemyDied')).toHaveLength(0);
    expect(e.phase).toBe(1);
    expect(e.hp).toBeLessThanOrEqual(130);
    expect(e.maxHp).toBe(130);
    expect(e.statuses.scald).toBeUndefined();
  });

  it('attacks rise with the phases, and phase 3 ends the fight', () => {
    const amount = (phase: number) => {
      const c = combatWith({ enemies: ['clockmaker'], hp: 999 });
      const e = c.enemies[0];
      e.phase = phase;
      e.step = 0;
      const d = enemyDef('clockmaker').phases![phase];
      e.hp = d.hp;
      e.maxHp = d.hp;
      const i = enemyDef('clockmaker').phases![phase].pattern![0];
      return i.amount;
    };
    expect([0, 1, 2].map(amount)).toEqual([20, 26, 32]);
    const c = combatWith({ board: { B2: 'spur' }, enemies: ['clockmaker'], hp: 999 });
    c.enemies[0].phase = 2;
    c.enemies[0].hp = 1;
    runTurn(c);
    expect(c.outcome).toBe('won');
  });
});

describe('combat options', () => {
  const bin = Array.from({ length: 6 }, (_, i) => ({ uid: i + 1, defId: i % 2 ? 'spur' : 'escapement', plus: false }));
  it('noShuffle draws in bin order', () => {
    const c = createCombat({ seed: 5, bin, enemies: ['dummy'], hp: 50, maxHp: 50, noShuffle: true });
    expect(c.hand).toEqual([1, 2, 3]);
    expect(c.draw).toEqual([6, 5, 4]);
  });
  it('pressure sets the starting Pressure', () => {
    const c = createCombat({ seed: 5, bin, enemies: ['dummy'], hp: 50, maxHp: 50, pressure: 6 });
    expect(c.pressure).toBe(6);
  });
});

describe('encounters', () => {
  it('only names enemies that exist and are not summon-only; each act has easy/normal pools, 2 elites, 1 boss', () => {
    for (const e of ENCOUNTERS) {
      for (const id of e.enemies) {
        expect(ENEMIES[id], id).toBeDefined();
        expect(ENEMIES[id].summonOnly, id).toBeFalsy();
      }
    }
    const n = (act: number, tier: string) => ENCOUNTERS.filter((e) => e.act === act && e.tier === tier).length;
    expect([n(1, 'easy'), n(1, 'normal'), n(1, 'elite'), n(1, 'boss')]).toEqual([4, 5, 2, 1]);
    expect([n(2, 'normal'), n(2, 'elite'), n(2, 'boss')]).toEqual([6, 2, 1]);
    expect([n(3, 'normal'), n(3, 'elite'), n(3, 'boss')]).toEqual([6, 2, 1]);
    const boss = (act: number) => ENCOUNTERS.find((e) => e.act === act && e.tier === 'boss')!.enemies;
    expect([boss(1), boss(2), boss(3)]).toEqual([['foreman'], ['boilermaker'], ['clockmaker']]);
  });
  it('every encounter can be fought for 8 turns without error', () => {
    for (const e of ENCOUNTERS) {
      const c = combatWith({ board: { B2: 'spur', A1: 'escapement' }, enemies: e.enemies, hp: 9999 });
      for (let t = 0; t < 8 && c.outcome === 'ongoing'; t++) runTurn(c);
    }
  });
});
