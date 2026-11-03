const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const root='.',data=JSON.parse(fs.readFileSync('materials/yuwen-garden5.json','utf8'));
const source=fs.readFileSync('materials/yuwen-garden5-source.txt','utf8');
assert.deepEqual(data.characters,[...new Set([...source].filter(c=>/[\u4e00-\u9fff]/.test(c)))]);
assert.equal(data.characters.length,new Set(data.characters).size);assert.equal(data.items.length,data.characters.length);
const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync('data.js','utf8')+'\nthis.units=CHAR_UNITS',c);vm.runInContext(fs.readFileSync('math-unit4-literacy.js','utf8'),c);vm.runInContext(fs.readFileSync('yuwen-garden5-literacy.js','utf8'),c);
const lesson=c.units.flatMap(u=>u.lessons).find(l=>l.id==='yuwen-garden5-exam');assert.deepEqual(Array.from(lesson.reuseItems),data.items);
const existing=new Map();for(const l of c.units.flatMap(u=>u.lessons).filter(l=>!l.reuseItems))for(const s of l.items||[]){const [ch,py,word]=s.split(' ');if(!existing.has(ch+' '+py))existing.set(ch+' '+py,{ch,py,word});}
vm.runInContext(fs.readFileSync('teacher-voice-data.js','utf8'),c);vm.runInContext(fs.readFileSync('math-unit4-voice.js','utf8'),c);vm.runInContext(fs.readFileSync('yuwen-garden5-voice.js','utf8'),c);vm.runInContext(fs.readFileSync('teacher-voice-player.js','utf8'),c);
let reused=0;for(const s of data.items){let [ch,py,word]=s.split(' ');const old=existing.get(ch+' '+py);if(old){reused++;word=old.word;}const phrase=`${word}，${word}的${ch}`;const plan=c.window.TeacherVoice.planText(phrase);assert.equal(plan.missing.length,0,phrase);assert.ok(plan.segments.length,phrase)}
console.log(`通过：${data.items.length} 字，复用 ${reused} 条同读音记录，${data.items.length-reused} 条新增读音，配音均有覆盖。`);
