// Test support: build a ready-to-run CombatState without drawing. Not used by the game.
import { cell } from './board';
import { chooseIntent, createCombat } from './combat';
import { registerEnemy } from './content/enemies';
import { PARTS } from './content/parts';
import type { EnemyPartDef, Passive, WardenPhaseDef } from './defs';
import { setOrder } from './frames';
import type { ActionDef, Cadence, CombatState, PartInstance, PlacedPart, Rarity, TargetRef } from './types';

export { cell };

registerEnemy({
  id: 'test-attacker-8',
  name: 'Test Attacker',
  act: 1,
  tier: 'normal',
  hp: 99,
  pattern: [{ kind: 'attack', amount: 8, label: 'Attack 8' }],
});

// ---------- v2 test enemies and test parts (B7 CONTRACT, docs/acceptance.md section 9) ----------

/** A part of an inline test enemy. `act` is shorthand: 'attack 5x2', 'pierce 7', 'corrode 50%, attack 9', 'siphon 8',
 * 'shell 6', 'mend 6', 'rebuild jaw', 'drain 4', 'jam', 'rust'. Default cadence 'every' (or 'passive' with a passive). */
export interface TestPart {
  id: string;
  hp: number;
  act?: string;
  cadence?: Cadence;
  passive?: Passive;
  salvage?: string | null;
  keystone?: boolean;
  rarity?: Rarity;
  escalate?: number;
}

/** An inline enemy frame. `warden` gives it phases (Braced, rules 2.4 and 4.8); otherwise `parts` are its parts. */
export interface TestEnemy {
  core: number;
  parts?: TestPart[];
  sealed?: boolean;
  bump?: string; // the core action; default 'attack 3'
  warden?: { phases: { keystones: string[]; parts: TestPart[]; action?: string; coreExposed?: boolean; beat?: string }[] };
}

export function parseActions(spec: string): ActionDef[] {
  return spec
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t): ActionDef => {
      const [kind, arg] = t.split(/\s+/);
      if (!arg) return { kind: kind as ActionDef['kind'] };
      if (kind === 'rebuild') return { kind: 'rebuild', part: arg };
      if (arg.endsWith('%')) return { kind: kind as ActionDef['kind'], pct: Number(arg.slice(0, -1)) };
      const m = arg.match(/^(\d+)(?:x(\d+))?$/);
      if (!m) throw new Error(`testkit: bad action '${t}'`);
      return { kind: kind as ActionDef['kind'], amount: Number(m[1]), hits: m[2] ? Number(m[2]) : undefined };
    });
}

function partDefOf(t: TestPart): EnemyPartDef {
  return {
    id: t.id,
    name: t.id,
    hp: t.hp,
    rarity: t.rarity ?? 'common',
    actions: t.act ? parseActions(t.act) : [],
    passive: t.passive,
    cadence: t.cadence ?? (t.passive ? 'passive' : 'every'),
    escalate: t.escalate,
    salvage: t.salvage === undefined ? null : t.salvage,
    keystone: t.keystone,
    anchor: t.id,
  };
}

let testEnemies = 0;
/** Register an inline frame as an enemy def and return its id. */
export function registerTestEnemy(t: TestEnemy): string {
  const id = `test-frame-${++testEnemies}`;
  const phases: WardenPhaseDef[] | undefined = t.warden?.phases.map((ph, i) => ({
    keystones: ph.keystones,
    parts: ph.parts.map(partDefOf),
    beat: ph.beat ?? `phase ${i + 1}`,
    action: ph.action ? parseActions(ph.action)[0] : null,
    mood: 'phase',
    coreExposed: ph.coreExposed,
  }));
  registerEnemy({
    id,
    name: id,
    act: 1,
    tier: t.warden ? 'boss' : 'normal',
    hp: t.core,
    pattern: [],
    frame: {
      core: t.core,
      coreAction: parseActions(t.bump ?? 'attack 3')[0],
      sealed: t.sealed,
      parts: t.warden ? [] : (t.parts ?? []).map(partDefOf),
      phases,
      braced: !!t.warden,
      scrap: 3,
      punishes: [],
      bestiary: '',
    },
  });
  return id;
}

/** Test-only parts with one exact effect per firing: test-strike-N, test-sweep-N, test-shatter-N, test-drill-N,
 * test-pry-N, test-patch-N, test-jam. Registered on first use. */
export function testPart(id: string): string {
  if (PARTS[id]) return id;
  const m = id.match(/^test-(strike|sweep|shatter|drill|pry|patch|jam)(?:-(\d+))?$/);
  if (!m) throw new Error(`testkit: unknown test part ${id}`);
  const [, kind, n] = m;
  const amount = Number(n ?? 0);
  PARTS[id] = {
    id,
    name: id,
    family: 'gear',
    rarity: 'common',
    locked: true,
    text: id,
    textPlus: id,
    onFire(ctx) {
      if (kind === 'strike') ctx.strike(amount);
      else if (kind === 'sweep') ctx.sweep(amount);
      else if (kind === 'shatter') ctx.shatter(amount);
      else if (kind === 'drill') ctx.drill(amount);
      else if (kind === 'pry') ctx.pry(amount);
      else if (kind === 'patch') ctx.patch(amount);
      else ctx.jam();
    },
  };
  return id;
}

/** Put a part straight onto the board between turns (no placement cost). */
export function put(c: CombatState, cellName: string, spec: string): void {
  const { defId, plus } = parseId(spec);
  if (defId.startsWith('test-')) testPart(defId);
  const uid = Math.max(0, ...Object.keys(c.parts).map(Number)) + 1;
  c.parts[uid] = { uid, defId, plus };
  c.board[cell(cellName)] = { uid, defId, plus, charge: 0, counter: 0, rusted: 0, magnetized: false, firedThisTurn: 0 };
}

export interface CombatWithOpts {
  /** Cell name -> part id; a trailing + means upgraded, e.g. { B2: 'coil+' }. Test parts (test-strike-9...) allowed. */
  board?: Record<string, string>;
  /** Enemy ids or inline frames (v2). */
  enemies?: (string | TestEnemy)[];
  /** v2 target order, e.g. ['e0.jaw', 'e0.core']; omitted = the engine's default order. */
  order?: string[];
  /** Plating at the start of the player's turn (for enemy-turn tests). */
  plating?: number;
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
    if (defId.startsWith('test-')) testPart(defId);
    const uid = bin.length + 1;
    bin.push({ uid, defId, plus });
    return uid;
  };
  const placed: { at: number; uid: number }[] = [];
  for (const [name, spec] of Object.entries(o.board ?? {})) placed.push({ at: cell(name), uid: mk(spec) });
  const handUids = (o.hand ?? []).map(mk);
  const hp = o.hp ?? 50;
  const enemyIds = (o.enemies ?? ['dummy']).map((e) => (typeof e === 'string' ? e : registerTestEnemy(e)));
  const c = createCombat({ seed: 1, bin, enemies: enemyIds, hp, maxHp: hp });
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
  if (o.plating !== undefined) c.plating = o.plating;
  if (o.order) setOrder(c, o.order as TargetRef[]);
  return c;
}
