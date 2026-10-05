"""PNG to WebP for `scripts/art.mjs` (Node has no WebP encoder here). Reads a JSON job list on stdin:
[{"src": "art/cog-rat/cut.png", "dst": "public/art/cog-rat/cut.webp", "scale": 0.5557, "quality": 85}]
Writes each destination (resized with Lanczos, alpha kept, exact=True so transparent pixels keep their color).
Prints one line per file: dst, width x height, bytes."""
import json
import os
import sys

from PIL import Image

for job in json.load(sys.stdin):
    im = Image.open(job["src"]).convert("RGBA")
    s = job.get("scale", 1.0)
    if s != 1.0:
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    os.makedirs(os.path.dirname(job["dst"]), exist_ok=True)
    im.save(job["dst"], "WEBP", quality=job.get("quality", 85), method=6, exact=True)
    print(f'{job["dst"]} {im.width}x{im.height} {os.path.getsize(job["dst"])}')
