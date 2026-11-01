const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');let calls=[];
const ctx={window:null,document:{querySelector(){return{}},addEventListener(){}},localStorage:{getItem(){return null}},TeacherVoice:{playSequence(segments,options){calls.push({segments,options})},speak(){throw Error('Arithmetic must use the fast path')}}};ctx.window=ctx;ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const f of ['math-data.js','math-fast-voice-data.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),ctx);
const src=fs.readFileSync(root+'/math-app.js','utf8').split('// ======================= 启动初始化 =======================')[0];vm.runInContext(src+'this.api={fastMathPlan,speak,S,generateArcadeItem};})();',ctx);
ctx.api.speak('1 + 1 = 2');assert.equal(calls.length,1);assert.equal(calls[0].segments.length,1);assert.equal(calls[0].segments[0].uri,ctx.MATH_FAST_VOICE_DATA['1加1等于2']);assert.equal(calls[0].options.rate,1);
let count=0;for(let a=0;a<=20;a++)for(let b=0;b<=20;b++){if(a+b<=20){assert.equal(ctx.api.fastMathPlan(`${a}+${b}=${a+b}`).length,1);count++}if(b<=a){assert.equal(ctx.api.fastMathPlan(`${a}-${b}=${a-b}`).length,1);count++}}
assert.ok(ctx.api.fastMathPlan('2+3+4=9').length>1);assert.ok(ctx.api.fastMathPlan('9 加 4 等于几？').length>1);
assert.equal(ctx.api.fastMathPlan('小朋友你好'),null);
for(let i=0;i<25;i++){const item=ctx.api.generateArcadeItem(['make_10']);assert.equal(ctx.api.fastMathPlan(item.speak).length,1);assert.equal((item.speak.match(/=/g)||[]).length,1);}
console.log('通过：'+count+' 条加减法结果均为整句配音，1+1=2 默认一次播放，不受讲解语速拖慢。');
