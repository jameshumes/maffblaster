import json,os,random,sys
from faster_whisper import WhisperModel
import subprocess,numpy as np,imageio_ffmpeg
FF=imageio_ffmpeg.get_ffmpeg_exe()
def load(f):return np.frombuffer(subprocess.run([FF,'-loglevel','error','-i',f,'-f','f32le','-ac','1','-ar','16000','pipe:1'],capture_output=True).stdout,np.float32)
out=sys.argv[1];m=json.load(open(os.path.join(out,'manifest.json'),encoding='utf-8'))
model=WhisperModel('base.en',device='cpu',compute_type='int8')
items=list(m.items());random.seed(3)
by={}
for k,f in items:by.setdefault(k.split('|')[0],[]).append((k,f))
for who,lst in by.items():
  for k,f in random.sample(lst,min(4,len(lst))):
    segs,_=model.transcribe(load(os.path.join(out,f)),beam_size=1)
    print(f'{who:9s} | want: {k.split("|",1)[1]}\n          | got:  {"".join(s.text for s in segs).strip()}')
