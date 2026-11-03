"""按上下文读音建立单字点读表，四声复用拼音库，轻声从短句词边界提取。"""
from pathlib import Path
import asyncio,base64,json,re,hashlib,subprocess
import edge_tts
R=Path(__file__).resolve().parents[1]
a=json.loads((R/'materials/question-learning-pinyin.json').read_text())
marks={c:(b,n+1) for b,s in {'a':'āáǎà','e':'ēéěè','i':'īíǐì','o':'ōóǒò','u':'ūúǔù','v':'ǖǘǚǜ'}.items() for n,c in enumerate(s)}
def key(py):
 out='';tone=0
 for c in py:
  if c in marks:out+=marks[c][0];tone=marks[c][1]
  else:out+=c.replace('ü','v')
 return out,tone
pairs=set((c,p) for text,ps in a.items() for c,p in zip(text,ps) if p)
contexts={'di':('弟 弟','弟'),'la':('好 啦','啦'),'lao':('姥 姥','姥'),'me':('什么','么'),'de':('我的','的'),'yi':('读 一 读','一'),'le':('好了','了'),'si':('意 思','思'),'ge':('这 个','个'),'zhe':('听着','着'),'zi':('叶 子','子'),'er':('一 会 儿','儿'),'men':('我 们','们'),'mian':('上 面','面'),'tou':('前 头','头'),'ma':('好 吗','吗'),'guo':('看 过','过'),'lai':('起 来','来'),'you':('朋 友','友'),'huan':('喜 欢','欢'),'bian':('左 边','边'),'shang':('晚 上','上'),'sheng':('先 生','生'),'li':('玻 璃','璃'),'bo':('萝 卜','卜'),'fu':('衣 服','服'),'jing':('眼 睛','睛'),'a':('好 啊','啊'),'ne':('你 呢','呢'),'ba':('好 吧','吧'),'qian':('前 面','前'),'chang':('常 常','常'),'hu':('招 呼','呼'),'fang':('地 方','方'),'wa':('娃 娃','娃')}
# Use a neutral source with the same syllable; semantics of the selected character do not change pronunciation.
cache=R/'.voice-cache'/'character-neutral';cache.mkdir(parents=True,exist_ok=True)
async def main():
 voices={};sem=asyncio.Semaphore(5)
 async def neutral(py):
  if py not in contexts:raise ValueError('请人工指定轻声上下文：'+py)
  text,target=contexts[py];text=' '.join(text.replace(' ',''));p=cache/(hashlib.sha256(text.encode()).hexdigest()+'.mp3');meta=p.with_suffix('.json');out=cache/(py+'.mp3')
  async with sem:
   if not out.exists():
    if not p.exists() or not meta.exists():
     data=bytearray();events=[]
     async for c in edge_tts.Communicate(text,'zh-CN-XiaoxiaoNeural',boundary='WordBoundary').stream():
      if c['type']=='audio':data.extend(c['data'])
      elif c['type']=='WordBoundary':events.append(c)
     p.write_bytes(data);meta.write_text(json.dumps(events,ensure_ascii=False))
    events=json.loads(meta.read_text());event=next((e for e in reversed(events) if e['text']==target),None)
    if event is None:raise ValueError((text,events))
    start=max(0,event['offset']/1e7-.01);duration=event['duration']/1e7+.025
    proc=await asyncio.create_subprocess_exec('ffmpeg','-v','error','-y','-i',str(p),'-ss',str(start),'-t',str(duration),'-ar','24000','-ac','1','-c:a','libmp3lame','-b:a','32k',str(out),stderr=asyncio.subprocess.PIPE)
    _,err=await proc.communicate()
    if proc.returncode:raise RuntimeError(err.decode())
   return 'data:audio/mpeg;base64,'+base64.b64encode(out.read_bytes()).decode()
 needed={key(p)[0] for c,p in pairs if key(p)[1]==0}
 print('需要轻声',sorted(needed),flush=True)
 recordings=dict(zip(sorted(needed),await asyncio.gather(*(neutral(p) for p in sorted(needed)))))
 for c,p in pairs:
  if key(p)[1]==0:voices[c+'|'+p]=recordings[key(p)[0]]
 (R/'question-character-voice.js').write_text('// 轻声按短句上下文从女老师TTS中提取；四声复用标准拼音库。\nwindow.QUESTION_CHARACTER_VOICE = '+json.dumps(voices,ensure_ascii=False,separators=(',',':'))+';\n')
 print('轻声点读覆盖',len(voices),flush=True)
asyncio.run(main())
subprocess.run(['python3',str(R/'scripts/build-extra-syllables.py')],check=True)
