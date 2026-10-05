# Removes the tan cloud puffs at the feet and the cream swirl left of the helmet (color key on the cloud tan; alpha only), then drops small leftover specks.
# Reads cut.png, writes cut.clean.png. The painting's clipped right edge is left as is.
from PIL import Image
import numpy as np
from scipy import ndimage
im = Image.open('art/hour-knight/cut.png').convert('RGBA'); a = np.array(im)
R, G, B = [a[..., i].astype(int) for i in range(3)]
cloud = (R > 170) & (R - B > 35) & (R - B < 125) & (B > 105) & (G > 135)
region = np.zeros(cloud.shape, bool)
region[905:, :] = True
region[60:380, 170:290] = True
a[cloud & region, 3] = 0
a[915:, :172, 3] = 0                       # left cloud outline
a[60:290, 185:262, 3] = 0                   # swirl arc
from PIL import ImageDraw
m = Image.new('L', (a.shape[1], a.shape[0]), 0)
ImageDraw.Draw(m).polygon([(650, 1010), (700, 960), (760, 930), (900, 930), (900, 1152), (650, 1152)], fill=1)
a[np.array(m) > 0, 3] = 0                   # right cloud outline
a[285:420, 185:238, 3] = 0   # swirl arc left of the pauldron
pale = (np.minimum(np.minimum(R, G), B) > 185)
for y0, y1, x0, x1 in [(640, 800, 165, 215), (740, 800, 230, 275), (370, 405, 195, 262)]:
    sub = a[y0:y1, x0:x1]; sub[pale[y0:y1, x0:x1] | (sub[..., 0].astype(int) - sub[..., 2].astype(int) > 35) & (sub[..., 0] > 190), 3] = 0
al = a[..., 3] > 0
lab, n = ndimage.label(al)
sizes = ndimage.sum(al, lab, range(1, n + 1))
for i, s in enumerate(sizes, 1):
    if s < 2500: a[lab == i, 3] = 0
Image.fromarray(a).save('art/hour-knight/cut.clean.png')
print('ok', n)
