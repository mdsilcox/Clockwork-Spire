"""Build a self-contained page: the template + art/lib/rig.js + the cut-out painting.

  python art/lib/inline.py art/<asset>/<asset>.template.html art/<asset>/<asset>.html art/<asset>/cut.png
The template uses __RIGJS__ where rig.js goes and __IMG__ where the image URL goes.
"""
import base64
import sys
from pathlib import Path

tpl, out, img = map(Path, sys.argv[1:4])
rig = (Path(__file__).parent / "rig.js").read_text(encoding="utf-8")
url = "data:image/png;base64," + base64.b64encode(img.read_bytes()).decode()
html = tpl.read_text(encoding="utf-8").replace("__RIGJS__", rig).replace("__IMG__", url)
out.write_text(html, encoding="utf-8")
print(out, len(html) // 1024, "KB")
