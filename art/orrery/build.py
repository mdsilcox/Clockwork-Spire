"""Build: python art/orrery/build.py. Template + shared act 2 kit (art/valve-crab/kit.js) + a drawBroken copy with a crack length option + rig.js + cut.clean.png."""
import re, subprocess, sys
from pathlib import Path
art = Path(__file__).parent.parent; d = art / 'orrery'
kit = (art / 'valve-crab' / 'kit.js').read_text(encoding='utf-8')
fn = re.search(r'function drawBroken\(c, at, S, t\) \{.*?\n\}\n', kit, re.S).group(0).replace('for (let s = 0; s < 14; s++)', 'for (let s = 0; s < (d.len || 14); s++)')
tpl = (d / 'orrery.template.html').read_text(encoding='utf-8').replace('__KIT__', kit).replace('__DBFN__', '// drawBroken with a crack length option (d.len steps of 12 px); the later declaration wins.\n' + fn)
tmp = d / '_tpl.tmp.html'; tmp.write_text(tpl, encoding='utf-8')
subprocess.check_call([sys.executable, str(art / 'lib' / 'inline.py'), str(tmp), str(d / 'orrery.html'), str(d / 'cut.clean.png')])
tmp.unlink()
