"""补足本次逐字点读需要、原拼音录音库尚未覆盖的读音。"""
from pathlib import Path
import asyncio,json,hashlib,base64
import edge_tts
R=Path(__file__).resolve().parents[1]
missing=json.loads((R/'materials/question-character-missing.json').read_text())
examples=dict(zip(['yan4','guang1','shen2','yan2','han4','zen3','cheng2','han2','rang4','diao4','biao1','ding4','tong1','dou1','sui2','bian4','gai1','rong2','hai2','gen1','chao2','pai2','biao3','mian4','zhai1','ding3','shua3','jiao4','bian1','jiao3','hai3','liao4','nuan3','sui4','miao2','pan2','lie4','cun4','mai3','lang4','hen3','gui4','zhuang4','tong2','fen1','gun3','cheng1','zong3','suan4','chao1','lei4','tie1','pan4','zeng1','gai3','jiao1','tai2','luan4','mang2','zhui1','pao3','tang3','shen1','gan4','cun2','cang2','sou1','dai4','mao4','zhuan3','nao3','kao3','shei2'],['雁','光','神','盐','汗','怎','城','寒','让','掉','标','定','通','兜','随','变','该','容','孩','根','潮','排','表','面','摘','顶','耍','叫','边','脚','海','料','暖','穗','苗','盘','列','寸','买','浪','很','贵','状','同','分','滚','撑','总','算','抄','类','贴','判','增','改','交','抬','乱','忙','追','跑','躺','伸','赣','存','藏','艘','带','茂','转','脑','考','谁']))
cache=R/'.voice-cache'/'extra-syllables';cache.mkdir(parents=True,exist_ok=True)
async def main():
 sem=asyncio.Semaphore(8);result={}
 async def one(row):
  key=row['key'];text=examples[key];p=cache/(key+'.mp3')
  async with sem:
   for n in range(3):
    try:
     if not p.exists():await asyncio.wait_for(edge_tts.Communicate(text,'zh-CN-XiaoxiaoNeural').save(str(p)),60)
     out=p.with_suffix('.trim.mp3')
     if not out.exists():
      proc=await asyncio.create_subprocess_exec('ffmpeg','-v','error','-y','-i',str(p),'-af','silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.015','-ar','24000','-ac','1','-c:a','libmp3lame','-b:a','32k',str(out),stderr=asyncio.subprocess.PIPE)
      _,err=await proc.communicate()
      if proc.returncode:raise RuntimeError(err.decode())
     result[key]='data:audio/mpeg;base64,'+base64.b64encode(out.read_bytes()).decode();break
    except Exception:
     p.unlink(missing_ok=True)
     if n==2:raise
     await asyncio.sleep(n+1)
 await asyncio.gather(*(one(row) for row in missing))
 path=R/'question-character-voice.js';content=path.read_text().split('// 补充四声音节')[0]
 content+='// 补充四声音节，来源为同音明确的汉字TTS。\nObject.assign(window.PINYIN_AUDIO_DATA, '+json.dumps(result,ensure_ascii=False,separators=(',',':'))+');\n'
 path.write_text(content)
 (R/'materials/question-extra-syllables.json').write_text(json.dumps(examples,ensure_ascii=False,indent=2)+'\n')
 print('补足标准点读音节',len(result),flush=True)
asyncio.run(main())
