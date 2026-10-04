"""Embed sprocket_cut.png into the template so the page works when opened as a file."""
import base64
from pathlib import Path

here = Path(__file__).parent
b64 = base64.b64encode((here / "sprocket_cut.png").read_bytes()).decode()
html = (here / "sprocket.template.html").read_text(encoding="utf-8").replace("__IMG__", "data:image/png;base64," + b64)
(here / "sprocket.html").write_text(html, encoding="utf-8")
print("sprocket.html", len(html) // 1024, "KB")
