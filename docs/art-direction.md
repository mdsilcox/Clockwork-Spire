# Clockwork Spire: art direction (v2)

The owner chose the art trial's look, refined (D4.1), painted part sprites turned by code (D4.2), and generated paintings for characters, enemies and illustrations (D-026). Code stays the tool for effects, UI and motion. Every painting is generated with `art/style.json` through `art/gen.py`; nothing else is a source.

## Mood board
Reference images, in the repo:
- `art/trial/sprocket/sprocket_cut.png` and `art/trial/foreman/foreman_cut.png`: the two rigged samples the owner liked. They are the bar.
- `art/trial/_sheet_sprocket.png`, `art/trial/_sheet_foreman.png`: the first stills (the framed, vignetted ones are what we no longer do: no frames, no circles, no scenery behind characters).
- v2 picks: `art/sprocket/source.png`, `art/boilermaker/source.png`, `art/cog-rat/source.png`, `art/title/source.png`.

In words: a storybook steampunk picture book, painted, with confident black ink outlines. Warm metal (brass, copper, gold leaf) against cool teal enamel and dusk skies; amber light from furnaces, lamps and glass eyes. Busy mechanical detail inside a simple, readable silhouette.

## Palette
Paintings carry their own color; the game's UI and effects (`src/render/palette.ts`, the one color source) are tuned to sit beside them.
| Role | Hex | Use |
|---|---|---|
| Brass | #C9A24A | metal highlights, UI gold, rarity Rare |
| Copper | #B8683A | warm metal, Uncommon |
| Teal enamel | #1F6F6B | cool body color, shadows |
| Deep teal | #10393F | backdrops, panels |
| Dusk amber | #F2A65A | skies, lamplight |
| Furnace glow | #FFB547 | glows, eyes, heat effects (code) |
| Ink | #14100C | outlines, text on light |
| Steam | #E8EEF0 at 40 to 70% | steam and smoke (code) |
Rarity colors (UI): Common iron #8C8F94, Uncommon copper, Rare brass, Masterwork teal-glow #3FD1C2, Legendary furnace #FFB547 with a slow shimmer.

**Tier marks (B9b).** Every item card shows its tier as a small mark, color plus a shape so it never relies on color alone: Common none, Uncommon one notch (copper), Rare a diamond (brass), Masterwork a cog (teal-glow), Legendary a star (furnace, with the slow shimmer). One component, `TierMark` (`src/ui/TierMark.tsx`, class `tier tier-<rarity>`, `data-testid="tier-mark"`), on the hand, the board tooltip, salvage, trader, fuse, vault, reward, trophy shelf and bin cards. It is 12 px and sits beside the name, so a card never changes size.

## Line, shading and light
- Black ink outlines, thicker on the silhouette than inside. No soft airbrushed edges on characters.
- Soft painterly shading with visible strokes; flat-ish areas of color; no photo texture.
- Key light from the upper left on every asset (in `style.json`), so a cast placed side by side agrees. Rim light comes from code effects, not the painting.

## Scale, proportion and view
| Asset kind | View | Generated at | Shown at (desktop / phone 667x375) |
|---|---|---|---|
| Sprocket, the tinker | profile, facing left | 1216x832 | 180 / 110 px tall |
| Small and medium enemies | profile facing left, or front if the machine is symmetrical | 1216x832 or 896x1152 | 160 to 220 / 100 to 130 px |
| Elites | front or three-quarter, facing left | 896x1152 | 240 / 150 px |
| Bosses | front, symmetrical, arms clear of the body | 896x1152 | 360 / 220 px |
| Machine parts | straight on, centered | 1024x1024, cut to a square sprite | one board cell (about 96 / 56 px) |
| Scenes (title, acts, Bellfoot) | wide, layered | 1216x832, extended in code | full screen, cropped per aspect |
- Enemies face left, toward the player's machine. A profile painted facing right is flipped in code (paintings have no text, so flipping is free).
- **Detail density (owner, D-034)**: friends (Sprocket, the tinker, Bellfoot's people) are simple, flat and warm; the Spire's machines are intricate, with readable parts to break. The contrast is deliberate.
- Scenes are generated, then repainted at 2x with a low-denoise high-resolution pass, so they stay sharp full screen on 2x displays.
- Proportions are storybook: big heads and eyes on small creatures, heavy torsos on brutes, a readable silhouette at 100 px tall.
- Every enemy's breakable parts must be visible in its painting (machine against machine): a jaw, a gauge, a furnace door, a drill. Each rig names them as **anchors** (see below) so the game can mark, crack and break them.

## Motion (code, through `rig.js`)
- Characters are one painting each on a WebGL mesh bent by bones (`art/lib/rig.js`, never edited per asset). A pose the painting can't reach (lying down, turning to face the camera) is a second painting from the same seed family.
- Every rig has at least `idle` (breathing, never frozen), `attack` (windup, impact, recover), `hurt`. Bosses add `phase` (a part breaks, the body reacts). Sprocket has `idle`, `happy`, `sleepy` and `walk`.
- Rotations stay under about 90 degrees per joint; the far joint does more of the work; `part`/`tear` wherever two separate pieces sit side by side (legs beside legs, an arm beside a staff).
- Effects are code on the overlay canvas: furnace and eye glow, steam, sparks, dust, screen shake, hurt flash, part cracks, salvage pop. They use the palette above.

## Rig contract (what every asset folder holds)
```
art/<asset>/
  candidates/        8 seeds + _sheet.png (local only, gitignored except prompt.json)
  source.png         the picked seed
  cut.png            the cut-out (art/lib/keymask.py repairs rembg on flat backdrops)
  <asset>.template.html   copy of art/lib/example-foreman.template.html, edited
  <asset>.html       built with art/lib/inline.py (self-contained)
  rig.json           { "size": [w, h], "view": "front|profile", "facing": "left|right",
                       "feet": y, "moods": ["idle", ...],
                       "anchors": { "<partId>": [x, y, r] } }   image pixels
  frames/            recorded with art/lib/record.mjs (gitignored)
  clip.webp          art/lib/clip.py, one clip of every mood (committed; the owner sees it)
  notes.md           joints, regions, what was tricky
```
`window.rig` exposes `ready`, `setMood(name)`, `seq(name)` (deterministic frames for recording) and, for the game, `anchor(id)` returning the anchor's current deformed screen position (so the UI can pin a part's HP pip, intent icon and crack effect to it).

## The quality bar
"Would pass in a commercial indie game." Concretely, the art-reviewer fails an asset for:
- smears, stretched texture or seams at any recorded frame (check the windup, impact and lie-down extremes, not the rest pose);
- halos, gray backdrop specks or a cast-shadow line left in the cut-out;
- a limb or prop that detaches, clips through the body or swings past a joint's range;
- an idle that freezes or loops visibly;
- off-style seeds: framed, vignetted, photo-real, 3D-looking, or a different light direction;
- unreadable at phone size (check a 110 px tall frame).

## Asset kinds and sources
| Kind | Source | Motion |
|---|---|---|
| Characters, enemies, bosses | generated painting, cut out, rigged | rig.js moods plus code effects |
| Event and journal illustrations | generated stills | gentle code parallax, light flicker |
| Scenes: title, Bellfoot, the three act cross-sections | generated stills, extended and layered in code | code steam, lamps, clouds, clock hands |
| Machine parts | generated sprites, cut out | code rotation, pulses, glow, badges |
| UI, icons, intents, statuses, numbers | code (DOM and canvas) | code |
| Effects | code | code |
