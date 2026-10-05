# Clean the cut-out: remove the pale ground smears under the paws and the white background that shows
# through holes in the painting (the gaps in the legs and tail, the top of the engine). Edits alpha only.
# Run with the rembg venv python from the repo root. cut.orig.png is the input.
import os, shutil
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
src, orig = "art/gearhound/cut.png", "art/gearhound/cut.orig.png"
if not os.path.exists(orig): shutil.copy(src, orig)
a = np.array(Image.open(orig).convert("RGBA"))
H, W = a.shape[:2]
rgb = a[:, :, :3].astype(int); sat = rgb.max(2) - rgb.min(2); lum = rgb.mean(2)
yy, xx = np.mgrid[0:H, 0:W]
alpha = a[:, :, 3]
# 1. Ground smears: pale low-saturation pixels low in the picture (claws are near-black, boots of brass are saturated).
ground = (sat < 40) & (lum > 120) & (yy > 725)
alpha[ground] = 0
alpha[(sat < 45) & (lum > 85) & (yy > 748)] = 0
# 2. White background inside holes: near-white, low saturation, away from the teeth box (x<330, y 150..340).
white = (sat < 28) & (lum > 205)
teeth = (xx < 330) & (yy > 150) & (yy < 345)
white &= ~teeth
white = ndi.binary_dilation(white, iterations=1) & (lum > 170) & (sat < 45) & ~teeth
alpha[white] = 0
# 3. Drop specks: small leftover components, and thin remnants of the ground line.
lab, n = ndi.label(alpha > 8, structure=np.ones((3, 3)))
for i, sl in enumerate(ndi.find_objects(lab), 1):
    area = int((lab[sl] == i).sum())
    if area < 120:
        alpha[lab == i] = 0; print("removed", sl, area)
low = yy > 735
op = ndi.binary_opening(alpha > 8, structure=np.ones((5, 5)))
keep = ndi.binary_dilation(op, iterations=3)
alpha[low & ~keep] = 0
a[:, :, 3] = alpha
Image.fromarray(a).save(src)
