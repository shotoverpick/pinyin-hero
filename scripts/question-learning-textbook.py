# 现有课本目录的全部42课：保留原课内容，增加兴趣导学入口和短练习。
catalog=json.loads((R/'materials/textbook-catalog.json').read_text())
base_units=catalog['units']
all_items=[s for u in base_units for l in u['lessons'] for s in l.get('items',[])]
all_chars=list(dict.fromkeys(s.split()[0] for s in all_items))
def alternatives(correct,choices):
 out=[correct]
 for c in choices:
  if c not in out:out.append(c)
  if len(out)==3:break
 assert len(out)==3,(correct,choices)
 return out
for base in base_units:
 for lesson in base['lessons']:
  lid=lesson['id'];name=lesson['name'];page=lesson.get('page','课本同步');idx=lesson.get('pinyinLessonIdx')
  words=[w.split()[0] for w in lesson.get('words',[])[:4]]
  if not words:words=[s.split()[0] for s in lesson.get('items',[])[:4]]
  pinyin_lesson=catalog['pinyin'][idx] if idx is not None else None
  if not words and pinyin_lesson:words=pinyin_lesson['items'][:4]
  u=unit(lid,name+' · 兴趣学习站','跟着汽车和方块伙伴，学习本课的字音、字词和阅读。','🚗',[{'id':'lesson','name':name,'page':page,'icon':'book','words':words,'story':lesson.get('text',[])[:2],'storyVisual':vis([('book',name)])}])
  u.update(textbook=True,category=base['category'],sourceUnit=base['unit'])
  if idx is not None:u['pinyinLessonIdx']=idx
  ch='lesson';topic=words[0] if words else name
  # 五类阅读要求，学习语句只使用本课字词。
  basic=[
   (f'来到“{name}”学习站，题目说“读一读”，先做什么？',['把文字读出来','把纸擦破','只看题号'],'读一读，就是把文字读出声。','先读清楚学习卡上的文字，再想一想意思。','读懂朗读'),
   (f'题目说“听一听”本课读音，应该怎样做？',['仔细听，再跟着读','把声音全关掉','只数图片'],'先认真听读音。','听清读音，再跟着读一遍。','听读'),
   (f'学习“{name}”时，遇到不认识的字可以怎么做？',['点字听读音','随便猜一个就不管了','把这一页撕掉'],'每个字都可以点一点。','点字听读音，再看看上方的拼音，就能继续学习。','学习方法'),
   (f'题目让“看一看，说一说”，先做什么？',['观察学习卡，再说发现','不看就乱说','只写题号'],'说之前先仔细观察。','先看清楚，再用自己的话说一说。','观察表达'),
   (f'给“{topic}”注音，是写什么？',['拼音','数字','车的颜色'],'注音与读音有关。','注音，就是写出读音的拼音。','读懂注音')]
  for p,opts,h,e,skill in basic:add(u,ch,'题目小侦探',p,opts,h,e,vis([('book',topic),('ear','听一听、读一读')]),skill)
  g='知识小练习'
  if pinyin_lesson:
   tokens=pinyin_lesson['items'];syllables=pinyin_lesson.get('syllables',[])
   for k in range(3):
    target=tokens[k%len(tokens)]
    options=alternatives(target,tokens+['a','o','e','m','n','ai','ang'])
    add(u,ch,g,'观察学习卡，哪个选项和卡上的拼音相同？'+f'（第{cn[k+1]}张）',options,'仔细看字母的形状和排列顺序。',f'这张学习卡上是{target}。',vis([('card',target)]),'拼音认读')
   # 以本课音节为题；无带调音节时复用元音四声，不臆造声母音节。
   candidates=[s for s in syllables if any(t in s for t in 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ')]
   for k in range(2):
    syl=(candidates[k] if len(candidates)>k else ['ā','ǎ'][k]);tone=next(n+1 for marks in ['āáǎà','ēéěè','īíǐì','ōóǒò','ūúǔù','ǖǘǚǜ'] for n,m in enumerate(marks) if m in syl);correct=['一声','二声','三声','四声'][tone-1]
    add(u,ch,g,f'看音节“{syl}”，它是第几声？',alternatives(correct,['一声','二声','三声','四声']),'观察音节上方的声调符号。',f'{syl}是{correct}。',vis([('card',syl)]),'声调辨认')
  else:
   records=lesson.get('items',[])
   assert records,lid
   for k in range(2):
    c,py,example=records[k%len(records)].split()
    distractors=[s.split()[1] for s in records+all_items]
    add(u,ch,g,f'在“{example}”里，“{c}”读什么？',alternatives(py,distractors),'先听例词，再看这个字的拼音。',f'“{example}”里的“{c}”读{py}。',vis([('card',example)]),'字音认读')
   c,py,example=records[0].split()
   add(u,ch,g,f'哪个词语里有“{c}”字？',alternatives(example,[s.split()[-1] for s in all_items if c not in s.split()[-1]]),'一个字一个字地找。',f'“{example}”中有“{c}”字。',vis([('card',c)]),'字词辨认')
   w=words[0] if words else example;target=w[0]
   add(u,ch,g,f'词语“{w}”的第一个字是哪一个？',alternatives(target,all_chars),'从左边开始看。',f'“{w}”的第一个字是“{target}”。',vis([('card',w)]),'顺序认字')
   last=w[-1]
   add(u,ch,g,f'词语“{w}”的最后一个字是哪一个？',alternatives(last,all_chars),'从左到右读到最后。',f'“{w}”的最后一个字是“{last}”。',vis([('card',w)]),'词语认读')
