# Removes the baked gray/black ground shadow under the base (it would flash with the body and cannot move with it). Alpha only.
# Below y 1066 only saturated paint (brass, teal) is kept, plus the two foot blocks. Reads cut.png, writes cut.clean.png.
from PIL import Image
import numpy as np
a = np.array(Image.open('art/pendulum-blade/cut.png').convert('RGBA'))
R, G, B = [a[..., i].astype(int) for i in range(3)]
sat = np.max([R, G, B], axis=0) - np.min([R, G, B], axis=0)
keep = sat > 60
for x0, y0, x1, y1 in [(190, 1066, 308, 1122), (592, 1066, 718, 1122)]:
    keep[y0:y1, x0:x1] = True
below = np.zeros_like(keep); below[1066:, :] = True
a[below & ~keep, 3] = 0
Image.fromarray(a).save('art/pendulum-blade/cut.clean.png')
print('ok')
