"""补齐语文/数学全部固定片段与拼音TTS原料；不读取用户存档。"""
from pathlib import Path
import json,re,subprocess
from pypinyin import lazy_pinyin,Style
ROOT=Path(__file__).resolve().parents[1]
spec=json.loads((ROOT/'scripts/narration-manifest.json').read_text());texts=set(spec['texts'])
# 数学的动态句子以语义短语、数字组合；缺少的汉字原子也预生成，永不换音色。
source=(ROOT/'math-app.js').read_text();data=(ROOT/'math-data.js').read_text()
def clean(s):
 s=re.sub(r'<[^>]*>','',s)
 for a,b in [('+','加'),('-','减'),('=','等于'),('>','大于'),('<','小于'),('□','几'),('?','几')]:s=s.replace(a,b)
 return re.sub(r'\s+',' ',s).strip()
for m in re.finditer(r"'([^'\n]{1,240})'",data+'\n'+source):
 s=clean(m[1])
 if re.fullmatch(r'[\u3400-\u9fff0-9，。！？、：；（） ·]+',s) and re.search(r'[\u3400-\u9fff]',s):texts.add(s)
for m in re.finditer(r'[\u3400-\u9fff][\u3400-\u9fff，。！？、：；]{1,45}',source):texts.add(m[0])
for s in ['加','减','等于','大于','小于','几','和','个','十','一','的','把','分成','凑成','再算','先算','计算','看大数','分小数','数一数','一共','小朋友你好，我是聪聪，快来一起玩数学游戏吧！']:
 texts.add(s)
for i in range(101):texts.add(str(i))
# 汉字兜底仍然是相同TTS的预生成音频，不调用系统声音。
texts.update(re.findall(r'[\u3400-\u9fff]',data+source))
js="""const fs=require('fs'),vm=require('vm');let c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync('data.js','utf8')+'; this.out={CHAR_UNITS,LETTER_INFO};',c);vm.runInContext(fs.readFileSync('pinyin-audio-data.js','utf8'),c);console.log(JSON.stringify({curriculum:c.out,keys:Object.keys(c.window.PINYIN_AUDIO_DATA)}));"""
raw=json.loads(subprocess.check_output(['node','-e',js],cwd=ROOT))
preferred=[]
for u in raw['curriculum']['CHAR_UNITS']:
 for l in u['lessons']:
  for item in l.get('items',[]):preferred.append(item.split()[0])
preferred+=list('阿哦鹅衣乌迂知吃诗日资雌思哀诶威凹欧优耶约儿安恩因温晕昂鞥英轰')
preferred+=list('玻坡摸佛得特讷勒哥科喝鸡七西')
by_tone={};by_base={}
for ch in dict.fromkeys(preferred):
 py=lazy_pinyin(ch,style=Style.TONE3,neutral_tone_with_five=True)[0]
 if re.fullmatch(r'[a-zvü]+[1-5]',py):
  py=py.replace('ü','v');by_tone.setdefault(py,ch);by_base.setdefault(py[:-1],ch)
from pypinyin.constants import PINYIN_DICT
for code in sorted(PINYIN_DICT):
 if not 0x4e00 <= code <= 0x9fff:continue
 ch=chr(code);py=lazy_pinyin(ch,style=Style.TONE3,neutral_tone_with_five=True)[0].replace('ü','v')
 if re.fullmatch(r'[a-zv]+[1-5]',py):by_base.setdefault(py[:-1],ch)
units={k:v['say'] for k,v in raw['curriculum']['LETTER_INFO'].items()}
units.update({'a':'阿','o':'哦','e':'鹅','ao':'凹','eng':'鞥','ong':'轰','ü':'迂','ui':'威','iu':'优','un':'温','ün':'晕'})
phonetics={}
for key in raw['keys']:
 if key.startswith('unit:'):
  base=key[5:].replace('v','ü');ch=units.get(base)
  if not ch:raise ValueError(key)
  unit_tone=4 if base=='r' else 1
  spoken=lazy_pinyin(ch,style=Style.TONE3,neutral_tone_with_five=True)[0]
  phonetics[key]={'text':ch,'tone':unit_tone,'retone':not spoken.endswith(str(unit_tone)),'cutInitial':base=='ong'}
 else:
  base,t=key[:-1],int(key[-1]);normal={'yi':'yi','wu':'wu','yu':'yu'}.get(base,base)
  tonekey=normal+str(t or 5);ch=by_tone.get(tonekey)
  if ch:phonetics[key]={'text':ch,'tone':t,'retone':False}
  else:
   ch=by_base.get(normal)
   if not ch:
    # 库中的非独立韵母按标准拼写对应到零声母音节。
    alias={'v':'yu','ve':'yue','vn':'yun','i':'yi','u':'wu','in':'yin','ing':'ying','ong':'hong','eng':'eng'}
    ch=by_base.get(alias.get(normal,''))
   if not ch:raise ValueError('No TTS source for '+key)
   phonetics[key]={'text':ch,'tone':t,'retone':True,'cutInitial':normal=='ong'}
 texts.add(phonetics[key]['text'])
for key,info in phonetics.items():
 if not key.startswith('unit:') and key[:-1] in {'a','o','e','yi','wu','yu'}:info['retone']=True
spec['texts']=sorted(texts);spec['phonetics']=phonetics;spec['phoneticVersion']=1
(ROOT/'scripts/narration-manifest.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n')
print('Unified narration texts:',len(texts),'TTS phonetic clips:',len(phonetics))
