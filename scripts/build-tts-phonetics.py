"""用同一女老师TTS音频制作拼音，必要时独立校正音高曲线，不改变语速。"""
from pathlib import Path
import json,hashlib,base64,subprocess,concurrent.futures,time
import numpy as np
import pyworld as pw
ROOT=Path(__file__).resolve().parents[1];cache=ROOT/'.voice-cache'
spec=json.loads((ROOT/'scripts/narration-manifest.json').read_text())
def source_path(text):
 token=hashlib.sha256((spec['voice']+'\0'+spec['rate']+'\0'+text).encode()).hexdigest()
 return cache/(token+'.mp3')
def make(item):
 key,info=item;source=source_path(info['text'])
 for _ in range(120):
  if source.exists():break
  time.sleep(1)
 if not source.exists():raise ValueError('Missing source TTS '+info['text'])
 retone=info.get('retone');cut=info.get('cutInitial');duration=None
 if not retone and not cut:return key,'data:audio/mpeg;base64,'+base64.b64encode(source.read_bytes()).decode(),{'text':info['text'],'method':'neural-tts'}
 identity=hashlib.sha256(('phonetic-v2|'+key+'|'+json.dumps(info,ensure_ascii=False)).encode()).hexdigest()
 out=cache/(identity+'.phonetic.mp3')
 if not out.exists():
  raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-f','f64le','-ar','24000','-ac','1','-'])
  x=np.frombuffer(raw,dtype='<f8').copy();fs=24000
  f0,t=pw.dio(x,fs,f0_floor=70,f0_ceil=600,frame_period=5)
  f0=pw.stonemask(x,f0,t,fs);voiced=np.flatnonzero(f0>0)
  if len(voiced)<8:raise ValueError('No clear voiced TTS source '+key+' '+info['text'])
  if cut:
   # ong 使用 hong 的有声韵腹及韵尾，去掉声母h的清擦音。
   start=max(0,int(t[voiced[0]]*fs));x=x[start:]
   f0,t=pw.dio(x,fs,f0_floor=70,f0_ceil=600,frame_period=5);f0=pw.stonemask(x,f0,t,fs);voiced=np.flatnonzero(f0>0)
  # 排除尾部弱混响，避免把尾音/噪声误当作声调的一部分。
  energy=np.array([np.sqrt(np.mean(x[max(0,int(ti*fs)-120):min(len(x),int(ti*fs)+121)]**2)) for ti in t])
  active=energy>max(float(energy.max())*.12,.003)
  f0[~active]=0;voiced=np.flatnonzero(f0>0)
  sp=pw.cheaptrick(x,f0,t,fs);ap=pw.d4c(x,f0,t,fs)
  center=float(np.clip(np.median(f0[voiced]),220,270));z=(t[voiced]-t[voiced[0]])/max(t[voiced[-1]]-t[voiced[0]],.01)
  shapes={1:([0,1],[1.15,1.15]),2:([0,1],[.78,1.15]),3:([0,.48,1],[.84,.62,1.02]),4:([0,1],[1.18,.62]),0:([0,1],[.86,.78])}
  pos,levels=shapes[info['tone']];target=f0.copy();target[voiced]=center*np.interp(z,pos,levels)
  y=pw.synthesize(target,sp,ap,fs,frame_period=5);peak=np.max(np.abs(y))
  if peak>0:y*=min(1,.92/peak)
  y[:min(240,len(y))]*=np.linspace(0,1,min(240,len(y)))
  y[-min(240,len(y)):]*=np.linspace(1,0,min(240,len(y)))
  proc=subprocess.run(['ffmpeg','-v','error','-y','-f','f64le','-ar','24000','-ac','1','-i','-','-c:a','libmp3lame','-b:a','32k',str(out)],input=y.astype('<f8').tobytes(),capture_output=True)
  if proc.returncode:raise RuntimeError(proc.stderr.decode()[:150])
  duration=len(y)/fs
 return key,'data:audio/mpeg;base64,'+base64.b64encode(out.read_bytes()).decode(),{'text':info['text'],'method':'neural-tts+pitch-contour','tone':info['tone'],'cutInitial':bool(cut)}
def main():
 data={};report={}
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  for i,(key,uri,details) in enumerate(pool.map(make,spec['phonetics'].items()),1):
   data[key]=uri;report[key]=details
   if i%100==0:print(f'Phonetic TTS {i}/{len(spec["phonetics"])}',flush=True)
 output='// Same neural TTS voice as narration. Source and tone processing: scripts/phonetic-provenance.json\nwindow.PINYIN_AUDIO_DATA = '+json.dumps(dict(sorted(data.items())),ensure_ascii=False,separators=(',',':'))+';\n'
 temp=ROOT/'pinyin-audio-data.js.tmp';temp.write_text(output);temp.replace(ROOT/'pinyin-audio-data.js')
 (ROOT/'scripts/phonetic-provenance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print('All',len(data),'pinyin clips now derive from the same neural TTS voice.',flush=True)

if __name__=='__main__':main()
