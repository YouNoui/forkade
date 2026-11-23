"""Build the offline Phase 1 beta from our code and the unchanged licensed THREE bundle."""
from pathlib import Path
import re
r=Path(__file__).resolve().parents[1]
p=r/'web/games3d'
three=next(s for s in re.findall(r'<script[^>]*>([\s\S]*?)</script>',(p/'echo3d.html').read_text(encoding='utf-8')) if 'THREE' in s and len(s)>100000)
scripts=[three]+[(p/f).read_text(encoding='utf-8') for f in ['../rumble-rules.js','rumble-core.js','../rumble-replay.js','rumble-toys.js','rumble-online.js','rumble.js']]
doc=(p/'rumble-shell.html').read_text(encoding='utf-8').replace('<!-- BUNDLED_SCRIPTS -->',''.join('<script>'+s+'</script>' for s in scripts))
(p/'rumble.html').write_text(doc,encoding='utf-8')
print('Built ECHO RUMBLE beta with licensed offline THREE')
