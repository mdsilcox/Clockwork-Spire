# Clears the floor scribble under the boots and the spear butt. Alpha only. Reads cut.png, writes cut.clean.png.
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
a = np.array(Image.open('art/minute-warden/cut.png').convert('RGBA'))
rgb = a[..., :3].astype(int); chroma = rgb.max(axis=2) - rgb.min(axis=2); lum = rgb.mean(axis=2)
sh = (chroma < 18) & (lum > 135) & (a[..., 3] > 0); sh[:1040] = False
sh = ndi.binary_opening(sh, iterations=1)
a[sh, 3] = 0
lab, n = ndi.label(a[..., 3] > 0)
sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
for i, s in enumerate(sizes, 1):
    if s < 300: a[lab == i, 3] = 0
Image.fromarray(a).save('art/minute-warden/cut.clean.png'); print('ok', sh.sum())
