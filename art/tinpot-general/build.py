"""Build the standalone page: template + art/lib/rig.js + cut.png (__IMG__) + hat.png (__HAT__).
Run from the repo root with the rembg venv python: python art/tinpot-general/build.py"""
import base64
from pathlib import Path

d = Path('art/tinpot-general')
rig = Path('art/lib/rig.js').read_text(encoding='utf-8')
url = lambda p: 'data:image/png;base64,' + base64.b64encode((d / p).read_bytes()).decode()
html = (d / 'tinpot-general.template.html').read_text(encoding='utf-8')
html = html.replace('__RIGJS__', rig).replace('__IMG__', url('cut.png')).replace('__HAT__', url('hat.png')).replace('__BLADE__', url('blade.png'))
(d / 'tinpot-general.html').write_text(html, encoding='utf-8')
print('built', len(html) // 1024, 'KB')
