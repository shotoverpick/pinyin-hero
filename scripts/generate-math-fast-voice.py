"""本地待审数学配音：整句算式按 6 个汉字 / 1.12 秒制作，不自动发布。"""
from pathlib import Path
import asyncio,argparse,hashlib,json,base64
import edge_tts
ROOT=Path(__file__).resolve().parents[1];CACHE=ROOT/'.voice-cache'/'math-fast-v1';CACHE.mkdir(exist_ok=True)
VOICE='zh-CN-XiaoxiaoNeural';RATE='+12%';CHAR_SECONDS=1.12/6
DIGITS='零一二三四五六七八九'
def number(n):
 if n<10:return DIGITS[n]
 if n==10:return '十'
 return (DIGITS[n//10] if n>=20 else '')+'十'+(DIGITS[n%10] if n%10 else '')
async def proc(args,data=None):
 p=await asyncio.create_subprocess_exec(*args,stdin=asyncio.subprocess.PIPE if data is not None else None,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE)
 out,err=await p.communicate(data)
 if p.returncode:raise RuntimeError(err.decode()[:180])
 return out
async def main():
 parser=argparse.ArgumentParser();parser.add_argument('--sample-only',action='store_true');args=parser.parse_args()
 texts={'1加1等于2':'一加一等于二'}
 if not args.sample_only:
  for a in range(21):
   for b in range(21):
    if a+b<=20:texts[f'{a}加{b}等于{a+b}']=number(a)+'加'+number(b)+'等于'+number(a+b)
    if b<=a:texts[f'{a}减{b}等于{a-b}']=number(a)+'减'+number(b)+'等于'+number(a-b)
  for n in range(21):texts[str(n)]=number(n)
  for t in ['加','减','等于','几']:texts[t]=t
 sem=asyncio.Semaphore(10);data={};metadata={};done=0
 async def generate(key,text):
  nonlocal done
  async with sem:
   target=round(len(text)*CHAR_SECONDS,6)
   h=hashlib.sha256((VOICE+'|'+RATE+'|'+text+'|'+str(target)).encode()).hexdigest()
   out=CACHE/(h+'.mp3');raw=CACHE/(h+'.raw.mp3')
   for attempt in range(3):
    try:
     if not out.exists():
      await asyncio.wait_for(edge_tts.Communicate(text,VOICE,rate=RATE).save(str(raw)),65)
      trim='silenceremove=start_periods=1:start_duration=0.01:start_threshold=-45dB:start_silence=0.012'
      pcm=await proc(['ffmpeg','-v','error','-i',str(raw),'-af',trim+',areverse,'+trim+',areverse','-f','f32le','-ar','24000','-ac','1','-'])
      duration=len(pcm)/4/24000;tempo=max(.5,min(4,duration/target))
      await proc(['ffmpeg','-v','error','-y','-f','f32le','-ar','24000','-ac','1','-i','-','-af',f'atempo={tempo:.8f},apad,atrim=duration={target:.6f}','-c:a','libmp3lame','-b:a','32k',str(out)],pcm)
      raw.unlink(missing_ok=True)
     audio=out.read_bytes();data[key]='data:audio/mpeg;base64,'+base64.b64encode(audio).decode();metadata[key]={'text':text,'targetSeconds':target,'file':out.name}
     if key=='1加1等于2':
      preview=ROOT/'试听-数学正常稍快语速.mp3';preview.write_bytes(audio)
      print('1+1=2 试听已生成：'+str(preview),flush=True)
     break
    except Exception:
     out.unlink(missing_ok=True)
     if attempt==2:raise
     await asyncio.sleep(1+attempt*2)
   done+=1
   if done%40==0 or done==len(texts):print(f'{done}/{len(texts)}',flush=True)
 await asyncio.gather(*(generate(key,text) for key,text in texts.items()))
 if not args.sample_only:
  output='// Local review: faster whole-sentence neural TTS math speech.\nwindow.MATH_FAST_VOICE_DATA = '+json.dumps(dict(sorted(data.items())),ensure_ascii=False,separators=(',',':'))+';\n'
  temp=ROOT/'math-fast-voice-data.js.tmp';temp.write_text(output);temp.replace(ROOT/'math-fast-voice-data.js')
  (ROOT/'scripts/math-fast-voice-manifest.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
  print('All math fast voices saved. No deployment performed.',flush=True)
asyncio.run(main())
