# Removes the gray background patches inside the cut-out and the gray ground smear under the feet (the rig draws its own shadow). Alpha only.
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
im = Image.open('art/steam-wraith/cut.png').convert('RGBA'); a = np.array(im)
rgb = a[..., :3].astype(int); chroma = rgb.max(axis=2) - rgb.min(axis=2); lum = rgb.mean(axis=2)
gray = (chroma < 14) & (lum > 120) & (lum < 215) & (a[..., 3] > 0)
blob = ndi.binary_dilation(ndi.binary_opening(gray, iterations=2), iterations=2) & (a[..., 3] > 0) & (chroma < 24)
a[blob, 3] = 0
sm = (chroma < 30) & (lum > 85) & (a[..., 3] > 0); sm[:780] = False
a[ndi.binary_opening(sm, iterations=1), 3] = 0
lab, n = ndi.label(a[..., 3] > 0); sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
for i, s in enumerate(sizes, 1):
    if s < 400: a[lab == i, 3] = 0
# Fill the dark cut-out holes in the golden cloud: close the alpha inside the cloud box and paint the new pixels with the nearest cloud-colored pixel.
alpha = a[..., 3] > 0
cloud_col = (rgb[..., 0] > 190) & (rgb[..., 0] - rgb[..., 2] > 40) & (rgb[..., 1] > 150) & alpha
box = np.zeros(alpha.shape, bool); box[60:460, 720:1040] = True
pad = np.pad(alpha, 40)
cl = ndi.binary_closing(pad, structure=np.ones((3, 3)), iterations=12)[40:-40, 40:-40]
cand = (cl | ndi.binary_fill_holes(alpha)) & ~alpha & box
lab2, n2 = ndi.label(cand); ar = ndi.sum(np.ones_like(lab2), lab2, range(1, n2 + 1))
holes = np.zeros(alpha.shape, bool)
for i, v in enumerate(ar, 1):
    if v < 5000: holes |= lab2 == i
idx = ndi.distance_transform_edt(~cloud_col, return_distances=False, return_indices=True)
a[holes, 0] = a[idx[0][holes], idx[1][holes], 0]; a[holes, 1] = a[idx[0][holes], idx[1][holes], 1]; a[holes, 2] = a[idx[0][holes], idx[1][holes], 2]; a[holes, 3] = 255
Image.fromarray(a).save('art/steam-wraith/cut.clean.png'); print('ok', int(holes.sum()))
