// Test support: build a ready-to-run CombatState without drawing. Not used by the game.
import { cell } from './board';
import { chooseIntent, createCombat } from './combat';
import { registerEnemy } from './content/enemies';
import type { CombatState, PartInstance, PlacedPart } from './types';

export { cell };

registerEnemy({
  id: 'test-attacker-8',
  name: 'Test Attacker',
  act: 1,
  tier: 'normal',
  hp: 99,
  pattern: [{ kind: 'attack', amount: 8, label: 'Attack 8' }],
});

export interface CombatWithOpts {
  /** Cell name -> part id; a trailing + means upgraded, e.g. { B2: 'coil+' }. */
  board?: Record<string, string>;
  enemies?: string[];
  hand?: string[];
  pressure?: number;
  ticks?: number;
  hp?: number;
}

function parseId(spec: string): { defId: string; plus: boolean } {
  return spec.endsWith('+') ? { defId: spec.slice(0, -1), plus: true } : { defId: spec, plus: false };
}

export function combatWith(o: CombatWithOpts = {}): CombatState {
  const bin: PartInstance[] = [];
  const mk = (spec: string): number => {
    const { defId, plus } = parseId(spec);
    const uid = bin.length + 1;
    bin.push({ uid, defId, plus });
    return uid;
  };
  const placed: { at: number; uid: number }[] = [];
  for (const [name, spec] of Object.entries(o.board ?? {})) placed.push({ at: cell(name), uid: mk(spec) });
  const handUids = (o.hand ?? []).map(mk);
  const hp = o.hp ?? 50;
  const c = createCombat({ seed: 1, bin, enemies: o.enemies ?? ['dummy'], hp, maxHp: hp });
  c.draw = [];
  c.discard = [];
  c.hand = handUids;
  for (const { at, uid } of placed) {
    const inst = c.parts[uid];
    const p: PlacedPart = {
      uid,
      defId: inst.defId,
      plus: inst.plus,
      charge: 0,
      counter: 0,
      rusted: 0,
      magnetized: false,
      firedThisTurn: 0,
    };
    c.board[at] = p;
  }
  // Intents chosen at creation saw an empty board; pick again so sabotage targets name the parts placed here.
  if (placed.length > 0) for (let i = 0; i < c.enemies.length; i++) chooseIntent(c, i);
  if (o.pressure !== undefined) c.pressure = o.pressure;
  if (o.ticks !== undefined) c.ticksThisTurn = o.ticks;
  return c;
}
