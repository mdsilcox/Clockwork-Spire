# Clears gray background specks (alpha only). Reads cut.png, writes cut.clean.png.
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
im = Image.open('art/gauge-gremlin/cut.png').convert('RGBA'); a = np.array(im)
lab, n = ndi.label(a[..., 3] > 0)
sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
for i, s in enumerate(sizes, 1):
    if s < 400: a[lab == i, 3] = 0
Image.fromarray(a).save('art/gauge-gremlin/cut.clean.png'); print('ok', n)
