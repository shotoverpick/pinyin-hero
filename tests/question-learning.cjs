const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const data=JSON.parse(fs.readFileSync('materials/question-learning.json','utf8'));
const storage={stars:{'char:s1':2,'char:y5':3},mistakes:{keep:{s:'天 tiān 天地',n:2}},bonus:7,settings:{sound:true,voiceProfileVersion:3}};
const el={textContent:'',innerHTML:'',style:{},classList:{add(){},remove(){}}};
const ctx={console,Audio:class{},document:{querySelector(){return el},addEventListener(){}},localStorage:{getItem(){return JSON.stringify(storage)}},setTimeout(){},clearTimeout(){},addEventListener(){}};
ctx.window=ctx;vm.createContext(ctx);
for(const f of ['data.js','math-unit4-literacy.js','yuwen-garden5-literacy.js','teacher-voice-data.js','math-unit4-voice.js','yuwen-garden5-voice.js','pinyin-audio-data.js','teacher-voice-player.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
vm.runInContext('this.original=JSON.parse(JSON.stringify(CHAR_UNITS));',ctx);
vm.runInContext(fs.readFileSync('question-learning-data.js','utf8'),ctx);
vm.runInContext('this.afterOriginal=JSON.parse(JSON.stringify(CHAR_UNITS.slice(0,this.original.length)));',ctx);
assert.deepEqual(ctx.afterOriginal,ctx.original);
vm.runInContext(fs.readFileSync('question-character-voice.js','utf8'),ctx);
const core=JSON.parse(fs.readFileSync('materials/encouragement.json','utf8'));
vm.runInContext(fs.readFileSync('question-learning-voice.js','utf8'),ctx);ctx.TeacherVoice.refreshCatalog();
const app=fs.readFileSync('app.js','utf8').split('// ======================= 启动 =======================')[0];
vm.runInContext(app+'this.api={teacherVoicePlan,pinyinRecordingKey,parsePinyin,questionReading,LESSON_ITEMS,ALL_LESSONS,save};})();',ctx);
assert.deepEqual(JSON.parse(JSON.stringify(ctx.QUESTION_LEARNING)),data);
assert.equal(ctx.api.save.stars['char:s1'],2);assert.equal(ctx.api.save.stars['char:y5'],3);assert.equal(ctx.api.save.mistakes.keep.n,2);assert.equal(ctx.api.save.bonus,7);
let questions=0,chapterCount=0;
for(const [id,unit] of Object.entries(data)){
 assert.ok(ctx.api.ALL_LESSONS.some(l=>l.id===id),id);
 const groups=new Set(),chapters=new Set(unit.chapters.map(c=>c.id));chapterCount+=chapters.size;
 if(['yuwen-garden5-exam','math-unit4-solids'].includes(id)){
  assert.equal(unit.questions.length,100);
  for(const group of new Set(unit.questions.map(q=>q.group)))assert.equal(unit.questions.filter(q=>q.group===group).length,50);
 }
 for(const q of unit.questions){
  questions++;assert.ok(q.prompt&&q.hint&&q.explain&&chapters.has(q.chapter));groups.add(q.group);
  assert.equal(q.options.length,3);assert.equal(new Set(q.options).size,3);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<3);
  assert.ok(q.visual?.items.length>0,`缺图示 ${q.id}`);
  for(const t of [q.prompt,q.hint,q.explain,...q.options,...Object.values(q.variants||{}).map(v=>v.prompt)]){
   assert.ok(ctx.QUESTION_PINYIN[t],`缺逐字标注：${t}`);
  }
 }
 assert.equal(groups.size,2);
 for(const ch of unit.chapters)for(const group of groups)assert.ok(unit.questions.filter(q=>q.chapter===ch.id&&q.group===group).length>=4);
}
let chars=0;
for(const [text,pys] of Object.entries(ctx.QUESTION_PINYIN)){
 assert.equal(pys.length,text.length,text);
 for(let i=0;i<text.length;i++){
  if(!/[\u4e00-\u9fff]/.test(text[i]))continue;chars++;assert.ok(pys[i],`缺拼音 ${text[i]} in ${text}`);
  const p=ctx.api.parsePinyin(pys[i]);assert.ok(ctx.api.pinyinRecordingKey(p.plain,p.tone)||ctx.QUESTION_CHARACTER_VOICE[text[i]+'|'+pys[i]],`缺字音 ${text[i]} ${pys[i]}`);
 }
}
for(const line of Object.values(core).flat()){assert.ok(ctx.TEACHER_VOICE_DATA[line]);const plan=ctx.api.teacherVoicePlan(line);assert.equal(plan.missing.length,0);}
assert.equal(questions,700);assert.equal(Object.values(data).filter(u=>u.textbook).length,40);
assert.match(ctx.api.questionReading('数一数'),/data-read-char="数" data-read-py="shǔ"/);
console.log(`通过：${questions}题，${chapterCount}章节，四个专项组各50题；配图、逐字拼音、${chars}处字音覆盖；旧进度保留。`);

const quizSource=fs.readFileSync('app.js','utf8').split('function questionLearningRound(')[1].split('function questionLearningFinish(')[0];
assert.doesNotMatch(quizSource,/speak\(q\.|speak\(praiseText\s*\+/);
assert.doesNotMatch(quizSource,/听整道题|data-listen|朗读选项/);
assert.match(quizSource,/speak\(praiseText\)/);
console.log('通过：题干、选项、提示、讲解不自动朗读；仅点字发声，鼓励语音保留。');

assert.doesNotMatch(fs.readFileSync('app.js','utf8'),/setTimeout\(\(\) => \{ if \(questionSeq.*speakItem/);

const onlyPraise={window:{TEACHER_VOICE_DATA:{}}};vm.createContext(onlyPraise);vm.runInContext(fs.readFileSync('question-learning-voice.js','utf8'),onlyPraise);assert.deepEqual(Object.keys(onlyPraise.window.TEACHER_VOICE_DATA).sort(),Object.values(core).flat().sort());
console.log('通过：新增自动语音库只包含10句鼓励，不包含题目、选项、提示和答案。');
