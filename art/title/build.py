"""Build art/title/title.html: the template + rig.json + source@2x.png (2432x1664, inlined as a WebP q90 data URL; drawn at the 1216x832 logical size so rig.json coordinates are unchanged).

  E:/AI/rembg/.venv/Scripts/python.exe art/title/build.py
"""
import base64
import io
from pathlib import Path
from PIL import Image

here = Path(__file__).parent
im = Image.open(here / "source@2x.png").convert("RGB")
buf = io.BytesIO()
im.save(buf, "WEBP", quality=90, method=6)
url = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
rig = (here / "rig.json").read_text(encoding="utf-8")
html = (here / "title.template.html").read_text(encoding="utf-8").replace("__RIG__", rig).replace("__IMG__", url)
(here / "title.html").write_text(html, encoding="utf-8")
print(here / "title.html", len(html) // 1024, "KB")
