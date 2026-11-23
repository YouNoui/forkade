#!/usr/bin/env python3
"""Bundle web/ into a single self-contained dist/forkade.html.
Inlines engine + all game scripts, and inlines the 3D page so it runs from
one file (three.js is inlined, so 3D works offline too)."""
import re, json, pathlib, base64

here = pathlib.Path(__file__).parent
html = (here / "index.html").read_text(encoding="utf-8").replace('<base href="/">', "")

# Keep file:// copies self-contained: no manifest/icon/SW fetches from missing paths.
html = re.sub(r'<link rel="(?:manifest|icon|apple-touch-icon)"[^>]*>', '', html)
icon = base64.b64encode((here / "icons/icon-192.png").read_bytes()).decode()
html = html.replace('src="icons/icon-192.png"', 'src="data:image/png;base64,' + icon + '"')
html = html.replace('</head>', '<link rel="icon" href="data:image/png;base64,' + icon + '"></head>', 1)
html = html.replace('if ("serviceWorker" in navigator)', 'if (false /* single-file build */)')

# inline <script src="..."></script>
def inline(m):
    return "<script>\n" + (here / m.group(1)).read_text(encoding="utf-8") + "\n</script>"
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)

# Keep the hero poster offline; the optional loop is not loaded in file:// copies.
poster=base64.b64encode((here/'media/rumble-poster.jpg').read_bytes()).decode()
html=html.replace('media/rumble-poster.jpg','data:image/jpeg;base64,'+poster)

# inline the 3D page so the single file can run it via iframe srcdoc
for game, variable in [("echo3d", "__ECHO3D_HTML__"), ("rampage", "__RAMPAGE_HTML__"), ("rumble", "__RUMBLE_HTML__")]:
    content = (here / "games3d" / (game + ".html")).read_text(encoding="utf-8")
    inject = "<script>window." + variable + " = " + json.dumps(content).replace("</", "<\\/") + ";</script>\n</body>"
    html = html.replace("</body>", inject, 1)

# the one-file build has no playground.html beside it: link the live one
html = html.replace('"playground.html"', '"https://playforkade.com/playground.html"')

out = here.parent / "dist" / "forkade.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
print("wrote", out, len(html), "bytes")

# also publish it on the site so the Download button can hand it out
dl = here / "download" / "forkade.html"
dl.parent.mkdir(exist_ok=True)
dl.write_text(html, encoding="utf-8")
print("wrote", dl)
