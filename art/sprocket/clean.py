"""Clean art/sprocket/cut.png (round 2 painting). Keeps the key-mask cut as cut.orig.png and always cleans from it.
1. Remove small dark ground-line stubs under the paws.
2. Make pale fur under the belly and the shaded far hind leg solid (close alpha holes, fill color from the nearest opaque pixel).
3. Replace the far front leg scrap with a leg copied from the near front leg, shifted back and grayed a little, composited UNDER the painting."""
import os, shutil
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
here = os.path.dirname(os.path.abspath(__file__))
cut, orig = os.path.join(here, "cut.png"), os.path.join(here, "cut.orig.png")
if not os.path.exists(orig):
    shutil.copy(cut, orig)
a = np.array(Image.open(orig).convert("RGBA")).astype(np.float32)
al = a[:, :, 3]

# 1. ground-line slabs: below each paw keep only its ink base (7 px under the lowest white pixel); columns without fur lose everything under y 738
lum = a[:, :, :3].sum(axis=2)
for x in range(400, 1130):
    col = np.where((lum[690:763, x] > 560) & (al[690:763, x] > 200))[0]
    if len(col): al[690 + col.max() + 8:, x] = 0
    else: al[738:, x] = 0
# 2. solid pale fur and far hind leg
def solidify(x0, x1, y0, y1, it=4, flat=None):
    m = np.zeros(al.shape, bool); m[y0:y1, x0:x1] = True
    op = (al > 40) & m
    closed = ndi.binary_fill_holes(ndi.binary_closing(op, iterations=it)) & m
    new = closed & ~op
    idx = ndi.distance_transform_edt(~op, return_distances=False, return_indices=True)
    for c in range(3):
        a[:, :, c][new] = a[:, :, c][idx[0][new], idx[1][new]]
    if flat:
        for c in range(3): a[:, :, c][new] = flat[c]
    semi = (al > 10) & m
    al[new | semi] = 255
solidify(540, 930, 515, 640)
solidify(770, 935, 585, 745, 6, flat=(206, 210, 212))

# 3. far front leg
a[:, :, 3] = al
box = (569, 618, 628, 700)          # the scrap: x0, y0, x1, y1
a[box[1]:box[3], box[0]:box[2], 3] = 0
a[664:694, 560:569, 3] = 0   # leftover scrap beside the near paw
src = a[598:757, 452:575].copy()
src[:, :, 3] *= np.clip((np.arange(598, 757) - 598) / 14.0, 0, 1)[:, None]     # near front leg (white, with paw)
src[:, :, :3] *= 0.84
layer = np.zeros_like(a)
dx = 68
layer[598:757, 452 + dx:575 + dx] = src
# clip the copy to a tapered right edge (the near leg hides its own, so draw one in ink)
from PIL import ImageDraw
edge = [(619, 612), (617, 650), (610, 684), (606, 694)]
clip = np.zeros(al.shape, np.float32)
for y in range(598, 757):
    xe = np.interp(y, [e[1] for e in edge], [e[0] for e in edge]) if y < 694 else 9999
    clip[y, :int(min(xe, 1215))] = 1
layer[:, :, 3] *= clip
ink = Image.new("L", (al.shape[1], al.shape[0]), 0)
ImageDraw.Draw(ink).line(edge, fill=255, width=5)
ink = np.array(ink).astype(np.float32) / 255
for c, v in enumerate((20, 16, 12)):
    layer[:, :, c] = layer[:, :, c] * (1 - ink) + v * ink
layer[:, :, 3] = np.maximum(layer[:, :, 3], ink * 255)
alpha_top = a[:, :, 3] / 255.0
out = a.copy()
la = layer[:, :, 3] / 255.0
ta = alpha_top + la * (1 - alpha_top)
for c in range(3):
    out[:, :, c] = np.where(ta > 0, (a[:, :, c] * alpha_top + layer[:, :, c] * la * (1 - alpha_top)) / np.maximum(ta, 1e-6), 0)
out[:, :, 3] = ta * 255
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(cut)
print("cleaned", cut)
