# Clean the cut-out (alpha only): remove the toy cart, the string and its handle (the fist stays, empty),
# plus the ground squiggles around the boots and tiny specks. cut.orig.png is the input.
# Run with the rembg venv python from the repo root.
import os, shutil
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
src, orig = "art/tinker/cut.png", "art/tinker/cut.orig.png"
if not os.path.exists(orig): shutil.copy(src, orig)
a = np.array(Image.open(orig).convert("RGBA"))
H, W = a.shape[:2]
alpha = a[:, :, 3].copy()
yy, xx = np.mgrid[0:H, 0:W]
# 1. Cart and string remnants: everything left of the legs and below the hand.
alpha[(xx < 600) & (yy >= 412)] = 0
alpha[(xx < 640) & (yy >= 412) & (yy < 690)] = 0
# 2. (round 1 cut the handle out of the fist here; the round 2 painting has an empty open hand, so nothing is cut.)
rgb = a[:, :, :3].astype(int); lum = rgb.mean(2)
# 3. Ground squiggles: thin low parts beyond the boots.
op = ndi.binary_opening(alpha > 8, structure=np.ones((5, 5)))
keep = ndi.binary_dilation(op, iterations=3)
alpha[(yy > 735) & ~keep] = 0
# 3b. Pale ground-line strokes right under the soles.
sat = rgb.max(2) - rgb.min(2)
alpha[(yy > 749) & (sat < 70) & (lum > 95)] = 0
op2 = ndi.binary_opening(alpha > 8, structure=np.ones((4, 4)))
alpha[(yy > 744) & ~ndi.binary_dilation(op2, iterations=2)] = 0
op3 = ndi.binary_opening(alpha > 8, structure=np.ones((9, 9)))
alpha[(yy > 768) & ~ndi.binary_dilation(op3, iterations=2)] = 0
# 4. Specks.
lab, n = ndi.label(alpha > 8, structure=np.ones((3, 3)))
for i, sl in enumerate(ndi.find_objects(lab), 1):
    area = int((lab[sl] == i).sum())
    if area < 150: alpha[lab == i] = 0; print("removed", sl, area)
a[:, :, 3] = alpha
Image.fromarray(a).save(src)
