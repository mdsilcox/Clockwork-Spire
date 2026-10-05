# Tinpot General cut-out cleanup (alpha only except the head-top patch). Reads cut.orig.png, writes cut.png (no hat) and hat.png (the hat alone).
# 1. drops the stray gray shadow wisp (second component) and the pale halo ring around the silhouette;
# 2. splits the hat (y < 358 over the head, plus the brim wings) into hat.png, so it can be a sprite that rolls off;
# 3. paints a flat tin lid (ink-edged ellipse) on the head top, hidden by the hat at rest.
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from scipy import ndimage as nd

im = Image.open('art/tinpot-general/cut.orig.png').convert('RGBA')
a = np.array(im)
alpha = a[..., 3] > 128
lab, n = nd.label(alpha)
sizes = nd.sum(alpha, lab, range(1, n + 1))
keep = 1 + int(np.argmax(sizes))
main = lab == keep
# halo: the cut-out kept a flat cream ring (about 194,195,173) around the silhouette; remove it where it connects to the outside
dist = nd.distance_transform_edt(main)
rgb = a[..., :3].astype(int)
cand = main & (np.abs(rgb - np.array([194, 195, 173])).max(axis=2) < 17) & (dist < 18)
seed = cand & (dist < 2.5)
halo = nd.binary_propagation(seed, mask=cand)
halo = nd.binary_dilation(halo, iterations=1) & main & (dist < 18)
main &= ~halo
# background left in the gaps between hem and boots (light pixels in small boxes)
for x0, y0, x1, y1 in [(325, 868, 372, 905), (520, 868, 580, 912)]:
    sub = rgb[y0:y1, x0:x1]
    m = (sub.min(axis=2) > 165) & (sub.max(axis=2) - sub.min(axis=2) < 70)
    main[y0:y1, x0:x1] &= ~nd.binary_dilation(m, iterations=1)
main = nd.binary_opening(main, iterations=1)
lab, n = nd.label(main)
sizes = nd.sum(main, lab, range(1, n + 1))
main = lab == (1 + int(np.argmax(sizes)))
# soften the edge by 1 px
al = Image.fromarray((main * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
a[..., 3] = np.minimum(np.array(al), a[..., 3]) * 1
a[~main, 3] = 0
H, W = main.shape
yy, xx = np.mgrid[0:H, 0:W]
HEAD_L, HEAD_R, SPLIT = 286, 603, 358
hatmask = main & (xx < 662) & ((yy < SPLIT) | ((yy < 392) & ((xx < HEAD_L) | (xx > HEAD_R))))
hat = a.copy()
hat[..., 3] = np.where(hatmask | ((yy < SPLIT + 5) & main & (xx > 240) & (xx < 660)), a[..., 3], 0)
body = a.copy()
body[hatmask, 3] = 0
# sabre sprite: the blade, guard and pommel above the fist (y < 548), so it can be drawn above the hat
cop = (rgb[..., 0] > rgb[..., 1] + 50) & (rgb[..., 0] > 150)
blade_m = main & ~hatmask & (((yy < 470) & (xx >= 664)) | ((yy < 548) & (xx >= 689)) | ((yy < 580) & (xx >= 689) & (xx < 720) & ~(rgb[..., 1] > rgb[..., 0] + 25)))
blade = a.copy(); blade[..., 3] = np.where(blade_m, a[..., 3], 0)
body[blade_m, 3] = 0
# the band under the guard hook: refill the removed hook pixels from their nearest barrel neighbors
hole = blade_m & (xx < 689)
solid = (body[..., 3] > 200)
idx = nd.distance_transform_edt(~solid, return_indices=True)[1]
for yv, xv in zip(*np.nonzero(hole)):
    sy, sx = idx[0][yv, xv], idx[1][yv, xv]
    body[yv, xv, :3] = body[sy, sx, :3]; body[yv, xv, 3] = 255
bl, bn = nd.label(body[..., 3] > 20)
for i in range(1, bn + 1):
    if (bl == i).sum() < 400: body[bl == i, 3] = 0
Image.fromarray(blade).save('art/tinpot-general/blade.png')
# head lid patch
S = 4
lid = Image.new('RGBA', (W * S, 120 * S), (0, 0, 0, 0))
d = ImageDraw.Draw(lid)
cx, cy, rx, ry = 444.5, 338 - 300, 158, 21     # rows are offset by 300
d.rectangle([(HEAD_L - 1) * S, cy * S, (HEAD_R + 1) * S, (SPLIT - 300 + 4) * S], fill=(24, 132, 128, 255))
d.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], fill=(31, 156, 150, 255), outline=(16, 12, 8, 255), width=5 * S // 2)
d.ellipse([(cx - rx + 22) * S, (cy - ry + 6) * S, (cx + rx - 22) * S, (cy + ry - 6) * S], fill=(22, 118, 116, 255), outline=(14, 80, 80, 255), width=2 * S)
d.ellipse([(cx - 10) * S, (cy - 5) * S, (cx + 10) * S, (cy + 5) * S], fill=(201, 162, 74, 255), outline=(16, 12, 8, 255), width=2 * S)  # a brass bolt in the lid
# side ink lines of the head cylinder up to the lid
for x in (HEAD_L, HEAD_R):
    d.line([(x * S, cy * S), (x * S, (SPLIT - 300 + 4) * S)], fill=(16, 12, 8, 255), width=3 * S)
lid = lid.resize((W, 120), Image.LANCZOS)
canvas = Image.fromarray(body)
region = Image.new('RGBA', (W, H), (0, 0, 0, 0))
region.paste(lid, (0, 300))
# lid goes under the existing head pixels
out = Image.alpha_composite(region, canvas)
out.save('art/tinpot-general/cut.png')
Image.fromarray(hat).save('art/tinpot-general/hat.png')
print('ok', out.size)
