"""Build: python art/bell-ringer/build.py <asset> (default bell-ringer).
Template + art/bell-ringer/kit.js (shared act 2 kit) + rig.js + cut.clean.png (or cut.png) -> art/<asset>/<asset>.html."""
import subprocess, sys
from pathlib import Path
art = Path(__file__).parent.parent
name = sys.argv[1] if len(sys.argv) > 1 else 'bell-ringer'
d = art / name
kit = (d / 'kit.js').read_text(encoding='utf-8')
tpl = (d / f'{name}.template.html').read_text(encoding='utf-8').replace('__KIT__', kit)
tmp = d / '_tpl.tmp.html'; tmp.write_text(tpl, encoding='utf-8')
img = d / 'cut.clean.png'
if not img.exists(): img = d / 'cut.png'
subprocess.check_call([sys.executable, str(art / 'lib' / 'inline.py'), str(tmp), str(d / f'{name}.html'), str(img)])
tmp.unlink()
