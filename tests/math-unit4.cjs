const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const data=JSON.parse(fs.readFileSync('materials/math-unit4.json','utf8'));
const raw=fs.readFileSync('materials/math-unit4-source.txt','utf8').trim().split('\n\n');
const sourceWords=raw[0].split(/[、。]/).filter(Boolean), sentences=raw[1].split('\n');
assert.deepEqual(data.sentences,sentences);assert.deepEqual(data.words.map(x=>x.text),[...new Set(sourceWords)]);
assert.deepEqual(new Set(data.characters.map(x=>x.text)),new Set([...raw.join('')].filter(c=>/[\u4e00-\u9fff]/.test(c))));
for(const arr of [data.characters,data.words]){assert.equal(new Set(arr.map(x=>x.text)).size,arr.length);for(const x of arr){assert.ok(x.text && x.pinyin && !x.pinyin.includes('\ufffd'));assert.equal(x.pinyin.split(' ').length,[...x.text].length);}}
const py=Object.fromEntries(data.words.map(w=>[w.text,w.pinyin]));
for(const [w,p] of Object.entries({'数学':'shù xué','长方体':'cháng fāng tǐ','数一数':'shǔ yi shǔ','站得稳':'zhàn de wěn','相应':'xiāng yìng','圈一圈':'quān yi quān','得分':'dé fēn'}))assert.equal(py[w],p);
const ctx={window:{},CHAR_UNITS:[]};vm.createContext(ctx);vm.runInContext(fs.readFileSync('math-unit4-literacy.js','utf8'),ctx);const unit=ctx.CHAR_UNITS[0], lesson=unit.lessons[0];
assert.equal(unit.unit,data.unit);assert.equal(lesson.items.length,data.characters.length);assert.equal(lesson.words.length,data.words.length);assert.deepEqual(Array.from(lesson.text),data.sentences);
vm.runInContext(fs.readFileSync('teacher-voice-data.js','utf8'),ctx);vm.runInContext(fs.readFileSync('math-unit4-voice.js','utf8'),ctx);
for(const t of [...data.words.map(w=>w.text),...sentences,...data.characters.map(c=>`${c.example}，${c.example}的${c.text}`)])assert.ok(ctx.window.TEACHER_VOICE_DATA[t],`缺配音 ${t}`);
console.log(`通过：${data.characters.length} 字、${data.words.length} 词、${sentences.length} 句，原文、去重、多音字、配音和数据结构`);
