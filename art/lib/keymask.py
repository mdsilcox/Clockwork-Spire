"""Repair a cut-out whose alpha lost thin or dark parts: union rembg's alpha with a flat-background key.

  python art/lib/keymask.py SOURCE.png CUT.png OUT.png [--tol 38]
The background color is sampled from the source's four corners. Pixels farther than --tol from it
become opaque; the result keeps the largest connected regions only (no stray specks).
"""
import argparse
from PIL import Image, ImageChops, ImageFilter
import numpy as np
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument("source"); ap.add_argument("cut"); ap.add_argument("out")
ap.add_argument("--tol", type=float, default=38)
ap.add_argument("--key-only", action="store_true", help="ignore rembg; use the background key alone (rembg drops parts of the figure)")
ap.add_argument("--floor", type=int, default=0, help="erase low-saturation gray (a cast shadow) below this y")
a = ap.parse_args()
src = np.asarray(Image.open(a.source).convert("RGB")).astype(np.float32)
h, w, _ = src.shape
k = 24
corners = np.concatenate([src[:k, :k].reshape(-1, 3), src[:k, -k:].reshape(-1, 3), src[-k:, :k].reshape(-1, 3), src[-k:, -k:].reshape(-1, 3)])
bg = np.median(corners, axis=0)
dist = np.sqrt(((src - bg) ** 2).sum(axis=2))
key = np.clip((dist - a.tol * 0.6) / (a.tol * 0.8), 0, 1)
cut = np.asarray(Image.open(a.cut).convert("RGBA")).astype(np.float32)
ra = cut[..., 3] / 255
near = ndimage.binary_dilation(ra > 0.02, iterations=6)  # only repair inside rembg's own region (no floor shadow)
alpha = key if a.key_only else np.where(near, np.maximum(ra, key), ra)
if a.floor:
    mx, mn = src.max(axis=2), src.min(axis=2)
    shadow = (mx - mn < 28) & (mx > 40) & (mx < bg.max() - 5)
    shadow[: a.floor] = False
    alpha = np.where(shadow, 0, alpha)
m = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5))
# keep components larger than 0.2% of the image
lab, n = ndimage.label(np.asarray(m) > 128)
sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 0.002 * h * w])
final = np.where(ndimage.binary_dilation(keep, iterations=2), np.asarray(m), 0).astype(np.float32)
# Small holes inside the figure are shading close to the backdrop (pale fur): make them solid.
# Large holes (a tail loop, the gap under an arm) are real backdrop and stay clear.
solid = final > 128
holes, nh = ndimage.label(ndimage.binary_fill_holes(solid) & ~solid)
if nh:
    hs = ndimage.sum(np.ones_like(holes), holes, range(1, nh + 1))
    small = np.isin(holes, [i + 1 for i, s in enumerate(hs) if s < 0.0015 * h * w])
    final = np.where(ndimage.binary_dilation(small, iterations=1), 255, final)
if a.floor:
    # trim a drawn ground line: below the floor, keep only what sits under the figure 20 px higher
    above = final[a.floor - 20] > 128
    final[a.floor:, :] = np.where(above[None, :], final[a.floor:, :], 0)
final = final.astype(np.uint8)
out = np.dstack([src.astype(np.uint8), final])
Image.fromarray(out, "RGBA").save(a.out)
print(a.out, "bg", bg.round(), "components kept", int(sum(s > 0.002 * h * w for s in sizes)))
