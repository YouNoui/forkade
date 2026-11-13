#!/usr/bin/env python3
"""Bundle web/ into a single self-contained dist/forkade.html.
Inlines engine + all game scripts, and inlines the 3D page so it runs from
one file (three.js is inlined, so 3D works offline too)."""
import re, json, pathlib

here = pathlib.Path(__file__).parent
html = (here / "index.html").read_text()

# inline <script src="..."></script>
def inline(m):
    return "<script>\n" + (here / m.group(1)).read_text() + "\n</script>"
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)

# inline the 3D page so the single file can run it via iframe srcdoc
echo3d = (here / "games3d" / "echo3d.html").read_text()
inject = "<script>window.__ECHO3D_HTML__ = " + json.dumps(echo3d).replace("</", "<\\/") + ";</script>\n</body>"
html = html.replace("</body>", inject, 1)

# the one-file build has no playground.html beside it: link the live one
html = html.replace('"playground.html"', '"https://playforkade.com/playground.html"')

out = here.parent / "dist" / "forkade.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html)
print("wrote", out, len(html), "bytes")

# also publish it on the site so the Download button can hand it out
dl = here / "download" / "forkade.html"
dl.parent.mkdir(exist_ok=True)
dl.write_text(html)
print("wrote", dl)
