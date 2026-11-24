"""Generate reproducible 1200x630 PNGs and crawler-readable game entry pages.
Requires Pillow (pip install -r tools/requirements.txt). No remote assets/fonts.
Run after changing index.html or game metadata, before build_dist.py.
"""
from pathlib import Path
import html, json, re
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'

def font(size):
    for name in ['C:/Windows/Fonts/consolab.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        if Path(name).exists(): return ImageFont.truetype(name, size)
    return ImageFont.load_default(size=size)

def build():
    version=re.search(r'forkade-(v\d+)',(WEB/'sw.js').read_text())[1]
    update=WEB/'updates.js'
    update.write_text(re.sub(r"const version='v\d+'", "const version='"+version+"'", update.read_text(encoding='utf-8')),encoding='utf-8')
    games = {}
    for path in sorted((WEB/'games').glob('*.js')):
        title = re.search(r'title:\s*"([^"]+)"', path.read_text(encoding='utf-8'))
        if title: games[path.stem] = title[1]
    games['echo3d'] = 'Echo 3D'
    games['rumble'] = 'Echo Rumble 2 beta'
    if (WEB/'games3d/rampage.html').exists(): games['rampage'] = 'Rampage 3D'
    (WEB/'og').mkdir(exist_ok=True); (WEB/'entries').mkdir(exist_ok=True)
    for ident, title in games.items():
        im = Image.new('RGB',(1200,630),'#0b0a10'); d=ImageDraw.Draw(im)
        for y in range(630): d.line((0,y,1200,y), fill=(8,10+int(y/40),14+int(y/32)))
        for x in range(0,1200,60): d.line((x,0,x,630), fill='#16262b')
        for y in range(0,630,60): d.line((0,y,1200,y), fill='#16262b')
        glow=Image.new('RGBA',im.size); gd=ImageDraw.Draw(glow)
        gd.rounded_rectangle((920,175,1120,375),45,fill='#22e1ff')
        im=Image.alpha_composite(im.convert('RGBA'),glow.filter(ImageFilter.GaussianBlur(28)))
        d=ImageDraw.Draw(im); d.rounded_rectangle((920,175,1120,375),45,fill='#22e1ff')
        d.rounded_rectangle((952,248,1095,296),18,fill='#0b0a10'); d.ellipse((1055,257,1079,281),fill='white')
        d.line((1020,175,1020,135),fill='#22e1ff',width=8); d.ellipse((1006,115,1034,143),fill='#ffd84d')
        d.text((70,65),'FORKADE',font=font(42),fill='#22e1ff')
        words=title.split(); lines=['']
        for word in words:
            trial=(lines[-1]+' '+word).strip()
            if d.textlength(trial,font=font(70))>780: lines.append(word)
            else: lines[-1]=trial
        for n,line in enumerate(lines): d.text((65,230+85*n),line,font=font(70),fill='#f1f3ff')
        d.text((925,410),'ECHO',font=font(38),fill='#ffd84d')
        d.text((70,520),'PLAY IT. REWIND IT. FORK IT.',font=font(28),fill='#22e1ff')
        d.text((70,568),'playforkade.com/'+ident,font=font(22),fill='#9a9fc4')
        im.convert('RGB').save(WEB/'og'/f'{ident}.png',optimize=True)
        doc=(WEB/'index.html').read_text(encoding='utf-8')
        doc=re.sub(r'<meta\s+(?:property|name)="(?:og:|twitter:)[^"]*"[^>]*>', '', doc)
        doc=re.sub(r'<link\s+rel="canonical"[^>]*>', '', doc)
        doc=re.sub(r'<title>.*?</title>',f'<title>{html.escape(title)} - FORKADE</title>',doc,count=1)
        meta=f'''<link rel="canonical" href="https://playforkade.com/{ident}">
<meta property="og:type" content="website"><meta property="og:title" content="{html.escape(title)} - FORKADE">
<meta property="og:description" content="Play it, rewind it, fork it. Free neon arcade starring ECHO.">
<meta property="og:url" content="https://playforkade.com/{ident}">
<meta property="og:image" content="https://playforkade.com/og/{ident}.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{html.escape(title)} - FORKADE">
<meta name="twitter:image" content="https://playforkade.com/og/{ident}.png">'''
        doc=doc.replace('</head>',meta+'\n</head>',1)
        (WEB/'entries'/f'{ident}.html').write_text(doc,encoding='utf-8')
    config=json.loads((ROOT/'vercel.json').read_text())
    config['rewrites']=[{'source':'/admin','destination':'/admin.html'},{'source':'/r/coop/:code','destination':'/index.html'}]+[{'source':'/'+g,'destination':'/entries/'+g+'.html'} for g in games]+[{'source':'/:path*','destination':'/index.html'}]
    (ROOT/'vercel.json').write_text(json.dumps(config,indent=2)+'\n')
    print('Generated',len(games),'game entry pages and PNGs')
if __name__=='__main__': build()
