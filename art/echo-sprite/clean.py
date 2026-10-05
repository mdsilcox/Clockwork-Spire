# Removes the small stray figure at the right and the gray ground puddle/line under the sprite (color key on the ground gray, then small specks). Alpha only.
# Reads cut.png, writes cut.clean.png.
from PIL import Image
import numpy as np
from scipy import ndimage
a = np.array(Image.open('art/echo-sprite/cut.png').convert('RGBA'))
R, G, B = [a[..., i].astype(int) for i in range(3)]
ground = (abs(R - G) < 14) & (R - B > 3) & (R - B < 45) & (R > 85) & (R < 160)
reg = np.zeros(ground.shape, bool); reg[722:, :] = True
a[ground & reg, 3] = 0
a[728:, :335, 3] = 0; a[728:, 905:, 3] = 0; a[785:, :, 3] = 0   # leftover puddle streaks
a[480:745, 955:1115, 3] = 0                      # the stray figure and its feeler
al = a[..., 3] > 0
lab, n = ndimage.label(al)
sizes = ndimage.sum(al, lab, range(1, n + 1))
for i, s in enumerate(sizes, 1):
    if s < 1500: a[lab == i, 3] = 0
Image.fromarray(a).save('art/echo-sprite/cut.clean.png')
print('ok')
