// The climb: act sections, moves, the Spire clock, roaming elites, the bell, doors and keys
// (docs/rules.md 4.1 to 4.6; semantics in docs/briefs/B8-the-climb.md). B8 CONTRACT: signatures fixed;
// the climb-core lane implements the bodies. Pure and deterministic (the `map` stream for generation).
import type { RngState } from './rng';
import type { ActSection, RoamingElite, RunState } from './types';

export const DEFAULT_HOURS = 12; // Journeyman (rules 5.7)
export const MAX_SHORTEST_PATH = 5; // entry to door, in moves (rules 4.1)
export const BELL_SCRAP_PER_HOUR = 6;
export const BELL_BRASS_PER_HOUR = 2;
export const LOCK_PICK_SCRAP = 25;

export interface SectionOpts {
  /** Landmarks that change generation (B10): e.g. 'lift' adds the Gearworks shortcut. */
  landmarks?: string[];
}

/** Generate one act's section: 16 to 20 rooms on 5 to 6 floors, connected, at least two loops, entry at the bottom,
 * the warden's door at the top, shortest entry-to-door path at most MAX_SHORTEST_PATH moves, room counts per rules 4.4,
 * fight encounters rolled from the act's pools by floor depth. */
export function generateSection(rng: RngState, act: 1 | 2 | 3, opts: SectionOpts = {}): { section: ActSection; elites: RoamingElite[] } {
  void rng;
  void act;
  void opts;
  throw new Error('B8: generateSection not implemented');
}

/** Start the act's climb on a run: section, elites, hour 0, hours from the run's mode, the player at the entry
 * (revealed with its neighbors). Called by newRun for act 1 and after each warden for the next act. */
export function startAct(run: RunState, act: 1 | 2 | 3): void {
  void run;
  void act;
  throw new Error('B8: startAct not implemented');
}

/** Room ids connected to the player's room by an unlocked passage. */
export function connectedRooms(run: RunState): string[] {
  void run;
  throw new Error('B8: connectedRooms not implemented');
}

/** Walk to a connected room: +1 hour, reveal, elite collisions, elites step, the room resolves (combat, event,
 * screen), midnight check after it resolves (see the brief's order). Returns false if not connected or not allowed now. */
export function moveTo(run: RunState, roomId: string): boolean {
  void run;
  void roomId;
  throw new Error('B8: moveTo not implemented');
}

export function hoursLeft(run: RunState): number {
  void run;
  throw new Error('B8: hoursLeft not implemented');
}

/** Each undefeated elite's next room (for the act screen). */
export function elitesNext(run: RunState): { defId: string; at: string; next: string }[] {
  void run;
  throw new Error('B8: elitesNext not implemented');
}

/** At the warden's door: pay the bell (Scrap and Brass per hour left), set `prepared`, start the warden fight. */
export function ringBell(run: RunState): boolean {
  void run;
  throw new Error('B8: ringBell not implemented');
}

/** Open a locked passage with a Spire Key (no hour). */
export function useKey(run: RunState, passage: number): boolean {
  void run;
  void passage;
  throw new Error('B8: useKey not implemented');
}

/** Pick a locked passage's lock: 25 Scrap and 1 hour (elites step). */
export function pickLock(run: RunState, passage: number): boolean {
  void run;
  void passage;
  throw new Error('B8: pickLock not implemented');
}

/** Called when a room's business is done (combat settled, event chosen, screen left): midnight check, back to 'section'. */
export function afterRoom(run: RunState): void {
  void run;
  throw new Error('B8: afterRoom not implemented');
}
