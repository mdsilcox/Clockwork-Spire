"""Clean the round 2 Cog Rat cut-out: alpha only. Reads cut.raw.png (made on first run from cut.png), writes cut.png.
Removes light, desaturated specks (ground shadow slabs under the claws, white patches between the legs and body),
then drops tiny alpha islands (whisker fragments). The head is left alone except for the islands pass."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

here = os.path.dirname(os.path.abspath(__file__))
raw = os.path.join(here, "cut.raw.png")
if not os.path.exists(raw):
    os.replace(os.path.join(here, "cut.png"), raw)
im = Image.open(raw).convert("RGBA")
a = np.array(im).astype(np.int16)
rgb, al = a[..., :3], a[..., 3]
mx, mn = rgb.max(-1), rgb.min(-1)
yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
light = (mn > 165) & ((mx - mn) < 45) & (al > 0)
shade = (yy > 690) & (mn > 70) & ((mx - mn) < 30) & (mx < 200) & (al > 0)
head = (xx < 380) & (yy < 300)
tailglass = (xx > 1030) & (yy > 500) & (yy < 720)
kill = (light & ~head & ~tailglass) | shade | (light & tailglass & (yy > 650))
lab, n = ndi.label(kill)
sizes = ndi.sum(kill, lab, range(1, n + 1))
out = al.copy()
for i, s in enumerate(sizes, 1):
    if s < 7000:
        out[lab == i] = 0
solid = out > 20
lab, n = ndi.label(solid)
sizes = ndi.sum(solid, lab, range(1, n + 1))
for i, s in enumerate(sizes, 1):
    if s < 120:
        out[lab == i] = 0
res = a.copy().astype(np.uint8)
res[..., 3] = out.astype(np.uint8)
Image.fromarray(res, "RGBA").save(os.path.join(here, "cut.png"))
print("removed", int((al > 0).sum() - (out > 0).sum()), "px")
