// One test per part: its main number, base and upgraded (+). A part sits next to the Mainspring at B2 unless noted.
import { describe, expect, it } from 'vitest';
import { runTurn, previewTurn } from '../../src/core/combat';
import { runMachine } from '../../src/core/machine';
import { PARTS } from '../../src/core/content/parts';
import { cell, combatWith } from '../../src/core/testkit';
import type { CombatWithOpts } from '../../src/core/testkit';

/** Damage to the first enemy and Plating from one machine run (the preview is the real machine on a copy). */
function preview(o: CombatWithOpts) {
  const p = previewTurn(combatWith(o));
  return { dmg: p.damageByEnemy[0], plating: p.plating, p };
}

describe('catalog text', () => {
  it('has the flavor of the Sprocket Wheel apart from its tooltip', () => {
    expect(PARTS['sprocket-wheel'].flavor).toContain('named after this');
    expect(PARTS['sprocket-wheel'].text).not.toContain('named after');
  });
  it('has 55 C/U/R parts (v1 46 plus 9 new): 10 gears, 7 springs, 10 cams, 8 tempo, 10 steam, 10 chimes; 20 locked', () => {
    const cur = Object.values(PARTS).filter((p) => p.rarity !== 'masterwork' && p.rarity !== 'legendary');
    const fam = (f: string) => cur.filter((p) => p.family === f).length;
    expect([fam('gear'), fam('spring'), fam('cam'), fam('tempo'), fam('steam'), fam('chime')]).toEqual([10, 7, 10, 8, 10, 10]);
    expect(cur.length).toBe(55);
    expect(cur.filter((p) => p.locked).length).toBe(20);
  });
  it('Masterwork stubs named by salvage exist, locked, until B9 builds them', () => {
    for (const id of ['skewframe', 'twin-mainspring', 'free-pawl', 'cascade-piston']) {
      expect(PARTS[id].rarity, id).toBe('masterwork');
      expect(PARTS[id].locked, id).toBe(true);
    }
  });
  it('the new v2 parts read as content.md says', () => {
    const t = (id: string) => [PARTS[id].text, PARTS[id].textPlus];
    expect(t('pry-bar')).toEqual(['Pry 4.', 'Pry 6.']);
    expect(t('cold-chisel')).toEqual(['Shatter 2.', 'Shatter 3.']);
    expect(t('auger')).toEqual(['Drill 5.', 'Drill 7.']);
    expect(t('wedge')).toEqual(['Jam. Strike 1.', 'Jam. Strike 3.']);
    expect(t('sapper')).toEqual(['Pry 5. If it breaks a part, Plate 5.', 'Pry 8. If it breaks a part, Plate 8.']);
    expect(PARTS.kettle.text).toContain('Patch 3');
  });
});

describe('damage parts (3 ticks)', () => {
  const table: [string, CombatWithOpts['board'], number][] = [
    ['bevel', { B2: 'bevel' }, 6],
    ['bevel+', { B2: 'bevel+' }, 12],
    ['crown', { B2: 'crown' }, 6],
    ['crown+', { B2: 'crown+' }, 9],
    ['ratchet', { B2: 'ratchet' }, 2 + 3 + 4],
    ['ratchet+', { B2: 'ratchet+' }, 3 + 5 + 7],
    ['flywheel', { B2: 'flywheel' }, 0 + 1 + 1],
    ['flywheel+', { B2: 'flywheel+' }, 3 + 4 + 4],
    ['planetary (one adjacent gear)', { B2: 'planetary', C2: 'spur' }, 6 + 9],
    ['planetary+', { B2: 'planetary+', C2: 'spur' }, 9 + 9],
    ['sprocket-wheel', { B2: 'sprocket-wheel' }, 6],
    ['sprocket-wheel+', { B2: 'sprocket-wheel+' }, 12],
    ['triple-cam', { B2: 'triple-cam' }, 8],
    ['triple-cam+', { B2: 'triple-cam+' }, 11],
    ['pendulum alone (turn has 4 ticks)', { B2: 'pendulum' }, 4],
    ['toggle', { B2: 'toggle' }, 4 + 4],
    ['toggle+', { B2: 'toggle+' }, 6 + 6],
    ['metronome', { B2: 'metronome' }, 4 + 6],
    ['metronome+', { B2: 'metronome+' }, 6 + 9],
    ['grandfather', { B2: 'grandfather' }, 9],
    ['chronometer', { B2: 'chronometer' }, 9],
    ['chronometer+', { B2: 'chronometer+' }, 12],
    ['bell-hammer (cracks after its first strike)', { B2: 'bell-hammer' }, 4 + 6 + 6],
    ['bell-hammer+', { B2: 'bell-hammer+' }, 5 + 7 + 7],
    ['chime', { B2: 'chime' }, 3],
    ['chime+', { B2: 'chime+' }, 6],
    ['tuning-fork without a Chime', { B2: 'tuning-fork' }, 9],
    ['firebox', { B2: 'firebox' }, 6],
    ['firebox+', { B2: 'firebox+' }, 12],
  ];
  for (const [name, board, dmg] of table) {
    it(`${name}: ${dmg} damage`, () => expect(preview({ board }).dmg).toBe(dmg));
  }
});

describe('plating parts (3 ticks)', () => {
  const table: [string, CombatWithOpts, number][] = [
    ['leaf releases Plate 10 on tick 2', { board: { B2: 'leaf' } }, 10],
    ['leaf+ Plate 14', { board: { B2: 'leaf+' } }, 14],
    ['volute Plate 2 each tick (4 ticks, release Strike 20)', { board: { B2: 'volute' }, ticks: 4 }, 8],
    ['volute+ Plate 3 each tick', { board: { B2: 'volute+' }, ticks: 4 }, 12],
    ['recoil Plate 2 per firing', { board: { B2: 'recoil' } }, 6],
    ['anchor holds tick 1, then Plate 2 x tick', { board: { B2: 'anchor' } }, 4 + 6],
    ['anchor+ Plate 3 x tick', { board: { B2: 'anchor+' } }, 6 + 9],
    ['balance wheel: Plate = Momentum on the last tick', { board: { B2: 'balance-wheel' } }, 3],
    ['balance wheel+: Momentum + 4', { board: { B2: 'balance-wheel+' } }, 7],
    ['toggle plates on even ticks', { board: { B2: 'toggle' } }, 4],
    ['trip hammer Plate 1 per firing', { board: { B2: 'trip-hammer' } }, 3],
    ['cam follower Plate 2 per firing', { board: { B2: 'cam-follower' } }, 6],
    ['cam follower+ Plate 3', { board: { B2: 'cam-follower+' } }, 9],
    ['safety valve spends up to 4 Pressure for Plate 2 each', { board: { B2: 'safety-valve' }, pressure: 10, ticks: 1 }, 8],
    ['safety valve+ spends up to 6', { board: { B2: 'safety-valve+' }, pressure: 10, ticks: 1 }, 12],
    ['condenser: half Pressure', { board: { B2: 'condenser' }, pressure: 10 }, 15],
    ['condenser+: three quarters', { board: { B2: 'condenser+' }, pressure: 10 }, 21],
    ['pendulum+ also Plate 4 per firing', { board: { B2: 'pendulum+' } }, 16],
  ];
  for (const [name, o, plating] of table) {
    it(`${name}: ${plating}`, () => expect(preview(o).plating).toBe(plating));
  }
});

describe('springs and triggers', () => {
  it('torsion releases Strike 4 per charge at the start of the next turn (+: 5)', () => {
    for (const [spec, per] of [['torsion', 4], ['torsion+', 5]] as const) {
      const c = combatWith({ board: { B2: spec } });
      runTurn(c);
      expect(c.enemies[0].maxHp - c.enemies[0].hp, spec).toBe(per * 3);
      expect(c.board[cell('B2')]!.charge).toBe(0);
    }
  });

  it('spring trap releases Strike 3 per charge at an attacker (+: 4), then its charge is spent', () => {
    for (const [spec, per] of [['trap', 3], ['trap+', 4]] as const) {
      const c = combatWith({ board: { B2: spec }, enemies: ['test-attacker-8'] });
      runTurn(c);
      expect(c.enemies[0].maxHp - c.enemies[0].hp, spec).toBe(per * 3);
      expect(c.board[cell('B2')]!.charge).toBe(0);
    }
  });

  it('spring trap holds at most 5 charge', () => {
    const c = combatWith({ board: { B2: 'trap' }, ticks: 8, enemies: ['dummy'] });
    runMachine(c, []);
    expect(c.board[cell('B2')]!.charge).toBe(5);
  });

  it('recoil gains 2 charge per adjacent release and sweeps 8 at 4 (+: 12)', () => {
    for (const [spec, sweep] of [['recoil', 8], ['recoil+', 12]] as const) {
      const c = combatWith({ board: { B2: 'leaf', C2: spec } });
      runTurn(c);
      expect(c.board[cell('C2')]!.charge, spec).toBe(2);
      runTurn(c);
      expect(c.enemies[0].maxHp - c.enemies[0].hp, spec).toBe(sweep);
    }
  });

  it('hairspring adds one tick on release, once per turn; + boosts what follows', () => {
    const c = combatWith({ board: { B2: 'hairspring' }, ticks: 3 });
    runMachine(c, []);
    expect(c.ticksThisTurn).toBe(4);
    const d = combatWith({ board: { B2: 'hairspring', C2: 'spur' } });
    expect(previewTurn(d).damageByEnemy[0]).toBe(6); // spur fires on the release ticks 2 and 4
    const e = combatWith({ board: { B2: 'hairspring+', C2: 'spur' } });
    expect(previewTurn(e).damageByEnemy[0]).toBe(10); // Boost 2 on release
  });

  it('coil, volute: the release strikes (volute 20 / 26 at 4 charge)', () => {
    expect(preview({ board: { B2: 'volute' }, ticks: 4 }).dmg).toBe(20);
    expect(preview({ board: { B2: 'volute+' }, ticks: 4 }).dmg).toBe(26);
  });

  it('trip hammer strikes 6 (+: 9) when an adjacent part releases', () => {
    expect(preview({ board: { B2: 'coil', B1: 'trip-hammer' } }).dmg).toBe(10 + 6);
    expect(preview({ board: { B2: 'coil', B1: 'trip-hammer+' } }).dmg).toBe(10 + 9);
  });

  it('trip hammer also reacts to an adjacent Cam paying off', () => {
    expect(preview({ board: { B2: 'cam', B1: 'trip-hammer' } }).dmg).toBe(7 + 6);
  });

  it('cam follower plates 5 (+: 7) when an adjacent Cam pays off, not for other releases', () => {
    expect(preview({ board: { B2: 'cam', B1: 'cam-follower' } }).plating).toBe(2 + (5 + 2) + 2);
    expect(preview({ board: { B2: 'cam', B1: 'cam-follower+' } }).plating).toBe(3 + (7 + 3) + 3);
    expect(preview({ board: { B2: 'coil', B1: 'cam-follower' } }).plating).toBe(2) // only the tick-3 power; the coil release is not a Cam payoff;
  });

  it('tappet makes an adjacent Cam pay off on every firing; tappet+ also strikes 2', () => {
    expect(preview({ board: { B2: 'cam', B1: 'tappet' } }).dmg).toBe(21);
    expect(preview({ board: { B2: 'cam', B1: 'tappet+' } }).dmg).toBe(21 + 6);
  });

  it('lever echoes what it powers (+: also Boost 1)', () => {
    expect(preview({ board: { B2: 'lever+', C2: 'spur' } }).dmg).toBe(2 * 4 * 3);
  });

  it('echo fires the effect twice but the part is powered once', () => {
    const c = combatWith({ board: { B2: 'lever', C2: 'ratchet' } });
    const p = previewTurn(c);
    expect(p.firing[cell('C2')]).toBe(6);
    expect(p.momentum).toBe(6); // lever + ratchet powered once per tick
  });
});

describe('statuses applied by parts', () => {
  const status = (o: CombatWithOpts, id: string): number => {
    const c = combatWith(o);
    runMachine(c, []);
    return c.enemies[0].statuses[id] ?? 0;
  };
  it('chime applies Dazed 1 (+: 2)', () => {
    expect(status({ board: { B2: 'chime' } }, 'dazed')).toBe(1);
    expect(status({ board: { B2: 'chime+' } }, 'dazed')).toBe(2);
  });
  it('bell hammer applies Cracked 1 (+: 2)', () => {
    expect(status({ board: { B2: 'bell-hammer' } }, 'cracked')).toBe(1);
    expect(status({ board: { B2: 'bell-hammer+' } }, 'cracked')).toBe(2);
  });
  it('steam whistle spends 2 Pressure per tick for Scald 3 (+: 4) on every enemy', () => {
    const c = combatWith({ board: { B2: 'whistle' }, pressure: 6, enemies: ['dummy', 'dummy'] });
    runMachine(c, []);
    expect(c.enemies.map((e) => e.statuses.scald)).toEqual([9, 9]);
    expect(c.pressure).toBe(0);
    expect(status({ board: { B2: 'whistle+' }, pressure: 2, ticks: 1 }, 'scald')).toBe(4);
    expect(status({ board: { B2: 'whistle' }, pressure: 1 }, 'scald')).toBe(0); // not enough Pressure
  });
  it('alarm clock: Scald 2, Scald 4 on the last tick (+: 3 and 6)', () => {
    expect(status({ board: { B2: 'alarm-clock' } }, 'scald')).toBe(2 + 2 + 4);
    expect(status({ board: { B2: 'alarm-clock+' } }, 'scald')).toBe(3 + 3 + 6);
  });
  it('tuning fork cracks every enemy when a Chime fired earlier this tick (+: 3)', () => {
    expect(status({ board: { B2: 'chime', C2: 'tuning-fork' } }, 'cracked')).toBe(2);
    expect(status({ board: { B2: 'chime', C2: 'tuning-fork+' } }, 'cracked')).toBe(3);
  });
  it("inventor's lamp adds to Scald and Cracked applied after it (+: 2)", () => {
    expect(status({ board: { B2: 'lamp', C2: 'alarm-clock' } }, 'scald')).toBe(3 + 3 + 5);
    expect(status({ board: { B2: 'lamp+', C2: 'alarm-clock' } }, 'scald')).toBe(4 + 4 + 6);
  });
  it('steam hammer+ also applies Cracked 2 on the last tick', () => {
    expect(status({ board: { B2: 'steam-hammer+' }, pressure: 4 }, 'cracked')).toBe(2);
    expect(status({ board: { B2: 'steam-hammer' }, pressure: 4 }, 'cracked')).toBe(0);
  });
});

describe('timing, steam and misc parts', () => {
  it('verge holds on tick 1, then boosts what follows by 3 (+: 5)', () => {
    expect(preview({ board: { B2: 'verge', C2: 'spur' } }).dmg).toBe(2 * 6);
    expect(preview({ board: { B2: 'verge+', C2: 'spur' } }).dmg).toBe(2 * 8);
  });
  it('grandfather adds a tick from the 3rd turn (+: from the 2nd)', () => {
    const a = combatWith({ board: { B2: 'grandfather' } });
    expect(previewTurn(a).ticks).toBe(3);
    a.turn = 3;
    expect(previewTurn(a).ticks).toBe(4);
    const b = combatWith({ board: { B2: 'grandfather+' } });
    b.turn = 2;
    expect(previewTurn(b).ticks).toBe(4);
  });
  it('steam hammer holds, then on the last tick spends all Pressure for Strike 2 each', () => {
    const c = combatWith({ board: { B2: 'steam-hammer', C2: 'spur' }, pressure: 10 });
    const p = previewTurn(c);
    expect(p.damageByEnemy[0]).toBe(20); // holds: the spur behind it never fires
    expect(p.pressureAfter).toBe(0);
  });
  it('flyball governor spends 5 above 15 Pressure for Sweep 10 (+: 14)', () => {
    expect(preview({ board: { B2: 'governor' }, pressure: 25 }).dmg).toBe(20);
    expect(preview({ board: { B2: 'governor+' }, pressure: 25 }).dmg).toBe(28);
    expect(preview({ board: { B2: 'governor' }, pressure: 15 }).dmg).toBe(0);
  });
  it('gong sweeps 10 (+: 14) once Momentum is 8', () => {
    expect(preview({ board: { B2: 'gong' }, ticks: 8 }).dmg).toBe(10);
    expect(preview({ board: { B2: 'gong+' }, ticks: 8 }).dmg).toBe(14);
    expect(preview({ board: { B2: 'gong' }, ticks: 7 }).dmg).toBe(0);
  });
  it('piston, boiler, firebox: Pressure arithmetic', () => {
    const c = combatWith({ board: { B2: 'firebox', B1: 'boiler' } });
    runMachine(c, []);
    expect(c.pressure).toBe(3 * (1 + 2));
    const d = combatWith({ board: { B2: 'firebox+', B1: 'boiler' } });
    runMachine(d, []);
    expect(d.pressure).toBe(3 * (2 + 2));
  });
  it('oil can clears Rust from adjacent parts and boosts 1 (+: 2)', () => {
    for (const [spec, boost] of [['oil-can', 1], ['oil-can+', 2]] as const) {
      const c = combatWith({ board: { B2: spec, C2: 'spur' } });
      c.board[cell('C2')]!.rusted = 1;
      const p = previewTurn(c);
      expect(p.damageByEnemy[0], spec).toBe((3 + boost) * 3);
      runMachine(c, []);
      expect(c.board[cell('C2')]!.rusted).toBe(0);
    }
  });
  it('tea kettle heals 3 (+: 5) the first time it fires in a combat, never above max HP', () => {
    for (const [spec, heal] of [['kettle', 3], ['kettle+', 5]] as const) {
      const c = combatWith({ board: { B2: spec }, hp: 50 });
      c.playerHp = 30;
      runMachine(c, []);
      expect(c.playerHp, spec).toBe(30 + heal);
      expect(c.pressure).toBe(3);
      runMachine(c, []);
      expect(c.playerHp, spec).toBe(30 + heal);
    }
    const full = combatWith({ board: { B2: 'kettle' }, hp: 50 });
    runMachine(full, []);
    expect(full.playerHp).toBe(50);
  });
  it('sprocket wheel asks for one extra draw next turn, once per turn', () => {
    const c = combatWith({ board: { B2: 'sprocket-wheel' } });
    runMachine(c, []);
    expect(c.extraDraw).toBe(1);
  });
  it('bevel passes motion diagonally', () => {
    const c = combatWith({ board: { B2: 'bevel', C1: 'spur' } });
    expect(previewTurn(c).damageByEnemy[0]).toBe(6 + 9);
  });
});
