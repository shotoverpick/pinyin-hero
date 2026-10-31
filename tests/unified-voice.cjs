const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),spec=JSON.parse(fs.readFileSync(root+'/scripts/narration-manifest.json'));
function createContext(fake=false){
 const calls=[],timers=new Map();let tid=0;
 class Audio{pause(){}play(){calls.push(this.src);this.onplaying?.();return Promise.resolve();}}
 const el={textContent:'',innerHTML:'',style:{},classList:{add(){},remove(){}}};
 const ctx={console,Audio,document:{querySelector(){return el},addEventListener(){}},localStorage:{getItem(){return JSON.stringify({stars:{keep:2},bonus:7,settings:{voiceEngine:'local',voiceProfileVersion:3}})}},setTimeout(fn){const id=++tid;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)},speechSynthesis:{getVoices(){throw Error('Device TTS forbidden')},speak(){throw Error('Device TTS forbidden')},cancel(){throw Error('Device TTS forbidden')}}};
 ctx.window=ctx;ctx.addEventListener=()=>{};vm.createContext(ctx);
 if(fake)ctx.TEACHER_VOICE_DATA=Object.fromEntries(spec.texts.map(t=>[t,'tts:'+t]));
 else vm.runInContext(fs.readFileSync(root+'/teacher-voice-data.js','utf8'),ctx);
 vm.runInContext(fs.readFileSync(root+'/teacher-voice-player.js','utf8'),ctx);
 return{ctx,calls};
}
const synthetic=process.argv.includes('--synthetic');
{
 const{ctx,calls}=createContext(synthetic);
 for(const f of ['data.js','pinyin-audio-data.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),ctx);
 const src=fs.readFileSync(root+'/app.js','utf8').split('// ======================= 启动 =======================')[0];
 vm.runInContext(src+'this.api={speak,speakPinyin,playKeyVoice,pinyinRecordingKey,teacherVoicePlan,stopAllSpeech,S,save};})();',ctx);
 const t=ctx.api;assert.equal(t.S().voiceEngine,'teacher');assert.equal(t.save.stars.keep,2);assert.equal(t.save.bonus,7);
 for(const text of spec.sourceTexts){const p=t.teacherVoicePlan(text);assert.equal(p.missing.length,0,text+': '+p.missing);assert.ok(p.segments.length,text);}
 for(const v of ['a','o','e','i','u','ü']){const keys=[1,2,3,4].map(n=>t.pinyinRecordingKey(v,n));assert.equal(new Set(keys).size,4);}
 t.speak('小朋友你好，快来一起学拼音吧！');assert.ok(calls.length);assert.equal(calls.at(-1),ctx.TEACHER_VOICE_DATA['小朋友你好，快来一起学拼音吧！']);
 t.speakPinyin('á');assert.equal(calls.at(-1),ctx.PINYIN_AUDIO_DATA.a2);
 t.S().keyVoice=false;let n=calls.length;t.playKeyVoice('a');assert.equal(calls.length,n);t.speakPinyin('a');assert.equal(calls.length,n+1);
 const audio=ctx.TeacherVoice.getAudio();const previous=audio.onended;t.stopAllSpeech();n=calls.length;previous();assert.equal(calls.length,n);
 t.S().sound=false;t.speak('你好，小朋友');assert.equal(calls.length,n);
 console.log('通过：语文全量文案、拼音四声、开关、取消播放及旧设置迁移；设备TTS禁止调用。');
}
{
 const{ctx,calls}=createContext(synthetic);vm.runInContext(fs.readFileSync(root+'/math-data.js','utf8'),ctx);
 const source=fs.readFileSync(root+'/math-app.js','utf8').split('// ======================= 启动初始化 =======================')[0];
 vm.runInContext(source+'this.api={speak,mathToSpeechText,generateQuestion,MATH_UNITS,S,save};})();',ctx);
 const t=ctx.api;assert.equal(t.S().voiceEngine,'teacher');assert.equal(t.save.stars.keep,2);
 const types=[...new Set(t.MATH_UNITS.flatMap(u=>u.lessons.flatMap(l=>l.qTypes)))];let count=0;
 for(const type of types){for(let i=0;i<100;i++){const q=t.generateQuestion(type);for(const text of [q.speakText,q.hintHtml]){if(!text)continue;const p=ctx.TeacherVoice.planText(t.mathToSpeechText(text));assert.equal(p.missing.length,0,type+': '+text+' missing: '+p.missing);assert.ok(p.segments.length);}count++;}}
 t.speak('9 + 4 = 13');assert.ok(calls.length);
 console.log('通过：数学 '+types.length+' 类题型、'+count+' 道随机题的读题/提示全覆盖；设备TTS禁止调用。');
}
if(!synthetic){
 const provenance=JSON.parse(fs.readFileSync(root+'/scripts/phonetic-provenance.json'));
 assert.equal(Object.keys(provenance).length,1166);
 assert.ok(Object.values(provenance).every(x=>x.method.startsWith('neural-tts')));
 for(const file of ['app.js','math-app.js','teacher-voice-player.js'])assert.doesNotMatch(fs.readFileSync(root+'/'+file,'utf8'),/speechSynthesis|SpeechSynthesisUtterance|translate_tts|gettts|KEY_AUDIO_DATA/);
 console.log('通过：所有拼音配音均来自统一神经网络TTS，运行代码没有旧TTS或系统语音路径。');
}
