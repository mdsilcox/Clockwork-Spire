// B9b acceptance: the 33 achievements, one pool for every item source, the Legendary rules, the unlock sequence, migration
// (docs/acceptance.md AD1, AD2 (U), AD3, AD7 (U); docs/content.md sections 1, 5, 7, 10; docs/briefs/B9b-rarity.md;
// data-model invariants 8, 9, 10). Written by the orchestrator's test-porter in the B9b.0 contract step.
// Lanes may adapt a test to the code but never weaken an assertion. The tests are the spec.
//
// HOW UNLOCKS ARE MADE in these tests: only through the real flow. `earn(profile, ids)` builds a run whose RunStats facts meet
// the achievement and calls `finishRun`, so nothing here depends on where the lane stores an unlock. Pool functions are called
// with a run made by `newRun(runConfigFor(profile, ...))`.
//
// NAMES the progression lane must provide (the tests read them; everything else is the contract's):
//   - `RunConfig.unlockedTrinkets?: string[]` is optional to the tests: the pool may read unlocks from anywhere as long as
//     `eligible(profile, run, q)` and the source functions built on a `runConfigFor(profile)` run agree.
//   - run.ts `takeLegendary(run, id): boolean`: takes one option of the `legendary` Pending (a part joins the bin, a trinket joins
//     `run.trinkets`), sets `run.legendary = id`, clears the Pending; false for an id that is not an option.
//   - `VaultLoot` may carry `trinketId` instead of `partId` for a Masterwork trinket (the tests read either).
//   - The facts and their RunStats fields are the contract's (types.ts `RunStats`). Cross-run counters live in
//     `profile.achievementProgress`; the tests set exactly one key by name: `pets` (Sprocket pets, content.md e-pet).
//   - Reward text: `rewards.journal` holds the page title ('Dawn, at last', 'Spare hours'), `rewards.collars` a collar id,
//     `rewards.landmarks` a landmark id, `rewards.chassis` 'scrapper'. The tests match them case-insensitively by word.
//   - Resolved readings: the Foreman's core is ONE tier roll for the whole offer (all offered parts share a tier); a loss run can
//     earn the achievements the brief calls no-win; a boss fight counts as won when its entry says won: true.
import { describe, expect, it } from 'vitest';
import * as runMod from '../../src/core/run';
import { checkAchievements } from '../../src/core/achievements';
import { ACHIEVEMENTS } from '../../src/core/content/achievements';
import { CHASSIS } from '../../src/core/content/chassis';
import { PARTS } from '../../src/core/content/parts';
import { TRINKETS } from '../../src/core/content/trinkets';
import { runTurn } from '../../src/core/combat';
import { finishRun, chassisAvailable, newProfile, runConfigFor } from '../../src/core/meta';
import { migrateSlot } from '../../src/core/migrate';
import { canTakeLegendary, eligible, rollTier, wardenCoreReward } from '../../src/core/pool';
import { bossTrinkets, newPart, randomPart, randomTrinket, scrapOf } from '../../src/core/rewards';
import { fuseCandidates, takeVault, traderStock } from '../../src/core/rooms';
import { defaultRunConfig, newRun, runRecord, settleCombat } from '../../src/core/run';
import { isPartUnlocked, salvageItems, takeSalvage } from '../../src/core/salvage';
import { combatWith, registerTestEnemy, sectionFixture } from '../../src/core/testkit';
import type { Pending, Profile, Rarity, RunRecord, RunState, SaveSlot } from '../../src/core/types';

const T = '2026-10-05T12:00:00Z';

// ---------- facts: how each available achievement is met (RunStats fields from the contract) ----------

type Patch = (run: RunState, profile: Profile) => void;
const win: Patch = (r) => {
  r.phase = 'victory';
  r.act = 3;
  r.floor = 13;
  r.stats.bossesBeaten = 3;
  r.stats.plan = { plating: 150, burst: 1, pressure: 0, statuses: 0 }; // a win is not accidentally a Bare Metal win (m-no-plating needs under 150)
};
const loss: Patch = (r) => {
  r.phase = 'defeat';
};
const then = (...ps: Patch[]): Patch => (r, p) => ps.forEach((x) => x(r, p));
const warden = (enemy: string, o: { turns?: number; hpLost?: number; allBroken?: boolean; won?: boolean } = {}): Patch => (r) => {
  r.stats.wardenFights = [...(r.stats.wardenFights ?? []), { enemy, turns: o.turns ?? 9, hpLost: o.hpLost ?? 20, allBroken: o.allBroken ?? false, won: o.won ?? true }];
};
const withBells = (...b: [number, number][]): Patch => (r) => {
  r.stats.bells = b.map(([act, hoursLeft]) => ({ act, hoursLeft }));
};
const withChassis = (c: string): Patch => (r) => {
  r.config.chassis = c;
};
const steamBin: Patch = (r) => {
  for (const id of ['boiler', 'piston', 'whistle']) newPart(r, id);
};

/** Runs (patches) that meet each AVAILABLE achievement. More than one entry means across runs. */
const FACTS: Record<string, Patch[]> = {
  'e-first-win': [win],
  'e-pet': [then(loss, (_r, p) => (p.achievementProgress.pets = 50))],
  'e-bell': [then(loss, withBells([1, 4]))],
  'm-act2-breaker': [then(loss, (r) => {
    r.act = 2;
    r.stats.partsBrokenAct1 = 12;
  })],
  'm-bell3': [then(loss, withBells([1, 3])), then(loss, withBells([2, 3])), then(loss, withBells([3, 3]))],
  'm-quick-foreman': [then(loss, warden('foreman', { turns: 6 }))],
  'm-break-all': [then(win, warden('foreman', { allBroken: true }))],
  'm-all-chassis': [then(win, withChassis('tinker')), then(win, withChassis('stoker')), then(win, withChassis('horologist'))],
  'm-calm-steam': [then(win, steamBin, (r) => (r.stats.overpressured = false))],
  'm-status': [then(loss, (r) => (r.stats.scaldBest = 60))],
  'm-burst': [then(loss, (r) => (r.stats.biggestTurn = 100))],
  'm-bells': [then(loss, withBells([1, 3], [2, 3], [3, 3]))],
  'm-vaults': [then(loss, (r) => (r.stats.vaultsByAct = [1, 1, 1]))],
  'm-no-plating': [then(win, (r) => (r.stats.plan = { plating: 149, burst: 300, pressure: 0, statuses: 0 }))],
  'm-salvager': [then(loss, (r) => (r.stats.partsBroken = 100))],
  'm-fuse': [then(loss, (r) => (r.stats.fuses = 3))],
  'm-drill': [then(loss, (r) => (r.stats.drillThrough = true))],
  'm-shatter': [then(loss, (r) => (r.stats.shatterTriple = true))],
  'm-wrecker': [then(loss, (r) => (r.stats.wreckWins = 25))],
  'm-three-elites': [then(loss, (r) => (r.stats.elitesByAct = [1, 1, 1]))],
  'h-flawless': [then(loss, warden('foreman', { hpLost: 0 }))],
  'h-whole-clock': [then(win, warden('clockmaker', { allBroken: true }))],
};
/** One run each that comes just short of its achievement. */
const NEAR_MISS: Record<string, Patch> = {
  'e-first-win': loss,
  'e-bell': then(loss, withBells([1, 3])),
  'm-act2-breaker': then(loss, (r) => {
    r.act = 2;
    r.stats.partsBrokenAct1 = 11;
  }),
  'm-quick-foreman': then(loss, warden('foreman', { turns: 7 })),
  'm-break-all': then(win, warden('foreman', { allBroken: false })),
  'm-calm-steam': then(win, steamBin, (r) => (r.stats.overpressured = true)),
  'm-status': then(loss, (r) => (r.stats.scaldBest = 59)),
  'm-burst': then(loss, (r) => (r.stats.biggestTurn = 99)),
  'm-bells': then(loss, withBells([1, 3], [2, 3])),
  'm-vaults': then(loss, (r) => (r.stats.vaultsByAct = [1, 1, 0])),
  'm-no-plating': then(win, (r) => (r.stats.plan = { plating: 150, burst: 300, pressure: 0, statuses: 0 })),
  'm-salvager': then(loss, (r) => (r.stats.partsBroken = 99)),
  'm-fuse': then(loss, (r) => (r.stats.fuses = 2)),
  'm-drill': then(loss, (r) => (r.stats.drillThrough = false)),
  'm-shatter': then(loss, (r) => (r.stats.shatterTriple = false)),
  'm-wrecker': then(loss, (r) => (r.stats.wreckWins = 24)),
  'm-three-elites': then(loss, (r) => (r.stats.elitesByAct = [1, 0, 1])),
  'h-flawless': then(loss, warden('foreman', { hpLost: 1 })),
  'h-whole-clock': then(win, warden('clockmaker', { allBroken: false })),
};

let seedN = 5000;
const mkRun = (p: Profile): RunState => newRun(runConfigFor(p, seedN++, 'tinker'));
const rec = (run: RunState): RunRecord => ({ ...runRecord(run), n: 1, endedAt: T });

/** Earn achievements through the real flow (finishRun). */
function earn(p: Profile, ...ids: string[]): Profile {
  for (const id of ids) {
    for (const patch of FACTS[id]) {
      const run = mkRun(p);
      patch(run, p);
      finishRun(p, run, T);
    }
    expect(p.achievements[id], `${id} was earned by its facts`).toBeTruthy();
  }
  return p;
}
/** A profile with a spread of unlocks: Rares sapper and core-drill; Masterwork parts skewframe, resonance-rod and night-watchman (h-whole-clock breaks every Clockmaker part, so m-break-all is earned with it); Masterwork
 * trinkets two-left-hands, foresight-dial and overrun-coupler; Legendaries sprockets-blanket (part) and sprockets-whistle (trinket). */
function richProfile(): Profile {
  return earn(newProfile('rich', T), 'm-act2-breaker', 'm-fuse', 'm-quick-foreman', 'm-burst', 'm-bell3', 'm-three-elites', 'm-drill', 'h-flawless', 'h-whole-clock');
}
const runFor = (p: Profile, act: 1 | 2 | 3 = 1): RunState => {
  const run = mkRun(p);
  run.act = act;
  return run;
};
const tierOf = (id: string): Rarity => (PARTS[id] ? PARTS[id].rarity : (TRINKETS[id].rarity as Rarity));
const offered = (p: Pending | null): string[] => (!p ? [] : p.kind === 'reward' ? p.parts : p.kind === 'salvage' ? p.items.map((i) => i.salvage) : p.kind === 'legendary' ? p.options : []);

// ---------- AD1, AD7: the catalog ----------

describe('AD1: the catalog of 33 achievements', () => {
  const byId = (id: string) => ACHIEVEMENTS.find((a) => a.id === id);
  const IDS = [
    'e-first-win', 'e-pet', 'e-bell', 'e-resident', 'e-lore',
    'm-act2-breaker', 'm-bell3', 'm-quick-foreman', 'm-break-all', 'm-residents', 'm-all-chassis', 'm-calm-steam', 'm-status', 'm-burst', 'm-bells', 'm-vaults', 'm-no-plating', 'm-lift', 'm-beacon', 'm-salvager', 'm-fuse', 'm-drill', 'm-shatter', 'm-wrecker', 'm-three-elites',
    'h-master', 'h-clockwork', 'h-flawless', 'h-ow5', 'h-ow8', 'h-ow10', 'h-master-bare', 'h-whole-clock',
  ];
  // B10a opened e-resident, e-lore, m-residents, m-lift and m-beacon (tests/v2/b10a-memory.test.ts); six wait for B10b.
  const BELLFOOT = ['e-resident', 'e-lore', 'm-residents', 'm-lift', 'm-beacon'];
  const UNAVAILABLE = ['h-master', 'h-clockwork', 'h-ow5', 'h-ow8', 'h-ow10', 'h-master-bare'];

  it('has the 33 ids of content.md section 7: 5 easy, 20 medium, 8 hard, 4 hidden', () => {
    expect(ACHIEVEMENTS.map((a) => a.id).sort()).toEqual([...IDS].sort());
    const n = (t: string) => ACHIEVEMENTS.filter((a) => a.tier === t).length;
    expect([n('easy'), n('medium'), n('hard')]).toEqual([5, 20, 8]);
    expect(ACHIEVEMENTS.filter((a) => a.hidden).map((a) => a.id).sort()).toEqual(['e-lore', 'h-ow10', 'h-whole-clock', 'm-drill']);
    for (const a of ACHIEVEMENTS) {
      expect(a.name.length, a.id).toBeGreaterThan(0);
      expect(a.text.length, a.id).toBeGreaterThan(0);
    }
  });

  it('22 are available at this gate and the 11 that open with Bellfoot are not, as listed', () => {
    expect(ACHIEVEMENTS.filter((a) => a.available).length).toBe(22 + BELLFOOT.length); // 22 at the B9b gate, 27 with Bellfoot's five
    expect(ACHIEVEMENTS.filter((a) => !a.available).map((a) => a.id).sort()).toEqual([...UNAVAILABLE].sort());
    expect(Object.keys(FACTS).sort()).toEqual(IDS.filter((i) => !UNAVAILABLE.includes(i) && !BELLFOOT.includes(i)).sort()); // this file covers the 22 of the B9b gate
  });

  it('every Masterwork and Legendary part and trinket is unlocked by exactly one achievement, the one its def names', () => {
    const items: { id: string; kind: 'part' | 'trinket' }[] = [
      ...Object.values(PARTS).filter((p) => p.rarity === 'masterwork' || p.rarity === 'legendary').map((p) => ({ id: p.id, kind: 'part' as const })),
      ...Object.values(TRINKETS).filter((t) => t.rarity === 'masterwork' || t.rarity === 'legendary').map((t) => ({ id: t.id, kind: 'trinket' as const })),
    ];
    expect(items.filter((i) => i.kind === 'part')).toHaveLength(15);
    expect(items.filter((i) => i.kind === 'trinket')).toHaveLength(6);
    for (const it of items) {
      const owners = ACHIEVEMENTS.filter((a) => (it.kind === 'part' ? a.reward.parts : a.reward.trinkets)?.includes(it.id));
      expect(owners.map((a) => a.id), `${it.id} unlocked by exactly one achievement`).toHaveLength(1);
      const def = it.kind === 'part' ? PARTS[it.id] : TRINKETS[it.id];
      expect((def as { unlock?: string }).unlock, `${it.id} names its achievement`).toBe(owners[0].id);
      expect((def as { locked?: boolean }).locked, `${it.id} starts locked`).toBe(true);
    }
  });

  it('the Rares sapper, core-drill and sunder, the landmark, the chassis and the journal pages are as content.md says', () => {
    expect(byId('m-act2-breaker')?.reward.parts).toEqual(['sapper']);
    expect(byId('m-fuse')?.reward.parts).toEqual(['core-drill']);
    expect(byId('m-shatter')?.reward.parts).toEqual(['sunder']);
    expect(byId('m-vaults')?.reward.landmark).toBeTruthy();
    expect(byId('m-salvager')?.reward.chassis).toBe('scrapper');
    expect(byId('e-first-win')?.reward.journal).toMatch(/dawn, at last/i);
    expect(byId('e-bell')?.reward.journal).toMatch(/spare hours/i);
    expect(byId('e-pet')?.reward.collar).toBeTruthy();
  });
});

describe('AD7: trinkets have Masterwork and Legendary tiers; rarity opens early without a win', () => {
  it('4 Masterwork and 2 Legendary trinkets exist, all locked behind an achievement', () => {
    const m = Object.values(TRINKETS).filter((t) => t.rarity === 'masterwork');
    const l = Object.values(TRINKETS).filter((t) => t.rarity === 'legendary');
    expect(m.map((t) => t.id).sort()).toEqual(['foresight-dial', 'overrun-coupler', 'tow-hook', 'two-left-hands']);
    expect(l.map((t) => t.id).sort()).toEqual(["inventors-watch", "sprockets-whistle"]);
    for (const t of [...m, ...l]) {
      expect(t.locked, t.id).toBe(true);
      expect(t.unlock, t.id).toBeTruthy();
    }
  });

  it('a lost run (no win) that breaks 12 parts in act 1 and reaches act 2 opens a Rare; three early bells open a Masterwork trinket', () => {
    const p = newProfile('t', T);
    const run = mkRun(p);
    run.act = 2;
    run.stats.partsBrokenAct1 = 12;
    run.phase = 'defeat';
    expect(finishRun(p, run, T).newAchievements).toContain('m-act2-breaker');
    expect(eligible(p, runFor(p), { kind: 'part', tier: 'rare' })).toContain('sapper');
    earn(p, 'm-bell3');
    expect(eligible(p, runFor(p), { kind: 'trinket', tier: 'masterwork' })).toContain('two-left-hands');
  });

  it('m-quick-foreman, m-break-all, m-burst, m-status and m-three-elites also need no win', () => {
    for (const id of ['m-quick-foreman', 'm-burst', 'm-status', 'm-three-elites']) {
      const p = newProfile('t', T);
      const run = mkRun(p);
      FACTS[id][0](run, p);
      expect(run.phase, id).toBe('defeat');
      expect(checkAchievements(p, run, rec(run)), id).toContain(id);
    }
  });
});

// ---------- checkAchievements: each available achievement's facts ----------

describe('checkAchievements: the facts of the 22 available achievements', () => {
  for (const id of Object.keys(FACTS)) {
    it(`${id}: earned by its facts${NEAR_MISS[id] ? ', not by a near miss' : ''}`, () => {
      const p = newProfile('t', T);
      const got: string[] = [];
      for (const patch of FACTS[id]) {
        const run = mkRun(p);
        patch(run, p);
        got.push(...checkAchievements(p, run, rec(run)));
      }
      expect(got).toContain(id);
      expect(p.achievements[id]).toBe(T);
      if (NEAR_MISS[id]) {
        const q = newProfile('t', T);
        const run = mkRun(q);
        NEAR_MISS[id](run, q);
        expect(checkAchievements(q, run, rec(run))).not.toContain(id);
        expect(q.achievements[id]).toBeUndefined();
      }
    });
  }

  it('e-pet: 49 pets are not enough, 50 are', () => {
    const p = newProfile('t', T);
    p.achievementProgress.pets = 49;
    const a = mkRun(p);
    loss(a, p);
    expect(checkAchievements(p, a, rec(a))).not.toContain('e-pet');
    p.achievementProgress.pets = 50;
    const b = mkRun(p);
    loss(b, p);
    expect(checkAchievements(p, b, rec(b))).toContain('e-pet');
  });

  it('counts across runs: parts broken in total, wrecking wins, bells with 3 hours, wins per chassis', () => {
    const p = newProfile('t', T);
    const go = (patch: Patch): string[] => {
      const run = mkRun(p);
      patch(run, p);
      return checkAchievements(p, run, rec(run));
    };
    expect(go(then(loss, (r) => (r.stats.partsBroken = 60)))).not.toContain('m-salvager');
    expect(go(then(loss, (r) => (r.stats.partsBroken = 40)))).toContain('m-salvager');
    expect(go(then(loss, (r) => (r.stats.wreckWins = 13)))).not.toContain('m-wrecker');
    expect(go(then(loss, (r) => (r.stats.wreckWins = 12)))).toContain('m-wrecker');
    expect(go(then(loss, withBells([1, 3])))).not.toContain('m-bell3');
    expect(go(then(loss, withBells([1, 2])))).not.toContain('m-bell3'); // 2 hours left does not count
    expect(go(then(loss, withBells([2, 3], [3, 4])))).toContain('m-bell3');
    expect(go(then(win, withChassis('tinker')))).not.toContain('m-all-chassis');
    expect(go(then(win, withChassis('tinker')))).not.toContain('m-all-chassis'); // the same chassis twice is not three
    expect(go(then(win, withChassis('stoker')))).not.toContain('m-all-chassis');
    expect(go(then(win, withChassis('horologist')))).toContain('m-all-chassis');
  });

  it('the 11 that open with Bellfoot are never earned by anything this gate can do', () => {
    const p = newProfile('t', T);
    const run = mkRun(p);
    then(win, steamBin, withBells([1, 5], [2, 5], [3, 5]), (r) => {
      r.stats.vaultsByAct = [1, 1, 1];
      r.stats.elitesByAct = [3, 3, 3];
      r.stats.plan = { plating: 0, burst: 500, pressure: 0, statuses: 0 };
    }, warden('clockmaker', { allBroken: true, hpLost: 0 }))(run, p);
    checkAchievements(p, run, rec(run));
    for (const id of ['e-resident', 'e-lore', 'm-residents', 'm-lift', 'm-beacon', 'h-master', 'h-clockwork', 'h-ow5', 'h-ow8', 'h-ow10', 'h-master-bare']) {
      expect(p.achievements[id], id).toBeUndefined();
    }
  });
});

// ---------- AD2: the unlock sequence ----------

describe('AD2: a feat met mid-run unlocks only when the run ends, in the same write, and its reward joins the pool next run', () => {
  it('m-burst: nothing before finishRun; then the achievement, its time, the unlock, and the record all land in the one call', () => {
    const p = newProfile('t', T);
    const run = mkRun(p);
    run.stats.biggestTurn = 100; // met mid-run
    expect(p.achievements['m-burst']).toBeUndefined();
    expect(eligible(p, run, { kind: 'part', tier: 'masterwork' })).toEqual([]);
    run.phase = 'defeat';
    const out = finishRun(p, run, T);
    expect(out.newAchievements).toEqual(['m-burst']);
    expect(p.achievements['m-burst']).toBe(T);
    expect(p.history[0].seed).toBe(run.config.seed); // the RunRecord is in the same write
    expect(p.runsFinished).toBe(1);
    const next = mkRun(p);
    expect(eligible(p, next, { kind: 'part', tier: 'masterwork' })).toEqual(['resonance-rod']);
  });

  it('rewards without a system yet are recorded in profile.rewards (journal, collars, landmarks, chassis)', () => {
    const p = newProfile('t', T);
    earn(p, 'e-first-win', 'e-pet', 'm-vaults', 'm-salvager');
    expect(p.rewards.journal.some((j) => /dawn, at last/i.test(j))).toBe(true);
    expect(p.rewards.collars.some((c) => /red/i.test(c))).toBe(true);
    expect(p.rewards.landmarks.some((l) => /vault/i.test(l))).toBe(true);
    expect(p.rewards.chassis).toContain('scrapper');
    earn(p, 'm-fuse');
    expect(p.rewards.journal.length).toBe(1); // a part reward goes to the pool, not to the shelf lists
  });

  it('is idempotent: finishing the same seed again changes nothing, and an earned achievement is never returned twice', () => {
    const p = newProfile('t', T);
    const run = mkRun(p);
    run.stats.biggestTurn = 120;
    run.phase = 'defeat';
    finishRun(p, run, T);
    const before = JSON.stringify(p);
    expect(finishRun(p, run, '2026-10-06T00:00:00Z').newAchievements).toEqual([]);
    expect(JSON.stringify(p)).toBe(before);
    const again = mkRun(p);
    again.stats.biggestTurn = 140;
    again.phase = 'defeat';
    expect(finishRun(p, again, '2026-10-06T00:00:00Z').newAchievements).toEqual([]);
    expect(p.achievements['m-burst']).toBe(T); // the first time stands
  });

  it("finishRun's sequence: record and Brass, then planHistory, then achievements, all before it returns", () => {
    const p = newProfile('t', T);
    const run = mkRun(p);
    win(run, p);
    run.stats.plan = { plating: 150, burst: 200, pressure: 0, statuses: 0 };
    run.stats.biggestTurn = 100;
    const out = finishRun(p, run, T);
    expect(out.record.result).toBe('win');
    expect(p.brass).toBeGreaterThan(0);
    expect(p.planHistory).toEqual(['burst']);
    expect(out.newAchievements.sort()).toEqual(['e-first-win', 'm-burst']);
    expect(Object.keys(p.achievements).sort()).toEqual(['e-first-win', 'm-burst']);
  });

  it('the Scrapper joins the chassis rack once m-salvager is earned (B10a built it; before that it was kept off)', () => {
    const p = earn(newProfile('t', T), 'm-salvager');
    expect(p.rewards.chassis).toContain('scrapper');
    expect(chassisAvailable(p)).toContain('scrapper');
    expect(chassisAvailable(newProfile('u', T))).not.toContain('scrapper');
    expect(Object.keys(CHASSIS)).toContain('scrapper');
  });

  it('a profile or run saved before B9b migrates: achievements, progress and rewards filled, run.legendary null', () => {
    const old = (version: number): SaveSlot => {
      const profile = newProfile('Tess', T);
      const run = mkRun(profile); // made while the profile is whole
      profile.version = version;
      const loose = profile as unknown as Record<string, unknown>;
      delete loose.achievements;
      delete loose.achievementProgress;
      delete loose.rewards;
      delete (run as unknown as Record<string, unknown>).legendary;
      return { slot: 1, version, profile, run: version >= 2 ? run : null, updatedAt: T };
    };
    for (const v of [1, 2]) {
      const out = migrateSlot(old(v)).slot;
      expect(out.profile.achievements, `v${v}`).toEqual({});
      expect(out.profile.achievementProgress, `v${v}`).toEqual({});
      expect(out.profile.rewards, `v${v}`).toEqual({ journal: [], collars: [], landmarks: [], overwind: 0, chassis: [] });
      if (out.run) expect(out.run.legendary).toBeNull();
    }
    const kept = old(2);
    kept.profile.achievements = { 'm-burst': T };
    expect(migrateSlot(kept).slot.profile.achievements).toEqual({ 'm-burst': T });
  });
});

// ---------- the pool ----------

describe('the one pool: eligible, rollTier, canTakeLegendary', () => {
  it('a new profile sees only unlocked items: 21 Commons, no Masterwork or Legendary part or trinket, never the Mainspring', () => {
    const p = newProfile('t', T);
    const run = runFor(p);
    const commons = eligible(p, run, { kind: 'part', tier: 'common' });
    expect(commons).toHaveLength(21);
    expect(commons).toContain('spur');
    expect(commons).not.toContain('mainspring');
    for (const tier of ['masterwork', 'legendary'] as const) {
      expect(eligible(p, run, { kind: 'part', tier }), `part ${tier}`).toEqual([]);
      expect(eligible(p, run, { kind: 'trinket', tier }), `trinket ${tier}`).toEqual([]);
    }
    for (const tier of ['common', 'uncommon', 'rare'] as const) {
      for (const id of eligible(p, run, { kind: 'part', tier })) expect(PARTS[id].locked && !p.blueprints.includes(id), id).toBe(false);
    }
    expect(eligible(p, run, { kind: 'part', tier: 'rare' })).toEqual([]); // all 13 Rares start locked
  });

  it('an earned unlock opens exactly its item, by tier, family and kind; held trinkets are not offered again', () => {
    const p = richProfile();
    const run = runFor(p);
    expect(eligible(p, run, { kind: 'part', tier: 'masterwork' }).sort()).toEqual(['night-watchman', 'resonance-rod', 'skewframe']);
    expect(eligible(p, run, { kind: 'part', tier: 'masterwork', family: 'gear' })).toEqual(['skewframe']);
    expect(eligible(p, run, { kind: 'part', tier: 'rare' }).sort()).toEqual(['core-drill', 'sapper']);
    expect(eligible(p, run, { kind: 'trinket', tier: 'masterwork' }).sort()).toEqual(['foresight-dial', 'overrun-coupler', 'two-left-hands']);
    run.trinkets.push('two-left-hands');
    expect(eligible(p, run, { kind: 'trinket', tier: 'masterwork' })).not.toContain('two-left-hands');
  });

  it('Legendaries are eligible only while the run holds none (data-model invariant 9)', () => {
    const p = richProfile();
    const run = runFor(p);
    expect(run.legendary).toBeNull();
    expect(canTakeLegendary(run)).toBe(true);
    expect(eligible(p, run, { kind: 'part', tier: 'legendary' })).toEqual(['sprockets-blanket']);
    expect(eligible(p, run, { kind: 'trinket', tier: 'legendary' })).toEqual(['sprockets-whistle']);
    run.legendary = 'sprockets-blanket';
    expect(canTakeLegendary(run)).toBe(false);
    expect(eligible(p, run, { kind: 'part', tier: 'legendary' })).toEqual([]);
    expect(eligible(p, run, { kind: 'trinket', tier: 'legendary' })).toEqual([]);
  });

  it('rollTier follows the percentages on the named stream and leaves the other streams alone', () => {
    const p = newProfile('t', T);
    const run = runFor(p);
    const others = { ...run.rng };
    let common = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) if (rollTier(run, 'shop', { common: 62, uncommon: 33, rare: 5 }) === 'common') common++;
    expect(common / N).toBeGreaterThan(0.57);
    expect(common / N).toBeLessThan(0.67);
    expect(run.rng.shop).not.toBe(others.shop);
    expect(run.rng.reward).toBe(others.reward);
    expect(run.rng.map).toBe(others.map);
    for (let i = 0; i < 50; i++) expect(rollTier(run, 'shop', { rare: 100 })).toBe('rare');
  });
});

describe('every source goes through the pool (one test per source)', () => {
  it('salvage: a Masterwork salvage is locked (pays 6 Scrap) until its achievement, then it is kept-able', () => {
    const fresh = newProfile('t', T);
    const run0 = runFor(fresh);
    expect(isPartUnlocked(run0, 'skewframe')).toBe(false);
    const c = combatWith({ enemies: [{ core: 99, parts: [{ id: 'crown', hp: 3, act: 'attack 1', salvage: 'skewframe', rarity: 'masterwork' }] }] });
    c.broken.push({ enemy: 0, partId: 'crown', salvage: 'skewframe', rarity: 'masterwork', locked: false });
    expect(salvageItems(c, (id) => isPartUnlocked(run0, id))[0].locked).toBe(true);
    const p = earn(newProfile('t', T), 'm-quick-foreman');
    const run1 = runFor(p);
    expect(isPartUnlocked(run1, 'skewframe')).toBe(true);
    expect(salvageItems(c, (id) => isPartUnlocked(run1, id))[0].locked).toBe(false);
  });

  it('trader stock: only unlocked parts and trinkets; act 1 sells no Masterwork; folds down when none is unlocked; never a Legendary', () => {
    const fresh = newProfile('t', T);
    const rich = richProfile();
    let masterAct3 = 0;
    let masterAct1 = 0;
    let masterTrinket = 0;
    for (let s = 1; s <= 300; s++) {
      const a = runFor(fresh, 3);
      a.rng = { ...a.rng };
      for (const it of traderStock(a)) {
        if (it.kind === 'part') {
          expect(PARTS[it.id as string].locked, `fresh profile stock ${it.id}`).toBe(false); // Rares are all locked: they fold down
          expect(tierOf(it.id as string)).not.toBe('masterwork');
        } else if (it.kind === 'trinket') {
          expect(['common', 'uncommon', 'rare']).toContain(TRINKETS[it.id as string].rarity);
        }
      }
      const r1 = runFor(rich, 1);
      const r3 = runFor(rich, 3);
      r1.rng.shop = s * 7919;
      r3.rng.shop = s * 104729;
      for (const it of traderStock(r1)) if (it.kind === 'part' && tierOf(it.id as string) === 'masterwork') masterAct1++;
      for (const it of traderStock(r3)) {
        if (it.kind === 'part') {
          expect(tierOf(it.id as string), it.id).not.toBe('legendary');
          if (tierOf(it.id as string) === 'masterwork') {
            masterAct3++;
            expect(['skewframe', 'resonance-rod', 'night-watchman']).toContain(it.id);
          }
        }
        if (it.kind === 'trinket') {
          expect(TRINKETS[it.id as string].rarity, it.id).not.toBe('legendary');
          if (TRINKETS[it.id as string].rarity === 'masterwork') masterTrinket++;
        }
      }
    }
    expect(masterAct1).toBe(0); // 0% in act 1
    expect(masterAct3).toBeGreaterThan(20); // about 5% of 1200 parts
    expect(masterTrinket).toBeGreaterThan(3); // about 4% of 300
  });

  it('fuse: two Rares offer only unlocked Masterworks of the family, greyed with a reason when none is unlocked, never from Masterworks', () => {
    const atBench = (p: Profile): RunState => {
      const run = runFor(p);
      run.phase = 'workbench';
      run.pending = { kind: 'workbench', usedUpgrade: false, usedRemove: false, usedFuse: false };
      return run;
    };
    const fresh = atBench(newProfile('t', T));
    const a = newPart(fresh, 'flywheel').uid;
    const b = newPart(fresh, 'planetary').uid;
    const none = fuseCandidates(fresh, a, b);
    expect('reason' in none && none.reason).toMatch(/nothing here is ready yet/i);
    const p = earn(newProfile('t', T), 'm-quick-foreman');
    const run = atBench(p);
    const c = newPart(run, 'flywheel').uid;
    const d = newPart(run, 'planetary').uid;
    const res = fuseCandidates(run, c, d);
    expect('candidates' in res && res.candidates).toEqual(['skewframe']); // mirror-gear stays locked
    const e = newPart(run, 'skewframe').uid;
    const f = newPart(run, 'skewframe').uid;
    expect('reason' in fuseCandidates(run, e, f)).toBe(true); // Masterworks are never inputs
  });

  describe('vaults', () => {
    const vaultRun = (p: Profile, act: 1 | 2 | 3, seed: number): RunState => {
      const run = runFor(p, act);
      const f = sectionFixture();
      run.section = f.section;
      run.elites = f.elites;
      run.roomId = 'r7';
      run.phase = 'section';
      run.combat = null;
      run.pending = null;
      run.scrap = 0;
      run.rng.reward = seed * 6151;
      return run;
    };
    const lootId = (l: unknown): string => {
      const x = l as { partId?: string; trinketId?: string };
      return (x.trinketId ?? x.partId) as string;
    };

    it('with no Masterwork unlocked the vault gives an unlocked Rare and 40 Scrap', () => {
      const p = earn(newProfile('t', T), 'm-act2-breaker', 'm-fuse');
      for (let s = 1; s <= 20; s++) {
        const run = vaultRun(p, 1, s);
        const loot = takeVault(run);
        expect(loot, `seed ${s}`).toBeTruthy();
        expect(['sapper', 'core-drill']).toContain(lootId(loot));
        expect(scrapOf(run)).toBe(40);
      }
    });

    it('with Masterworks unlocked it gives one of them (a part or a trinket) and 40 Scrap; never a locked one', () => {
      const p = richProfile();
      const open = new Set([...eligible(p, runFor(p), { kind: 'part', tier: 'masterwork' }), ...eligible(p, runFor(p), { kind: 'trinket', tier: 'masterwork' })]);
      for (let s = 1; s <= 60; s++) {
        const run = vaultRun(p, (((s % 2) + 1) as 1 | 2), s);
        const loot = takeVault(run);
        expect(open.has(lootId(loot)), `${lootId(loot)} is an unlocked Masterwork`).toBe(true);
        expect(scrapOf(run)).toBe(40);
      }
    });

    it('act 3 with a Legendary unlocked and none held gives a Legendary (and marks the run); holding one gives a Masterwork instead', () => {
      const p = richProfile();
      const run = vaultRun(p, 3, 1);
      const loot = takeVault(run) as { legendary?: boolean } | null;
      expect(loot?.legendary).toBe(true);
      expect(['sprockets-blanket', 'sprockets-whistle']).toContain(lootId(loot));
      expect(run.legendary).toBe(lootId(loot));
      const held = vaultRun(p, 3, 2);
      held.legendary = 'sprockets-blanket';
      const second = takeVault(held) as { legendary?: boolean } | null;
      expect(second?.legendary).toBeFalsy();
      expect(tierOf(lootId(second))).toBe('masterwork');
      expect(held.legendary).toBe('sprockets-blanket');
    });

    it('acts 1 and 2 never give a Legendary, even when one is unlocked (AD3)', () => {
      const p = richProfile();
      for (let s = 1; s <= 40; s++) {
        const run = vaultRun(p, ((s % 2) + 1) as 1 | 2, s);
        expect(tierOf(lootId(takeVault(run)))).not.toBe('legendary');
        expect(run.legendary).toBeNull();
      }
    });
  });

  it("the Foreman's core: a Rare, and one time in three a Masterwork when one is unlocked; the whole offer is one tier", () => {
    const rares = earn(newProfile('t', T), 'm-act2-breaker', 'm-fuse');
    const both = richProfile();
    let master = 0;
    const N = 600;
    for (let s = 1; s <= N; s++) {
      const run = runFor(both);
      run.rng.reward = s * 7907;
      const ids = offered(wardenCoreReward(run, both, 'foreman'));
      expect(ids.length).toBeGreaterThan(0);
      const tiers = new Set(ids.map(tierOf));
      expect(tiers.size, `seed ${s}`).toBe(1);
      const t = [...tiers][0];
      expect(['rare', 'masterwork']).toContain(t);
      if (t === 'masterwork') master++;
      const none = runFor(rares);
      none.rng.reward = s * 7907;
      for (const id of offered(wardenCoreReward(none, rares, 'foreman'))) expect(tierOf(id)).toBe('rare'); // no Masterwork unlocked
    }
    expect(master / N).toBeGreaterThan(0.25);
    expect(master / N).toBeLessThan(0.42);
  });

  describe("the Queen's core", () => {
    it('with no Legendary unlocked: the normal reward, a Masterwork if any is unlocked, else a Rare', () => {
      const p = earn(newProfile('t', T), 'm-act2-breaker', 'm-quick-foreman');
      const withM = wardenCoreReward(runFor(p, 2), p, 'boilermaker');
      expect(withM.kind).not.toBe('legendary');
      for (const id of offered(withM)) expect(tierOf(id)).toBe('masterwork');
      const q = earn(newProfile('t', T), 'm-act2-breaker');
      const rare = wardenCoreReward(runFor(q, 2), q, 'boilermaker');
      expect(rare.kind).not.toBe('legendary');
      for (const id of offered(rare)) expect(tierOf(id)).toBe('rare');
    });

    it('with one Legendary eligible: a single card to take; with two: pick one of two (parts and trinkets alike), no skip', () => {
      const one = earn(newProfile('t', T), 'h-flawless');
      const a = wardenCoreReward(runFor(one, 2), one, 'boilermaker');
      expect(a).toEqual({ kind: 'legendary', options: ['sprockets-blanket'] });
      const two = earn(newProfile('t', T), 'h-flawless', 'h-whole-clock');
      const run = runFor(two, 2);
      const b = wardenCoreReward(run, two, 'boilermaker');
      expect(b.kind).toBe('legendary');
      expect(offered(b).sort()).toEqual(['sprockets-blanket', 'sprockets-whistle']);
    });

    it('taking one sets run.legendary and adds it (a part to the bin, a trinket to the trinkets); a non-option is refused', () => {
      const two = earn(newProfile('t', T), 'h-flawless', 'h-whole-clock');
      const take = (runMod as unknown as { takeLegendary?: (r: RunState, id: string) => boolean }).takeLegendary;
      expect(take, 'run.ts exports takeLegendary(run, id)').toBeTypeOf('function');
      const run = runFor(two, 2);
      run.phase = 'reward';
      run.pending = wardenCoreReward(run, two, 'boilermaker');
      expect((take as (r: RunState, id: string) => boolean)(run, 'perpetual-engine')).toBe(false);
      expect(run.legendary).toBeNull();
      const bin = run.bin.length;
      expect((take as (r: RunState, id: string) => boolean)(run, 'sprockets-blanket')).toBe(true);
      expect(run.legendary).toBe('sprockets-blanket');
      expect(run.bin.length).toBe(bin + 1);
      expect(run.pending?.kind).not.toBe('legendary');
      const run2 = runFor(two, 2);
      run2.phase = 'reward';
      run2.pending = { kind: 'legendary', options: ['sprockets-whistle'] };
      expect((take as (r: RunState, id: string) => boolean)(run2, 'sprockets-whistle')).toBe(true);
      expect(run2.trinkets).toContain('sprockets-whistle');
      expect(run2.legendary).toBe('sprockets-whistle');
    });

    it('holding a Legendary already: the normal reward (AD3, one per run)', () => {
      const two = earn(newProfile('t', T), 'h-flawless', 'h-whole-clock', 'm-quick-foreman');
      const run = runFor(two, 2);
      run.legendary = 'sprockets-blanket';
      expect(wardenCoreReward(run, two, 'boilermaker').kind).not.toBe('legendary');
    });
  });

  it('the boss trinket choice: Masterwork trinkets only after the Foreman and the Queen (acts 1 and 2), at most one, never a locked or Legendary one', () => {
    const p = richProfile();
    let early = 0;
    for (let s = 1; s <= 300; s++) {
      for (const act of [1, 2, 3] as const) {
        const run = runFor(p, act);
        run.rng.reward = s * 9973 + act;
        const choice = bossTrinkets(run);
        expect(choice).toHaveLength(3);
        const m = choice.filter((id) => TRINKETS[id].rarity === 'masterwork');
        for (const id of choice) {
          expect(TRINKETS[id].rarity, id).not.toBe('legendary');
          if (TRINKETS[id].locked) expect(['two-left-hands', 'foresight-dial', 'overrun-coupler'], id).toContain(id); // only unlocked ones
        }
        if (act === 3) expect(m, `act 3 seed ${s}`).toEqual([]);
        else {
          expect(m.length).toBeLessThanOrEqual(1);
          early += m.length;
        }
      }
    }
    expect(early).toBeGreaterThan(0);
  });

  it('events never give a Legendary, even with Legendaries unlocked and none held', () => {
    const p = richProfile();
    for (let s = 1; s <= 300; s++) {
      const run = runFor(p, (((s % 3) + 1) as 1 | 2 | 3));
      run.rng.event = s * 5003;
      const part = randomPart(run, null, 'event');
      expect(PARTS[part].rarity, part).not.toBe('legendary');
      expect(eligible(p, run, { kind: 'part', tier: PARTS[part].rarity }), `${part} is unlocked`).toContain(part);
      const t = randomTrinket(run, ['legendary', 'masterwork', 'rare', 'uncommon', 'common'], 'event');
      if (t) expect(TRINKETS[t].rarity, t).not.toBe('legendary');
    }
  });
});

// ---------- the Tow Hook and the Whistle's Scrap (salvage effects) ----------

describe('salvage effects: the Tow Hook and the Whistle', () => {
  const winRun = (c: ReturnType<typeof combatWith>): RunState => {
    const run = newRun(defaultRunConfig(1));
    c.kind = 'fight';
    run.combat = c;
    run.phase = 'combat';
    return run;
  };

  it('Tow Hook: when a core dies its best standing part (highest rarity, then leftmost) is salvaged as if broken; the rest are wrecked', () => {
    const c = combatWith({
      board: { B2: 'test-strike-31' },
      ticks: 1,
      enemies: [
        {
          core: 20,
          parts: [
            { id: 'a', hp: 30, act: 'attack 1', rarity: 'uncommon', salvage: 'bevel' },
            { id: 'b', hp: 30, act: 'attack 1', rarity: 'rare', salvage: 'planetary' },
            { id: 'c', hp: 30, act: 'attack 1', rarity: 'rare', salvage: 'flywheel' },
          ],
        },
      ],
      order: ['e0.core'],
    });
    c.trinkets.push('tow-hook');
    runTurn(c);
    expect(c.outcome).toBe('won');
    const run = winRun(c);
    expect(settleCombat(run)).toBe(true);
    const p = run.pending;
    expect(p?.kind).toBe('salvage');
    expect(offered(p)).toEqual(['planetary']);
    expect((p as Extract<Pending, { kind: 'salvage' }>).wrecked).toBe(2);
    const control = combatWith({ board: { B2: 'test-strike-31' }, ticks: 1, enemies: [{ core: 20, parts: [{ id: 'a', hp: 30, act: 'attack 1', rarity: 'rare', salvage: 'planetary' }] }], order: ['e0.core'] });
    runTurn(control);
    const r2 = winRun(control);
    settleCombat(r2);
    expect(offered(r2.pending)).toEqual([]); // without the Hook nothing is salvaged from a wrecked part
  });

  it('Tow Hook works once per combat: the second core to die salvages nothing', () => {
    const part = (n: string, salvage: string) => ({ id: n, hp: 30, act: 'attack 1', rarity: 'rare' as const, salvage });
    const c = combatWith({
      board: { B2: 'test-strike-31' },
      ticks: 1,
      enemies: [{ core: 20, parts: [part('a', 'planetary')] }, { core: 20, parts: [part('b', 'flywheel')] }],
      order: ['e0.core'],
    });
    c.trinkets.push('tow-hook');
    runTurn(c);
    expect(c.outcome).toBe('ongoing');
    c.order = ['e1.core'];
    runTurn(c);
    expect(c.outcome).toBe('won');
    const run = winRun(c);
    settleCombat(run);
    expect(offered(run.pending)).toEqual(['planetary']);
  });

  it("Sprocket's Whistle: a part Sprocket breaks drops 1 extra Scrap (read from the break flag); one the machine breaks does not", () => {
    const enemy = (): string => registerTestEnemy({ core: 300, bump: 'shell 1', parts: [{ id: 'tail', hp: 5, act: 'attack 1', salvage: 'spur' }, { id: 'jaw', hp: 100, act: 'attack 1' }] });
    const fight = (board: Record<string, string>): number => {
      const c = combatWith({ board, ticks: 1, enemies: [enemy()], order: ['e0.tail'] });
      c.trinkets.push('sprockets-whistle');
      runTurn(c);
      expect(c.broken.map((b) => b.partId)).toEqual(['tail']);
      c.board.fill(null);
      for (const e of c.enemies) e.hp = 0;
      runTurn(c);
      const run = winRun(c);
      expect(settleCombat(run)).toBe(true);
      expect(takeSalvage(run, [])).toBe(true); // scrap it
      return scrapOf(run);
    };
    const bySprocket = fight({});
    const byMachine = fight({ B2: 'test-strike-5' });
    expect(bySprocket - byMachine).toBe(1);
  });
});

// ---------- AD3: one Legendary per run, only from the two sources ----------

describe('AD3: never more than one Legendary, only from the Queen core or the act 3 vault, locked items never appear', () => {
  it('a run that takes the Queen\'s Legendary is offered no second one by any source', () => {
    const p = richProfile();
    const run = runFor(p, 3);
    run.phase = 'reward';
    run.pending = wardenCoreReward(run, p, 'boilermaker');
    const take = (runMod as unknown as { takeLegendary?: (r: RunState, id: string) => boolean }).takeLegendary;
    expect(take, 'run.ts exports takeLegendary(run, id)').toBeTypeOf('function');
    expect((take as (r: RunState, id: string) => boolean)(run, offered(run.pending)[0])).toBe(true);
    expect(canTakeLegendary(run)).toBe(false);
    for (const tier of ['legendary'] as const) {
      expect(eligible(p, run, { kind: 'part', tier })).toEqual([]);
      expect(eligible(p, run, { kind: 'trinket', tier })).toEqual([]);
    }
    for (let s = 1; s <= 100; s++) {
      run.rng.shop = s * 31;
      for (const it of traderStock(run)) if (it.id) expect(tierOf(it.id)).not.toBe('legendary');
      expect(tierOf(randomPart(run, null, 'event'))).not.toBe('legendary');
    }
  });

  it('no source offers an item that is still locked, on a fresh profile', () => {
    const p = newProfile('t', T);
    for (let s = 1; s <= 80; s++) {
      const run = runFor(p, ((s % 3) + 1) as 1 | 2 | 3);
      run.rng.shop = s * 41;
      run.rng.reward = s * 43;
      for (const it of traderStock(run)) if (it.kind === 'part') expect(PARTS[it.id as string].locked, it.id).toBe(false);
      for (const id of bossTrinkets(run)) expect(TRINKETS[id].locked ?? false, id).toBe(false);
      expect(PARTS[randomPart(run, 'rare', 'reward')].locked, 'a random Rare').toBe(false);
      const core = offered(wardenCoreReward(run, p, 'foreman'));
      for (const id of core) expect(PARTS[id].locked, id).toBe(false);
    }
  });
});
