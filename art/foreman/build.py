"""Build art/foreman/foreman.html: template + rig.js + both paintings (phase 1 apron, phase 2 band)."""
import base64
from pathlib import Path
here = Path(__file__).parent
rig = (here.parent / "lib" / "rig.js").read_text(encoding="utf-8")
url = lambda p: "data:image/png;base64," + base64.b64encode((here / p).read_bytes()).decode()
html = (here / "foreman.template.html").read_text(encoding="utf-8").replace("__RIGJS__", rig).replace("__IMG2__", url("cut-phase2.png")).replace("__IMG__", url("cut.png"))
(here / "foreman.html").write_text(html, encoding="utf-8")
print("foreman.html", len(html) // 1024, "KB")
