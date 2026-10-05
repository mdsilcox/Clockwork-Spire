// The Bellfoot street as a painted, layered scene (B10a.3, art lane). B10a.0 CONTRACT: the shape and the export.
// `BELLFOOT` is null until the art lane's painting passes review; null means the street draws code-drawn fronts at the
// same place anchors (src/ui/town.ts), as D-033's fallback.

export interface SceneLayer {
  src: string; // a path under public/art/
  parallax: number; // 0 = fixed, 1 = moves with the street
}

export interface SceneDef {
  id: string;
  /** The scene's size in scene units (the same units as src/ui/town.ts anchors). */
  size: [number, number];
  /** Back to front. */
  layers: SceneLayer[];
  /** Where each place stands, by place id, in scene units: [x, ground y]. Must match the code-drawn street. */
  anchors: Record<string, [number, number]>;
}

export const BELLFOOT: SceneDef | null = null;
