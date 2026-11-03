"""题目仅逐字点读；这里只生成10句鼓励，不生成或加载题干/答案整句音频。"""
from pathlib import Path
import asyncio,base64,hashlib,json
import edge_tts
root=Path(__file__).resolve().parents[1]
encouragement=json.loads((root/'materials/encouragement.json').read_text())
texts={t for group in encouragement.values() for t in group}
cache=root/'.voice-cache'/'question-learning';cache.mkdir(parents=True,exist_ok=True)
async def main():
 sem=asyncio.Semaphore(5);voices={}
 async def one(t):
  p=cache/(hashlib.sha256(t.encode()).hexdigest()+'.mp3')
  async with sem:
   for attempt in range(3):
    try:
     if not p.exists():await asyncio.wait_for(edge_tts.Communicate(t,'zh-CN-XiaoxiaoNeural').save(str(p)),60)
     voices[t]='data:audio/mpeg;base64,'+base64.b64encode(p.read_bytes()).decode();break
    except Exception:
     p.unlink(missing_ok=True)
     if attempt==2:raise
     await asyncio.sleep(attempt+1)
 await asyncio.gather(*(one(t) for t in texts))
 (root/'question-learning-voice.js').write_text('// 仅鼓励语音；题目、选项、提示和解释不提供整句朗读。\nObject.assign(window.TEACHER_VOICE_DATA, '+json.dumps(voices,ensure_ascii=False,separators=(',',':'))+');\n')
 print('鼓励配音完成',len(voices),'句；新题不加载整句配音。')
asyncio.run(main())
