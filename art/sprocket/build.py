"""Build art/sprocket/sprocket.html: template + rig.js + both paintings (inline.py only handles one image)."""
import base64
from pathlib import Path
here = Path(__file__).parent
rig = (here.parent / "lib" / "rig.js").read_text(encoding="utf-8")
url = lambda p: "data:image/png;base64," + base64.b64encode((here / p).read_bytes()).decode()
html = (here / "sprocket.template.html").read_text(encoding="utf-8").replace("__RIGJS__", rig).replace("__IMG2__", url("cut-happy.png")).replace("__IMG__", url("cut.png"))
(here / "sprocket.html").write_text(html, encoding="utf-8")
print("sprocket.html", len(html) // 1024, "KB")
