// The RigHub: one shared WebGL context that draws every painted character and is composited into the Canvas 2D
// stage each frame (D-033, docs/spike-art.md). B8 CONTRACT: the API is fixed; the rig-hub lane implements it.
import type { CharacterDef } from '../art/types';

export interface RigRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RigHandle {
  setMood(mood: string): void;
  /** Mark enemy parts broken (draws the notched broken look at their anchors). */
  setBroken(partIds: string[]): void;
  /** Crossfade a stacked layer (0..1), e.g. the Foreman's phase 2. */
  setLayer(name: string, mix: number): void;
  setRect(rect: RigRect): void;
  /** An anchor's current position in stage CSS pixels: [x, y, radius], or null before the first frame. */
  anchor(id: string): [number, number, number] | null;
  dispose(): void;
}

export interface RigHub {
  add(def: CharacterDef, rect: RigRect): RigHandle;
  /** Draw every live rig into the stage, once per stage frame. */
  frame(ctx: CanvasRenderingContext2D, now: number): void;
  resize(width: number, height: number, dpr: number): void;
  /** Fetch and decode an act's textures ahead of time (0 = Bellfoot and the player). */
  loadAct(act: 0 | 1 | 2 | 3): Promise<void>;
  /** True when WebGL is available and the context is live (otherwise the stage draws the code fallback). */
  ready(): boolean;
}

export function createRigHub(): RigHub {
  throw new Error('B8: createRigHub not implemented');
}
