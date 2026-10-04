import { describe, expect, it } from 'vitest';
import { STORY_NOTES } from '../../src/core/content/story';
import { UPGRADES } from '../../src/core/content/upgrades';
import {
  buyUpgrade,
  chassisPrice,
  finishRun,
  newProfile,
  runConfigFor,
  upgradeCost,
  workshopNotes,
} from '../../src/core/meta';
import { newRun } from '../../src/core/run';

const T = '2026-10-04T12:00:00Z';

function dead(p: ReturnType<typeof newProfile>, seed: number, act: 1 | 2 | 3, floor: number) {
  const run = newRun(runConfigFor(p, seed, 'tinker'));
  run.act = act;
  run.floor = floor;
  run.phase = 'defeat';
  return run;
}

describe('meta', () => {
  it('runConfigFor applies every upgrade', () => {
    const p = newProfile('t', T);
    for (const id of Object.keys(UPGRADES)) p.upgrades[id] = UPGRADES[id].costs.length;
    p.blueprints = ['ratchet'];
    const cfg = runConfigFor(p, 5, 'tinker');
    expect(cfg.maxHp).toBe(75);
    expect(cfg.cogs).toBe(75);
    expect(cfg.handSize).toBe(4);
    expect(cfg.upgradedStarters).toBe(3);
    expect(cfg.rewardChoices).toBe(4);
    expect(cfg.extraEliteBlueprint).toBe(true);
    expect(cfg.secondWind).toBe(true);
    expect(cfg.trinkets).toHaveLength(1);
    expect(cfg.unlockedParts).toEqual(['ratchet']);
    expect(runConfigFor(p, 5, 'tinker').trinkets).toEqual(cfg.trinkets);
  });

  it('upgrades stop at their last level', () => {
    const p = newProfile('t', T);
    p.brass = 10000;
    while (buyUpgrade(p, 'toolbelt')) {
      /* buy until maxed */
    }
    expect(p.upgrades.toolbelt).toBe(1);
    expect(upgradeCost(p, 'toolbelt')).toBeNull();
  });

  it('history is newest first and capped at 100', () => {
    const p = newProfile('t', T);
    for (let i = 0; i < 105; i++) finishRun(p, dead(p, 1000 + i, 1, 3), T);
    expect(p.history).toHaveLength(100);
    expect(p.history[0].n).toBe(105);
    expect(p.runsFinished).toBe(105);
  });

  it('story notes unlock with milestones, in wall order, without em dashes', () => {
    const p = newProfile('t', T);
    expect(workshopNotes(p)).toEqual([]);
    const out = finishRun(p, dead(p, 1, 1, 3), T);
    expect(out.newNotes).toEqual(expect.arrayContaining(['first-run', 'first-death-act1']));
    finishRun(p, dead(p, 2, 2, 3), T);
    expect(workshopNotes(p).map((n) => n.id)).toContain('unlock-stoker');
    expect(chassisPrice(p, 'stoker')).toBeNull();
    expect(chassisPrice(p, 'horologist')).toBe(300);
    for (const n of STORY_NOTES) expect(n.text + n.title).not.toContain('—');
    expect(STORY_NOTES.filter((n) => n.text.includes('Sprocket')).length).toBeGreaterThanOrEqual(2);
  });
});
