// Events (docs/content.md "Events"). B3 CONTRACT: the shape below is fixed; the run-core lane fills EVENTS
// with all 22 events and implements the choice effects (applied through run.ts chooseEvent).
import type { RunState } from '../types';

export interface EventChoice {
  label: string; // button text, e.g. "Reach in"
  detail: string; // the cost and effect in plain words, e.g. "Lose 6 HP. Gain Sprocket's Collar Tag."
  available?(run: RunState): boolean; // false greys the button (e.g. not enough Cogs)
}

export interface EventDef {
  id: string;
  title: string;
  lines: string[]; // one to three short lines
  sprocket?: boolean;
  act?: 1 | 2 | 3; // limit to one act (optional)
  choices: EventChoice[];
}

export const EVENTS: Record<string, EventDef> = {};
