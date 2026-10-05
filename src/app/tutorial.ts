// The v2 tutorial (B10d; docs/briefs/B10d-front-door.md "Round 2"). B10d.0 CONTRACT: the frozen interfaces and the script as
// data. The tutorial lane owns the body of `startTutorial`; the title lane calls it. Nothing here touches saves: the first-launch
// key stays `cs.tutorialDone === '1'` (the 21 specs that skip the tutorial set it) and the v2 tutorial also sets `cs.tutorialV2Seen`.
import { markTutorialV2Seen as markSeen, tutorialDone as done, tutorialV2Seen as seen } from './prefs';
import { TUTORIAL_CLOSING } from '../core/content/story';

/** Start the v2 tutorial (a guided fight against `tutorial-rig`; skippable, replayable). Stashes and restores an in-progress practice fight. */
export function startTutorial(): void {
  throw new Error('B10d');
}

/** True once the tutorial (v1's or v2's) was finished or skipped: `cs.tutorialDone`. */
export function tutorialDone(): boolean {
  return done();
}

/** True once the v2 tutorial was started or skipped: `cs.tutorialV2Seen`. */
export function tutorialV2Seen(): boolean {
  return seen();
}

export function markTutorialV2Seen(): void {
  markSeen();
}

/** What the player does at a step. Cells are board names ('B2'); `target` is a target-order ref. */
export type TutorialAction =
  | { kind: 'place'; hand: number; cell: string }
  | { kind: 'target'; ref: string }
  | { kind: 'run' }
  | { kind: 'keep'; item: number } // the salvage tray (a fabricated pending held by the tutorial UI, not a run)
  | { kind: 'continue' };

export interface TutorialStep {
  id: string;
  /** Forced hand for this step, part def ids in hand order (turn 1 draws exactly this). */
  hand?: string[];
  /** The coach line. Short; warm, curious, a little melancholy. */
  prompt: string;
  expect: TutorialAction;
}

export interface TutorialScript {
  seed: number;
  enemy: 'tutorial-rig';
  hp: number;
  /** v1's safeguard kept: the tutorial can't be lost. */
  gentle: true;
  steps: TutorialStep[];
  /** Sprocket's closing line (content/story.ts). */
  closing: string;
}

export const TUTORIAL_SCRIPT: TutorialScript = {
  seed: 7,
  enemy: 'tutorial-rig',
  hp: 30,
  gentle: true,
  steps: [
    { id: 'place-1', hand: ['spur', 'spur', 'escapement'], prompt: 'Motion starts at the Mainspring. Put a Spur Gear next to it.', expect: { kind: 'place', hand: 0, cell: 'B2' } },
    { id: 'place-2', prompt: 'Motion passes along. Put the second Spur Gear next to the first.', expect: { kind: 'place', hand: 0, cell: 'C2' } },
    { id: 'target', prompt: 'The Strut attacks every turn. Tap it to aim your Strikes there.', expect: { kind: 'target', ref: 'e0.rig-strut' } },
    { id: 'run', prompt: 'Now Run. The preview says what will happen.', expect: { kind: 'run' } },
    { id: 'break', prompt: 'The Strut broke, and its attack went with it. Broken parts can be salvaged.', expect: { kind: 'continue' } },
    { id: 'salvage', prompt: 'Keep the Spur Gear or scrap it for Scrap. Your choice.', expect: { kind: 'keep', item: 0 } },
  ],
  closing: TUTORIAL_CLOSING,
};
