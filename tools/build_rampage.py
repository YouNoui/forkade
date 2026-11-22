"""Reuse the exact licensed, offline THREE bundle already shipped in ECHO 3D."""
from pathlib import Path
import re
r=Path(__file__).resolve().parents[1]
source=(r/'web/games3d/echo3d.html').read_text(encoding='utf-8')
scripts=re.findall(r'<script[^>]*>([\s\S]*?)</script>',source)
three=next(s for s in scripts if 'THREE' in s and len(s)>100000)
js=(r/'web/games3d/rampage.js').read_text(encoding='utf-8')
doc='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>RAMPAGE 3D — FORKADE</title>
<style>
*{box-sizing:border-box}html,body{margin:0;overflow:hidden;overscroll-behavior:none;touch-action:none;background:#06051a;color:#f1f3ff;font:14px Consolas,monospace;height:100%;user-select:none;-webkit-user-select:none}
canvas{display:block;width:100%;height:100%}button{min-height:44px;min-width:44px;font:700 13px Consolas,monospace;color:#22e4ff;background:#0d0a2acc;border:1px solid #22e4ff;border-radius:12px;padding:10px;touch-action:none}
#top{position:fixed;top:max(8px,env(safe-area-inset-top));left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#hud{flex:1;min-width:180px;color:#9dff57;text-shadow:0 1px 5px #000;font-weight:bold}#notice{position:fixed;top:95px;left:12px;right:12px;text-align:center;font-size:12px;text-shadow:0 1px 4px #000;pointer-events:none}
#stick{position:fixed;left:max(20px,env(safe-area-inset-left));bottom:max(28px,env(safe-area-inset-bottom));width:120px;height:120px;border:2px solid #a07bff88;border-radius:50%;display:grid;place-items:center;background:#16113d88}
#knob{width:48px;height:48px;border-radius:50%;background:#22e4ff88;border:1px solid #22e4ff;pointer-events:none}
#actions{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(28px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:14px}#stomp{width:86px;height:86px;border-radius:50%;color:#ff3ea5;border-color:#ff3ea5}#rewind{width:58px;height:58px;border-radius:50%;color:#a07bff;border-color:#a07bff}
#bar{position:fixed;left:20px;bottom:max(10px,env(safe-area-inset-bottom));width:120px;height:6px;background:#252044}#energy{width:100%;height:100%;background:#a07bff}
#banner{position:fixed;inset:0;display:grid;place-content:center;text-align:center;background:#06051acc;gap:16px}#banner[hidden]{display:none}h1{font-size:26px;color:#22e4ff}
@media(max-height:450px){#notice{top:50px}#stick{width:95px;height:95px}#top{flex-wrap:nowrap}#hud{min-width:0;font-size:12px}}
</style></head><body><div id="top"><button id="back">× Menu</button><span id="hud"></span><button id="pause" aria-label="Pause">Ⅱ</button><button id="settings" aria-label="Settings">⚙</button></div>
<div id="notice"></div><div id="stick" aria-label="Movement joystick"><div id="knob"></div></div><div id="bar"><div id="energy"></div></div>
<div id="actions"><button id="rewind">REW</button><button id="stomp">STOMP</button></div><div id="banner" hidden><h1 id="result"></h1><p>Rewind is part of the game. Your next city awaits.</p><button id="retry">Play again</button></div>
<script>'''+three+'''</script><script>'''+js+'''</script></body></html>'''
(r/'web/games3d/rampage.html').write_text(doc,encoding='utf-8')
print('Built offline RAMPAGE 3D, preserving bundled THREE license')
