from pathlib import Path
import asyncio,base64,json,hashlib
import edge_tts
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'materials/math-unit4.json').read_text())
texts=set([w['text'] for w in data['words']]+data['sentences']+[f"{c['example']}，{c['example']}的{c['text']}" for c in data['characters']]+['立体图形'])
cache=root/'.voice-cache'/'math-unit4';cache.mkdir(parents=True,exist_ok=True)
async def main():
 sem=asyncio.Semaphore(8);result={};fail=[];done=0
 async def one(t):
  nonlocal done
  path=cache/(hashlib.sha256(t.encode()).hexdigest()+'.mp3')
  async with sem:
   for n in range(3):
    try:
     if not path.exists():await asyncio.wait_for(edge_tts.Communicate(t,'zh-CN-XiaoxiaoNeural',rate='+0%').save(str(path)),60)
     b=path.read_bytes()
     if len(b)<300:raise ValueError('empty')
     result[t]='data:audio/mpeg;base64,'+base64.b64encode(b).decode();break
    except Exception as e:
     path.unlink(missing_ok=True)
     if n==2:fail.append((t,str(e)))
     else:await asyncio.sleep(n+1)
   done+=1
   if done%50==0:print(done,'/',len(texts),'failed',len(fail),flush=True)
 await asyncio.gather(*(one(t) for t in texts))
 if fail:print('FAIL',fail,flush=True);raise SystemExit(1)
 (root/'math-unit4-voice.js').write_text('// 温柔女老师 TTS，数学第四单元补充配音。\nObject.assign(window.TEACHER_VOICE_DATA, '+json.dumps(result,ensure_ascii=False,separators=(',',':'))+');\n')
 print('生成完成',len(result),flush=True)
asyncio.run(main())
