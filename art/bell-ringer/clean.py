# Erases the baked ground shadow streaks right of the boots (they would flash with the body). Alpha only. Reads cut.png, writes cut.clean.png.
from PIL import Image
import numpy as np
im = Image.open('art/bell-ringer/cut.png').convert('RGBA'); a = np.array(im)
a[1030:1140, 584:800, 3] = 0
a[1090:, 470:, 3] = 0                        # loose rope tail and its pale tip
Image.fromarray(a).save('art/bell-ringer/cut.clean.png')
print('ok')
