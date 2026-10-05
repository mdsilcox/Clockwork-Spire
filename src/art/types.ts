// Painted characters in the game (D-033, docs/spike-art.md). B8 CONTRACT: these shapes are fixed; the rig-hub lane
// converts each passed rig in art/<asset>/ into a CharacterDef module in src/art/<asset>.ts and generates manifest.ts.
// rig-hub additions (all optional, so the B8.0 contract holds): `RigView`, the `view` argument of pose/under/over,
// `onMood`, `ease`, `durations`, `notches`, `sprites`.

/** Pose values. Two names are read by the hub: `flash` (0..1, whitens the painting) and `tint` (12 numbers: a 3x3 color matrix, column-major, then an added color) for light that changes with the mood. */
export type Pose = Record<string, number | number[] | null | undefined>;

/**
 * What a character's code sees of its live rig: the mood, its scratch state (a new object after each mood change; the
 * hub keeps `state.broken` = { partId: true } across moods), the last drawn pose and the painting. The hub passes the same
 * view to pose, under and over; Vitest and tools may omit it (see `makeView` in kit.ts).
 */
export interface RigView {
  mood: string;
  state: Record<string, unknown>;
  lastP: Pose | null;
  /** Where a painting pixel is in the last drawn pose (painting px; add pad for the draw space). */
  point(x: number, y: number, P: Pose): [number, number];
  /** Alpha 0..255 of the intact painting at a painting pixel (0 until its texture has loaded). */
  alpha(x: number, y: number): number;
  /** The painting, for code that draws it again (hit flashes): draw it at (0, 0, size[0], size[1]). Null until loaded. */
  image: CanvasImageSource | null;
  /** The def's `texture.sprites` once loaded, by name. */
  sprites: Record<string, CanvasImageSource>;
  /** Crossfade mixes set with RigHandle.setLayer (0..1), by layer name. */
  layers: Record<string, number>;
  /** The warden phase the painting shows, 0-based (the Clockmaker's look, the Foreman's painting); the character moves it when its phase mood shifts the look. */
  phase: number;
}

/** The rig.js character contract plus id and textures. `weights` and `deform` are pure. Coordinates are painting pixels. */
export interface CharacterDef {
  id: string; // the enemy def id (or 'sprocket', 'tinker')
  size: [number, number];
  grid: [number, number]; // half the toolkit's density (D-033)
  pad: [number, number];
  /** Texture URLs relative to the base URL; `layers` are extra stacked paintings with identical geometry
   * (Sprocket's happy muzzle, the Foreman's phase 2), crossfaded by `layer` in the pose. `sprites` are other paintings
   * the character draws itself in under/over (the Tinpot General's hat and blade), loaded with the rest. */
  texture: { regular: string; boss?: string; layers?: Record<string, string>; sprites?: Record<string, string> };
  facing: 'left' | 'right';
  weights(x: number, y: number): Record<string, number>;
  deform(x: number, y: number, w: Record<string, number>, P: Pose): [number, number];
  part?(x: number, y: number): string;
  tear?(x: number, y: number): boolean;
  moods: Record<string, Record<string, number>>;
  /** Eases the live mood values toward the mood's targets: the speed (default 3). */
  ease?: number;
  /** Seconds each mood's timeline lasts (rig.json `durations`); the stage returns to idle after attack and hurt. */
  durations?: Record<string, number>;
  /** Called when the mood changes (and once at the start) so the character resets its timeline. */
  onMood?(mood: string, view: RigView): void;
  /** Advance the pose: live mood values eased toward the mood's targets, t in seconds since mount, dt the frame step. */
  pose(live: Record<string, number>, t: number, dt: number, state: Record<string, unknown>, mood: string, view?: RigView): Pose;
  under?(ctx: CanvasRenderingContext2D, P: Pose, t: number, view?: RigView): void;
  over?(ctx: CanvasRenderingContext2D, P: Pose, t: number, view?: RigView): void;
  /** Per part id, the jagged rest-pose polygon (painting px) erased from the painting when the part is broken. */
  notches?: Record<string, [number, number][]>;
  /**
   * Bakes the broken look into a copy of each painting (the base, name '', and every layer): the hub has drawn the
   * painting scaled to `size` onto `g`; draw ember, rim and cracks, erase notches. `img` is the painting itself (draw
   * it at (0, 0, size[0], size[1]) to mask against its shape). Used instead of `notches` when present.
   */
  bakeBroken?(g: CanvasRenderingContext2D, img: CanvasImageSource, layer: string, broken: Record<string, boolean>): void;
  /** One per content.md part id, plus 'core' and 'eyes': [x, y, radius] in painting pixels. */
  anchors: Record<string, [number, number, number]>;
}

export interface ManifestEntry {
  id: string;
  act: 0 | 1 | 2 | 3; // 0 = Bellfoot and the player
  files: { path: string; bytes: number }[];
  source: string; // the art/<asset> folder it was built from
}
