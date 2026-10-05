"""Build art/clockmaker/clockmaker.html: template + rig.js + the cut-out painting."""
import base64
from pathlib import Path
here = Path(__file__).parent
rig = (here.parent / "lib" / "rig.js").read_text(encoding="utf-8")
url = "data:image/png;base64," + base64.b64encode((here / "cut.png").read_bytes()).decode()
html = (here / "clockmaker.template.html").read_text(encoding="utf-8").replace("__RIGJS__", rig).replace("__IMG__", url)
(here / "clockmaker.html").write_text(html, encoding="utf-8")
print("clockmaker.html", len(html) // 1024, "KB")
