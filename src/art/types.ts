// Painted characters in the game (D-033, docs/spike-art.md). B8 CONTRACT: these shapes are fixed; the rig-hub lane
// converts each passed rig in art/<asset>/ into a CharacterDef module in src/art/<asset>.ts and generates manifest.ts.

export type Pose = Record<string, number | number[] | null | undefined>;

/** The rig.js character contract plus id and textures. `weights` and `deform` are pure. Coordinates are painting pixels. */
export interface CharacterDef {
  id: string; // the enemy def id (or 'sprocket', 'tinker')
  size: [number, number];
  grid: [number, number]; // half the toolkit's density (D-033)
  pad: [number, number];
  /** Texture URLs relative to the base URL; `layers` are extra stacked paintings with identical geometry
   * (Sprocket's happy muzzle, the Foreman's phase 2), crossfaded by `layer` in the pose. */
  texture: { regular: string; boss?: string; layers?: Record<string, string> };
  facing: 'left' | 'right';
  weights(x: number, y: number): Record<string, number>;
  deform(x: number, y: number, w: Record<string, number>, P: Pose): [number, number];
  part?(x: number, y: number): string;
  tear?(x: number, y: number): boolean;
  moods: Record<string, Record<string, number>>;
  /** Advance the pose: live mood values eased toward the mood's targets, t in seconds since mount, dt the frame step. */
  pose(live: Record<string, number>, t: number, dt: number, state: Record<string, unknown>, mood: string): Pose;
  under?(ctx: CanvasRenderingContext2D, P: Pose, t: number): void;
  over?(ctx: CanvasRenderingContext2D, P: Pose, t: number): void;
  /** One per content.md part id, plus 'core' and 'eyes': [x, y, radius] in painting pixels. */
  anchors: Record<string, [number, number, number]>;
}

export interface ManifestEntry {
  id: string;
  act: 0 | 1 | 2 | 3; // 0 = Bellfoot and the player
  files: { path: string; bytes: number }[];
  source: string; // the art/<asset>/ folder it was built from
}
