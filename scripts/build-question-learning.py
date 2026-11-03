"""课本对应章节：五章×两组×十题；不改动原始识字库。"""
from pathlib import Path
import json,re
from pypinyin import lazy_pinyin,Style,load_phrases_dict
R=Path(__file__).resolve().parents[1]
D={}
def unit(id,title,subtitle,icon,chapters):
 D[id]={'title':title,'subtitle':subtitle,'icon':icon,'chapters':chapters,'questions':[]};return D[id]
def vis(items,layout='cards',caption='看图想一想'):
 return {'items':[{'symbol':s,'label':t} for s,t in items],'layout':layout,'caption':caption}
def add(u,ch,g,p,opts,h,e,v,skill='理解',level=1):
 assert len(opts)==3 and len(set(opts))==3,(p,opts)
 u['questions'].append({'id':f"{ch}-{g}-{sum(q['chapter']==ch and q['group']==g for q in u['questions'])+1}",'chapter':ch,'group':g,'prompt':p,'options':opts,'answer':0,'hint':h,'explain':e,'visual':v,'skill':skill,'level':level})
C=unit('yuwen-garden5-exam','语文园地五 · 读懂题目','按课文练一练，先读懂要求，再学习字词和句子。','📚',[
 {'id':'autumn','name':'秋天','page':'语文第60—61页','icon':'🍂','words':['秋天','树叶','大雁','来了']},
 {'id':'jiangnan','name':'江南','page':'语文第62—63页','icon':'🪷','words':['江南','莲叶','小鱼','东西南北']},
 {'id':'painters','name':'雪地里的小画家','page':'语文第64—65页','icon':'🐾','words':['雪地','竹叶','月牙','小马']},
 {'id':'seasons','name':'四季','page':'语文第66—67页','icon':'🌱','words':['春天','夏天','秋天','冬天']},
 {'id':'garden','name':'语文园地五','page':'语文第68—69页','icon':'🌼','words':['开关','先后','内外','光阴']}
])
# 题意组：每章以本章字词演练同一组基础指令，不要求还未学过的语法。
params=[('autumn','树叶','叶','秋天','秋天来了。','树叶黄了。','🍂','大雁','南方'),('jiangnan','莲叶','叶','江南','小鱼游来了。','鱼戏莲叶间。','🪷','小鱼','莲叶间'),('painters','小马','马','雪地','小马走来了。','小马画月牙。','🐴','小马','雪地'),('seasons','春天','天','春天','春天来了。','草芽尖尖。','🌱','草芽','春天'),('garden','开关','开','冬天','冬天来了。','雪人大肚子一挺。','⛄','雪人','冬天')]
for ch,word,char,season,sentence,line,icon,who,where in params:
 g='题目小侦探';v=vis([(icon,word),('pencil','拼音：____')],caption='看清要求，再想一想')
 add(C,ch,g,f'给“{word}”注音，是要写什么？',['拼音','颜色','数字'],'注音里的“音”是读音。','注音就是给汉字写出拼音。',v,'读懂注音')
 add(C,ch,g,f'用“{char}”组词，要怎么做？',[f'组成含有“{char}”的词语','画一个圆','数一数有几笔'],'组词是给一个字找词语朋友。',f'组词要用上给出的字，比如“{word}”。',vis([(icon,char),('arrow',word)]),'读懂组词')
 add(C,ch,g,f'读一读“{line}”，题目先让你做什么？',['把这句话读出来','把所有字擦掉','只写一个数字'],'“读一读”是把文字读出声。','读一读，就是先读清楚文字，再想它的意思。',vis([(icon,line),('ear','读一读')]),'读懂朗读')
 add(C,ch,g,f'圈出“{sentence}”里的“天”字。要做什么？',['找到“天”并画圈','给每个字画圈','只圈标点'],'先找题目指定的字。','圈出哪个字，就只给指定的字画圈。',vis([('card',sentence),('pencil','圈出：天')]),'读懂圈出')
 # Some sentences have no 天; adapt to a visible character.
 q=C['questions'][-1];target='天' if '天' in sentence else sentence[0];q['prompt']=f'圈出“{sentence}”里的“{target}”字。要做什么？';q['options'][0]=f'找到“{target}”并画圈';q['visual']['items'][1]['label']='圈出：'+target
 add(C,ch,g,f'看图写话时，先看图中的什么？',['有谁，在做什么','纸张有多重','题号有多长'],'先观察人物、事物和动作。','看图写话，先看清有谁、在哪里、在做什么，再用通顺的话说一说。',vis([(icon,who),('scene',where)]),'读懂看图')
 add(C,ch,g,f'题目说“选一选”，看到“{word}”相关选项后，要怎么做？',['按题目要求选答案','每个选项都选','不看题目随便选'],'先读清楚选什么。','选一选，要从选项中找符合题目要求的答案。',vis([(icon,word),('check','选一选')]),'读懂选择')
 add(C,ch,g,f'题目说把词语连一连。对“{word}”应该做什么？',['找到对应内容，用线连接','把词语剪掉','把词语擦掉'],'连一连，需要用到线。','先找出对应内容，再用线连起来。',vis([(icon,word),('line','对应的内容')]),'读懂连线')
 add(C,ch,g,f'把“{sentence}”补充完整，“填空”是什么意思？',['把缺少的内容补上','重新画一幅图','给题号注音'],'空着的地方还缺少内容。','填空，就是根据题目要求，把空缺的内容补充完整。',vis([('card',sentence.replace(sentence[0],'____',1)),(icon,'填一填')]),'读懂填空')
 add(C,ch,g,f'按课文内容填空，应该根据什么来填？',['本章学过的课文','随便想到的数字','纸张的颜色'],'“按课文内容”告诉你到哪里找答案。','先回想课文，再把课文中相应的内容填进去。',vis([('book',next(c['name'] for c in C['chapters'] if c['id']==ch)),(icon,line)]),'按要求作答',2)
 add(C,ch,g,f'把“{word}”写在横线上，应该写在哪里？',['题目给出的横线上','任意图片里','题目上方的空白处'],'横线就是一条横着的线。','先看清题目让你写什么，再写到指定的位置。',vis([(icon,word),('pencil','____________')]),'找作答位置')
# 语文知识：对应四篇课文和园地的成对词语、四季词语、惜时名言。
knowledge={
'autumn':[
 ('《秋天》里，天气怎样了？','凉了','热了','不变','课文开头说天气凉了。','天气凉了，是课文写到的秋天变化。','🍂','天气凉了'),
 ('《秋天》里，树叶变成什么颜色？','黄色','蓝色','紫色','看看秋叶的颜色。','课文说树叶黄了。','🍂','树叶黄了'),
 ('叶子从哪里落下来？','树上','水底','书包里','看看叶子原来长在哪里。','课文写一片片叶子从树上落下来。','tree','树上 → 叶子'),
 ('课文里的大雁往哪个方向飞？','南方','北方','东方','读一读：一群大雁往南飞。','往南飞，就是朝南方飞。','🪿','大雁 → 南'),
 ('大雁一会儿排成“人”字，还排成什么字？','一','口','田','想一想课文中的两种队形。','大雁一会儿排成人字，一会儿排成一字。','birds','人　　一'),
 ('“一片片叶子”说的是哪种意思？','不止一片叶子','只有一片叶子','没有叶子','“一片片”表示一片又一片。','一片片，表示有多片叶子。','leaves','叶子　叶子　叶子'),
 ('哪个词语说的是季节？','秋天','树叶','大雁','季节有春夏秋冬。','秋天是一年四季中的一个季节。','🍂','秋天'),
 ('给“树”找朋友，哪个是词语？','树叶','树南','树了','想想树上长着什么。','树和叶组成词语“树叶”。','tree','树　叶'),
 ('“从树上落下来”里的“落”读什么？','luò','là','lào','这里说的是叶子往下落。','“落下来”的“落”读luò。','🍃','落下来'),
 ('“秋天来了”这句话说什么来了？','秋天','小马','小鱼','找一找“来了”前面的词。','这句话告诉我们秋天来了。','🍂','秋天来了')],
'jiangnan':[
 ('“江南可采莲”里，可以采什么？','莲','雪','星星','找一找“采”后面的字。','“采莲”就是采摘莲。','🪷','采莲'),
 ('“鱼戏莲叶间”里，谁在嬉戏？','鱼','大雁','小马','找一找句子开头的字。','诗中写的是鱼在莲叶间嬉戏。','🐟','鱼戏莲叶间'),
 ('“莲叶间”是在哪里？','莲叶之间','山顶上','雪地里','“间”在这里表示中间、之间。','小鱼在莲叶之间游来游去。','pond','莲叶之间'),
 ('与“东”相对的方向是哪个？','西','南','上','东西是一组成对的方向词。','东和西是相对的方向。','compass','东　西'),
 ('与“南”相对的方向是哪个？','北','东','下','南北是一组成对的方向词。','南和北是相对的方向。','compass','南　北'),
 ('“莲叶”的“叶”读什么？','yè','yé','yě','和“树叶”里的“叶”一样。','莲叶的“叶”读yè。','🪷','莲叶'),
 ('哪个词语表示一种动物？','小鱼','莲叶','江南','动物会自己活动。','小鱼是一种动物。','🐟','小鱼'),
 ('把“小鱼、游来游去”连成句，哪句通顺？','小鱼游来游去。','游来小鱼游去。','游去来游小鱼。','先说谁，再说做什么。','“小鱼游来游去”是一句通顺的话。','🐟','小鱼 → 游动'),
 ('“鱼戏莲叶间”的“戏”在这里表示什么？','嬉戏、玩耍','睡觉','写字','小鱼在水中自在地游动。','“戏”在这里是嬉戏、玩耍的意思。','pond','鱼在莲叶间'),
 ('诗中小鱼在莲叶的哪些方向嬉戏？','东西南北','只有东边','只有南边','诗中依次写到四个方向。','诗中写到莲叶东、西、南、北。','compass','东　西　南　北')],
'painters':[
 ('课文里的小鸡画什么？','竹叶','梅花','月牙','小鸡的脚印细细的。','小鸡的脚印像竹叶。','🐥','小鸡 → 竹叶'),
 ('课文里的小狗画什么？','梅花','竹叶','月牙','小狗的脚印像花。','小狗的脚印像梅花。','🐕','小狗 → 梅花'),
 ('课文里的小鸭画什么？','枫叶','月牙','竹叶','小鸭的脚印宽宽的。','小鸭的脚印像枫叶。','🦆','小鸭 → 枫叶'),
 ('课文里的小马画什么？','月牙','梅花','竹叶','小马的脚印弯弯的。','小马的脚印像月牙。','🐴','小马 → 月牙'),
 ('小画家们在哪里画画？','雪地里','海里','天上','看看课文的题目。','小动物在雪地里留下脚印，像画了画。','snow','雪地'),
 ('谁没有参加雪地里的画画？','青蛙','小鸡','小马','课文最后问到谁。','青蛙没有参加，它在洞里睡着了。','🐸','青蛙'),
 ('青蛙在哪里睡着了？','洞里','树上','莲叶上','回想课文的最后一句。','课文说青蛙在洞里睡着了。','frog-cave','洞里'),
 ('小动物用什么留下“画”？','脚印','画笔','颜料','课文说不用颜料不用笔。','小动物走过雪地，留下脚印，就像画了画。','footprints','雪地里的脚印'),
 ('“几步就成一幅画”里的“几”读什么？','jǐ','jī','jì','这里表示数量不确定。','表示多少步的“几”读jǐ。','footprints','几步'),
 ('“竹”可以组成哪个词？','竹叶','竹冬','竹马牙','小鸡的脚印像什么？','竹和叶可以组成“竹叶”。','🎋','竹　叶')],
'seasons':[
 ('草芽尖尖，课文说的是什么季节？','春天','冬天','秋天','草芽开始生长。','《四季》里，草芽说自己是春天。','🌱','草芽尖尖'),
 ('荷叶圆圆，课文说的是什么季节？','夏天','冬天','秋天','荷叶让我们想到温暖的季节。','《四季》里，荷叶说自己是夏天。','lotus-leaf','荷叶圆圆'),
 ('谷穗弯弯，课文说的是什么季节？','秋天','春天','冬天','谷穗成熟了。','《四季》里，谷穗说自己是秋天。','🌾','谷穗弯弯'),
 ('雪人大肚子一挺，说的是什么季节？','冬天','春天','夏天','雪人是用雪堆成的。','《四季》里，雪人说自己是冬天。','⛄','雪人'),
 ('一年有几个季节？','四个','两个','五个','数一数春夏秋冬。','一年有春、夏、秋、冬四个季节。','seasons','春　夏　秋　冬'),
 ('哪个词语描写荷叶的样子？','圆圆','尖尖','弯弯','荷叶像一个圆圆的盘子。','课文用“圆圆”描写荷叶。','lotus-leaf','荷叶'),
 ('哪个词语描写草芽的样子？','尖尖','圆圆','弯弯','看看草芽的顶端。','课文用“尖尖”描写草芽。','🌱','草芽'),
 ('把“春、夏、秋、冬”连起来，是哪四个字？','春夏秋冬','冬春秋夏','夏冬春秋','按一年季节的常用顺序来读。','春夏秋冬，是一年四季的常用排列顺序。','seasons','春 → 夏 → 秋 → 冬'),
 ('“雪人”的“人”读什么？','rén','rěn','rèn','和“大人”里的“人”一样。','雪人的“人”读rén。','⛄','雪人'),
 ('“春天”的“天”可以组成哪个词？','冬天','冬日人','天青竹','想想一年四季的名字。','“天”可以组成春天、夏天、秋天、冬天等词语。','seasons','春天　冬天')],
'garden':[
 ('“开”的反义词是什么？','关','南','先','门打开以后，还可以怎样？','开和关意思相反。','door','开　关'),
 ('“先”的反义词是什么？','后','内','正','先做一件事，再做一件事。','先和后是一组反义词。','sequence','先　后'),
 ('“内”的反义词是什么？','外','男','北','屋内和屋外。','内和外意思相反。','house','内　外'),
 ('“正”的反义词是什么？','反','上','先','一张卡有正面和反面。','正和反是一组成对词语。','card','正　反'),
 ('下面哪一组是园地五学过的成对词语？','男女','树叶','莲花','想想识字加油站的词语。','男和女可以组成成对词语“男女”。','children','男　女'),
 ('“一年之计在于春”，说到哪个季节？','春天','夏天','冬天','听一听句子最后的“春”。','这句话提醒我们珍惜春天的时光，做好安排。','🌱','一年之计在于春'),
 ('“一日之计在于晨”，说到一天中的什么时候？','早晨','晚上','中午','“晨”就是早晨。','早晨是一天的开始，要珍惜早晨的时光。','🌅','一日之计在于晨'),
 ('“寸金难买寸光阴”提醒我们什么？','珍惜时间','随便浪费时间','只看金子的颜色','过去的时间回不来。','时间很宝贵，我们应该珍惜时间。','clock','珍惜时间'),
 ('读词语：大地、树叶、小鱼。哪个是动物？','小鱼','大地','树叶','想想哪一个会游动。','小鱼是动物，大地和树叶不是动物。','🐟','大地　树叶　小鱼'),
 ('“关”可以组成哪个词语？','开关','关莲','关鱼戏','想想开灯和关灯。','开和关组成词语“开关”。','switch','开　关')]
}
for ch,rows in knowledge.items():
 for p,a,b,c,h,e,icon,label in rows:add(C,ch,'语文小发现',p,[a,b,c],h,e,vis([(icon,label)]),'课文理解',1 if len(C['questions'])%2 else 2)
M=unit('math-unit4-solids','立体图形 · 读懂题目','按课本活动分章练习：认一认、分一分、滚一滚、搭一搭、拼一拼。','🧊',[
 {'id':'recognize','name':'认识图形','page':'数学第67—68页','icon':'🧊','words':['长方体','正方体','圆柱','球']},
 {'id':'classify','name':'按形状分类','page':'数学第68页','icon':'🧺','words':['形状','相同','分别','物品']},
 {'id':'roll','name':'滚动与摆放','page':'数学第68—69页','icon':'⚽','words':['滚动','站稳','平面','推动']},
 {'id':'stack','name':'搭积木','page':'数学第69—70页','icon':'🏗️','words':['上下','最下面','稳','高']},
 {'id':'combine','name':'拼图形','page':'数学第71—72页','icon':'🧩','words':['拼成','相同','一共','数一数']}
])
shapes=['球','正方体','圆柱','长方体'];symbols=['sphere','cube','cylinder','cuboid'];cn=['零','一','二','三','四','五','六','七','八','九','十']
for chapter in M['chapters']:
 ch=chapter['id'];g='题目小侦探'
 # 十类短指令，各章换用当前章的场景。
 for i,(name,sym) in enumerate(zip(shapes,symbols)):
  row=vis([(sym,name),('pencil','名称：____')])
  add(M,ch,g,f'在“{chapter["name"]}”练习里，写出图形的名称，是写什么？' if i==0 else f'看图，题目让写“{name}”的名称，应写什么？',[name,'红色','三个'] if i else ['图形的名字','图形的颜色','图形的重量'],'名称就是名字。',f'这幅图里的图形是{name}。名称就是它的名字。',row,'读懂名称')
  if i==1:break
 n=list(c['id'] for c in M['chapters']).index(ch)+1
 # 每章不同数量，全部限制在十以内。
 kinds=[symbols[(n+j)%4] for j in range(3)];names=[shapes[(n+j)%4] for j in range(3)]
 add(M,ch,g,'从左边数，第'+cn[min(n,3)]+'个图形是什么？',[names[min(n,3)-1],names[min(n,3)%3],names[(min(n,3)+1)%3]],'从左边开始，一个一个数。',f'从左边开始数，第{cn[min(n,3)]}个是{names[min(n,3)-1]}。',vis(list(zip(kinds,['','',''])),'row','左 → 右'),'读懂方向')
 add(M,ch,g,'从右边数，第'+cn[min(n,3)]+'个图形是什么？',[names[-min(n,3)],names[(3-min(n,3)+1)%3],names[(3-min(n,3)+2)%3]],'这次要从最右边开始数。',f'从右边开始数，第{cn[min(n,3)]}个是{names[-min(n,3)]}。',vis(list(zip(kinds,['','',''])),'row','左　　右'),'读懂方向')
 add(M,ch,g,f'题目问“一共有几个”，要把图中的物体怎样数？',['全部数上','只数最左边的','只数一个'],'“一共”表示合在一起的总数。',f'要把图中的物体全部数上，一共有{cn[n+1]}个。',vis([('cube','')]*(n+1),'row','一共几个？'),'读懂一共')
 add(M,ch,g,f'题目说“数一数有几个球”，要数什么？',['只数球','只数圆柱','所有形状都数'],'先找到题目指定的形状。',f'题目问的是球，所以只数球，不把其他形状算进去。',vis([('sphere','')]*n+[('cylinder','')],'row','数一数球'),'读懂筛选')
 add(M,ch,g,'题目说“把相同形状的连起来”，要怎么做？',['找到形状相同的再连线','只找颜色相同的','把所有图形连成一条线'],'相同形状说的是样子相同。','连线时，要按题目要求比较形状。',vis([(symbols[n%4],''),(symbols[(n+1)%4],''),(symbols[n%4],'')]),'读懂相同')
 add(M,ch,g,'题目说“把不是球的选出来”，要特别看哪个词？',['不是','球的颜色','选项的大小'],'“不是”表示要排除球。','看到“不是”，要选球以外的图形。',vis([(symbols[n%4],''),('sphere',''),(symbols[(n+1)%4],'')]),'读懂否定',2)
 add(M,ch,g,'题目说“看图说一说”，要怎么做？',['先观察，再说自己的发现','不看图直接选','只抄题目'],'说一说，需要先看清图。','仔细看形状和摆放，再把自己的发现说出来。',vis([(chapter['icon'],chapter['name']),('ear','说说发现')]),'读懂观察')
 add(M,ch,g,'题目说“把正确答案的序号填在括号里”，要写什么？',['答案前的编号','整幅图的颜色','题目中的每个字'],'序号就是答案前的编号。','先选出正确答案，再把它前面的编号填在括号里。',vis([(symbols[n%4],'①'),(symbols[(n+1)%4],'②'),('pencil','（　）')]),'读懂序号',2)
# 数学知识：每章十题，使用课本相同活动与十以内数量。
objects=[('篮球','🏀','球'),('足球','⚽','球'),('乒乓球','sphere','球'),('普通魔方','rubik','正方体'),('方方的积木块','cube','正方体'),('长纸盒','cuboid','长方体'),('合上的数学书','book3d','长方体'),('罐头盒','can','圆柱'),('电池','battery','圆柱'),('木板','plank','长方体')]
for label,icon,target in objects:
 opts=[target]+[s for s in shapes if s!=target][:2]
 add(M,'recognize','图形小发现',f'看图，{label}的形状最接近什么？',opts,'先看整体的形状。',f'{label}的形状最接近{target}。',vis([(icon,label)]),'联系生活')
for i in range(10):
 target=shapes[i%4]; a=symbols[i%4];b=symbols[(i+1)%4];c=symbols[(i+2)%4]
 # 两组不同排列及数量，要求按形状分类而非颜色。
 seq=[a,b,a,c] if i<4 else [b,a,c,a,b]
 n=seq.count(a)
 p=f'把{target}放在一组，图中有几个{target}？' if i<8 else f'只数图中的{target}，一共有几个？'
 if i>=8:seq=[a,a,a,b,c];n=3
 add(M,'classify','图形小发现',p,[cn[n]+'个',cn[n+1]+'个',cn[n-1]+'个'],'逐个找出指定的形状，不数其他的。',f'图中有{cn[n]}个{target}，形状相同的可以分在一组。',vis([(s,'') for s in seq],'row','按形状分一分'),'分类计数')
rollrows=[
 ('哪个图形能向不同方向滚动？','球','正方体','长方体','球的表面圆圆的。','球能向不同方向滚动。','sphere'),
 ('把圆柱横着放，轻轻推一推，会怎样？','可以滚动','变成球','变成正方体','想想圆柱弯曲的侧面。','圆柱横着放时，可以沿弯曲的侧面滚动。','cylinder-side'),
 ('把圆柱竖着放，用下面的平面能怎样？','站稳','自动飞起来','变成球','看看圆柱下面的平面。','圆柱用平的底面可以站稳。','cylinder'),
 ('正方体有平平的面，放在平桌上通常怎样？','比较稳','不停地滚','自动变圆','平平的面可以贴住桌面。','正方体的平面贴着桌面时，比较稳。','cube'),
 ('长方体在平桌上，轻轻平推，通常怎样移动？','沿桌面滑动','像球一样滚动','自己飞走','注意是轻轻地平推。','长方体有平平的面，可以沿桌面滑动。','cuboid'),
 ('哪种图形既能用平面站稳，又能横着滚动？','圆柱','球','普通纸片','想想有圆形底面和弯曲侧面的图形。','圆柱用底面可以站稳，横放又可以滚动。','cylinder'),
 ('把球放在积木上面搭高，容易发生什么？','滚下来','变成方块','长出平面','球没有用来站稳的平底面。','球容易滚动，搭积木时要特别小心。','sphere'),
 ('哪种图形和足球的滚动方式相似？','球','正方体','长方体','足球可以朝不同方向滚。','球和足球一样，可以向不同方向滚动。','⚽'),
 ('哪一种和圆柱一样，可以横放后滚动？','圆柱形罐头盒','长方体书本','正方体积木','看看罐头盒的弯曲侧面。','圆柱形罐头盒横放后，可以滚动。','can'),
 ('摸到一个平平的面，就一定是球吗？','不是','一定是','所有图形都一样','球的表面是曲的。','球没有这样的平面，摸到平面不能判断它是球。','cube')]
for p,a,b,c,h,e,sym in rollrows:add(M,'roll','图形小发现',p,[a,b,c],h,e,vis([(sym,'轻轻推一推')]),'观察与操作',2)
stackrows=[
 ('正方体上面再放一个正方体，一共有几个？',['cube','cube'],'两个','三个','一个'),
 ('长方体上面放一个正方体，最下面是什么？',['cube','cuboid'],'长方体','正方体','球'),
 ('圆柱上面放一个正方体，最上面是什么？',['cube','cylinder'],'正方体','圆柱','球'),
 ('三个正方体上下摆好，一共有几个？',['cube','cube','cube'],'三个','两个','四个'),
 ('从上往下数，第二个是什么？',['cube','cylinder','cuboid'],'圆柱','正方体','长方体'),
 ('从下往上数，第一个是什么？',['cube','cylinder','cuboid'],'长方体','圆柱','正方体'),
 ('从下往上数，第三个是什么？',['cube','cylinder','cuboid'],'正方体','圆柱','长方体'),
 ('把两个正方体摞起来，比只放一个正方体怎样？',['cube','cube'],'更高','更矮','一样高'),
 ('哪种摆法通常更稳？',['plank'],'把平平的面朝下','用一个尖角朝下','把球放在最下面'),
 ('圆柱竖放在长方体上，最下面是什么？',['cylinder','cuboid'],'长方体','圆柱','正方体')]
for p,seq,a,b,c in stackrows:
 explain='按题目说的方向，一个一个观察。'+a+'。'
 if '更高'==a:explain='两个同样的正方体上下摞起来，比一个更高。'
 if '平平' in a:explain='把平平的面放在下面，通常比用尖角支撑更稳。'
 add(M,'stack','图形小发现',p,[a,b,c],'先分清上面、下面，再观察图。',explain,vis([(s,'') for s in seq],'stack','上 ↑　↓ 下'),'位置与搭建',2)
# 拼图形以图中的每个小方块为一个计数单位。
for n in range(2,7):
 seq=[('cube','')]*n
 add(M,'combine','图形小发现','数一数，这一排用了几个小正方体？',[cn[n]+'个',cn[n-1]+'个',cn[n+1]+'个'],'从一边开始，一个一个数，不漏数不重复。',f'这一排用了{cn[n]}个小正方体。',vis(seq,'joined','数一数小正方体'),'计数',1)
combine=[
 ('两个相同的正方体，面对面拼紧后是什么形状？','长方体','球','圆柱',[('cube',''),('cube','')],'两个方块拼紧后，整体变长了。','两个相同正方体面对面拼紧，可以拼成长方体。'),
 ('三个相同的小正方体排成一排，整体是什么形状？','长方体','球','圆柱',[('cube','')]*3,'观察拼紧后整体的样子。','三个同样的小正方体排成一排，整体是长方体。'),
 ('图中左边两个小方块，右边一个，一共几个？','三个','两个','四个',[('cube',''),('cube',''),('plus','＋'),('cube','')],'把左右两边的小方块合起来数。','两个加一个，一共三个小正方体。'),
 ('用四个小正方体拼图，每个小方块应该怎样数？','每个只数一次','同一个数两次','只数最左边一个',[('cube','')]*4,'数过一个，就接着数下一个。','数一数时，不漏数，也不重复数。'),
 ('拼一拼后，小正方体的数量会怎样？','数量不变','一定变多','一定变少',[('cube','')]*3,'只是移动位置，没有增加或拿走。','只改变摆法，没有添加或拿走，小正方体的数量不变。')]
for p,a,b,c,seq,h,e in combine:add(M,'combine','图形小发现',p,[a,b,c],h,e,vis(seq,'joined','拼一拼、数一数'),'拼搭与计数',2)
exec((R/'scripts/question-learning-extras.py').read_text())
exec((R/'scripts/question-learning-textbook.py').read_text())
exec((R/'scripts/question-learning-themes.py').read_text())
# 核验四组恰好五十题；每章十道题意题、十道知识题。
for u in D.values():
 if u.get('extracurricular') or u.get('textbook'):continue
 for ch in u['chapters']:
  assert sum(q['chapter']==ch['id'] for q in u['questions'])==20,ch
 for group in {q['group'] for q in u['questions']}:assert sum(q['group']==group for q in u['questions'])==50,group
 assert len({q['id'] for q in u['questions']})==100
# 多音字、常用轻声，以及动词重叠式中的“一”。
phrases={'顽皮地':'wán pí de','开心地':'kāi xīn de','快乐地':'kuài lè de','长方体':'cháng fāng tǐ','正方体':'zhèng fāng tǐ','数一数':'shǔ yi shǔ','数什么':'shǔ shén me','数球':'shǔ qiú','数图':'shǔ tú','数一':'shǔ yi','数学':'shù xué','数量':'shù liàng','数字':'shù zì','数词':'shù cí','计数':'jì shù','重复数':'chóng fù shǔ','不数':'bù shǔ','数上':'shǔ shàng','数的':'shǔ de','数过':'shǔ guo','数时':'shǔ shí','听着':'tīng zhe','睡着':'shuì zháo','竖着':'shù zhe','横着':'héng zhe','贴着':'tiē zhe','朝下':'cháo xià','朝南':'cháo nán','长出':'zhǎng chū','变长':'biàn cháng','下面':'xià mian','上面':'shàng mian','里面':'lǐ mian','外面':'wài mian','什么':'shén me','怎么':'zěn me','时候':'shí hou','哪里':'nǎ lǐ','小朋友':'xiǎo péng you','叶子':'yè zi','盒子':'hé zi','名字':'míng zi','一下':'yí xià','一次':'yí cì','一共':'yí gòng','一个':'yí gè','一笔':'yì bǐ','一起':'yì qǐ','一组':'yì zǔ','一片片':'yí piàn piàn','重复':'chóng fù','正确':'zhèng què','正面':'zhèng miàn','正方形':'zhèng fāng xíng','重新':'chóng xīn','得高':'de gāo','的地':'de dì','相应':'xiāng yìng','间隔':'jiàn gé','之间':'zhī jiān','圆形':'yuán xíng','形状':'xíng zhuàng','这次':'zhè cì','“的”':'“ de ”','“地”':'“ dì ”'}
for word in ['读','写','连','选','拼','滚','分','认','摸','推','想','说','看','圈']:
 p=lazy_pinyin(word,style=Style.TONE)[0];phrases[word+'一'+word]=p+' yi '+p
# Standalone syllables in answers remain Latin; no attempt to treat them as Chinese words.
load_phrases_dict({w:[[p] for p in py.split()] for w,py in phrases.items() if len(w)==len(py.split())})
def contextual_py(text):
 ps=lazy_pinyin(text,style=Style.TONE,errors=lambda s:list(s))
 assert len(ps)==len(text)
 def tone(py):
  for marks in ['āáǎà','ēéěè','īíǐì','ōóǒò','ūúǔù','ǖǘǚǜ']:
   for n,c in enumerate(marks):
    if c in py:return n+1
  return 0
 for i,c in enumerate(text):
  if c=='一':
   if i>0 and i+1<len(text) and text[i-1]==text[i+1]:ps[i]='yi'
   elif (i and text[i-1] in '第十') or text[i:].startswith(('一声','一年级')):ps[i]='yī'
   elif i+1<len(text) and text[i+1] in '个张辆种盏幅群片排棵句次块座条组边点会共天年日笔圈步件本双只页刻些':
    n=tone(ps[i+1]);ps[i]='yí' if n==4 else 'yì' if n in (1,2,3) else ps[i]
  elif c=='不' and i+1<len(text):
   ps[i]='bú' if tone(ps[i+1])==4 else 'bù'
 return ps
annotations={}
for u in D.values():
 for chapter in u['chapters']:
  for text in [chapter['name'],chapter.get('storyVisual',{}).get('caption',''),*[item['label'] for item in chapter.get('storyVisual',{}).get('items',[])]]+chapter.get('story',[])+chapter['words']+[line for lines in chapter.get('themeStories',{}).values() for line in lines]:
   ps=contextual_py(text);assert len(ps)==len(text)
   annotations[text]=[p if re.fullmatch(r'[\u4e00-\u9fff]',c) else '' for c,p in zip(text,ps)]
 for q in u['questions']:
  q['source']=next(c['page'] for c in u['chapters'] if c['id']==q['chapter'])
  texts=[*[v['prompt'] for v in q.get('variants',{}).values()],q['prompt'],*q['options'],q['hint'],q['explain'],q['visual']['caption'],*[i['label'] for i in q['visual']['items']]]
  for text in texts:
   ps=contextual_py(text)
   assert len(ps)==len(text),(text,ps)
   # 数 used as a verb in these instructional frames, not the noun 数学/数量.
   for i,ch in enumerate(text):
    if ch=='数' and not any(text[i:].startswith(w) for w in ['数学','数量','数字','数词']):
     if i and text[i-1] in '计总个':continue
     ps[i]='shǔ'
   annotations[text]=[p if re.fullmatch(r'[\u4e00-\u9fff]',c) else '' for c,p in zip(text,ps)]
(R/'materials/question-learning.json').write_text(json.dumps(D,ensure_ascii=False,indent=2)+'\n')
(R/'materials/question-learning-pinyin.json').write_text(json.dumps(annotations,ensure_ascii=False,indent=2)+'\n')
enc=json.loads((R/'materials/encouragement.json').read_text())
(R/'question-learning-data.js').write_text('// 由 scripts/build-question-learning.py 生成。\nwindow.QUESTION_LEARNING = '+json.dumps(D,ensure_ascii=False,separators=(',',':'))+';\nwindow.QUESTION_ENCOURAGEMENT = '+json.dumps(enc,ensure_ascii=False,separators=(',',':'))+';\nwindow.QUESTION_PINYIN = '+json.dumps(annotations,ensure_ascii=False,separators=(',',':'))+';\n')
# 课外阅读分类继续复用同读音字卡。
for uid,u in D.items():
 if not u.get('extracurricular'):continue
 chars=list(dict.fromkeys(c for ch in u['chapters'] for line in ch['story'] for c in line if re.fullmatch(r'[\u4e00-\u9fff]',c)))
 items=[c+' '+lazy_pinyin(c,style=Style.TONE)[0]+' '+c for c in chars]
 lesson={'id':uid,'name':u['title'],'page':'一年级上学期 · 兴趣阅读','items':[],'reuseItems':items,'writeChars':[]}
 with (R/'question-learning-data.js').open('a') as out:out.write('CHAR_UNITS.push('+json.dumps({'unit':u['title'],'category':'课外阅读','color':'#518d7e','supplemental':True,'lessons':[lesson]},ensure_ascii=False,separators=(',',':'))+');\n')
print('完成：专项200题、课外100题、课本40课400题，共700题。')
