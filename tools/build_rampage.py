"""Reuse the exact licensed, offline THREE bundle already shipped in Echo 3D."""
from pathlib import Path
from build_ui import inline_ui
import re
r=Path(__file__).resolve().parents[1]
source=(r/'web/games3d/echo3d.html').read_text(encoding='utf-8')
scripts=re.findall(r'<script[^>]*>([\s\S]*?)</script>',source)
three=next(s for s in scripts if 'THREE' in s and len(s)>100000)
js=(r/'web/games3d/rampage.js').read_text(encoding='utf-8')
doc='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Rampage 3D — FORKADE</title>
<style>
*{box-sizing:border-box}html,body{margin:0;overflow:hidden;overscroll-behavior:none;touch-action:none;background:var(--base);color:var(--text);font:var(--t-sm) Consolas,monospace;height:100%;user-select:none;-webkit-user-select:none}
canvas{display:block;width:100%;height:100%}button{min-height:44px;min-width:44px;font:700 var(--t-xs) Consolas,monospace;color:var(--brand);background:var(--panel2);border:1px solid var(--brand);border-radius:var(--r-md);padding:var(--s2);touch-action:none}
#top{position:fixed;top:max(8px,env(safe-area-inset-top));left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));display:flex;gap:var(--s2);align-items:center;flex-wrap:wrap}
#hud{flex:1;min-width:180px;color:var(--text);text-shadow:0 1px 5px #000;font-weight:bold}#notice{position:fixed;top:95px;left:12px;right:12px;text-align:center;font-size:var(--t-xs);text-shadow:0 1px 4px #000;pointer-events:none}
#goal{position:fixed;top:122px;left:12px;right:12px;text-align:center;color:var(--text);text-shadow:0 1px 5px #000;font-weight:bold;pointer-events:none}#stick{position:fixed;left:max(20px,env(safe-area-inset-left));bottom:max(28px,env(safe-area-inset-bottom));width:120px;height:120px;border:2px solid var(--line);border-radius:50%;display:grid;place-items:center;background:var(--panel)}
#knob{width:48px;height:48px;border-radius:50%;background:rgba(34,225,255,.5);border:1px solid var(--brand);pointer-events:none}
#actions{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(28px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:var(--s3)}#stomp{width:86px;height:86px;border-radius:50%;color:var(--brand);border-color:var(--brand)}#rewind{width:58px;height:58px;border-radius:50%;color:var(--brand);border-color:var(--brand)}
#bar{position:fixed;left:20px;bottom:max(10px,env(safe-area-inset-bottom));width:120px;height:6px;background:var(--panel2)}#energy{width:100%;height:100%;background:var(--brand)}
#banner{position:fixed;inset:0;display:grid;place-content:center;text-align:center;background:rgba(11,10,16,.8);gap:var(--s4)}#banner[hidden]{display:none}h1{font-size:var(--t-xl);color:var(--brand)}
@media(max-height:450px){#notice{top:50px}#goal{top:72px}#stick{width:95px;height:95px}#top{flex-wrap:nowrap}#hud{min-width:0;font-size:var(--t-xs)}}
</style></head><body><div id="top"><button class="btn" id="back">× Menu</button><span id="hud"></span><button class="btn" id="pause" aria-label="Pause">Ⅱ</button><button class="btn" id="settings" aria-label="Settings"><svg class="ui-icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3"/><path d="M10 1v3m0 12v3M1 10h3m12 0h3M4 4l2 2m8 8 2 2M4 16l2-2m8-8 2-2"/></svg></button></div>
<div id="notice"></div><div id="goal"></div><div id="stick" aria-label="Movement joystick"><div id="knob"></div></div><div id="bar"><div id="energy"></div></div>
<div id="actions"><button class="btn" id="rewind">Rewind</button><button class="btn" id="stomp">Stomp</button></div><div id="banner" hidden><h1 id="result"></h1><p id="summary"></p><button class="btn" id="retry">Play again</button></div>
<script>'''+three+'''</script><script>'''+js+'''</script></body></html>'''
(r/'web/games3d/rampage.html').write_text(inline_ui(doc),encoding='utf-8')
print('Built offline Rampage 3D, preserving bundled THREE license')
