# A1 Art: the act 1 cast (shared brief)

Production of act 1's characters in the signed-off style. Everything in `docs/briefs/D4-art-samples.md` (the recipe, tools, rules and report) applies; read it, then this. The standard is `docs/art-direction.md`; the owner's signed-off samples are `art/sprocket/`, `art/boilermaker/`, `art/cog-rat/` (open their `.html` pages and read their `notes.md`: they solved most of what you'll meet).

## What the owner said about the samples (apply it to every asset)
- Motion must look natural for the creature: overlapping action (head leads, body follows, tail or cloth trails), twitch and hold rather than constant wobble, feet plant and lift (no gliding), no shear or rubbery stretch. The rat's round 4 notes (`art/cog-rat/notes.md`) are the reference.
- Mouths and faces: if an expression needs a mouth the painting doesn't have, ask the orchestrator for a masked repaint (as Sprocket's happy muzzle); never draw a mouth in code.
- Effects are flat, ink-edged, two-tone shapes (steam, sparks, debris); hit flashes at most 0.25 for 2 to 3 frames with the body opaque; a small ink-edged hit star at the hit anchor.
- Detail density (D-034): friends simple and warm (the tinker), machines intricate.

## The game's needs (B7 and B8 use these rigs)
- Every enemy rig has `idle`, `attack`, `hurt`, `death` and one **anchor per content.md part id** (exactly the ids in `docs/content.md` section 3.1 and 3.2, e.g. `mite-pincers`, `mite-gland`), plus `core` (the body's center, where the core marker sits) and `eyes`. Anchors are where the game pins each part's HP, intent and crack, and where hit stars appear. A part's broken look uses the `broken` state flag pattern from `art/boilermaker/boilermaker.template.html` (a cracked overlay drawn at the anchor, sized to the part) and must work in every mood.
- Enemies face left. Record with `art/lib/record.mjs`; clip with `art/lib/clip.py`.
- `rig.json` lists `moods`, `durations`, `anchors` (all part ids plus `core` and `eyes`), `size`, `view`, `facing`, `feet`.

## Assets (picked seed in `art/<asset>/source.png`, cut-out in `cut.png`, prepared by the orchestrator)
| Asset | Lane | Port | Moods | Anchors (content.md part ids) | Notes |
|---|---|---|---|---|---|
| tinker | tinker-art | 8781 | idle 4, walk 2, cheer 3, hurt 1.5 | hand, head, satchel | The player; faces right; simple and warm like Sprocket. The walk is the hardest rig in A1: legs with part/tear, arms swinging opposite. |
| foreman | foreman-art | 8782 | idle 4, attack 2.8, hurt 1.8, phase 4, death 3 | foreman-wrench, foreman-grate, foreman-apron, foreman-bulwark, foreman-rivet, core, eyes | Warden, front view. `phase`: the apron tears away and the bolted Boiler Plate shows; `art/foreman/cut-phase2.png` (a masked repaint, ready when you start) is the phase 2 body; crossfade as Sprocket's happy layer does. Death: he sinks to one knee, the furnace dies down. |
| rust-mite, brass-beetle | act1-bugs | 8783 | idle, attack, hurt, death | mite-pincers, mite-gland; beetle-mandibles, beetle-shell, beetle-carapace | Small and quick; six legs: animate in alternating tripods, small swings. |
| oil-slick, spring-imp | act1-oddities | 8784 | idle, attack, hurt, death | slick-nozzle, slick-spitter; imp-tail, imp-key | The slick is a squat tank: wobble the oil, not the iron; the imp's coil tail springs. |
| gearhound | gearhound-art | 8785 | idle, attack, hurt, death | hound-fangs, hound-snout, hound-haunch | Elite; a lean hound: quadruped gait cues from Sprocket's walk, but predatory (low head, stalking idle). |
| tinpot-general | tinpot-art | 8786 | idle, attack, hurt, death, buff 2 | tinpot-horn, tinpot-bugle, tinpot-sabre, tinpot-hat | Elite, front view; pompous; `buff`: raises the bugle and blows (flat ink sound rings). |

## Rules
- Same as D4: own only `art/<your asset>/**`; never edit `art/lib/**`, `art/style.json`, `docs/**`, `src/**`; never start ComfyUI (ask for repaints in your report or by stopping early); never commit; stop your server by PID.
- CPU: six lanes share the machine. Iterate on single moods in the browser; record the full set once, at the end.
- Report as in D4, plus which anchors you placed and how the broken look reads on each part.
