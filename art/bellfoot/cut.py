"""Cut the picked Bellfoot candidates out of their backgrounds (rembg) and trim them to their bounds.
  python art/bellfoot/cut.py            # writes art/bellfoot/cuts/<name>.png
Picks (art/bellfoot/notes.md): the seed chosen for each place, with an optional crop box (x0, y0, x1, y1) in candidate pixels."""
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

HERE = Path(__file__).parent
PICKS = {
    # name: (candidate, crop or None)
    "workshop": ("workshop_seed2", None),
    "sprocket": ("sprocket_seed2", (0, 0, 896, 1080)),  # the stock caption under the picture is cropped away
    "trophies": ("trophies_seed1", None),
    "stall": ("stall_seed1", None),
    "lamp": ("wall_seed1", None),
}

# Framed pictures that are a whole facade to the edges: kept as opaque rectangles (cropped of their borders), sides feathered.
OPAQUE = {
    "gate": ("gate_seed2", (150, 0, 746, 1000)),
    "archivist": ("archivist_seed2", (60, 20, 836, 1060)),
    "clocktower": ("clocktower_seed3", (60, 20, 836, 1100)),
}

out = HERE / "cuts"
out.mkdir(exist_ok=True)
session = new_session("isnet-general-use")
for name, (cand, crop) in PICKS.items():
    im = Image.open(HERE / "candidates" / f"{cand}.png").convert("RGB")
    if crop:
        im = im.crop(crop)
    cut = remove(im, session=session)
    bbox = cut.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    cut = cut.crop(bbox)
    cut.save(out / f"{name}.png")
    print(name, cut.size)

for name, (cand, crop) in OPAQUE.items():
    im = Image.open(HERE / "candidates" / f"{cand}.png").convert("RGBA").crop(crop)
    a = Image.new("L", im.size, 255)
    px = a.load()
    f = 14
    for y in range(im.height):
        for x in range(im.width):
            e = min(x, im.width - 1 - x)
            if e < f:
                px[x, y] = int(255 * e / f)
    im.putalpha(a)
    im.save(out / f"{name}.png")
    print(name, im.size)
