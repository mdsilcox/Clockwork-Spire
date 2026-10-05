// The Bellfoot street as a painted, layered scene (B10a.3, art lane): the sky and the Spire, the street with its fronts, and a
// foreground. Built by art/bellfoot/build.py from generated pieces and shipped by `npm run art` (scripts/art.mjs, SCENES;
// 600 KB for the whole scene). The layers and their sizes: sky 1800x800 (parallax 0.3: it needs to cover the street's width
// less what it is not shifted), street 2400x800 (the scene itself), foreground 2400x800 (lamp posts and a shade at the foot).
// Every place's front stands at its contract anchor (src/ui/town.ts) on GROUND_Y; the anchors here are those, so the painted
// and the code-drawn street agree. Set `BELLFOOT` to null to fall back to the code-drawn street (D-033).
import { ALL_PLACES, GROUND_Y, SCENE_H, SCENE_W } from '../../ui/town';

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
  /** Where the code ambience goes over the painting: lantern centers (the foreground's lamp posts) and chimney mouths, scene units. */
  ambience?: { lamps: [number, number][]; chimneys: [number, number][] };
}

export const BELLFOOT: SceneDef | null = {
  id: 'bellfoot',
  size: [SCENE_W, SCENE_H],
  layers: [
    { src: 'art/bellfoot/sky.webp', parallax: 0.3 },
    { src: 'art/bellfoot/street.webp', parallax: 1 },
    { src: 'art/bellfoot/foreground.webp', parallax: 1 },
  ],
  anchors: Object.fromEntries(ALL_PLACES.map((p) => [p.id, [p.x, GROUND_Y] as [number, number]])),
  ambience: {
    lamps: [360, 1000, 1320, 1590].map((x) => [x, 480] as [number, number]),
    chimneys: [
      [600, 300],
      [1560, 250],
    ],
  },
};
