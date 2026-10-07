"""Render every game line with Kokoro on the GPU into mp3s + manifest.json.
usage: python gen.py lines.json OUT_DIR [--only who]"""
import os,sys,json,hashlib,subprocess,time,re
import numpy as np
import onnxruntime as ort
ort.preload_dlls()
from kokoro_onnx import Kokoro
import imageio_ffmpeg

HERE=os.path.dirname(os.path.abspath(__file__))
M=os.path.join(HERE,'models')
FF=imageio_ffmpeg.get_ffmpeg_exe()

# voice casting: kokoro voice (or blend), speed, pitch factor (cartoon shift)
CAST={
  'narrator':dict(voice='af_heart',speed=1.0,pitch=1.0),
  'kitty':   dict(voice='am_puck',speed=1.08,pitch=1.26),
  'kitty2':  dict(voice='af_bella',speed=1.06,pitch=1.17),
  'raccoon': dict(voice='bm_george',speed=.95,pitch=.9),
  'storm':   dict(voice='am_onyx',speed=.9,pitch=.8),
  'unicorn': dict(voice='af_sky',speed=1.0,pitch=1.22),
  'dragon':  dict(voice='af_kore',speed=1.0,pitch=1.28),
}
# words the model reads better spelled out
FIX=[('·',', '),('−',' minus '),('×',' times '),('Mwa ha ha','Mwah ha ha'),('Wheeeeee','Wheee'),('Whoooa','Whoa'),('Hee hee hee','Heehee hee'),('MINE','mine'),('MY ','my '),('AMAZING','Amazing'),('Purr-fect','Purrfect')]
def tts_text(t):
  for a,b in FIX:t=t.replace(a,b)
  return t

def key(who,text):return who+'|'+text.strip()
def fname(k):return hashlib.sha1(k.encode('utf-8')).hexdigest()[:16]+'.mp3'

def trim(x,thr=.012,pad=int(24000*.04)):
  idx=np.where(np.abs(x)>thr)[0]
  if len(idx)==0:return x
  return x[max(0,idx[0]-pad):min(len(x),idx[-1]+pad)]

def encode(x,sr,pitch,path):
  x=x/ max(1e-4,np.max(np.abs(x)))*0.89
  af=f'asetrate={int(sr*pitch)},aresample={sr},atempo={1/pitch:.5f}' if abs(pitch-1)>.01 else 'anull'
  af+=',highpass=f=70,afade=t=in:d=0.01'
  cmd=[FF,'-hide_banner','-loglevel','error','-y','-f','f32le','-ar',str(sr),'-ac','1','-i','pipe:0','-af',af,'-c:a','libmp3lame','-b:a','56k','-ac','1',path]
  subprocess.run(cmd,input=x.astype(np.float32).tobytes(),check=True)

def main():
  lines=json.load(open(sys.argv[1],encoding='utf-8'));out=sys.argv[2];os.makedirs(out,exist_ok=True)
  only=sys.argv[sys.argv.index('--only')+1] if '--only' in sys.argv else None
  mpath=os.path.join(out,'manifest.json')
  manifest=json.load(open(mpath,encoding='utf-8')) if os.path.exists(mpath) else {}
  sess=ort.InferenceSession(os.path.join(M,'kokoro-v1.0.onnx'),providers=['CUDAExecutionProvider','CPUExecutionProvider'])
  k=Kokoro.from_session(sess,os.path.join(M,'voices-v1.0.bin'))
  t0=time.time();made=0
  for who,text in lines:
    if only and who!=only:continue
    kk=key(who,text);f=fname(kk);p=os.path.join(out,f)
    if os.path.exists(p) and manifest.get(kk)==f and not only:continue
    c=CAST.get(who,CAST['narrator'])
    a,sr=k.create(tts_text(text),voice=c['voice'],speed=c['speed'],lang='en-us')
    encode(trim(a),sr,c['pitch'],p);manifest[kk]=f;made+=1
    if made%100==0:print(made,'lines',round(time.time()-t0),'s',flush=True)
  # drop entries for lines that no longer exist
  keep={key(w,t) for w,t in lines}
  manifest={k2:v for k2,v in manifest.items() if k2 in keep}
  json.dump(manifest,open(mpath,'w',encoding='utf-8'),ensure_ascii=False,indent=0)
  used=set(manifest.values())
  for f in os.listdir(out):
    if f.endswith('.mp3') and f not in used:os.remove(os.path.join(out,f))
  print('done',made,'new;',len(manifest),'total',round(time.time()-t0),'s')

if __name__=='__main__':main()
