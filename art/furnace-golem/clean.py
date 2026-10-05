# Removes the cream halo around the golem and the ground rubble under its feet. Alpha only. Reads cut.png, writes cut.clean.png.
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
im = Image.open('art/furnace-golem/cut.png').convert('RGBA'); a = np.array(im)
rgb = a[..., :3].astype(int); lum = rgb.mean(axis=2); chroma = rgb.max(axis=2) - rgb.min(axis=2)
# Halo: light, warm-cream, low-chroma pixels. Keep the saturated orange glows (high chroma).
halo = (lum > 170) & (chroma < 60) & (a[..., 3] > 0)
halo = ndi.binary_dilation(halo, iterations=2) & (lum > 120) & (chroma < 70)
a[halo, 3] = 0
# Ground rubble: everything below the feet (y > 1088) goes, and the loose chunks beside the feet below y 1040 outside the two leg columns.
a[1090:, :, 3] = 0
legs = np.zeros(a.shape[:2], bool); legs[:, 250:420] = True; legs[:, 480:640] = True
a[1045:1090][~legs[1045:1090], 3] = 0
# Keep only the largest component plus big islands; drop specks.
lab, n = ndi.label(a[..., 3] > 0)
sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
for i, s in enumerate(sizes, 1):
    if s < 1500: a[lab == i, 3] = 0
# Soften the alpha edge one pixel to hide the fringe.
al = ndi.binary_erosion(a[..., 3] > 0, iterations=1); a[~al, 3] = 0
Image.fromarray(a).save('art/furnace-golem/cut.clean.png'); print('ok')
