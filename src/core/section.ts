// The climb: act sections, moves, the Spire clock, roaming elites, the bell, doors and keys
// (docs/rules.md 4.1 to 4.6; semantics in docs/briefs/B8-the-climb.md). Pure and deterministic (the `map` stream
// for generation).
import { bandForFloor, ENCOUNTERS } from './content/encounters';
import { EVENTS } from './content/events';
import { int, pick, shuffle } from './rng';
import type { RngState } from './rng';
import { addScrap } from './rewards';
import { traderStock } from './rooms';
import { startCombat } from './startfight';
import { eliteSteps, hoursFor } from './difficulty';
import type { ActSection, MapGenPatch, Passage, Room, RoamingElite, RoomKind, RunState } from './types';

export const DEFAULT_HOURS = 12; // Journeyman (rules 5.7)
export const MAX_SHORTEST_PATH = 5; // entry to door, in moves (rules 4.1)
export const BELL_SCRAP_PER_HOUR = 6;
export const BELL_BRASS_PER_HOUR = 2;
export const LOCK_PICK_SCRAP = 25;
/** Brass per room cleared, by act (rules 5.2). */
export const ROOM_BRASS = [2, 3, 4];

/** B10a: what landmarks and residents change in generation (types.ts `MapGenPatch`). */
export type SectionOpts = MapGenPatch;

const BASE: Record<string, number> = { fight: 7, workbench: 1, oil: 1, trader: 1, event: 3, vault: 0 };
const CAP: Record<string, number> = { fight: 9, workbench: 1, oil: 2, trader: 2, event: 4, vault: 1 };

function eliteIds(act: 1 | 2 | 3): string[] {
  return ENCOUNTERS.filter((e) => e.act === act && e.tier === 'elite').map((e) => e.enemies[0]);
}

function attempt(rng: RngState, act: 1 | 2 | 3, opts: SectionOpts): { section: ActSection; elites: RoamingElite[] } | null {
  const R = (n: number): number => int(rng, 'map', n);
  const F = 5 + R(2);
  const nMin = Math.max(16, 3 * F);
  const nMax = Math.min(20, 4 * F);
  const N = nMin + R(nMax - nMin + 1);
  const counts = new Array<number>(F).fill(3);
  for (let extra = N - 3 * F; extra > 0; extra--) {
    const open = counts.map((c, f) => (c < 4 ? f : -1)).filter((f) => f >= 0);
    counts[open[R(open.length)]] += 1;
  }
  const spine = counts.map((c) => R(c));

  // room kinds (rules 4.4)
  const cap: Record<string, number> = { ...CAP, workbench: act === 3 ? 2 : 1 };
  const kc: Record<string, number> = { ...BASE, workbench: act === 3 ? 2 : 1 };
  const known = (opts.knownVaults ?? []).includes(act); // an opened vault: this act always has its vault room
  if (known) kc.vault = 1;
  let total = Object.values(kc).reduce((a, b) => a + b, 0);
  while (total < N - 2) {
    const open = Object.keys(kc).filter((k) => kc[k] < cap[k]);
    if (!open.length) return null;
    kc[open[R(open.length)]] += 1;
    total += 1;
  }

  // ids: the entry is r0, the rest follow floor by floor
  const rooms: Room[] = [];
  const at = new Map<string, Room>(); // `${floor}:${slot}`
  let n = 1;
  for (let f = 0; f < F; f++) {
    for (let s = 0; s < counts[f]; s++) {
      const isEntry = f === 0 && s === spine[0];
      const r: Room = { id: isEntry ? 'r0' : `r${n++}`, floor: f, slot: s, kind: 'fight', visited: false, cleared: false, revealed: false };
      rooms.push(r);
      at.set(`${f}:${s}`, r);
    }
  }
  rooms.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  const spineRoom = (f: number): Room => at.get(`${f}:${spine[f]}`) as Room;
  const entry = spineRoom(0);
  const door = spineRoom(F - 1);
  entry.kind = 'entry';
  door.kind = 'door';

  // the vault: a leaf at the end of a floor, off the spine, behind a locked door
  let vault: Room | null = null;
  if (kc.vault > 0) {
    const cands = rooms.filter((r) => r.floor >= 1 && r.floor <= F - 2 && r.slot !== spine[r.floor] && (r.slot === 0 || r.slot === counts[r.floor] - 1));
    if (!cands.length) return null;
    vault = cands[R(cands.length)];
    vault.kind = 'vault';
  }

  const passages: Passage[] = [];
  const has = (a: string, b: string): boolean => passages.some((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a));
  const vkinds: Passage['kind'][] = ['stairs', 'duct', 'lift'];
  for (let f = 0; f < F; f++) {
    for (let s = 0; s + 1 < counts[f]; s++) {
      const a = at.get(`${f}:${s}`) as Room;
      const b = at.get(`${f}:${s + 1}`) as Room;
      passages.push({ a: a.id, b: b.id, kind: 'floor', ...(a === vault || b === vault ? { locked: true } : {}) });
    }
  }
  for (let f = 0; f + 1 < F; f++) passages.push({ a: spineRoom(f).id, b: spineRoom(f + 1).id, kind: vkinds[R(3)] });
  let lockedExtra = R(3) === 0;
  for (let f = 0; f + 1 < F; f++) {
    const k = 1 + R(2);
    for (let i = 0; i < k; i++) {
      for (let tries = 0; tries < 12; tries++) {
        const a = at.get(`${f}:${R(counts[f])}`) as Room;
        const b = at.get(`${f + 1}:${R(counts[f + 1])}`) as Room;
        if (a === vault || b === vault || has(a.id, b.id)) continue;
        const locked = lockedExtra && a !== entry && b !== door;
        if (locked) lockedExtra = false;
        passages.push({ a: a.id, b: b.id, kind: vkinds[R(3)], ...(locked ? { locked: true } : {}) });
        break;
      }
    }
  }
  if (opts.lift && act === 1) {
    // the repaired lift: entry to one floor-3 room (floor index 2), never the door or the vault, so never next to the door
    const targets = rooms.filter((r) => r.floor === 2 && r !== door && r !== vault && !has(entry.id, r.id));
    if (!targets.length) return null;
    passages.push({ a: entry.id, b: targets[R(targets.length)].id, kind: 'lift' });
  }
  if (passages.length - rooms.length + 1 < 2) return null;

  // kinds for the rest
  const rest = rooms.filter((r) => r !== entry && r !== door && r !== vault);
  const bag: RoomKind[] = [];
  for (const k of ['fight', 'workbench', 'oil', 'trader', 'event'] as const) for (let i = 0; i < kc[k]; i++) bag.push(k);
  if (bag.length !== rest.length) return null;
  const order = shuffle(rng, 'map', bag);
  rest.forEach((r, i) => (r.kind = order[i]));

  // the rooms next to the entry (any passage) draw easy fights
  const nb = (id: string, openOnly = false): string[] =>
    passages.filter((p) => (p.a === id || p.b === id) && !(openOnly && p.locked)).map((p) => (p.a === id ? p.b : p.a));
  const next = new Set(nb(entry.id));
  // opening pacing: a regular fight next to the entry, no trader there (nothing to barter yet), no locked passage out of it
  if (passages.some((p) => p.locked && (p.a === entry.id || p.b === entry.id))) return null;
  const swapKinds = (a: Room, b: Room): void => {
    const k = a.kind;
    a.kind = b.kind;
    b.kind = k;
  };
  const swappable = (r: Room): boolean => r !== entry && r !== door && r !== vault;
  if (!rest.some((r) => next.has(r.id) && r.kind === 'fight')) {
    const near = rest.filter((r) => next.has(r.id) && swappable(r));
    const far = rest.filter((r) => !next.has(r.id) && r.kind === 'fight');
    if (!near.length || !far.length) return null;
    swapKinds(near[R(near.length)], far[R(far.length)]);
  }
  for (const t of rest.filter((r) => next.has(r.id) && r.kind === 'trader')) {
    const far = rest.filter((r) => !next.has(r.id) && r.kind !== 'trader' && r.kind !== 'fight');
    if (!far.length) return null;
    swapKinds(t, far[R(far.length)]);
  }
  // the Trader's cousin: converts regular fight rooms into traders, never one beside the entry (the opening fight)
  for (let i = 0; i < (opts.extraTraders ?? 0); i++) {
    const cands = rest.filter((r) => r.kind === 'fight' && !next.has(r.id));
    if (!cands.length) return null;
    cands[R(cands.length)].kind = 'trader';
  }
  const usedEnc: string[] = [];
  const poolFor = (band: 'easy' | 'middle' | 'deep') => ENCOUNTERS.filter((e) => e.act === act && e.band === band && e.tier !== 'elite' && e.tier !== 'boss');
  for (const r of rooms) {
    if (r.kind !== 'fight') continue;
    const band = next.has(r.id) ? 'easy' : bandForFloor(r.floor + 1, F);
    const pool = poolFor(band);
    const fresh = pool.filter((e) => !usedEnc.includes(e.enemies.join(',')));
    const e = pick(rng, 'map', fresh.length ? fresh : pool);
    usedEnc.push(e.enemies.join(','));
    r.encounter = e.enemies.slice();
  }
  // events a landmark or a resident has already made are not placed again
  const excluded = [...(opts.excludeEvents ?? []), ...(known ? ['vault-wheel'] : []), ...(opts.beacon && act === 3 ? ['beacon'] : []), ...(opts.lift && act === 1 ? ['lamplighter'] : [])];
  const events = shuffle(
    rng,
    'map',
    Object.values(EVENTS)
      .filter((e) => !e.act || e.act === act)
      .map((e) => e.id),
  ).filter((id) => !excluded.includes(id)); // after the shuffle, so a resident living in Bellfoot moves no random draws
  let ev = 0;
  for (const r of rooms) if (r.kind === 'event') r.eventId = events[ev++ % events.length];

  const pool = eliteIds(act);
  if (vault) {
    if (known) {
      // an opened vault: a known room whose guardian is a regular fight from the act's pool (it still pays its loot)
      const regulars = [...new Set(ENCOUNTERS.filter((e) => e.act === act && e.tier !== 'elite' && e.tier !== 'boss').flatMap((e) => e.enemies))];
      vault.guardian = pick(rng, 'map', regulars);
      vault.revealed = true;
    } else vault.guardian = pick(rng, 'map', pool);
  }

  // patrols: simple cycles of 3 to 5 rooms along open passages, away from the entry, the door and the vault
  const banned = new Set<string | undefined>([entry.id, door.id, vault?.id]);
  const idx = new Map(rooms.map((r, i) => [r.id, i]));
  const found = new Map<string, string[]>();
  const walk = (start: string, path: string[]): void => {
    const cur = path[path.length - 1];
    for (const nx of nb(cur, true)) {
      if (banned.has(nx)) continue;
      if (nx === start && path.length >= 3) {
        const key = [...path].sort().join('|');
        const dir = (idx.get(path[1]) as number) < (idx.get(path[path.length - 1]) as number);
        if (dir && !found.has(key)) found.set(key, path.slice());
      } else if (!path.includes(nx) && path.length < 5 && (idx.get(nx) as number) > (idx.get(start) as number)) walk(start, [...path, nx]);
    }
  };
  for (const r of rooms) if (!banned.has(r.id)) walk(r.id, [r.id]);
  const cycles = [...found.values()];
  const want = act === 1 ? 1 : 2;
  const defs = act === 1 ? [pick(rng, 'map', pool)] : shuffle(rng, 'map', pool).slice(0, 2);
  if (!cycles.length || defs.length < want) return null;
  const elites: RoamingElite[] = [];
  const avail = shuffle(rng, 'map', cycles);
  defs.forEach((defId, i) => {
    const patrol = avail[i % avail.length];
    elites.push({ defId, patrol: patrol.slice(), at: R(patrol.length), defeated: false });
  });

  // reveals: the Lamplighter shows every room's kind; the beacon shows act 3's door and every elite's whole patrol
  if (opts.revealRooms) for (const r of rooms) r.revealed = true;
  if (opts.beacon && act === 3) {
    door.revealed = true;
    for (const e of elites) for (const id of e.patrol) (rooms.find((r) => r.id === id) as Room).revealed = true;
  }
  return { section: { act, rooms, passages, entry: entry.id, door: door.id }, elites };
}

/** Generate one act's section: 16 to 20 rooms on 5 to 6 floors, connected, at least two loops, entry at the bottom,
 * the warden's door at the top, shortest entry-to-door path at most MAX_SHORTEST_PATH moves, room counts per rules 4.4,
 * fight encounters rolled from the act's pools by floor depth. */
export function generateSection(rng: RngState, act: 1 | 2 | 3, opts: SectionOpts = {}): { section: ActSection; elites: RoamingElite[] } {
  for (let i = 0; i < 200; i++) {
    const r = attempt(rng, act, opts);
    if (r) return r;
  }
  throw new Error(`generateSection: no valid layout for act ${act}`);
}

const roomOf = (run: RunState, id: string | undefined): Room | undefined => run.section?.rooms.find((r) => r.id === id);

function enter(run: RunState, id: string): void {
  const s = run.section as ActSection;
  const r = roomOf(run, id) as Room;
  r.visited = true;
  r.revealed = true;
  for (const p of s.passages) {
    if (p.a === id) (roomOf(run, p.b) as Room).revealed = true;
    else if (p.b === id) (roomOf(run, p.a) as Room).revealed = true;
  }
  run.floor = Math.max(run.floor, r.floor + 1);
}

/** Start the act's climb on a run: section, elites, hour 0, hours from the run's mode, the player at the entry
 * (revealed with its neighbors). Called by newRun for act 1 and after each warden for the next act. */
export function startAct(run: RunState, act: 1 | 2 | 3): void {
  const patch = run.config.mapPatch;
  const { section, elites } = generateSection(run.rng, act, patch);
  run.act = act;
  run.section = section;
  run.elites = elites;
  run.hour = 0;
  // the lit beacon: act 3 has 1 extra hour (the base is kept so starting act 3 twice does not add twice)
  const base = run.flags.beaconHour && run.hours !== undefined ? run.hours - 1 : (run.hours ?? DEFAULT_HOURS);
  run.flags.beaconHour = !!patch?.beacon && act === 3;
  run.hours = hoursFor(run, base + (run.flags.beaconHour ? 1 : 0)); // B10b hook (modes-overwind)
  run.scrap = run.scrap ?? run.config.cogs;
  run.keys = run.keys ?? 0;
  run.prepared = undefined;
  run.overwound = false;
  run.flags.wardenFight = false;
  run.flags.eliteMet = false;
  run.recentEncounters = [];
  run.roomId = section.entry;
  run.nodeId = null;
  run.floor = 0;
  run.combat = null;
  run.pending = null;
  run.phase = 'section';
  enter(run, section.entry);
}

/** Room ids connected to the player's room by an unlocked passage. */
export function connectedRooms(run: RunState): string[] {
  if (!run.section || !run.roomId) return [];
  const id = run.roomId;
  return run.section.passages.filter((p) => !p.locked && (p.a === id || p.b === id)).map((p) => (p.a === id ? p.b : p.a));
}

export function hoursLeft(run: RunState): number {
  return Math.max(0, (run.hours ?? DEFAULT_HOURS) - (run.hour ?? 0));
}

/** Each undefeated elite's next room (for the act screen). */
export function elitesNext(run: RunState): { defId: string; at: string; next: string }[] {
  return (run.elites ?? [])
    .filter((e) => !e.defeated)
    .map((e) => ({ defId: e.defId, at: e.patrol[e.at], next: e.patrol[(e.at + 1) % e.patrol.length] }));
}

function startEliteFight(run: RunState, defId: string): void {
  run.flags.eliteMet = true;
  startCombat(run, [defId], 'elite');
}

/** Every undefeated elite steps one room along its patrol; returns the first one now in the player's room. */
function stepElites(run: RunState): RoamingElite | null {
  let hit: RoamingElite | null = null;
  const steps = eliteSteps(run); // B10b hook (modes-overwind): Overwind 5
  for (const e of run.elites ?? []) {
    if (e.defeated) continue;
    for (let s = 0; s < steps; s++) {
      e.at = (e.at + 1) % e.patrol.length;
      if (!hit && e.patrol[e.at] === run.roomId) hit = e;
    }
  }
  return hit;
}

/** One extra hour passes (resting at an oil station, picking a lock): every undefeated elite steps along its patrol.
 * No fight starts here: `afterRoom` (called when the screen is left, or by pickLock) starts the fight of an elite that
 * stepped into the player's room, after the midnight check. */
export function spendHour(run: RunState): void {
  run.hour = (run.hour ?? 0) + 1;
  stepElites(run);
}

/** The player's room does its business: a fight, an event, a screen; or nothing (then the midnight check runs). */
export function resolveRoom(run: RunState): void {
  const r = roomOf(run, run.roomId);
  if (!r) return;
  run.combat = null;
  run.pending = null;
  if (r.kind === 'fight' && !r.cleared) {
    startCombat(run, (r.encounter ?? []).slice(), 'fight');
    return;
  }
  if (r.kind === 'vault' && !r.cleared) {
    startCombat(run, [r.guardian ?? 'gearhound'], 'elite');
    return;
  }
  if (r.kind === 'event' && !r.cleared) {
    run.pending = { kind: 'event', eventId: r.eventId ?? 'teacup' };
    run.phase = 'event';
    return;
  }
  if (r.kind === 'workbench') {
    run.pending = { kind: 'workbench', usedUpgrade: false, usedRemove: false, usedFuse: false };
    run.phase = 'workbench';
    return;
  }
  if (r.kind === 'trader') {
    run.pending = { kind: 'trader', stock: traderStock(run) };
    run.phase = 'trader';
    return;
  }
  if (r.kind === 'oil') {
    run.pending = { kind: 'oil', done: !!r.used };
    run.phase = 'oil';
    return;
  }
  afterRoom(run);
}

/** Walk to a connected room: +1 hour, reveal, elite collisions, elites step, the room resolves (combat, event,
 * screen), midnight check after it resolves (see the brief's order). Returns false if not connected or not allowed now. */
export function moveTo(run: RunState, roomId: string): boolean {
  if (!run.section || run.phase !== 'section' || !connectedRooms(run).includes(roomId)) return false;
  run.hour = (run.hour ?? 0) + 1;
  run.roomId = roomId;
  enter(run, roomId);
  const here = (run.elites ?? []).find((e) => !e.defeated && e.patrol[e.at] === roomId);
  if (here) {
    startEliteFight(run, here.defId);
    return true;
  }
  const hit = stepElites(run);
  if (hit) {
    startEliteFight(run, hit.defId);
    return true;
  }
  resolveRoom(run);
  return true;
}

function startWarden(run: RunState, overwound: boolean, prepared = 0): void {
  const boss = ENCOUNTERS.find((e) => e.act === run.act && e.tier === 'boss');
  if (!boss) throw new Error(`no warden for act ${run.act}`);
  run.flags.wardenFight = true;
  run.overwound = overwound;
  run.prepared = prepared;
  run.pending = null;
  startCombat(run, boss.enemies.slice(), 'boss', { overwound, prepared });
}

/** At the warden's door: pay the bell (Scrap and Brass per hour left), set `prepared`, start the warden fight. */
export function ringBell(run: RunState): boolean {
  if (!run.section || run.phase !== 'section' || run.roomId !== run.section.door || run.flags.wardenFight) return false;
  const left = hoursLeft(run);
  addScrap(run, BELL_SCRAP_PER_HOUR * left);
  run.stats.bonusBrass = (run.stats.bonusBrass ?? 0) + BELL_BRASS_PER_HOUR * left;
  run.stats.brassEarned += BELL_BRASS_PER_HOUR * left;
  (run.stats.bells ??= []).push({ act: run.act, hoursLeft: left });
  startWarden(run, false, Math.min(2, Math.floor(left / 3)));
  return true;
}

function lockedHere(run: RunState, passage: number): Passage | null {
  const p = run.section?.passages[passage];
  if (!p || !p.locked || run.phase !== 'section' || (p.a !== run.roomId && p.b !== run.roomId)) return null;
  return p;
}

/** Open a locked passage with a Spire Key (no hour). */
export function useKey(run: RunState, passage: number): boolean {
  const p = lockedHere(run, passage);
  if (!p || (run.keys ?? 0) < 1) return false;
  run.keys = (run.keys ?? 0) - 1;
  delete p.locked;
  return true;
}

/** Pick a locked passage's lock: 25 Scrap and 1 hour (elites step; an elite stepping in starts its fight, else the
 * midnight check runs). */
export function pickLock(run: RunState, passage: number): boolean {
  const p = lockedHere(run, passage);
  if (!p || (run.scrap ?? 0) < LOCK_PICK_SCRAP) return false;
  run.scrap = (run.scrap ?? 0) - LOCK_PICK_SCRAP;
  delete p.locked;
  spendHour(run);
  afterRoom(run);
  return true;
}

/** Called when a room's business is done (combat settled, event chosen, screen left): midnight check (the warden comes), then an elite that
 * stepped into the player's room fights, else back to 'section'. */
export function afterRoom(run: RunState): void {
  if (!run.section || run.phase === 'combat' || run.phase === 'victory' || run.phase === 'defeat' || run.flags.wardenFight) return;
  run.pending = null;
  run.combat = null;
  if ((run.hour ?? 0) >= (run.hours ?? DEFAULT_HOURS)) {
    startWarden(run, true);
    return;
  }
  const meet = (run.elites ?? []).find((e) => !e.defeated && e.patrol[e.at] === run.roomId);
  if (meet) {
    startEliteFight(run, meet.defId);
    return;
  }
  run.phase = 'section';
}
