# Clears the gray background patches and floor shadows left in the cut-out. Alpha only. Reads cut.png, writes cut.clean.png.
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
im = Image.open('art/valve-crab/cut.png').convert('RGBA'); a = np.array(im)
rgb = a[..., :3].astype(int)
chroma = rgb.max(axis=2) - rgb.min(axis=2)
lum = rgb.mean(axis=2)
gray = (chroma < 16) & (lum > 120) & (lum < 215) & (a[..., 3] > 0)
# Only drop gray areas that are blobs (not thin ink or highlights): open the mask, then grow by 2 px to take the fringe.
blob = ndi.binary_opening(gray, iterations=2)
blob = ndi.binary_dilation(blob, iterations=2) & (a[..., 3] > 0)
a[blob, 3] = 0
# Floor shadow smudges below the feet: very low saturation, any luminance, below y 600 and not ink-dark.
sh = (chroma < 22) & (lum > 90) & (a[..., 3] > 0); sh[:600] = False
sh = ndi.binary_opening(sh, iterations=1)
a[sh, 3] = 0
# Drop tiny leftover islands.
lab, n = ndi.label(a[..., 3] > 0)
sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
for i, s in enumerate(sizes, 1):
    if s < 300: a[lab == i, 3] = 0
Image.fromarray(a).save('art/valve-crab/cut.clean.png'); print('ok', blob.sum(), sh.sum())
