from pathlib import Path
import asyncio,hashlib,base64,json
import edge_tts
root=Path(__file__).resolve().parents[1]
# Only send newly needed isolated characters and their short pronunciation examples.
items=json.loads((root/'materials/yuwen-garden5.json').read_text())['items']
new={x['c'] for x in json.loads((root/'materials/yuwen-garden5-new-readings.json').read_text())}
texts={f'{w}，{w}的{c}' for c,p,w in (x.split(' ') for x in items) if c in new} | {'试卷专项识字'}
cache=root/'.voice-cache'/'yuwen-garden5';cache.mkdir(parents=True,exist_ok=True)
async def main():
 sem=asyncio.Semaphore(8);data={};fails=[]
 async def one(t):
  p=cache/(hashlib.sha256(t.encode()).hexdigest()+'.mp3')
  async with sem:
   for n in range(3):
    try:
     if not p.exists():await asyncio.wait_for(edge_tts.Communicate(t,'zh-CN-XiaoxiaoNeural',rate='+0%').save(str(p)),60)
     raw=p.read_bytes()
     if len(raw)<300:raise ValueError('empty')
     data[t]='data:audio/mpeg;base64,'+base64.b64encode(raw).decode();break
    except Exception as e:
     p.unlink(missing_ok=True)
     if n==2:fails.append((t,str(e)))
     else:await asyncio.sleep(n+1)
 await asyncio.gather(*(one(t) for t in texts))
 if fails:raise RuntimeError(str(fails))
 (root/'yuwen-garden5-voice.js').write_text('// 温柔女老师 TTS：试卷专项新增字卡。\nObject.assign(window.TEACHER_VOICE_DATA, '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+');\n')
 print('新增字卡配音',len(data))
asyncio.run(main())
