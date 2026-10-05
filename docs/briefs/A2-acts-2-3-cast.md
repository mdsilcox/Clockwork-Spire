# A2 Art: the act 2 and 3 cast (shared brief)

The rest of the enemy cast, in the signed-off style. Everything in `docs/briefs/D4-art-samples.md` (recipe, tools, rules) and `docs/briefs/A1-act1-cast.md` (the owner's motion notes, the game's needs, the rig contract) applies; read both, then this. Approved references: `art/sprocket/`, `art/boilermaker/`, `art/cog-rat/`, and A1's passed rigs (`art/rust-mite/`, `art/oil-slick/`, `art/gearhound/`, `art/foreman/`, `art/tinpot-general/`); their `notes.md` files solve most of what you'll meet. The art-reviewer's A1 verdicts (`review/A1/wave-1.md` to `wave-3b.md`) list every fault found so far.

## The shared effects spec (A1's three repeat faults; get these right the first time)
1. **Hit flash**: at most 0.25, on the body only (never shadows, puddles or effects), easing to 0 over 3 frames; the body stays opaque. If rig.js's flash reads too strong, draw your own tint over the body as `art/oil-slick/` does.
2. **Effects** (steam, smoke, dust, sparks, rings, smears): flat shapes with a dark ink edge (#14100C, 1.5 to 2.5 px at painting size) and two tones, growing and fading by stepping alpha, never blurred or airbrushed; glows small and hard-edged. Smears follow the weapon's path and fade in 3 to 4 frames.
3. **Broken looks**: per part, bold and part-specific, readable at a 125 px tall frame (220 px for bosses): a jagged notch erased from the painting's alpha within the part (re-upload the texture through the page's own WebGL context as `art/oil-slick/oil-slick.template.html` does; never edit `art/lib/rig.js`), a hard-edged two-tone ember inside the notch, thick ink cracks running out. Support `?broken=id,id` (and `all`).
Also: moods `idle`, `attack`, `hurt`, `death` at least; anchors for every content.md part id plus `core` and `eyes`; enemies face left; record once at the end; `rig.json`, `notes.md`, `clip.webp`.

## Assets (picked seed in `art/<asset>/source.png`, cut-out in `cut.png`, prepared by the orchestrator)
| Asset | Lane | Port | Anchors (content.md part ids) | Notes |
|---|---|---|---|---|
| steam-wraith, valve-crab, furnace-golem, pipe-snake, gauge-gremlin | act2-cast | 8791 | wraith-claw, wraith-vent; crab-pincer, crab-valve; golem-heart, golem-fist; snake-fangs, snake-coil; gremlin-wrench, gremlin-spanner | Five regulars; the wraith is steam in a frame (animate the steam, not the frame); the snake's body is a chain of pipe segments. |
| bell-ringer, chime-moth, hour-knight, echo-sprite, pendulum-blade | act3-cast | 8792 | ringer-clapper, ringer-fist, ringer-rope; moth-wing, moth-dust; knight-sword, knight-shield, knight-visor; sprite-mouth, sprite-fin; blade-edge, blade-weight | Five regulars; the moth flies (wings beat, body bobs); the blade swings (the pendulum is the attack). |
| pressure-warden, twin-pistons | elites-a | 8793 | pw-dome, pw-fist, pw-valve; twin-pistons uses one painting for both twins (the right twin is the same rig mirrored in the game): twinl-ram, twinl-shield, twinl-link (also answering to twinr-*) | Elites, front view. |
| minute-warden, orrery | elites-b | 8794 | minute-mender, minute-hand, minute-needle, minute-dial; orrery-moon1 (Hush), orrery-moon2 (Embers), orrery-moon3 (Dusk), orrery-arm, orrery-ring | The Orrery's moons orbit: draw each moon as a separate cut sprite rotating in code around the ring, so they never smear. |
| clockmaker | clockmaker-art | 8795 | clock-hour, clock-tick, clock-minute, clock-tock, clock-gov, clock-wheel, clock-bell, and the memory parts' ids from content.md 3.6 | The final warden; done last. Moods idle, attack, hurt, phase (x2: Tick to Tock, Tock to Midnight), rewind (a code effect that pulls toward him), death (the ending pose: he stops, the hands drop). Rig and clips only: integration waits for B9. |

## Rules
As A1: own only `art/<your assets>/**` (not candidates or source/cut, which are the orchestrator's); never start ComfyUI (ask for repaints in your report); never commit; stop your server by PID; iterate on single moods and record once at the end (five lanes share the CPU). Report as A1 did, with the frames you checked including a 125 px frame (220 px for the Clockmaker) with every part broken.
