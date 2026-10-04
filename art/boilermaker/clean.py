# Remove the painted ground smear under the boots: small alpha components that sit entirely below y=1035.
# Edits alpha only. Run with the rembg venv python from the repo root. Keeps cut.orig.png as the input.
import os, shutil
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
src, orig = "art/boilermaker/cut.png", "art/boilermaker/cut.orig.png"
if not os.path.exists(orig): shutil.copy(src, orig)
im = Image.open(orig).convert("RGBA"); a = np.array(im)
# Gray ground streaks: low-saturation pixels below the hem (boots are brown and gold).
rgb = a[:, :, :3].astype(int); sat = rgb.max(2) - rgb.min(2)
gray = (sat < 30) & (rgb.min(2) > 90) & (np.arange(a.shape[0])[:, None] > 1040)
a[:, :, 3][gray] = 0
# Thin leftover streaks: keep only what survives a 13x13 opening (plus 5 px of its edge), below the hem.
op = ndi.binary_opening(a[:, :, 3] > 8, structure=np.ones((13, 13)))
keep = ndi.binary_dilation(op, structure=np.ones((3, 3)), iterations=5)
low = np.arange(a.shape[0])[:, None] > 1040
a[:, :, 3][low & ~keep] = 0
lab, n = ndi.label(a[:, :, 3] > 8, structure=np.ones((3, 3)))
for i, sl in enumerate(ndi.find_objects(lab), 1):
    area = int((lab[sl] == i).sum())
    if sl[0].start > 1035 and area < 60:
        a[:, :, 3][lab == i] = 0; print("removed", sl, area)
Image.fromarray(a).save(src)
