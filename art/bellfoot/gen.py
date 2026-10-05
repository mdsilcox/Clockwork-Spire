"""Generate Bellfoot's painting pieces in the shared style (art/style.json v3), one asset at a time.

  python art/bellfoot/gen.py [--only gate,sky] [--seeds 4]
ComfyUI must be running (see ~/.claude/tools/art/comfy.py). Writes art/bellfoot/candidates/<asset>_seed<N>.png.
Places are generated as isolated front elevations on flat gray (like the characters) and cut out; the sky is a scene."""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path.home() / ".claude" / "tools" / "art"))
import comfy  # noqa: E402

HERE = Path(__file__).parent
STYLE = json.loads((HERE.parent / "style.json").read_text(encoding="utf-8"))
FRONT = ("front elevation straight on, the whole building or structure visible from ground to roof, centered, isolated on a plain flat light gray "
         "background, no street, no ground, no sky, no scenery, no people, no characters, warm lamplight glowing in the windows")
FRONT_NEG = "background scenery, sky, street, ground, people, characters, perspective view, side view, cropped, frame, border, text, signs with letters"
SCENE = "wide establishing shot, layered silhouettes, game background art, dusk, warm amber and teal sky"

ASSETS = {
    "sky": dict(size=(1216, 832), prompt="a dusk sky over a small steampunk town, an enormous clock tower called the Spire rising into clouds at the left, its top lost in cloud, amber and teal painted clouds, distant rooftops and chimneys as dark silhouettes along the very bottom edge, empty calm sky, no foreground", frame=SCENE,
                neg="characters, people, frame, border, close buildings, text"),
    "gate": dict(size=(896, 1152), prompt="the gate to the Spire: a tall arched brass and iron gate between two stone gateposts with hanging lanterns, a dimly glowing archway beyond showing huge gears, sturdy and welcoming", frame=FRONT, neg=FRONT_NEG),
    "workshop": dict(size=(1216, 832), prompt="a small cozy inventor's workshop front: a wide bench window full of tools and small clockwork things with a glowing lamp, a wooden door, a brick chimney with a puff of steam, a gear shaped sign without letters", frame=FRONT, neg=FRONT_NEG),
    "sprocket": dict(size=(896, 1152), prompt="a small corner nook of a wall: a wooden doghouse niche with a wicker basket and a folded red blanket in front, a brass dog bowl, a small iron lamp post beside it", frame=FRONT, neg=FRONT_NEG),
    "trophies": dict(size=(896, 1152), prompt="a stone wall niche holding a wooden trophy shelf with a few small clockwork medals and cups, a small brass plaque without writing, a hanging lantern above", frame=FRONT, neg=FRONT_NEG),
    "archivist": dict(size=(896, 1152), prompt="a narrow archivist's shop front: an arched door with a round window, tall stacks of books and rolled scrolls piled in the window, a hanging brass lantern, a brass sign shaped like an open book without writing", frame=FRONT, neg=FRONT_NEG),
    "stall": dict(size=(896, 1152), prompt="an empty market stall frame: a wooden counter and posts, a striped canvas awning, a small hanging lamp, nothing for sale, no goods, no person", frame=FRONT, neg=FRONT_NEG),
    "clocktower": dict(size=(896, 1152), prompt="the base of a clock tower: a heavy arched wooden door with brass studs and a big brass clock face above it, its hands stopped, narrow tower walls going up, a lantern by the door", frame=FRONT, neg=FRONT_NEG),
    "ground": dict(size=(1216, 832), prompt="cobblestone street ground texture seen from above, flat, warm dusk light, a worn gutter along one edge, scattered brass cogs and leaves between the stones", frame="flat orthographic texture, no perspective, game ground tile", neg="characters, people, buildings, frame, border, text"),
    "wall": dict(size=(1216, 832), prompt="a low brick garden wall topped with an iron railing, small iron lamp posts with glowing lamps and ivy, side view straight on", frame="straight on side elevation, isolated on a plain flat light gray background, no ground, no sky", neg=FRONT_NEG),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--seeds", type=int, default=4)
    ap.add_argument("--first-seed", type=int, default=1)
    a = ap.parse_args()
    out = HERE / "candidates"
    out.mkdir(parents=True, exist_ok=True)
    s = STYLE["sampler"]
    names = a.only.split(",") if a.only else list(ASSETS)
    for name in names:
        d = ASSETS[name]
        prompt = f"{d['prompt']}, {d['frame']}, {STYLE['core']}"
        neg = ", ".join([STYLE["negative"], d["neg"]])
        for seed in range(a.first_seed, a.first_seed + a.seeds):
            wf = comfy.workflow(prompt, neg, seed, d["size"], f"cs_bf_{name}", steps=s["steps"], cfg=s["cfg"])
            secs = comfy.run("127.0.0.1:8188", wf, out / f"{name}_seed{seed}.png")
            print(f"{name} seed {seed}: {secs:.1f} s", flush=True)


if __name__ == "__main__":
    main()
