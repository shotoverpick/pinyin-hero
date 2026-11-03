from pathlib import Path
import json,re
from pypinyin import lazy_pinyin,Style,load_phrases_dict
root=Path(__file__).resolve().parents[1]
source=(root/'materials/math-unit4-source.txt').read_text(encoding='utf-8')
wordline,lines=source.strip().split('\n\n',1)
words=list(dict.fromkeys(re.split('[、。]',wordline)));words=[w for w in words if w]
sentences=lines.splitlines()
load_phrases_dict({'长方体':[['cháng'],['fāng'],['tǐ']], '数一数':[['shǔ'],['yi'],['shǔ']], '得分':[['dé'],['fēn']], '站得稳':[['zhàn'],['de'],['wěn']], '跑得快':[['pǎo'],['de'],['kuài']], '滚得最快':[['gǔn'],['de'],['zuì'],['kuài']], '相应':[['xiāng'],['yìng']], '一共':[['yí'],['gòng']], '不易':[['bú'],['yì']], '下面':[['xià'],['mian']], '最下面':[['zuì'],['xià'],['mian']], '左边':[['zuǒ'],['bian']], '右边':[['yòu'],['bian']], '喜欢':[['xǐ'],['huan']], '小朋友':[['xiǎo'],['péng'],['you']], '堆起来':[['duī'],['qǐ'],['lai']], **{w:[[wpy[0]],['yi'],[wpy[0]]] for w,wpy in [('填一填',['tián']),('辨一辨',['biàn']),('选一选',['xuǎn']),('连一连',['lián']),('想一想',['xiǎng']),('圈一圈',['quān'])]}})
def py(s):return lazy_pinyin(s,style=Style.TONE,neutral_tone_with_five=False)
worditems=[{'text':w,'pinyin':' '.join(py(w))} for w in words]
# A character's example is selected from its first word; the displayed reading is its reading in that example.
characters=[];seen=set()
for w in words+sentences:
 chinese=''.join(re.findall(r'[\u4e00-\u9fff]',w)); syllables=py(chinese)
 assert len(chinese)==len(syllables),(w,syllables)
 for i,c in enumerate(chinese):
  if c not in seen:
   seen.add(c); characters.append({'text':c,'pinyin':syllables[i],'example':w if w in words else c})
# These characters have multiple relevant readings; a chosen example makes the single-character reading explicit.
for item in characters:
 if item['text']=='一':item.update(pinyin='yī',example='一')
 if item['text']=='面':item.update(pinyin='miàn',example='两面')
 if item['text']=='边':item.update(pinyin='biān',example='边')
 if item['text']=='友':item.update(pinyin='yǒu',example='友')
 if item['text']=='欢':item.update(pinyin='huān',example='欢')
 if item['text']=='来':item.update(pinyin='lái',example='来')
 if item['text']=='不':item.update(pinyin='bù',example='不')
 if item['text']=='数':item.update(pinyin='shù',example='数学')
 if item['text']=='长':item.update(pinyin='cháng',example='长方体')
 if item['text']=='得':item.update(pinyin='de',example='站得稳')
 if item['text']=='应':item.update(pinyin='yìng',example='相应')
data={'name':'一年级数学上册·第四单元·立体图形','unit':'一年级数学上册·第四单元','characters':characters,'words':worditems,'sentences':sentences}
(root/'materials/math-unit4.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
lesson={'id':'math-unit4-solids','name':'立体图形','page':'数学拓展素材','textTitle':'📖 原始题目（阅读素材）','text':sentences,'words':[w['text']+' '+w['pinyin'] for w in worditems],'writeChars':[],'items':[c['text']+' '+c['pinyin']+' '+c['example'] for c in characters]}
js="// 由 scripts/build-math-unit4.py 生成；原始数据见 materials/math-unit4.json。\nCHAR_UNITS.push("+json.dumps({'unit':data['unit'],'category':'数学识字','color':'#6578bf','supplemental':True,'lessons':[lesson]},ensure_ascii=False,separators=(',',':'))+");\n"
(root/'math-unit4-literacy.js').write_text(js,encoding='utf-8')
print('单字',len(characters),'词语',len(words),'句子',len(sentences))
