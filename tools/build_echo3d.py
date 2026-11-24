"""Build ECHO 3D with the existing MIT-licensed inline THREE bundle."""
from pathlib import Path
from build_ui import inline_ui
import re
r=Path(__file__).resolve().parents[1]
s=(r/'web/games3d/echo3d.html').read_text(encoding='utf-8')
three=next(x for x in re.findall(r'<script[^>]*>([\s\S]*?)</script>',s) if len(x)>100000)
shell=(r/'web/games3d/echo3d-shell.html').read_text(encoding='utf-8')
(r/'web/games3d/echo3d.html').write_text(inline_ui(shell.replace('__THREE__',three).replace('__ECHO_GAME__',(r/'web/games3d/echo3d.js').read_text(encoding='utf-8'))),encoding='utf-8')
print('Built ECHO 3D sky islands')
