# Clockmaker cut cleanup: drop the stray frame fragments (bottom right, chain tip at left) and the gray halo.
# Edits alpha only. Run with the rembg venv python from the repo root. Keeps cut.orig.png as the input.
import os, shutil
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
src, orig = "art/clockmaker/cut.png", "art/clockmaker/cut.orig.png"
if not os.path.exists(orig): shutil.copy(src, orig)
a = np.array(Image.open(orig).convert("RGBA")); al = a[:, :, 3]
H, W = al.shape
yy, xx = np.mgrid[0:H, 0:W]
# Right fragment: everything right of the chain tip below the glove, and the low corner under the coat hem.
frag = ((xx > 738) & (yy > 760)) | ((xx > 722) & (yy > 1000)) | ((xx > 700) & (yy > 1040))
frag |= (xx < 58) & (yy > 755)
al[frag] = 0
# Gray halo from the cut: light low-saturation pixels hugging the transparent edge (peel 3 times).
rgb = a[:, :, :3].astype(int); sat = rgb.max(2) - rgb.min(2); lum = rgb.mean(2)
grayish = (sat < 40) & (lum > 95)
for _ in range(7):
    edge = ndi.binary_dilation(al <= 8, structure=np.ones((3, 3))) & (al > 8)
    al[edge & grayish] = 0
# Pale gray fill left inside the chain loops and around the hanging gears: drop it outright (not on the coat or body).
side = ((xx < 345) | (xx > 585)) & (yy > 560) & (yy < 880)
fill = side & (sat < 45) & (lum > 105)
al[fill] = 0
# Matte what is left of the halo: pale low-saturation pixels within 4 px of the edge go dark brass (ink-like), so chains and hands carry no pale rim.
near = ndi.binary_dilation(al <= 8, structure=np.ones((3, 3)), iterations=4) & (al > 8)
pale = (sat < 70) & (lum > 120)
m = near & pale
rgb[m] = (rgb[m] * 0.28 + np.array([30, 22, 12]) * 0.72).astype(int)
rim = ndi.binary_dilation(al <= 8, structure=np.ones((3, 3)), iterations=2) & (al > 8)
rgb[rim] = (rgb[rim] * 0.55 + np.array([20, 16, 12]) * 0.45).astype(int)
a[:, :, :3] = rgb.clip(0, 255)
# Drop small leftover islands.
lab, n = ndi.label(al > 8, structure=np.ones((3, 3)))
for i, sl in enumerate(ndi.find_objects(lab), 1):
    ar = int((lab[sl] == i).sum())
    if ar < 400: al[lab == i] = 0; print("removed", sl, ar)
a[:, :, 3] = al
Image.fromarray(a).save(src)
