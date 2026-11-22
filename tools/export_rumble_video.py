"""Export real-time excerpts (no speed-up) with the actual captured game audio.
Optional recording dependency: pip install imageio-ffmpeg.
Run tools/record_rumble.cjs first. Artifacts stay outside git.
"""
import json, re, subprocess
from pathlib import Path
import imageio_ffmpeg

out=Path(r'C:\Users\Younes\Desktop\shared process\echo-rumble\phase1-1-source')
dest=out.parent
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
timeline=json.loads((out/'timeline.json').read_text())
probe=subprocess.run([ffmpeg,'-hide_banner','-i',str(out/'full-run.webm')],capture_output=True,text=True)
duration=re.search(r'Duration: (\d+):(\d+):([\d.]+)',probe.stderr)
h,m,s=map(float,duration.groups());end=h*3600+m*60+s
clips=[(timeline['timeline'][0]['seconds']+.5,12),(timeline['timeline'][1]['seconds']-.1,10),(timeline['timeline'][2]['seconds']-.1,9),(timeline['timeline'][3]['seconds']-.1,8),(timeline['timeline'][4]['seconds']-7,12)]
filters=[]
for i,(start,length) in enumerate(clips):
    filters.extend([f'[0:v]trim=start={start}:duration={length},setpts=PTS-STARTPTS[v{i}]',f'[1:a]atrim=start={max(0,start-timeline["audioStart"])}:duration={length},asetpts=PTS-STARTPTS[a{i}]'])
filters.append(''.join(f'[v{i}][a{i}]' for i in range(5))+'concat=n=5:v=1:a=1[v][a]')
subprocess.run([ffmpeg,'-y','-hide_banner','-loglevel','error','-i',str(out/'full-run.webm'),'-i',str(out/'game-audio.webm'),'-filter_complex',';'.join(filters),'-map','[v]','-map','[a]','-c:v','libx264','-crf','20','-preset','fast','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',str(dest/'phase1-1.mp4')],check=True)
for i,second in enumerate([7,17,34,48],1):
    subprocess.run([ffmpeg,'-y','-hide_banner','-loglevel','error','-ss',str(second),'-i',str(dest/'phase1-1.mp4'),'-frames:v','1',str(dest/f'phase1-1-{i}.png')],check=True)
(dest/'phase1-1-README.md').write_text('ECHO RUMBLE Phase 1.1: 51 seconds at 390x844. Five real-time excerpts, actual procedural game audio; no sped-up gameplay. Shows seeded chaos, emotes, captions, boss introduction and a real victory dance. Four screenshots are extracted from the video. Recorded with headless Chromium on a desktop host, not a physical Android. All API traffic was intercepted locally. Source timeline and full recording in phase1-1-source.\n',encoding='utf-8')
print('Saved',dest/'phase1-1.mp4','and four screenshots (51 seconds).')
