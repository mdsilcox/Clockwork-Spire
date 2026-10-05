# Removes the painted ground streak under the feet and the light-gray halo left around the cut-out. Alpha only. Reads cut.png, writes cut.clean.png.
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
im = Image.open('art/spring-imp/cut.png').convert('RGBA'); a = np.array(im)
alpha = a[..., 3]
rgb = a[..., :3].astype(int)
# 1. Ground streak: everything below the feet line, plus the streak beside the feet (outside the foot boxes) down to y 735.
alpha[752:, :] = 0
alpha[728:, 745:900] = 0
keep = np.zeros(alpha.shape, bool)
for x0, x1 in [(290, 420), (600, 740)]:
    keep[:, x0:x1] = True
alpha[(np.arange(alpha.shape[0])[:, None] >= 738) & ~keep] = 0
# 2. Halo: light, nearly gray pixels reachable from transparency within 8 steps.
mx, mn = rgb.max(axis=2), rgb.min(axis=2)
halo = (mn > 150) & (mx - mn < 30) & (alpha > 0)
region = alpha == 0
for _ in range(8):
    grow = ndi.binary_dilation(region) & halo
    if not (grow & ~region).any(): break
    region |= grow
alpha[region] = 0
# 3. Enclosed light-gray holes (between frame parts).
holes = ndi.label(halo & (alpha > 0))[0]
for k in range(1, holes.max() + 1):
    m = holes == k
    if m.sum() < 2500 and ndi.binary_dilation(m, iterations=2).__and__(alpha == 0).any(): alpha[m] = 0
# 4. The pale panel hanging under the head and the stray curl beside it.
sub = rgb[352:400, 252:312]
alpha[352:400, 252:312][(sub.min(axis=2) > 185)] = 0
alpha[386:412, 222:248] = 0
a[..., 3] = alpha
Image.fromarray(a).save('art/spring-imp/cut.clean.png')
print('ok')
