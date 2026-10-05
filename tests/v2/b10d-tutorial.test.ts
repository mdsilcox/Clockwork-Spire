// B10d acceptance (unit), owner: tutorial lane (docs/briefs/B10d-front-door.md "Round 2" and "Round 2 additions"; docs/acceptance.md
// AR3's tutorial half). Written by the orchestrator's test-porter in the B10d.0 contract step. Lanes never weaken an assertion.
// The script is data (src/app/tutorial.ts `TUTORIAL_SCRIPT`); these tests prove it is consistent with the engine, without a browser:
// each step's forced hand holds the part its prompt names, the two Spur Gears break the Strut on the first Run with the script's seed
// (and its intent is cancelled in the preview), the Plate survives, the player takes nothing that turn, and the training rig is a
// summonOnly enemy that every pool, encounter and bestiary filter leaves out.
// Hooks and ids the lanes need are in e2e/tutorial.spec.ts and e2e/v2-title.spec.ts. Nothing here needs a stub.
import { describe, expect, it } from 'vitest';
import { TUTORIAL_SCRIPT } from '../../src/app/tutorial';
import { neighbors, cell } from '../../src/core/board';
import { createCombat, placePart, previewTurn, runTurn } from '../../src/core/combat';
import { ENCOUNTERS } from '../../src/core/content/encounters';
import { ENEMIES } from '../../src/core/content/enemies';
import { PARTS } from '../../src/core/content/parts';
import { TUTORIAL_CLOSING } from '../../src/core/content/story';
import { setOrder } from '../../src/core/frames';
import { partState } from '../../src/core/framelib';
import { MAINSPRING } from '../../src/core/types';
import type { CombatState, PartInstance, TargetRef } from '../../src/core/types';

const S = TUTORIAL_SCRIPT;

/** The tutorial's first combat as the lane builds it: the script's seed, enemy, HP and the first step's forced hand. */
function start(): CombatState {
  const names = S.steps[0].hand as string[];
  const bin: PartInstance[] = names.map((defId, i) => ({ uid: i + 1, defId, plus: false }));
  const c = createCombat({ seed: S.seed, bin, enemies: [S.enemy], hp: S.hp, maxHp: S.hp, kind: 'practice', noShuffle: true });
  c.hand = bin.map((b) => b.uid);
  c.draw = [];
  c.discard = [];
  return c;
}

const defIdAt = (c: CombatState, i: number): string => c.parts[c.hand[i]].defId;

describe('TUTORIAL_SCRIPT is consistent', () => {
  it("is six steps in the brief's order, with the fixed seed, enemy, HP and the can't-be-lost safeguard", () => {
    expect(S.seed).toBe(7);
    expect(S.enemy).toBe('tutorial-rig');
    expect(S.gentle).toBe(true);
    expect(S.hp).toBeGreaterThan(0);
    expect(S.steps.map((s) => s.expect.kind)).toEqual(['place', 'place', 'target', 'run', 'continue', 'keep']);
    expect(new Set(S.steps.map((s) => s.id)).size).toBe(S.steps.length);
  });

  it('only step 1 forces a hand, and it is Spur Gear, Spur Gear, Escapement', () => {
    expect(S.steps[0].hand).toEqual(['spur', 'spur', 'escapement']);
    for (const s of S.steps.slice(1)) expect(s.hand, s.id).toBeUndefined();
    for (const id of S.steps[0].hand as string[]) expect(PARTS[id], id).toBeTruthy();
  });

  it("each place step's hand index holds the part its prompt names, on a cell the motion reaches", () => {
    const c = start();
    let reached: number[] = [MAINSPRING];
    for (const s of S.steps) {
      if (s.expect.kind !== 'place') continue;
      const at = cell(s.expect.cell);
      const def = PARTS[defIdAt(c, s.expect.hand)];
      expect(s.prompt, `${s.id} names ${def.name}`).toContain(def.name);
      expect(reached.some((r) => neighbors(r).includes(at)), `${s.id}: ${s.expect.cell} touches the motion so far`).toBe(true);
      expect(placePart(c, s.expect.hand, at), s.id).toBe(true);
      reached = [...reached, at];
    }
  });

  it('the target step names a real, attacking part of the rig, and the salvage step offers what that part drops', () => {
    const t = S.steps.find((s) => s.expect.kind === 'target')!.expect as { ref: string };
    const m = /^e0\.(.+)$/.exec(t.ref);
    expect(m).toBeTruthy();
    const part = ENEMIES[S.enemy].frame!.parts.find((p) => p.id === (m as RegExpExecArray)[1]);
    expect(part, 'the target is a part of the rig').toBeTruthy();
    expect(part!.actions.length, 'the Strut attacks').toBeGreaterThan(0);
    const keep = S.steps.find((s) => s.expect.kind === 'keep')!;
    expect(keep.prompt).toContain(PARTS[part!.salvage as string].name);
  });

  it("prompts are short, in American English, with no em dashes; the closing line is Sprocket's, from story.ts", () => {
    for (const s of S.steps) {
      expect(s.prompt.length, s.id).toBeLessThanOrEqual(110);
      expect(s.prompt, s.id).not.toMatch(/[—–]/);
    }
    expect(S.closing).toBe(TUTORIAL_CLOSING);
    expect(S.closing).not.toMatch(/[—–]/);
    expect(S.closing).toContain('Sprocket');
  });
});

describe('the scripted first Run', () => {
  /** Play the script up to and including the Run; returns the preview taken just before it. */
  function play(): { c: CombatState; preview: ReturnType<typeof previewTurn>; hpBefore: number } {
    const c = start();
    for (const s of S.steps) {
      if (s.expect.kind === 'place') placePart(c, s.expect.hand, cell(s.expect.cell));
      if (s.expect.kind === 'target') setOrder(c, [s.expect.ref as TargetRef]);
      if (s.expect.kind === 'run') break;
    }
    const preview = previewTurn(c);
    const hpBefore = c.playerHp;
    runTurn(c);
    return { c, preview, hpBefore };
  }

  it("the Strut breaks under two Spur Gears on the first Run with the script's seed, and the Plate stands", () => {
    const { c } = play();
    expect(partState(c.enemies[0], 'rig-strut')?.broken).toBe(true);
    expect(partState(c.enemies[0], 'rig-plate')?.broken).toBe(false);
    expect(c.outcome).toBe('ongoing');
  });

  it("the preview says the break cancels the Strut's intent, and the player takes nothing that turn", () => {
    const { c, preview, hpBefore } = play();
    expect(preview.cancelled.map((x) => x.partId)).toContain('rig-strut');
    expect(c.playerHp).toBe(hpBefore);
    expect(c.enemies[0].intents.some((i) => i.partId === 'rig-strut')).toBe(false);
  });

  it("the broken Strut is the tray's one item: it drops a Spur Gear", () => {
    const { c } = play();
    expect(c.broken.map((b) => [b.partId, b.salvage])).toEqual([['rig-strut', 'spur']]);
  });

  it('the first Run is deterministic: the same script twice gives the same HP, Plating and parts', () => {
    const a = play().c;
    const b = play().c;
    expect([a.playerHp, a.plating, a.enemies[0].parts.map((p) => p.hp)]).toEqual([b.playerHp, b.plating, b.enemies[0].parts.map((p) => p.hp)]);
  });
});

describe('the training rig is a fixture, not content', () => {
  const rig = ENEMIES['tutorial-rig'];
  it('exists as a frame with a core and two parts, one of them a Plate, and is summonOnly', () => {
    expect(rig).toBeTruthy();
    expect(rig.summonOnly).toBe(true);
    expect(rig.frame?.parts.map((p) => p.id)).toEqual(['rig-strut', 'rig-plate']);
    expect(rig.frame?.parts.some((p) => p.keystone)).toBe(false);
  });

  it('is in no encounter, no summon list and no phase of any enemy', () => {
    for (const e of ENCOUNTERS) expect(e.enemies, `${e.act}:${e.enemies.join('+')}`).not.toContain('tutorial-rig');
    for (const d of Object.values(ENEMIES)) {
      if (d.id === 'tutorial-rig') continue;
      const acts = [...(d.frame?.parts ?? []), ...(d.frame?.phases ?? []).flatMap((ph) => ph.parts)].flatMap((p) => p.actions);
      const refs = [...(d.frame?.startSummons ?? []), ...acts.map((a) => a.summon ?? ''), ...(d.frame?.phases ?? []).map((ph) => ph.action?.summon ?? '')];
      expect(refs, d.id).not.toContain('tutorial-rig');
    }
  });

  it('is left out by the EM1 / EA11 / balance / bestiary filters (summonOnly, tutorial*, dummy)', () => {
    const regulars = Object.values(ENEMIES).filter((d) => d.tier === 'normal' && !d.summonOnly && !d.id.startsWith('test-') && d.id !== 'dummy' && !d.id.startsWith('tutorial'));
    expect(regulars.map((d) => d.id)).not.toContain('tutorial-rig');
    const bestiary = Object.values(ENEMIES).filter((d) => !d.summonOnly && d.id !== 'dummy' && d.id !== 'tutorial-automaton');
    expect(bestiary.map((d) => d.id)).not.toContain('tutorial-rig');
  });

  it('the v1 fixture stays (ui.spec, enemies.test and the Archivist still use it)', () => {
    expect(ENEMIES['tutorial-automaton']).toBeTruthy();
  });
});
