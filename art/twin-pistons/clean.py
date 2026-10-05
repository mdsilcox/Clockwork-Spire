"""Clear the light gray backdrop left inside gaps (and ground scribbles) in cut.png; writes cut.clean.png (cut.png stays the orchestrator's)."""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

here = Path(__file__).parent
a = np.array(Image.open(here / "cut.png").convert("RGBA")).astype(int)
r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
mx, mn = a[..., :3].max(2), a[..., :3].min(2)
gray = (mx - mn < 26) & (mx > 168) & (mx < 238) & (al > 0)
lab, n = ndi.label(gray)
sizes = ndi.sum(gray, lab, range(1, n + 1))
kill = np.zeros_like(gray)
for i, s in enumerate(sizes, 1):
    if s >= 60:
        kill |= lab == i
kill = ndi.binary_dilation(kill, iterations=2) & (mx - mn < 40) & (mx > 120)
if "twin-pistons" == "twin-pistons":
    yy = np.arange(a.shape[0])[:, None]
    kill |= (yy > 1015) & (mx - mn < 40) & (mx > 140)
a[kill, 3] = 0
Image.fromarray(a.astype("uint8")).save(here / "cut.clean.png")
print("cleared", int(kill.sum()), "px")
