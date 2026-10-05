"""Join recorded mood frames into one animated WebP clip for review (owner sees one per asset).

  python art/lib/clip.py art/<asset>/frames art/<asset>/clip.webp [--fps 15] [--width 480]
Uses every mood folder under frames/ in name order (or --moods idle,attack,...), every other frame at 15 fps.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument("frames")
ap.add_argument("out")
ap.add_argument("--fps", type=int, default=15)
ap.add_argument("--width", type=int, default=480)
ap.add_argument("--moods", default="")
ap.add_argument("--step", type=int, default=0, help="use every Nth frame (default: 30 / fps, for 30 fps recordings)")
a = ap.parse_args()
root = Path(a.frames)
moods = a.moods.split(",") if a.moods else sorted(p.name for p in root.iterdir() if p.is_dir())
out = []
for m in moods:
    files = sorted((root / m).glob("*.png"))[::(a.step or max(1, 30 // a.fps))]
    for f in files:
        im = Image.open(f).convert("RGB")
        h = round(im.height * a.width / im.width)
        im = im.resize((a.width, h))
        ImageDraw.Draw(im).text((8, 6), m, fill=(255, 220, 120))
        out.append(im)
out[0].save(a.out, save_all=True, append_images=out[1:], duration=round(1000 / a.fps), loop=0, quality=80)
print(a.out, len(out), "frames", round(Path(a.out).stat().st_size / 1024), "KB")
