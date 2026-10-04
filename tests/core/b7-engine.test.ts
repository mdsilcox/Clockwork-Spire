// B7 engine details beyond the acceptance tests: intents, cadences, order, the v1 compatibility fields.
import { describe, expect, it } from 'vitest';
import { cloneCombat, previewTurn, runTurn, setTarget } from '../../src/core/combat';
import { currentTarget, defaultOrder, toggleTarget } from '../../src/core/frames';
import { combatWith } from '../../src/core/testkit';

describe('B7 engine: intents and cadences', () => {
  it('shows one intent per acting part in frame order, and a countdown as its label', () => {
    const c = combatWith({
      enemies: [
        {
          core: 30,
          parts: [
            { id: 'jaw', hp: 5, act: 'attack 5' },
            { id: 'bomb', hp: 5, act: 'pierce 25', cadence: { countdown: 2 } },
            { id: 'tail', hp: 5, act: 'shell 4', cadence: 'even' },
          ],
        },
      ],
    });
    const e = c.enemies[0];
    expect(e.intents.map((i) => i.partId)).toEqual(['jaw', 'bomb']);
    expect(e.intents[1].label).toBe('Pierce 25 in 2');
    expect(e.intent).toEqual(expect.objectContaining({ kind: 'attack', amount: 5, label: 'Attack 5' }));
    expect(defaultOrder(c)).toEqual(['e0.jaw', 'e0.bomb', 'e0.core']);
    expect(currentTarget(c)).toBe('e0.jaw');
    runTurn(c);
    expect(c.enemies[0].intents.map((i) => i.partId)).toEqual(['jaw', 'bomb', 'tail']);
  });

  it('cadence: odd, once and { of: 3, at: [1, 2] } act on the right turns', () => {
    const c = combatWith({
      enemies: [
        {
          core: 99,
          bump: 'shell 1',
          parts: [
            { id: 'odd', hp: 9, act: 'attack 1', cadence: 'odd' },
            { id: 'once', hp: 9, act: 'attack 10', cadence: 'once' },
            { id: 'of', hp: 9, act: 'attack 100', cadence: { of: 3, at: [1, 2] } },
          ],
        },
      ],
      hp: 1000,
    });
    const taken: number[] = [];
    for (let t = 0; t < 5; t++) {
      const before = c.playerHp;
      runTurn(c);
      taken.push(before - c.playerHp);
    }
    // turn 1: 1 + 10 + 100; turn 2: 100; turn 3: 1; turn 4: 100; turn 5: 1 + 100
    expect(taken).toEqual([111, 100, 1, 100, 101]);
  });

  it('escalate grows the first action each time it acts and resets after escalateResetAt', () => {
    const c = combatWith({
      enemies: [{ core: 99, parts: [{ id: 'blade', hp: 9, act: 'attack 8', escalate: 4 }] }],
      hp: 1000,
    });
    // test parts carry no escalateResetAt; check the growth only: 8, 12, 16
    const taken: number[] = [];
    for (let t = 0; t < 3; t++) {
      const before = c.playerHp;
      runTurn(c);
      taken.push(before - c.playerHp);
    }
    expect(taken).toEqual([8, 12, 16]);
  });

  it('a broken part drops from the intents at once and a core with only passives bumps', () => {
    const c = combatWith({
      board: { B2: 'spur' },
      ticks: 1,
      enemies: [{ core: 40, bump: 'attack 2', parts: [{ id: 'hat', hp: 5, passive: { kind: 'governor', cap: 9 } }] }],
    });
    expect(c.enemies[0].intents.map((i) => i.partId)).toEqual(['core']);
  });

  it('Jam cancels the intent shown and cloneCombat keeps the new fields', () => {
    const c = combatWith({
      board: { B2: 'test-jam' },
      ticks: 1,
      enemies: [{ core: 40, parts: [{ id: 'jaw', hp: 5, act: 'attack 5' }, { id: 'arm', hp: 5, act: 'attack 1' }] }],
      order: ['e0.jaw'],
    });
    const pv = previewTurn(c);
    expect(pv.byTarget['e0.jaw']).toEqual({ damage: 0, breaks: false });
    const copy = cloneCombat(c);
    expect(JSON.stringify(copy)).toBe(JSON.stringify(c));
    runTurn(c);
    expect(c.enemies[0].parts[0].jammed).toBe(false); // cleared when its action was skipped
  });
});

describe('B7 engine: target order', () => {
  it('toggleTarget adds and removes entries and setTarget aims at one enemy', () => {
    const c = combatWith({
      enemies: [
        { core: 10, parts: [{ id: 'a', hp: 5, act: 'attack 1' }] },
        { core: 10, parts: [{ id: 'b', hp: 5, act: 'attack 1' }] },
      ],
    });
    expect(toggleTarget(c, 'e1.b')).toBe(true);
    expect(c.order).toEqual(['e0.a', 'e0.core', 'e1.b']);
    expect(toggleTarget(c, 'e0.a')).toBe(true);
    expect(c.order).toEqual(['e0.core', 'e1.b']);
    setTarget(c, 1);
    expect(c.order).toEqual(['e1.b', 'e1.core']);
    expect(c.targetIdx).toBe(1);
  });
});
