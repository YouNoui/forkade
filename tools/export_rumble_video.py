"""Export real-time excerpts (no speed-up) with the actual captured game audio.
Optional recording dependency: pip install imageio-ffmpeg.
Run tools/record_rumble.cjs first. Artifacts stay outside git.
"""
import json, re, subprocess
from pathlib import Path
import imageio_ffmpeg

out=Path(r'C:\Users\Younes\Desktop\shared process\echo-rumble')
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
timeline=json.loads((out/'timeline.json').read_text())
probe=subprocess.run([ffmpeg,'-hide_banner','-i',str(out/'full-run.webm')],capture_output=True,text=True)
duration=re.search(r'Duration: (\d+):(\d+):([\d.]+)',probe.stderr)
h,m,s=map(float,duration.groups());end=h*3600+m*60+s
clips=[(timeline['timeline'][0]['seconds']+.5,9),(timeline['timeline'][1]['seconds']-.1,9),(timeline['timeline'][2]['seconds']-.1,9),(end-13,13)]
filters=[]
for i,(start,length) in enumerate(clips):
    filters.extend([f'[0:v]trim=start={start}:duration={length},setpts=PTS-STARTPTS[v{i}]',f'[1:a]atrim=start={max(0,start-timeline["audioStart"])}:duration={length},asetpts=PTS-STARTPTS[a{i}]'])
filters.append(''.join(f'[v{i}][a{i}]' for i in range(4))+'concat=n=4:v=1:a=1[v][a]')
subprocess.run([ffmpeg,'-y','-hide_banner','-loglevel','error','-i',str(out/'full-run.webm'),'-i',str(out/'game-audio.webm'),'-filter_complex',';'.join(filters),'-map','[v]','-map','[a]','-c:v','libx264','-crf','20','-preset','fast','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',str(out/'phase1.mp4')],check=True)
for i,second in enumerate([6,13,34],1):
    subprocess.run([ffmpeg,'-y','-hide_banner','-loglevel','error','-ss',str(second),'-i',str(out/'phase1.mp4'),'-frames:v','1',str(out/f'phase1-{i}.png')],check=True)
(out/'README.md').write_text('ECHO RUMBLE Phase 1 candidate\n\nphase1.mp4: 40 seconds, 390x844, four real-time excerpts from one scripted-input run. Includes the actual procedural game audio; no sped-up gameplay. Three phase1-*.png screenshots come from this video.\n\nRecorded locally with headless Chromium, not a physical phone and not production. Vercel daily deployment quota prevented release at recording time. No production test data.\n\nShow the video to your son: keep going / change X.\n',encoding='utf-8')
print('Saved',out/'phase1.mp4','and three screenshots (40 seconds, actual game audio).')
