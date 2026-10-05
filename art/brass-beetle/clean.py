# Remove soft halo around the thin legs and the gray ground specks. Edits alpha only; keeps cut.orig.png as the input.
# Run with the rembg venv python from the repo root.
import os, shutil
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
src, orig = "art/brass-beetle/cut.png", "art/brass-beetle/cut.orig.png"
if not os.path.exists(orig): shutil.copy(src, orig)
a = np.array(Image.open(orig).convert("RGBA"))
al = a[:, :, 3]; rgb = a[:, :, :3].astype(int)
low = np.arange(a.shape[0])[:, None] > 540
sat = rgb.max(2) - rgb.min(2)
dark = rgb.max(2) < 95  # translucent dark-brown halo
al[low & (al < 235) & dark] = 0
al[low & (sat < 28) & (rgb.min(2) > 100)] = 0
al[low & (al < 90)] = 0
lab, n = ndi.label(al > 8, structure=np.ones((3, 3)))
for i, sl in enumerate(ndi.find_objects(lab), 1):
    if int((lab[sl] == i).sum()) < 150: al[lab == i] = 0
Image.fromarray(a).save(src)
