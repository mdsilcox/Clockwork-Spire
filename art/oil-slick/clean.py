# Clears gray background left inside small holes of the cut-out (rag, frame gaps). Alpha only. Reads cut.png, writes cut.clean.png.
from PIL import Image
import numpy as np
im = Image.open('art/oil-slick/cut.png').convert('RGBA'); a = np.array(im)
BOXES = [(450, 190, 530, 232), (798, 520, 842, 578), (996, 285, 1056, 350)]
bg = np.array([175, 179, 176])
for x0, y0, x1, y1 in BOXES:
    sub = a[y0:y1, x0:x1]
    d = np.abs(sub[..., :3].astype(int) - bg).max(axis=2)
    sub[d < 22, 3] = 0
Image.fromarray(a).save('art/oil-slick/cut.clean.png')
print('ok')
