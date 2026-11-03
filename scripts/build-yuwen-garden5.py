from pathlib import Path
import json,re
from pypinyin import lazy_pinyin,Style
root=Path(__file__).resolve().parents[1]
text=(root/'materials/yuwen-garden5-source.txt').read_text('utf-8')
chars=list(dict.fromkeys(re.findall(r'[\u4e00-\u9fff]',text)))
preferred={'校':'xiào','长':'zhǎng','得':'dé','着':'zhe','地':'dì','乐':'lè','空':'kòng','难':'nán','当':'dāng','会':'huì','给':'gěi','为':'wéi','一':'yī','的':'de','了':'le'}
examples={"校":"学校","给":"给","落":"落下","将":"将","当":"想当","空":"填空","难":"难买","着":"听着","地":"地上","长":"长大"}
items=[]
for c in chars:
 p=preferred.get(c) or lazy_pinyin(c,style=Style.TONE)[0]
 items.append(f'{c} {p} {examples.get(c,c)}')
data={'name':'一年级上册·语文园地五（试卷专项）','characters':chars,'items':items}
(root/'materials/yuwen-garden5.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
unit={'unit':data['name'],'category':'试卷专项','color':'#b477d8','supplemental':True,'lessons':[{'id':'yuwen-garden5-exam','name':'试卷专项识字','page':'语文园地五','reuseItems':items,'items':[],'writeChars':[]}]}
(root/'yuwen-garden5-literacy.js').write_text('// 由 scripts/build-yuwen-garden5.py 生成。\nCHAR_UNITS.push('+json.dumps(unit,ensure_ascii=False,separators=(',',':'))+');\n')
print('去重汉字:',len(chars))
