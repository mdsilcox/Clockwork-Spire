"""Inline rig.js and the cut-out painting so foreman.html works when opened as a file."""
import base64
from pathlib import Path

here = Path(__file__).parent
img = "data:image/png;base64," + base64.b64encode((here / "foreman_cut.png").read_bytes()).decode()
html = (here / "foreman.template.html").read_text(encoding="utf-8")
html = html.replace("__RIGJS__", (here / "rig.js").read_text(encoding="utf-8")).replace("__IMG__", img)
(here / "foreman.html").write_text(html, encoding="utf-8")
print("foreman.html", len(html) // 1024, "KB")
